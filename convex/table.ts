import { ConvexError } from "convex/values";
import type { Doc } from "./_generated/dataModel";
import type { MutationCtx } from "./_generated/server";
import type { CardMode, TableState } from "../lib/poker";

export function toTable(
  room: Doc<"rooms">,
  players: Doc<"players">[],
): TableState {
  return {
    game: {
      dealerSeat: room.dealerSeat,
      street: room.street ?? "preflop",
      pot: room.pot,
      currentBet: room.currentBet,
      lastFullRaiseSize: room.lastFullRaiseSize,
      smallBlind: room.smallBlind,
      bigBlind: room.bigBlind,
      toAct: room.toAct,
      awaitingStreetAdvance: room.awaitingStreetAdvance,
      handNumber: room.handNumber,
      handComplete: room.handComplete,
      winners: room.winners.length ? room.winners : null,
      cardMode: (room.cardMode ?? "physical") as CardMode,
      board: room.board ?? [],
      deck: room.deck ?? [],
    },
    players: players.map((p) => ({
      id: p._id,
      name: p.name,
      seat: p.seat,
      stack: p.stack,
      folded: p.folded,
      betThisStreet: p.betThisStreet,
      totalBetThisHand: p.totalBetThisHand,
      isAllIn: p.isAllIn,
      hasActedThisStreet: p.hasActedThisStreet,
      raiseAllowed: p.raiseAllowed,
      sittingOut: p.sittingOut,
      holeCards: p.holeCards ?? [],
    })),
  };
}

export async function persistTable(
  ctx: MutationCtx,
  room: Doc<"rooms">,
  table: TableState,
): Promise<void> {
  await ctx.db.patch(room._id, {
    dealerSeat: table.game.dealerSeat,
    street: table.game.street,
    pot: table.game.pot,
    currentBet: table.game.currentBet,
    lastFullRaiseSize: table.game.lastFullRaiseSize,
    toAct: table.game.toAct as Doc<"rooms">["toAct"],
    awaitingStreetAdvance: table.game.awaitingStreetAdvance,
    handNumber: table.game.handNumber,
    handComplete: table.game.handComplete,
    winners: table.game.winners ?? [],
    board: table.game.board,
    deck: table.game.deck,
    cardMode: table.game.cardMode,
    lastActivityAt: Date.now(),
    status: "playing",
  });

  for (const p of table.players) {
    await ctx.db.patch(p.id as Doc<"players">["_id"], {
      stack: p.stack,
      folded: p.folded,
      betThisStreet: p.betThisStreet,
      totalBetThisHand: p.totalBetThisHand,
      isAllIn: p.isAllIn,
      hasActedThisStreet: p.hasActedThisStreet,
      raiseAllowed: p.raiseAllowed,
      sittingOut: p.sittingOut,
      holeCards: p.holeCards,
    });
  }
}

export function requireHost(room: Doc<"rooms">, playerId: string) {
  if (room.hostId !== playerId) {
    throw new ConvexError("Only the host can do that");
  }
}
