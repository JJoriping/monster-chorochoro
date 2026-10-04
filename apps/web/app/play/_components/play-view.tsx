"use client";

import { lexicon } from "@daldalso/i18n";
import { CircleAlert, LoaderCircle, RefreshCw, Unplug, Volume2, VolumeX } from "lucide-react";
import { type ReactNode, useEffect } from "react";
import lPlay from "@/i18n/l.play";
import GameView from "./game-view";
import LobbyView from "./lobby-view";
import { connect, disconnect, dismissError, usePlayStore } from "./play-store";
import RoomView from "./room-view";
import {
  type BgmId,
  loadSoundSettings,
  playSound,
  setBgm,
  toggleMuted,
  useSoundStore,
} from "./sound";
import { Button } from "./ui";

/** 오류 알림이 떠 있는 시간 (ms) */
const ERROR_TOAST_DURATION = 3000;

const PlayView = () => {
  useEffect(() => {
    loadSoundSettings();
    connect();
    return disconnect;
  }, []);
  useBackgroundMusic();

  return (
    <div c="min-h-dvh bg-gradient-to-b from-blue-4 to-cyan-5 text-gray+4">
      <div c="mx-auto flex max-w-6xl flex-col gap-4 p-4 lg:h-dvh">
        <header c="flex items-center justify-between gap-4">
          <h1 c="text-h5 font-black text-blue+3">Monster Chorochoro</h1>
          <MuteToggle />
        </header>
        <main c="min-h-0 flex-1">
          <Screen />
        </main>
      </div>
      <ErrorToast />
    </div>
  );
};
export default PlayView;

/** 로비와 대기실에서는 같은 곡을 이어서 틀고, 게임 중에는 결과가 나올 때까지 게임 곡을 튼다 */
function useBackgroundMusic(): void {
  const bgm = usePlayStore((s): BgmId | null => {
    if (s.status !== "open" || s.myId === null) return null;
    if (!s.room || s.room.status === "waiting") return "lobby";
    return s.game && !s.gameResult ? "game" : null;
  });

  useEffect(() => {
    setBgm(bgm);
  }, [bgm]);
  useEffect(() => () => setBgm(null), []);
}

const Screen = () => {
  const status = usePlayStore((s) => s.status);
  const myId = usePlayStore((s) => s.myId);
  const room = usePlayStore((s) => s.room);
  const l = lexicon(lPlay);

  if (status === "closed") {
    return (
      <Notice>
        <Unplug size={32} className="text-gray-1" />
        <p>{l("disconnected")}</p>
        <Button onClick={connect}>
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
  return <GameView room={room} />;
};

const Notice = ({ children }: { children: ReactNode }) => {
  return (
    <div c="flex h-full min-h-80 flex-col items-center justify-center gap-4 rounded-xl border-2 border-blue-4 bg-white text-b2 text-gray+2">
      {children}
    </div>
  );
};

const MuteToggle = () => {
  const muted = useSoundStore((s) => s.muted);
  const l = lexicon(lPlay);

  return (
    <button
      type="button"
      aria-pressed={muted}
      aria-label={muted ? l("unmute") : l("mute")}
      title={muted ? l("unmute") : l("mute")}
      onClick={() => {
        toggleMuted();
        // 소리를 켰을 때 바로 확인할 수 있도록 클릭음을 낸다
        playSound("ui-click");
      }}
      c="rounded-full bg-white/70 p-2 text-blue+3 transition-colors hover:bg-white"
    >
      {muted ? <VolumeX size={18} /> : <Volume2 size={18} />}
    </button>
  );
};

const ErrorToast = () => {
  const error = usePlayStore((s) => s.error);
  const l = lexicon(lPlay);

  useEffect(() => {
    if (!error) return;
    const timer = window.setTimeout(dismissError, ERROR_TOAST_DURATION);
    return () => window.clearTimeout(timer);
  }, [error]);

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
