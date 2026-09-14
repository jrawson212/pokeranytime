import { ConvexError, v } from "convex/values";
import {
  advanceStreet,
  applyAction,
  awardPots,
  PokerError,
  startHand,
  type Action,
} from "../lib/poker";
import { runBotTurns } from "../lib/bots";
import { mutation } from "./_generated/server";
import { persistTable, requireHost, toTable } from "./table";
import type { Doc, Id } from "./_generated/dataModel";
import type { MutationCtx } from "./_generated/server";

function asPokerError(e: unknown): never {
  if (e instanceof ConvexError) throw e;
  if (e instanceof PokerError) throw new ConvexError(e.message);
  if (e instanceof Error) throw new ConvexError(e.message);
  throw new ConvexError("Something went wrong");
}

async function finishWithBots(
  ctx: MutationCtx,
  room: Doc<"rooms">,
  players: Doc<"players">[],
  table: ReturnType<typeof toTable>,
) {
  const botIds = new Set(
    players.filter((p) => p.isBot).map((p) => p._id as string),
  );
  const next =
    botIds.size > 0 ? runBotTurns(table, botIds, applyAction) : table;
  await persistTable(ctx, room, next);
  const humans = players.filter((p) => !p.isBot);
  await ctx.db.patch(room._id, {
    acknowledgedActor:
      humans.length <= 1 && next.game.toAct
        ? (next.game.toAct as Id<"players">)
        : room.mode === "pass"
          ? null
          : (next.game.toAct as Id<"players"> | null),
  });
}

export const start = mutation({
  args: {
    roomId: v.id("rooms"),
    playerId: v.id("players"),
  },
  handler: async (ctx, args) => {
    try {
      const room = await ctx.db.get(args.roomId);
      if (!room) throw new ConvexError("Room not found");
      requireHost(room, args.playerId);

      if (room.status === "ended") {
        throw new ConvexError("This game is over");
      }
      if (room.status === "playing" && !room.handComplete) {
        throw new ConvexError("A hand is already in progress");
      }

      const players = await ctx.db
        .query("players")
        .withIndex("by_room", (q) => q.eq("roomId", room._id))
        .collect();

      const withChips = players.filter((p) => p.stack > 0);
      if (withChips.length < 2) {
        throw new ConvexError("Need at least 2 players with chips");
      }

      const table = toTable(room, players);
      const started = startHand(table);
      await finishWithBots(ctx, room, players, started);
    } catch (e) {
      asPokerError(e);
    }
  },
});

export const act = mutation({
  args: {
    roomId: v.id("rooms"),
    playerId: v.id("players"),
    action: v.union(
      v.object({ type: v.literal("fold") }),
      v.object({ type: v.literal("check") }),
      v.object({ type: v.literal("call") }),
      v.object({
        type: v.literal("raiseTo"),
        amount: v.number(),
      }),
    ),
  },
  handler: async (ctx, args) => {
    try {
      const room = await ctx.db.get(args.roomId);
      if (!room) throw new ConvexError("Room not found");
      if (room.status !== "playing") throw new ConvexError("Game has not started");

      if (room.mode === "pass") {
        requireHost(room, args.playerId);
      }

      const actorId =
        room.mode === "pass"
          ? room.toAct
          : args.playerId;
      if (!actorId) throw new ConvexError("Not your turn");

      const players = await ctx.db
        .query("players")
        .withIndex("by_room", (q) => q.eq("roomId", room._id))
        .collect();

      const actor = players.find((p) => p._id === actorId);
      if (actor?.isBot) {
        throw new ConvexError("Waiting for automatic players");
      }

      if (room.mode !== "pass" && actorId !== args.playerId) {
        throw new ConvexError("Not your turn");
      }

      const table = toTable(room, players);
      const afterHuman = applyAction(table, actorId, args.action as Action);
      await finishWithBots(ctx, room, players, afterHuman);
    } catch (e) {
      asPokerError(e);
    }
  },
});

export const dealStreet = mutation({
  args: {
    roomId: v.id("rooms"),
    playerId: v.id("players"),
  },
  handler: async (ctx, args) => {
    try {
      const room = await ctx.db.get(args.roomId);
      if (!room) throw new ConvexError("Room not found");
      if (room.status !== "playing") throw new ConvexError("Game has not started");
      requireHost(room, args.playerId);

      const players = await ctx.db
        .query("players")
        .withIndex("by_room", (q) => q.eq("roomId", room._id))
        .collect();

      const next = advanceStreet(toTable(room, players));
      await persistTable(ctx, room, next);
      await ctx.db.patch(room._id, { acknowledgedActor: null });
    } catch (e) {
      asPokerError(e);
    }
  },
});

export const award = mutation({
  args: {
    roomId: v.id("rooms"),
    playerId: v.id("players"),
    winnerIds: v.array(v.id("players")),
  },
  handler: async (ctx, args) => {
    try {
      const room = await ctx.db.get(args.roomId);
      if (!room) throw new ConvexError("Room not found");
      if (room.status !== "playing") throw new ConvexError("Game has not started");
      requireHost(room, args.playerId);

      const players = await ctx.db
        .query("players")
        .withIndex("by_room", (q) => q.eq("roomId", room._id))
        .collect();

      const next = awardPots(
        toTable(room, players),
        args.winnerIds.map((id) => id as string),
      );
      await persistTable(ctx, room, next);
    } catch (e) {
      asPokerError(e);
    }
  },
});

export const acknowledge = mutation({
  args: {
    roomId: v.id("rooms"),
    playerId: v.id("players"),
  },
  handler: async (ctx, args) => {
    const room = await ctx.db.get(args.roomId);
    if (!room) throw new ConvexError("Room not found");
    if (room.status !== "playing") throw new ConvexError("Game has not started");
    if (room.mode === "pass") {
      requireHost(room, args.playerId);
      if (!room.toAct) throw new ConvexError("Nobody to pass to");
      await ctx.db.patch(room._id, {
        acknowledgedActor: room.toAct,
        lastActivityAt: Date.now(),
      });
      return;
    }
    if (room.toAct !== args.playerId) {
      throw new ConvexError("Wait until it is your turn");
    }
    await ctx.db.patch(room._id, {
      acknowledgedActor: args.playerId,
      lastActivityAt: Date.now(),
    });
  },
});
