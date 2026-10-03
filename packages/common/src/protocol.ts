import type { CharacterId } from "./characters";
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
  | { type: "chat"; text: string };

/** 서버 → 클라이언트 */
export type ServerMessage =
  /** 접속 직후 한 번 보내는 자신의 ID */
  | { type: "welcome"; userId: UserId }
  /** 접속자나 방 목록이 바뀔 때마다 모두에게 보내는 전체 스냅숏 */
  | { type: "lobby"; users: UserSummary[]; rooms: RoomSummary[] }
  /** 자신이 있는 방이 바뀔 때마다 보내는 스냅숏. 방을 나가면 null */
  | { type: "room"; room: RoomDetail | null }
  | { type: "chat"; message: ChatMessage }
  | { type: "error"; code: ErrorCode };
