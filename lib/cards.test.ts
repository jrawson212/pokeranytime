import { describe, expect, it } from "vitest";
import {
  bestHoldemHand,
  compareHands,
  evaluateBestHand,
  freshDeck,
  shuffleDeck,
} from "./cards";
import { applyAction, startHand, type PlayerState, type TableState } from "./poker";

describe("hand ranks", () => {
  it("ranks a flush over a straight", () => {
    const flush = evaluateBestHand(["Ah", "Kh", "9h", "4h", "2h"]);
    const straight = evaluateBestHand(["9c", "8d", "7h", "6s", "5c"]);
    expect(compareHands(flush, straight)).toBeGreaterThan(0);
  });

  it("detects a wheel straight", () => {
    const wheel = evaluateBestHand(["Ah", "2c", "3d", "4s", "5h"]);
    expect(wheel.category).toBe(4);
    expect(wheel.values[0]).toBe(5);
  });

  it("picks the best five from seven", () => {
    const hand = bestHoldemHand(["As", "Ad"], ["Ah", "Kc", "Kd", "2s", "3h"]);
    expect(hand.category).toBe(6); // full house
  });
});

describe("digital dealing", () => {
  function p(id: string, seat: number): PlayerState {
    return {
      id,
      name: id,
      seat,
      stack: 1000,
      folded: false,
      betThisStreet: 0,
      totalBetThisHand: 0,
      isAllIn: false,
      hasActedThisStreet: false,
      raiseAllowed: true,
      sittingOut: false,
      holeCards: [],
    };
  }

  function digitalTable(): TableState {
    return {
      players: [p("d", 0), p("sb", 1), p("bb", 2)],
      game: {
        dealerSeat: 0,
        street: "preflop",
        pot: 0,
        currentBet: 0,
        lastFullRaiseSize: 20,
        smallBlind: 10,
        bigBlind: 20,
        toAct: null,
        awaitingStreetAdvance: false,
        handNumber: 0,
        handComplete: false,
        winners: null,
        cardMode: "digital",
        board: [],
        deck: [],
      },
    };
  }

  it("deals hole cards and auto-runs the flop after preflop", () => {
    let t = startHand(digitalTable());
    expect(t.players.every((x) => x.holeCards.length === 2)).toBe(true);
    expect(t.game.deck.length).toBe(52 - 6);
    t = applyAction(t, "d", { type: "call" });
    t = applyAction(t, "sb", { type: "call" });
    t = applyAction(t, "bb", { type: "check" });
    expect(t.game.street).toBe("flop");
    expect(t.game.board).toHaveLength(3);
    expect(t.game.awaitingStreetAdvance).toBe(false);
    expect(t.game.toAct).toBe("sb");
  });

  it("shuffles a full deck", () => {
    expect(shuffleDeck(freshDeck())).toHaveLength(52);
  });
});
