import { describe, expect, it } from "vitest";
import {
  advanceStreet,
  applyAction,
  awardPots,
  computeSidePots,
  legalActions,
  matchBetLabel,
  minRaiseTo,
  nextDealerSeat,
  positionTags,
  startHand,
  type PlayerState,
  type TableState,
} from "./poker";

function p(
  id: string,
  seat: number,
  stack: number,
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

function table(
  players: PlayerState[],
  extra: Partial<TableState["game"]> = {},
): TableState {
  return {
    players,
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
      cardMode: "physical",
      board: [],
      deck: [],
      ...extra,
    },
  };
}

describe("blinds and first to act", () => {
  it("heads-up: dealer is SB and acts first preflop", () => {
    const started = startHand(table([p("d", 0, 1000), p("bb", 1, 1000)]));
    const dealer = started.players.find((x) => x.id === "d")!;
    const bb = started.players.find((x) => x.id === "bb")!;
    expect(dealer.betThisStreet).toBe(10);
    expect(bb.betThisStreet).toBe(20);
    expect(started.game.toAct).toBe("d");
  });

  it("three-handed: UTG (after BB) acts first", () => {
    const started = startHand(
      table([p("d", 0, 1000), p("sb", 1, 1000), p("bb", 2, 1000)]),
    );
    expect(started.players.find((x) => x.id === "sb")!.betThisStreet).toBe(10);
    expect(started.players.find((x) => x.id === "bb")!.betThisStreet).toBe(20);
    expect(started.game.toAct).toBe("d");
  });
});

describe("position tags and preflop ante label", () => {
  it("marks dealer, SB, and BB in a full ring", () => {
    const players = [p("d", 0, 1000), p("sb", 1, 1000), p("bb", 2, 1000), p("utg", 3, 1000)];
    expect(positionTags(players, 0, "d")).toEqual(["D"]);
    expect(positionTags(players, 0, "sb")).toEqual(["SB"]);
    expect(positionTags(players, 0, "bb")).toEqual(["BB"]);
    expect(positionTags(players, 0, "utg")).toEqual([]);
  });

  it("heads-up dealer is also the small blind", () => {
    const players = [p("d", 0, 1000), p("bb", 1, 1000)];
    expect(positionTags(players, 0, "d")).toEqual(["D", "SB"]);
    expect(positionTags(players, 0, "bb")).toEqual(["BB"]);
  });

  it("calls the preflop match an ante, then call after the flop", () => {
    expect(matchBetLabel("preflop")).toBe("Ante");
    expect(matchBetLabel("flop")).toBe("Call");
    expect(matchBetLabel("turn")).toBe("Call");
  });
});

describe("betting rounds", () => {
  it("check around completes the street", () => {
    let t = startHand(
      table([p("d", 0, 1000), p("sb", 1, 1000), p("bb", 2, 1000)]),
    );
    t = applyAction(t, "d", { type: "call" });
    t = applyAction(t, "sb", { type: "call" });
    t = applyAction(t, "bb", { type: "check" });
    expect(t.game.awaitingStreetAdvance).toBe(true);
    expect(t.game.pot).toBe(60);
    expect(t.game.toAct).toBeNull();
  });

  it("bet and call completes", () => {
    let t = startHand(
      table([p("d", 0, 1000), p("sb", 1, 1000), p("bb", 2, 1000)]),
    );
    t = applyAction(t, "d", { type: "call" });
    t = applyAction(t, "sb", { type: "call" });
    t = applyAction(t, "bb", { type: "check" });
    t = advanceStreet(t);
    expect(t.game.street).toBe("flop");
    expect(t.game.toAct).toBe("sb");
    t = applyAction(t, "sb", { type: "check" });
    t = applyAction(t, "bb", { type: "raiseTo", amount: 40 });
    t = applyAction(t, "d", { type: "call" });
    t = applyAction(t, "sb", { type: "call" });
    expect(t.game.awaitingStreetAdvance).toBe(true);
    expect(t.game.pot).toBe(180);
  });

  it("raise reopens action", () => {
    let t = startHand(
      table([p("d", 0, 1000), p("sb", 1, 1000), p("bb", 2, 1000)]),
    );
    t = applyAction(t, "d", { type: "call" });
    t = applyAction(t, "sb", { type: "raiseTo", amount: 80 });
    expect(t.game.toAct).toBe("bb");
    expect(minRaiseTo(t.game)).toBe(140);
    t = applyAction(t, "bb", { type: "call" });
    t = applyAction(t, "d", { type: "call" });
    expect(t.game.awaitingStreetAdvance).toBe(true);
    expect(t.game.pot).toBe(240);
  });

  it("fold to one player auto-awards the pot", () => {
    let t = startHand(table([p("d", 0, 1000), p("bb", 1, 1000)]));
    t = applyAction(t, "d", { type: "fold" });
    expect(t.game.handComplete).toBe(true);
    expect(t.game.winners).toEqual(["bb"]);
    expect(t.players.find((x) => x.id === "bb")!.stack).toBe(1010);
    expect(t.game.pot).toBe(0);
  });
});

describe("incomplete raise", () => {
  it("does not reopen betting for players who already acted", () => {
    let t = table([p("a", 0, 1000), p("b", 1, 1000), p("c", 2, 125)], {
      dealerSeat: 0,
      currentBet: 100,
      lastFullRaiseSize: 50,
      bigBlind: 50,
      smallBlind: 25,
      toAct: "c",
      street: "preflop",
      handNumber: 1,
    });
    t.players[0] = {
      ...t.players[0]!,
      betThisStreet: 100,
      totalBetThisHand: 100,
      hasActedThisStreet: true,
      stack: 900,
    };
    t.players[1] = {
      ...t.players[1]!,
      betThisStreet: 100,
      totalBetThisHand: 100,
      hasActedThisStreet: true,
      stack: 900,
    };
    t.players[2] = {
      ...t.players[2]!,
      betThisStreet: 0,
      totalBetThisHand: 0,
      hasActedThisStreet: false,
      stack: 125,
    };

    t = applyAction(t, "c", { type: "raiseTo", amount: 125 });
    expect(t.game.currentBet).toBe(125);
    expect(t.game.toAct).toBe("a");
    const aLegal = legalActions(t, "a")!;
    expect(aLegal.canCall).toBe(true);
    expect(aLegal.canBetOrRaise).toBe(false);
    expect(t.players.find((x) => x.id === "a")!.raiseAllowed).toBe(false);
  });
});

describe("side pots", () => {
  it("builds a main pot and a side pot", () => {
    const pots = computeSidePots([
      p("a", 0, 0, { totalBetThisHand: 50, stack: 0, isAllIn: true }),
      p("b", 1, 0, { totalBetThisHand: 100, stack: 200 }),
      p("c", 2, 0, { totalBetThisHand: 100, stack: 200 }),
    ]);
    expect(pots).toEqual([
      { amount: 150, eligible: ["a", "b", "c"] },
      { amount: 100, eligible: ["b", "c"] },
    ]);
  });

  it("dead money from a fold is not eligible", () => {
    const pots = computeSidePots([
      p("a", 0, 0, { totalBetThisHand: 20, folded: true }),
      p("b", 1, 0, { totalBetThisHand: 100 }),
      p("c", 2, 0, { totalBetThisHand: 100 }),
    ]);
    expect(pots).toEqual([{ amount: 220, eligible: ["b", "c"] }]);
  });

  it("awards side pots to the eligible winner and leftover to the other", () => {
    let t = table(
      [
        p("short", 0, 0, {
          totalBetThisHand: 50,
          isAllIn: true,
          stack: 0,
        }),
        p("deep", 1, 200, { totalBetThisHand: 100 }),
        p("other", 2, 200, { totalBetThisHand: 100 }),
      ],
      { street: "showdown", pot: 250, handNumber: 1 },
    );
    t = awardPots(t, ["short"]);
    expect(t.players.find((x) => x.id === "short")!.stack).toBe(150);
    const leftover =
      t.players.find((x) => x.id === "deep")!.stack +
      t.players.find((x) => x.id === "other")!.stack;
    expect(leftover).toBe(500);
    expect(t.game.handComplete).toBe(true);
  });
});

describe("dealer rotation", () => {
  it("moves to the next seated player with chips", () => {
    const players = [p("a", 0, 1000), p("b", 1, 0), p("c", 2, 500)];
    players[1]!.sittingOut = true;
    expect(nextDealerSeat(players, 0)).toBe(2);
  });

  it("rotates on the second hand", () => {
    let t = startHand(
      table([p("d", 0, 1000), p("sb", 1, 1000), p("bb", 2, 1000)]),
    );
    t = applyAction(t, "d", { type: "fold" });
    t = startHand(t);
    expect(t.game.dealerSeat).toBe(1);
    expect(t.game.handNumber).toBe(2);
  });
});

describe("min raise", () => {
  it("is 2x BB preflop after blinds", () => {
    const t = startHand(table([p("d", 0, 1000), p("bb", 1, 1000)]));
    expect(minRaiseTo(t.game)).toBe(40);
  });
});
