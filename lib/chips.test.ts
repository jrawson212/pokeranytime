import { describe, expect, it } from "vitest";
import {
  BUY_IN_CENTS,
  BET_STEP_CENTS,
  blindsForBuyIn,
  chipBreakdown,
  dollarsToCents,
  formatChips,
  formatDollarInput,
  isChipAmount,
  sanitizeDollarDraft,
  snapBigBlind,
} from "./chips";

describe("chipBreakdown", () => {
  it("uses the $20 home-game rack, small chips first", () => {
    expect(chipBreakdown(BUY_IN_CENTS)).toEqual([
      { denom: 25, count: 8 },
      { denom: 50, count: 4 },
      { denom: 100, count: 5 },
      { denom: 200, count: 3 },
      { denom: 500, count: 1 },
    ]);
  });

  it("builds a $10 stack without blacks", () => {
    expect(chipBreakdown(1000)).toEqual([
      { denom: 25, count: 8 },
      { denom: 50, count: 4 },
      { denom: 100, count: 4 },
      { denom: 200, count: 1 },
    ]);
  });

  it("doubles the rack for a $40 buy-in", () => {
    expect(chipBreakdown(4000)).toEqual([
      { denom: 25, count: 16 },
      { denom: 50, count: 8 },
      { denom: 100, count: 10 },
      { denom: 200, count: 6 },
      { denom: 500, count: 2 },
    ]);
  });

  it("takes one white off the rack after posting a quarter", () => {
    expect(chipBreakdown(1975)).toEqual([
      { denom: 25, count: 7 },
      { denom: 50, count: 4 },
      { denom: 100, count: 5 },
      { denom: 200, count: 3 },
      { denom: 500, count: 1 },
    ]);
  });

  it("makes a quarter as one white", () => {
    expect(chipBreakdown(25)).toEqual([{ denom: 25, count: 1 }]);
  });

  it("makes two dollars as one green", () => {
    expect(chipBreakdown(200)).toEqual([{ denom: 200, count: 1 }]);
  });

  it("handles zero", () => {
    expect(chipBreakdown(0)).toEqual([]);
  });
});

describe("formatChips", () => {
  it("formats whole dollars and cents", () => {
    expect(formatChips(2000)).toBe("$20");
    expect(formatChips(25)).toBe("$0.25");
    expect(formatChips(50)).toBe("$0.50");
    expect(formatChips(-500)).toBe("-$5");
  });
});

describe("dollar input text", () => {
  it("strips leading zeros from whole dollars", () => {
    expect(sanitizeDollarDraft("020")).toBe("20");
    expect(sanitizeDollarDraft("40")).toBe("40");
    expect(formatDollarInput(20)).toBe("20");
    expect(formatDollarInput(Number("020"))).toBe("20");
  });

  it("keeps a zero before the decimal for fractions", () => {
    expect(sanitizeDollarDraft(".25")).toBe("0.25");
    expect(sanitizeDollarDraft("0.1")).toBe("0.1");
    expect(formatDollarInput(0.1)).toBe("0.10");
    expect(formatDollarInput(0.25)).toBe("0.25");
  });
});

describe("blindsForBuyIn", () => {
  it("uses a quarter and two quarters at a $20 buy-in", () => {
    expect(blindsForBuyIn(2000)).toEqual({ smallBlind: 25, bigBlind: 50 });
  });

  it("keeps the same 0.5% / 1% ratio when the buy-in scales", () => {
    expect(blindsForBuyIn(4000)).toEqual({ smallBlind: 25, bigBlind: 50 });
    expect(blindsForBuyIn(10000)).toEqual({ smallBlind: 50, bigBlind: 100 });
    expect(blindsForBuyIn(5000)).toEqual({ smallBlind: 25, bigBlind: 50 });
  });

  it("snaps a $10 game up to the smallest chip blinds", () => {
    expect(blindsForBuyIn(1000)).toEqual({ smallBlind: 25, bigBlind: 50 });
  });

  it("never produces a leftover that is not on the rack", () => {
    expect(isChipAmount(10)).toBe(false);
    expect(isChipAmount(25)).toBe(true);
    expect(blindsForBuyIn(10500)).toEqual({ smallBlind: 50, bigBlind: 100 });
    expect(snapBigBlind(105)).toBe(100);
  });
});

describe("bet step", () => {
  it("nudges raises by ten cents", () => {
    expect(BET_STEP_CENTS).toBe(10);
  });
});

describe("dollarsToCents", () => {
  it("rounds typical table amounts", () => {
    expect(dollarsToCents(20)).toBe(2000);
    expect(dollarsToCents(0.25)).toBe(25);
    expect(dollarsToCents(2)).toBe(200);
  });
});
