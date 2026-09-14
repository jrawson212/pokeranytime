export const DENOMS = [500, 200, 100, 50, 25] as const;
export type ChipDenom = (typeof DENOMS)[number];

/** Left-to-right on the felt: white → red → blue → green → black. */
export const DISPLAY_DENOMS = [25, 50, 100, 200, 500] as const;

/** One $20 buy-in in cents. */
export const BUY_IN_CENTS = 2000;

/**
 * Standard $20 rack:
 * 1 black ($5) + 3 green ($2) + 5 blue ($1) + 4 red (50¢) + 8 white (25¢).
 */
export const STANDARD_RACK: { denom: ChipDenom; count: number }[] = [
  { denom: 500, count: 1 },
  { denom: 200, count: 3 },
  { denom: 100, count: 5 },
  { denom: 50, count: 4 },
  { denom: 25, count: 8 },
];

export const CHIP_STYLES: Record<
  ChipDenom,
  {
    bg: string;
    rim: string;
    text: string;
    label: string;
    spot: string;
    shine: string;
    face: string;
  }
> = {
  500: {
    bg: "#1c1c1c",
    rim: "#0a0a0a",
    text: "#f5d76e",
    label: "black",
    spot: "#f5d76e",
    shine: "#555",
    face: "$5",
  },
  200: {
    bg: "#1e8449",
    rim: "#145a32",
    text: "#fff",
    label: "green",
    spot: "#f4ead5",
    shine: "#58d68d",
    face: "$2",
  },
  100: {
    bg: "#1f6fbf",
    rim: "#15497c",
    text: "#fff",
    label: "blue",
    spot: "#d6eaf8",
    shine: "#5dade2",
    face: "$1",
  },
  50: {
    bg: "#c0392b",
    rim: "#7b241c",
    text: "#fff",
    label: "red",
    spot: "#f4ead5",
    shine: "#e57373",
    face: "50¢",
  },
  25: {
    bg: "#f4f1ea",
    rim: "#b8aea0",
    text: "#1a1a1a",
    label: "white",
    spot: "#8a8178",
    shine: "#ffffff",
    face: "25¢",
  },
};

/** Raise / bet +/- nudge size ($0.10). */
export const BET_STEP_CENTS = 10;

export function dollarsToCents(dollars: number): number {
  return Math.round(dollars * 100);
}

export function centsToDollars(cents: number): number {
  return cents / 100;
}

export const MIN_BUY_IN_CENTS = 500;
/** Smallest chip on the rack. */
export const MIN_SMALL_BLIND_CENTS = 25;

/** Amounts the rack can pay exactly (multiples of a white / 25¢). */
export function isChipAmount(cents: number): boolean {
  const n = Math.round(cents);
  if (n <= 0) return false;
  return n % 25 === 0;
}

function chipNiceness(cents: number): number {
  if (cents % 1000 === 0) return 6;
  if (cents % 500 === 0) return 5;
  if (cents % 200 === 0) return 4;
  if (cents % 100 === 0) return 3;
  if (cents % 50 === 0) return 2;
  if (cents % 25 === 0) return 1;
  return 0;
}

/** Nearest amount you can actually make with the chips, at least `min`. */
export function snapToChipAmount(cents: number, min = 0): number {
  const floorMin = Math.max(0, Math.round(min));
  const target = Math.round(Number.isFinite(cents) ? cents : floorMin);
  if (isChipAmount(target) && target >= floorMin) return target;

  for (let d = 1; d <= Math.max(target, floorMin) + 25; d++) {
    const down = target - d;
    const up = target + d;
    const downOk = down >= floorMin && isChipAmount(down);
    const upOk = up >= floorMin && isChipAmount(up);
    if (downOk && upOk) return chipNiceness(down) >= chipNiceness(up) ? down : up;
    if (downOk) return down;
    if (upOk) return up;
  }
  return isChipAmount(floorMin) ? floorMin : MIN_SMALL_BLIND_CENTS;
}

export function snapDownToChipAmount(cents: number, min = 0): number {
  const floorMin = Math.max(0, Math.round(min));
  let n = Math.round(Number.isFinite(cents) ? cents : floorMin);
  if (n < floorMin) return isChipAmount(floorMin) ? floorMin : MIN_SMALL_BLIND_CENTS;
  while (n > floorMin && !isChipAmount(n)) n -= 1;
  if (isChipAmount(n) && n >= floorMin) return n;
  return isChipAmount(floorMin) ? floorMin : MIN_SMALL_BLIND_CENTS;
}

export function snapSmallBlind(cents: number, maxCents?: number): number {
  const sb = snapToChipAmount(cents, MIN_SMALL_BLIND_CENTS);
  if (maxCents == null) return sb;
  const maxSb = snapDownToChipAmount(maxCents, MIN_SMALL_BLIND_CENTS);
  return Math.min(sb, maxSb);
}

export function snapBigBlind(cents: number): number {
  return snapSmallBlind(cents / 2) * 2;
}

/**
 * $20 → 25¢ / 50¢. Same 0.5% / 1% of buy-in, snapped so the big blind
 * is always 2× the small and both amounts exist on the rack.
 */
export function blindsForBuyIn(buyInCents: number): {
  smallBlind: number;
  bigBlind: number;
} {
  const buyIn = Math.max(0, Math.round(buyInCents));
  const smallBlind = snapSmallBlind(buyIn * 0.005, buyIn / 20);
  return { smallBlind, bigBlind: smallBlind * 2 };
}

function emptyCounts(): Record<ChipDenom, number> {
  return { 500: 0, 200: 0, 100: 0, 50: 0, 25: 0 };
}

function addRack(counts: Record<ChipDenom, number>, racks: number) {
  for (const { denom, count } of STANDARD_RACK) {
    counts[denom] += count * racks;
  }
}

function greedyAdd(counts: Record<ChipDenom, number>, amount: number): number {
  let left = amount;
  for (const denom of DENOMS) {
    const n = Math.floor(left / denom);
    if (n > 0) {
      counts[denom] += n;
      left -= n * denom;
    }
  }
  return left;
}

function subtractValue(counts: Record<ChipDenom, number>, amount: number): number {
  let left = amount;
  for (const denom of DENOMS) {
    const take = Math.min(counts[denom], Math.floor(left / denom));
    if (take > 0) {
      counts[denom] -= take;
      left -= take * denom;
    }
  }
  return left;
}

function toList(counts: Record<ChipDenom, number>): { denom: ChipDenom; count: number }[] {
  return DISPLAY_DENOMS.filter((denom) => counts[denom] > 0).map((denom) => ({
    denom,
    count: counts[denom],
  }));
}

export function chipBreakdown(
  amount: number,
): { denom: ChipDenom; count: number }[] {
  const cents = Math.max(0, Math.round(amount));
  if (cents === 0) return [];

  const counts = emptyCounts();
  const racks = Math.floor(cents / BUY_IN_CENTS);
  const rem = cents % BUY_IN_CENTS;

  if (rem === 0) {
    addRack(counts, racks);
    return toList(counts);
  }

  if (racks === 0) {
    // Small stacks: exact greedy (one green for $2, not eight whites).
    // Near-full racks: start from a standard rack and take chips off.
    if (rem < BUY_IN_CENTS / 2) {
      const exact = emptyCounts();
      if (greedyAdd(exact, rem) === 0) return toList(exact);
    }
    addRack(counts, 1);
    const leftover = subtractValue(counts, BUY_IN_CENTS - rem);
    if (leftover === 0) return toList(counts);
    const exact = emptyCounts();
    if (greedyAdd(exact, rem) === 0) return toList(exact);
    return toList(counts);
  }

  addRack(counts, racks);
  const trial = emptyCounts();
  const leftover = greedyAdd(trial, rem);
  if (leftover === 0) {
    greedyAdd(counts, rem);
  } else {
    addRack(counts, 1);
    subtractValue(counts, BUY_IN_CENTS - rem);
  }

  return toList(counts);
}

export function formatChips(cents: number): string {
  const sign = cents < 0 ? "-" : "";
  const abs = Math.abs(Math.round(cents));
  if (abs % 100 === 0) {
    return `${sign}$${(abs / 100).toLocaleString("en-US")}`;
  }
  return `${sign}$${(abs / 100).toFixed(2)}`;
}

/** Whole dollars as `20`; fractions as `0.10`. Never leading zeros on the dollars. */
export function formatDollarInput(dollars: number): string {
  if (!Number.isFinite(dollars)) return "";
  const cents = Math.round(dollars * 100);
  if (cents % 100 === 0) return String(cents / 100);
  return (Math.abs(cents) / 100).toFixed(2);
}

export function sanitizeDollarDraft(raw: string): string {
  const next = raw.replace(/[^\d.]/g, "");
  const dot = next.indexOf(".");
  const intRaw = dot === -1 ? next : next.slice(0, dot);
  const frac = dot === -1 ? null : next.slice(dot + 1).replace(/\./g, "").slice(0, 2);
  const intPart = intRaw.replace(/^0+(?=\d)/, "") || (frac !== null ? "0" : "");
  if (frac === null) return intPart;
  return `${intPart || "0"}.${frac}`;
}
