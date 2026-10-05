import {
  CHARACTERS,
  type CharacterId,
  DIRECTION_VECTORS,
  DIRECTIONS,
  type Direction,
  FLAME_DURATION_MS,
  FLAME_SPREAD_MS,
  GAME_DURATION_MS,
  type GameResult,
  type GameSnapshot,
  GHOST_MOVE_SPEED,
  GHOST_STUN_MS,
  getBlastLength,
  getItemOfTile,
  getKuruLimit,
  getMoveSpeed,
  ITEM_TYPES,
  type ItemDrop,
  type ItemType,
  KURU_IDLE_FUSE_MS,
  KURU_MOVE_SPEED,
  KURU_RED_MS,
  MAP_COLS,
  MAP_ROWS,
  type MapId,
  parseMapLayout,
  REVIVE_IMMUNITY_MS,
  SUDDEN_DEATH_INTERVAL_MS,
  SUDDEN_DEATH_WARNING_MS,
  TICK_RATE,
  TILES,
  type UserId,
} from "@monster-chorochoro/common";

/** 이보다 작은 좌표 차이는 없는 것으로 본다 */
const EPSILON = 1e-6;

/** 블록 중 아이템이 들어 있는 블록의 비율 */
const ITEM_BLOCK_RATIO = 0.35;

/** 폭풍에 맞아 유령이 될 때 주운 아이템 가운데 떨어뜨리는 비율 */
const ITEM_DROP_RATIO = 0.3;

/** 유령과 산 플레이어의 좌표 차이가 두 축 모두 이보다 작으면 닿은 것으로 본다 (타일) */
const GHOST_TOUCH_DISTANCE = 0.6;

const GHOST_STUN_TICKS = Math.round((GHOST_STUN_MS * TICK_RATE) / 1000);
const REVIVE_IMMUNITY_TICKS = Math.round((REVIVE_IMMUNITY_MS * TICK_RATE) / 1000);
const GAME_DURATION_TICKS = Math.round((GAME_DURATION_MS * TICK_RATE) / 1000);
const SUDDEN_DEATH_INTERVAL_TICKS = Math.round((SUDDEN_DEATH_INTERVAL_MS * TICK_RATE) / 1000);
const SUDDEN_DEATH_WARNING_TICKS = Math.round((SUDDEN_DEATH_WARNING_MS * TICK_RATE) / 1000);

const ITEM_TILES: Record<ItemType, string> = {
  power: TILES.power,
  speed: TILES.speed,
  kuru: TILES.kuru,
};

export type GameParticipant = {
  userId: UserId;
  characterId: CharacterId;
};

export type GamePlayer = {
  userId: UserId;
  characterId: CharacterId;
  /** 타일 단위 좌표. 정수일 때 타일의 한가운데에 있다 */
  x: number;
  y: number;
  direction: Direction;
  /** 누르고 있는 방향 */
  input: Direction | null;
  moving: boolean;
  ghost: boolean;
  /** 유령이 된 틱. 동시에 탈락한 플레이어를 가리는 데 쓴다 */
  ghostAtTick: number | null;
  /** 폭풍에 맞은 유령은 이 틱까지 기절해 움직이지 못한다 */
  stunnedUntilTick: number;
  /** 되살아난 플레이어는 이 틱까지 유령이 닿거나 폭풍에 맞아도 유령이 되지 않는다 */
  immuneUntilTick: number;
  power: number;
  speed: number;
  kuru: number;
};

type Kuru = {
  id: number;
  ownerId: UserId;
  x: number;
  y: number;
  direction: Direction;
  /** 놓을 때의 파워로 정해진다 */
  blastLength: number;
  /** 놓은 뒤로 지난 틱 수 */
  age: number;
};

type Explosion = {
  id: number;
  x: number;
  y: number;
  /** 터질 때의 파워로 정해진 폭풍의 최대 길이 */
  blastLength: number;
  /**
   * `DIRECTIONS` 순서로 담은 방향별 폭풍의 길이.
   * 폭풍이 이미 닿은 거리까지는 확정된 값이고, 그 너머는 지금 타일로 내다본 값이다
   */
  arms: [number, number, number, number];
  /** 방향별로 폭풍이 벽이나 블록에 막히거나 최대 길이에 닿아 더 뻗지 않게 되었는지 */
  settled: [boolean, boolean, boolean, boolean];
  /** 방향별로 폭풍의 끝 칸이 블록인지. 폭풍은 블록을 부수기만 하고 그 칸에 머무르지 않는다 */
  blocked: [boolean, boolean, boolean, boolean];
  /** 터진 뒤로 지난 틱 수. 서든 데스의 폭발은 경고 그림자만 보이는 동안 음수다 */
  age: number;
  /** 폭풍이 닿아 판정을 마친 거리. 처음에는 0 */
  spread: number;
};

export type Game = {
  mapId: MapId;
  tiles: string[];
  /** 블록 안에 숨은 아이템. 키는 타일 번호다 */
  hiddenItems: Map<number, ItemType>;
  players: GamePlayer[];
  /** 게임을 시작한 인원. 혼자 시작하면 마지막 1명이 남아도 끝나지 않는다 */
  participantCount: number;
  kurus: Kuru[];
  explosions: Explosion[];
  tick: number;
  tilesChanged: boolean;
  /** 아직 클라이언트에 알리지 않은, 떨어뜨린 아이템들 */
  drops: ItemDrop[];
  result: GameResult | null;
  nextEntityId: number;
  /** 떨어뜨린 아이템이 놓일 자리를 고르는 데 쓴다 */
  random: () => number;
};

export function createGame(
  mapId: MapId,
  participants: GameParticipant[],
  random: () => number = Math.random,
): Game {
  const { tiles, spawns } = parseMapLayout(mapId);
  if (participants.length > spawns.length) throw new Error(`Too many players for ${mapId}`);

  const blockIndices = [...tiles].flatMap((v, i) => (v === TILES.block ? [i] : []));
  const itemCount = Math.round(blockIndices.length * ITEM_BLOCK_RATIO);
  const hiddenItems = new Map<number, ItemType>();
  // 종류마다 개수가 고르도록 섞은 블록에 아이템을 번갈아 넣는다
  shuffle(blockIndices, random)
    .slice(0, itemCount)
    .forEach((v, i) => {
      hiddenItems.set(v, ITEM_TYPES[i % ITEM_TYPES.length] as ItemType);
    });

  // 인원이 스폰 지점보다 적어도 늘 같은 자리에서 시작하지 않도록 스폰 지점을 섞는다
  const shuffledSpawns = shuffle([...spawns], random);
  const players = participants.map((v, i): GamePlayer => {
    const spawn = shuffledSpawns[i] as { x: number; y: number };
    const stats = CHARACTERS[v.characterId];
    return {
      userId: v.userId,
      characterId: v.characterId,
      x: spawn.x,
      y: spawn.y,
      direction: "down",
      input: null,
      moving: false,
      ghost: false,
      ghostAtTick: null,
      stunnedUntilTick: 0,
      immuneUntilTick: 0,
      power: stats.initialPower,
      speed: stats.initialSpeed,
      kuru: stats.initialKuru,
    };
  });

  return {
    mapId,
    tiles: [...tiles],
    hiddenItems,
    players,
    participantCount: players.length,
    kurus: [],
    explosions: [],
    tick: 0,
    tilesChanged: false,
    drops: [],
    result: null,
    nextEntityId: 1,
    random,
  };
}

export function setPlayerInput(game: Game, userId: UserId, direction: Direction | null): void {
  const player = game.players.find((v) => v.userId === userId);
  if (!player) return;
  player.input = direction;
  // 한 틱보다 짧게 눌렀다 떼도 방향만큼은 바꿔서, 짧게 눌러 돌아선 뒤 꾸루를 놓을 수 있게 한다
  if (direction) player.direction = direction;
}

export function placeKuru(game: Game, userId: UserId): void {
  const player = game.players.find((v) => v.userId === userId);
  if (player && canPlaceKuru(game, player)) {
    game.kurus.push(createKuru(game, player, player.direction));
  }
}

export function canPlaceKuru(game: Game, player: GamePlayer): boolean {
  // 첫 틱 전은 카운트다운 중이다
  if (game.result || game.tick === 0 || player.ghost) return false;
  if (getOwnKuruCount(game, player) >= getKuruLimit(player.kuru)) return false;
  return !isKuruAt(game, Math.round(player.x), Math.round(player.y));
}

export function getOwnKuruCount(game: Game, player: GamePlayer): number {
  return game.kurus.filter((v) => v.ownerId === player.userId).length;
}

/** 플레이어가 선 칸에 놓이는 꾸루를 만든다. 게임에 넣지는 않는다 */
function createKuru(game: Game, player: GamePlayer, direction: Direction): Kuru {
  return {
    id: game.nextEntityId++,
    ownerId: player.userId,
    x: Math.round(player.x),
    y: Math.round(player.y),
    direction,
    blastLength: getBlastLength(player.power),
    age: 0,
  };
}

/** 게임 도중에 나간 플레이어를 뺀다. 이미 놓은 꾸루는 그대로 남는다 */
export function removePlayer(game: Game, userId: UserId): void {
  game.players = game.players.filter((v) => v.userId !== userId);
}

/** 게임을 한 틱 진행한다. 끝나면 `result`가 채워지고 더는 진행되지 않는다 */
export function stepGame(game: Game): void {
  if (game.result) return;
  game.tick++;

  for (const v of game.players) movePlayer(game, v);
  for (const v of game.players) {
    if (!v.ghost) pickUpItem(game, v);
  }
  for (const v of game.explosions) v.age++;
  updateKurus(game);
  updateExplosions(game);
  reviveGhosts(game);
  warnSuddenDeath(game);
  game.result = judge(game);
}

/** 폭풍에 맞은 유령이 아직 기절해 있어 다음 틱에 움직이지 못하는지 */
function isStunned(game: Game, player: GamePlayer): boolean {
  return player.ghost && game.tick < player.stunnedUntilTick;
}

/** 갓 되살아나 다음 틱에 유령이 닿거나 폭풍에 맞아도 유령이 되지 않는지 */
export function isImmune(game: Game, player: GamePlayer): boolean {
  return !player.ghost && game.tick < player.immuneUntilTick;
}

/**
 * 플레이어는 빼고 꾸루와 폭풍만 최대 ticks 틱 앞으로 진행해 본다. 실제 게임은 바뀌지 않는다.
 * 플레이어는 꾸루와 폭풍에 영향을 주지 않으므로, 그 사이에 새 꾸루가 놓이지 않으면 내다본 대로 된다.
 * 꾸루와 폭풍이 모두 사라지면 그 뒤로는 불탈 칸이 없으므로 일찍 멈춘다.
 * @param onTick 진행한 틱마다 그 틱 번호와 그 틱에 불타는 칸 번호들을 받는다
 * @param placement 주어지면 그 플레이어가 지금 선 칸에 그 방향으로 꾸루를 놓았다고 가정한다
 * @returns 진행을 마친 뒤의 타일. 그동안 부서질 블록은 빈 칸이 된다
 */
export function forecastFlames(
  game: Game,
  ticks: number,
  onTick: (tick: number, burning: ReadonlySet<number>) => void,
  placement?: { player: GamePlayer; direction: Direction },
): string[] {
  const forecast: Game = {
    ...game,
    tiles: [...game.tiles],
    // 숨은 아이템은 실제 게임에서 지우면 안 되고, 꾸루와 폭풍에는 영향이 없으므로 비워 둔다
    hiddenItems: new Map(),
    players: [],
    kurus: structuredClone(game.kurus),
    explosions: structuredClone(game.explosions),
  };
  if (placement) forecast.kurus.push(createKuru(forecast, placement.player, placement.direction));

  for (let i = 0; i < ticks && (forecast.kurus.length || forecast.explosions.length); i++) {
    forecast.tick++;
    for (const v of forecast.explosions) v.age++;
    updateKurus(forecast);
    onTick(forecast.tick, updateExplosions(forecast));
  }
  return forecast.tiles;
}

export function getRemainingMs(game: Game): number {
  return Math.max(0, GAME_DURATION_MS - ticksToMs(game.tick));
}

/** 현재 상태를 클라이언트에 보낼 형태로 바꾼다. 바뀐 타일은 한 번만 실어 보낸다 */
export function toSnapshot(game: Game): GameSnapshot {
  const snapshot: GameSnapshot = {
    tick: game.tick,
    remainingMs: Math.round(getRemainingMs(game)),
    players: game.players.map((v) => ({
      userId: v.userId,
      x: roundCoordinate(v.x),
      y: roundCoordinate(v.y),
      direction: v.direction,
      moving: v.moving,
      ghost: v.ghost,
      stunned: isStunned(game, v),
      immune: isImmune(game, v),
      power: v.power,
      speed: v.speed,
      kuru: v.kuru,
    })),
    kurus: game.kurus.map((v) => ({
      id: v.id,
      x: roundCoordinate(v.x),
      y: roundCoordinate(v.y),
      direction: v.direction,
      elapsedMs: Math.round(ticksToMs(v.age)),
    })),
    explosions: game.explosions.map((v) => ({
      id: v.id,
      x: v.x,
      y: v.y,
      arms: [...v.arms],
      blocked: [...v.blocked],
      elapsedMs: Math.round(ticksToMs(v.age)),
    })),
  };
  if (game.tilesChanged) {
    snapshot.tiles = game.tiles.join("");
    game.tilesChanged = false;
  }
  if (game.drops.length) {
    snapshot.drops = game.drops;
    game.drops = [];
  }
  return snapshot;
}

/**
 * 플레이어를 누르고 있는 방향으로 움직인다.
 * 앞이 트여 있으면 줄을 맞추지 않고 그대로 나아가며,
 * 줄에 걸친 채로 막히면 막힌 쪽 대신 열린 쪽 줄로 미끄러지듯 비켜 준다.
 */
function movePlayer(game: Game, player: GamePlayer): void {
  player.moving = false;
  const direction = player.input;
  if (!direction || (player.ghost && game.tick <= player.stunnedUntilTick)) return;
  player.direction = direction;

  const vector = DIRECTION_VECTORS[direction];
  const horizontal = vector.x !== 0;
  const sign = horizontal ? vector.x : vector.y;
  // main은 나아가는 축, cross는 그에 수직인 축의 좌표다
  let main = horizontal ? player.x : player.y;
  let cross = horizontal ? player.y : player.x;
  const isOpen = (m: number, c: number) =>
    horizontal ? isWalkable(game, m, c) : isWalkable(game, c, m);
  let remaining = (player.ghost ? GHOST_MOVE_SPEED : getMoveSpeed(player.speed)) / TICK_RATE;

  /** 몸이 걸친 줄들이 모두 트여 있는 만큼 나아간다. 막히면 막힌 칸 바로 앞 칸의 한가운데에서 멈추고 true를 돌려준다 */
  const advance = (): boolean => {
    const next = snap(main + sign * remaining);
    // 이동한 뒤 몸이 걸치게 되는 가장 앞쪽 칸
    const frontTile = sign > 0 ? Math.ceil(next) : Math.floor(next);
    const blocked = !isOpen(frontTile, Math.floor(cross)) || !isOpen(frontTile, Math.ceil(cross));
    const reached = blocked ? frontTile - sign : next;
    remaining -= Math.abs(reached - main);
    main = reached;
    return blocked;
  };

  const from = { main, cross };
  if (advance() && remaining > EPSILON) {
    // 줄에 걸쳐 있으면 걸친 두 줄 가운데 앞이 트인 줄이 있다. 걸쳐 있지 않으면 둘 다 같은 줄이다
    const targetLane = [Math.floor(cross), Math.ceil(cross)].find((v) => isOpen(main + sign, v));
    if (targetLane !== undefined && targetLane !== cross) {
      const gap = targetLane - cross;
      const step = Math.min(Math.abs(gap), remaining);
      cross = snap(cross + Math.sign(gap) * step);
      remaining -= step;
      if (remaining > EPSILON && cross === targetLane) advance();
    }
  }
  player.moving = Math.abs(main - from.main) > EPSILON || Math.abs(cross - from.cross) > EPSILON;

  player.x = horizontal ? main : cross;
  player.y = horizontal ? cross : main;
}

function pickUpItem(game: Game, player: GamePlayer): void {
  const index = getTileIndex(Math.round(player.x), Math.round(player.y));
  const item = getItemOfTile(game.tiles[index] ?? "");
  if (!item) return;

  const stats = CHARACTERS[player.characterId];
  switch (item) {
    case "power":
      player.power = Math.min(player.power + 1, stats.maxPower);
      break;
    case "speed":
      player.speed = Math.min(player.speed + 1, stats.maxSpeed);
      break;
    case "kuru":
      player.kuru = Math.min(player.kuru + 1, stats.maxKuru);
      break;
  }
  setTile(game, index, TILES.empty);
}

function updateKurus(game: Game): void {
  // 먼저 터진 꾸루가 사라지면서 다른 꾸루의 길이 열리지 않도록 다 굴린 다음에 한꺼번에 터뜨린다
  const exploding: Kuru[] = [];
  for (const kuru of game.kurus) {
    kuru.age++;
    const blocked = moveKuru(game, kuru, KURU_MOVE_SPEED / TICK_RATE);
    const ageMs = ticksToMs(kuru.age);
    if ((ageMs >= KURU_RED_MS && blocked) || ageMs >= KURU_RED_MS + KURU_IDLE_FUSE_MS) {
      exploding.push(kuru);
    }
  }
  for (const v of exploding) explode(game, v);
}

/**
 * 꾸루를 바라보는 방향으로 칸 단위로 굴린다. 칸 한가운데에서 앞 칸이 막혀 있으면 멈추며,
 * 이때 true를 돌려준다. 막혔던 앞 칸이 나중에 열리면 다시 굴러간다.
 */
function moveKuru(game: Game, kuru: Kuru, distance: number): boolean {
  const vector = DIRECTION_VECTORS[kuru.direction];
  const horizontal = vector.x !== 0;
  const sign = horizontal ? vector.x : vector.y;
  let remaining = distance;

  while (true) {
    const position = horizontal ? kuru.x : kuru.y;
    if (Math.abs(position - Math.round(position)) <= EPSILON) {
      const x = Math.round(kuru.x);
      const y = Math.round(kuru.y);
      kuru.x = x;
      kuru.y = y;
      // 꾸루끼리는 서로 지나갈 수 있으므로 벽과 블록만 장애물이다
      if (!isWalkable(game, x + vector.x, y + vector.y)) return true;
    }
    if (remaining <= EPSILON) return false;

    const nextCenter = sign > 0 ? Math.floor(position) + 1 : Math.ceil(position) - 1;
    const step = Math.min(Math.abs(nextCenter - position), remaining);
    const next = snap(position + sign * step);
    if (horizontal) kuru.x = next;
    else kuru.y = next;
    remaining -= step;
  }
}

/** 칸 사이를 지나는 꾸루가 향하는 칸. 칸 한가운데에 있으면 그 칸이다 */
function getKuruTarget(kuru: Kuru): { x: number; y: number } {
  const vector = DIRECTION_VECTORS[kuru.direction];
  const position = vector.x !== 0 ? kuru.x : kuru.y;
  if (Math.abs(position - Math.round(position)) <= EPSILON) {
    return { x: Math.round(kuru.x), y: Math.round(kuru.y) };
  }
  const sign = vector.x + vector.y;
  const next = sign > 0 ? Math.ceil(position) : Math.floor(position);
  return vector.x !== 0 ? { x: next, y: Math.round(kuru.y) } : { x: Math.round(kuru.x), y: next };
}

function isKuruAt(game: Game, x: number, y: number): boolean {
  return game.kurus.some((v) => {
    const target = getKuruTarget(v);
    return (Math.round(v.x) === x && Math.round(v.y) === y) || (target.x === x && target.y === y);
  });
}

/**
 * 꾸루를 터뜨린다. 폭풍은 벽에서 멈추고, 블록은 부수면서 그 칸에서 멈춘다.
 * 폭풍이 어디까지 뻗을지는 터질 때가 아니라 폭풍이 각 칸에 닿는 순간의 타일로 정한다
 */
function explode(game: Game, kuru: Kuru): void {
  game.kurus = game.kurus.filter((v) => v !== kuru);
  addExplosion(game, Math.round(kuru.x), Math.round(kuru.y), kuru.blastLength, 0);
}

/** age가 음수면 그만큼의 틱 동안 경고 그림자만 보이다가 터진다 */
function addExplosion(game: Game, x: number, y: number, blastLength: number, age: number): void {
  const explosion: Explosion = {
    id: game.nextEntityId++,
    x,
    y,
    blastLength,
    arms: [0, 0, 0, 0],
    settled: [false, false, false, false],
    blocked: [false, false, false, false],
    age,
    spread: 0,
  };
  predictArms(game, explosion);
  game.explosions.push(explosion);
}

/**
 * 시간이 다 되면 서든 데스가 시작되어 아무 칸에나 폭발을 예고한다. 예고한 칸은 경고 그림자가 보이다가 그 칸만 터진다.
 * 처음에는 한 칸, 다음에는 두 칸, 그다음에는 세 칸… 하는 식으로 예고할 때마다 한 칸씩 늘어난다
 */
function warnSuddenDeath(game: Game): void {
  const elapsed = game.tick - GAME_DURATION_TICKS;
  if (elapsed < 0 || elapsed % SUDDEN_DEATH_INTERVAL_TICKS) return;

  const count = elapsed / SUDDEN_DEATH_INTERVAL_TICKS + 1;
  // 벽과 블록은 뺀다. 앞서 예고한 칸도 다시 고를 수 있어서, 칸 수보다 많이 예고하게 되면 피할 곳이 없다
  const spots = game.tiles.flatMap((_, i) => {
    const x = i % MAP_COLS;
    const y = (i - x) / MAP_COLS;
    return isWalkable(game, x, y) ? [{ x, y }] : [];
  });
  for (const { x, y } of shuffle(spots, game.random).slice(0, count)) {
    addExplosion(game, x, y, 0, -SUDDEN_DEATH_WARNING_TICKS);
  }
}

/**
 * 폭풍을 퍼뜨리고 닿은 플레이어를 유령으로 만들며, 닿은 유령은 기절시킨다.
 * 이번 틱에 불타는 칸 번호들을 돌려준다
 */
function updateExplosions(game: Game): Set<number> {
  // 폭풍에 닿은 꾸루가 터지면 그 폭풍이 또 다른 꾸루를 터뜨릴 수 있으므로 더 터질 꾸루가 없을 때까지 되풀이한다
  let burning: Set<number>;
  while (true) {
    spreadFlames(game);
    burning = getBurningTiles(game);
    const ignited = game.kurus.filter((v) =>
      burning.has(getTileIndex(Math.round(v.x), Math.round(v.y))),
    );
    if (!ignited.length) break;
    for (const v of ignited) explode(game, v);
  }

  for (const v of game.players) {
    if (!burning.has(getTileIndex(Math.round(v.x), Math.round(v.y)))) continue;
    // 갓 되살아난 플레이어는 폭풍에 맞지 않는다. 판정 시점은 `reviveGhosts`와 맞춘다
    if (!v.ghost && game.tick <= v.immuneUntilTick) continue;
    if (!v.ghost) {
      v.ghost = true;
      v.ghostAtTick = game.tick;
      dropItems(game, v);
    }
    // 갓 유령이 된 플레이어도 폭풍 안에 있으므로 기절해서, 곧바로 다른 플레이어에게 닿아 되살아나지 못한다
    v.stunnedUntilTick = game.tick + GHOST_STUN_TICKS;
  }
  game.explosions = game.explosions.filter((v) => ticksToMs(v.age) < getExplosionEndMs(v));
  return burning;
}

/**
 * 폭풍을 새로 닿은 칸까지 뻗고 그 칸의 블록을 부순다. 블록에 숨은 아이템은 이때 드러난다.
 * 같은 순간에 닿은 폭풍은 모두 부서지기 전의 타일로 판정하므로, 한 블록에 함께 닿은 폭풍은 모두 그 칸에서 멈춘다
 */
function spreadFlames(game: Game): void {
  const broken = new Set<number>();
  for (const explosion of game.explosions) {
    const reach = Math.min(
      Math.floor(ticksToMs(explosion.age) / FLAME_SPREAD_MS),
      explosion.blastLength,
    );
    for (let distance = explosion.spread + 1; distance <= reach; distance++) {
      DIRECTIONS.forEach((direction, i) => {
        if (explosion.settled[i]) return;
        const vector = DIRECTION_VECTORS[direction];
        const x = explosion.x + vector.x * distance;
        const y = explosion.y + vector.y * distance;
        const tile = getTile(game, x, y);
        if (tile === null || tile === TILES.wall) {
          explosion.arms[i] = distance - 1;
          explosion.settled[i] = true;
          explosion.blocked[i] = false;
          return;
        }
        explosion.arms[i] = distance;
        explosion.blocked[i] = tile === TILES.block;
        if (tile === TILES.block) broken.add(getTileIndex(x, y));
        if (tile === TILES.block || distance >= explosion.blastLength) explosion.settled[i] = true;
      });
    }
    explosion.spread = Math.max(explosion.spread, reach);
  }
  for (const index of broken) {
    const item = game.hiddenItems.get(index);
    game.hiddenItems.delete(index);
    setTile(game, index, item ? ITEM_TILES[item] : TILES.empty);
  }
  // 블록이 부서지면 다른 폭풍이 더 뻗을 수 있으므로 아직 닿지 않은 범위를 다시 내다본다
  for (const v of game.explosions) predictArms(game, v);
}

/** 아직 폭풍이 닿지 않은 범위를 지금 타일로 내다본다. 클라이언트가 위험 범위를 미리 보이는 데 쓴다 */
function predictArms(game: Game, explosion: Explosion): void {
  DIRECTIONS.forEach((direction, i) => {
    if (explosion.settled[i]) return;
    const vector = DIRECTION_VECTORS[direction];
    let length = explosion.spread;
    let blocked = false;
    for (let distance = explosion.spread + 1; distance <= explosion.blastLength; distance++) {
      const tile = getTile(
        game,
        explosion.x + vector.x * distance,
        explosion.y + vector.y * distance,
      );
      if (tile === null || tile === TILES.wall) break;
      length = distance;
      blocked = tile === TILES.block;
      if (blocked) break;
    }
    explosion.arms[i] = length;
    explosion.blocked[i] = blocked;
  });
}

function getBurningTiles(game: Game): Set<number> {
  const burning = new Set<number>();
  for (const explosion of game.explosions) {
    for (let distance = 0; distance <= Math.max(...explosion.arms); distance++) {
      const startMs = distance * FLAME_SPREAD_MS;
      const ageMs = ticksToMs(explosion.age);
      if (ageMs < startMs || ageMs >= startMs + FLAME_DURATION_MS) {
        continue;
      }
      for (const { x, y } of getFlameCells(explosion, distance)) burning.add(getTileIndex(x, y));
    }
  }
  return burning;
}

/** 폭발의 중심에서 distance만큼 떨어진 폭풍 칸들. 블록을 부순 끝 칸은 빠진다 */
function getFlameCells(explosion: Explosion, distance: number): { x: number; y: number }[] {
  if (distance === 0) return [{ x: explosion.x, y: explosion.y }];
  return DIRECTIONS.flatMap((direction, i) => {
    const arm = explosion.arms[i] ?? 0;
    if (arm < distance || (arm === distance && explosion.blocked[i])) return [];
    const vector = DIRECTION_VECTORS[direction];
    return [{ x: explosion.x + vector.x * distance, y: explosion.y + vector.y * distance }];
  });
}

function getExplosionEndMs(explosion: Explosion): number {
  return Math.max(...explosion.arms) * FLAME_SPREAD_MS + FLAME_DURATION_MS;
}

/**
 * 주운 아이템 가운데 일부를 맵의 빈 칸 아무 데나 떨어뜨리고 그만큼 능력치를 내린다.
 * 산 플레이어가 선 칸에는 떨어뜨리지 않으며, 빈 칸이 모자라면 남은 아이템은 떨어뜨리지 않고 그대로 둔다
 */
function dropItems(game: Game, player: GamePlayer): void {
  const stats = CHARACTERS[player.characterId];
  const initial: Record<ItemType, number> = {
    power: stats.initialPower,
    speed: stats.initialSpeed,
    kuru: stats.initialKuru,
  };
  // 상한에 닿은 뒤에 주운 아이템은 능력치를 올리지 않았으므로 초기값보다 오른 만큼만 가진 것으로 본다
  const owned = ITEM_TYPES.flatMap((v) => new Array<ItemType>(player[v] - initial[v]).fill(v));
  const count = Math.round(owned.length * ITEM_DROP_RATIO);
  if (!count) return;

  const occupied = new Set(
    game.players.filter((v) => !v.ghost).map((v) => getTileIndex(Math.round(v.x), Math.round(v.y))),
  );
  const spots = shuffle(
    game.tiles.flatMap((v, i) => (v === TILES.empty && !occupied.has(i) ? [i] : [])),
    game.random,
  );
  shuffle(owned, game.random)
    .slice(0, Math.min(count, spots.length))
    .forEach((item, i) => {
      const index = spots[i] as number;
      player[item]--;
      setTile(game, index, ITEM_TILES[item]);
      game.drops.push({
        item,
        fromX: roundCoordinate(player.x),
        fromY: roundCoordinate(player.y),
        x: index % MAP_COLS,
        y: Math.floor(index / MAP_COLS),
      });
    });
}

/**
 * 유령이 산 플레이어에게 닿으면 그 플레이어가 유령이 되고 유령은 그 자리에서 되살아난다.
 * 기절한 유령은 되살아나지 못하고, 갓 되살아난 플레이어에게는 잠시 유령이 닿아도 소용없다(폭풍도 마찬가지다)
 */
function reviveGhosts(game: Game): void {
  // 이번에 닿아서 유령이 된 플레이어는 다음 틱부터 따진다
  const ghosts = game.players.filter((v) => v.ghost && game.tick > v.stunnedUntilTick);
  for (const ghost of ghosts) {
    const target = game.players.find(
      (v) =>
        !v.ghost &&
        game.tick > v.immuneUntilTick &&
        Math.abs(v.x - ghost.x) < GHOST_TOUCH_DISTANCE &&
        Math.abs(v.y - ghost.y) < GHOST_TOUCH_DISTANCE,
    );
    if (!target) continue;
    target.ghost = true;
    target.ghostAtTick = game.tick;
    ghost.ghost = false;
    ghost.ghostAtTick = null;
    ghost.immuneUntilTick = game.tick + REVIVE_IMMUNITY_TICKS;
  }
}

/**
 * 혼자 남으면 그 플레이어가 이기고, 남은 플레이어가 한꺼번에 탈락하면 그 플레이어들이 함께 이긴다.
 * 시간이 다 되어도 끝나지 않고 서든 데스로 이어진다.
 */
function judge(game: Game): GameResult | null {
  const alive = game.players.filter((v) => !v.ghost);
  if (alive.length === 0 || (game.participantCount > 1 && alive.length === 1)) {
    const winners =
      alive.length || game.participantCount === 1
        ? alive
        : game.players.filter((v) => v.ghostAtTick === game.tick);
    return { reason: "lastSurvivor", winnerIds: winners.map((v) => v.userId) };
  }
  return null;
}

export function getTileIndex(x: number, y: number): number {
  return y * MAP_COLS + x;
}

function getTile(game: Game, x: number, y: number): string | null {
  if (x < 0 || y < 0 || x >= MAP_COLS || y >= MAP_ROWS) return null;
  return game.tiles[getTileIndex(x, y)] ?? null;
}

function setTile(game: Game, index: number, tile: string): void {
  game.tiles[index] = tile;
  game.tilesChanged = true;
}

/** 캐릭터가 지나갈 수 있는 칸인지. 꾸루와는 겹칠 수 있으므로 따지지 않는다 */
export function isWalkable(game: Game, x: number, y: number): boolean {
  const tile = getTile(game, x, y);
  return tile !== null && tile !== TILES.wall && tile !== TILES.block;
}

/** 곱셈을 먼저 해서 딱 떨어지는 시각에 오차가 생기지 않게 한다 */
function ticksToMs(ticks: number): number {
  return (ticks * 1000) / TICK_RATE;
}

function snap(value: number): number {
  const rounded = Math.round(value);
  return Math.abs(value - rounded) <= EPSILON ? rounded : value;
}

function roundCoordinate(value: number): number {
  return Math.round(value * 1000) / 1000;
}

function shuffle<T>(list: T[], random: () => number): T[] {
  for (let i = list.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [list[i], list[j]] = [list[j] as T, list[i] as T];
  }
  return list;
}
