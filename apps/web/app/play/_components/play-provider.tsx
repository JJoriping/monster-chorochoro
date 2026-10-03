"use client";

import {
  type ChatMessage,
  type ClientMessage,
  type ErrorCode,
  GAME_SERVER_PORT,
  type RoomDetail,
  type RoomSummary,
  type ServerMessage,
  type UserId,
  type UserSummary,
} from "@monster-chorochoro/common";
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
} from "react";

/** 방 안에서 보관하는 채팅의 최대 개수 */
const CHAT_HISTORY_LIMIT = 100;

type PlayState = {
  status: "connecting" | "open" | "closed";
  myId: UserId | null;
  users: UserSummary[];
  rooms: RoomSummary[];
  room: RoomDetail | null;
  chats: ChatMessage[];
  /** 같은 오류가 연달아 와도 다시 보이도록 매번 다른 seq를 붙인다 */
  error: { code: ErrorCode; seq: number } | null;
};

type PlayAction =
  | { type: "connect" }
  | { type: "open" }
  | { type: "close" }
  | { type: "message"; message: ServerMessage }
  | { type: "dismissError" };

type PlayContextValue = PlayState & {
  send: (message: ClientMessage) => void;
  reconnect: () => void;
  dismissError: () => void;
};

const INITIAL_STATE: PlayState = {
  status: "connecting",
  myId: null,
  users: [],
  rooms: [],
  room: null,
  chats: [],
  error: null,
};

const PlayContext = createContext<PlayContextValue | null>(null);

export const usePlay = (): PlayContextValue => {
  const context = useContext(PlayContext);
  if (!context) throw new Error("usePlay must be used within PlayProvider");
  return context;
};

const PlayProvider = ({ children }: { children: ReactNode }) => {
  const [state, dispatch] = useReducer(reduce, INITIAL_STATE);
  const socketRef = useRef<WebSocket | null>(null);

  const connect = useCallback(() => {
    socketRef.current?.close();
    const socket = new WebSocket(getServerUrl());
    socketRef.current = socket;
    dispatch({ type: "connect" });

    // 다시 연결했거나 언마운트된 뒤에 도착한 이전 소켓의 이벤트는 무시한다
    const isCurrent = () => socketRef.current === socket;
    socket.addEventListener("open", () => {
      if (isCurrent()) dispatch({ type: "open" });
    });
    socket.addEventListener("message", (event) => {
      if (!isCurrent() || typeof event.data !== "string") return;
      dispatch({ type: "message", message: JSON.parse(event.data) as ServerMessage });
    });
    socket.addEventListener("close", () => {
      if (isCurrent()) dispatch({ type: "close" });
    });
  }, []);

  useEffect(() => {
    connect();
    return () => {
      const socket = socketRef.current;
      socketRef.current = null;
      socket?.close();
    };
  }, [connect]);

  const send = useCallback((message: ClientMessage) => {
    const socket = socketRef.current;
    if (socket?.readyState === WebSocket.OPEN) socket.send(JSON.stringify(message));
  }, []);
  const dismissError = useCallback(() => dispatch({ type: "dismissError" }), []);

  const value = useMemo(
    () => ({ ...state, send, reconnect: connect, dismissError }),
    [state, send, connect, dismissError],
  );
  return <PlayContext.Provider value={value}>{children}</PlayContext.Provider>;
};
export default PlayProvider;

function reduce(state: PlayState, action: PlayAction): PlayState {
  switch (action.type) {
    case "connect":
      return INITIAL_STATE;
    case "open":
      return { ...state, status: "open" };
    case "close":
      return { ...state, status: "closed" };
    case "dismissError":
      return { ...state, error: null };
    case "message":
      return receive(state, action.message);
  }
}

function receive(state: PlayState, message: ServerMessage): PlayState {
  switch (message.type) {
    case "welcome":
      return { ...state, myId: message.userId };
    case "lobby":
      return { ...state, users: message.users, rooms: message.rooms };
    case "room":
      // 다른 방으로 옮기거나 방을 나가면 채팅 기록을 비운다
      return {
        ...state,
        room: message.room,
        chats: message.room?.id === state.room?.id ? state.chats : [],
      };
    case "chat":
      return { ...state, chats: [...state.chats, message.message].slice(-CHAT_HISTORY_LIMIT) };
    case "error":
      return { ...state, error: { code: message.code, seq: (state.error?.seq ?? 0) + 1 } };
  }
}

function getServerUrl(): string {
  if (process.env.NEXT_PUBLIC_GAME_SERVER_URL) return process.env.NEXT_PUBLIC_GAME_SERVER_URL;
  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  return `${protocol}//${window.location.hostname}:${GAME_SERVER_PORT}`;
}
