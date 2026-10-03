import {
  CHAT_MAX_LENGTH,
  type CharacterId,
  type ClientMessage,
  DEFAULT_CHARACTER_ID,
  DEFAULT_MAP_ID,
  type Direction,
  type ErrorCode,
  GAME_DURATION_MS,
  GAME_RESULT_MS,
  type GameInfo,
  MAX_PLAYERS_PER_ROOM,
  type MapId,
  NICKNAME_MAX_LENGTH,
  ROOM_TITLE_MAX_LENGTH,
  type RoomDetail,
  type RoomId,
  type RoomStatus,
  type RoomSummary,
  type ServerMessage,
  TICK_MS,
  type UserId,
  type UserSummary,
} from "@monster-chorochoro/common";
import { WebSocket } from "ws";
import {
  createGame,
  type Game,
  placeKuru,
  removePlayer,
  setPlayerInput,
  stepGame,
  toSnapshot,
} from "./game";

export type User = {
  id: UserId;
  nickname: string;
  socket: WebSocket;
  roomId: RoomId | null;
};

type Player = {
  userId: UserId;
  characterId: CharacterId;
  ready: boolean;
};

type Room = {
  id: RoomId;
  title: string;
  hostId: UserId;
  mapId: MapId;
  status: RoomStatus;
  /** 입장한 순서대로 정렬된다 */
  players: Player[];
  game: Game | null;
  /** 게임 중에는 틱 루프, 결과를 보여 주는 동안에는 방으로 돌아가는 타이머 */
  gameTimer: NodeJS.Timeout | null;
};

const users = new Map<UserId, User>();
const rooms = new Map<RoomId, Room>();
let nextUserId = 1;
let nextRoomId = 1;
let nextChatId = 1;

export function connect(socket: WebSocket): User {
  const user: User = { id: nextUserId++, nickname: createGuestNickname(), socket, roomId: null };
  users.set(user.id, user);
  send(user, { type: "welcome", userId: user.id });
  broadcastLobby();
  return user;
}

export function disconnect(user: User): void {
  leaveRoom(user);
  users.delete(user.id);
  broadcastLobby();
}

export function handleMessage(user: User, message: ClientMessage): void {
  const error = dispatch(user, message);
  if (error) send(user, { type: "error", code: error });
}

function dispatch(user: User, message: ClientMessage): ErrorCode | undefined {
  switch (message.type) {
    case "setNickname":
      return setNickname(user, message.nickname);
    case "createRoom":
      return createRoom(user, message.title);
    case "joinRoom":
      return joinRoom(user, message.roomId);
    case "leaveRoom":
      return leaveRoom(user);
    case "selectCharacter":
      return selectCharacter(user, message.characterId);
    case "selectMap":
      return selectMap(user, message.mapId);
    case "setReady":
      return setReady(user, message.ready);
    case "startGame":
      return startGame(user);
    case "chat":
      return chat(user, message.text);
    case "move":
      return move(user, message.direction);
    case "placeKuru":
      return fire(user);
  }
}

function setNickname(user: User, value: string): ErrorCode | undefined {
  const nickname = value.trim();
  if (!nickname || nickname.length > NICKNAME_MAX_LENGTH) return "invalidNickname";
  if (nickname === user.nickname) return;
  if (isNicknameTaken(nickname)) return "nicknameTaken";

  user.nickname = nickname;
  broadcastLobby();
  const room = getRoomOf(user);
  if (room) broadcastRoom(room);
}

function createRoom(user: User, value: string): ErrorCode | undefined {
  if (user.roomId !== null) return "alreadyInRoom";
  const title = value.trim();
  if (!title || title.length > ROOM_TITLE_MAX_LENGTH) return "invalidRoomTitle";

  const room: Room = {
    id: nextRoomId++,
    title,
    hostId: user.id,
    mapId: DEFAULT_MAP_ID,
    status: "waiting",
    players: [],
    game: null,
    gameTimer: null,
  };
  rooms.set(room.id, room);
  enterRoom(user, room);
}

function joinRoom(user: User, roomId: RoomId): ErrorCode | undefined {
  if (user.roomId !== null) return "alreadyInRoom";
  const room = rooms.get(roomId);
  if (!room) return "roomNotFound";
  if (room.status !== "waiting") return "roomPlaying";
  if (room.players.length >= MAX_PLAYERS_PER_ROOM) return "roomFull";

  enterRoom(user, room);
}

function enterRoom(user: User, room: Room): void {
  room.players.push({ userId: user.id, characterId: DEFAULT_CHARACTER_ID, ready: false });
  user.roomId = room.id;
  broadcastRoom(room);
  broadcastLobby();
}

function leaveRoom(user: User): ErrorCode | undefined {
  const room = getRoomOf(user);
  if (!room) return "notInRoom";

  room.players = room.players.filter((v) => v.userId !== user.id);
  user.roomId = null;
  send(user, { type: "room", room: null });
  if (room.game) removePlayer(room.game, user.id);

  const [nextHost] = room.players;
  if (!nextHost) {
    stopGameTimer(room);
    rooms.delete(room.id);
  } else {
    // 방장이 나가면 가장 먼저 들어온 플레이어가 방장을 물려받는다
    if (room.hostId === user.id) {
      room.hostId = nextHost.userId;
      nextHost.ready = false;
    }
    broadcastRoom(room);
  }
  broadcastLobby();
}

function selectCharacter(user: User, characterId: CharacterId): ErrorCode | undefined {
  const room = getRoomOf(user);
  if (!room) return "notInRoom";
  if (room.status !== "waiting") return "roomPlaying";
  const player = getPlayer(room, user.id);
  if (!player) return "notInRoom";

  player.characterId = characterId;
  broadcastRoom(room);
}

function selectMap(user: User, mapId: MapId): ErrorCode | undefined {
  const room = getRoomOf(user);
  if (!room) return "notInRoom";
  if (room.status !== "waiting") return "roomPlaying";
  if (room.hostId !== user.id) return "notHost";

  room.mapId = mapId;
  broadcastRoom(room);
  broadcastLobby();
}

function setReady(user: User, ready: boolean): ErrorCode | undefined {
  const room = getRoomOf(user);
  if (!room) return "notInRoom";
  if (room.status !== "waiting") return "roomPlaying";
  const player = getPlayer(room, user.id);
  if (!player) return "notInRoom";
  // 방장은 준비 상태 없이 시작 버튼을 누른다
  if (room.hostId === user.id) return;

  player.ready = ready;
  broadcastRoom(room);
}

function startGame(user: User): ErrorCode | undefined {
  const room = getRoomOf(user);
  if (!room) return "notInRoom";
  if (room.status !== "waiting") return "roomPlaying";
  if (room.hostId !== user.id) return "notHost";
  if (room.players.some((v) => v.userId !== room.hostId && !v.ready)) return "notAllReady";

  const game = createGame(room.mapId, room.players);
  room.status = "playing";
  room.game = game;
  sendToRoom(room, { type: "gameStart", game: toGameInfo(room, game) });
  broadcastRoom(room);
  broadcastLobby();
  // 타이머는 운영체제에 따라 늦게 불리기도 하므로(Windows에서는 약 15.6ms 단위) 틱 간격보다 자주 깨어나서
  // 실제로 흐른 시간만큼 틱을 따라잡는다
  const startedAt = performance.now();
  room.gameTimer = setInterval(() => tickGame(room, startedAt), TICK_MS / 2);
}

function tickGame(room: Room, startedAt: number): void {
  const { game } = room;
  if (!game) return;
  const dueTick = Math.floor((performance.now() - startedAt) / TICK_MS);
  if (game.tick >= dueTick) return;
  while (game.tick < dueTick && !game.result) stepGame(game);
  sendToRoom(room, { type: "gameState", state: toSnapshot(game) });
  if (!game.result) return;

  stopGameTimer(room);
  sendToRoom(room, { type: "gameEnd", result: game.result });
  room.gameTimer = setTimeout(() => finishGame(room), GAME_RESULT_MS);
}

/** 결과를 다 보여 주면 방을 대기 상태로 되돌린다. 방장이 아닌 플레이어는 다시 준비해야 한다 */
function finishGame(room: Room): void {
  room.gameTimer = null;
  room.game = null;
  room.status = "waiting";
  for (const v of room.players) v.ready = false;
  broadcastRoom(room);
  broadcastLobby();
}

function stopGameTimer(room: Room): void {
  if (room.gameTimer) clearTimeout(room.gameTimer);
  room.gameTimer = null;
}

function move(user: User, direction: Direction | null): undefined {
  const game = getRoomOf(user)?.game;
  // 게임 밖에서 온 조작은 조용히 무시한다
  if (game) setPlayerInput(game, user.id, direction);
}

function fire(user: User): undefined {
  const game = getRoomOf(user)?.game;
  if (game) placeKuru(game, user.id);
}

function chat(user: User, value: string): ErrorCode | undefined {
  const room = getRoomOf(user);
  if (!room) return "notInRoom";
  const text = value.trim().slice(0, CHAT_MAX_LENGTH);
  if (!text) return;

  sendToRoom(room, {
    type: "chat",
    message: {
      id: nextChatId++,
      userId: user.id,
      nickname: user.nickname,
      text,
      sentAt: Date.now(),
    },
  });
}

function getRoomOf(user: User): Room | undefined {
  return user.roomId === null ? undefined : rooms.get(user.roomId);
}

function getPlayer(room: Room, userId: UserId): Player | undefined {
  return room.players.find((v) => v.userId === userId);
}

function isNicknameTaken(nickname: string): boolean {
  for (const v of users.values()) {
    if (v.nickname === nickname) return true;
  }
  return false;
}

function createGuestNickname(): string {
  while (true) {
    const nickname = `손님${Math.floor(1000 + Math.random() * 9000)}`;
    if (!isNicknameTaken(nickname)) return nickname;
  }
}

function toUserSummary(user: User): UserSummary {
  return { id: user.id, nickname: user.nickname, roomId: user.roomId };
}

function toRoomSummary(room: Room): RoomSummary {
  return {
    id: room.id,
    title: room.title,
    mapId: room.mapId,
    status: room.status,
    playerCount: room.players.length,
  };
}

function toGameInfo(room: Room, game: Game): GameInfo {
  return {
    mapId: room.mapId,
    tiles: game.tiles.join(""),
    players: game.players.map((v) => ({
      userId: v.userId,
      nickname: users.get(v.userId)?.nickname ?? "",
      characterId: v.characterId,
    })),
    durationMs: GAME_DURATION_MS,
  };
}

function toRoomDetail(room: Room): RoomDetail {
  return {
    id: room.id,
    title: room.title,
    hostId: room.hostId,
    mapId: room.mapId,
    status: room.status,
    players: room.players.map((v) => ({
      userId: v.userId,
      nickname: users.get(v.userId)?.nickname ?? "",
      characterId: v.characterId,
      ready: v.ready,
    })),
  };
}

function broadcastLobby(): void {
  const data = JSON.stringify({
    type: "lobby",
    users: Array.from(users.values(), toUserSummary),
    rooms: Array.from(rooms.values(), toRoomSummary),
  } satisfies ServerMessage);
  for (const v of users.values()) sendRaw(v, data);
}

function broadcastRoom(room: Room): void {
  sendToRoom(room, { type: "room", room: toRoomDetail(room) });
}

function sendToRoom(room: Room, message: ServerMessage): void {
  const data = JSON.stringify(message);
  for (const v of room.players) {
    const target = users.get(v.userId);
    if (target) sendRaw(target, data);
  }
}

function send(user: User, message: ServerMessage): void {
  sendRaw(user, JSON.stringify(message));
}

function sendRaw(user: User, data: string): void {
  if (user.socket.readyState === WebSocket.OPEN) user.socket.send(data);
}
