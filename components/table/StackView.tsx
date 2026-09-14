"use client";

import { ChipStack } from "@/components/ChipStack";
import { formatChips } from "@/lib/chips";
import type { PlayerState } from "@/lib/poker";

export function StackView({
  player,
  compact,
  tags = [],
}: {
  player: PlayerState;
  compact?: boolean;
  tags?: string[];
}) {
  const status = player.sittingOut
    ? "Sitting out"
    : player.folded
      ? "Folded"
      : player.isAllIn
        ? "All-in"
        : player.betThisStreet > 0
          ? `In for ${formatChips(player.betThisStreet)}`
          : null;

  return (
    <div className={compact ? "py-1" : "py-2"}>
      {!compact && (
        <p className="mb-2 text-center text-xs font-semibold uppercase tracking-[0.2em] text-felt-muted">
          Your chips
          {tags.length > 0 && (
            <span className="text-gold"> · {tags.join(" · ")}</span>
          )}
        </p>
      )}
      <ChipStack amount={player.stack} size={compact ? "sm" : "lg"} />
      <p
        className={`mt-2 text-center font-mono font-bold text-cream ${compact ? "text-lg" : "text-3xl"}`}
      >
        {formatChips(player.stack)}
      </p>
      {status && (
        <p className="mt-1 text-center text-xs font-semibold uppercase tracking-wider text-gold">
          {status}
        </p>
      )}
    </div>
  );
}
