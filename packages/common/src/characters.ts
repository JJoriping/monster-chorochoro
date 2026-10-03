/** 캐릭터별 능력치 상한. 모든 캐릭터는 0에서 시작해 필드 아이템으로 상한까지 올린다 */
export type CharacterStats = {
  /** 파워 (폭풍의 길이) */
  maxPower: number;
  /** 스피드 (이동 속도) */
  maxSpeed: number;
  /** 꾸루 (동시에 놓을 수 있는 꾸루의 수) */
  maxKuru: number;
};

/** 능력치 상한이 가질 수 있는 가장 큰 값 */
export const STAT_LIMIT = 6;

export const CHARACTERS = {
  moremi: { maxPower: 5, maxSpeed: 3, maxKuru: 5 },
  pazna: { maxPower: 3, maxSpeed: 6, maxKuru: 4 },
} as const satisfies Record<string, CharacterStats>;

export type CharacterId = keyof typeof CHARACTERS;

export const CHARACTER_IDS = Object.keys(CHARACTERS) as CharacterId[];

/** 방에 들어왔을 때 처음 선택되는 캐릭터 */
export const DEFAULT_CHARACTER_ID: CharacterId = "moremi";

export function isCharacterId(value: unknown): value is CharacterId {
  return typeof value === "string" && Object.hasOwn(CHARACTERS, value);
}
