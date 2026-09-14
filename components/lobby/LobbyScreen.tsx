"use client";

import { useState } from "react";
import { ChipAmount } from "@/components/ChipStack";
import { FeltButton } from "@/components/FeltButton";
import { MAX_PLAYERS } from "@/lib/poker";

type Player = {
  _id: string;
  name: string;
  stack: number;
  seat: number;
};

export function LobbyScreen({
  code,
  mode,
  players,
  hostId,
  youId,
  onStart,
  onKick,
  onAddPlayer,
  onEndGame,
}: {
  code: string;
  mode: "multi" | "pass";
  players: Player[];
  hostId: string | undefined;
  youId: string | null;
  onStart: () => void;
  onKick: (id: string) => void;
  onAddPlayer?: (name: string) => void;
  onEndGame?: () => void;
}) {
  const isHost = hostId === youId;
  const isPass = mode === "pass";
  const [newName, setNewName] = useState("");
  const seated = [...players].sort((a, b) => a.seat - b.seat);

  async function copy() {
    try {
      await navigator.clipboard.writeText(code);
    } catch {
      /* ignore */
    }
  }

  return (
    <div className="phone-screen mx-auto flex h-dvh max-w-md flex-col felt-bg">
      <p className="shrink-0 text-center text-xs font-semibold uppercase tracking-[0.3em] text-gold">
        {isPass ? "Pass-and-play" : "Multi-phone"}
      </p>
      {isPass ? (
        <h1 className="mt-3 shrink-0 text-center text-4xl font-bold tracking-tight">
          Who&apos;s in?
        </h1>
      ) : (
        <button
          type="button"
          onClick={copy}
          className="pressable mt-3 shrink-0 rounded-2xl bg-black/25 px-4 py-3 text-center font-mono text-6xl font-bold tracking-[0.2em] text-cream"
        >
          {code}
        </button>
      )}

      <ul className="mt-8 min-h-0 flex-1 space-y-2 overflow-y-auto">
        {seated.map((p) => (
          <li
            key={p._id}
            className="flex items-center justify-between rounded-2xl bg-black/25 px-4 py-3"
          >
            <span>
              <span className="font-semibold">{p.name}</span>
              {p._id === hostId && (
                <span className="ml-2 text-xs uppercase tracking-wider text-gold">
                  Host
                </span>
              )}
            </span>
            <span className="flex items-center gap-3">
              <ChipAmount amount={p.stack} />
              {isHost && p._id !== youId && (
                <button
                  type="button"
                  className="pressable rounded-xl bg-black/30 px-3 py-1.5 text-xs uppercase tracking-wider text-danger"
                  onClick={() => onKick(p._id)}
                >
                  Kick
                </button>
              )}
            </span>
          </li>
        ))}
      </ul>

      {isPass && isHost && onAddPlayer && players.length < MAX_PLAYERS && (
        <div className="mt-4 flex gap-2">
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-base text-cream outline-none focus:border-gold"
            maxLength={16}
            placeholder="Add a player"
          />
          <FeltButton
            className="min-h-12 shrink-0 text-xs"
            disabled={newName.trim().length < 1}
            onClick={() => {
              onAddPlayer(newName.trim());
              setNewName("");
            }}
          >
            Add
          </FeltButton>
        </div>
      )}

      <div className="mt-auto pt-8">
        {!isPass && (
          <p className="mb-3 text-center text-sm text-felt-muted">
            {players.length < 2
              ? `Share the code — ${players.length} of 2+ seated`
              : `${players.length} seated`}
          </p>
        )}
        {isHost ? (
          <>
            <FeltButton
              className="w-full min-h-14"
              disabled={players.length < 2}
              onClick={onStart}
            >
              {players.length < 2 ? "Waiting for players" : "Start game"}
            </FeltButton>
            {onEndGame && (
              <button
                type="button"
                className="pressable mt-4 w-full rounded-xl bg-black/25 py-3 text-center text-xs font-semibold uppercase tracking-wider text-danger"
                onClick={onEndGame}
              >
                End game
              </button>
            )}
          </>
        ) : (
          <p className="text-center text-felt-muted">
            You&apos;re in. Waiting for the host to start…
          </p>
        )}
      </div>
    </div>
  );
}
