import { describe, expect, it } from "vitest";
import {
  bestHoldemHand,
  compareHands,
  describeHand,
  evaluateBestHand,
  formatShowdownResult,
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

  it("pair of tens beats pocket nines", () => {
    const board = ["Td", "2c", "3h", "7s", "8d"];
    const nines = bestHoldemHand(["9c", "9d"], board);
    const tens = bestHoldemHand(["Th", "As"], board);
    expect(describeHand(nines)).toBe("Pair of nines");
    expect(describeHand(tens)).toBe("Pair of tens");
    expect(compareHands(tens, nines)).toBeGreaterThan(0);
  });

  it("formats split vs single winner", () => {
    expect(formatShowdownResult([{ name: "A" }, { name: "B" }])).toBe(
      "A and B split the pot",
    );
    expect(
      formatShowdownResult([
        { name: "A", hand: bestHoldemHand(["Th", "As"], ["Td", "2c", "3h", "7s", "8d"]) },
      ]),
    ).toMatch(/A wins with Pair of tens/);
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

  it("awards the pot to tens over nines and splits equal boards", () => {
    const headsUp = (
      holes: [string[], string[]],
      board: string[],
    ): TableState => ({
      players: [
        {
          ...p("a", 0),
          holeCards: holes[0],
          hasActedThisStreet: false,
        },
        {
          ...p("b", 1),
          holeCards: holes[1],
          hasActedThisStreet: false,
        },
      ],
      game: {
        dealerSeat: 0,
        street: "river",
        pot: 100,
        currentBet: 0,
        lastFullRaiseSize: 20,
        smallBlind: 10,
        bigBlind: 20,
        toAct: "a",
        awaitingStreetAdvance: false,
        handNumber: 1,
        handComplete: false,
        winners: null,
        cardMode: "digital",
        board,
        deck: [],
      },
    });

    let win = headsUp(
      [
        ["9c", "9d"],
        ["Th", "As"],
      ],
      ["Td", "2c", "3h", "7s", "8d"],
    );
    win = applyAction(win, "a", { type: "check" });
    win = applyAction(win, "b", { type: "check" });
    expect(win.game.handComplete).toBe(true);
    expect(win.game.winners).toEqual(["b"]);
    expect(win.players.find((x) => x.id === "b")!.stack).toBe(1100);

    let chop = headsUp(
      [
        ["9c", "9d"],
        ["Th", "2s"],
      ],
      ["As", "Ad", "Kd", "Kc", "Qc"],
    );
    chop = applyAction(chop, "a", { type: "check" });
    chop = applyAction(chop, "b", { type: "check" });
    expect(chop.game.handComplete).toBe(true);
    expect(chop.game.winners?.slice().sort()).toEqual(["a", "b"]);
    expect(chop.players.find((x) => x.id === "a")!.stack).toBe(1050);
    expect(chop.players.find((x) => x.id === "b")!.stack).toBe(1050);
  });

  it("shuffles a full deck", () => {
    expect(shuffleDeck(freshDeck())).toHaveLength(52);
  });
});
