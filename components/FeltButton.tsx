"use client";

import type { ButtonHTMLAttributes } from "react";

const variants = {
  gold: "bg-gold text-felt-dark",
  cream: "bg-cream text-felt-dark",
  danger: "bg-danger text-white",
  ghost: "bg-white/10 text-cream border border-white/20",
  felt: "bg-felt-light text-cream",
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
      className={`pressable min-h-12 rounded-2xl px-4 text-base font-bold tracking-wide uppercase disabled:opacity-40 touch-manipulation ${variants[variant]} ${className}`}
      {...props}
    />
  );
}
