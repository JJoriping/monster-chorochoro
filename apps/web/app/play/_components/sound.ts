"use client";

import { create } from "zustand";

const SOUND_FILES = {
  "field-item": "/sounds/field-item.mp3",
  "game-lose": "/sounds/game-lose.wav",
  "game-win": "/sounds/game-win.mp3",
  "kuru-pop": "/sounds/kuru-pop.mp3",
  "kuru-set": "/sounds/kuru-set.wav",
  "ui-click": "/sounds/ui-click.mp3",
};
const BGM_FILES = {
  lobby: "/sounds/lobby-bgm.mp3",
  game: "/sounds/game-bgm.mp3",
};

export type SoundId = keyof typeof SOUND_FILES;
export type BgmId = keyof typeof BGM_FILES;

const SFX_VOLUME = 0.6;
const BGM_VOLUME = 0.35;

/** 음소거 설정을 브라우저에 저장할 때 쓰는 키 */
const MUTED_STORAGE_KEY = "monster-chorochoro:muted";

export const useSoundStore = create<{ muted: boolean }>()(() => ({ muted: false }));

/** 서버 렌더링 결과와 어긋나지 않도록 저장된 설정은 마운트한 뒤에 불러온다 */
export function loadSoundSettings(): void {
  try {
    useSoundStore.setState({ muted: localStorage.getItem(MUTED_STORAGE_KEY) === "1" });
  } catch {
    // 저장소를 쓸 수 없으면 기본값을 그대로 쓴다
  }
}

export function toggleMuted(): void {
  const muted = !useSoundStore.getState().muted;
  useSoundStore.setState({ muted });
  try {
    localStorage.setItem(MUTED_STORAGE_KEY, muted ? "1" : "0");
  } catch {
    // 저장하지 못해도 이번 접속 동안은 설정이 유지된다
  }
}

let context: AudioContext | null = null;
let sfxGain: GainNode | null = null;
const buffers = new Map<SoundId, AudioBuffer>();

/** 브라우저는 사용자가 페이지와 상호작용하기 전에는 소리를 막으므로 첫 입력 때 오디오를 준비한다 */
function getContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!context) {
    context = new AudioContext();
    sfxGain = context.createGain();
    sfxGain.gain.value = SFX_VOLUME;
    sfxGain.connect(context.destination);
    for (const [id, url] of Object.entries(SOUND_FILES) as [SoundId, string][]) {
      void loadBuffer(context, id, url);
    }
  }
  if (context.state === "suspended") void context.resume();
  return context;
}

async function loadBuffer(ctx: AudioContext, id: SoundId, url: string): Promise<void> {
  try {
    const response = await fetch(url);
    buffers.set(id, await ctx.decodeAudioData(await response.arrayBuffer()));
  } catch {
    // 불러오지 못한 소리는 재생하지 않는다
  }
}

if (typeof window !== "undefined") {
  const unlock = () => {
    getContext();
    // 막혔던 배경 음악도 이때 다시 튼다
    const audio = bgmId && bgms.get(bgmId);
    if (audio) audio.play().catch(() => {});
    window.removeEventListener("pointerdown", unlock);
    window.removeEventListener("keydown", unlock);
  };
  window.addEventListener("pointerdown", unlock);
  window.addEventListener("keydown", unlock);
}

export function playSound(id: SoundId): void {
  if (useSoundStore.getState().muted) return;
  const ctx = getContext();
  const buffer = buffers.get(id);
  // 오디오가 아직 잠겨 있을 때 재생하면 풀리는 순간 한꺼번에 울리므로 건너뛴다
  if (!ctx || !sfxGain || !buffer || ctx.state !== "running") return;

  const source = ctx.createBufferSource();
  source.buffer = buffer;
  source.connect(sfxGain);
  source.start();
}

const bgms = new Map<BgmId, HTMLAudioElement>();
/** 지금 틀어야 하는 배경 음악 */
let bgmId: BgmId | null = null;

useSoundStore.subscribe(({ muted }) => {
  for (const v of bgms.values()) v.muted = muted;
});

/**
 * 배경 음악을 바꾼다. 이미 틀고 있는 곡이면 처음부터 다시 틀지 않고 이어서 튼다.
 * 배경 음악은 파일이 크므로 미리 전부 받지 않고 스트리밍한다
 */
export function setBgm(id: BgmId | null): void {
  if (typeof window === "undefined" || id === bgmId) return;
  if (bgmId) bgms.get(bgmId)?.pause();
  bgmId = id;
  if (!id) return;

  let audio = bgms.get(id);
  if (!audio) {
    audio = new Audio(BGM_FILES[id]);
    audio.loop = true;
    audio.volume = BGM_VOLUME;
    bgms.set(id, audio);
  }
  audio.muted = useSoundStore.getState().muted;
  audio.currentTime = 0;
  // 자동 재생이 막히면 사용자가 처음 입력할 때 다시 튼다
  audio.play().catch(() => {});
}
