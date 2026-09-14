"use client";

import { useId } from "react";
import {
  CHIP_STYLES,
  chipBreakdown,
  formatChips,
  type ChipDenom,
} from "@/lib/chips";

const SIZES = {
  sm: { px: 22, overlap: 8, maxShown: 4 },
  md: { px: 36, overlap: 9, maxShown: 4 },
  lg: { px: 46, overlap: 12, maxShown: 5 },
} as const;

export type ChipSize = keyof typeof SIZES;

export function PokerChip({
  denom,
  size = 38,
}: {
  denom: ChipDenom;
  size?: number;
}) {
  const uid = useId().replace(/:/g, "");
  const style = CHIP_STYLES[denom];
  const label = style.face;
  const face = `chip-face-${uid}`;
  const font = label.length > 2 ? 10 : 13;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      aria-label={`${style.label} ${denom} chip`}
      className="shrink-0 drop-shadow-[0_2px_2px_rgba(0,0,0,0.45)]"
    >
      <defs>
        <radialGradient id={face} cx="36%" cy="30%" r="70%">
          <stop offset="0%" stopColor={style.shine} />
          <stop offset="55%" stopColor={style.bg} />
          <stop offset="100%" stopColor={style.rim} />
        </radialGradient>
      </defs>
      <ellipse cx="32" cy="35" rx="29.5" ry="29.5" fill={style.rim} />
      <circle cx="32" cy="31.5" r="29.5" fill={`url(#${face})`} />
      <circle
        cx="32"
        cy="31.5"
        r="26.2"
        fill="none"
        stroke={style.spot}
        strokeWidth="5.2"
        strokeDasharray="7.2 13.4"
        transform="rotate(-12 32 31.5)"
      />
      <circle
        cx="32"
        cy="31.5"
        r="20.5"
        fill="none"
        stroke={style.rim}
        strokeWidth="1.4"
        opacity="0.9"
      />
      <circle cx="32" cy="31.5" r="15.8" fill={style.bg} />
      <circle
        cx="32"
        cy="31.5"
        r="15.8"
        fill="none"
        stroke={style.spot}
        strokeWidth="1.1"
        opacity="0.85"
      />
      <text
        x="32"
        y="36.2"
        textAnchor="middle"
        fontSize={font}
        fontWeight="800"
        fill={style.text}
        fontFamily="ui-sans-serif, system-ui, sans-serif"
      >
        {label}
      </text>
    </svg>
  );
}

export function ChipStack({
  amount,
  size = "md",
}: {
  amount: number;
  size?: ChipSize;
}) {
  const parts = chipBreakdown(amount);
  const spec = SIZES[size];
  if (parts.length === 0) {
    return (
      <p className="text-sm tracking-wide text-felt-muted uppercase">No chips</p>
    );
  }

  return (
    <div className="flex items-end justify-center gap-2">
      {parts.map(({ denom, count }) => {
        const shown = Math.min(count, spec.maxShown);
        return (
          <div key={denom} className="flex flex-col items-center">
            <div
              className="relative"
              style={{
                width: spec.px,
                height: spec.px + (shown - 1) * spec.overlap,
              }}
            >
              {Array.from({ length: shown }, (_, i) => (
                <div
                  key={i}
                  className="absolute left-0"
                  style={{
                    bottom: i * spec.overlap,
                    zIndex: i + 1,
                  }}
                >
                  <PokerChip denom={denom} size={spec.px} />
                </div>
              ))}
            </div>
            {count > 1 && (
              <span className="mt-1 text-[11px] font-semibold text-cream/80">
                ×{count}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}

export function ChipAmount({
  amount,
  size = "sm",
  mono = true,
}: {
  amount: number;
  size?: ChipSize;
  mono?: boolean;
}) {
  const parts = chipBreakdown(amount);
  const spec = SIZES[size];
  const chips = parts.flatMap(({ denom, count }) =>
    Array.from({ length: Math.min(count, size === "sm" ? 2 : 3) }, (_, i) => ({
      denom,
      key: `${denom}-${i}`,
    })),
  );

  return (
    <span className="inline-flex items-center gap-1.5">
      {chips.length > 0 && (
        <span className="inline-flex items-center -space-x-2">
          {chips.map((c) => (
            <PokerChip key={c.key} denom={c.denom} size={spec.px} />
          ))}
        </span>
      )}
      <span className={mono ? "font-mono font-bold tabular-nums" : "font-bold"}>
        {formatChips(amount)}
      </span>
    </span>
  );
}
