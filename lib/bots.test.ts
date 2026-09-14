import { describe, expect, it } from "vitest";
import { chooseBotAction, runBotTurns, soloBotNames } from "./bots";
import {
  applyAction,
  startHand,
  type PlayerState,
  type TableState,
} from "./poker";

function p(
  id: string,
  seat: number,
  stack = 2000,
  extra: Partial<PlayerState> = {},
): PlayerState {
  return {
    id,
    name: id,
    seat,
    stack,
    folded: false,
    betThisStreet: 0,
    totalBetThisHand: 0,
    isAllIn: false,
    hasActedThisStreet: false,
    raiseAllowed: true,
    sittingOut: false,
    holeCards: [],
    ...extra,
  };
}

function digitalTable(players: PlayerState[]): TableState {
  return {
    players,
    game: {
      dealerSeat: 0,
      street: "preflop",
      pot: 0,
      currentBet: 0,
      lastFullRaiseSize: 50,
      smallBlind: 25,
      bigBlind: 50,
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

describe("solo bots", () => {
  it("provides three bot names", () => {
    expect(soloBotNames()).toHaveLength(3);
  });

  it("returns a legal action for the actor", () => {
    let t = startHand(
      digitalTable([p("you", 0), p("b1", 1), p("b2", 2), p("b3", 3)]),
    );
    const actor = t.game.toAct!;
    const action = chooseBotAction(t, actor);
    expect(["fold", "check", "call", "raiseTo"]).toContain(action.type);
    t = applyAction(t, actor, action);
    expect(t.game.toAct === actor).toBe(false);
  });

  it("runs bots until a human must act or the hand ends", () => {
    let t = startHand(
      digitalTable([p("you", 0), p("b1", 1), p("b2", 2), p("b3", 3)]),
    );
    const bots = new Set(["b1", "b2", "b3"]);
    t = runBotTurns(t, bots, applyAction);
    expect(
      t.game.handComplete ||
        t.game.toAct === "you" ||
        t.game.toAct === null,
    ).toBe(true);
    if (t.game.toAct) {
      expect(bots.has(t.game.toAct)).toBe(false);
    }
  });
});
