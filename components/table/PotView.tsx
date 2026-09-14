"use client";

import { ChipAmount, ChipStack } from "@/components/ChipStack";
import { formatChips } from "@/lib/chips";
import { showdownResultForTable } from "@/lib/cards";
import { matchBetLabel, streetLabel, visiblePot, type TableState } from "@/lib/poker";

export function PotView({
  table,
  actorName,
  isYourTurn,
}: {
  table: TableState;
  actorName: string | null;
  isYourTurn: boolean;
}) {
  const pot = visiblePot(table);
  const toCall = table.game.currentBet;
  const result =
    table.game.handComplete && table.game.winners
      ? showdownResultForTable({
          winners: table.game.winners,
          board: table.game.board,
          players: table.players,
        })
      : null;

  return (
    <section className="flex h-full flex-col items-center justify-center px-4 py-3 text-center">
      <p className="text-xs font-semibold uppercase tracking-[0.25em] text-gold">
        {streetLabel(table.game.street)}
        {table.game.handNumber > 0 ? ` · Hand ${table.game.handNumber}` : ""}
      </p>
      <div className="mt-2">
        <ChipStack amount={pot} size="lg" />
      </div>
      <p className="pot-glow mt-2 font-mono text-4xl font-bold text-gold sm:text-5xl">
        {formatChips(pot)}
      </p>
      <p className="mt-1 text-sm uppercase tracking-widest text-felt-muted">Pot</p>
      <div className="mt-4 space-y-1 text-sm">
        {toCall > 0 && !table.game.awaitingStreetAdvance && (
          <p className="flex items-center justify-center gap-2 text-cream/90">
            To {matchBetLabel(table.game.street).toLowerCase()}{" "}
            <ChipAmount amount={toCall} />
          </p>
        )}
        {result && <p className="font-semibold text-gold">{result}</p>}
        {!table.game.handComplete && actorName && (
          <p className={isYourTurn ? "font-bold text-gold" : "text-cream/80"}>
            {isYourTurn ? "Your turn" : `${actorName}'s turn`}
          </p>
        )}
        {table.game.awaitingStreetAdvance && (
          <p className="text-felt-muted">Waiting for the next street</p>
        )}
      </div>
    </section>
  );
}
