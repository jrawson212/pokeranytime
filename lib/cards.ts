/** Ranks 2–14 (T=10, J=11, Q=12, K=13, A=14). Suits: c d h s. */
export type Suit = "c" | "d" | "h" | "s";
export type Card = string;

const RANKS = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14] as const;
const SUITS: Suit[] = ["c", "d", "h", "s"];
const RANK_CHAR: Record<number, string> = {
  2: "2",
  3: "3",
  4: "4",
  5: "5",
  6: "6",
  7: "7",
  8: "8",
  9: "9",
  10: "T",
  11: "J",
  12: "Q",
  13: "K",
  14: "A",
};
const CHAR_RANK: Record<string, number> = {
  "2": 2,
  "3": 3,
  "4": 4,
  "5": 5,
  "6": 6,
  "7": 7,
  "8": 8,
  "9": 9,
  T: 10,
  J: 11,
  Q: 12,
  K: 13,
  A: 14,
};

export function makeCard(rank: number, suit: Suit): Card {
  return `${RANK_CHAR[rank]}${suit}`;
}

export function cardRank(card: Card): number {
  return CHAR_RANK[card[0]!] ?? 0;
}

export function cardSuit(card: Card): Suit {
  return card[1] as Suit;
}

export function cardLabel(card: Card): string {
  const r = card[0] === "T" ? "10" : card[0]!;
  const suit = { c: "♣", d: "♦", h: "♥", s: "♠" }[cardSuit(card)] ?? "";
  return `${r}${suit}`;
}

export function isRedSuit(card: Card): boolean {
  const s = cardSuit(card);
  return s === "h" || s === "d";
}

export function freshDeck(): Card[] {
  const deck: Card[] = [];
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      deck.push(makeCard(rank, suit));
    }
  }
  return deck;
}

/** Fisher–Yates. */
export function shuffleDeck(deck: Card[], rng = Math.random): Card[] {
  const out = [...deck];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j]!, out[i]!];
  }
  return out;
}

export function draw(deck: Card[], n: number): { cards: Card[]; deck: Card[] } {
  if (deck.length < n) throw new Error("Deck is empty");
  return { cards: deck.slice(0, n), deck: deck.slice(n) };
}

export type HandRank = {
  /** Higher is better. 8=straight flush … 0=high card */
  category: number;
  /** Kickers / tie-breakers, high first */
  values: number[];
};

export function compareHands(a: HandRank, b: HandRank): number {
  if (a.category !== b.category) return a.category - b.category;
  const len = Math.max(a.values.length, b.values.length);
  for (let i = 0; i < len; i++) {
    const av = a.values[i] ?? 0;
    const bv = b.values[i] ?? 0;
    if (av !== bv) return av - bv;
  }
  return 0;
}

function evaluateFive(cards: Card[]): HandRank {
  const ranks = cards.map(cardRank).sort((a, b) => b - a);
  const suits = cards.map(cardSuit);
  const flush = suits.every((s) => s === suits[0]);

  const counts = new Map<number, number>();
  for (const r of ranks) counts.set(r, (counts.get(r) ?? 0) + 1);
  const byCount = [...counts.entries()].sort((a, b) => {
    if (b[1] !== a[1]) return b[1] - a[1];
    return b[0] - a[0];
  });

  const uniq = [...new Set(ranks)].sort((a, b) => b - a);
  let straightHigh = 0;
  if (uniq.length >= 5) {
    for (let i = 0; i <= uniq.length - 5; i++) {
      if (uniq[i]! - uniq[i + 4]! === 4) {
        straightHigh = uniq[i]!;
        break;
      }
    }
  }
  // Wheel A-5
  if (
    !straightHigh &&
    uniq.includes(14) &&
    uniq.includes(5) &&
    uniq.includes(4) &&
    uniq.includes(3) &&
    uniq.includes(2)
  ) {
    straightHigh = 5;
  }

  if (flush && straightHigh) {
    return { category: 8, values: [straightHigh] };
  }
  if (byCount[0]?.[1] === 4) {
    return {
      category: 7,
      values: [byCount[0][0], byCount[1]![0]],
    };
  }
  if (byCount[0]?.[1] === 3 && byCount[1]?.[1] === 2) {
    return { category: 6, values: [byCount[0][0], byCount[1][0]] };
  }
  if (flush) {
    return { category: 5, values: ranks };
  }
  if (straightHigh) {
    return { category: 4, values: [straightHigh] };
  }
  if (byCount[0]?.[1] === 3) {
    const kickers = byCount.slice(1).map(([r]) => r);
    return { category: 3, values: [byCount[0][0], ...kickers] };
  }
  if (byCount[0]?.[1] === 2 && byCount[1]?.[1] === 2) {
    const highPair = Math.max(byCount[0][0], byCount[1][0]);
    const lowPair = Math.min(byCount[0][0], byCount[1][0]);
    const kicker = byCount[2]![0];
    return { category: 2, values: [highPair, lowPair, kicker] };
  }
  if (byCount[0]?.[1] === 2) {
    const kickers = byCount.slice(1).map(([r]) => r);
    return { category: 1, values: [byCount[0][0], ...kickers] };
  }
  return { category: 0, values: ranks };
}

function combinations<T>(arr: T[], k: number): T[][] {
  if (k === 0) return [[]];
  if (arr.length < k) return [];
  const [head, ...tail] = arr;
  const withHead = combinations(tail, k - 1).map((c) => [head!, ...c]);
  const withoutHead = combinations(tail, k);
  return [...withHead, ...withoutHead];
}

/** Best 5-card hand from 5–7 cards. */
export function evaluateBestHand(cards: Card[]): HandRank {
  if (cards.length < 5) {
    return { category: -1, values: [] };
  }
  if (cards.length === 5) return evaluateFive(cards);
  let best: HandRank | null = null;
  for (const five of combinations(cards, 5)) {
    const h = evaluateFive(five);
    if (!best || compareHands(h, best) > 0) best = h;
  }
  return best!;
}

export function bestHoldemHand(hole: Card[], board: Card[]): HandRank {
  return evaluateBestHand([...hole, ...board]);
}

export const HAND_CATEGORY_NAME = [
  "High card",
  "Pair",
  "Two pair",
  "Three of a kind",
  "Straight",
  "Flush",
  "Full house",
  "Four of a kind",
  "Straight flush",
] as const;

const RANK_WORD: Record<number, string> = {
  2: "twos",
  3: "threes",
  4: "fours",
  5: "fives",
  6: "sixes",
  7: "sevens",
  8: "eights",
  9: "nines",
  10: "tens",
  11: "jacks",
  12: "queens",
  13: "kings",
  14: "aces",
};

/** Short plain-English hand label for showdown UI. */
export function describeHand(hand: HandRank): string {
  if (hand.category < 0) return "";
  const top = hand.values[0] ?? 0;
  const second = hand.values[1] ?? 0;
  switch (hand.category) {
    case 0:
      return `High card ${RANK_CHAR[top] ?? top}`;
    case 1:
      return `Pair of ${RANK_WORD[top] ?? top}`;
    case 2:
      return `Two pair, ${RANK_WORD[top] ?? top} and ${RANK_WORD[second] ?? second}`;
    case 3:
      return `Three ${RANK_WORD[top] ?? top}`;
    case 4:
      return `Straight to ${RANK_CHAR[top] ?? top}`;
    case 5:
      return "Flush";
    case 6:
      return `Full house, ${RANK_WORD[top] ?? top} full of ${RANK_WORD[second] ?? second}`;
    case 7:
      return `Four ${RANK_WORD[top] ?? top}`;
    case 8:
      return `Straight flush to ${RANK_CHAR[top] ?? top}`;
    default:
      return HAND_CATEGORY_NAME[hand.category] ?? "Hand";
  }
}

export function formatShowdownResult(
  winners: { name: string; hand?: HandRank }[],
): string {
  if (winners.length === 0) return "Pot awarded";
  if (winners.length === 1) {
    const w = winners[0]!;
    const hand = w.hand ? describeHand(w.hand) : "";
    return hand ? `${w.name} wins with ${hand}` : `${w.name} wins`;
  }
  if (winners.length === 2) {
    return `${winners[0]!.name} and ${winners[1]!.name} split the pot`;
  }
  const last = winners[winners.length - 1]!;
  const head = winners.slice(0, -1).map((w) => w.name).join(", ");
  return `${head}, and ${last.name} split the pot`;
}

export function showdownResultForTable(input: {
  winners: string[] | null | undefined;
  board: Card[];
  players: { id: string; name: string; holeCards: Card[] }[];
}): string {
  const winners = (input.winners ?? [])
    .map((id) => {
      const p = input.players.find((x) => x.id === id);
      if (!p) return null;
      const hand: HandRank | undefined =
        input.board.length >= 3 && p.holeCards.length >= 2
          ? bestHoldemHand(p.holeCards, input.board)
          : undefined;
      return { name: p.name, hand };
    })
    .filter((w): w is { name: string; hand: HandRank | undefined } => w !== null);
  return formatShowdownResult(winners);
}
