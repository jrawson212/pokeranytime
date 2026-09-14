import { ConvexError, v } from "convex/values";
import {
  isChipAmount,
  MIN_BUY_IN_CENTS,
  MIN_SMALL_BLIND_CENTS,
} from "../lib/chips";
import { applyAction, MAX_PLAYERS, MIN_PLAYERS, startHand } from "../lib/poker";
import { runBotTurns, soloBotNames } from "../lib/bots";
import { randomRoomCode } from "../lib/roomCode";
import type { Id } from "./_generated/dataModel";
import { internalMutation, mutation, query } from "./_generated/server";
import { persistTable, toTable } from "./table";

const TWELVE_HOURS = 12 * 60 * 60 * 1000;

function normalizeName(name: string) {
  const trimmed = name.trim().slice(0, 16);
  if (trimmed.length < 1) throw new ConvexError("Enter a name");
  return trimmed;
}

function normalizeCode(code: string) {
  return code.trim().toUpperCase();
}

function validateSettings(args: {
  buyIn: number;
  smallBlind: number;
  bigBlind: number;
  maxSeats: number;
}) {
  if (!Number.isInteger(args.buyIn) || args.buyIn < MIN_BUY_IN_CENTS || !isChipAmount(args.buyIn)) {
    throw new ConvexError("Buy-in must be at least $5 in chip amounts");
  }
  if (
    !Number.isInteger(args.smallBlind) ||
    args.smallBlind < MIN_SMALL_BLIND_CENTS ||
    !isChipAmount(args.smallBlind)
  ) {
    throw new ConvexError("Small blind must be at least $0.10 in chip amounts");
  }
  if (args.bigBlind !== args.smallBlind * 2 || !isChipAmount(args.bigBlind)) {
    throw new ConvexError("Big blind must be double the small blind");
  }
  if (args.buyIn < args.bigBlind * 10) {
    throw new ConvexError("Buy-in should be at least 10 big blinds");
  }
  if (
    !Number.isInteger(args.maxSeats) ||
    args.maxSeats < MIN_PLAYERS ||
    args.maxSeats > MAX_PLAYERS
  ) {
    throw new ConvexError(
      `Max players must be between ${MIN_PLAYERS} and ${MAX_PLAYERS}`,
    );
  }
}

export const getByCode = query({
  args: {
    code: v.string(),
    playerId: v.optional(v.id("players")),
  },
  handler: async (ctx, args) => {
    const code = normalizeCode(args.code);
    const room = await ctx.db
      .query("rooms")
      .withIndex("by_code", (q) => q.eq("code", code))
      .unique();
    if (!room) return null;

    const players = (
      await ctx.db
        .query("players")
        .withIndex("by_room", (q) => q.eq("roomId", room._id))
        .collect()
    ).sort((a, b) => a.seat - b.seat);

    const you = args.playerId
      ? (players.find((p) => p._id === args.playerId) ?? null)
      : null;

    const cardMode = room.cardMode ?? "physical";
    const revealAll =
      cardMode === "digital" &&
      (room.handComplete || room.street === "showdown");

    const publicPlayers = players.map((p) => {
      const showHoles =
        cardMode === "digital" &&
        (revealAll ||
          (args.playerId && p._id === args.playerId) ||
          (room.mode === "pass" &&
            room.acknowledgedActor === room.toAct &&
            room.toAct === p._id));
      return {
        ...p,
        holeCards: showHoles ? (p.holeCards ?? []) : [],
      };
    });

    const { deck: _deck, ...roomPublic } = room;
    return {
      room: {
        ...roomPublic,
        cardMode,
        board: cardMode === "digital" ? (room.board ?? []) : [],
        deck: [],
      },
      players: publicPlayers,
      you: you
        ? publicPlayers.find((p) => p._id === you._id) ?? null
        : null,
    };
  },
});

function playerDoc(
  roomId: Id<"rooms">,
  name: string,
  seat: number,
  buyIn: number,
  isBot = false,
) {
  return {
    roomId,
    name,
    stack: buyIn,
    seat,
    folded: false,
    betThisStreet: 0,
    totalBetThisHand: 0,
    isAllIn: false,
    hasActedThisStreet: false,
    raiseAllowed: true,
    sittingOut: false,
    holeCards: [] as string[],
    ...(isBot ? { isBot: true } : {}),
  };
}

export const create = mutation({
  args: {
    name: v.string(),
    mode: v.union(v.literal("multi"), v.literal("pass")),
    cardMode: v.optional(
      v.union(v.literal("physical"), v.literal("digital")),
    ),
    buyIn: v.number(),
    smallBlind: v.number(),
    bigBlind: v.number(),
    maxSeats: v.number(),
    playerNames: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const name = normalizeName(args.name);
    const cardMode = args.cardMode ?? "physical";
    let extras =
      args.mode === "pass"
        ? (args.playerNames ?? [])
            .map((n) => n.trim())
            .filter((n) => n.length > 0)
            .map(normalizeName)
        : [];

    const soloDigital =
      args.mode === "pass" && cardMode === "digital" && extras.length === 0;
    const botExtras = soloDigital ? soloBotNames().map(normalizeName) : [];
    if (soloDigital) {
      extras = botExtras;
    }

    if (args.mode === "pass" && extras.length < 1) {
      throw new ConvexError("Add at least one other player");
    }

    const seatCount =
      args.mode === "pass" ? 1 + extras.length : args.maxSeats;
    validateSettings({ ...args, maxSeats: seatCount });

    let code = randomRoomCode();
    for (let i = 0; i < 8; i++) {
      const existing = await ctx.db
        .query("rooms")
        .withIndex("by_code", (q) => q.eq("code", code))
        .unique();
      if (!existing) break;
      code = randomRoomCode();
    }

    const now = Date.now();
    const roomId = await ctx.db.insert("rooms", {
      code,
      mode: args.mode,
      cardMode,
      status: "lobby",
      buyIn: args.buyIn,
      smallBlind: args.smallBlind,
      bigBlind: args.bigBlind,
      maxSeats: seatCount,
      dealerSeat: 0,
      street: null,
      pot: 0,
      currentBet: 0,
      lastFullRaiseSize: args.bigBlind,
      toAct: null,
      handNumber: 0,
      awaitingStreetAdvance: false,
      acknowledgedActor: null,
      lastActivityAt: now,
      handComplete: false,
      winners: [],
      board: [],
      deck: [],
    });

    const playerId = await ctx.db.insert(
      "players",
      playerDoc(roomId, name, 0, args.buyIn),
    );

    for (let i = 0; i < extras.length; i++) {
      await ctx.db.insert(
        "players",
        playerDoc(roomId, extras[i]!, i + 1, args.buyIn, soloDigital),
      );
    }

    await ctx.db.patch(roomId, { hostId: playerId });

    if (args.mode === "pass") {
      const room = await ctx.db.get(roomId);
      if (!room) throw new ConvexError("Room not found");
      const players = await ctx.db
        .query("players")
        .withIndex("by_room", (q) => q.eq("roomId", roomId))
        .collect();
      let next = startHand(toTable(room, players));
      if (soloDigital) {
        const botIds = new Set(
          players.filter((p) => p.isBot).map((p) => p._id as string),
        );
        next = runBotTurns(next, botIds, applyAction);
      }
      await persistTable(ctx, room, next);
      const humanOnly = players.filter((p) => !p.isBot).length <= 1;
      await ctx.db.patch(roomId, {
        acknowledgedActor:
          humanOnly && next.game.toAct
            ? (next.game.toAct as Id<"players">)
            : null,
      });
    }

    return { code, playerId, roomId };
  },
});

export const join = mutation({
  args: {
    code: v.string(),
    name: v.string(),
    playerId: v.optional(v.id("players")),
  },
  handler: async (ctx, args) => {
    const code = normalizeCode(args.code);
    const room = await ctx.db
      .query("rooms")
      .withIndex("by_code", (q) => q.eq("code", code))
      .unique();
    if (!room) throw new ConvexError("No room with that code");

    if (args.playerId) {
      const existing = await ctx.db.get(args.playerId);
      if (existing && existing.roomId === room._id) {
        await ctx.db.patch(room._id, { lastActivityAt: Date.now() });
        return { code, playerId: existing._id, roomId: room._id };
      }
    }

    if (room.mode === "pass") {
      throw new ConvexError("This game is pass-and-play on one phone");
    }

    if (room.status === "ended") {
      throw new ConvexError("This game is over");
    }

    const players = await ctx.db
      .query("players")
      .withIndex("by_room", (q) => q.eq("roomId", room._id))
      .collect();

    if (players.length >= room.maxSeats) {
      throw new ConvexError("This room is full");
    }

    const name = normalizeName(args.name);
    const nextSeat =
      players.reduce((max, p) => Math.max(max, p.seat), -1) + 1;
    const inProgress = room.status === "playing" && !room.handComplete;

    const playerId = await ctx.db.insert("players", {
      roomId: room._id,
      name,
      stack: room.buyIn,
      seat: nextSeat,
      folded: inProgress,
      betThisStreet: 0,
      totalBetThisHand: 0,
      isAllIn: false,
      hasActedThisStreet: false,
      raiseAllowed: true,
      sittingOut: inProgress,
      holeCards: [],
    });

    await ctx.db.patch(room._id, { lastActivityAt: Date.now() });
    return { code, playerId, roomId: room._id };
  },
});

export const kick = mutation({
  args: {
    roomId: v.id("rooms"),
    hostId: v.id("players"),
    targetId: v.id("players"),
  },
  handler: async (ctx, args) => {
    const room = await ctx.db.get(args.roomId);
    if (!room) throw new ConvexError("Room not found");
    if (room.hostId !== args.hostId) throw new ConvexError("Only the host can kick");
    if (args.targetId === args.hostId) throw new ConvexError("You cannot kick yourself");
    if (room.status === "playing" && !room.handComplete) {
      throw new ConvexError("Wait until the hand is over");
    }
    const target = await ctx.db.get(args.targetId);
    if (!target || target.roomId !== room._id) {
      throw new ConvexError("Player not in this room");
    }
    await ctx.db.delete(args.targetId);
    await ctx.db.patch(room._id, { lastActivityAt: Date.now() });
  },
});

export const addLocalPlayer = mutation({
  args: {
    roomId: v.id("rooms"),
    hostId: v.id("players"),
    name: v.string(),
  },
  handler: async (ctx, args) => {
    const room = await ctx.db.get(args.roomId);
    if (!room) throw new ConvexError("Room not found");
    if (room.mode !== "pass") {
      throw new ConvexError("Add players from their own phones");
    }
    if (room.hostId !== args.hostId) {
      throw new ConvexError("Only the host can add players");
    }
    if (room.status === "playing" && !room.handComplete) {
      throw new ConvexError("Wait until the hand is over");
    }

    const players = await ctx.db
      .query("players")
      .withIndex("by_room", (q) => q.eq("roomId", room._id))
      .collect();
    if (players.length >= MAX_PLAYERS) {
      throw new ConvexError("This game is full");
    }

    const nextSeat =
      players.reduce((max, p) => Math.max(max, p.seat), -1) + 1;
    await ctx.db.insert(
      "players",
      playerDoc(room._id, normalizeName(args.name), nextSeat, room.buyIn),
    );
    await ctx.db.patch(room._id, {
      maxSeats: Math.max(room.maxSeats, nextSeat + 1),
      lastActivityAt: Date.now(),
    });
  },
});

export const endGame = mutation({
  args: {
    roomId: v.id("rooms"),
    playerId: v.id("players"),
  },
  handler: async (ctx, args) => {
    const room = await ctx.db.get(args.roomId);
    if (!room) throw new ConvexError("Room not found");
    if (room.hostId !== args.playerId) {
      throw new ConvexError("Only the host can end the game");
    }
    if (room.status === "ended") return;

    const players = await ctx.db
      .query("players")
      .withIndex("by_room", (q) => q.eq("roomId", room._id))
      .collect();

    for (const p of players) {
      if (p.betThisStreet > 0) {
        await ctx.db.patch(p._id, {
          stack: p.stack + p.betThisStreet,
          betThisStreet: 0,
        });
      }
    }

    await ctx.db.patch(room._id, {
      status: "ended",
      toAct: null,
      awaitingStreetAdvance: false,
      acknowledgedActor: null,
      lastActivityAt: Date.now(),
    });
  },
});

export const expireOld = internalMutation({
  args: {},
  handler: async (ctx) => {
    const cutoff = Date.now() - TWELVE_HOURS;
    const rooms = await ctx.db.query("rooms").collect();
    for (const room of rooms) {
      if (room.lastActivityAt >= cutoff) continue;
      const players = await ctx.db
        .query("players")
        .withIndex("by_room", (q) => q.eq("roomId", room._id))
        .collect();
      for (const p of players) await ctx.db.delete(p._id);
      await ctx.db.delete(room._id);
    }
  },
});
