"use client";

import { lexicon } from "@daldalso/i18n";
import type c from "@daldalso/tailwind-base";
import { type CharacterId, MAPS, type MapId, type MapTheme } from "@monster-chorochoro/common";
import { House, type LucideIcon, Trees, Waves } from "lucide-react";
import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode } from "react";
import lPlay from "@/i18n/l.play";
import { CHARACTER_ART, FACE_ART } from "./character-art";

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

/** 캐릭터 그림이 아직 없으므로 색과 장식만 다른 동글동글한 얼굴로 대신한다 */
export const CharacterAvatar = ({
  characterId,
  c: extra,
}: {
  characterId: CharacterId;
  c?: CValue;
}) => {
  const art = CHARACTER_ART[characterId];

  return (
    <svg viewBox="0 0 40 40" aria-hidden="true" c={["size-12 shrink-0", extra]}>
      <path d={art.accessory.path} fill={art.accessory.fill} />
      <ellipse {...FACE_ART.body} fill={art.body} />
      {FACE_ART.eyes.map((v) => (
        <ellipse key={v.cx} {...v} fill={FACE_ART.ink} />
      ))}
      {FACE_ART.cheeks.map((v) => (
        <ellipse key={v.cx} {...v} fill={FACE_ART.cheek} />
      ))}
      <path d={FACE_ART.mouth} fill="none" stroke={FACE_ART.ink} strokeWidth="1.5" />
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
