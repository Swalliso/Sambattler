// The economy in rounds (SPEC §6.2, §14.6 opening step 2): income once a round, at its opening from round
// 2, in integers. Each side gets its stipend, each economy building's gold a round (× 1.5 on a loam plot,
// rounded down), interest on the gold it banked at the last Begin, the comeback gold if it lost the last
// round, and any pending gold, which is paid once and zeroed. The general's sources are × `enemyIncomeMult`
// (§7.1), each floored; pending gold is an effect's, and isn't. `incomePreview` is the same figure for the
// next opening.
import { SIDES } from '../state.ts';
import type { BattleState, BuildingState, Side } from '../state.ts';
import { roundOutcome } from './victory.ts';

const BP = 10000;

/** A side's income at a round's opening, by source (§6.2): what the opening pays and `incomePreview` shows. */
export interface IncomeBreakdown {
  stipend: number;
  economy: number;
  interest: number;
  comeback: number;
  pending: number;
  total: number;
}

/** The side's economy buildings standing, in id order. */
const economyBuildings = (state: BattleState, side: Side): BuildingState[] =>
  state.buildings.filter((b) => b.side === side && state.compiled[side].buildings[b.buildingId]?.economy);

/** The side's interest cap (§6.2): its base cap, plus each standing economy building's `interestCapAdd`, such as the Spore Exchange's 10. */
export function interestCapOf(state: BattleState, side: Side): number {
  let cap = state.compiled[side].interestCap;
  for (const b of economyBuildings(state, side)) cap += state.compiled[side].buildings[b.buildingId]!.economy!.interestCapAdd ?? 0;
  return cap;
}

/** A building's gold a round before the general's multiplier (§6.2): its `goldPerRound`, × (100 + the loam bonus)% on a loam plot, rounded down. */
function goldOf(state: BattleState, b: BuildingState): number {
  const c = state.compiled[b.side];
  const gold = c.buildings[b.buildingId]!.economy!.goldPerRound;
  return state.sides[b.side].plots[b.plot]!.terrain === 'loam' ? Math.floor((gold * (100 + c.loamBonusPct)) / 100) : gold;
}

/** The side's income with `banked` gold held at Begin, after a round `loser` lost (null after a draw or before any round). */
function incomeOf(state: BattleState, side: Side, banked: number, loser: Side | null): { income: IncomeBreakdown; byBuilding: [number, number][] } {
  const c = state.compiled[side];
  const mult = (gold: number) => Math.floor((gold * c.incomeBp) / BP);
  const byBuilding = economyBuildings(state, side).map((b): [number, number] => [b.id, mult(goldOf(state, b))]);
  const income: IncomeBreakdown = {
    stipend: mult(c.stipend),
    economy: byBuilding.reduce((n, [, gold]) => n + gold, 0),
    interest: mult(Math.min(interestCapOf(state, side), Math.floor(banked / state.rules.interestPer))),
    comeback: c.comebackEnabled && loser === side ? mult(state.rules.comebackGold) : 0,
    pending: state.sides[side].pendingGold,
    total: 0,
  };
  income.total = income.stipend + income.economy + income.interest + income.comeback + income.pending;
  return { income, byBuilding };
}

/** The last round's loser, who gets the comeback gold (§6.2, §6.7): null after a drawn round, or before the first. */
function lastLoser(state: BattleState): Side | null {
  const last = state.rounds.at(-1);
  return last ? roundOutcome(last.damage).loser : null;
}

/**
 * Pays both sides' income at a round's opening from round 2 (§4.7 step 5, §14.6 opening step 2), on the gold
 * each banked at the last Begin, and zeroes their pending gold. Each source goes to `stats.goldEarned`, and
 * each economy building's gold to `stats.goldByBuilding`. Both sides' `income` events (every source but
 * interest) come first, the player's first, then their `interest` events, as v1's are.
 */
export function payIncome(state: BattleState): Record<Side, IncomeBreakdown> {
  const loser = lastLoser(state);
  const paid = {} as Record<Side, IncomeBreakdown>;
  for (const s of SIDES) {
    const ss = state.sides[s], st = state.stats[s];
    const { income, byBuilding } = incomeOf(state, s, ss.bankedAtBegin, loser);
    ss.gold += income.total;
    ss.pendingGold = 0;
    for (const k of ['stipend', 'economy', 'interest', 'comeback', 'pending'] as const) st.goldEarned[k] += income[k];
    for (const [id, gold] of byBuilding) st.goldByBuilding[String(id)] = (st.goldByBuilding[String(id)] ?? 0) + gold;
    state.events.push({ t: 'income', side: s, amount: income.total - income.interest });
    paid[s] = income;
  }
  for (const s of SIDES) if (paid[s].interest > 0) state.events.push({ t: 'interest', side: s, amount: paid[s].interest });
  return paid;
}

/**
 * The income the side's next opening pays as the battle stands (§6.2, §10.2, §14.6): in planning, on the
 * gold it holds now, as if planning ended now; once its clash has begun, on the gold it banked. The comeback
 * counts once the round is scored, since its loser isn't known before. It writes nothing.
 */
export function incomePreview(state: BattleState, side: Side): IncomeBreakdown {
  const ss = state.sides[side];
  const scored = state.phase === 'aftermath' || state.phase === 'ended';
  return incomeOf(state, side, state.phase === 'planning' ? ss.gold : ss.bankedAtBegin, scored ? lastLoser(state) : null).income;
}
