import {
  type ClientMessage,
  isCharacterId,
  isDirection,
  isMapId,
} from "@monster-chorochoro/common";

/** 클라이언트가 보낸 문자열을 검사해 알려진 필드만 남긴 메시지로 바꾼다. 형식이 틀리면 null */
export function parseClientMessage(data: string): ClientMessage | null {
  let value: unknown;
  try {
    value = JSON.parse(data);
  } catch {
    return null;
  }
  if (typeof value !== "object" || value === null) return null;
  const message = value as Record<string, unknown>;

  switch (message.type) {
    case "setNickname":
      return typeof message.nickname === "string"
        ? { type: message.type, nickname: message.nickname }
        : null;
    case "createRoom":
      return typeof message.title === "string"
        ? { type: message.type, title: message.title }
        : null;
    case "joinRoom":
      return typeof message.roomId === "number" && Number.isInteger(message.roomId)
        ? { type: message.type, roomId: message.roomId }
        : null;
    case "leaveRoom":
    case "startGame":
    case "addBot":
    case "placeKuru":
      return { type: message.type };
    case "removeBot":
      return typeof message.userId === "number" && Number.isInteger(message.userId)
        ? { type: message.type, userId: message.userId }
        : null;
    case "move":
      return message.direction === null || isDirection(message.direction)
        ? { type: message.type, direction: message.direction }
        : null;
    case "selectCharacter":
      return isCharacterId(message.characterId)
        ? { type: message.type, characterId: message.characterId }
        : null;
    case "selectMap":
      return isMapId(message.mapId) ? { type: message.type, mapId: message.mapId } : null;
    case "setReady":
      return typeof message.ready === "boolean"
        ? { type: message.type, ready: message.ready }
        : null;
    case "chat":
      return typeof message.text === "string" ? { type: message.type, text: message.text } : null;
    default:
      return null;
  }
}
