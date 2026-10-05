"use client";

import { lexicon } from "@daldalso/i18n";
import {
  type BotDifficulty,
  CHARACTER_IDS,
  CHARACTERS,
  CHAT_MAX_LENGTH,
  getMapCapacity,
  MAP_IDS,
  type MapId,
  type RoomDetail,
  type RoomPlayer,
  STAT_LIMIT,
} from "@monster-chorochoro/common";
import {
  Bot,
  Check,
  Crown,
  Eye,
  LogOut,
  Map as MapIcon,
  MessageSquare,
  Send,
  Shirt,
  Users,
  X,
} from "lucide-react";
import { type FormEvent, type ReactNode, useEffect, useRef, useState } from "react";
import lPlay from "@/i18n/l.play";
import { BOARD_HEIGHT, BOARD_WIDTH, renderMapPreview } from "./game-renderer";
import { send, usePlayStore } from "./play-store";
import { playSound } from "./sound";
import {
  BotBadge,
  BotDifficultyBadge,
  BotDifficultySelect,
  Button,
  Carousel,
  CharacterAvatar,
  MapBadge,
  MapTile,
  Panel,
  TextInput,
} from "./ui";

const RoomView = ({ room }: { room: RoomDetail }) => {
  const myId = usePlayStore((s) => s.myId);
  const me = room.players.find((v) => v.userId === myId);
  const isHost = room.hostId === myId;

  return (
    <div c="flex flex-col gap-4 lg:h-full">
      <RoomHeader room={room} />
      <div c="grid min-h-0 flex-1 gap-4 lg:grid-cols-[1fr_22rem]">
        <div c="flex min-h-0 flex-col gap-4">
          <PlayerList room={room} isHost={isHost} />
          <div c="grid min-h-0 gap-4 sm:grid-cols-[1fr_auto] lg:flex-1">
            <Chat />
            <MapPreview mapId={room.mapId} />
          </div>
        </div>
        <div c="flex flex-col gap-4">
          {me && <CharacterSelect me={me} />}
          <MapSelect room={room} isHost={isHost} />
          {me && <ReadyAction room={room} me={me} isHost={isHost} />}
        </div>
      </div>
    </div>
  );
};
export default RoomView;

/** 방 번호와 제목, 맵, 나가기 버튼. children은 나가기 버튼 앞에 놓인다 */
export const RoomHeader = ({ room, children }: { room: RoomDetail; children?: ReactNode }) => {
  const l = lexicon(lPlay);

  return (
    <div c="flex items-center gap-3 rounded-xl border-2 border-blue-4 bg-white px-4 py-2.5">
      <span c="rounded-md bg-blue-5 px-2 py-0.5 text-b3 font-black text-blue">{room.id}</span>
      <h2 c="min-w-0 flex-1 truncate text-b1 font-bold">{room.title}</h2>
      <MapBadge mapId={room.mapId} />
      {children}
      <Button variant="secondary" onClick={() => send({ type: "leaveRoom" })}>
        <LogOut size={14} />
        {l("leaveRoom")}
      </Button>
    </div>
  );
};

const PlayerList = ({ room, isHost }: { room: RoomDetail; isHost: boolean }) => {
  const myId = usePlayStore((s) => s.myId);
  const l = lexicon(lPlay);
  const capacity = getMapCapacity(room.mapId);
  // 인원보다 시작 위치가 적은 맵을 고르면 빈 자리 없이 정원을 넘긴 인원이 그대로 보인다
  const emptySlots = Math.max(capacity - room.players.length, 0);

  return (
    <Panel
      title={l("players")}
      icon={Users}
      action={
        <>
          {isHost && (
            <Button
              variant="secondary"
              disabled={!emptySlots}
              onClick={() => send({ type: "addBot" })}
            >
              <Bot size={14} />
              {l("addBot")}
            </Button>
          )}
          <span
            c={[
              "text-b3 font-bold tabular-nums text-blue",
              room.players.length > capacity && "text-red",
            ]}
          >
            {room.players.length}/{capacity}
          </span>
        </>
      }
    >
      <ul c="grid grid-cols-2 gap-2 p-3 sm:grid-cols-4">
        {room.players.map((v) => (
          <PlayerSlot
            key={v.userId}
            player={v}
            isHost={v.userId === room.hostId}
            isMe={v.userId === myId}
            // 방장만 AI를 내보내거나 난이도를 바꿀 수 있다
            onRemove={
              isHost && v.bot ? () => send({ type: "removeBot", userId: v.userId }) : undefined
            }
            onDifficultyChange={
              isHost && v.bot
                ? (difficulty) => send({ type: "setBotDifficulty", userId: v.userId, difficulty })
                : undefined
            }
          />
        ))}
        {Array.from({ length: emptySlots }, (_, i) => (
          <li
            // biome-ignore lint/suspicious/noArrayIndexKey: 빈 자리는 순서 말고는 구분할 방법이 없다
            key={i}
            c="flex min-h-32 items-center justify-center rounded-lg border-2 border-dashed border-gray-4 text-b3 text-gray-2"
          >
            {l("emptySlot")}
          </li>
        ))}
      </ul>
    </Panel>
  );
};

const PlayerSlot = ({
  player,
  isHost,
  isMe,
  onRemove,
  onDifficultyChange,
}: {
  player: RoomPlayer;
  isHost: boolean;
  isMe: boolean;
  /** 주어지면 자리 구석에 내보내기 버튼을 보인다 */
  onRemove?: () => void;
  /** 주어지면 AI의 난이도를 고를 수 있게 한다 */
  onDifficultyChange?: (difficulty: BotDifficulty) => void;
}) => {
  const l = lexicon(lPlay);

  return (
    <li
      c={[
        "relative flex min-h-32 flex-col items-center justify-center gap-1 rounded-lg border-2 border-blue-5 bg-blue-5/50 p-2",
        isMe && "border-blue-2",
      ]}
    >
      {onRemove && (
        <button
          type="button"
          aria-label={l("removeBot", player.nickname)}
          title={l("removeBot", player.nickname)}
          onClick={() => {
            playSound("ui-click");
            onRemove();
          }}
          c="absolute right-1 top-1 rounded-full p-1 text-gray+1 transition-colors hover:bg-red-5 hover:text-red"
        >
          <X size={14} />
        </button>
      )}
      <CharacterAvatar characterId={player.characterId} />
      <span c="flex max-w-full items-center gap-1 text-b3 font-bold">
        <span c="truncate">{player.nickname}</span>
        {isMe && <span c="shrink-0 rounded-full bg-blue px-1.5 text-b5 text-white">{l("me")}</span>}
        {player.bot && <BotBadge />}
      </span>
      <span c="text-b4 text-gray+1">{l("characterName", player.characterId)}</span>
      {isHost ? (
        <span c="inline-flex items-center gap-1 rounded-full bg-yellow-4 px-2 text-b4 font-bold text-yellow+3">
          <Crown size={12} />
          {l("host")}
        </span>
      ) : player.difficulty ? (
        // AI는 늘 준비되어 있으므로 준비 상태 대신 난이도를 보인다
        onDifficultyChange ? (
          <BotDifficultySelect
            value={player.difficulty}
            onChange={onDifficultyChange}
            label={l("botDifficultyGroup", player.nickname)}
          />
        ) : (
          <BotDifficultyBadge difficulty={player.difficulty} />
        )
      ) : player.ready ? (
        <span c="inline-flex items-center gap-1 rounded-full bg-green-4 px-2 text-b4 font-bold text-green+2">
          <Check size={12} />
          {l("ready")}
        </span>
      ) : (
        <span c="rounded-full bg-gray-5 px-2 text-b4 text-gray">{l("notReady")}</span>
      )}
    </li>
  );
};

const CharacterSelect = ({ me }: { me: RoomPlayer }) => {
  const l = lexicon(lPlay);

  return (
    <Panel title={l("character")} icon={Shirt}>
      <div c="p-3">
        <Carousel
          items={CHARACTER_IDS}
          value={me.characterId}
          onChange={(v) => send({ type: "selectCharacter", characterId: v })}
          renderItem={(v) => {
            const stats = CHARACTERS[v];

            return (
              <div c="flex flex-col items-center gap-1.5 px-2">
                <CharacterAvatar characterId={v} c="size-20" />
                <span c="text-b1 font-bold">{l("characterName", v)}</span>
                <dl c="grid w-full grid-cols-[auto_1fr] items-center gap-x-2 gap-y-1 text-b5 text-gray+1">
                  <StatRow
                    label={l("statPower")}
                    initial={stats.initialPower}
                    max={stats.maxPower}
                  />
                  <StatRow
                    label={l("statSpeed")}
                    initial={stats.initialSpeed}
                    max={stats.maxSpeed}
                  />
                  <StatRow label={l("statKuru")} initial={stats.initialKuru} max={stats.maxKuru} />
                </dl>
              </div>
            );
          }}
        />
      </div>
    </Panel>
  );
};

/** 초기값까지는 진하게, 상한까지는 옅게 칠한 눈금 */
const StatRow = ({ label, initial, max }: { label: string; initial: number; max: number }) => {
  return (
    <>
      <dt c="text-left">{label}</dt>
      <dd c="flex gap-0.5">
        <span c="sr-only">
          {initial}→{max}/{STAT_LIMIT}
        </span>
        {Array.from({ length: STAT_LIMIT }, (_, i) => (
          <span
            // biome-ignore lint/suspicious/noArrayIndexKey: 눈금은 순서 자체가 의미다
            key={i}
            aria-hidden="true"
            c={[
              "h-1.5 flex-1 rounded-full bg-gray-4",
              i < max && "bg-orange-3",
              i < initial && "bg-orange",
            ]}
          />
        ))}
      </dd>
    </>
  );
};

const MapSelect = ({ room, isHost }: { room: RoomDetail; isHost: boolean }) => {
  const l = lexicon(lPlay);

  return (
    <Panel title={l("map")} icon={MapIcon}>
      <div c="flex flex-col gap-2 p-3">
        <Carousel
          items={MAP_IDS}
          value={room.mapId}
          disabled={!isHost}
          onChange={(v) => send({ type: "selectMap", mapId: v })}
          renderItem={(v) => (
            <div c="flex flex-col items-center gap-1.5 px-2">
              <MapTile mapId={v} c="w-32" />
              <span c="text-b2 font-bold">{l("mapName", v)}</span>
              <span c="inline-flex items-center gap-1 text-b5 text-gray+1">
                <Users size={12} />
                {l("mapCapacity", getMapCapacity(v))}
              </span>
            </div>
          )}
        />
        {!isHost && <p c="text-center text-b5 text-gray">{l("mapHostOnly")}</p>}
      </div>
    </Panel>
  );
};

const MapPreview = ({ mapId }: { mapId: MapId }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const l = lexicon(lPlay);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    // 캔버스 해상도를 바꾸면 그림이 지워지므로 크기가 바뀔 때마다 다시 그린다
    const observer = new ResizeObserver(() => {
      const scale = window.devicePixelRatio || 1;
      const { width } = canvas.getBoundingClientRect();
      canvas.width = Math.round(width * scale);
      canvas.height = Math.round(((width * BOARD_HEIGHT) / BOARD_WIDTH) * scale);
      ctx.setTransform(canvas.width / BOARD_WIDTH, 0, 0, canvas.height / BOARD_HEIGHT, 0, 0);
      renderMapPreview(ctx, mapId);
    });
    observer.observe(canvas);
    return () => observer.disconnect();
  }, [mapId]);

  return (
    <Panel title={l("mapPreview")} icon={Eye} action={<MapBadge mapId={mapId} />}>
      <div c="flex flex-col items-center gap-2 p-3">
        <canvas
          ref={canvasRef}
          width={BOARD_WIDTH}
          height={BOARD_HEIGHT}
          role="img"
          aria-label={l("mapPreviewLabel", mapId)}
          c="block aspect-[15/13] h-auto w-80 min-w-48 max-w-full rounded-lg lg:max-w-[calc((100dvh_-_40rem)*15/13)]"
        />
        <p c="flex items-center gap-1.5 self-start text-b5 text-gray+1">
          <span aria-hidden="true" c="size-3 rounded-full border-2 border-blue bg-white p-0.5">
            <span c="block size-full rounded-full bg-blue" />
          </span>
          {l("spawnPoint")}
        </p>
      </div>
    </Panel>
  );
};

const ReadyAction = ({
  room,
  me,
  isHost,
}: {
  room: RoomDetail;
  me: RoomPlayer;
  isHost: boolean;
}) => {
  const l = lexicon(lPlay);

  if (isHost) {
    const allReady = room.players.every((v) => v.userId === room.hostId || v.ready);
    const capacity = getMapCapacity(room.mapId);
    const overCapacity = room.players.length > capacity;

    return (
      <div c="flex flex-col gap-2 lg:mt-auto">
        <Button
          variant="success"
          disabled={!allReady || overCapacity}
          onClick={() => send({ type: "startGame" })}
          c="py-3 text-b1"
        >
          {l("startGame")}
        </Button>
        {overCapacity ? (
          <p c="text-center text-b5 text-red">{l("tooManyPlayers", capacity)}</p>
        ) : (
          !allReady && <p c="text-center text-b5 text-gray+2">{l("waitingForReady")}</p>
        )}
      </div>
    );
  }
  return (
    <Button
      variant={me.ready ? "secondary" : "primary"}
      onClick={() => send({ type: "setReady", ready: !me.ready })}
      c="py-3 text-b1 lg:mt-auto"
    >
      {me.ready ? l("cancelReady") : l("setReady")}
    </Button>
  );
};

const Chat = () => {
  const chats = usePlayStore((s) => s.chats);
  const myId = usePlayStore((s) => s.myId);
  const l = lexicon(lPlay);
  const [text, setText] = useState("");
  const listRef = useRef<HTMLOListElement>(null);
  const lastChat = chats.at(-1);

  // 새 메시지가 오면 맨 아래로 스크롤한다
  useEffect(() => {
    if (lastChat) listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [lastChat]);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
    send({ type: "chat", text });
    setText("");
  };

  return (
    <Panel title={l("chat")} icon={MessageSquare} c="h-64 lg:h-auto lg:flex-1">
      <ol ref={listRef} c="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto px-4 py-2 text-b3">
        {chats.map((v) => (
          <li key={v.id} c="break-words">
            <b c={["mr-2", v.userId === myId ? "text-blue" : "text-gray+3"]}>{v.nickname}</b>
            {v.text}
          </li>
        ))}
      </ol>
      <form onSubmit={handleSubmit} c="flex gap-2 border-t-2 border-blue-5 p-2">
        <TextInput
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={l("chatPlaceholder")}
          maxLength={CHAT_MAX_LENGTH}
          aria-label={l("chat")}
          c="flex-1"
        />
        <Button type="submit" disabled={!text.trim()}>
          <Send size={14} />
          {l("sendChat")}
        </Button>
      </form>
    </Panel>
  );
};
