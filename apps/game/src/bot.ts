import {
  CHARACTERS,
  DIRECTION_VECTORS,
  DIRECTIONS,
  type Direction,
  FLAME_DURATION_MS,
  FLAME_SPREAD_MS,
  GHOST_MOVE_SPEED,
  getBlastLength,
  getItemOfTile,
  getMoveSpeed,
  type ItemType,
  KURU_IDLE_FUSE_MS,
  KURU_RED_MS,
  MAP_COLS,
  MAP_ROWS,
  STAT_LIMIT,
  TICK_MS,
  TICK_RATE,
  TILES,
  type UserId,
} from "@monster-chorochoro/common";
import {
  canPlaceKuru,
  forecastFlames,
  type Game,
  type GamePlayer,
  getTileIndex,
  isWalkable,
  placeKuru,
  setPlayerInput,
} from "./game";

/** AI가 상황을 다시 살피는 간격 (틱). 사람처럼 조금 늦게 반응하게 한다 */
const THINK_INTERVAL = 4;

/** 폭풍을 내다보는 길이 (틱). 갓 놓은 꾸루가 저절로 터진 폭풍이 다 사라질 때까지를 덮는다 */
const FORECAST_TICKS = Math.ceil(
  (KURU_RED_MS +
    KURU_IDLE_FUSE_MS +
    getBlastLength(STAT_LIMIT) * FLAME_SPREAD_MS +
    FLAME_DURATION_MS) /
    TICK_MS,
);

/**
 * 실제 움직임은 계획보다 늦거나 빠를 수 있으므로 칸에 머무르는 시간 앞뒤로 더 두는 여유 (틱).
 * 넉넉한 여유로 피할 길이 없으면 차례로 줄여 본다. 계획보다 조금 늦어졌다고 아직 통하는 길을 버리고
 * 되돌아가다 갇히지 않게 하려는 것이다. 스스로 꾸루를 놓을 때는 가장 넉넉한 여유만 쓴다
 */
const SAFETY_MARGINS = [3, 1, 0] as const;

/** 꾸루를 놓으려다 그만둔 칸을 다시 노리지 않는 시간 (틱) */
const COOLDOWN_TICKS = 2 * TICK_RATE;

/** 유령이 판단할 때마다 새로 돌아다니기 시작할 확률 */
const WANDER_CHANCE = 0.1;

// 목표 칸의 점수. 가는 데 1초 걸리는 거리가 1점을 깎는다
const ITEM_SCORE = 6;
const BLOCK_SCORE = 2;
const ENEMY_SCORE = 5;
/** 적에게 가까울수록 조금씩 더 준다. 할 일이 없으면 적을 쫓아가게 된다 */
const HUNT_SCORE = 2;
/** 지금 노리는 칸에 더 주는 점수. 비슷한 칸 사이를 오락가락하지 않게 한다 */
const STICKY_SCORE = 1;
/** 불탈 칸에서 벗어날 때는 거리를 이만큼 더 무겁게 따져 가까운 칸으로 피한다 */
const ESCAPE_DISTANCE_WEIGHT = 4;

const TILE_COUNT = MAP_COLS * MAP_ROWS;

export type Bot = {
  userId: UserId;
  /** 따라가는 길. 지금 칸부터 목표 칸까지의 칸 번호이며, 늘 지금 칸을 담고 있어야 한다 */
  path: number[];
  nextThinkTick: number;
  /** 꾸루를 놓으려다 그만둔 칸과, 그 칸을 다시 노릴 수 있게 되는 틱 */
  cooldowns: Map<number, number>;
};

/** 앞으로 불탈 칸들 */
type Danger = {
  /** 내다본 뒤에 놓인 꾸루는 이 번호 이상을 가진다. 그런 꾸루가 생기면 다시 내다봐야 한다 */
  nextEntityId: number;
  /** 칸마다 불타는 틱 구간 [시작, 끝)들 */
  flames: [number, number][][];
  /** 다 내다본 뒤의 타일. 그동안 부서질 블록은 빈 칸이다 */
  tiles: string[];
};

/** 지금 자리에서 불타는 칸을 밟지 않고 걸어서 닿을 수 있는 칸들 */
type Reach = {
  /** 칸마다 한가운데에 닿는 틱. 닿을 수 없으면 Infinity */
  arrivals: number[];
  /** 칸마다 바로 앞 칸. 처음 칸과 닿을 수 없는 칸은 -1 */
  parents: number[];
  /** 칸을 지날 때 한가운데에 닿기 전후로 그 칸에 몸이 걸쳐 있다고 보는 시간 (틱) */
  span: number;
};

/** 게임마다 내다본 폭풍. 플레이어는 꾸루와 폭풍에 영향을 주지 않으므로 새 꾸루가 놓이기 전까지 AI끼리 함께 쓴다 */
const dangers = new WeakMap<Game, Danger>();

/** 게임마다 꾸루를 놓을 자리를 마지막으로 내다본 틱. 비싼 계산이 한 틱에 몰리지 않도록 틱마다 AI 하나만 한다 */
const placementTicks = new WeakMap<Game, number>();

/** index는 같은 게임의 AI마다 다른 번호다 */
export function createBot(userId: UserId, index: number): Bot {
  // 여러 AI가 같은 틱에 몰려서 판단하지 않도록 엇갈리게 한다
  return { userId, path: [], nextThinkTick: index % THINK_INTERVAL, cooldowns: new Map() };
}

/** 이번 틱의 조작을 정한다. `stepGame`을 부르기 바로 전에 부른다 */
export function updateBot(game: Game, bot: Bot): void {
  const player = game.players.find((v) => v.userId === bot.userId);
  if (!player || game.result) return;

  // 길에서 벗어나면 기다리지 않고 바로 다시 판단한다
  if (game.tick >= bot.nextThinkTick || !bot.path.includes(getPlayerTile(player))) {
    bot.nextThinkTick = game.tick + THINK_INTERVAL;
    if (player.ghost) wander(game, bot, player);
    else think(game, bot, player);
  }
  steer(game, bot, player);
}

function think(game: Game, bot: Bot, player: GamePlayer): void {
  const danger = getDanger(game);
  const enemies = new Set(
    game.players.filter((v) => v !== player && !v.ghost).map((v) => getPlayerTile(v)),
  );
  if (tryPlaceKuru(game, bot, player, danger, enemies)) return;

  for (const margin of SAFETY_MARGINS) {
    const reach = explore(game, player, danger, margin);
    const path = choosePath(game, bot, player, danger, reach, enemies);
    if (path) {
      bot.path = path;
      return;
    }
  }
  bot.path = findShelter(game, player, danger, explore(game, player, danger, 0));
}

/** 쓸 만한 자리이고 피할 길이 있으면 꾸루를 놓고 피할 길로 들어선다. 놓았으면 true */
function tryPlaceKuru(
  game: Game,
  bot: Bot,
  player: GamePlayer,
  danger: Danger,
  enemies: ReadonlySet<number>,
): boolean {
  const here = getPlayerTile(player);
  if (!canPlaceKuru(game, player) || isCoolingDown(game, bot, here)) return false;
  // 폭풍에 닿을 것이 없어 보이는 자리에서는 비싸게 내다보지 않는다
  const targets = countBlastTargets(danger.tiles, here, getBlastLength(player.power), enemies);
  if (!targets.blocks && !targets.hits) return false;
  if (placementTicks.get(game) === game.tick) return false;
  placementTicks.set(game, game.tick);

  // 꾸루는 바라보는 방향으로 굴러가므로 방향마다 어디서 무엇을 터뜨릴지 따로 내다본다.
  // 막힌 쪽을 보고 놓은 꾸루는 어느 쪽이든 제자리에서 터지므로 그런 방향은 하나만 따진다
  const { x, y } = getTilePosition(here);
  const isOpen = (v: Direction) =>
    isWalkable(game, x + DIRECTION_VECTORS[v].x, y + DIRECTION_VECTORS[v].y);
  const blocked = DIRECTIONS.find((v) => !isOpen(v));
  const now = game.tick + 1;
  let best: { direction: Direction; score: number; danger: Danger; path: number[] } | null = null;
  for (const direction of DIRECTIONS.filter((v) => isOpen(v) || v === blocked)) {
    const next = forecast(game, { player, direction });
    let score = 0;
    for (let i = 0; i < TILE_COUNT; i++) {
      if (danger.tiles[i] === TILES.block && next.tiles[i] !== TILES.block) score += BLOCK_SCORE;
    }
    // 적은 피하겠지만 적이 선 칸을 새로 불태우면 몰아붙이는 셈이다
    for (const v of enemies) {
      if (isBurning(next, v, now) && !isBurning(danger, v, now)) score += ENEMY_SCORE;
    }
    if (score <= (best?.score ?? 0)) continue;

    const reach = explore(game, player, next, SAFETY_MARGINS[0]);
    const path = choosePath(game, bot, player, next, reach, enemies);
    if (path) best = { direction, score, danger: next, path };
  }
  if (!best) {
    bot.cooldowns.set(here, game.tick + COOLDOWN_TICKS);
    return false;
  }

  // 그 방향으로 돌아서서 놓은 뒤 바로 피할 길로 방향키를 바꾼다
  setPlayerInput(game, player.userId, best.direction);
  placeKuru(game, player.userId);
  dangers.set(game, { ...best.danger, nextEntityId: game.nextEntityId });
  bot.path = best.path;
  return true;
}

/** 머물러도 끝까지 안전한 칸 가운데 점수가 가장 높은 칸까지의 길. 그런 칸이 없으면 null */
function choosePath(
  game: Game,
  bot: Bot,
  player: GamePlayer,
  danger: Danger,
  reach: Reach,
  enemies: ReadonlySet<number>,
): number[] | null {
  const now = game.tick + 1;
  const distanceWeight = isBurning(danger, getPlayerTile(player), now) ? ESCAPE_DISTANCE_WEIGHT : 1;
  const goal = bot.path.at(-1);
  let best = -1;
  let bestScore = -Infinity;

  reach.arrivals.forEach((arrival, i) => {
    if (arrival === Infinity || isBurning(danger, i, Math.max(arrival - reach.span, now))) return;
    let score =
      scoreTile(game, bot, player, danger, i, enemies) -
      ((arrival - game.tick) / TICK_RATE) * distanceWeight;
    if (i === goal) score += STICKY_SCORE;
    if (score > bestScore) {
      best = i;
      bestScore = score;
    }
  });
  return best < 0 ? null : tracePath(reach, best);
}

/** 끝까지 안전한 칸이 없으면 가장 늦게 불타는 칸으로 간다. 그동안 다른 길이 열리기를 바란다 */
function findShelter(game: Game, player: GamePlayer, danger: Danger, reach: Reach): number[] {
  const now = game.tick + 1;
  let best = getPlayerTile(player);
  let latest = -Infinity;

  reach.arrivals.forEach((arrival, i) => {
    if (arrival === Infinity) return;
    const burnsAt = getNextBurn(danger, i, Math.max(arrival - reach.span, now));
    if (burnsAt > latest) {
      best = i;
      latest = burnsAt;
    }
  });
  return tracePath(reach, best);
}

function scoreTile(
  game: Game,
  bot: Bot,
  player: GamePlayer,
  danger: Danger,
  index: number,
  enemies: ReadonlySet<number>,
): number {
  let score = 0;
  const item = getItemOfTile(game.tiles[index] ?? "");
  if (item && canGrow(player, item)) score += ITEM_SCORE;
  if (!isCoolingDown(game, bot, index)) {
    const { blocks, hits } = countBlastTargets(
      danger.tiles,
      index,
      getBlastLength(player.power),
      enemies,
    );
    score += blocks * BLOCK_SCORE + hits * ENEMY_SCORE;
  }

  let nearest = Infinity;
  for (const v of enemies) nearest = Math.min(nearest, getDistance(index, v));
  return score + HUNT_SCORE / (1 + nearest);
}

/**
 * 그 칸에 멈춘 꾸루가 터질 때 폭풍에 닿을 블록과 적의 수.
 * 꾸루는 막힌 쪽을 보고 놓으면 그 자리에서 터지므로, 굴러가는 것은 따지지 않고 대강 어림한다
 */
function countBlastTargets(
  tiles: readonly string[],
  index: number,
  length: number,
  enemies: ReadonlySet<number>,
): { blocks: number; hits: number } {
  const { x, y } = getTilePosition(index);
  let blocks = 0;
  let hits = enemies.has(index) ? 1 : 0;

  for (const direction of DIRECTIONS) {
    const vector = DIRECTION_VECTORS[direction];
    for (let distance = 1; distance <= length; distance++) {
      const tx = x + vector.x * distance;
      const ty = y + vector.y * distance;
      const tile = getTileAt(tiles, tx, ty);
      if (tile === null || tile === TILES.wall) break;
      if (tile === TILES.block) {
        blocks++;
        break;
      }
      if (enemies.has(getTileIndex(tx, ty))) hits++;
    }
  }
  return { blocks, hits };
}

/** 유령은 할 수 있는 일이 없으므로 이따금 아무 데나 돌아다닌다 */
function wander(game: Game, bot: Bot, player: GamePlayer): void {
  const here = getPlayerTile(player);
  if (bot.path.length > 1 && bot.path.includes(here)) return;
  bot.path = [here];
  if (Math.random() >= WANDER_CHANCE) return;

  const reach = explore(game, player, null);
  const candidates = reach.arrivals.flatMap((v, i) => (v === Infinity ? [] : [i]));
  const goal = candidates[Math.floor(Math.random() * candidates.length)];
  if (goal !== undefined) bot.path = tracePath(reach, goal);
}

/**
 * 지금 자리에서 걸어서 닿을 수 있는 칸을 가까운 순서로 찾는다.
 * danger가 주어지면 지나가는 동안 불타는 칸은 밟지 않는다. 멈춰 서서 기다리는 길은 따지지 않는다
 * @param margin 칸에 머무르는 시간 앞뒤로 더 두는 여유 (틱)
 */
function explore(game: Game, player: GamePlayer, danger: Danger | null, margin = 0): Reach {
  const now = game.tick + 1;
  const stepTicks = TICK_RATE / getSpeed(player);
  const span = stepTicks / 2 + margin;
  const start = getPlayerTile(player);
  const arrivals = new Array<number>(TILE_COUNT).fill(Infinity);
  const parents = new Array<number>(TILE_COUNT).fill(-1);
  arrivals[start] = game.tick;

  const queue = [start];
  for (const from of queue) {
    const { x, y } = getTilePosition(from);
    for (const direction of DIRECTIONS) {
      const vector = DIRECTION_VECTORS[direction];
      const nx = x + vector.x;
      const ny = y + vector.y;
      const to = getTileIndex(nx, ny);
      if (!isWalkable(game, nx, ny) || arrivals[to] !== Infinity) continue;
      // 처음 칸에서는 한가운데에서 벗어나 있는 만큼을 따져 다음 칸에 닿는 때를 셈한다
      const arrival =
        from === start
          ? game.tick + (Math.abs(nx - player.x) + Math.abs(ny - player.y)) * stepTicks
          : (arrivals[from] ?? Infinity) + stepTicks;
      if (danger) {
        if (isBurning(danger, to, Math.max(arrival - span, now), arrival + span)) continue;
        // 처음 칸은 그 칸을 다 벗어날 때까지 불타지 않아야 한다. 칸 사이를 지나다 되돌아가는 길이 그렇지 않을 수 있다
        const leaving = arrival - stepTicks / 2 + margin;
        if (from === start && isBurning(danger, start, now, leaving)) continue;
      }
      arrivals[to] = arrival;
      parents[to] = from;
      queue.push(to);
    }
  }
  return { arrivals, parents, span };
}

/** 길을 따라 다음 칸으로 가는 방향키를 누른다. 꺾을 때는 먼저 지금 칸의 한가운데에 줄을 맞춘다 */
function steer(game: Game, bot: Bot, player: GamePlayer): void {
  const here = getPlayerTile(player);
  const at = bot.path.indexOf(here);
  if (at > 0) bot.path.splice(0, at);
  const { x, y } = getTilePosition(here);
  const next = at < 0 ? undefined : bot.path[1];
  // 한 틱에 움직이는 거리의 절반보다 가까우면 줄이 맞은 것으로 본다. 그래야 한가운데를 사이에 두고 오락가락하지 않는다
  const tolerance = getSpeed(player) / TICK_RATE / 2 + 0.01;
  const dx = x - player.x;
  const dy = y - player.y;
  let direction: Direction | null = null;

  if (next === undefined) {
    // 목표 칸에서는 한가운데에 선다
    if (Math.abs(dx) > tolerance) direction = getDirectionAlong(true, dx);
    else if (Math.abs(dy) > tolerance) direction = getDirectionAlong(false, dy);
  } else {
    const target = getTilePosition(next);
    const horizontal = target.x !== x;
    const misalignment = horizontal ? dy : dx;
    direction =
      Math.abs(misalignment) > tolerance
        ? getDirectionAlong(!horizontal, misalignment)
        : getDirectionAlong(horizontal, horizontal ? target.x - x : target.y - y);
  }
  if (player.input !== direction) setPlayerInput(game, player.userId, direction);
}

function getDanger(game: Game): Danger {
  const cached = dangers.get(game);
  if (cached && !game.kurus.some((v) => v.id >= cached.nextEntityId)) return cached;
  const danger = forecast(game);
  dangers.set(game, danger);
  return danger;
}

function forecast(game: Game, placement?: { player: GamePlayer; direction: Direction }): Danger {
  const flames: [number, number][][] = Array.from({ length: TILE_COUNT }, () => []);
  const tiles = forecastFlames(
    game,
    FORECAST_TICKS,
    (tick, burning) => {
      for (const index of burning) {
        const list = flames[index];
        const last = list?.at(-1);
        if (last?.[1] === tick) last[1] = tick + 1;
        else list?.push([tick, tick + 1]);
      }
    },
    placement,
  );
  return { nextEntityId: game.nextEntityId, flames, tiles };
}

/** 칸이 [from, to) 틱 사이에 한 번이라도 불타는지 */
function isBurning(danger: Danger, index: number, from: number, to = Infinity): boolean {
  return danger.flames[index]?.some(([start, end]) => start < to && from < end) ?? false;
}

/** from 틱부터 보아 그 칸이 처음 불타는 틱. 이미 불타고 있으면 from, 더 불타지 않으면 Infinity */
function getNextBurn(danger: Danger, index: number, from: number): number {
  let next = Infinity;
  for (const [start, end] of danger.flames[index] ?? []) {
    if (end > from) next = Math.min(next, Math.max(start, from));
  }
  return next;
}

function tracePath(reach: Reach, goal: number): number[] {
  const path = [goal];
  for (let i = reach.parents[goal] ?? -1; i >= 0; i = reach.parents[i] ?? -1) path.unshift(i);
  return path;
}

function isCoolingDown(game: Game, bot: Bot, index: number): boolean {
  return (bot.cooldowns.get(index) ?? 0) > game.tick;
}

function canGrow(player: GamePlayer, item: ItemType): boolean {
  const stats = CHARACTERS[player.characterId];
  switch (item) {
    case "power":
      return player.power < stats.maxPower;
    case "speed":
      return player.speed < stats.maxSpeed;
    case "kuru":
      return player.kuru < stats.maxKuru;
  }
}

function getSpeed(player: GamePlayer): number {
  return player.ghost ? GHOST_MOVE_SPEED : getMoveSpeed(player.speed);
}

/** 플레이어의 몸이 가장 많이 걸친 칸. 폭풍과 아이템도 이 칸으로 판정한다 */
function getPlayerTile(player: GamePlayer): number {
  return getTileIndex(Math.round(player.x), Math.round(player.y));
}

function getTilePosition(index: number): { x: number; y: number } {
  const x = index % MAP_COLS;
  return { x, y: (index - x) / MAP_COLS };
}

function getTileAt(tiles: readonly string[], x: number, y: number): string | null {
  if (x < 0 || y < 0 || x >= MAP_COLS || y >= MAP_ROWS) return null;
  return tiles[getTileIndex(x, y)] ?? null;
}

function getDistance(a: number, b: number): number {
  const from = getTilePosition(a);
  const to = getTilePosition(b);
  return Math.abs(from.x - to.x) + Math.abs(from.y - to.y);
}

/** 축을 따라 offset의 부호 쪽으로 가는 방향 */
function getDirectionAlong(horizontal: boolean, offset: number): Direction {
  if (horizontal) return offset > 0 ? "right" : "left";
  return offset > 0 ? "down" : "up";
}
