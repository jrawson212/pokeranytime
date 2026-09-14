import {
  legalActions,
  type Action,
  type TableState,
} from "./poker";

const BOT_NAMES = ["River", "Oak", "Bluff"] as const;

export function soloBotNames(): string[] {
  return [...BOT_NAMES];
}

/** Simple automatic player: check/call mostly, fold or min-raise sometimes. */
export function chooseBotAction(
  table: TableState,
  playerId: string,
): Action {
  const legal = legalActions(table, playerId);
  if (!legal) return { type: "check" };

  if (legal.canCheck) {
    if (legal.canBetOrRaise && Math.random() < 0.22) {
      return { type: "raiseTo", amount: legal.minRaiseTo };
    }
    return { type: "check" };
  }

  if (legal.canCall) {
    const cheap = legal.callAmount <= table.game.bigBlind * 3;
    if (cheap || Math.random() < 0.65) {
      return { type: "call" };
    }
    if (legal.canFold) return { type: "fold" };
    return { type: "call" };
  }

  if (legal.canBetOrRaise) {
    return { type: "raiseTo", amount: legal.minRaiseTo };
  }

  return { type: "fold" };
}

export function runBotTurns(
  table: TableState,
  botIds: ReadonlySet<string>,
  apply: (t: TableState, playerId: string, action: Action) => TableState,
): TableState {
  let next = table;
  for (let i = 0; i < 48; i++) {
    if (next.game.handComplete) break;
    if (next.game.awaitingStreetAdvance) break;
    if (next.game.street === "showdown") break;
    const toAct = next.game.toAct;
    if (!toAct || !botIds.has(toAct)) break;
    next = apply(next, toAct, chooseBotAction(next, toAct));
  }
  return next;
}
