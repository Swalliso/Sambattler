// Planning in rounds (SPEC §4.4, §4.7 steps 11–12, §6.1, §14.5, §14.6): the executors of `plant`, `sell`,
// `toggleMerge`, `upgrade` and `beginClash`'s planning half, and the checks the UI's ghost and the AI read. Each
// executor checks its command again as it runs and returns why it's refused, or null once it has run, so a
// refusal becomes the queue's `commandRejected` and a replay reproduces it (§13.3 rule 7). The general's
// turn (T068) runs the executors at once in the round's opening; a queued enemy plan comes after it and is
// refused (plan Call 8). While a side's draft is open, its planning commands are refused (#28): it picks,
// rerolls or skips, then plans. Reasons are codes, which the UI words.
import { buildable } from './colony.ts';
import { addBuilding } from './create.ts';
import { atMaxOwned, inKit } from './kit.ts';
import { startClash } from './round.ts';
import type { BattleState, Command, Side } from './state.ts';

/** The planning commands, which run in the planning phase only (§4.2). */
export type PlanningCommand = Extract<Command, { type: 'plant' | 'sell' | 'toggleMerge' | 'upgrade' | 'beginClash' }>;

/**
 * Runs a planning command from the queue, or returns why it's refused; the queue has checked its phase. The
 * general plans only in the round's opening, so a queued enemy `plant`, `sell` or `toggleMerge` comes after
 * it, and only the player's side begins the clash (§14.5, plan Call 8, A034).
 */
export function executePlanning(state: BattleState, cmd: PlanningCommand): string | null {
  if (cmd.side === 'enemy' && cmd.type !== 'beginClash') return 'enemyPlanAfterOpening';
  switch (cmd.type) {
    case 'plant': return plant(state, cmd.side, cmd.buildingId, cmd.plot);
    case 'sell': return sell(state, cmd.side, cmd.entityId);
    case 'toggleMerge': return toggleMerge(state, cmd.side, cmd.entityId, cmd.on);
    case 'upgrade': return upgrade(state, cmd.side, cmd.entityId);
    case 'beginClash': return beginClash(state, cmd.side);
  }
}

/** Plants a building on one of the side's plots for its price, at once (§4.4), or returns why it can't. */
export function plant(state: BattleState, side: Side, buildingId: string, plot: number): string | null {
  const problem = plantProblem(state, side, buildingId, plot);
  if (problem) return problem;
  const price = priceOf(state, side, buildingId);
  state.sides[side].gold -= price;
  const b = addBuilding(state, side, buildingId, plot, price);
  state.stats[side].buildingsPlanted++;
  if (state.compiled[side].buildings[buildingId]!.kind === 'economy') state.stats[side].economyPlanted++;
  state.events.push({ t: 'buildingPlanted', id: b.id });
  return null;
}

/** Sells one of the side's buildings for `sellValue`, freeing its plot at once (§4.4), or returns why it can't. */
export function sell(state: BattleState, side: Side, entityId: number): string | null {
  const problem = sellProblem(state, side, entityId);
  if (problem) return problem;
  const refund = sellValue(state, entityId);
  const i = state.buildings.findIndex((b) => b.id === entityId);
  const b = state.buildings[i]!;
  state.sides[side].gold += refund;
  state.sides[side].plots[b.plot]!.building = 0;
  state.buildings.splice(i, 1);
  state.stats[side].buildingsSold++;
  if (b.fielded) state.stats[side].soldAfterFielding++;
  state.events.push({ t: 'buildingSold', id: b.id, side, refund });
  return null;
}

/** Sets one of the side's spawners' merge toggle (§4.4, §5.6), or returns why it can't. */
export function toggleMerge(state: BattleState, side: Side, entityId: number, on: boolean): string | null {
  const problem = toggleProblem(state, side, entityId);
  if (problem) return problem;
  state.buildings.find((b) => b.id === entityId)!.mergeOn = on;
  state.events.push({ t: 'mergeToggled', id: entityId, on });
  return null;
}

/**
 * Buys a gold upgrade for one of the side's spawners (§6.1, #67): its price at once, and from the next Begin
 * its squad arrives Bloomed for the rest of the battle. Or returns why it can't.
 */
export function upgrade(state: BattleState, side: Side, entityId: number): string | null {
  const problem = upgradeProblem(state, side, entityId);
  if (problem) return problem;
  const b = state.buildings.find((x) => x.id === entityId)!;
  const price = upgradePrice(state, side, b.buildingId);
  state.sides[side].gold -= price;
  b.upgrade = { paid: price, fielded: false };
  state.stats[side].upgradesBought = (state.stats[side].upgradesBought ?? 0) + 1;
  state.events.push({ t: 'buildingUpgraded', id: b.id, side, price });
  return null;
}

/**
 * `beginClash`'s planning half (§4.7 step 12, §14.5): only the player's side begins the clash, a bot or
 * general there included (plan Call 8), and not while its draft is open (§8.3). Its clash half,
 * `startClash` in `round.ts`, then fields both armies.
 */
export function beginClash(state: BattleState, side: Side): string | null {
  if (side !== 'player') return 'beginClashNotPlayer';
  if (state.sides[side].draft) return 'draftOpen';
  startClash(state);
  return null;
}

/**
 * Why `plant` would refuse the building on the side's plot now, or null (§4.4, §14.5): the side's draft is
 * open (#28); a card not in the kit; a plot number outside the side's own colony, so never another side's
 * plot; a closed, stump or taken plot; a general's card at its `maxOwned` (§7.8); or too little gold.
 * There's no copy check until R3 (D45).
 */
export function plantProblem(state: BattleState, side: Side, buildingId: string, plot: number): string | null {
  if (state.sides[side].draft) return 'draftOpen';
  if (!inKit(state, side, buildingId)) return 'notInKit';
  const p = state.sides[side].plots[plot];
  if (!p) return 'noSuchPlot';
  if (!p.open) return 'plotClosed';
  if (p.terrain === 'stump') return 'stumpPlot';
  if (p.building) return 'plotTaken';
  if (atMaxOwned(state, side, buildingId)) return 'maxOwned';
  if (state.sides[side].gold < priceOf(state, side, buildingId)) return 'notEnoughGold';
  return null;
}

/** Why `sell` would refuse the entity now, or null: it must be one of the side's buildings, and its draft closed (#28). */
export function sellProblem(state: BattleState, side: Side, entityId: number): string | null {
  if (state.sides[side].draft) return 'draftOpen';
  const b = state.buildings.find((x) => x.id === entityId);
  if (!b) return 'noSuchBuilding';
  return b.side === side ? null : 'notYourBuilding';
}

/** Why `toggleMerge` would refuse the entity now, or null: it must be one of the side's spawners (§4.4). */
export function toggleProblem(state: BattleState, side: Side, entityId: number): string | null {
  const problem = sellProblem(state, side, entityId);
  if (problem) return problem;
  const b = state.buildings.find((x) => x.id === entityId)!;
  return state.compiled[side].buildings[b.buildingId]?.kind === 'spawner' ? null : 'notASpawner';
}

/**
 * Why `upgrade` would refuse the entity now, or null (§6.1, §14.5): `toggleMerge`'s checks (one of the side's
 * spawners, its draft closed), then an upgraded building, a colony with a plot still free, or too little gold.
 */
export function upgradeProblem(state: BattleState, side: Side, entityId: number): string | null {
  const problem = toggleProblem(state, side, entityId);
  if (problem) return problem;
  const b = state.buildings.find((x) => x.id === entityId)!;
  if (b.upgrade) return 'alreadyUpgraded';
  if (!colonyFull(state, side)) return 'colonyNotFull';
  if (state.sides[side].gold < upgradePrice(state, side, b.buildingId)) return 'notEnoughGold';
  return null;
}

/** True once every open plot of the side's colony that can take a building has one (§4.6, §6.1): a stump takes none. */
export function colonyFull(state: BattleState, side: Side): boolean {
  return state.sides[side].plots.every((p) => !buildable(p) || p.building !== 0);
}

/** A gold upgrade's price for the side's building: `upgradeCostPct` of its price, rounded down (§6.1). */
export function upgradePrice(state: BattleState, side: Side, buildingId: string): number {
  return upgradeCost(priceOf(state, side, buildingId), state.library.balance.rounds.upgradeCostPct);
}

/** `upgradePrice` from a building's price and the percentage, which the planning view carries (§6.1). */
export const upgradeCost = (price: number, pct: number): number => Math.floor((price * pct) / 100);

/** Every plot of the side's colony `plant` would take the building on now, in plot order (the UI's ghost and the AI). */
export function legalPlots(state: BattleState, side: Side, buildingId: string): number[] {
  const out: number[] = [];
  state.sides[side].plots.forEach((_, i) => { if (plantProblem(state, side, buildingId, i) === null) out.push(i); });
  return out;
}

/** A building's price for the side: its cost, wherever it stands, with no column term (§4.4, §6.3). */
export function priceOf(state: BattleState, side: Side, buildingId: string): number {
  return state.compiled[side].buildings[buildingId]?.cost ?? Number.MAX_SAFE_INTEGER;
}

/**
 * What selling a building refunds now (§4.4): 100% of its price in the planning phase it was planted in,
 * before it has fielded, and otherwise 60%, rounded down. Its gold upgrade comes back by the same rule, by
 * whether the upgrade has fielded (§6.1). 0 for no building.
 */
export function sellValue(state: BattleState, entityId: number): number {
  const b = state.buildings.find((x) => x.id === entityId);
  if (!b) return 0;
  const c = state.compiled[b.side];
  const refund = (paid: number, fielded: boolean) => Math.floor((paid * (fielded ? c.sellRefundPct : c.sellRefundPlantedPct)) / 100);
  return refund(b.pricePaid, b.fielded) + (b.upgrade ? refund(b.upgrade.paid, b.upgrade.fielded) : 0);
}
