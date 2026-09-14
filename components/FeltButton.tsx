"use client";

import type { ButtonHTMLAttributes } from "react";

const variants = {
  gold:
    "bg-gold text-felt-dark shadow-[0_4px_0_#9a7b0a] active:translate-y-0.5 active:shadow-[0_2px_0_#9a7b0a]",
  cream:
    "bg-cream text-felt-dark shadow-[0_4px_0_#c4b48a] active:translate-y-0.5 active:shadow-[0_2px_0_#c4b48a]",
  danger:
    "bg-danger text-white shadow-[0_4px_0_#7b241c] active:translate-y-0.5 active:shadow-[0_2px_0_#7b241c]",
  ghost:
    "bg-white/10 text-cream border border-white/20 active:bg-white/20",
  felt:
    "bg-felt-light text-cream shadow-[0_4px_0_#0a2f24] active:translate-y-0.5 active:shadow-[0_2px_0_#0a2f24]",
} as const;

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: keyof typeof variants;
};

export function FeltButton({
  variant = "gold",
  className = "",
  ...props
}: Props) {
  return (
    <button
      type="button"
      className={`min-h-12 rounded-2xl px-4 text-base font-bold tracking-wide uppercase disabled:opacity-40 disabled:shadow-none disabled:translate-y-0 touch-manipulation ${variants[variant]} ${className}`}
      {...props}
    />
  );
}
