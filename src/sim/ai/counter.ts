// The counter cycle in rounds (SPEC §7.4, §7.6): in the planning phase of each of its cycles an adaptive general
// reads what the other side fielded in the rounds before, from the `fielded` record alone, picks one of five
// kinds with seeded noise from its own AI stream, and activates the counter at once (#31): its set's weights ×3
// and the rest ×0.6, a missing answer listed, and spawners sold for room. An intel file gives it an opening
// doctrine (§7.6). It reads only the planning view and acts only through the planner's commands, so it never
// cheats on gold.
import { nextSigned } from '../rng.ts';
import { COUNTER_KINDS, other } from '../state.ts';
import type { AiState, BuildingState, CompiledUnit, CounterKind, CounterRecord, CounterState, IntelProfile } from '../state.ts';
import { freePlots } from './formationScore.ts';
import type { PlanningView } from './view.ts';

/** Ties between kinds go Elite, Armor, Line, Ranged, Swarm (§7.4; Ranged's place is #14's first guess). */
const TIE_ORDER: readonly CounterKind[] = ['elite', 'armor', 'line', 'ranged', 'swarm'];
/** The dominant armor's ties go Heavy, Medium, Light, the kinds' order. */
const ARMORS = ['heavy', 'medium', 'light'] as const;
export type BodyArmor = (typeof ARMORS)[number];
/** A unit's parts by tier (§5.6): a Bloomed unit is 3, an Elder 9. */
const PARTS = [1, 3, 9] as const;

export interface FieldedAnalysis {
  /** The supply read, every unit at its parts' base supply (R2-Q3): 0 when nothing was fielded. */
  total: number;
  shares: Record<BodyArmor, number> & { ranged: number; elite: number };
  /** The kinds' scores before the noise. */
  scores: Record<CounterKind, number>;
}

/**
 * What the other side fielded in rounds `from` to `to` (§7.4, R2-Q3): every unit at its parts' base supply, an
 * Elder its 9 parts' and a Bloomed unit its 3, as shares of armor, of ranged units, and of Elders, the only
 * elite, with the five kinds' scores. Counting parts replaced the combat rework's swarm read, which is gone (A109).
 */
export function analyzeFielded(view: PlanningView, from: number, to: number): FieldedAnalysis {
  const k = view.counterKnobs;
  const sum = { light: 0, medium: 0, heavy: 0, ranged: 0, elite: 0 };
  let total = 0;
  for (const r of view.rounds) {
    if (r.round < from || r.round > to) continue;
    for (const f of r.fielded[other(view.side)]) {
      const u = view.theirUnits[f.unitId];
      if (!u || u.emplacement) continue;
      const supply = f.count * PARTS[f.tier - 1]! * u.tiers[0].supply;
      total += supply;
      if (u.armor !== 'structure') sum[u.armor] += supply;
      if (u.tags.includes('ranged')) sum.ranged += supply;
      if (f.tier === 3) sum.elite += supply;
    }
  }
  const share = (x: number) => (total > 0 ? x / total : 0);
  const shares = { light: share(sum.light), medium: share(sum.medium), heavy: share(sum.heavy), ranged: share(sum.ranged), elite: share(sum.elite) };
  return {
    total,
    shares,
    scores: {
      swarm: shares.light * (1 - k.swarmEliteDiscount * shares.elite),
      line: shares.medium,
      armor: shares.heavy,
      elite: k.eliteScoreMult * shares.elite,
      ranged: shares.ranged,
    },
  };
}

/** The highest-scoring kind, ties by {@link TIE_ORDER}. */
export function topKind(scores: Record<CounterKind, number>): CounterKind {
  let best = TIE_ORDER[0]!;
  for (const k of TIE_ORDER) if (scores[k] > scores[best]) best = k;
  return best;
}

/** The top `n` kinds that score above 0, in score order, ties by {@link TIE_ORDER}. */
export function topKinds(scores: IntelProfile, n: number): CounterKind[] {
  const of = (k: CounterKind) => scores[k] ?? 0;
  return [...TIE_ORDER].sort((a, b) => of(b) - of(a) || TIE_ORDER.indexOf(a) - TIE_ORDER.indexOf(b)).filter((k) => of(k) > 0).slice(0, n);
}

/** Step 5 (§7.4): seeded noise of ±`scoreNoise` on each score, drawn in `COUNTER_KINDS`' order from its own stream, and the highest. */
function pickKind(view: PlanningView, scores: Record<CounterKind, number>): CounterKind {
  const noisy = { ...scores };
  for (const k of COUNTER_KINDS) noisy[k] += nextSigned(view.rng) * view.counterKnobs.scoreNoise;
  return topKind(noisy);
}

/** The dominant armor: the largest share, ties Heavy, Medium, Light (§7.4). */
export function dominantArmor(shares: FieldedAnalysis['shares']): BodyArmor {
  let best: BodyArmor = ARMORS[0];
  for (const a of ARMORS) if (shares[a] > shares[best]) best = a;
  return best;
}

/** The unit a spawner fields, or undefined for any other building. */
function spawnerUnit(view: PlanningView, buildingId: string): CompiledUnit | undefined {
  const card = view.cards[buildingId];
  return card?.kind === 'spawner' && card.squad ? view.units[card.squad.unit] : undefined;
}

/**
 * The kinds a card counters (§7.4, #14, #15), from its spawner's unit: Anti-Swarm for splash or slash, Anti-Line
 * for pierce, Anti-Armor for crush or siege, Anti-Elite for slayers, and Anti-Ranged for the swarm. A swarm unit
 * answers neither a swarm nor a line (A056), and a unit that deals no damage, such as a healer, is in no set
 * (A055). Towers, economy and utility buildings field no squad, so they're in no set.
 */
export function counterKindsOf(view: PlanningView, buildingId: string): CounterKind[] {
  const u = spawnerUnit(view, buildingId);
  if (!u || u.support || u.tiers[0].damage <= 0) return [];
  const swarm = u.tags.includes('swarm');
  const out: CounterKind[] = [];
  if (!swarm && (u.tiers[0].splashRadius > 0 || u.damageType === 'slash')) out.push('swarm');
  if (!swarm && u.damageType === 'pierce') out.push('line');
  if (u.damageType === 'crush' || u.siege) out.push('armor');
  if (u.slayer) out.push('elite');
  if (swarm) out.push('ranged');
  return out;
}

/** Each kind's set in its kit, the faction roster in a single battle (D45), by building id. */
export function counterSets(view: PlanningView): Record<CounterKind, string[]> {
  const sets = Object.fromEntries(COUNTER_KINDS.map((k) => [k, [] as string[]])) as Record<CounterKind, string[]>;
  const ids = view.kit.map((c) => c.building).sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
  for (const id of ids) for (const k of counterKindsOf(view, id)) sets[k].push(id);
  return sets;
}

/** Whether a card's unit beats the armor: a matrix multiplier above 1 (§5.3). */
const beats = (view: PlanningView, buildingId: string, armor: BodyArmor): boolean => {
  const u = spawnerUnit(view, buildingId);
  return !!u && view.matrix[u.damageType][armor] > 1;
};

/** The cheapest card, ties by id (§7.3). */
function cheapest(view: PlanningView, ids: string[]): string | null {
  let best: string | null = null;
  for (const id of ids) {
    const c = view.cards[id]!.cost, b = best === null ? Infinity : view.cards[best]!.cost;
    if (c < b || (c === b && id < best!)) best = id;
  }
  return best;
}

/**
 * The missing answer (§7.4, #15, A056): the cheapest card of the set whose unit beats the dominant armor, else
 * the set's cheapest. With no card in the set, the cheapest spawner whose unit beats it, if one does.
 */
export function missingAnswer(view: PlanningView, set: string[], armor: BodyArmor): string | null {
  const pool = set.length ? set : view.kit.map((c) => c.building).filter((id) => counterKindsOf(view, id).length > 0);
  const winners = pool.filter((id) => beats(view, id, armor));
  return cheapest(view, winners.length || !set.length ? winners : pool);
}

/**
 * What it sells for room at an activation (§7.4): with fewer than `freePlots` free plots, enough to free them
 * and at most `maxSells`, of its spawners outside the counter set, those whose units fare worst against the
 * dominant armor first (the lowest matrix multiplier), then the rearmost, the lower file, the building id and the entity id.
 */
export function sellsForRoom(view: PlanningView, set: string[], armor: BodyArmor): BuildingState[] {
  const need = Math.min(view.counterKnobs.maxSells, view.knobs.counter.freePlots - freePlots(view).length);
  if (need <= 0) return [];
  const mult = (b: BuildingState) => view.matrix[spawnerUnit(view, b.buildingId)!.damageType][armor];
  const plot = (b: BuildingState) => view.plots[b.plot]!;
  return view.buildings
    .filter((b) => spawnerUnit(view, b.buildingId) && !set.includes(b.buildingId))
    .sort((a, b) => mult(a) - mult(b) || plot(b).rank - plot(a).rank || plot(a).file - plot(b).file
      || (a.buildingId < b.buildingId ? -1 : a.buildingId > b.buildingId ? 1 : 0) || a.id - b.id)
    .slice(0, need);
}

/**
 * The counter cycle's state for a new battle (§7.4, §7.6): `cycles` and, for the boss, `bossCycles`, in round
 * order, and the opening doctrine an intel file gives: its top kind, or the boss's top two for the whole battle.
 */
export function newCounterState(knobs: { cycles: CounterState['cycles']; bossCycles: CounterState['cycles'] }, boss: boolean, intel?: IntelProfile): CounterState {
  const cycles = [...knobs.cycles, ...(boss ? knobs.bossCycles : [])].map((c) => ({ ...c })).sort((a, b) => a.round - b.round || a.from - b.from);
  const c: CounterState = { cycles, history: [] };
  const kinds = intel ? topKinds(intel, boss ? 2 : 1) : [];
  if (kinds.length) c.opening = { kinds, dual: boss };
  return c;
}

/**
 * Step 1 of the turn (§7.2, §7.4): the cycle due this round, if any. One whose rounds fielded nothing passes.
 * Otherwise the counter activates now (#31): it's recorded, a missing answer joins the weights it buys by, and it
 * sells for room through `sell`, which says whether the sale ran. It returns the activation's record, or null.
 */
export function runCycle(view: PlanningView, ai: AiState, sell: (b: BuildingState) => boolean): CounterRecord | null {
  const c = ai.counter;
  const cycle = c?.cycles.find((x) => x.round === view.round);
  if (!c || !cycle) return null;
  const a = analyzeFielded(view, cycle.from, view.round - 1);
  if (a.total <= 0) return null;
  const kind = pickKind(view, a.scores);
  const rec: CounterRecord = { round: view.round, from: cycle.from, kind, scores: a.scores, sold: [] };
  const armor = dominantArmor(a.shares);
  const set = counterSets(view)[kind];
  // the kit is the faction roster in a single battle (D45), and the general buys only the cards it lists (R2-Q4),
  // so an answer is missing when it lists none of the set; v1's weight for an added card is 1
  if (!set.some((id) => ai.weights.some((w) => w.building === id && w.weight > 0))) {
    const id = missingAnswer(view, set, armor);
    if (id) {
      ai.weights = [...ai.weights.filter((w) => w.building !== id), { building: id, weight: 1 }]
        .sort((x, y) => (x.building < y.building ? -1 : x.building > y.building ? 1 : 0));
      rec.added = id;
    }
  }
  c.history.push(rec);
  for (const b of sellsForRoom(view, set, armor)) if (sell(b)) rec.sold.push(b.buildingId);
  return rec;
}

/**
 * The doctrine's multiplier on a card's weight (§7.4, §7.6): the counter in force, ×3 on its set and ×0.6 on the
 * rest, and the opening doctrine while it holds: ×2 and ×0.8 until the first activation, or the boss's ×2.5 on
 * either of its two sets for the whole battle. 1 for a side with no counter cycle.
 */
export function doctrineMult(view: PlanningView, buildingId: string): number {
  const c = view.ai?.counter;
  if (!c) return 1;
  const k = view.counterKnobs, kinds = counterKindsOf(view, buildingId);
  const now = c.history.at(-1);
  let m = now ? (kinds.includes(now.kind) ? k.counterMult : k.otherMult) : 1;
  if (c.opening && (c.opening.dual || !now)) {
    const hit = c.opening.kinds.some((x) => kinds.includes(x));
    m *= c.opening.dual ? (hit ? k.dualMult : 1) : hit ? k.openingMult : k.openingOtherMult;
  }
  return m;
}

/** The kind that answers what the other side fielded last round, before any noise; null in round 1 or after a round it fielded nothing. */
export function lastAnswer(view: PlanningView): CounterKind | null {
  const a = analyzeFielded(view, view.round - 1, view.round - 1);
  return a.total > 0 ? topKind(a.scores) : null;
}

/** The counter in force for the Intent panel and the report (§7.5): the last activation, if any. */
export const counterInForce = (ai: AiState | undefined): CounterRecord | undefined => ai?.counter?.history.at(-1);
