"use client";

import { ChipAmount } from "@/components/ChipStack";
import { HomeButton } from "@/components/HomeButton";
import { CardRow } from "@/components/PlayingCard";
import {
  bestHoldemHand,
  describeHand,
  showdownResultForTable,
} from "@/lib/cards";
import {
  positionTags,
  streetLabel,
  visiblePot,
  type Action,
  type CardMode,
  type PlayerState,
  type TableState,
} from "@/lib/poker";
import { formatChips } from "@/lib/chips";
import { ActionBar } from "./ActionBar";
import { HostBar } from "./HostBar";
import { PassInterstitial } from "./PassInterstitial";
import { PotView } from "./PotView";
import { StackView } from "./StackView";

export function TableScreen({
  table,
  you,
  isHost,
  mode,
  cardMode = "physical",
  needsPass,
  passName,
  onAct,
  onDeal,
  onAward,
  onNextHand,
  onAcknowledge,
  onGoHome,
}: {
  table: TableState;
  you: PlayerState | undefined;
  isHost: boolean;
  mode: "multi" | "pass";
  cardMode?: CardMode;
  needsPass: boolean;
  passName: string | null;
  onAct: (action: Action) => void;
  onDeal: () => void;
  onAward: (winnerIds: string[]) => void;
  onNextHand: () => void;
  onAcknowledge: () => void;
  onGoHome: () => void;
}) {
  if (needsPass && passName) {
    return (
      <div className="relative">
        <HomeButton onClick={onGoHome} />
        <PassInterstitial
          playerName={passName}
          onReady={onAcknowledge}
        />
      </div>
    );
  }

  const actor = table.players.find((p) => p.id === table.game.toAct);
  const isYourTurn =
    mode === "pass"
      ? !!actor &&
        !table.game.handComplete &&
        !table.game.awaitingStreetAdvance &&
        table.game.street !== "showdown"
      : !!you && table.game.toAct === you.id;

  const actingPlayer = mode === "pass" ? actor : you;
  const holeCards =
    cardMode === "digital"
      ? mode === "pass"
        ? (actor?.holeCards ?? [])
        : (you?.holeCards ?? [])
      : [];

  const hostBar = isHost ? (
    <HostBar
      table={table}
      cardMode={cardMode}
      onDeal={onDeal}
      onAward={onAward}
      onNextHand={onNextHand}
    />
  ) : null;

  if (cardMode === "digital") {
    const boardSlots =
      table.game.street === "preflop"
        ? 5
        : table.game.street === "flop"
          ? 2
          : table.game.street === "turn"
            ? 1
            : 0;
    const revealHands =
      table.game.handComplete || table.game.street === "showdown";

    return (
      <div className="relative flex h-dvh flex-col overflow-hidden felt-bg">
        <HomeButton onClick={onGoHome} />
        <div className="safe-top shrink-0 border-b border-white/10 px-4 pb-4 pr-14">
          <p className="text-center text-xs font-semibold uppercase tracking-[0.25em] text-gold">
            {streetLabel(table.game.street)} · Hand {table.game.handNumber}
          </p>
          {table.game.handComplete ? (
            <p className="mt-2 text-center text-sm font-semibold text-gold">
              {showdownResultForTable({
                winners: table.game.winners,
                board: table.game.board,
                players: table.players,
              })}
            </p>
          ) : (
            <p className="mt-2 text-center text-xs font-semibold uppercase tracking-wider text-felt-muted">
              Your cards · scroll to peek
            </p>
          )}
          <p className="mt-1 text-center font-mono text-2xl font-bold text-gold">
            {formatChips(visiblePot(table))}
          </p>
          <div className="mt-3">
            <CardRow
              cards={table.game.board}
              size="md"
              empty={Math.max(0, boardSlots)}
            />
          </div>
          {actor && !table.game.handComplete && (
            <p className="mt-2 text-center text-sm text-felt-muted">
              {isYourTurn ? "Your turn" : `Waiting for ${actor.name}`}
            </p>
          )}
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain px-3 py-3">
          <ul className="space-y-2">
            {table.players.map((p) => {
              const hand =
                revealHands && p.holeCards.length >= 2 && table.game.board.length >= 3
                  ? bestHoldemHand(p.holeCards, table.game.board)
                  : null;
              const won = table.game.winners?.includes(p.id);
              return (
                <li
                  key={p.id}
                  className={`rounded-xl px-3 py-2 ${
                    won
                      ? "bg-gold/20 ring-1 ring-gold"
                      : p.id === table.game.toAct
                        ? "bg-gold/15 ring-1 ring-gold"
                        : "bg-black/20"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold">
                      {p.name}
                      {positionTags(table.players, table.game.dealerSeat, p.id).map(
                        (tag) => (
                          <span key={tag} className="text-gold">
                            {" · "}
                            {tag}
                          </span>
                        ),
                      )}
                      {p.folded ? " · fold" : ""}
                      {p.isAllIn ? " · all-in" : ""}
                    </span>
                    <ChipAmount amount={p.stack} />
                  </div>
                  {revealHands && !p.folded && p.holeCards.length > 0 && (
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <CardRow cards={p.holeCards} size="sm" />
                      {hand && (
                        <span className="text-xs text-felt-muted">
                          {describeHand(hand)}
                        </span>
                      )}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>

          {actingPlayer && isYourTurn && !table.game.handComplete && (
            <div className="mt-4">
              <ActionBar
                table={table}
                playerId={actingPlayer.id}
                onAct={onAct}
              />
            </div>
          )}

          {!revealHands && (
            <>
              {/* Always push hole cards below the fold, even with 2 players. */}
              <div className="min-h-[85dvh] shrink-0" aria-hidden />

              <div className="border-t border-white/10 pb-10 pt-8">
                {holeCards.length > 0 ? (
                  <CardRow cards={holeCards} size="lg" />
                ) : (
                  <p className="text-center text-sm text-felt-muted">
                    {mode === "pass"
                      ? "Cards stay hidden until it\u2019s your turn"
                      : "Waiting for the deal"}
                  </p>
                )}
              </div>
            </>
          )}
        </div>

        {hostBar}
      </div>
    );
  }

  if (mode === "pass") {
    return (
      <div className="relative flex min-h-dvh flex-col felt-bg">
        <HomeButton onClick={onGoHome} />
        <div className="safe-top min-h-[38vh] border-b border-white/10">
          <PotView
            table={table}
            actorName={actor?.name ?? null}
            isYourTurn={isYourTurn}
          />
        </div>
        <div className="flex-1 px-3 py-3">
          <ul className="space-y-2">
            {table.players.map((p) => (
              <li
                key={p.id}
                className={`flex items-center justify-between rounded-xl px-3 py-2 ${
                  p.id === table.game.toAct ? "bg-gold/15 ring-1 ring-gold" : "bg-black/20"
                }`}
              >
                <span className="font-semibold">
                  {p.name}
                  {positionTags(table.players, table.game.dealerSeat, p.id).map(
                    (tag) => (
                      <span key={tag} className="text-gold">
                        {" · "}
                        {tag}
                      </span>
                    ),
                  )}
                  {p.folded ? " · fold" : ""}
                  {p.isAllIn ? " · all-in" : ""}
                </span>
                <ChipAmount amount={p.stack} />
              </li>
            ))}
          </ul>
          {actor && isYourTurn && (
            <div className="mt-4">
              <ActionBar table={table} playerId={actor.id} onAct={onAct} />
            </div>
          )}
        </div>
        {hostBar}
      </div>
    );
  }

  return (
    <div className="relative flex h-dvh flex-col overflow-hidden felt-bg">
      <HomeButton onClick={onGoHome} />
      <div className="safe-top h-[48%] min-h-0 border-b border-white/10">
        <PotView
          table={table}
          actorName={actor?.name ?? null}
          isYourTurn={isYourTurn}
        />
      </div>
      <div className="flex min-h-0 flex-1 flex-col">
        {you ? (
          <StackView
            player={you}
            tags={positionTags(table.players, table.game.dealerSeat, you.id)}
          />
        ) : (
          <p className="p-4 text-center text-felt-muted">Spectating</p>
        )}
        <div className="mt-auto">
          {you && isYourTurn && (
            <ActionBar table={table} playerId={you.id} onAct={onAct} />
          )}
          {you && !isYourTurn && (
            <p className="px-4 py-3 text-center text-sm text-felt-muted">
              {table.game.handComplete
                ? "Hand over"
                : actor
                  ? `Waiting for ${actor.name}`
                  : streetLabel(table.game.street)}
            </p>
          )}
          {hostBar}
        </div>
      </div>
    </div>
  );
}
