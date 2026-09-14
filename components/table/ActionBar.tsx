"use client";

import { useMemo, useState } from "react";
import { FeltButton } from "@/components/FeltButton";
import { ChipAmount, ChipStack } from "@/components/ChipStack";
import { formatChips, BET_STEP_CENTS } from "@/lib/chips";
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

  if (!legal) {
    return (
      <p className="px-4 py-3 text-center text-sm text-felt-muted">
        Waiting for action
      </p>
    );
  }

  const amount = raiseTo ?? legal.minRaiseTo;
  const step = BET_STEP_CENTS;
  const matchLabel = matchBetLabel(table.game.street);

  if (raising && legal.canBetOrRaise) {
    return (
      <div className="flex flex-col gap-3 px-3 pb-3">
        <div className="flex flex-wrap justify-center gap-2">
          {presets.map((p) => (
            <FeltButton
              key={p.label}
              variant={p.amount === amount ? "gold" : "ghost"}
              className="min-h-10 px-3 text-xs"
              onClick={() => setRaiseTo(p.amount)}
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
              onClick={() =>
                setRaiseTo(Math.max(legal.minRaiseTo, amount - step))
              }
            >
              −
            </FeltButton>
            <p className="min-w-24 text-center font-mono text-2xl font-bold">
              {formatChips(amount)}
            </p>
            <FeltButton
              variant="felt"
              className="min-h-12 w-12 text-xl"
              onClick={() =>
                setRaiseTo(Math.min(legal.maxRaiseTo, amount + step))
              }
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
              onAct({ type: "raiseTo", amount });
              setRaising(false);
            }}
          >
            {legal.isBet ? "Bet" : "Raise"} {formatChips(amount)}
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
