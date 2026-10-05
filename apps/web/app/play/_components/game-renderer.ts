import {
  DIRECTION_VECTORS,
  DIRECTIONS,
  type Direction,
  type ExplosionState,
  FLAME_DURATION_MS,
  FLAME_SPREAD_MS,
  type GamePlayerInfo,
  type GamePlayerState,
  getItemOfTile,
  type ItemDrop,
  type ItemType,
  KURU_IDLE_FUSE_MS,
  KURU_RED_MS,
  type KuruState,
  MAP_COLS,
  MAP_ROWS,
  MAPS,
  type MapId,
  type MapTheme,
  parseMapLayout,
  TILES,
  type UserId,
} from "@monster-chorochoro/common";
import { color } from "@/utilities/tailwind";
import { CHARACTER_ART, FACE_ART } from "./character-art";
import type { GameSample } from "./game-buffer";

/** 타일 하나의 논리 크기 (px). 이 크기로 그린 뒤 캔버스 크기에 맞춰 늘린다 */
export const TILE_SIZE = 40;
export const BOARD_WIDTH = MAP_COLS * TILE_SIZE;
export const BOARD_HEIGHT = MAP_ROWS * TILE_SIZE;

export type RenderOptions = {
  theme: MapTheme;
  players: Map<UserId, GamePlayerInfo>;
  myId: UserId | null;
  /** 애니메이션에 쓰는 클라이언트 시각 (ms) */
  now: number;
  drops: DropAnimation[];
};

/** 떨어뜨린 아이템이 유령이 된 자리에서 놓일 칸까지 날아가는 애니메이션 */
export type DropAnimation = ItemDrop & {
  /** 날기 시작하는 클라이언트 시각 (ms) */
  startedAt: number;
  durationMs: number;
};

/** 떨어뜨린 아이템이 날아가는 시간 (ms). 멀리 갈수록 조금 더 걸린다 */
const DROP_BASE_MS = 450;
const DROP_MS_PER_TILE = 35;
const DROP_MAX_MS = 900;

/** 한꺼번에 떨어뜨린 아이템이 하나씩 튀어 나가도록 차례마다 늦추는 시간 (ms) */
const DROP_STAGGER_MS = 70;

/** order는 함께 떨어뜨린 아이템 가운데 몇 번째인지다 */
export function createDropAnimation(drop: ItemDrop, now: number, order: number): DropAnimation {
  const distance = Math.hypot(drop.x - drop.fromX, drop.y - drop.fromY);
  return {
    ...drop,
    startedAt: now + order * DROP_STAGGER_MS,
    durationMs: Math.min(DROP_BASE_MS + distance * DROP_MS_PER_TILE, DROP_MAX_MS),
  };
}

type Point = { x: number; y: number };

const FLOOR_COLORS: Record<MapTheme, [string, string]> = {
  forest: [color("green-5"), color("green-4")],
  sea: [color("yellow-5"), color("brown-5")],
  village: [color("gray-5"), color("orange-5")],
  factory: [color("gray-4"), color("gray-5")],
  ice: [color("cyan-5"), color("cyan-4")],
  volcano: [color("red-5"), color("brown-4")],
};

const INK = color("gray+4");

export function renderGame(
  ctx: CanvasRenderingContext2D,
  sample: GameSample,
  options: RenderOptions,
): void {
  const { from, to, alpha } = sample;
  const elapsedSinceFrom = alpha * (to.time - from.time);

  // 아직 날아가는 아이템은 놓일 칸에 미리 그리지 않는다
  const landing = new Set(
    options.drops
      .filter((v) => options.now < v.startedAt + v.durationMs)
      .map((v) => v.y * MAP_COLS + v.x),
  );
  drawFloor(ctx, options.theme);
  drawTiles(ctx, from.tiles, options, landing);
  for (const v of from.explosions) drawWarning(ctx, v, v.elapsedMs + elapsedSinceFrom);
  for (const v of from.kurus) {
    drawKuru(
      ctx,
      v,
      lerpPoint(
        v,
        to.kurus.find((w) => w.id === v.id),
        alpha,
      ),
      v.elapsedMs + elapsedSinceFrom,
      options.now,
    );
  }
  for (const v of from.explosions) drawFlames(ctx, v, v.elapsedMs + elapsedSinceFrom);

  const players = from.players
    .map((v) => ({ state: v, position: lerpPoint(v, findPlayer(to.players, v.userId), alpha) }))
    .sort((a, b) => a.position.y - b.position.y);
  for (const { state, position } of players) {
    drawPlayer(ctx, state, position, options);
  }
  for (const v of options.drops) drawDrop(ctx, v, from.tiles, options.now);
  for (const { state, position } of players) {
    const info = options.players.get(state.userId);
    if (info) drawName(ctx, info.nickname, position, state.userId === options.myId);
  }
}

/** 방에서 고른 맵을 게임과 같은 모습으로 그리고 시작 위치를 표시한다 */
export function renderMapPreview(ctx: CanvasRenderingContext2D, mapId: MapId): void {
  const { theme } = MAPS[mapId];
  const { tiles, spawns } = parseMapLayout(mapId);

  drawFloor(ctx, theme);
  drawTiles(ctx, tiles, { theme, now: 0 });
  ctx.fillStyle = color("white", 0.8);
  ctx.strokeStyle = color("blue");
  ctx.lineWidth = 3;
  for (const v of spawns) {
    const center = toCanvas(v);
    circle(ctx, center.x, center.y, 12);
    ctx.fill();
    ctx.stroke();
  }
  ctx.fillStyle = color("blue");
  for (const v of spawns) {
    const center = toCanvas(v);
    circle(ctx, center.x, center.y, 5);
    ctx.fill();
  }
}

function findPlayer(list: GamePlayerState[], userId: UserId): GamePlayerState | undefined {
  return list.find((v) => v.userId === userId);
}

/** 한 틱 사이에 한 칸 넘게 움직였다면 보간하지 않고 바로 옮긴다 */
function lerpPoint(from: Point, to: Point | undefined, alpha: number): Point {
  if (!to || Math.abs(to.x - from.x) + Math.abs(to.y - from.y) > 1) return from;
  return { x: from.x + (to.x - from.x) * alpha, y: from.y + (to.y - from.y) * alpha };
}

/** 타일 좌표의 한가운데에 해당하는 캔버스 좌표 */
function toCanvas(point: Point): Point {
  return { x: (point.x + 0.5) * TILE_SIZE, y: (point.y + 0.5) * TILE_SIZE };
}

function drawFloor(ctx: CanvasRenderingContext2D, theme: MapTheme): void {
  const [even, odd] = FLOOR_COLORS[theme];
  for (let y = 0; y < MAP_ROWS; y++) {
    for (let x = 0; x < MAP_COLS; x++) {
      ctx.fillStyle = (x + y) % 2 ? odd : even;
      ctx.fillRect(x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
    }
  }
}

/** hidden에 든 칸의 아이템은 그리지 않는다 */
function drawTiles(
  ctx: CanvasRenderingContext2D,
  tiles: string,
  options: Pick<RenderOptions, "theme" | "now">,
  hidden: ReadonlySet<number> = new Set(),
): void {
  for (let i = 0; i < tiles.length; i++) {
    const tile = tiles.charAt(i);
    const left = (i % MAP_COLS) * TILE_SIZE;
    const top = Math.floor(i / MAP_COLS) * TILE_SIZE;
    if (tile === TILES.wall) drawWall(ctx, options.theme, left, top);
    else if (tile === TILES.block) drawBlock(ctx, options.theme, left, top);
    else {
      const item = getItemOfTile(tile);
      if (item && !hidden.has(i)) drawItem(ctx, item, left, top, options.now + i * 97);
    }
  }
}

function drawWall(ctx: CanvasRenderingContext2D, theme: MapTheme, left: number, top: number): void {
  const cx = left + TILE_SIZE / 2;
  switch (theme) {
    case "forest":
      // 나무
      ctx.fillStyle = color("brown+1");
      ctx.fillRect(cx - 4, top + 24, 8, 13);
      ctx.fillStyle = color("green+2");
      circle(ctx, cx, top + 17, 15);
      ctx.fill();
      ctx.fillStyle = color("green+1");
      circle(ctx, cx - 3, top + 14, 10);
      ctx.fill();
      break;
    case "sea":
      // 물
      ctx.fillStyle = color("blue-1");
      ctx.fillRect(left, top, TILE_SIZE, TILE_SIZE);
      ctx.strokeStyle = color("blue-3");
      ctx.lineWidth = 2;
      for (const y of [13, 27]) {
        ctx.beginPath();
        ctx.moveTo(left + 6, top + y);
        ctx.quadraticCurveTo(left + 13, top + y - 5, left + 20, top + y);
        ctx.quadraticCurveTo(left + 27, top + y + 5, left + 34, top + y);
        ctx.stroke();
      }
      break;
    case "village":
      // 집
      ctx.fillStyle = color("brown-4");
      ctx.fillRect(left + 6, top + 18, 28, 19);
      ctx.fillStyle = color("brown+1");
      ctx.fillRect(cx - 4, top + 26, 8, 11);
      ctx.fillStyle = color("red-1");
      ctx.beginPath();
      ctx.moveTo(left + 2, top + 20);
      ctx.lineTo(cx, top + 3);
      ctx.lineTo(left + TILE_SIZE - 2, top + 20);
      ctx.closePath();
      ctx.fill();
      break;
    case "factory":
      // 나사로 조인 쇳덩이 기계
      ctx.fillStyle = color("gray+1");
      ctx.fillRect(left, top, TILE_SIZE, TILE_SIZE);
      ctx.fillStyle = color("gray-1");
      ctx.fillRect(left + 3, top + 3, TILE_SIZE - 6, TILE_SIZE - 6);
      ctx.fillStyle = color("yellow");
      ctx.fillRect(left + 3, top + 17, TILE_SIZE - 6, 6);
      ctx.fillStyle = color("gray+2");
      for (const [x, y] of [
        [8, 8],
        [32, 8],
        [8, 32],
        [32, 32],
      ] as const) {
        circle(ctx, left + x, top + y, 2.5);
        ctx.fill();
      }
      break;
    case "ice":
      // 얼음 기둥
      ctx.fillStyle = color("cyan-2");
      ctx.strokeStyle = color("cyan+1");
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(cx, top + 2);
      ctx.lineTo(left + TILE_SIZE - 5, top + 14);
      ctx.lineTo(left + TILE_SIZE - 8, top + TILE_SIZE - 3);
      ctx.lineTo(left + 8, top + TILE_SIZE - 3);
      ctx.lineTo(left + 5, top + 14);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = color("cyan-4");
      ctx.beginPath();
      ctx.moveTo(cx, top + 7);
      ctx.lineTo(cx - 9, top + 15);
      ctx.lineTo(cx - 6, top + 31);
      ctx.closePath();
      ctx.fill();
      break;
    case "volcano":
      // 용암. 바다의 물처럼 칸을 가득 채워 이웃한 칸끼리 이어 보이게 한다
      ctx.fillStyle = color("red+1");
      ctx.fillRect(left, top, TILE_SIZE, TILE_SIZE);
      ctx.fillStyle = color("orange");
      ctx.beginPath();
      ctx.ellipse(left + 13, top + 13, 8, 5, -0.3, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(left + 27, top + 28, 9, 5, 0.3, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = color("yellow-2");
      circle(ctx, left + 12, top + 12, 2.5);
      ctx.fill();
      circle(ctx, left + 29, top + 27, 3);
      ctx.fill();
      break;
  }
}

function drawBlock(
  ctx: CanvasRenderingContext2D,
  theme: MapTheme,
  left: number,
  top: number,
): void {
  switch (theme) {
    case "forest":
      // 나무 상자
      ctx.fillStyle = color("brown-2");
      ctx.strokeStyle = color("brown+1");
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(left + 4, top + 4, TILE_SIZE - 8, TILE_SIZE - 8, 4);
      ctx.fill();
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(left + 8, top + 8);
      ctx.lineTo(left + TILE_SIZE - 8, top + TILE_SIZE - 8);
      ctx.moveTo(left + TILE_SIZE - 8, top + 8);
      ctx.lineTo(left + 8, top + TILE_SIZE - 8);
      ctx.stroke();
      break;
    case "sea":
      // 바위
      ctx.fillStyle = color("gray-2");
      ctx.strokeStyle = color("gray");
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(left + 20, top + 22, 16, 14, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = color("gray-4");
      ctx.beginPath();
      ctx.ellipse(left + 15, top + 16, 6, 4, -0.4, 0, Math.PI * 2);
      ctx.fill();
      break;
    case "village":
      // 짚단
      ctx.fillStyle = color("yellow-2");
      ctx.strokeStyle = color("yellow+2");
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(left + 4, top + 6, TILE_SIZE - 8, TILE_SIZE - 10, 8);
      ctx.fill();
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(left + 4, top + 16);
      ctx.lineTo(left + TILE_SIZE - 4, top + 16);
      ctx.moveTo(left + 4, top + 26);
      ctx.lineTo(left + TILE_SIZE - 4, top + 26);
      ctx.stroke();
      break;
    case "factory":
      // 기름통
      ctx.fillStyle = color("orange");
      ctx.strokeStyle = color("orange+2");
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(left + 7, top + 4, TILE_SIZE - 14, TILE_SIZE - 8, 4);
      ctx.fill();
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(left + 7, top + 15);
      ctx.lineTo(left + TILE_SIZE - 7, top + 15);
      ctx.moveTo(left + 7, top + 25);
      ctx.lineTo(left + TILE_SIZE - 7, top + 25);
      ctx.stroke();
      break;
    case "ice":
      // 눈덩이 더미. 테두리를 먼저 그리고 덮어 칠해 겹친 부분의 선을 지운다
      ctx.fillStyle = color("white");
      ctx.strokeStyle = color("blue-3");
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.ellipse(left + 20, top + 27, 16, 10, 0, 0, Math.PI * 2);
      ctx.moveTo(left + 30, top + 15);
      ctx.ellipse(left + 20, top + 15, 10, 8, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fill();
      break;
    case "volcano":
      // 구멍이 숭숭 난 화산석
      ctx.fillStyle = color("gray+2");
      ctx.strokeStyle = color("gray+4");
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(left + 5, top + 30);
      ctx.lineTo(left + 8, top + 13);
      ctx.lineTo(left + 18, top + 5);
      ctx.lineTo(left + 31, top + 9);
      ctx.lineTo(left + 36, top + 24);
      ctx.lineTo(left + 30, top + 35);
      ctx.lineTo(left + 12, top + 36);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = color("gray+4");
      for (const [x, y, radius] of [
        [15, 17, 2.5],
        [25, 14, 2],
        [27, 26, 3],
        [15, 28, 2],
      ] as const) {
        circle(ctx, left + x, top + y, radius);
        ctx.fill();
      }
      break;
  }
}

const ITEM_COLORS: Record<ItemType, string> = {
  power: color("red"),
  speed: color("green+1"),
  kuru: color("orange+1"),
};

/** 24×24 좌표계의 아이템 그림. Lucide의 Zap, ChevronsRight 아이콘과 같다 */
const ITEM_PATHS = {
  power:
    "M15.914 4a1.5 1.5 0 00-2.474-1.561l-9 9A1.5 1.5 0 005.5 14h4.002a.5.5 0 01.471.666L8.086 20a1.5 1.5 0 002.475 1.56l9-9A1.5 1.5 0 0018.5 10h-3.997a.5.5 0 01-.472-.667z",
  speed: "m6 17 5-5-5-5 m7 10 5-5-5-5",
};

function drawItem(
  ctx: CanvasRenderingContext2D,
  item: ItemType,
  left: number,
  top: number,
  phase: number,
): void {
  const bob = Math.sin(phase / 250) * 1.5;
  const itemColor = ITEM_COLORS[item];
  ctx.save();
  ctx.translate(left, top + bob);
  ctx.fillStyle = color("white");
  ctx.strokeStyle = itemColor;
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.roundRect(7, 7, 26, 26, 7);
  ctx.fill();
  ctx.stroke();

  if (item === "kuru") {
    drawKuruBody(ctx, { x: 20, y: 21 }, 8, color("yellow-2"), itemColor, "down");
  } else {
    ctx.translate(8, 8);
    const path = getPath(ITEM_PATHS[item]);
    if (item === "power") {
      ctx.fillStyle = itemColor;
      ctx.fill(path);
    } else {
      ctx.strokeStyle = itemColor;
      ctx.lineWidth = 2.5;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.stroke(path);
    }
  }
  ctx.restore();
}

/** 떨어뜨린 아이템은 빙글 돌며 포물선을 그려 놓일 칸에 떨어진다. 그 사이에 누가 주워 칸이 비면 그리지 않는다 */
function drawDrop(
  ctx: CanvasRenderingContext2D,
  drop: DropAnimation,
  tiles: string,
  now: number,
): void {
  const progress = (now - drop.startedAt) / drop.durationMs;
  if (progress < 0 || progress >= 1 || !getItemOfTile(tiles.charAt(drop.y * MAP_COLS + drop.x))) {
    return;
  }
  const from = toCanvas({ x: drop.fromX, y: drop.fromY });
  const to = toCanvas(drop);
  const x = from.x + (to.x - from.x) * progress;
  const groundY = from.y + (to.y - from.y) * progress;
  // 멀리 날아가는 아이템일수록 높이 뜨되 보드 밖으로 너무 나가지 않게 한다
  const distance = Math.hypot(drop.x - drop.fromX, drop.y - drop.fromY);
  const peak = TILE_SIZE * (1 + Math.min(distance, 8) * 0.15);
  const height = peak * 4 * progress * (1 - progress);

  ctx.fillStyle = color("gray+5", 0.15);
  ctx.beginPath();
  ctx.ellipse(x, groundY + 14, 10, 3.5, 0, 0, Math.PI * 2);
  ctx.fill();

  const scale = 0.6 + progress * 0.4;
  ctx.save();
  ctx.translate(x, groundY - height);
  ctx.rotate((1 - progress) * Math.PI * 2 * (to.x < from.x ? -1 : 1));
  ctx.scale(scale, scale);
  drawItem(ctx, drop.item, -TILE_SIZE / 2, -TILE_SIZE / 2, 0);
  ctx.restore();
}

function drawKuru(
  ctx: CanvasRenderingContext2D,
  kuru: KuruState,
  position: Point,
  elapsedMs: number,
  now: number,
): void {
  const center = toCanvas(position);
  const red = elapsedMs >= KURU_RED_MS;
  // 빨개진 꾸루는 곧 터진다는 것을 알 수 있게 두근거린다
  const radius = red ? 13 * (1 + Math.sin(now / 50) * 0.07) : 13;
  ctx.fillStyle = color("gray+5", 0.15);
  ctx.beginPath();
  ctx.ellipse(center.x, center.y + 13, 11, 4, 0, 0, Math.PI * 2);
  ctx.fill();
  drawKuruBody(
    ctx,
    center,
    radius,
    red ? color("red-1") : color("yellow-2"),
    red ? color("red+2") : color("orange+1"),
    kuru.direction,
  );
  if (red) drawKuruCountdown(ctx, center, KURU_RED_MS + KURU_IDLE_FUSE_MS - elapsedMs);
}

/** 빨개진 꾸루 위에 저절로 터지기까지 남은 시간을 초 단위로 띄운다 */
function drawKuruCountdown(
  ctx: CanvasRenderingContext2D,
  center: Point,
  remainingMs: number,
): void {
  const text = String(Math.max(1, Math.ceil(remainingMs / 1000)));
  const y = center.y - 16;
  ctx.font = "bold 13px sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "bottom";
  ctx.lineJoin = "round";
  ctx.lineWidth = 3;
  ctx.strokeStyle = color("white");
  ctx.strokeText(text, center.x, y);
  ctx.fillStyle = color("red+2");
  ctx.fillText(text, center.x, y);
}

function drawKuruBody(
  ctx: CanvasRenderingContext2D,
  center: Point,
  radius: number,
  fill: string,
  stroke: string,
  direction: Direction,
): void {
  ctx.fillStyle = fill;
  ctx.strokeStyle = stroke;
  ctx.lineWidth = 2;
  circle(ctx, center.x, center.y, radius);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = color("white", 0.7);
  ctx.beginPath();
  ctx.ellipse(
    center.x - radius * 0.35,
    center.y - radius * 0.4,
    radius * 0.3,
    radius * 0.2,
    -0.5,
    0,
    Math.PI * 2,
  );
  ctx.fill();
  // 굴러가는 쪽을 바라보는 두 눈
  const vector = DIRECTION_VECTORS[direction];
  const eyeX = center.x + vector.x * radius * 0.3;
  const eyeY = center.y + vector.y * radius * 0.25 + radius * 0.1;
  ctx.fillStyle = INK;
  for (const side of [-1, 1]) {
    circle(ctx, eyeX + side * radius * 0.32, eyeY, Math.max(1.2, radius * 0.13));
    ctx.fill();
  }
}

/** 폭발과 함께 폭풍이 덮을 범위에 붉은 그림자를 깐다. 그림자는 그 칸에 폭풍이 닿으면 사라진다 */
function drawWarning(
  ctx: CanvasRenderingContext2D,
  explosion: ExplosionState,
  elapsedMs: number,
): void {
  ctx.fillStyle = color("red", 0.25);
  for (const { cell, distance } of getExplosionCells(explosion)) {
    if (elapsedMs >= distance * FLAME_SPREAD_MS) continue;
    ctx.beginPath();
    ctx.roundRect(cell.x * TILE_SIZE + 2, cell.y * TILE_SIZE + 2, TILE_SIZE - 4, TILE_SIZE - 4, 6);
    ctx.fill();
  }
}

/** 폭풍은 중심에서부터 한 칸씩 퍼지며, 칸마다 부풀었다가 사그라든다 */
function drawFlames(
  ctx: CanvasRenderingContext2D,
  explosion: ExplosionState,
  elapsedMs: number,
): void {
  for (const { cell, distance, blocked } of getExplosionCells(explosion)) {
    // 폭풍은 블록을 부수기만 하고 그 칸에 머무르지 않는다
    if (blocked) continue;
    const progress = (elapsedMs - distance * FLAME_SPREAD_MS) / FLAME_DURATION_MS;
    if (progress < 0 || progress >= 1) continue;
    const scale = progress < 0.15 ? progress / 0.15 : progress > 0.7 ? (1 - progress) / 0.3 : 1;
    const center = toCanvas(cell);
    const outer = TILE_SIZE * 0.95 * scale;
    const inner = TILE_SIZE * 0.55 * scale;
    ctx.fillStyle = color("orange");
    ctx.beginPath();
    ctx.roundRect(center.x - outer / 2, center.y - outer / 2, outer, outer, outer * 0.3);
    ctx.fill();
    ctx.fillStyle = color("yellow-3");
    ctx.beginPath();
    ctx.roundRect(center.x - inner / 2, center.y - inner / 2, inner, inner, inner * 0.4);
    ctx.fill();
  }
}

/** 폭풍이 덮을 칸들. blocked는 블록을 부수고 멈추는 끝 칸인지다 */
function getExplosionCells(
  explosion: ExplosionState,
): { cell: Point; distance: number; blocked: boolean }[] {
  const cells = [{ cell: { x: explosion.x, y: explosion.y }, distance: 0, blocked: false }];
  DIRECTIONS.forEach((direction, i) => {
    const vector = DIRECTION_VECTORS[direction];
    const arm = explosion.arms[i] ?? 0;
    for (let distance = 1; distance <= arm; distance++) {
      cells.push({
        cell: { x: explosion.x + vector.x * distance, y: explosion.y + vector.y * distance },
        distance,
        blocked: distance === arm && (explosion.blocked[i] ?? false),
      });
    }
  });
  return cells;
}

function drawPlayer(
  ctx: CanvasRenderingContext2D,
  state: GamePlayerState,
  position: Point,
  options: RenderOptions,
): void {
  const info = options.players.get(state.userId);
  if (!info) return;
  const center = toCanvas(position);

  ctx.fillStyle = color("gray+5", 0.18);
  ctx.beginPath();
  ctx.ellipse(center.x, center.y + 15, 13, 4.5, 0, 0, Math.PI * 2);
  ctx.fill();

  if (state.ghost) {
    drawGhost(ctx, center, options.now + state.userId * 300, state.stunned);
    return;
  }
  const art = CHARACTER_ART[info.characterId];
  const bob = state.moving ? Math.abs(Math.sin(options.now / 90)) * 3 : 0;
  const vector = DIRECTION_VECTORS[state.direction];

  ctx.save();
  // 갓 되살아나 유령이 닿아도 괜찮은 동안에는 깜박인다
  if (state.immune && Math.floor(options.now / 100) % 2) ctx.globalAlpha = 0.35;
  ctx.translate(center.x - 20, center.y - 22 - bob);
  ctx.fillStyle = art.accessory.fill;
  ctx.fill(getPath(art.accessory.path));
  ctx.fillStyle = art.body;
  ellipse(ctx, FACE_ART.body);
  ctx.fill();
  // 바라보는 방향으로 얼굴을 살짝 돌린다
  ctx.translate(vector.x * 2.5, vector.y * 1.5);
  ctx.fillStyle = FACE_ART.ink;
  for (const v of FACE_ART.eyes) {
    ellipse(ctx, v);
    ctx.fill();
  }
  if (state.direction !== "up") {
    ctx.fillStyle = FACE_ART.cheek;
    for (const v of FACE_ART.cheeks) {
      ellipse(ctx, v);
      ctx.fill();
    }
    ctx.strokeStyle = FACE_ART.ink;
    ctx.lineWidth = 1.5;
    ctx.stroke(getPath(FACE_ART.mouth));
  }
  ctx.restore();
}

/** 유령은 봉지에 싸인 초콜릿처럼 생겼다. 기절하면 떠다니지 않고 눈이 풀린 채 머리 위로 별이 돈다 */
function drawGhost(
  ctx: CanvasRenderingContext2D,
  center: Point,
  phase: number,
  stunned: boolean,
): void {
  const float = stunned ? 0 : Math.sin(phase / 300) * 2;
  ctx.save();
  ctx.translate(center.x, center.y - 2 + float);
  ctx.globalAlpha = 0.85;
  // 봉지
  ctx.fillStyle = color("white", 0.75);
  ctx.strokeStyle = color("gray-2");
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(-6, -17);
  ctx.lineTo(0, -12);
  ctx.lineTo(6, -17);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.roundRect(-14, -12, 28, 26, 9);
  ctx.fill();
  ctx.stroke();
  // 초콜릿
  ctx.fillStyle = color("brown+3");
  ctx.beginPath();
  ctx.roundRect(-9, -6, 18, 15, 3);
  ctx.fill();
  ctx.strokeStyle = color("brown+2");
  ctx.beginPath();
  ctx.moveTo(0, -6);
  ctx.lineTo(0, 9);
  ctx.moveTo(-9, 1.5);
  ctx.lineTo(9, 1.5);
  ctx.stroke();
  if (stunned) {
    ctx.strokeStyle = color("white");
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    for (const side of [-1, 1]) {
      ctx.moveTo(side * 4 - 1.6, -3.6);
      ctx.lineTo(side * 4 + 1.6, -0.4);
      ctx.moveTo(side * 4 + 1.6, -3.6);
      ctx.lineTo(side * 4 - 1.6, -0.4);
    }
    ctx.stroke();
  } else {
    ctx.fillStyle = color("white");
    for (const side of [-1, 1]) {
      circle(ctx, side * 4, -2, 1.6);
      ctx.fill();
    }
  }
  ctx.restore();
  if (stunned) drawStunStars(ctx, center, phase);
}

/** 기절한 유령의 머리 위를 맴도는 별 세 개 */
function drawStunStars(ctx: CanvasRenderingContext2D, center: Point, phase: number): void {
  ctx.fillStyle = color("yellow");
  ctx.strokeStyle = color("orange+1");
  ctx.lineWidth = 1;
  for (let i = 0; i < 3; i++) {
    const angle = phase / 200 + (i * Math.PI * 2) / 3;
    const x = center.x + Math.cos(angle) * 12;
    const y = center.y - 19 + Math.sin(angle) * 3.5;
    ctx.beginPath();
    for (let j = 0; j < 10; j++) {
      const radius = j % 2 ? 1.6 : 4;
      const pointAngle = -Math.PI / 2 + (j * Math.PI) / 5;
      ctx.lineTo(x + Math.cos(pointAngle) * radius, y + Math.sin(pointAngle) * radius);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }
}

/** 이름은 머리 위에 쓰되, 맨 윗줄에서는 발밑에 쓰고 좌우 끝에서는 보드 안으로 밀어 넣는다 */
function drawName(
  ctx: CanvasRenderingContext2D,
  name: string,
  position: Point,
  isMe: boolean,
): void {
  const center = toCanvas(position);
  ctx.font = "bold 11px sans-serif";
  const halfWidth = ctx.measureText(name).width / 2 + 2;
  const x = Math.min(Math.max(center.x, halfWidth), BOARD_WIDTH - halfWidth);
  const above = center.y - 22 >= 12;
  const y = above ? center.y - 22 : center.y + 22;
  ctx.textAlign = "center";
  ctx.textBaseline = above ? "bottom" : "top";
  ctx.lineJoin = "round";
  ctx.lineWidth = 3;
  ctx.strokeStyle = color("white");
  ctx.strokeText(name, x, y);
  ctx.fillStyle = isMe ? color("blue+1") : INK;
  ctx.fillText(name, x, y);
}

const pathCache = new Map<string, Path2D>();

/** Path2D는 브라우저에만 있으므로 모듈을 불러올 때가 아니라 처음 그릴 때 만들어 둔다 */
function getPath(data: string): Path2D {
  let path = pathCache.get(data);
  if (!path) {
    path = new Path2D(data);
    pathCache.set(data, path);
  }
  return path;
}

function circle(ctx: CanvasRenderingContext2D, x: number, y: number, radius: number): void {
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
}

function ellipse(
  ctx: CanvasRenderingContext2D,
  shape: { cx: number; cy: number; rx: number; ry: number },
): void {
  ctx.beginPath();
  ctx.ellipse(shape.cx, shape.cy, shape.rx, shape.ry, 0, 0, Math.PI * 2);
}
