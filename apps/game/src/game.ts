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
  getBlastLength,
  getItemOfTile,
  getKuruLimit,
  getMoveSpeed,
  ITEM_TYPES,
  type ItemType,
  KURU_IDLE_FUSE_MS,
  KURU_MOVE_SPEED,
  KURU_RED_MS,
  MAP_COLS,
  MAP_ROWS,
  type MapId,
  parseMapLayout,
  TICK_RATE,
  TILES,
  type UserId,
} from "@monster-chorochoro/common";

/** 이보다 작은 좌표 차이는 없는 것으로 본다 */
const EPSILON = 1e-6;

/** 블록 중 아이템이 들어 있는 블록의 비율 */
const ITEM_BLOCK_RATIO = 0.35;

const ITEM_TILES: Record<ItemType, string> = {
  power: TILES.power,
  speed: TILES.speed,
  kuru: TILES.kuru,
};

export type GameParticipant = {
  userId: UserId;
  characterId: CharacterId;
};

type GamePlayer = {
  userId: UserId;
  characterId: CharacterId;
  /** 타일 단위 좌표. 정수일 때 타일의 한가운데에 있고, 둘 중 하나는 늘 정수다 */
  x: number;
  y: number;
  direction: Direction;
  /** 누르고 있는 방향 */
  input: Direction | null;
  moving: boolean;
  ghost: boolean;
  /** 유령이 된 틱. 동시에 탈락한 플레이어를 가리는 데 쓴다 */
  ghostAtTick: number | null;
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
  /** 터진 뒤로 지난 틱 수 */
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
  result: GameResult | null;
  nextEntityId: number;
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
      power: 0,
      speed: 0,
      kuru: 0,
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
    result: null,
    nextEntityId: 1,
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
  // 첫 틱 전은 카운트다운 중이다
  if (game.result || game.tick === 0) return;
  const player = game.players.find((v) => v.userId === userId);
  if (!player || player.ghost) return;
  if (game.kurus.filter((v) => v.ownerId === userId).length >= getKuruLimit(player.kuru)) return;
  const x = Math.round(player.x);
  const y = Math.round(player.y);
  if (isKuruAt(game, x, y)) return;

  game.kurus.push({
    id: game.nextEntityId++,
    ownerId: userId,
    x,
    y,
    direction: player.direction,
    blastLength: getBlastLength(player.power),
    age: 0,
  });
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
  game.result = judge(game);
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
      power: v.power,
      speed: v.speed,
      kuru: v.kuru,
    })),
    kurus: game.kurus.map((v) => ({
      id: v.id,
      x: roundCoordinate(v.x),
      y: roundCoordinate(v.y),
      direction: v.direction,
      red: ticksToMs(v.age) >= KURU_RED_MS,
    })),
    explosions: game.explosions.map((v) => ({
      id: v.id,
      x: v.x,
      y: v.y,
      arms: [...v.arms],
      elapsedMs: Math.round(ticksToMs(v.age)),
    })),
  };
  if (game.tilesChanged) {
    snapshot.tiles = game.tiles.join("");
    game.tilesChanged = false;
  }
  return snapshot;
}

/**
 * 플레이어를 누르고 있는 방향으로 움직인다.
 * 칸 사이에 걸쳐 있을 때는 먼저 줄을 맞추며, 막힌 쪽 대신 열린 쪽 줄로 미끄러지듯 비켜 준다.
 */
function movePlayer(game: Game, player: GamePlayer): void {
  player.moving = false;
  const direction = player.input;
  if (!direction) return;
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

  const lane = Math.round(cross);
  const offset = cross - lane;
  if (Math.abs(offset) > EPSILON) {
    // 줄이 어긋나 있으면 나아가는 축은 칸 한가운데에 있다
    main = Math.round(main);
    const neighborLane = lane + Math.sign(offset);
    let targetLane: number;
    if (isOpen(main + sign, lane)) targetLane = lane;
    else if (isOpen(main + sign, neighborLane)) targetLane = neighborLane;
    else return;

    const gap = targetLane - cross;
    const step = Math.min(Math.abs(gap), remaining);
    cross = snap(cross + Math.sign(gap) * step);
    remaining -= step;
    player.moving = step > 0;
  }
  if (remaining > EPSILON && Math.abs(cross - Math.round(cross)) <= EPSILON) {
    cross = Math.round(cross);
    let next = snap(main + sign * remaining);
    // 이동한 뒤 몸이 걸치게 되는 가장 앞쪽 칸이 막혀 있으면 그 앞 칸의 한가운데에서 멈춘다
    const frontTile = sign > 0 ? Math.ceil(next) : Math.floor(next);
    if (!isOpen(frontTile, cross)) next = frontTile - sign;
    if (Math.abs(next - main) > EPSILON) player.moving = true;
    main = next;
  }

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
      if (!canKuruEnter(game, kuru, x + vector.x, y + vector.y)) return true;
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

function canKuruEnter(game: Game, kuru: Kuru, x: number, y: number): boolean {
  if (!isWalkable(game, x, y)) return false;
  return !game.kurus.some((v) => {
    if (v === kuru) return false;
    if (Math.round(v.x) === x && Math.round(v.y) === y) return true;
    // 그 칸으로 굴러 들어가는 중인 꾸루도 장애물이다
    const target = getKuruTarget(v);
    return target.x === x && target.y === y;
  });
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
  const explosion: Explosion = {
    id: game.nextEntityId++,
    x: Math.round(kuru.x),
    y: Math.round(kuru.y),
    blastLength: kuru.blastLength,
    arms: [0, 0, 0, 0],
    settled: [false, false, false, false],
    age: 0,
    spread: 0,
  };
  predictArms(game, explosion);
  game.explosions.push(explosion);
}

function updateExplosions(game: Game): void {
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
    if (v.ghost || !burning.has(getTileIndex(Math.round(v.x), Math.round(v.y)))) continue;
    v.ghost = true;
    v.ghostAtTick = game.tick;
  }
  game.explosions = game.explosions.filter((v) => ticksToMs(v.age) < getExplosionEndMs(v));
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
          return;
        }
        explosion.arms[i] = distance;
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
    for (let distance = explosion.spread + 1; distance <= explosion.blastLength; distance++) {
      const tile = getTile(
        game,
        explosion.x + vector.x * distance,
        explosion.y + vector.y * distance,
      );
      if (tile === null || tile === TILES.wall) break;
      length = distance;
      if (tile === TILES.block) break;
    }
    explosion.arms[i] = length;
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

/** 폭발의 중심에서 distance만큼 떨어진 폭풍 칸들 */
function getFlameCells(explosion: Explosion, distance: number): { x: number; y: number }[] {
  if (distance === 0) return [{ x: explosion.x, y: explosion.y }];
  return DIRECTIONS.flatMap((direction, i) => {
    if ((explosion.arms[i] ?? 0) < distance) return [];
    const vector = DIRECTION_VECTORS[direction];
    return [{ x: explosion.x + vector.x * distance, y: explosion.y + vector.y * distance }];
  });
}

function getExplosionEndMs(explosion: Explosion): number {
  return Math.max(...explosion.arms) * FLAME_SPREAD_MS + FLAME_DURATION_MS;
}

/**
 * 시간이 다 되면 살아남은 플레이어가 모두 이긴다.
 * 혼자 남으면 그 플레이어가 이기고, 남은 플레이어가 한꺼번에 탈락하면 그 플레이어들이 함께 이긴다.
 */
function judge(game: Game): GameResult | null {
  const alive = game.players.filter((v) => !v.ghost);
  if (getRemainingMs(game) <= 0) {
    return { reason: "timeout", winnerIds: alive.map((v) => v.userId) };
  }
  if (alive.length === 0 || (game.participantCount > 1 && alive.length === 1)) {
    const winners =
      alive.length || game.participantCount === 1
        ? alive
        : game.players.filter((v) => v.ghostAtTick === game.tick);
    return { reason: "lastSurvivor", winnerIds: winners.map((v) => v.userId) };
  }
  return null;
}

function getTileIndex(x: number, y: number): number {
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
function isWalkable(game: Game, x: number, y: number): boolean {
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
