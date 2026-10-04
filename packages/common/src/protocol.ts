import type { CharacterId } from "./characters";
import type { Direction } from "./game";
import type { MapId } from "./maps";

export type UserId = number;
export type RoomId = number;

/** 대기 중인 방만 입장할 수 있다 */
export type RoomStatus = "waiting" | "playing";

/** 로비의 접속자 목록에 보이는 사용자 정보 */
export type UserSummary = {
  id: UserId;
  nickname: string;
  /** 로비에 있으면 null */
  roomId: RoomId | null;
};

/** 로비의 방 목록에 보이는 방 정보 */
export type RoomSummary = {
  id: RoomId;
  title: string;
  mapId: MapId;
  status: RoomStatus;
  playerCount: number;
};

export type RoomPlayer = {
  userId: UserId;
  nickname: string;
  characterId: CharacterId;
  /** 방장은 준비 상태를 쓰지 않는다 */
  ready: boolean;
};

/** 방 안의 플레이어에게 보이는 방 정보 */
export type RoomDetail = {
  id: RoomId;
  title: string;
  hostId: UserId;
  mapId: MapId;
  status: RoomStatus;
  /** 입장한 순서대로 정렬된다 */
  players: RoomPlayer[];
};

export type ChatMessage = {
  /** 메시지마다 붙는 고유 번호 */
  id: number;
  userId: UserId;
  nickname: string;
  text: string;
  sentAt: number;
};

/** 게임에 참가한 플레이어. 게임 도중에 바뀌지 않는다 */
export type GamePlayerInfo = {
  userId: UserId;
  nickname: string;
  characterId: CharacterId;
};

/** 게임을 시작할 때 한 번 보내는 정보 */
export type GameInfo = {
  mapId: MapId;
  /** 처음 타일 상태. 아이템이 든 블록도 그냥 블록으로 보인다 */
  tiles: string;
  players: GamePlayerInfo[];
  durationMs: number;
};

export type GamePlayerState = {
  userId: UserId;
  /** 타일 단위 좌표. 정수일 때 타일의 한가운데에 있다 */
  x: number;
  y: number;
  /** 바라보는 방향. 꾸루는 이 방향으로 나아간다 */
  direction: Direction;
  moving: boolean;
  ghost: boolean;
  /** 아이템으로 올린 능력치 */
  power: number;
  speed: number;
  kuru: number;
};

export type KuruState = {
  id: number;
  x: number;
  y: number;
  /** 굴러가는 방향 */
  direction: Direction;
  /** 빨개진 꾸루는 장애물에 닿으면 터진다 */
  red: boolean;
};

export type ExplosionState = {
  id: number;
  /** 폭발의 중심 타일 */
  x: number;
  y: number;
  /**
   * `DIRECTIONS` 순서로 담은 방향별 폭풍의 길이 (칸).
   * 폭풍이 아직 닿지 않은 범위는 지금 타일로 내다본 값이라 블록이 부서지면 늘어날 수 있다
   */
  arms: [number, number, number, number];
  elapsedMs: number;
};

/** 매 틱 보내는 게임 상태 */
export type GameSnapshot = {
  tick: number;
  remainingMs: number;
  /** 게임 도중에 나간 플레이어는 빠진다 */
  players: GamePlayerState[];
  kurus: KuruState[];
  explosions: ExplosionState[];
  /** 타일이 바뀐 틱에만 들어 있다 */
  tiles?: string;
};

export type GameResult = {
  reason: "timeout" | "lastSurvivor";
  /** 비어 있으면 승자가 없다 */
  winnerIds: UserId[];
};

export type ErrorCode =
  | "invalidNickname"
  | "nicknameTaken"
  | "invalidRoomTitle"
  | "alreadyInRoom"
  | "notInRoom"
  | "roomNotFound"
  | "roomFull"
  | "roomPlaying"
  | "notHost"
  | "notAllReady";

/** 클라이언트 → 서버 */
export type ClientMessage =
  | { type: "setNickname"; nickname: string }
  | { type: "createRoom"; title: string }
  | { type: "joinRoom"; roomId: RoomId }
  | { type: "leaveRoom" }
  | { type: "selectCharacter"; characterId: CharacterId }
  | { type: "selectMap"; mapId: MapId }
  | { type: "setReady"; ready: boolean }
  | { type: "startGame" }
  | { type: "chat"; text: string }
  /** 누르고 있는 방향이 바뀔 때마다 보낸다. 손을 떼면 null */
  | { type: "move"; direction: Direction | null }
  | { type: "placeKuru" };

/** 서버 → 클라이언트 */
export type ServerMessage =
  /** 접속 직후 한 번 보내는 자신의 ID */
  | { type: "welcome"; userId: UserId }
  /** 접속자나 방 목록이 바뀔 때마다 모두에게 보내는 전체 스냅숏 */
  | { type: "lobby"; users: UserSummary[]; rooms: RoomSummary[] }
  /** 자신이 있는 방이 바뀔 때마다 보내는 스냅숏. 방을 나가면 null */
  | { type: "room"; room: RoomDetail | null }
  | { type: "chat"; message: ChatMessage }
  | { type: "gameStart"; game: GameInfo }
  | { type: "gameState"; state: GameSnapshot }
  /** 결과를 보여 준 뒤 방이 대기 상태로 돌아가면 `room` 메시지가 따로 온다 */
  | { type: "gameEnd"; result: GameResult }
  | { type: "error"; code: ErrorCode };
