import { type GameSnapshot, TICK_MS } from "@monster-chorochoro/common";

/** 화면은 서버보다 이만큼 늦은 시점을 그린다. 그 사이의 두 스냅숏을 보간해 틱 사이를 매끄럽게 잇는다 */
const INTERPOLATION_DELAY_MS = TICK_MS * 2;

/** 보간에 쓰고 남은 오래된 스냅숏은 버린다 */
const FRAME_LIMIT = 30;

export type GameFrame = GameSnapshot & {
  /** 앞선 스냅숏의 타일까지 반영한 이 시점의 전체 타일 */
  tiles: string;
  /** 서버 기준 시각 (ms) */
  time: number;
};

export type GameSample = {
  from: GameFrame;
  to: GameFrame;
  /** from에서 to로 얼마나 나아갔는지 (0~1) */
  alpha: number;
};

let frames: GameFrame[] = [];
let tiles = "";
/** 클라이언트 시각에서 서버 시각을 빼면 나오는 값 */
let clockOffset: number | null = null;

export function resetGameBuffer(initialTiles: string): void {
  frames = [];
  tiles = initialTiles;
  clockOffset = null;
}

export function pushGameSnapshot(snapshot: GameSnapshot, receivedAt = performance.now()): void {
  if (snapshot.tiles) tiles = snapshot.tiles;
  const time = snapshot.tick * TICK_MS;
  // 빨리 도착한 스냅숏일수록 실제 차이에 가까우므로 작은 쪽은 바로 따르고, 커지는 쪽은 천천히 따른다
  const offset = receivedAt - time;
  clockOffset =
    clockOffset === null || offset < clockOffset
      ? offset
      : clockOffset + (offset - clockOffset) * 0.05;

  frames.push({ ...snapshot, tiles, time });
  if (frames.length > FRAME_LIMIT) frames.shift();
}

/** now(클라이언트 시각)에 그릴 상태를 고른다. 아직 받은 스냅숏이 없으면 null */
export function sampleGame(now: number): GameSample | null {
  const first = frames[0];
  const last = frames.at(-1);
  if (!first || !last || clockOffset === null) return null;

  const time = now - clockOffset - INTERPOLATION_DELAY_MS;
  if (time <= first.time) return { from: first, to: first, alpha: 0 };
  if (time >= last.time) return { from: last, to: last, alpha: 0 };

  for (let i = frames.length - 1; i > 0; i--) {
    const from = frames[i - 1] as GameFrame;
    if (from.time > time) continue;
    const to = frames[i] as GameFrame;
    return { from, to, alpha: (time - from.time) / (to.time - from.time) };
  }
  return { from: last, to: last, alpha: 0 };
}
