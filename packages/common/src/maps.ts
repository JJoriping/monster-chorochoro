export type MapTheme = "forest" | "sea" | "village";

export const MAPS = {
  "forest-1": { theme: "forest" },
  "sea-1": { theme: "sea" },
  "village-1": { theme: "village" },
} as const satisfies Record<string, { theme: MapTheme }>;

export type MapId = keyof typeof MAPS;

export const MAP_IDS = Object.keys(MAPS) as MapId[];

/** 방을 만들었을 때 처음 선택되는 맵 */
export const DEFAULT_MAP_ID: MapId = "forest-1";

export function isMapId(value: unknown): value is MapId {
  return typeof value === "string" && Object.hasOwn(MAPS, value);
}
