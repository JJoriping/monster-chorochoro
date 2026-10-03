"use client";

import { lexicon } from "@daldalso/i18n";
import type c from "@daldalso/tailwind-base";
import { type CharacterId, MAPS, type MapId, type MapTheme } from "@monster-chorochoro/common";
import { House, type LucideIcon, Trees, Waves } from "lucide-react";
import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode } from "react";
import lPlay from "@/i18n/l.play";

type CValue = Parameters<typeof c>[number];

export const Panel = ({
  title,
  icon: Icon,
  action,
  c: extra,
  children,
}: {
  title: ReactNode;
  icon: LucideIcon;
  action?: ReactNode;
  c?: CValue;
  children: ReactNode;
}) => {
  return (
    <section c={["flex min-h-0 flex-col rounded-xl border-2 border-blue-4 bg-white", extra]}>
      <header c="flex min-h-12 flex-wrap items-center gap-2 border-b-2 border-blue-5 px-4 py-2">
        <Icon size={16} className="text-blue" />
        <h2 c="flex-1 text-b2 font-bold text-blue+3">{title}</h2>
        {action}
      </header>
      {children}
    </section>
  );
};

const BUTTON_VARIANTS = {
  primary: "bg-blue text-white hover:bg-blue+1",
  success: "bg-green+1 text-white hover:bg-green+2",
  secondary: "border-2 border-gray-4 bg-white text-gray+3 hover:bg-gray-5",
};

export const Button = ({
  variant = "primary",
  type = "button",
  c: extra,
  ...props
}: Omit<ButtonHTMLAttributes<HTMLButtonElement>, "className"> & {
  variant?: keyof typeof BUTTON_VARIANTS;
  c?: CValue;
}) => {
  return (
    <button
      type={type}
      c={[
        "inline-flex shrink-0 items-center justify-center gap-1.5 rounded-md px-3 py-1.5 text-b3 font-bold transition-colors",
        "disabled:cursor-not-allowed disabled:opacity-40",
        BUTTON_VARIANTS[variant],
        extra,
      ]}
      {...props}
    />
  );
};

export const TextInput = ({
  c: extra,
  ...props
}: Omit<InputHTMLAttributes<HTMLInputElement>, "className"> & { c?: CValue }) => {
  return (
    <input
      type="text"
      c={[
        "min-w-0 rounded-md border-2 border-gray-4 bg-white px-2.5 py-1 text-b3 outline-none",
        "placeholder:text-gray-2 focus:border-blue-2",
        extra,
      ]}
      {...props}
    />
  );
};

// tailwind-base의 transformer는 중첩된 객체 리터럴의 문자열을 변형 그룹으로 바꿔 버리므로
// 클래스 이름은 최상위 객체의 값으로만 둔다
const CHARACTER_BODY_CLASSES: Record<CharacterId, string> = {
  moremi: "fill-pink-2",
  pazna: "fill-cyan-1",
};

const CHARACTER_ACCESSORIES: Record<CharacterId, ReactNode> = {
  // 머리 위의 새싹
  moremi: (
    <path
      d="M20 9 C20 5 17 2 13 2 C13 6 16 8 20 9 C20 6 23 3 27 3 C27 7 24 9 20 9Z"
      c="fill-green"
    />
  ),
  // 뾰족한 두 귀
  pazna: <path d="M8 14 L9 3 L17 9Z M32 14 L31 3 L23 9Z" c="fill-cyan+1" />,
};

/** 캐릭터 그림이 아직 없으므로 색과 장식만 다른 동글동글한 얼굴로 대신한다 */
export const CharacterAvatar = ({
  characterId,
  c: extra,
}: {
  characterId: CharacterId;
  c?: CValue;
}) => {
  return (
    <svg viewBox="0 0 40 40" aria-hidden="true" c={["size-12 shrink-0", extra]}>
      {CHARACTER_ACCESSORIES[characterId]}
      <ellipse cx="20" cy="23" rx="16" ry="14" c={CHARACTER_BODY_CLASSES[characterId]} />
      <ellipse cx="14" cy="22" rx="2" ry="2.6" c="fill-gray+5" />
      <ellipse cx="26" cy="22" rx="2" ry="2.6" c="fill-gray+5" />
      <ellipse cx="10" cy="28" rx="3" ry="1.6" c="fill-red-2 opacity-60" />
      <ellipse cx="30" cy="28" rx="3" ry="1.6" c="fill-red-2 opacity-60" />
      <path d="M17 29 Q20 32 23 29" c="fill-none stroke-gray+5" strokeWidth="1.5" />
    </svg>
  );
};

const MAP_THEME_ICONS: Record<MapTheme, LucideIcon> = {
  forest: Trees,
  sea: Waves,
  village: House,
};

const MAP_THEME_CLASSES: Record<MapTheme, string> = {
  forest: "bg-green-4 text-green+2",
  sea: "bg-blue-4 text-blue+2",
  village: "bg-orange-4 text-orange+2",
};

export const MapBadge = ({ mapId }: { mapId: MapId }) => {
  const l = lexicon(lPlay);
  const { theme } = MAPS[mapId];
  const Icon = MAP_THEME_ICONS[theme];

  return (
    <span
      c={[
        "inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-b4 font-bold",
        MAP_THEME_CLASSES[theme],
      ]}
    >
      <Icon size={12} />
      {l("mapName", mapId)}
    </span>
  );
};

export const MapTile = ({ mapId, c: extra }: { mapId: MapId; c?: CValue }) => {
  const { theme } = MAPS[mapId];
  const Icon = MAP_THEME_ICONS[theme];

  return (
    <span
      c={[
        "flex aspect-[15/13] items-center justify-center rounded-md",
        MAP_THEME_CLASSES[theme],
        extra,
      ]}
    >
      <Icon size={28} />
    </span>
  );
};
