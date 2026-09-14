import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export const modeValidator = v.union(v.literal("multi"), v.literal("pass"));
export const cardModeValidator = v.union(
  v.literal("physical"),
  v.literal("digital"),
);
export const statusValidator = v.union(
  v.literal("lobby"),
  v.literal("playing"),
  v.literal("ended"),
);
export const streetValidator = v.union(
  v.literal("preflop"),
  v.literal("flop"),
  v.literal("turn"),
  v.literal("river"),
  v.literal("showdown"),
);

export default defineSchema({
  rooms: defineTable({
    code: v.string(),
    mode: modeValidator,
    cardMode: v.optional(cardModeValidator),
    status: statusValidator,
    buyIn: v.number(),
    smallBlind: v.number(),
    bigBlind: v.number(),
    maxSeats: v.number(),
    dealerSeat: v.number(),
    street: v.union(streetValidator, v.null()),
    pot: v.number(),
    currentBet: v.number(),
    lastFullRaiseSize: v.number(),
    toAct: v.union(v.id("players"), v.null()),
    hostId: v.optional(v.id("players")),
    handNumber: v.number(),
    awaitingStreetAdvance: v.boolean(),
    acknowledgedActor: v.union(v.id("players"), v.null()),
    lastActivityAt: v.number(),
    handComplete: v.boolean(),
    winners: v.array(v.string()),
    board: v.optional(v.array(v.string())),
    deck: v.optional(v.array(v.string())),
  }).index("by_code", ["code"]),

  players: defineTable({
    roomId: v.id("rooms"),
    name: v.string(),
    stack: v.number(),
    seat: v.number(),
    folded: v.boolean(),
    betThisStreet: v.number(),
    totalBetThisHand: v.number(),
    isAllIn: v.boolean(),
    hasActedThisStreet: v.boolean(),
    raiseAllowed: v.boolean(),
    sittingOut: v.boolean(),
    holeCards: v.optional(v.array(v.string())),
    isBot: v.optional(v.boolean()),
  }).index("by_room", ["roomId"]),
});
