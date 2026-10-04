import { TICK_RATE } from "./constants";

export type Direction = "up" | "right" | "down" | "left";

/** 폭풍의 팔 길이처럼 방향별 값을 배열에 담을 때 이 순서를 따른다 */
export const DIRECTIONS = ["up", "right", "down", "left"] as const satisfies readonly Direction[];

export const DIRECTION_VECTORS: Record<Direction, { x: number; y: number }> = {
  up: { x: 0, y: -1 },
  right: { x: 1, y: 0 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
};

export function isDirection(value: unknown): value is Direction {
  return typeof value === "string" && Object.hasOwn(DIRECTION_VECTORS, value);
}

export type ItemType = "power" | "speed" | "kuru";

export const ITEM_TYPES = ["power", "speed", "kuru"] as const satisfies readonly ItemType[];

/** 맵은 타일 하나를 문자 하나로 나타내 이어 붙인 문자열로 주고받는다 */
export const TILES = {
  empty: ".",
  /** 부술 수 없는 벽 */
  wall: "#",
  /** 부술 수 있는 블록. 아이템이 들어 있어도 클라이언트에는 똑같이 보인다 */
  block: "B",
  power: "P",
  speed: "S",
  kuru: "K",
} as const;

export type Tile = (typeof TILES)[keyof typeof TILES];

export function getItemOfTile(tile: string): ItemType | null {
  switch (tile) {
    case TILES.power:
      return "power";
    case TILES.speed:
      return "speed";
    case TILES.kuru:
      return "kuru";
    default:
      return null;
  }
}

/** 한 틱의 길이 (ms) */
export const TICK_MS = 1000 / TICK_RATE;

/** 게임의 제한 시간 (ms) */
export const GAME_DURATION_MS = 180_000;

/** 게임을 시작하기 전에 카운트다운을 보여 주는 시간 (ms) */
export const GAME_COUNTDOWN_MS = 1500;

/** 카운트다운에 보이는 처음 숫자. 실제 시간과 관계없이 `GAME_COUNTDOWN_MS`를 이 수만큼 나눠 센다 */
export const GAME_COUNTDOWN_COUNT = 3;

/** 게임이 끝나고 결과를 보여 준 뒤 방으로 돌아가기까지의 시간 (ms) */
export const GAME_RESULT_MS = 5000;

/** 스피드 능력치가 0일 때의 이동 속도 (타일/초) */
export const BASE_MOVE_SPEED = 2.5;

/** 스피드 능력치 1당 늘어나는 이동 속도 (타일/초) */
export const MOVE_SPEED_PER_LEVEL = 0.7;

/** 유령의 이동 속도 (타일/초). 능력치와 관계없이 일정하다 */
export const GHOST_MOVE_SPEED = 1.5;

/** 꾸루가 앞으로 나아가는 속도 (타일/초) */
export const KURU_MOVE_SPEED = 2;

/** 꾸루를 놓고 나서 빨개지기까지의 시간 (ms). 빨개진 꾸루는 장애물에 닿으면 터진다 */
export const KURU_RED_MS = 2000;

/** 빨개진 꾸루가 장애물에 닿지 않을 때 저절로 터지기까지 더 걸리는 시간 (ms) */
export const KURU_IDLE_FUSE_MS = 3000;

/** 폭풍이 한 칸 퍼지는 데 걸리는 시간 (ms) */
export const FLAME_SPREAD_MS = 150;

/** 폭풍이 한 칸에 머무르는 시간 (ms) */
export const FLAME_DURATION_MS = 300;

export function getMoveSpeed(speedLevel: number): number {
  return BASE_MOVE_SPEED + MOVE_SPEED_PER_LEVEL * speedLevel;
}

/** 파워 능력치에 따른 폭풍의 길이 (칸) */
export function getBlastLength(powerLevel: number): number {
  return powerLevel + 1;
}

/** 꾸루 능력치에 따라 동시에 놓을 수 있는 꾸루의 수 */
export function getKuruLimit(kuruLevel: number): number {
  return kuruLevel + 1;
}
