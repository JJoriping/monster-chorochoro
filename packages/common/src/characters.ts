/** 캐릭터별 능력치. 초기값에서 시작해 필드 아이템으로 상한까지 올린다 */
export type CharacterStats = {
  /** 파워 (폭풍의 길이) 초기값 */
  initialPower: number;
  /** 스피드 (이동 속도) 초기값 */
  initialSpeed: number;
  /** 꾸루 (동시에 놓을 수 있는 꾸루의 수) 초기값 */
  initialKuru: number;
  /** 파워 (폭풍의 길이) 상한 */
  maxPower: number;
  /** 스피드 (이동 속도) 상한 */
  maxSpeed: number;
  /** 꾸루 (동시에 놓을 수 있는 꾸루의 수) 상한 */
  maxKuru: number;
};

/** 능력치 상한이 가질 수 있는 가장 큰 값 */
export const STAT_LIMIT = 6;

export const CHARACTERS = {
  moremi: {
    initialPower: 0,
    initialSpeed: 1,
    initialKuru: 0,
    maxPower: 5,
    maxSpeed: 4,
    maxKuru: 5,
  },
  pazna: {
    initialPower: 1,
    initialSpeed: 0,
    initialKuru: 0,
    maxPower: 3,
    maxSpeed: 6,
    maxKuru: 5,
  },
  levisi: {
    initialPower: 0,
    initialSpeed: 1,
    initialKuru: 0,
    maxPower: 6,
    maxSpeed: 4,
    maxKuru: 4,
  },
} as const satisfies Record<string, CharacterStats>;

export type CharacterId = keyof typeof CHARACTERS;

export const CHARACTER_IDS = Object.keys(CHARACTERS) as CharacterId[];

/** 방에 들어왔을 때 처음 선택되는 캐릭터 */
export const DEFAULT_CHARACTER_ID: CharacterId = "moremi";

export function isCharacterId(value: unknown): value is CharacterId {
  return typeof value === "string" && Object.hasOwn(CHARACTERS, value);
}
