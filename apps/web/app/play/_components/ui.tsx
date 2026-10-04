"use client";

import { lexicon } from "@daldalso/i18n";
import type c from "@daldalso/tailwind-base";
import { type CharacterId, MAPS, type MapId, type MapTheme } from "@monster-chorochoro/common";
import {
  ChevronLeft,
  ChevronRight,
  Factory,
  House,
  type LucideIcon,
  Snowflake,
  Trees,
  Waves,
} from "lucide-react";
import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode } from "react";
import lPlay from "@/i18n/l.play";
import { CHARACTER_ART, FACE_ART } from "./character-art";
import { playSound } from "./sound";

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
  onClick,
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
      onClick={(e) => {
        playSound("ui-click");
        onClick?.(e);
      }}
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
  factory: Factory,
  ice: Snowflake,
};

const MAP_THEME_CLASSES: Record<MapTheme, string> = {
  forest: "bg-green-4 text-green+2",
  sea: "bg-blue-4 text-blue+2",
  village: "bg-orange-4 text-orange+2",
  factory: "bg-gray-4 text-gray+2",
  ice: "bg-cyan-4 text-cyan+2",
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

/** 항목을 하나씩 넘겨 보는 캐러셀. 넘기면 그 항목이 바로 선택된다 */
export const Carousel = <T extends string>({
  items,
  value,
  onChange,
  disabled,
  renderItem,
}: {
  items: readonly T[];
  value: T;
  onChange: (value: T) => void;
  disabled?: boolean;
  renderItem: (item: T) => ReactNode;
}) => {
  const l = lexicon(lPlay);
  const index = Math.max(items.indexOf(value), 0);

  const select = (next: T) => {
    playSound("ui-click");
    onChange(next);
  };
  // 끝에서 넘기면 반대쪽 끝으로 돌아간다
  const step = (offset: number) => {
    select(items[(index + offset + items.length) % items.length] as T);
  };

  return (
    <div c="flex flex-col gap-2">
      <div c="flex items-center gap-1">
        <CarouselArrow
          icon={ChevronLeft}
          label={l("previous")}
          disabled={disabled}
          onClick={() => step(-1)}
        />
        <div c="min-w-0 flex-1 overflow-hidden">
          <div
            c="flex transition-transform duration-300 ease-out"
            style={{ transform: `translateX(-${index * 100}%)` }}
          >
            {items.map((v) => (
              <div key={v} aria-hidden={v !== value} c="w-full shrink-0">
                {renderItem(v)}
              </div>
            ))}
          </div>
        </div>
        <CarouselArrow
          icon={ChevronRight}
          label={l("next")}
          disabled={disabled}
          onClick={() => step(1)}
        />
      </div>
      <div c="flex justify-center gap-1.5">
        {items.map((v, i) => (
          <button
            key={v}
            type="button"
            aria-label={`${i + 1}/${items.length}`}
            aria-current={v === value}
            disabled={disabled}
            onClick={() => select(v)}
            c={[
              "size-2 rounded-full bg-gray-4 transition-colors disabled:cursor-default",
              !disabled && "hover:bg-blue-3",
              v === value && "bg-blue hover:bg-blue",
            ]}
          />
        ))}
      </div>
    </div>
  );
};

const CarouselArrow = ({
  icon: Icon,
  label,
  disabled,
  onClick,
}: {
  icon: LucideIcon;
  label: string;
  disabled?: boolean;
  onClick: () => void;
}) => {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      c="flex size-8 shrink-0 items-center justify-center rounded-full text-blue transition-colors hover:bg-blue-5 disabled:cursor-default disabled:opacity-30 disabled:hover:bg-transparent"
    >
      <Icon size={20} />
    </button>
  );
};
