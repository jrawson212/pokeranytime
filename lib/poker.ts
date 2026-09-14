import {
  bestHoldemHand,
  compareHands,
  draw,
  freshDeck,
  shuffleDeck,
  type Card,
} from "./cards";

export type { Card } from "./cards";
export type Street = "preflop" | "flop" | "turn" | "river" | "showdown";
export type CardMode = "physical" | "digital";

export const MIN_PLAYERS = 2;
export const MAX_PLAYERS = 20;

export type PlayerState = {
  id: string;
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
  holeCards: Card[];
};

export type GameState = {
  dealerSeat: number;
  street: Street;
  pot: number;
  currentBet: number;
  lastFullRaiseSize: number;
  smallBlind: number;
  bigBlind: number;
  toAct: string | null;
  awaitingStreetAdvance: boolean;
  handNumber: number;
  handComplete: boolean;
  winners: string[] | null;
  cardMode: CardMode;
  board: Card[];
  deck: Card[];
};

export type TableState = {
  game: GameState;
  players: PlayerState[];
};

export type Action =
  | { type: "fold" }
  | { type: "check" }
  | { type: "call" }
  | { type: "raiseTo"; amount: number };

export type LegalActions = {
  canFold: boolean;
  canCheck: boolean;
  canCall: boolean;
  callAmount: number;
  canBetOrRaise: boolean;
  minRaiseTo: number;
  maxRaiseTo: number;
  isBet: boolean;
};

export type SidePot = {
  amount: number;
  eligible: string[];
};

export class PokerError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PokerError";
  }
}

export const STREET_ORDER: Street[] = [
  "preflop",
  "flop",
  "turn",
  "river",
  "showdown",
];

export function streetLabel(street: Street | null): string {
  if (!street) return "Lobby";
  switch (street) {
    case "preflop":
      return "Preflop";
    case "flop":
      return "Flop";
    case "turn":
      return "Turn";
    case "river":
      return "River";
    case "showdown":
      return "Showdown";
  }
}

export function nextStreet(street: Street): Street {
  const i = STREET_ORDER.indexOf(street);
  return STREET_ORDER[Math.min(i + 1, STREET_ORDER.length - 1)]!;
}

export function visiblePot(table: TableState): number {
  const inFront = table.players.reduce((sum, p) => sum + p.betThisStreet, 0);
  return table.game.pot + inFront;
}

export function sortBySeat<T extends { seat: number }>(players: T[]): T[] {
  return [...players].sort((a, b) => a.seat - b.seat);
}

export function canStillAct(p: PlayerState): boolean {
  return !p.sittingOut && !p.folded && !p.isAllIn && p.stack > 0;
}

export function livePlayers(players: PlayerState[]): PlayerState[] {
  return players.filter((p) => !p.sittingOut && !p.folded);
}

export function nextPlayerFromSeat(
  players: PlayerState[],
  fromSeat: number,
  predicate: (p: PlayerState) => boolean,
): PlayerState | null {
  const sorted = sortBySeat(players);
  if (sorted.length === 0) return null;
  let idx = sorted.findIndex((p) => p.seat === fromSeat);
  if (idx === -1) idx = sorted.length - 1;
  for (let i = 1; i <= sorted.length; i++) {
    const p = sorted[(idx + i) % sorted.length]!;
    if (predicate(p)) return p;
  }
  return null;
}

export function nextDealerSeat(
  players: PlayerState[],
  dealerSeat: number,
): number {
  const next = nextPlayerFromSeat(
    players,
    dealerSeat,
    (p) => !p.sittingOut && p.stack > 0,
  );
  return next?.seat ?? dealerSeat;
}

export function blindPositions(
  players: PlayerState[],
  dealerSeat: number,
): { sbId: string; bbId: string } {
  const inHand = sortBySeat(
    players.filter((p) => !p.sittingOut && p.stack > 0),
  );
  if (inHand.length < 2) {
    throw new PokerError("Need at least 2 players with chips");
  }
  if (inHand.length === 2) {
    const dealer =
      inHand.find((p) => p.seat === dealerSeat) ?? inHand[0]!;
    const other = inHand.find((p) => p.id !== dealer.id)!;
    return { sbId: dealer.id, bbId: other.id };
  }
  const sb = nextPlayerFromSeat(inHand, dealerSeat, () => true);
  if (!sb) throw new PokerError("Could not find small blind");
  const bb = nextPlayerFromSeat(inHand, sb.seat, () => true);
  if (!bb) throw new PokerError("Could not find big blind");
  return { sbId: sb.id, bbId: bb.id };
}

export function positionTags(
  players: PlayerState[],
  dealerSeat: number,
  playerId: string,
): string[] {
  const tags: string[] = [];
  const player = players.find((p) => p.id === playerId);
  if (!player || player.sittingOut) return tags;
  if (player.seat === dealerSeat) tags.push("D");
  try {
    const { sbId, bbId } = blindPositions(players, dealerSeat);
    if (playerId === sbId) tags.push("SB");
    if (playerId === bbId) tags.push("BB");
  } catch {
    /* not enough players with chips */
  }
  return tags;
}

export function matchBetLabel(street: Street): "Ante" | "Call" {
  return street === "preflop" ? "Ante" : "Call";
}

export function minRaiseTo(game: GameState): number {
  if (game.currentBet === 0) return game.bigBlind;
  return game.currentBet + game.lastFullRaiseSize;
}

export function toCallAmount(game: GameState, player: PlayerState): number {
  return Math.max(0, game.currentBet - player.betThisStreet);
}

export function legalActions(
  table: TableState,
  playerId: string,
): LegalActions | null {
  const player = table.players.find((p) => p.id === playerId);
  if (!player) return null;
  if (table.game.handComplete || table.game.awaitingStreetAdvance) return null;
  if (table.game.street === "showdown") return null;
  if (table.game.toAct !== playerId) return null;
  if (!canStillAct(player)) return null;

  const toCall = toCallAmount(table.game, player);
  const maxRaiseTo = player.betThisStreet + player.stack;
  const minTo = minRaiseTo(table.game);
  const isBet = table.game.currentBet === 0;
  const canAffordRaise = maxRaiseTo > table.game.currentBet && player.raiseAllowed;

  return {
    canFold: true,
    canCheck: toCall === 0,
    canCall: toCall > 0,
    callAmount: Math.min(toCall, player.stack),
    canBetOrRaise: canAffordRaise,
    minRaiseTo: Math.min(Math.max(minTo, isBet ? table.game.bigBlind : minTo), maxRaiseTo),
    maxRaiseTo,
    isBet,
  };
}

export function isBettingComplete(table: TableState): boolean {
  const need = table.players.filter(canStillAct);
  if (need.length === 0) return true;
  return need.every(
    (p) => p.hasActedThisStreet && p.betThisStreet === table.game.currentBet,
  );
}

export function computeSidePots(players: PlayerState[]): SidePot[] {
  const contributors = players.filter((p) => p.totalBetThisHand > 0);
  if (contributors.length === 0) return [];

  const levels = [
    ...new Set(contributors.map((p) => p.totalBetThisHand)),
  ].sort((a, b) => a - b);

  const pots: SidePot[] = [];
  let prev = 0;
  for (const level of levels) {
    const inLevel = contributors.filter((p) => p.totalBetThisHand >= level);
    const amount = (level - prev) * inLevel.length;
    const eligible = inLevel.filter((p) => !p.folded).map((p) => p.id);
    if (amount > 0) {
      pots.push({ amount, eligible });
    }
    prev = level;
  }

  const merged: SidePot[] = [];
  for (const pot of pots) {
    const last = merged[merged.length - 1];
    if (
      last &&
      sameIds(last.eligible, pot.eligible)
    ) {
      last.amount += pot.amount;
    } else {
      merged.push({ ...pot, eligible: [...pot.eligible] });
    }
  }
  return merged;
}

function sameIds(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  const set = new Set(a);
  return b.every((id) => set.has(id));
}

function cloneTable(table: TableState): TableState {
  return structuredClone(table);
}

function playerById(players: PlayerState[], id: string): PlayerState {
  const p = players.find((x) => x.id === id);
  if (!p) throw new PokerError("Player not found");
  return p;
}

function putChips(player: PlayerState, totalStreetBet: number): void {
  const need = Math.max(0, totalStreetBet - player.betThisStreet);
  const put = Math.min(need, player.stack);
  player.stack -= put;
  player.betThisStreet += put;
  player.totalBetThisHand += put;
  if (player.stack === 0) player.isAllIn = true;
}

function sweepBets(table: TableState): void {
  for (const p of table.players) {
    table.game.pot += p.betThisStreet;
    p.betThisStreet = 0;
    p.hasActedThisStreet = false;
    p.raiseAllowed = true;
  }
  table.game.currentBet = 0;
  table.game.lastFullRaiseSize = table.game.bigBlind;
}

function autoAwardIfOneLeft(table: TableState): boolean {
  const remaining = livePlayers(table.players);
  if (remaining.length !== 1) return false;
  const winner = remaining[0]!;
  sweepBets(table);
  winner.stack += table.game.pot;
  table.game.pot = 0;
  table.game.street = "showdown";
  table.game.toAct = null;
  table.game.awaitingStreetAdvance = false;
  table.game.handComplete = true;
  table.game.winners = [winner.id];
  return true;
}

function dealFromDeck(table: TableState, n: number): Card[] {
  const { cards, deck } = draw(table.game.deck, n);
  table.game.deck = deck;
  return cards;
}

function dealHoleCards(table: TableState): void {
  for (const p of table.players) {
    if (p.sittingOut || p.stack <= 0) {
      p.holeCards = [];
      continue;
    }
    p.holeCards = dealFromDeck(table, 2);
  }
}

function dealBoardForStreet(table: TableState, street: Street): void {
  if (street === "flop") {
    table.game.board.push(...dealFromDeck(table, 3));
  } else if (street === "turn" || street === "river") {
    table.game.board.push(...dealFromDeck(table, 1));
  }
}

function resolveDigitalShowdown(table: TableState): void {
  if (table.game.handComplete) return;
  if (table.game.street !== "showdown") return;

  if (table.players.some((p) => p.betThisStreet > 0)) {
    sweepBets(table);
  }

  const live = livePlayers(table.players);
  if (live.length === 0) return;
  if (live.length === 1) {
    const winner = live[0]!;
    winner.stack += table.game.pot;
    table.game.pot = 0;
    table.game.handComplete = true;
    table.game.winners = [winner.id];
    table.game.toAct = null;
    table.game.awaitingStreetAdvance = false;
    return;
  }

  const pots = computeSidePots(table.players);
  const totalFromPots = pots.reduce((s, p) => s + p.amount, 0);
  if (pots.length === 0 && table.game.pot > 0) {
    pots.push({ amount: table.game.pot, eligible: live.map((p) => p.id) });
  } else if (totalFromPots < table.game.pot) {
    pots.push({
      amount: table.game.pot - totalFromPots,
      eligible: live.map((p) => p.id),
    });
  }

  const overallWinners = new Set<string>();
  for (const pot of pots) {
    const eligible = pot.eligible
      .map((id) => table.players.find((p) => p.id === id))
      .filter((p): p is PlayerState => !!p && !p.folded && !p.sittingOut);
    if (eligible.length === 0) continue;

    let best = bestHoldemHand(eligible[0]!.holeCards, table.game.board);
    let winners = [eligible[0]!];
    for (let i = 1; i < eligible.length; i++) {
      const hand = bestHoldemHand(eligible[i]!.holeCards, table.game.board);
      const cmp = compareHands(hand, best);
      if (cmp > 0) {
        best = hand;
        winners = [eligible[i]!];
      } else if (cmp === 0) {
        winners.push(eligible[i]!);
      }
    }

    const share = Math.floor(pot.amount / winners.length);
    let remainder = pot.amount - share * winners.length;
    for (const w of winners) {
      const extra = remainder > 0 ? 1 : 0;
      if (remainder > 0) remainder -= 1;
      w.stack += share + extra;
      overallWinners.add(w.id);
    }
  }

  table.game.pot = 0;
  table.game.handComplete = true;
  table.game.winners = [...overallWinners];
  table.game.toAct = null;
  table.game.awaitingStreetAdvance = false;
}

/** Advance one street in place (used by advanceStreet + digital auto-run). */
function advanceStreetInPlace(table: TableState): void {
  if (table.game.handComplete) throw new PokerError("Hand is over");
  if (table.game.street === "showdown") {
    throw new PokerError("Already at showdown");
  }

  if (!table.game.awaitingStreetAdvance) {
    if (!isBettingComplete(table)) {
      throw new PokerError("Betting is not finished");
    }
    finishBettingRound(table);
  }

  if ((table.game.street as Street) === "showdown") return;

  table.game.street = nextStreet(table.game.street);
  table.game.awaitingStreetAdvance = false;

  if (table.game.cardMode === "digital") {
    dealBoardForStreet(table, table.game.street);
  }

  for (const p of table.players) {
    if (!p.folded && !p.sittingOut) {
      p.hasActedThisStreet = false;
      p.raiseAllowed = true;
    }
  }
  table.game.currentBet = 0;
  table.game.lastFullRaiseSize = table.game.bigBlind;

  if (table.game.street === "showdown") {
    table.game.toAct = null;
    return;
  }

  const first = nextPlayerFromSeat(
    table.players,
    table.game.dealerSeat,
    canStillAct,
  );
  table.game.toAct = first?.id ?? null;
  if (!table.game.toAct) {
    table.game.awaitingStreetAdvance = true;
  }
}

function autoRunDigital(table: TableState): void {
  if (table.game.cardMode !== "digital") return;
  if (table.game.handComplete) return;

  // Run out board while nobody can act, then settle showdown.
  let guard = 0;
  while (guard++ < 8) {
    if (table.game.handComplete) return;

    if (table.game.street === "showdown") {
      resolveDigitalShowdown(table);
      return;
    }

    if (table.game.toAct && !table.game.awaitingStreetAdvance) return;

    if (table.game.awaitingStreetAdvance || !table.game.toAct) {
      if (!table.game.awaitingStreetAdvance && !table.game.toAct) {
        if (isBettingComplete(table) || livePlayers(table.players).every((p) => p.isAllIn || p.folded || p.sittingOut)) {
          finishBettingRound(table);
        } else {
          return;
        }
      }
      if ((table.game.street as Street) === "showdown") {
        resolveDigitalShowdown(table);
        return;
      }
      if (table.game.awaitingStreetAdvance) {
        advanceStreetInPlace(table);
        continue;
      }
    }
    return;
  }
}

function finishBettingRound(table: TableState): void {
  sweepBets(table);
  table.game.toAct = null;
  if (table.game.street === "river") {
    table.game.street = "showdown";
    table.game.awaitingStreetAdvance = false;
    return;
  }
  table.game.awaitingStreetAdvance = true;
}

function nextToActAfter(
  table: TableState,
  fromSeat: number,
): PlayerState | null {
  return nextPlayerFromSeat(table.players, fromSeat, (p) => {
    if (!canStillAct(p)) return false;
    if (!p.hasActedThisStreet) return true;
    return p.betThisStreet < table.game.currentBet;
  });
}

function continueAfterAction(table: TableState, actorSeat: number): void {
  if (autoAwardIfOneLeft(table)) return;
  if (isBettingComplete(table)) {
    finishBettingRound(table);
    autoRunDigital(table);
    return;
  }
  const next = nextToActAfter(table, actorSeat);
  if (!next) {
    finishBettingRound(table);
    autoRunDigital(table);
    return;
  }
  table.game.toAct = next.id;
}

export function startHand(table: TableState): TableState {
  const next = cloneTable(table);
  const { game, players } = next;

  game.handNumber += 1;
  game.handComplete = false;
  game.winners = null;
  game.pot = 0;
  game.street = "preflop";
  game.awaitingStreetAdvance = false;
  game.currentBet = 0;
  game.lastFullRaiseSize = game.bigBlind;
  game.board = [];
  game.deck = [];
  if (!game.cardMode) game.cardMode = "physical";

  for (const p of players) {
    p.holeCards = [];
    if (p.stack <= 0) {
      p.sittingOut = true;
      p.folded = true;
      p.betThisStreet = 0;
      p.totalBetThisHand = 0;
      p.isAllIn = false;
      p.hasActedThisStreet = false;
      p.raiseAllowed = true;
      continue;
    }
    p.sittingOut = false;
    p.folded = false;
    p.betThisStreet = 0;
    p.totalBetThisHand = 0;
    p.isAllIn = false;
    p.hasActedThisStreet = false;
    p.raiseAllowed = true;
  }

  const active = players.filter((p) => !p.sittingOut && p.stack > 0);
  if (active.length < 2) {
    throw new PokerError("Need at least 2 players with chips");
  }

  if (game.handNumber > 1) {
    game.dealerSeat = nextDealerSeat(players, game.dealerSeat);
  } else if (!active.some((p) => p.seat === game.dealerSeat)) {
    game.dealerSeat = sortBySeat(active)[0]!.seat;
  }

  if (game.cardMode === "digital") {
    game.deck = shuffleDeck(freshDeck());
    dealHoleCards(next);
  }

  const { sbId, bbId } = blindPositions(players, game.dealerSeat);
  const sb = playerById(players, sbId);
  const bb = playerById(players, bbId);
  putChips(sb, game.smallBlind);
  putChips(bb, game.bigBlind);

  game.currentBet = Math.max(sb.betThisStreet, bb.betThisStreet);
  game.lastFullRaiseSize = game.bigBlind;

  const first = nextPlayerFromSeat(players, bb.seat, canStillAct);
  game.toAct = first?.id ?? null;
  if (!game.toAct) {
    finishBettingRound(next);
    autoRunDigital(next);
  }
  return next;
}

export function applyAction(
  table: TableState,
  playerId: string,
  action: Action,
): TableState {
  const next = cloneTable(table);
  const { game, players } = next;

  if (game.handComplete) throw new PokerError("Hand is over");
  if (game.awaitingStreetAdvance) {
    throw new PokerError("Waiting to deal the next street");
  }
  if (game.street === "showdown") throw new PokerError("Hand is at showdown");
  if (game.toAct !== playerId) throw new PokerError("Not your turn");

  const player = playerById(players, playerId);
  if (!canStillAct(player)) throw new PokerError("You cannot act");

  const legal = legalActions(next, playerId);
  if (!legal) throw new PokerError("No legal actions");

  switch (action.type) {
    case "fold": {
      player.folded = true;
      player.hasActedThisStreet = true;
      break;
    }
    case "check": {
      if (!legal.canCheck) throw new PokerError("Cannot check");
      player.hasActedThisStreet = true;
      break;
    }
    case "call": {
      if (!legal.canCall) throw new PokerError("Cannot call");
      putChips(player, player.betThisStreet + legal.callAmount);
      player.hasActedThisStreet = true;
      break;
    }
    case "raiseTo": {
      let amount = Math.floor(action.amount);
      const maxTo = player.betThisStreet + player.stack;
      if (amount > maxTo) amount = maxTo;
      if (amount <= player.betThisStreet) {
        throw new PokerError("Raise must put more chips in");
      }

      const isAllIn = amount === maxTo;
      const isRaise = amount > game.currentBet;

      if (!isRaise) {
        putChips(player, amount);
        player.hasActedThisStreet = true;
        break;
      }

      if (!player.raiseAllowed && !isAllIn) {
        throw new PokerError("You can only call or fold");
      }
      if (!player.raiseAllowed && isAllIn && amount > game.currentBet + toCallAmount(game, player)) {
        // all-in that is more than a call is a raise; blocked when not allowed
        const callTo = player.betThisStreet + toCallAmount(game, player);
        if (amount > callTo) {
          throw new PokerError("You can only call or fold");
        }
      }

      const minTo = minRaiseTo(game);
      if (amount < minTo && !isAllIn) {
        throw new PokerError(`Minimum raise is ${minTo}`);
      }

      const prevBet = game.currentBet;
      const raiseSize = amount - prevBet;
      const opening = prevBet === 0;
      const isFullRaise = opening
        ? amount >= game.bigBlind
        : raiseSize >= game.lastFullRaiseSize;

      putChips(player, amount);
      const actualBet = player.betThisStreet;
      game.currentBet = Math.max(game.currentBet, actualBet);
      player.hasActedThisStreet = true;

      if (actualBet > prevBet && isFullRaise) {
        game.lastFullRaiseSize = opening ? actualBet : actualBet - prevBet;
        for (const p of players) {
          if (p.id === player.id) continue;
          if (canStillAct(p)) {
            p.hasActedThisStreet = false;
            p.raiseAllowed = true;
          }
        }
      } else if (actualBet > prevBet) {
        for (const p of players) {
          if (p.id === player.id) continue;
          if (p.hasActedThisStreet) p.raiseAllowed = false;
          if (canStillAct(p) && p.betThisStreet < game.currentBet) {
            p.hasActedThisStreet = false;
          }
        }
      }
      break;
    }
  }

  continueAfterAction(next, player.seat);
  return next;
}

export function advanceStreet(table: TableState): TableState {
  const next = cloneTable(table);
  advanceStreetInPlace(next);
  autoRunDigital(next);
  return next;
}

export function awardPots(
  table: TableState,
  winnerIds: string[],
): TableState {
  const next = cloneTable(table);
  const { game, players } = next;

  if (game.handComplete) throw new PokerError("Pot already awarded");
  if (game.street !== "showdown") {
    throw new PokerError("Award the pot at showdown");
  }
  const unique = [...new Set(winnerIds)];
  if (unique.length === 0) throw new PokerError("Pick at least one winner");

  const live = livePlayers(players);
  for (const id of unique) {
    if (!live.some((p) => p.id === id)) {
      throw new PokerError("Winner must still be in the hand");
    }
  }

  if (players.some((p) => p.betThisStreet > 0)) {
    sweepBets(next);
  }

  const pots = computeSidePots(players);
  const totalFromPots = pots.reduce((s, p) => s + p.amount, 0);
  if (pots.length === 0 && game.pot > 0) {
    pots.push({ amount: game.pot, eligible: live.map((p) => p.id) });
  } else if (totalFromPots < game.pot) {
    pots.push({
      amount: game.pot - totalFromPots,
      eligible: live.map((p) => p.id),
    });
  }

  for (const pot of pots) {
    let winners = unique.filter((id) => pot.eligible.includes(id));
    if (winners.length === 0) {
      winners = pot.eligible.filter((id) => live.some((p) => p.id === id));
    }
    if (winners.length === 0) continue;
    const share = Math.floor(pot.amount / winners.length);
    let remainder = pot.amount - share * winners.length;
    for (const id of winners) {
      const p = playerById(players, id);
      const extra = remainder > 0 ? 1 : 0;
      if (remainder > 0) remainder -= 1;
      p.stack += share + extra;
    }
  }

  game.pot = 0;
  game.handComplete = true;
  game.winners = unique;
  game.toAct = null;
  game.awaitingStreetAdvance = false;
  return next;
}

export function raisePresets(
  table: TableState,
  playerId: string,
): { label: string; amount: number }[] {
  const legal = legalActions(table, playerId);
  if (!legal?.canBetOrRaise) return [];
  const pot = visiblePot(table);
  const amounts = [
    { label: "Min", amount: legal.minRaiseTo },
    { label: "½ pot", amount: Math.floor(pot / 2) },
    { label: "Pot", amount: pot },
    { label: "All-in", amount: legal.maxRaiseTo },
  ];
  const seen = new Set<number>();
  const out: { label: string; amount: number }[] = [];
  for (const p of amounts) {
    const clamped = Math.min(
      legal.maxRaiseTo,
      Math.max(legal.minRaiseTo, p.amount),
    );
    if (seen.has(clamped)) continue;
    seen.add(clamped);
    out.push({ label: p.label, amount: clamped });
  }
  return out;
}
