"use client";

import { useRouter } from "next/navigation";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { ChipStack } from "@/components/ChipStack";
import { FeltButton } from "@/components/FeltButton";
import { ErrorBanner } from "@/components/ErrorBanner";
import {
  blindsForBuyIn,
  centsToDollars,
  dollarsToCents,
  formatDollarInput,
  MIN_BUY_IN_CENTS,
  sanitizeDollarDraft,
  snapSmallBlind,
  snapToChipAmount,
} from "@/lib/chips";
import { convexMessage } from "@/lib/errors";
import { MAX_PLAYERS, MIN_PLAYERS, type CardMode } from "@/lib/poker";
import { loadName, normalizeCode, saveName, savePlayerId } from "@/lib/session";
import { useBrowserValue } from "@/lib/useBrowserValue";

export function LandingScreen({
  convexReady,
  onCreate,
  onJoin,
}: {
  convexReady: boolean;
  onCreate: (input: {
    name: string;
    mode: "multi" | "pass";
    cardMode: CardMode;
    buyIn: number;
    smallBlind: number;
    bigBlind: number;
    maxSeats: number;
    playerNames?: string[];
  }) => Promise<{ code: string; playerId: string }>;
  onJoin: (input: {
    code: string;
    name: string;
  }) => Promise<{ code: string; playerId: string }>;
}) {
  const router = useRouter();
  const storedName = useBrowserValue(loadName, "");
  const [tab, setTab] = useState<"create" | "join">("create");
  const [name, setName] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [mode, setMode] = useState<"multi" | "pass">("multi");
  const [cardMode, setCardMode] = useState<CardMode>("physical");
  const [buyIn, setBuyIn] = useState(20);
  const [smallBlind, setSmallBlind] = useState(0.25);
  const [bigBlind, setBigBlind] = useState(0.5);
  const [maxSeats, setMaxSeats] = useState(8);
  const [extraNames, setExtraNames] = useState<string[]>([""]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const nameValue = name ?? storedName;
  const seatsOutOfRange =
    tab === "create" &&
    mode === "multi" &&
    (maxSeats < MIN_PLAYERS || maxSeats > MAX_PLAYERS);
  const seatLimitMessage = `Max players must be between ${MIN_PLAYERS} and ${MAX_PLAYERS}`;
  const formScrollRef = useRef<HTMLDivElement>(null);
  const newPlayerInputRef = useRef<HTMLInputElement>(null);
  const revealNewPlayer = useRef(false);

  function applyBuyIn(next: number) {
    setBuyIn(next);
    const blinds = blindsForBuyIn(dollarsToCents(next));
    setSmallBlind(centsToDollars(blinds.smallBlind));
    setBigBlind(centsToDollars(blinds.bigBlind));
  }

  function maxSmallBlindCents() {
    return dollarsToCents(buyIn) / 20;
  }

  function applySmallBlind(next: number) {
    const sb = snapSmallBlind(dollarsToCents(next), maxSmallBlindCents());
    setSmallBlind(centsToDollars(sb));
    setBigBlind(centsToDollars(sb * 2));
  }

  function applyBigBlind(next: number) {
    const bb = snapSmallBlind(dollarsToCents(next) / 2, maxSmallBlindCents()) * 2;
    setBigBlind(centsToDollars(bb));
    setSmallBlind(centsToDollars(bb / 2));
  }

  useLayoutEffect(() => {
    if (!revealNewPlayer.current) return;
    revealNewPlayer.current = false;
    const input = newPlayerInputRef.current;
    const scroller = formScrollRef.current;
    if (scroller) scroller.scrollTop = scroller.scrollHeight;
    input?.scrollIntoView({ block: "end", inline: "nearest", behavior: "auto" });
    input?.focus({ preventScroll: true });
  }, [extraNames.length]);

  if (!convexReady) {
    return (
      <div className="phone-screen mx-auto flex max-w-md flex-col justify-center gap-4 felt-bg">
        <h1 className="text-4xl font-bold">Poker Anytime</h1>
        <p className="text-felt-muted">
          One more setup step: in a terminal, run
        </p>
        <code className="block rounded-xl bg-black/30 px-4 py-3 font-mono text-gold">
          npx convex dev
        </code>
        <p className="text-felt-muted">
          Sign in with a free Convex account. That writes{" "}
          <span className="text-gold">NEXT_PUBLIC_CONVEX_URL</span> so phones can
          share a pot. Restart <span className="text-gold">npm run dev</span>{" "}
          after it finishes.
        </p>
      </div>
    );
  }

  async function submitCreate() {
    setBusy(true);
    setError(null);
    try {
      saveName(nameValue);
      const extras = extraNames.map((n) => n.trim()).filter(Boolean);
      const buyInCents = snapToChipAmount(dollarsToCents(buyIn), MIN_BUY_IN_CENTS);
      const smallBlindCents = snapSmallBlind(
        dollarsToCents(smallBlind),
        buyInCents / 20,
      );
      const result = await onCreate({
        name: nameValue,
        mode,
        cardMode,
        buyIn: buyInCents,
        smallBlind: smallBlindCents,
        bigBlind: smallBlindCents * 2,
        maxSeats: mode === "pass" ? extras.length + 1 : maxSeats,
        playerNames: mode === "pass" ? extras : undefined,
      });
      savePlayerId(result.code, result.playerId);
      router.push(`/room/${result.code}?p=${result.playerId}`);
    } catch (e) {
      setError(convexMessage(e));
    } finally {
      setBusy(false);
    }
  }

  async function submitJoin() {
    setBusy(true);
    setError(null);
    try {
      saveName(nameValue);
      const result = await onJoin({ code: normalizeCode(code), name: nameValue });
      savePlayerId(result.code, result.playerId);
      router.push(`/room/${result.code}?p=${result.playerId}`);
    } catch (e) {
      setError(convexMessage(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="phone-screen mx-auto flex h-dvh max-w-md flex-col felt-bg !pt-0">
      <ErrorBanner message={error} onDismiss={() => setError(null)} />
      <div
        ref={formScrollRef}
        className="flex min-h-0 flex-1 flex-col justify-start gap-5 overflow-y-auto overscroll-y-contain pb-2 [-webkit-overflow-scrolling:touch]"
      >
        <header className="shrink-0 pt-[calc(max(0.75rem,env(safe-area-inset-top,0px),var(--app-safe-top))+0.5rem)]">
          <h1 className="text-4xl font-bold tracking-tight">Poker Anytime</h1>
        </header>

        <div className="grid shrink-0 grid-cols-2 gap-2 rounded-2xl border border-white/15 bg-black/25 p-1">
          <button
            type="button"
            className={`pressable rounded-xl border-2 py-2.5 text-sm font-bold uppercase tracking-wide ${tab === "create" ? "border-cream bg-gold text-felt-dark" : "border-transparent bg-black/20 text-cream"}`}
            onClick={() => setTab("create")}
          >
            Create
          </button>
          <button
            type="button"
            className={`pressable rounded-xl border-2 py-2.5 text-sm font-bold uppercase tracking-wide ${tab === "join" ? "border-cream bg-gold text-felt-dark" : "border-transparent bg-black/20 text-cream"}`}
            onClick={() => setTab("join")}
          >
            Join
          </button>
        </div>
        <label className="text-xs font-semibold uppercase tracking-wider text-felt-muted">
          Your name
          <input
            value={nameValue}
            onChange={(e) => setName(e.target.value)}
            className="mt-1 w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-base text-cream outline-none focus:border-gold"
            maxLength={16}
            placeholder="Alex"
          />
        </label>

        {tab === "join" ? (
          <label className="text-xs font-semibold uppercase tracking-wider text-felt-muted">
            Room code
            <span className="mt-1 block font-normal normal-case tracking-normal text-felt-muted">
              For multi-phone games only
            </span>
            <input
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              className="mt-1 w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-center font-mono text-2xl tracking-[0.4em] text-cream outline-none focus:border-gold"
              maxLength={4}
              placeholder="K7MP"
            />
          </label>
        ) : (
          <>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-felt-muted">
                How you&apos;ll play
              </p>
              <div className="mt-2 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setMode("multi")}
                  className={`rounded-2xl border border-white/10 px-3 py-4 text-left ${mode === "multi" ? "pressable bg-black/25" : "bg-black/20 active:opacity-80"}`}
                >
                  <span className="block font-bold">Multi-phone</span>
                  <span className="mt-1 block text-xs text-felt-muted">
                    One phone per player. Pot on top, your chips below.
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMode("pass");
                    setExtraNames(cardMode === "digital" ? [] : [""]);
                  }}
                  className={`rounded-2xl border border-white/10 px-3 py-4 text-left ${mode === "pass" ? "pressable bg-black/25" : "bg-black/20 active:opacity-80"}`}
                >
                  <span className="block font-bold">Pass-and-play</span>
                  <span className="mt-1 block text-xs text-felt-muted">
                    One phone. Pass it when it&apos;s the next player&apos;s turn.
                  </span>
                </button>
              </div>
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-felt-muted">
                Cards
              </p>
              <div className="mt-2 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setCardMode("physical");
                    if (mode === "pass" && extraNames.length === 0) {
                      setExtraNames([""]);
                    }
                  }}
                  className={`rounded-2xl border border-white/10 px-3 py-4 text-left ${cardMode === "physical" ? "pressable bg-black/25" : "bg-black/20 active:opacity-80"}`}
                >
                  <span className="block font-bold">We have cards</span>
                  <span className="mt-1 block text-xs text-felt-muted">
                    Real deck on the table. Phones track chips only.
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setCardMode("digital");
                    if (mode === "pass" && extraNames.every((n) => !n.trim())) {
                      setExtraNames([]);
                    }
                  }}
                  className={`rounded-2xl border border-white/10 px-3 py-4 text-left ${cardMode === "digital" ? "pressable bg-black/25" : "bg-black/20 active:opacity-80"}`}
                >
                  <span className="block font-bold">We don&apos;t have cards</span>
                  <span className="mt-1 block text-xs text-felt-muted">
                    Deal on the phone. Scroll down to peek at your hand.
                  </span>
                </button>
              </div>
            </div>

            <ChipNumberField
              label="Buy-in"
              value={buyIn}
              onChange={applyBuyIn}
              min={5}
              snap={(n) => centsToDollars(snapToChipAmount(dollarsToCents(n), MIN_BUY_IN_CENTS))}
            />

            <div className="grid grid-cols-2 gap-3">
              <ChipNumberField
                label="Small blind"
                value={smallBlind}
                onChange={applySmallBlind}
                min={0.25}
                compact
                snap={(n) =>
                  centsToDollars(snapSmallBlind(dollarsToCents(n), maxSmallBlindCents()))
                }
              />
              <ChipNumberField
                label="Big blind"
                value={bigBlind}
                onChange={applyBigBlind}
                min={0.5}
                compact
                snap={(n) =>
                  centsToDollars(snapSmallBlind(dollarsToCents(n) / 2, maxSmallBlindCents()) * 2)
                }
              />
              {mode === "multi" && (
                <NumberField
                  label="Number of players"
                  value={maxSeats}
                  onChange={(n) => {
                    setMaxSeats(n);
                    if (n < MIN_PLAYERS || n > MAX_PLAYERS) {
                      setError(seatLimitMessage);
                    } else {
                      setError((cur) =>
                        cur === seatLimitMessage ? null : cur,
                      );
                    }
                  }}
                />
              )}
            </div>

            {mode === "pass" && (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-felt-muted">
                  Who&apos;s playing
                </p>
                <p className="mt-1 text-sm text-felt-muted">
                  {cardMode === "digital"
                    ? "Add friends on this phone, or start alone and play against 3 automatic players."
                    : "Add everyone on this phone. No room code — you\u2019ll pass the phone."}
                </p>
                {cardMode === "digital" &&
                  extraNames.filter((n) => n.trim()).length < 1 && (
                    <p className="mt-2 rounded-xl bg-gold/10 px-3 py-2 text-sm text-gold">
                      Solo mode: River, Oak, and Bluff will sit with you.
                    </p>
                  )}
                <ul className="mt-3 space-y-2">
                  <li className="rounded-xl bg-black/25 px-4 py-3 font-semibold">
                    {nameValue.trim() || "You"}
                    <span className="ml-2 text-xs uppercase tracking-wider text-gold">
                      You
                    </span>
                  </li>
                  {extraNames.map((n, i) => (
                    <li key={i} className="flex gap-2 scroll-mb-6">
                      <input
                        ref={i === extraNames.length - 1 ? newPlayerInputRef : undefined}
                        value={n}
                        onChange={(e) =>
                          setExtraNames((cur) =>
                            cur.map((x, j) => (j === i ? e.target.value : x)),
                          )
                        }
                        className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-base text-cream outline-none focus:border-gold"
                        maxLength={16}
                        placeholder={`Player ${i + 2}`}
                        enterKeyHint="next"
                        autoComplete="off"
                      />
                      {(extraNames.length > 1 ||
                        (cardMode === "digital" && extraNames.length >= 1)) && (
                        <button
                          type="button"
                          className="pressable shrink-0 rounded-xl bg-black/30 px-3 py-2 text-xs uppercase tracking-wider text-danger"
                          onClick={() =>
                            setExtraNames((cur) => {
                              const next = cur.filter((_, j) => j !== i);
                              if (next.length > 0) return next;
                              return cardMode === "digital" ? [] : [""];
                            })
                          }
                        >
                          Remove
                        </button>
                      )}
                    </li>
                  ))}
                </ul>
                {extraNames.length < MAX_PLAYERS - 1 && (
                  <button
                    type="button"
                    className="pressable mt-3 scroll-mb-4 rounded-xl bg-black/25 px-3 py-2 text-sm font-semibold text-gold"
                    onClick={() => {
                      revealNewPlayer.current = true;
                      flushSync(() => {
                        setExtraNames((cur) => {
                          const filled = cur.filter((n) => n.trim());
                          return [...filled, ""];
                        });
                      });
                      newPlayerInputRef.current?.focus({ preventScroll: true });
                    }}
                  >
                    + Add player
                  </button>
                )}
              </div>
            )}
          </>
        )}

        <div className="shrink-0">
          {tab === "join" ? (
            <>
              {nameValue.trim().length < 1 && (
                <p className="mb-2 text-center text-sm text-felt-muted">
                  Enter your name to sit down
                </p>
              )}
              {nameValue.trim().length >= 1 && normalizeCode(code).length !== 4 && (
                <p className="mb-2 text-center text-sm text-felt-muted">
                  Enter the 4-character room code
                </p>
              )}
              <FeltButton
                className="!min-h-10 w-full py-2 text-sm"
                disabled={busy || nameValue.trim().length < 1 || normalizeCode(code).length !== 4}
                onClick={submitJoin}
              >
                {busy ? "Joining…" : "Sit down"}
              </FeltButton>
            </>
          ) : (
            <FeltButton
              className="!min-h-10 w-full py-2 text-sm"
              disabled={
                busy ||
                nameValue.trim().length < 1 ||
                seatsOutOfRange ||
                (mode === "pass" &&
                  cardMode !== "digital" &&
                  extraNames.filter((n) => n.trim()).length < 1)
              }
              onClick={submitCreate}
            >
              {busy
                ? "Creating…"
                : mode === "pass" &&
                    cardMode === "digital" &&
                    extraNames.filter((n) => n.trim()).length < 1
                  ? "Play solo"
                  : mode === "pass"
                    ? "Start game"
                    : "Create room"}
            </FeltButton>
          )}
        </div>
      </div>
    </div>
  );
}

function sanitizeSeatDraft(raw: string): string {
  return raw.replace(/\D/g, "").replace(/^0+(?=\d)/, "");
}

function NumberField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (n: number) => void;
}) {
  const [draft, setDraft] = useState(() => String(value));
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    if (!focused) setDraft(String(value));
  }, [value, focused]);

  return (
    <label className="text-xs font-semibold uppercase tracking-wider text-felt-muted">
      {label}
      <input
        type="text"
        inputMode="numeric"
        value={draft}
        onFocus={() => setFocused(true)}
        onChange={(e) => {
          const next = sanitizeSeatDraft(e.target.value);
          setDraft(next);
          if (next === "") return;
          const parsed = Number(next);
          if (Number.isFinite(parsed)) onChange(parsed);
        }}
        onBlur={() => {
          setFocused(false);
          if (draft === "" || !Number.isFinite(Number(draft))) {
            setDraft(String(value));
            return;
          }
          const next = Number(draft);
          onChange(next);
          setDraft(String(next));
        }}
        className="mt-1 w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-base text-cream outline-none focus:border-gold"
      />
    </label>
  );
}

function ChipNumberField({
  label,
  value,
  onChange,
  min = 1,
  max = 1_000_000,
  compact = false,
  snap,
}: {
  label: string;
  value: number;
  onChange: (n: number) => void;
  min?: number;
  max?: number;
  compact?: boolean;
  snap?: (n: number) => number;
}) {
  const [draft, setDraft] = useState(() => formatDollarInput(value));
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    if (!focused) setDraft(formatDollarInput(value));
  }, [value, focused]);

  return (
    <label className="text-xs font-semibold uppercase tracking-wider text-felt-muted">
      {label}
      <span className="mt-1 flex flex-col items-center rounded-2xl border border-white/10 bg-black/25 px-2 py-3">
        <ChipStack
          amount={dollarsToCents(Number.isFinite(value) ? value : 0)}
          size={compact ? "sm" : "md"}
        />
        <input
          type="text"
          inputMode="decimal"
          value={draft}
          min={min}
          max={max}
          onFocus={() => setFocused(true)}
          onChange={(e) => {
            const next = sanitizeDollarDraft(e.target.value);
            setDraft(next);
            if (next === "" || next === "." || next === "0.") return;
            const parsed = Number(next);
            if (Number.isFinite(parsed)) onChange(parsed);
          }}
          onBlur={() => {
            setFocused(false);
            const parsed = Number(draft);
            const raw = Number.isFinite(parsed) ? parsed : value;
            const next = snap ? snap(raw) : raw;
            onChange(next);
            setDraft(formatDollarInput(next));
          }}
          className="mt-2 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-center font-mono text-lg text-cream outline-none focus:border-gold"
        />
      </span>
    </label>
  );
}
