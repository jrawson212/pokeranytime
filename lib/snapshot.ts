import type { CardMode, TableState } from "./poker";
import type { Card } from "./cards";

export type RoomSnap = {
  dealerSeat: number;
  street: "preflop" | "flop" | "turn" | "river" | "showdown" | null;
  pot: number;
  currentBet: number;
  lastFullRaiseSize: number;
  smallBlind: number;
  bigBlind: number;
  toAct: string | null;
  awaitingStreetAdvance: boolean;
  handNumber: number;
  handComplete: boolean;
  winners?: string[];
  cardMode?: CardMode;
  board?: Card[];
  deck?: Card[];
};

export type PlayerSnap = {
  _id: string;
  name: string;
  seat: number;
  stack: number;
  folded: boolean;
  betThisStreet: number;
  totalBetThisHand: number;
  isAllIn: boolean;
  hasActedThisStreet: boolean;
  raiseAllowed: boolean;
  sittingOut: boolean;
  holeCards?: Card[];
};

export function tableFromSnap(
  room: RoomSnap,
  players: PlayerSnap[],
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
      winners: room.winners?.length ? room.winners : null,
      cardMode: room.cardMode ?? "physical",
      board: room.board ?? [],
      deck: [],
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
