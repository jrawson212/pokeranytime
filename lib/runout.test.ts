import { describe, expect, it } from "vitest";
import { advanceStreet, type PlayerState, type TableState } from "./poker";

function p(
  id: string,
  seat: number,
  extra: Partial<PlayerState> = {},
): PlayerState {
  return {
    id,
    name: id,
    seat,
    stack: 0,
    folded: false,
    betThisStreet: 0,
    totalBetThisHand: 50,
    isAllIn: true,
    hasActedThisStreet: true,
    raiseAllowed: true,
    sittingOut: false,
    holeCards: [],
    ...extra,
  };
}

describe("all-in runout", () => {
  it("walks flop, turn, and river before showdown", () => {
    let t: TableState = {
      players: [p("a", 0), p("b", 1)],
      game: {
        dealerSeat: 0,
        street: "preflop",
        pot: 100,
        currentBet: 0,
        lastFullRaiseSize: 20,
        smallBlind: 10,
        bigBlind: 20,
        toAct: null,
        awaitingStreetAdvance: true,
        handNumber: 1,
        handComplete: false,
        winners: null,
        cardMode: "physical",
        board: [],
        deck: [],
      },
    };
    t = advanceStreet(t);
    expect(t.game.street).toBe("flop");
    expect(t.game.awaitingStreetAdvance).toBe(true);
    t = advanceStreet(t);
    expect(t.game.street).toBe("turn");
    t = advanceStreet(t);
    expect(t.game.street).toBe("river");
    expect(t.game.awaitingStreetAdvance).toBe(true);
    t = advanceStreet(t);
    expect(t.game.street).toBe("showdown");
  });
});
