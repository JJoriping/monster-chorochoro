"use client";

import { lexicon } from "@daldalso/i18n";
import { CircleAlert, LoaderCircle, LogOut, RefreshCw, Unplug } from "lucide-react";
import { type ReactNode, useEffect } from "react";
import lPlay from "@/i18n/l.play";
import LobbyView from "./lobby-view";
import { usePlay } from "./play-provider";
import RoomView from "./room-view";
import { Button } from "./ui";

/** 오류 알림이 떠 있는 시간 (ms) */
const ERROR_TOAST_DURATION = 3000;

const PlayView = () => {
  return (
    <div c="min-h-dvh bg-gradient-to-b from-blue-4 to-cyan-5 text-gray+4">
      <div c="mx-auto flex max-w-6xl flex-col gap-4 p-4 lg:h-dvh">
        <h1 c="text-h5 font-black text-blue+3">Monster Chorochoro</h1>
        <main c="min-h-0 flex-1">
          <Screen />
        </main>
      </div>
      <ErrorToast />
    </div>
  );
};
export default PlayView;

const Screen = () => {
  const { status, myId, room, reconnect, send } = usePlay();
  const l = lexicon(lPlay);

  if (status === "closed") {
    return (
      <Notice>
        <Unplug size={32} className="text-gray-1" />
        <p>{l("disconnected")}</p>
        <Button onClick={reconnect}>
          <RefreshCw size={14} />
          {l("reconnect")}
        </Button>
      </Notice>
    );
  }
  if (status === "connecting" || myId === null) {
    return (
      <Notice>
        <LoaderCircle size={32} className="animate-spin text-blue" />
        <p>{l("connecting")}</p>
      </Notice>
    );
  }
  if (!room) return <LobbyView />;
  if (room.status === "waiting") return <RoomView room={room} />;
  // 게임 화면은 아직 만들지 않았다
  return (
    <Notice>
      <p c="text-h1 font-black text-gray-2">{l("gameTbd")}</p>
      <Button variant="secondary" onClick={() => send({ type: "leaveRoom" })}>
        <LogOut size={14} />
        {l("leaveRoom")}
      </Button>
    </Notice>
  );
};

const Notice = ({ children }: { children: ReactNode }) => {
  return (
    <div c="flex h-full min-h-80 flex-col items-center justify-center gap-4 rounded-xl border-2 border-blue-4 bg-white text-b2 text-gray+2">
      {children}
    </div>
  );
};

const ErrorToast = () => {
  const { error, dismissError } = usePlay();
  const l = lexicon(lPlay);

  useEffect(() => {
    if (!error) return;
    const timer = window.setTimeout(dismissError, ERROR_TOAST_DURATION);
    return () => window.clearTimeout(timer);
  }, [error, dismissError]);

  if (!error) return null;
  return (
    <div
      role="alert"
      c="fixed left-1/2 top-4 flex -translate-x-1/2 items-center gap-2 rounded-lg bg-red px-4 py-2 text-b3 font-bold text-white"
    >
      <CircleAlert size={16} />
      {l("error", error.code)}
    </div>
  );
};
