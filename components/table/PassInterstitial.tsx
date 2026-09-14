"use client";

import { FeltButton } from "@/components/FeltButton";

export function PassInterstitial({
  playerName,
  onReady,
  onEndGame,
}: {
  playerName: string;
  onReady: () => void;
  onEndGame?: () => void;
}) {
  return (
    <div className="phone-screen flex h-dvh flex-col items-center justify-center gap-8 text-center felt-bg">
      <p className="text-xs font-semibold uppercase tracking-[0.3em] text-gold">
        Pass the phone
      </p>
      <h1 className="text-5xl font-bold tracking-tight text-cream">{playerName}</h1>
      <p className="max-w-xs text-felt-muted">
        Hand the phone to this player, then they tap below to take their action.
      </p>
      <FeltButton className="min-h-14 w-full max-w-xs text-lg" onClick={onReady}>
        I&apos;m {playerName}
      </FeltButton>
      {onEndGame && (
        <button
          type="button"
          className="text-xs font-semibold uppercase tracking-wider text-danger"
          onClick={onEndGame}
        >
          End game
        </button>
      )}
    </div>
  );
}
