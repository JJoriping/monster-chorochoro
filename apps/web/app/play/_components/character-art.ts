import type { CharacterId } from "@monster-chorochoro/common";
import { color } from "@/utilities/tailwind";

/** 40×40 좌표계로 그린 캐릭터. SVG 아바타와 게임 화면의 캔버스가 함께 쓴다 */
export const CHARACTER_ART: Record<
  CharacterId,
  { body: string; accessory: { path: string; fill: string } }
> = {
  // 머리 위의 새싹
  moremi: {
    body: color("pink-2"),
    accessory: {
      path: "M20 9 C20 5 17 2 13 2 C13 6 16 8 20 9 C20 6 23 3 27 3 C27 7 24 9 20 9Z",
      fill: color("green"),
    },
  },
  // 뾰족한 두 귀
  pazna: {
    body: color("cyan-1"),
    accessory: { path: "M8 14 L9 3 L17 9Z M32 14 L31 3 L23 9Z", fill: color("cyan+1") },
  },
  // 별이 달린 더듬이
  levisi: {
    body: color("purple-2"),
    accessory: {
      path: "M20 0 L21 2.6 L23.8 2.8 L21.6 4.5 L22.4 7.2 L20 5.7 L17.6 7.2 L18.4 4.5 L16.2 2.8 L19 2.6Z M19 6 H21 V12 H19Z",
      fill: color("yellow"),
    },
  },
};

export const FACE_ART = {
  body: { cx: 20, cy: 23, rx: 16, ry: 14 },
  eyes: [
    { cx: 14, cy: 22, rx: 2, ry: 2.6 },
    { cx: 26, cy: 22, rx: 2, ry: 2.6 },
  ],
  cheeks: [
    { cx: 10, cy: 28, rx: 3, ry: 1.6 },
    { cx: 30, cy: 28, rx: 3, ry: 1.6 },
  ],
  mouth: "M17 29 Q20 32 23 29",
  ink: color("gray+5"),
  cheek: color("red-2", 0.6),
};
