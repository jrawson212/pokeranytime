import { ConvexError, v } from "convex/values";
import {
  advanceStreet,
  applyAction,
  awardPots,
  PokerError,
  startHand,
  type Action,
} from "../lib/poker";
import { mutation } from "./_generated/server";
import { persistTable, requireHost, toTable } from "./table";
import type { Id } from "./_generated/dataModel";

function asPokerError(e: unknown): never {
  if (e instanceof ConvexError) throw e;
  if (e instanceof PokerError) throw new ConvexError(e.message);
  if (e instanceof Error) throw new ConvexError(e.message);
  throw new ConvexError("Something went wrong");
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
      const next = startHand(table);
      await persistTable(ctx, room, next);
      await ctx.db.patch(room._id, {
        acknowledgedActor:
          room.mode === "pass"
            ? null
            : (next.game.toAct as Id<"players"> | null),
      });
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

      const table = toTable(room, players);
      const next = applyAction(table, actorId, args.action as Action);
      await persistTable(ctx, room, next);
      await ctx.db.patch(room._id, {
        acknowledgedActor: room.mode === "pass" ? null : args.playerId,
      });
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
