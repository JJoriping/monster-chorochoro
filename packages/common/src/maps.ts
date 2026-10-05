import { MAP_COLS, MAP_ROWS } from "./constants";
import { TILES } from "./game";

export type MapTheme = "forest" | "sea" | "village" | "factory" | "ice" | "volcano";

/**
 * 맵의 배치. `TILES`의 문자에 더해 숫자 1~8로 시작 위치를 나타낸다.
 * 인원이 적을 때는 작은 숫자부터 쓰므로 서로 멀리 떨어진 자리일수록 작은 숫자를 준다.
 * 시작 위치의 수가 그 맵에서 함께 플레이할 수 있는 최대 인원이 된다.
 */
type MapDefinition = { theme: MapTheme; layout: readonly string[] };

export const MAPS = {
  // 나무가 바둑판처럼 늘어선 숲
  "forest-1": {
    theme: "forest",
    layout: [
      "1.BBBB.5.BBBB.3",
      ".#B#B#.#.#B#B#.",
      "BBB.BBBBBBB.BBB",
      "B#B#B#B#B#B#B#B",
      "BBBBB.BBB.BBBBB",
      ".#B#B#B#B#B#B#.",
      "7.BBBBB.BBBBB.8",
      ".#B#B#B#B#B#B#.",
      "BBBBB.BBB.BBBBB",
      "B#B#B#B#B#B#B#B",
      "BBB.BBBBBBB.BBB",
      ".#B#B#.#.#B#B#.",
      "4.BBBB.6.BBBB.2",
    ],
  },
  // 나무가 덤불을 이루고 가운데에 빈터가 트인 숲
  "forest-2": {
    theme: "forest",
    layout: [
      "1.BBB.B#B.BBB.3",
      ".#B.BB###BB.B#.",
      "B##BB.B#B.BB##B",
      "BB.B.BB.BB.B.BB",
      ".BB##B...B##BB.",
      "B.B##.B.B.##B.B",
      "5.BB.B.#.B.BB.6",
      "B.B##.B.B.##B.B",
      ".BB##B...B##BB.",
      "BB.B.BB.BB.B.BB",
      "B##BB.B#B.BB##B",
      ".#B.BB###BB.B#.",
      "4.BBB.B#B.BBB.2",
    ],
  },
  // 가운데의 호수와 물길이 길을 나누는 바다
  "sea-1": {
    theme: "sea",
    layout: [
      "1.BB.B.5.B.BB.3",
      "..B.B#...#B.B..",
      "BB.BB#B.B#BB.BB",
      "B.BB.BB#BB.BB.B",
      "##B.B.B#B.B.B##",
      ".B.BB.###.BB.B.",
      "7.B.B.###.B.B.8",
      ".B.BB.###.BB.B.",
      "##B.B.B#B.B.B##",
      "B.BB.BB#BB.BB.B",
      "BB.BB#B.B#BB.BB",
      "..B.B#...#B.B..",
      "4.BB.B.6.B.BB.2",
    ],
  },
  // 열십자 물길로 나뉜 네 섬과 가운데의 작은 섬
  "sea-2": {
    theme: "sea",
    layout: [
      "1.BBB.B#B.BBB.3",
      "..B.BB...BB.B..",
      "BB.B.BB#BB.B.BB",
      "B.BB.B.#.B.BB.B",
      ".B.B.#B#B#.B.B.",
      "BB.B.#B.B#.B.BB",
      "#.####.B.####.#",
      "BB.B.#B.B#.B.BB",
      ".B.B.#B#B#.B.B.",
      "B.BB.B.#.B.BB.B",
      "BB.B.BB#BB.B.BB",
      "..B.BB...BB.B..",
      "4.BBB.B#B.BBB.2",
    ],
  },
  // 2×2 크기의 집들 사이로 골목이 난 마을
  "village-1": {
    theme: "village",
    layout: [
      "1..BBB.5.BBB..3",
      ".##B.B...B.B##.",
      ".##BBB#.#BBB##.",
      "BBB.BBBBBBB.BBB",
      "B.BB##B.B##BB.B",
      ".BBB##B.B##BBB.",
      "7.B.BBB.BBB.B.8",
      ".BBB##B.B##BBB.",
      "B.BB##B.B##BB.B",
      "BBB.BBBBBBB.BBB",
      ".##BBB#.#BBB##.",
      ".##B.B...B.B##.",
      "4..BBB.6.BBB..2",
    ],
  },
  // 길게 이어 지은 집들이 둘러싼 넓은 광장이 있는 마을
  "village-2": {
    theme: "village",
    layout: [
      "1.BBBB.5.BBBB.3",
      ".###B.....B###.",
      "BBB.BB###BB.BBB",
      "B.B###B.B###B.B",
      "B.BB.......BB.B",
      ".###.B.B.B.###.",
      "7.B.B..#..B.B.8",
      ".###.B.B.B.###.",
      "B.BB.......BB.B",
      "B.B###B.B###B.B",
      "BBB.BB###BB.BBB",
      ".###B.....B###.",
      "4.BBBB.6.BBBB.2",
    ],
  },
  // 기계가 줄지어 놓여 큰길이 좁은 길목으로 이어지는 공장
  "factory-1": {
    theme: "factory",
    layout: [
      "1.BBBB.5.BBBB.3",
      ".####B...B####.",
      "BBB.BB###BB.BBB",
      "B#B.B.BBB.B.B#B",
      "B#BBB##.##BBB#B",
      ".#B.BB.B.BB.B#.",
      "7.B.B##B##B.B.8",
      ".#B.BB.B.BB.B#.",
      "B#BBB##.##BBB#B",
      "B#B.B.BBB.B.B#B",
      "BBB.BB###BB.BBB",
      ".####B...B####.",
      "4.BBBB.6.BBBB.2",
    ],
  },
  // 기계가 길게 늘어서 꾸루가 멀리 굴러가는 작업 통로가 난 공장
  "factory-2": {
    theme: "factory",
    layout: [
      "1.BBBBB.BBBBB.3",
      ".#####B.B#####.",
      "BB.B.BB.BB.B.BB",
      "B.####B#B####.B",
      "BB.BB.B.B.BB.BB",
      ".#B###B.B###B#.",
      "B.B.B.B#B.B.B.B",
      ".#B###B.B###B#.",
      "BB.BB.B.B.BB.BB",
      "B.####B#B####.B",
      "BB.B.BB.BB.B.BB",
      ".#####B.B#####.",
      "4.BBBBB.BBBBB.2",
    ],
  },
  // 얼음 기둥이 비스듬히 흩어져 사방이 트인 얼음판
  "ice-1": {
    theme: "ice",
    layout: [
      "1.BBB..5..BBB.3",
      ".#B.#B...B#.B#.",
      "BB.B.BB#BB.B.BB",
      ".B#BB.B.B.BB#B.",
      "B.BB#B.#.B#BB.B",
      ".B.B.B#.#B.B.B.",
      "7.B#B.B.B.B#B.8",
      ".B.B.B#.#B.B.B.",
      "B.BB#B.#.B#BB.B",
      ".B#BB.B.B.BB#B.",
      "BB.B.BB#BB.B.BB",
      ".#B.#B...B#.B#.",
      "4.BBB..6..BBB.2",
    ],
  },
  // 눈 더미에 둘러싸인 넓은 빙판에서 둘이 맞붙는 얼음 경기장
  "ice-2": {
    theme: "ice",
    layout: [
      "BB.BBB.B.BBB.BB",
      "B.#BB.B#B.BB#.B",
      ".BB.B.....B.BB.",
      "BB.#..B.B..#.BB",
      "B.B...#.#...B.B",
      ".B..B.....B..B.",
      "1.B.#..B..#.B.2",
      ".B..B.....B..B.",
      "B.B...#.#...B.B",
      "BB.#..B.B..#.BB",
      ".BB.B.....B.BB.",
      "B.#BB.B#B.BB#.B",
      "BB.BBB.B.BBB.BB",
    ],
  },
  // 용암을 두른 분화구 안에 블록이 몰린 화산
  "volcano-1": {
    theme: "volcano",
    layout: [
      "1.BBBB.5.BBBB.3",
      ".#B.B#B.B#B.B#.",
      "BBBBB.BBB.BBBBB",
      "B#B.###.###.B#B",
      "BB.B#BBBBB#B.BB",
      ".#BB#B.#.B#BB#.",
      "7.B..B###B..B.8",
      ".#BB#B.#.B#BB#.",
      "BB.B#BBBBB#B.BB",
      "B#B.###.###.B#B",
      "BBBBB.BBB.BBBBB",
      ".#B.B#B.B#B.B#.",
      "4.BBBB.6.BBBB.2",
    ],
  },
  // 가로로 흐르는 두 줄기의 용암을 다리로만 건널 수 있는 화산
  "volcano-2": {
    theme: "volcano",
    layout: [
      "1.BBBB.5.BBBB.3",
      ".B.B.BB.BB.B.B.",
      "BB.BB.B.B.BB.BB",
      "##B.###B###.B##",
      "B.BB.B.B.B.BB.B",
      ".BB#B.B.B.B#BB.",
      "B.B.BB#.#BB.B.B",
      ".BB#B.B.B.B#BB.",
      "B.BB.B.B.B.BB.B",
      "##B.###B###.B##",
      "BB.BB.B.B.BB.BB",
      ".B.B.BB.BB.B.B.",
      "4.BBBB.6.BBBB.2",
    ],
  },
} as const satisfies Record<string, MapDefinition>;

export type MapId = keyof typeof MAPS;

export const MAP_IDS = Object.keys(MAPS) as MapId[];

/** 방을 만들었을 때 처음 선택되는 맵 */
export const DEFAULT_MAP_ID: MapId = "forest-1";

export function isMapId(value: unknown): value is MapId {
  return typeof value === "string" && Object.hasOwn(MAPS, value);
}

/** 맵 배치를 타일 문자열과 시작 위치 목록으로 나눈다. 시작 위치는 숫자 순서대로 정렬된다 */
export function parseMapLayout(mapId: MapId): {
  tiles: string;
  spawns: { x: number; y: number }[];
} {
  const { layout } = MAPS[mapId];
  if (layout.length !== MAP_ROWS || layout.some((v) => v.length !== MAP_COLS)) {
    throw new Error(`Invalid map size: ${mapId}`);
  }
  const spawns: { x: number; y: number; order: number }[] = [];
  let tiles = "";

  layout.forEach((row, y) => {
    for (let x = 0; x < row.length; x++) {
      const tile = row.charAt(x);
      if (/\d/.test(tile)) {
        spawns.push({ x, y, order: Number(tile) });
        tiles += TILES.empty;
      } else {
        tiles += tile;
      }
    }
  });
  spawns.sort((a, b) => a.order - b.order);
  return { tiles, spawns: spawns.map(({ x, y }) => ({ x, y })) };
}

/** 맵에서 함께 플레이할 수 있는 최대 인원. 시작 위치의 수와 같다 */
export function getMapCapacity(mapId: MapId): number {
  return parseMapLayout(mapId).spawns.length;
}
