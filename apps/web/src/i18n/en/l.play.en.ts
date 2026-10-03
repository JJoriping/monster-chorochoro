import I18n from "@daldalso/i18n";
import {
  type CharacterId,
  type ErrorCode,
  type GameResult,
  type MapId,
  NICKNAME_MAX_LENGTH,
  ROOM_TITLE_MAX_LENGTH,
} from "@monster-chorochoro/common";

const CHARACTER_NAMES: Record<CharacterId, string> = {
  moremi: "Moremi",
  pazna: "Pazna",
};
const MAP_NAMES: Record<MapId, string> = {
  "forest-1": "Forest-1",
  "sea-1": "Sea-1",
  "village-1": "Village-1",
};
const ERRORS: Record<ErrorCode, string> = {
  invalidNickname: `Nicknames must be 1–${NICKNAME_MAX_LENGTH} characters long.`,
  nicknameTaken: "That nickname is already taken.",
  invalidRoomTitle: `Room titles must be 1–${ROOM_TITLE_MAX_LENGTH} characters long.`,
  alreadyInRoom: "You are already in a room.",
  notInRoom: "You are not in a room.",
  roomNotFound: "The room no longer exists.",
  roomFull: "The room is full.",
  roomPlaying: "The game in this room has already started.",
  notHost: "Only the host can do that.",
  notAllReady: "Some players are not ready yet.",
};
const RESULT_REASONS: Record<GameResult["reason"], string> = {
  timeout: "Time's up",
  lastSurvivor: "Last one standing",
};

export default I18n.register({
  connecting: "Connecting to the server…",
  disconnected: "Disconnected from the server.",
  reconnect: "Reconnect",
  error: (code: ErrorCode) => ERRORS[code],
  characterName: (id: CharacterId) => CHARACTER_NAMES[id],
  mapName: (id: MapId) => MAP_NAMES[id],
  me: "Me",

  roomList: "Rooms",
  noRooms: "No rooms are open. Why not create one?",
  defaultRoomTitle: (nickname: string) => `${nickname}'s room`,
  createRoom: "Create room",
  roomWaiting: "Waiting",
  roomPlaying: "Playing",
  roomFull: "Full",
  userList: "Online",
  inLobby: "Lobby",
  inRoom: (roomId: number) => `Room ${roomId}`,
  profile: "My profile",
  nickname: "Nickname",
  changeNickname: "Change",

  leaveRoom: "Leave",
  players: "Players",
  emptySlot: "Empty",
  host: "Host",
  ready: "Ready",
  notReady: "Not ready",
  character: "Character",
  map: "Map",
  mapHostOnly: "Only the host can change the map.",
  statPower: "Power",
  statSpeed: "Speed",
  statKuru: "Kuru",
  setReady: "Ready",
  cancelReady: "Cancel ready",
  startGame: "Start game",
  waitingForReady: "You can start once every player is ready.",
  chat: "Chat",
  chatPlaceholder: "Type a message",
  sendChat: "Send",

  loadingGame: "Preparing the game…",
  gameBoard: "Game board",
  controls: "← ↑ → ↓ Move · Space Place kuru",
  timeLeft: "Time left",
  ghost: "Ghost",
  leftGame: "Left",
  victory: "Victory!",
  defeat: "Defeat",
  resultReason: (reason: GameResult["reason"]) => RESULT_REASONS[reason],
  winners: (names: string) => `Winners: ${names}`,
  noWinner: "No winner",
  returningToRoom: "Returning to the room shortly.",
});
