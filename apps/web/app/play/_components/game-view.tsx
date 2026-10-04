"use client";

import { lexicon } from "@daldalso/i18n";
import {
  CHARACTERS,
  type Direction,
  type ExplosionState,
  FLAME_SPREAD_MS,
  GAME_COUNTDOWN_COUNT,
  GAME_COUNTDOWN_MS,
  type GameInfo,
  type GamePlayerInfo,
  type GamePlayerState,
  getItemOfTile,
  MAP_COLS,
  MAPS,
  type RoomDetail,
  TILES,
  type UserId,
} from "@monster-chorochoro/common";
import {
  ChevronsRight,
  CircleDot,
  Ghost,
  LoaderCircle,
  type LucideIcon,
  Timer,
  Trophy,
  Users,
  Zap,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import lPlay from "@/i18n/l.play";
import { type GameFrame, type GameSample, sampleGame } from "./game-buffer";
import { BOARD_HEIGHT, BOARD_WIDTH, renderGame } from "./game-renderer";
import { send, usePlayStore } from "./play-store";
import { RoomHeader } from "./room-view";
import { playSound } from "./sound";
import { CharacterAvatar, Panel } from "./ui";

/** 남은 시간이 이보다 적으면 타이머를 빨갛게 보인다 (초) */
const HURRY_SECONDS = 30;

const KEY_DIRECTIONS: Record<string, Direction> = {
  ArrowUp: "up",
  ArrowRight: "right",
  ArrowDown: "down",
  ArrowLeft: "left",
};

const GameView = ({ room }: { room: RoomDetail }) => {
  const game = usePlayStore((s) => s.game);
  const l = lexicon(lPlay);

  return (
    <div c="flex flex-col gap-4 lg:h-full">
      <RoomHeader room={room}>
        <GameTimer />
      </RoomHeader>
      {game ? (
        <div c="grid min-h-0 flex-1 gap-4 lg:grid-cols-[1fr_18rem]">
          <div c="relative flex min-h-0 flex-col items-center justify-center gap-2 rounded-xl border-2 border-blue-4 bg-white p-3">
            <GameBoard game={game} />
            <p c="text-b4 text-gray">{l("controls")}</p>
            <CountdownOverlay />
            <ResultOverlay game={game} />
          </div>
          <Scoreboard game={game} />
        </div>
      ) : (
        <div c="flex min-h-80 flex-1 flex-col items-center justify-center gap-4 rounded-xl border-2 border-blue-4 bg-white text-b2 text-gray+2">
          <LoaderCircle size={32} className="animate-spin text-blue" />
          <p>{l("loadingGame")}</p>
        </div>
      )}
    </div>
  );
};
export default GameView;

const GameBoard = ({ game }: { game: GameInfo }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const myId = usePlayStore((s) => s.myId);
  const finished = usePlayStore((s) => s.gameResult !== null);
  const l = lexicon(lPlay);
  useGameControls(!finished);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    const options = {
      theme: MAPS[game.mapId].theme,
      players: new Map(game.players.map((v) => [v.userId, v])),
      myId,
      now: 0,
    };
    // 첫 스냅숏이 오기 전에는 처음 타일만 그린다
    const initial: GameSample["from"] = {
      tick: 0,
      remainingMs: game.durationMs,
      players: [],
      kurus: [],
      explosions: [],
      tiles: game.tiles,
      time: 0,
    };
    // 화면에 보이는 크기와 기기의 픽셀 밀도에 맞춰 캔버스 해상도를 정한다
    const observer = new ResizeObserver(() => {
      const scale = window.devicePixelRatio || 1;
      const { width } = canvas.getBoundingClientRect();
      canvas.width = Math.round(width * scale);
      canvas.height = Math.round(((width * BOARD_HEIGHT) / BOARD_WIDTH) * scale);
    });
    observer.observe(canvas);

    let frame = 0;
    let lastFrame: GameFrame | null = null;
    const flameReaches = new Map<number, number>();
    const draw = (now: number) => {
      ctx.setTransform(canvas.width / BOARD_WIDTH, 0, 0, canvas.height / BOARD_HEIGHT, 0, 0);
      options.now = now;
      const sample = sampleGame(now);
      // 효과음은 서버에서 받은 때가 아니라 화면에 그려지는 때에 맞춰 낸다
      if (sample) {
        if (lastFrame && sample.from !== lastFrame) playFrameSounds(lastFrame, sample.from, myId);
        lastFrame = sample.from;
        playFlameSounds(
          sample.from.explosions,
          sample.alpha * (sample.to.time - sample.from.time),
          flameReaches,
        );
      }
      renderGame(ctx, sample ?? { from: initial, to: initial, alpha: 0 }, options);
      frame = requestAnimationFrame(draw);
    };
    frame = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, [game, myId]);

  return (
    <canvas
      ref={canvasRef}
      width={BOARD_WIDTH}
      height={BOARD_HEIGHT}
      role="img"
      aria-label={l("gameBoard")}
      c="block aspect-[15/13] h-auto w-full max-w-[calc((100dvh_-_15rem)*15/13)] rounded-lg"
    />
  );
};

/** 앞서 그린 프레임과 비교해 새로 일어난 일의 효과음을 낸다 */
function playFrameSounds(prev: GameFrame, next: GameFrame, myId: UserId | null): void {
  const kuruIds = new Set(prev.kurus.map((v) => v.id));
  if (next.kurus.some((v) => !kuruIds.has(v.id))) playSound("kuru-set");

  // 아이템은 폭풍에 사라지지 않으므로 내가 선 칸의 아이템이 사라졌으면 내가 주운 것이다
  const me = next.players.find((v) => v.userId === myId);
  if (!me || prev.tiles === next.tiles) return;
  const index = Math.round(me.y) * MAP_COLS + Math.round(me.x);
  if (getItemOfTile(prev.tiles[index] ?? "") && next.tiles[index] === TILES.empty) {
    playSound("field-item");
  }
}

/**
 * 폭풍이 한 칸씩 퍼질 때마다 터지는 소리를 낸다.
 * reaches에는 폭발마다 소리를 낸 거리를 담아 두며, 같은 프레임에 여러 칸이 퍼져도 소리는 한 번만 낸다
 */
function playFlameSounds(
  explosions: ExplosionState[],
  elapsedSinceFrom: number,
  reaches: Map<number, number>,
): void {
  let popped = false;
  for (const v of explosions) {
    const reach = Math.min(
      Math.floor((v.elapsedMs + elapsedSinceFrom) / FLAME_SPREAD_MS),
      Math.max(...v.arms),
    );
    if (reach <= (reaches.get(v.id) ?? -1)) continue;
    reaches.set(v.id, reach);
    popped = true;
  }
  for (const id of reaches.keys()) {
    if (!explosions.some((v) => v.id === id)) reaches.delete(id);
  }
  if (popped) playSound("kuru-pop");
}

/** 방향키는 가장 나중에 누른 키를 따르고, 그 키를 떼면 아직 누르고 있는 다른 키로 돌아간다 */
function useGameControls(enabled: boolean): void {
  useEffect(() => {
    if (!enabled) return;
    const held: Direction[] = [];
    let sent: Direction | null = null;
    const sync = () => {
      const direction = held.at(-1) ?? null;
      if (direction === sent) return;
      sent = direction;
      send({ type: "move", direction });
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      const direction = KEY_DIRECTIONS[e.key];
      if (direction) {
        e.preventDefault();
        if (!held.includes(direction)) held.push(direction);
        sync();
      } else if (e.code === "Space") {
        e.preventDefault();
        if (!e.repeat) send({ type: "placeKuru" });
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      // 포커스된 버튼이 Space로 눌리지 않게 한다
      if (e.code === "Space") e.preventDefault();
      const index = held.indexOf(KEY_DIRECTIONS[e.key] as Direction);
      if (index < 0) return;
      held.splice(index, 1);
      sync();
    };
    // 다른 창으로 가면 keyup을 받지 못하므로 모든 키를 뗀 것으로 본다
    const handleBlur = () => {
      held.length = 0;
      sync();
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    window.addEventListener("blur", handleBlur);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
      window.removeEventListener("blur", handleBlur);
      handleBlur();
    };
  }, [enabled]);
}

const GameTimer = () => {
  const seconds = usePlayStore((s) =>
    Math.ceil((s.gameState?.remainingMs ?? s.game?.durationMs ?? 0) / 1000),
  );
  const l = lexicon(lPlay);

  return (
    <span
      role="timer"
      aria-label={l("timeLeft")}
      c={[
        "inline-flex shrink-0 items-center gap-1 rounded-md bg-gray-5 px-2 py-0.5 text-b2 font-black tabular-nums text-gray+3",
        seconds <= HURRY_SECONDS && "bg-red-5 text-red",
      ]}
    >
      <Timer size={14} />
      {Math.floor(seconds / 60)}:{String(seconds % 60).padStart(2, "0")}
    </span>
  );
};

const Scoreboard = ({ game }: { game: GameInfo }) => {
  const states = usePlayStore((s) => s.gameState?.players);
  const l = lexicon(lPlay);

  return (
    <Panel title={l("players")} icon={Users}>
      <ul c="flex flex-col gap-1 overflow-y-auto p-2">
        {game.players.map((v) => (
          <ScoreRow
            key={v.userId}
            info={v}
            // 첫 스냅숏 전에는 모두 살아 있는 것으로 보고, 그 뒤에 빠진 플레이어는 나간 것이다
            state={states ? (states.find((w) => w.userId === v.userId) ?? null) : undefined}
          />
        ))}
      </ul>
    </Panel>
  );
};

const ScoreRow = ({
  info,
  state,
}: {
  info: GamePlayerInfo;
  /** 게임 도중에 나갔으면 null, 아직 상태를 받지 못했으면 undefined */
  state: GamePlayerState | null | undefined;
}) => {
  const myId = usePlayStore((s) => s.myId);
  const l = lexicon(lPlay);
  const stats = CHARACTERS[info.characterId];
  const out = state === null || state?.ghost;

  return (
    <li c={["flex items-center gap-2 rounded-lg px-2 py-1.5", info.userId === myId && "bg-blue-5"]}>
      <div c="relative shrink-0">
        <CharacterAvatar characterId={info.characterId} c={["size-10", out && "opacity-30"]} />
        {state?.ghost && <Ghost size={18} className="absolute inset-0 m-auto text-brown+2" />}
      </div>
      <div c="flex min-w-0 flex-1 flex-col gap-0.5">
        <span c="flex items-center gap-1 text-b3 font-bold">
          <span c={["truncate", out && "text-gray-1"]}>{info.nickname}</span>
          {info.userId === myId && (
            <span c="shrink-0 rounded-full bg-blue px-1.5 text-b5 text-white">{l("me")}</span>
          )}
          {state === null && (
            <span c="shrink-0 rounded-full bg-gray-4 px-1.5 text-b5 text-gray+2">
              {l("leftGame")}
            </span>
          )}
          {state?.ghost && (
            <span c="shrink-0 rounded-full bg-brown-4 px-1.5 text-b5 text-brown+2">
              {l("ghost")}
            </span>
          )}
        </span>
        <span c="flex gap-2 text-b5 tabular-nums text-gray+1">
          <Stat
            icon={Zap}
            label={l("statPower")}
            value={state?.power ?? stats.initialPower}
            max={stats.maxPower}
          />
          <Stat
            icon={ChevronsRight}
            label={l("statSpeed")}
            value={state?.speed ?? stats.initialSpeed}
            max={stats.maxSpeed}
          />
          <Stat
            icon={CircleDot}
            label={l("statKuru")}
            value={state?.kuru ?? stats.initialKuru}
            max={stats.maxKuru}
          />
        </span>
      </div>
    </li>
  );
};

const Stat = ({
  icon: Icon,
  label,
  value,
  max,
}: {
  icon: LucideIcon;
  label: string;
  value: number;
  max: number;
}) => {
  return (
    <span c="inline-flex items-center gap-0.5" title={label}>
      <Icon size={11} aria-label={label} />
      <span c={[value >= max && "font-bold text-orange+1"]}>
        {value}/{max}
      </span>
    </span>
  );
};

/** 첫 틱이 올 때까지 남은 카운트를 크게 보인다 */
const CountdownOverlay = () => {
  const counting = usePlayStore((s) => !s.gameState || s.gameState.tick === 0);
  const endsAt = usePlayStore((s) => s.countdownEndsAt);
  const [now, setNow] = useState(() => performance.now());

  useEffect(() => {
    if (!counting) return;
    const timer = window.setInterval(() => setNow(performance.now()), 50);
    return () => window.clearInterval(timer);
  }, [counting]);

  if (!counting) return null;
  // 서버의 첫 틱이 조금 늦게 와도 0을 보이지 않는다
  const count = Math.max(1, Math.ceil(((endsAt - now) / GAME_COUNTDOWN_MS) * GAME_COUNTDOWN_COUNT));

  return (
    <div c="pointer-events-none absolute inset-0 flex items-center justify-center rounded-xl bg-white/30">
      <span
        role="timer"
        c="flex size-28 items-center justify-center rounded-full border-4 border-blue-4 bg-white text-h1 font-black tabular-nums text-blue"
      >
        {count}
      </span>
    </div>
  );
};

const ResultOverlay = ({ game }: { game: GameInfo }) => {
  const result = usePlayStore((s) => s.gameResult);
  const myId = usePlayStore((s) => s.myId);
  const l = lexicon(lPlay);
  const won = result !== null && myId !== null && result.winnerIds.includes(myId);

  useEffect(() => {
    if (result) playSound(won ? "game-win" : "game-lose");
  }, [result, won]);

  if (!result) return null;

  const winnerNames = game.players
    .filter((v) => result.winnerIds.includes(v.userId))
    .map((v) => v.nickname)
    .join(", ");

  return (
    <div c="absolute inset-0 flex items-center justify-center rounded-xl bg-white/60 p-4">
      <div
        role="status"
        c="flex flex-col items-center gap-1 rounded-xl border-2 border-blue-4 bg-white px-10 py-6 text-center"
      >
        {won ? (
          <Trophy size={40} className="text-yellow+1" />
        ) : (
          <Ghost size={40} className="text-gray-1" />
        )}
        <p c={["text-h3 font-black", won ? "text-blue" : "text-gray+2"]}>
          {won ? l("victory") : l("defeat")}
        </p>
        <p c="text-b3 font-bold text-gray+1">{l("resultReason", result.reason)}</p>
        <p c="text-b2">{winnerNames ? l("winners", winnerNames) : l("noWinner")}</p>
        <p c="mt-2 text-b4 text-gray">{l("returningToRoom")}</p>
      </div>
    </div>
  );
};
