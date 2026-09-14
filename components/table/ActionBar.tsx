"use client";

import { useEffect, useMemo, useState } from "react";
import { FeltButton } from "@/components/FeltButton";
import { ChipAmount, ChipStack } from "@/components/ChipStack";
import {
  BET_STEP_CENTS,
  centsToDollars,
  dollarsToCents,
  formatChips,
  formatDollarInput,
  sanitizeDollarDraft,
  snapToChipAmount,
} from "@/lib/chips";
import {
  legalActions,
  matchBetLabel,
  raisePresets,
  type Action,
  type TableState,
} from "@/lib/poker";

export function ActionBar({
  table,
  playerId,
  disabled,
  onAct,
}: {
  table: TableState;
  playerId: string;
  disabled?: boolean;
  onAct: (action: Action) => void;
}) {
  const legal = legalActions(table, playerId);
  const presets = useMemo(() => raisePresets(table, playerId), [table, playerId]);
  const [raising, setRaising] = useState(false);
  const [raiseTo, setRaiseTo] = useState<number | null>(null);
  const [draft, setDraft] = useState("");
  const [editing, setEditing] = useState(false);

  const amount = raiseTo ?? legal?.minRaiseTo ?? 0;

  useEffect(() => {
    if (!editing && legal) {
      setDraft(formatDollarInput(centsToDollars(amount)));
    }
  }, [amount, editing, legal]);

  if (!legal) {
    return (
      <p className="px-4 py-3 text-center text-sm text-felt-muted">
        Waiting for action
      </p>
    );
  }

  const bounds = legal;
  const step = BET_STEP_CENTS;
  const matchLabel = matchBetLabel(table.game.street);

  function clampRaise(cents: number) {
    const snapped = snapToChipAmount(cents, bounds.minRaiseTo);
    return Math.min(bounds.maxRaiseTo, Math.max(bounds.minRaiseTo, snapped));
  }

  function commitDraft() {
    setEditing(false);
    const parsed = Number(draft);
    if (!Number.isFinite(parsed)) {
      setDraft(formatDollarInput(centsToDollars(amount)));
      return;
    }
    const next = clampRaise(dollarsToCents(parsed));
    setRaiseTo(next);
    setDraft(formatDollarInput(centsToDollars(next)));
  }

  if (raising && legal.canBetOrRaise) {
    const confirmAmount = editing
      ? clampRaise(dollarsToCents(Number(draft) || 0))
      : amount;

    return (
      <div className="flex flex-col gap-3 px-3 pb-3">
        <div className="flex flex-wrap justify-center gap-2">
          {presets.map((p) => (
            <FeltButton
              key={p.label}
              variant={p.amount === amount ? "gold" : "ghost"}
              className="min-h-10 px-3 text-xs"
              onClick={() => {
                setEditing(false);
                setRaiseTo(p.amount);
              }}
            >
              {p.label}
            </FeltButton>
          ))}
        </div>
        <div className="flex flex-col items-center gap-2">
          <ChipStack amount={amount} size="sm" />
          <div className="flex items-center justify-center gap-3">
            <FeltButton
              variant="felt"
              className="min-h-12 w-12 text-xl"
              onClick={() => {
                setEditing(false);
                setRaiseTo(clampRaise(amount - step));
              }}
            >
              −
            </FeltButton>
            <div className="flex min-h-12 min-w-28 items-center justify-center gap-0.5 rounded-xl border border-white/15 bg-black/30 px-2 focus-within:border-gold">
              <span className="font-mono text-2xl font-bold text-felt-muted">$</span>
              <input
                type="text"
                inputMode="decimal"
                enterKeyHint="done"
                autoComplete="off"
                aria-label="Bet amount"
                value={editing ? draft : formatDollarInput(centsToDollars(amount))}
                onFocus={(e) => {
                  setEditing(true);
                  setDraft(formatDollarInput(centsToDollars(amount)));
                  requestAnimationFrame(() => e.target.select());
                }}
                onChange={(e) => {
                  const next = sanitizeDollarDraft(e.target.value);
                  setDraft(next);
                  if (next === "" || next === "." || next === "0.") return;
                  const parsed = Number(next);
                  if (!Number.isFinite(parsed)) return;
                  const cents = dollarsToCents(parsed);
                  if (cents >= legal.minRaiseTo && cents <= legal.maxRaiseTo) {
                    setRaiseTo(cents);
                  }
                }}
                onBlur={commitDraft}
                onKeyDown={(e) => {
                  if (e.key === "Enter") e.currentTarget.blur();
                }}
                className="w-full bg-transparent text-center font-mono text-2xl font-bold text-cream outline-none"
              />
            </div>
            <FeltButton
              variant="felt"
              className="min-h-12 w-12 text-xl"
              onClick={() => {
                setEditing(false);
                setRaiseTo(clampRaise(amount + step));
              }}
            >
              +
            </FeltButton>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <FeltButton variant="ghost" onClick={() => setRaising(false)}>
            Back
          </FeltButton>
          <FeltButton
            disabled={disabled}
            onClick={() => {
              onAct({ type: "raiseTo", amount: confirmAmount });
              setRaising(false);
              setEditing(false);
            }}
          >
            {legal.isBet ? "Bet" : "Raise"} {formatChips(confirmAmount)}
          </FeltButton>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-2 px-3 pb-3">
      <FeltButton
        variant="danger"
        disabled={disabled || !legal.canFold}
        onClick={() => onAct({ type: "fold" })}
      >
        Fold
      </FeltButton>
      {legal.canCheck ? (
        <FeltButton
          variant="cream"
          disabled={disabled}
          onClick={() => onAct({ type: "check" })}
        >
          Check
        </FeltButton>
      ) : (
        <FeltButton
          variant="cream"
          disabled={disabled || !legal.canCall}
          onClick={() => onAct({ type: "call" })}
        >
          {legal.callAmount >= legal.maxRaiseTo
            ? `All-in ${formatChips(legal.callAmount)}`
            : (
              <span className="inline-flex items-center justify-center gap-1.5">
                {matchLabel} <ChipAmount amount={legal.callAmount} />
              </span>
            )}
        </FeltButton>
      )}
      <FeltButton
        variant="gold"
        disabled={disabled || !legal.canBetOrRaise}
        onClick={() => {
          setRaiseTo(legal.minRaiseTo);
          setEditing(false);
          setRaising(true);
        }}
      >
        {legal.isBet ? "Bet" : "Raise"}
      </FeltButton>
      <FeltButton
        variant="felt"
        disabled={disabled || (!legal.canBetOrRaise && !legal.canCall)}
        onClick={() =>
          onAct(
            legal.canBetOrRaise
              ? { type: "raiseTo", amount: legal.maxRaiseTo }
              : { type: "call" },
          )
        }
      >
        All-in {formatChips(legal.maxRaiseTo)}
      </FeltButton>
    </div>
  );
}
