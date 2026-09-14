"use client";

import { useMutation, useQuery } from "convex/react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { ErrorBanner } from "@/components/ErrorBanner";
import { FeltButton } from "@/components/FeltButton";
import { GameOverScreen } from "@/components/table/GameOverScreen";
import { LobbyScreen } from "@/components/lobby/LobbyScreen";
import { TableScreen } from "@/components/table/TableScreen";
import { isConvexConfigured } from "@/app/ConvexClientProvider";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { convexMessage } from "@/lib/errors";
import type { Action } from "@/lib/poker";
import { loadName, loadPlayerId, saveName, savePlayerId } from "@/lib/session";
import { tableFromSnap } from "@/lib/snapshot";
import { useBrowserValue } from "@/lib/useBrowserValue";

export function RoomClient({ code }: { code: string }) {
  const searchParams = useSearchParams();
  const urlPlayerId = searchParams.get("p");
  const storedPlayerId = useBrowserValue(() => loadPlayerId(code), null);
  const [joined, setJoined] = useState<{ code: string; id: string } | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);
  const playerId =
    (joined?.code === code ? joined.id : null) ??
    urlPlayerId ??
    storedPlayerId;

  useEffect(() => {
    if (urlPlayerId) savePlayerId(code, urlPlayerId);
  }, [code, urlPlayerId]);

  if (!isConvexConfigured) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-3 px-6 text-center felt-bg">
        <p>Run npx convex dev so this room can sync.</p>
        <Link href="/" className="text-gold underline">
          Home
        </Link>
      </div>
    );
  }

  return (
    <ReadyRoom
      code={code}
      playerId={playerId}
      onJoined={(id) => setJoined({ code, id })}
      error={error}
      setError={setError}
    />
  );
}

function ReadyRoom({
  code,
  playerId,
  onJoined,
  error,
  setError,
}: {
  code: string;
  playerId: string | null;
  onJoined: (id: string) => void;
  error: string | null;
  setError: (m: string | null) => void;
}) {
  const data = useQuery(api.rooms.getByCode, {
    code,
    playerId: playerId ? (playerId as Id<"players">) : undefined,
  });
  const join = useMutation(api.rooms.join);
  const kick = useMutation(api.rooms.kick);
  const addLocalPlayer = useMutation(api.rooms.addLocalPlayer);
  const endGame = useMutation(api.rooms.endGame);
  const start = useMutation(api.game.start);
  const act = useMutation(api.game.act);
  const dealStreet = useMutation(api.game.dealStreet);
  const award = useMutation(api.game.award);
  const acknowledge = useMutation(api.game.acknowledge);

  const storedName = useBrowserValue(loadName, "");
  const [joinName, setJoinName] = useState<string | null>(null);
  const nameValue = joinName ?? storedName;

  const table = useMemo(() => {
    if (!data?.room || data.room.status !== "playing" || !data.room.street) {
      return null;
    }
    return tableFromSnap(data.room, data.players);
  }, [data]);

  async function run(fn: () => Promise<unknown>) {
    setError(null);
    try {
      await fn();
    } catch (e) {
      setError(convexMessage(e));
    }
  }

  async function confirmEnd() {
    if (!window.confirm("End this game?")) return;
    if (!data?.room || !data.you) return;
    await run(() =>
      endGame({ roomId: data.room._id, playerId: data.you!._id }),
    );
  }

  if (data === undefined) {
    return <div className="min-h-dvh felt-bg" />;
  }

  if (data === null) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-3 px-6 text-center felt-bg">
        <p className="text-xl font-semibold">No room {code}</p>
        <Link href="/" className="text-gold underline">
          Create or join another
        </Link>
      </div>
    );
  }

  const { room, players, you } = data;

  if (room.status === "ended") {
    return <GameOverScreen players={players} buyIn={room.buyIn} />;
  }

  if (!you) {
    if (room.mode === "pass") {
      return (
        <div className="flex min-h-dvh flex-col items-center justify-center gap-3 px-6 text-center felt-bg">
          <p className="text-xl font-semibold">This game is on one phone</p>
          <p className="text-felt-muted">
            Pass-and-play doesn&apos;t use a room code. Create it from this device.
          </p>
          <Link href="/" className="text-gold underline">
            Start a game
          </Link>
        </div>
      );
    }
    return (
      <div className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-5 felt-bg">
        <ErrorBanner message={error} onDismiss={() => setError(null)} />
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-gold">
          Room {code}
        </p>
        <h1 className="mt-2 text-3xl font-bold">Take a seat</h1>
        <label className="mt-6 text-xs font-semibold uppercase tracking-wider text-felt-muted">
          Your name
          <input
            value={nameValue}
            onChange={(e) => setJoinName(e.target.value)}
            className="mt-1 w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-base text-cream outline-none focus:border-gold"
            maxLength={16}
            placeholder="Alex"
          />
        </label>
        {nameValue.trim().length < 1 && (
          <p className="mt-2 text-sm text-felt-muted">Enter your name to sit down</p>
        )}
        <FeltButton
          className="mt-6 min-h-14 w-full"
          disabled={nameValue.trim().length < 1}
          onClick={() =>
            run(async () => {
              saveName(nameValue);
              const result = await join({
                code,
                name: nameValue,
                playerId: playerId ? (playerId as Id<"players">) : undefined,
              });
              savePlayerId(result.code, result.playerId);
              onJoined(result.playerId);
            })
          }
        >
          Sit down
        </FeltButton>
      </div>
    );
  }

  if (room.status === "lobby") {
    return (
      <>
        <ErrorBanner message={error} onDismiss={() => setError(null)} />
        <LobbyScreen
          code={room.code}
          mode={room.mode}
          players={players}
          hostId={room.hostId}
          youId={you._id}
          onStart={() =>
            run(() => start({ roomId: room._id, playerId: you._id }))
          }
            onKick={(id) =>
              run(() =>
                kick({
                  roomId: room._id,
                  hostId: you._id,
                  targetId: id as Id<"players">,
                }),
              )
            }
            onAddPlayer={
              room.mode === "pass"
                ? (name) =>
                    run(() =>
                      addLocalPlayer({
                        roomId: room._id,
                        hostId: you._id,
                        name,
                      }),
                    )
                : undefined
            }
            onEndGame={confirmEnd}
        />
      </>
    );
  }

  if (!table) {
    return <div className="min-h-dvh felt-bg" />;
  }

  const needsPass =
    room.mode === "pass" &&
    !!room.toAct &&
    room.acknowledgedActor !== room.toAct &&
    !room.handComplete &&
    !room.awaitingStreetAdvance &&
    room.street !== "showdown";

  const passPlayer = players.find((p) => p._id === room.toAct);

  return (
    <>
      <ErrorBanner message={error} onDismiss={() => setError(null)} />
      <TableScreen
        table={table}
        you={table.players.find((p) => p.id === you._id)}
        isHost={room.hostId === you._id}
        mode={room.mode}
        cardMode={room.cardMode ?? "physical"}
        needsPass={needsPass}
        passName={passPlayer?.name ?? null}
        onAct={(action: Action) =>
          run(() =>
            act({
              roomId: room._id,
              playerId: you._id,
              action,
            }),
          )
        }
        onDeal={() =>
          run(() => dealStreet({ roomId: room._id, playerId: you._id }))
        }
        onAward={(winnerIds) =>
          run(() =>
            award({
              roomId: room._id,
              playerId: you._id,
              winnerIds: winnerIds as Id<"players">[],
            }),
          )
        }
        onNextHand={() =>
          run(() => start({ roomId: room._id, playerId: you._id }))
        }
        onAcknowledge={() =>
          run(() =>
            acknowledge({ roomId: room._id, playerId: you._id }),
          )
        }
        onEndGame={confirmEnd}
      />
    </>
  );
}
