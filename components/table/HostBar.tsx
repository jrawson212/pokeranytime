"use client";

import { useState } from "react";
import { FeltButton } from "@/components/FeltButton";
import { showdownResultForTable } from "@/lib/cards";
import { nextStreet, streetLabel, type CardMode, type TableState } from "@/lib/poker";

export function HostBar({
  table,
  cardMode = "physical",
  onDeal,
  onAward,
  onNextHand,
}: {
  table: TableState;
  cardMode?: CardMode;
  onDeal: () => void;
  onAward: (winnerIds: string[]) => void;
  onNextHand: () => void;
}) {
  const live = table.players.filter((p) => !p.sittingOut && !p.folded);
  const [selected, setSelected] = useState<string[]>([]);
  const digital = cardMode === "digital";

  let body;
  if (table.game.handComplete) {
    body = (
      <div className="flex items-center justify-between gap-3 px-3 py-2">
        <p className="text-xs font-semibold text-gold">
          {showdownResultForTable({
            winners: table.game.winners,
            board: table.game.board,
            players: table.players,
          })}
        </p>
        <FeltButton className="min-h-10 shrink-0 text-xs" onClick={onNextHand}>
          Next hand
        </FeltButton>
      </div>
    );
  } else if (table.game.street === "showdown" && !digital) {
    body = (
      <div className="px-3 py-2">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-gold">
          Who won the cards?
        </p>
        <div className="mb-2 flex flex-wrap gap-2">
          {live.map((p) => {
            const on = selected.includes(p.id);
            return (
              <FeltButton
                key={p.id}
                variant={on ? "gold" : "ghost"}
                className="min-h-10 text-xs"
                onClick={() =>
                  setSelected((cur) =>
                    on ? cur.filter((id) => id !== p.id) : [...cur, p.id],
                  )
                }
              >
                {p.name}
              </FeltButton>
            );
          })}
        </div>
        <FeltButton
          className="min-h-10 w-full text-xs"
          disabled={selected.length === 0}
          onClick={() => onAward(selected)}
        >
          Award pot
        </FeltButton>
      </div>
    );
  } else if (table.game.awaitingStreetAdvance && !digital) {
    const next = nextStreet(table.game.street);
    body = (
      <div className="flex items-center justify-between gap-3 px-3 py-2">
        <p className="text-xs text-felt-muted">
          {next === "showdown"
            ? "Cards are out — go to showdown"
            : `Physical cards — deal the ${streetLabel(next).toLowerCase()}`}
        </p>
        <FeltButton className="min-h-10 text-xs" onClick={onDeal}>
          {next === "showdown" ? "Showdown" : `Deal ${streetLabel(next)}`}
        </FeltButton>
      </div>
    );
  } else {
    body = (
      <p className="px-3 py-2 text-center text-[11px] uppercase tracking-wider text-felt-muted">
        {digital ? "Host · streets deal themselves" : "Host · you control streets and the pot"}
      </p>
    );
  }

  return (
    <div className="safe-bottom border-t border-white/10 bg-black/20">
      {body}
    </div>
  );
}
