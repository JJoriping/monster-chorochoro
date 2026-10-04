"use client";

import {
  type ChatMessage,
  type ClientMessage,
  type ErrorCode,
  GAME_COUNTDOWN_MS,
  GAME_SERVER_PORT,
  type GameInfo,
  type GameResult,
  type GameSnapshot,
  type RoomDetail,
  type RoomSummary,
  type ServerMessage,
  type UserId,
  type UserSummary,
} from "@monster-chorochoro/common";
import { create } from "zustand";
import { pushGameSnapshot, resetGameBuffer } from "./game-buffer";

/** 방 안에서 보관하는 채팅의 최대 개수 */
const CHAT_HISTORY_LIMIT = 100;

type PlayState = {
  status: "connecting" | "open" | "closed";
  myId: UserId | null;
  users: UserSummary[];
  rooms: RoomSummary[];
  room: RoomDetail | null;
  chats: ChatMessage[];
  /** 방이 게임 중일 때만 있다 */
  game: GameInfo | null;
  /** 카운트다운이 끝나는 클라이언트 시각 (`performance.now()` 기준, ms) */
  countdownEndsAt: number;
  /** 가장 최근에 받은 게임 상태. 화면에 그리는 상태는 `game-buffer`에서 따로 고른다 */
  gameState: GameSnapshot | null;
  gameResult: GameResult | null;
  /** 같은 오류가 연달아 와도 다시 보이도록 매번 다른 seq를 붙인다 */
  error: { code: ErrorCode; seq: number } | null;
};

const INITIAL_STATE: PlayState = {
  status: "connecting",
  myId: null,
  users: [],
  rooms: [],
  room: null,
  chats: [],
  game: null,
  countdownEndsAt: 0,
  gameState: null,
  gameResult: null,
  error: null,
};

export const usePlayStore = create<PlayState>()(() => INITIAL_STATE);

let currentSocket: WebSocket | null = null;

export function connect(): void {
  currentSocket?.close();
  const socket = new WebSocket(getServerUrl());
  currentSocket = socket;
  usePlayStore.setState(INITIAL_STATE, true);

  // 다시 연결했거나 연결을 끊은 뒤에 도착한 이전 소켓의 이벤트는 무시한다
  const isCurrent = () => currentSocket === socket;
  socket.addEventListener("open", () => {
    if (isCurrent()) usePlayStore.setState({ status: "open" });
  });
  socket.addEventListener("message", (event) => {
    if (!isCurrent() || typeof event.data !== "string") return;
    const message = JSON.parse(event.data) as ServerMessage;
    // 캔버스가 매 프레임 읽는 스냅숏은 렌더링과 상관없이 따로 쌓는다
    if (message.type === "gameStart") resetGameBuffer(message.game.tiles);
    else if (message.type === "gameState") pushGameSnapshot(message.state);
    usePlayStore.setState((state) => receive(state, message));
  });
  socket.addEventListener("close", () => {
    if (isCurrent()) usePlayStore.setState({ status: "closed" });
  });
}

export function disconnect(): void {
  const socket = currentSocket;
  currentSocket = null;
  socket?.close();
}

export function send(message: ClientMessage): void {
  if (currentSocket?.readyState === WebSocket.OPEN) currentSocket.send(JSON.stringify(message));
}

export function dismissError(): void {
  usePlayStore.setState({ error: null });
}

function receive(state: PlayState, message: ServerMessage): Partial<PlayState> {
  switch (message.type) {
    case "welcome":
      return { myId: message.userId };
    case "lobby":
      return { users: message.users, rooms: message.rooms };
    case "room":
      return {
        room: message.room,
        // 다른 방으로 옮기거나 방을 나가면 채팅 기록을 비운다
        chats: message.room?.id === state.room?.id ? state.chats : [],
        // 게임이 끝나 방이 대기 상태로 돌아오면 게임 화면을 닫는다
        ...(message.room?.status !== "playing" && {
          game: null,
          gameState: null,
          gameResult: null,
        }),
      };
    case "chat":
      return { chats: [...state.chats, message.message].slice(-CHAT_HISTORY_LIMIT) };
    case "gameStart":
      return {
        game: message.game,
        countdownEndsAt: performance.now() + GAME_COUNTDOWN_MS,
        gameState: null,
        gameResult: null,
      };
    case "gameState":
      return { gameState: message.state };
    case "gameEnd":
      return { gameResult: message.result };
    case "error":
      return { error: { code: message.code, seq: (state.error?.seq ?? 0) + 1 } };
  }
}

function getServerUrl(): string {
  if (process.env.NEXT_PUBLIC_GAME_SERVER_URL) return process.env.NEXT_PUBLIC_GAME_SERVER_URL;
  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  return `${protocol}//${window.location.hostname}:${GAME_SERVER_PORT}`;
}
