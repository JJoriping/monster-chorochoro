import type { CharacterId } from "./characters";
import type { Direction, ItemType } from "./game";
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
  /** 방장이 초대한 AI 플레이어인지. AI는 늘 준비되어 있다 */
  bot: boolean;
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
  bot: boolean;
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
  /** 유령이 폭풍에 맞아 기절해 움직이지 못하는지 */
  stunned: boolean;
  /** 되살아난 지 얼마 안 되어 유령이 닿거나 폭풍에 맞아도 유령이 되지 않는지 */
  immune: boolean;
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
  /** 놓인 뒤로 지난 시간. `KURU_RED_MS`를 넘으면 빨개져서 장애물에 닿으면 터진다 */
  elapsedMs: number;
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
  /** `DIRECTIONS` 순서로 담은, 방향별로 폭풍의 끝 칸이 블록인지. 폭풍은 그 블록을 부수기만 하고 그 칸에 머무르지 않는다 */
  blocked: [boolean, boolean, boolean, boolean];
  /** 터진 뒤로 지난 시간. 서든 데스의 폭발은 경고 그림자만 보이는 동안 음수다 */
  elapsedMs: number;
};

/** 폭풍에 맞아 유령이 된 플레이어가 떨어뜨린 아이템 하나 */
export type ItemDrop = {
  item: ItemType;
  /** 떨어뜨린 플레이어가 유령이 된 자리 */
  fromX: number;
  fromY: number;
  /** 아이템이 놓인 타일 */
  x: number;
  y: number;
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
  /** 지난 스냅숏 뒤로 아이템을 떨어뜨렸을 때만 들어 있다. 아이템은 이미 `tiles`에 놓여 있다 */
  drops?: ItemDrop[];
};

export type GameResult = {
  /** 시간이 다 되어도 서든 데스로 이어지므로 마지막까지 살아남은 플레이어가 이긴다 */
  reason: "lastSurvivor";
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
  | "notAllReady"
  /** 고른 맵의 시작 위치보다 플레이어가 많다 */
  | "tooManyPlayers";

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
  /** 방장만 할 수 있다. AI는 빈 자리를 하나 차지한다 */
  | { type: "addBot" }
  | { type: "removeBot"; userId: UserId }
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
