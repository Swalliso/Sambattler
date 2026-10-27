// The counter cycle (SPEC §7.4) and intel doctrines (§7.6) of an adaptive general. At each scheduled
// analysis it reads the opponent's spawn mix, picks one of four counter kinds (noise from the `ai`
// stream), warns, and drafts a missing counter blueprint; two waves later the counter activates:
// counter-set weights ×3, everything else ×0.6, selling for space if it is cramped. It acts only
// through its kit, its purchase weights and ordinary `sell` commands, so it never cheats on gold.
import { queueCommand } from '../commands.ts';
import { recompile } from '../draft.ts';
import { legalPlacements } from '../placement.ts';
import { nextSigned } from '../rng.ts';
import { COUNTER_KINDS, other } from '../state.ts';
import type {
  AiState, BattleState, BuildingState, CounterKind, CounterRecord, CounterState, IntelProfile, Library, OpeningDoctrine,
  Rules, Side,
} from '../state.ts';
import { buildingDef, isBesieged } from '../world.ts';

/** Tie order when two kinds score the same: Elite, Armor, Line, Swarm (SPEC §7.4). */
const TIE_ORDER: readonly CounterKind[] = ['elite', 'armor', 'line', 'swarm'];

export const zeroProfile = (): IntelProfile => ({ swarm: 0, line: 0, armor: 0, elite: 0 });

/**
 * The kinds a building counters, from its base data: a spawner by its unit, a tower by its attack
 * (Anti-Swarm: splash or slash; Anti-Line: pierce; Anti-Armor: crush or siege; Anti-Elite: slayer).
 */
export function counterKindsOf(lib: Library, buildingId: string): CounterKind[] {
  const b = lib.buildings[buildingId];
  if (!b) return [];
  let type: string, splash: boolean, tags: readonly string[] = [];
  if (b.spawn) {
    const u = lib.units[b.spawn.unit];
    if (!u || u.heal) return [];
    type = u.damageType; splash = (u.splashRadius ?? 0) > 0; tags = u.tags;
  } else if (b.attack) {
    type = b.attack.damageType; splash = (b.attack.splashRadius ?? 0) > 0;
  } else {
    return [];
  }
  const out: CounterKind[] = [];
  if (splash || type === 'slash') out.push('swarm');
  if (type === 'pierce') out.push('line');
  if (type === 'crush' || tags.includes('siege')) out.push('armor');
  if (tags.includes('slayer')) out.push('elite');
  return out;
}

/** Counter-set buildings per kind within a roster, in roster order. */
export function counterSets(lib: Library, roster: readonly string[]): Record<CounterKind, string[]> {
  const sets: Record<CounterKind, string[]> = { swarm: [], line: [], armor: [], elite: [] };
  for (const id of roster) for (const k of counterKindsOf(lib, id)) sets[k].push(id);
  return sets;
}

export interface MixAnalysis {
  /** Σ spawn supply rate over the side's standing spawners (0: nothing to read). */
  total: number;
  shares: { light: number; medium: number; heavy: number; ranged: number; elite: number };
  /** The four kinds' scores before noise. */
  scores: IntelProfile;
}

/** Wave index of a tick: wave n (1-based) covers [(n − 1)·waveTicks, n·waveTicks). */
const waveOf = (state: BattleState, tick: number): number => Math.floor(tick / state.rules.waveTicks);

/**
 * Fraction of `b`'s units spawned in the two waves before `tick` that were knit into merges by now
 * (SPEC §7.4 step 3). A toggle left on with no actual merges reads 0.
 */
export function mergedFraction(state: BattleState, track: CounterState | undefined, buildingId: number, tick = state.tick): number {
  const t = track?.track[String(buildingId)];
  if (!t) return 0;
  const last = waveOf(state, Math.max(0, tick - 1));
  let spawned = 0, merged = 0;
  for (const w of [last - 1, last]) {
    spawned += t.spawned[String(w)] ?? 0;
    merged += t.merged[String(w)] ?? 0;
  }
  return spawned > 0 ? Math.min(1, merged / spawned) : 0;
}

/**
 * The spawn-mix analysis of `observed` (SPEC §7.4): supply rates of its standing spawners turned
 * into armor, ranged and real-merging shares, and the four kinds' scores. `track` is the observer's
 * counter state (spawn and merge counts); without it the Elite share is 0.
 */
export function analyzeMix(state: BattleState, observed: Side, track?: CounterState): MixAnalysis {
  const cr = state.rules.ai.counter;
  let total = 0, light = 0, medium = 0, heavy = 0, ranged = 0, elite = 0;
  for (const b of state.buildings) {
    if (b.side !== observed || b.hp <= 0) continue;
    const sp = buildingDef(state, b).spawn;
    if (!sp) continue;
    const u = state.compiled[observed].units[sp.unit]!;
    const rate = (sp.count * u.tiers[0].supply) / sp.intervalHalfTicks;
    total += rate;
    if (u.armor === 'light') light += rate; else if (u.armor === 'medium') medium += rate; else heavy += rate;
    if (u.tags.includes('ranged')) ranged += rate;
    if (b.mergeOn) elite += rate * mergedFraction(state, track, b.id);
  }
  const share = (x: number) => (total > 0 ? x / total : 0);
  const shares = { light: share(light), medium: share(medium), heavy: share(heavy), ranged: share(ranged), elite: share(elite) };
  return {
    total,
    shares,
    scores: {
      swarm: shares.light * (1 - cr.swarmEliteDiscount * shares.elite),
      line: shares.medium,
      armor: shares.heavy,
      elite: cr.eliteScoreMult * shares.elite,
    },
  };
}

/** The highest-scoring kind, ties resolved Elite, Armor, Line, Swarm. */
export function topKind(scores: IntelProfile): CounterKind {
  let best: CounterKind = TIE_ORDER[0]!;
  for (const k of TIE_ORDER) if (scores[k] > scores[best]) best = k;
  return best;
}

/** The top `n` kinds with a positive score, in score order (ties as {@link topKind}). */
export function topKinds(scores: IntelProfile, n: number): CounterKind[] {
  const ranked = [...TIE_ORDER].sort((a, b) => scores[b] - scores[a] || TIE_ORDER.indexOf(a) - TIE_ORDER.indexOf(b));
  return ranked.filter((k) => scores[k] > 0).slice(0, n);
}

/** Adds the seeded noise (±`noise`, drawn Swarm, Line, Armor, Elite) and picks the kind (SPEC §7.4 step 5). */
export function pickKind(state: BattleState, scores: IntelProfile): CounterKind {
  const noisy = zeroProfile();
  for (const k of COUNTER_KINDS) noisy[k] = scores[k] + nextSigned(state.rng.ai) * state.rules.ai.counter.scoreNoise;
  return topKind(noisy);
}

/** The schedule an adaptive general runs: the regular cycles, plus the early one for the boss. */
export function counterSchedule(rules: Rules, boss: boolean): CounterState['schedule'] {
  const all = [...rules.ai.counter.cycles, ...(boss ? rules.ai.counter.bossCycles : [])];
  return all.map((c) => ({ ...c })).sort((a, b) => a.analyzeTick - b.analyzeTick);
}

export function newCounterState(rules: Rules, boss: boolean): CounterState {
  return { schedule: counterSchedule(rules, boss), history: [], current: -1, track: {}, waveIds: [], samples: [] };
}

/**
 * The opening doctrine an intel file gives (SPEC §7.6): its top kind at ×2 / ×0.8, or for the boss
 * its top two kinds at ×2.5 each for the whole battle. An empty file gives none.
 */
export function openingDoctrine(rules: Rules, intel: IntelProfile | undefined, boss: boolean): OpeningDoctrine | undefined {
  if (!intel) return undefined;
  const cr = rules.ai.counter;
  const kinds = topKinds(intel, boss ? 2 : 1);
  if (!kinds.length) return undefined;
  return boss
    ? { kinds, mult: cr.dualMult, otherMult: 1, dual: true }
    : { kinds, mult: cr.openingMult, otherMult: cr.openingOtherMult, dual: false };
}

/** The active counter's record, if one has activated. */
export function activeCounter(ai: AiState): CounterRecord | undefined {
  const c = ai.counter;
  return c && c.current >= 0 ? c.history[c.current] : undefined;
}

/** Is the opening doctrine still in force (a single-kind one ends when the first counter activates)? */
export function openingActive(ai: AiState): boolean {
  return !!ai.opening && (ai.opening.dual || !activeCounter(ai));
}

/** The doctrine multiplier on a building's purchase weight: the active counter × the opening doctrine. */
export function doctrineMult(state: BattleState, ai: AiState, buildingId: string): number {
  const sets = ai.counterSets;
  if (!sets) return 1;
  let m = 1;
  const rec = activeCounter(ai);
  if (rec) m *= sets[rec.kind].includes(buildingId) ? state.rules.ai.counter.counterMult : state.rules.ai.counter.otherMult;
  if (openingActive(ai)) {
    const o = ai.opening!;
    m *= o.kinds.some((k) => sets[k].includes(buildingId)) ? o.mult : o.otherMult;
  }
  return m;
}

// ---- tracking the observed side's spawns and merges (for the Elite share) ----

/** The adaptive AI watching `observed`, if any. */
function watcher(state: BattleState, observed: Side): CounterState | undefined {
  return state.sides[other(observed)].ai?.counter;
}

/** Spawning hook: `count` units from `b`, the first with id `firstId`. */
export function noteSpawn(state: BattleState, b: BuildingState, firstId: number, count: number): void {
  const c = watcher(state, b.side);
  if (!c) return;
  const w = waveOf(state, state.tick);
  const key = String(b.id);
  const t = c.track[key] ?? (c.track[key] = { spawned: {}, merged: {} });
  t.spawned[String(w)] = (t.spawned[String(w)] ?? 0) + count;
  const last = c.waveIds[c.waveIds.length - 1];
  if (!last || last[0] < w) c.waveIds.push([w, firstId]);
}

/** Merging hook: tier-1 units of `side` knit into a merge count against their spawner and spawn wave. */
export function noteMerged(state: BattleState, side: Side, unitId: number, sourceBuildingId: number): void {
  const c = watcher(state, side);
  if (!c) return;
  const t = c.track[String(sourceBuildingId)];
  if (!t) return;
  let w = -1;
  for (const [wave, first] of c.waveIds) if (first <= unitId) w = wave; else break;
  if (w < 0) return;
  t.merged[String(w)] = (t.merged[String(w)] ?? 0) + 1;
}

/** Placement hook: a counter-set building placed while that counter is active counts toward the report. */
export function noteBuilt(state: BattleState, side: Side, buildingId: string): void {
  const ai = state.sides[side].ai;
  const rec = ai && activeCounter(ai);
  if (!rec || !ai.counterSets![rec.kind].includes(buildingId)) return;
  rec.built[buildingId] = (rec.built[buildingId] ?? 0) + 1;
}

// ---- the cycle ----

/** Runs due activations and analyses (every tick; the schedule falls on AI-think ticks). */
export function counterTick(state: BattleState, side: Side): void {
  const ai = state.sides[side].ai;
  const c = ai?.counter;
  if (!ai || !c) return;
  for (let i = 0; i < c.history.length; i++) {
    const rec = c.history[i]!;
    if (!rec.active && rec.activeAt <= state.tick) activate(state, side, ai, i);
  }
  while (c.schedule.length && c.schedule[0]!.analyzeTick <= state.tick) {
    const cycle = c.schedule.shift()!;
    analyze(state, side, ai, cycle.activeTick);
  }
}

function analyze(state: BattleState, side: Side, ai: AiState, activeTick: number): void {
  const c = ai.counter!;
  const a = analyzeMix(state, other(side), c);
  c.samples.push({ tick: state.tick, scores: a.scores, total: a.total });
  if (a.total <= 0) return; // nothing to read: this cycle passes
  const kind = pickKind(state, a.scores);
  const rec: CounterRecord = { kind, warnedAt: state.tick, activeAt: activeTick, active: false, scores: a.scores, sold: [], built: {} };
  const drafted = draftMissingCounter(state, side, ai, kind);
  if (drafted) rec.drafted = drafted;
  c.history.push(rec);
  state.events.push({ t: 'counterWarned', side, kind, activatesAtTick: activeTick });
}

/** Adds the cheapest counter blueprint from the roster when the kit has none (SPEC §7.4, D11). */
function draftMissingCounter(state: BattleState, side: Side, ai: AiState, kind: CounterKind): string | null {
  const ss = state.sides[side];
  const set = ai.counterSets?.[kind] ?? [];
  if (!set.length || set.some((id) => ss.kit.includes(id))) return null;
  let best: string | null = null;
  for (const id of set) {
    const def = state.library.buildings[id];
    if (!def) continue;
    if (!best || def.cost < state.library.buildings[best]!.cost) best = id;
  }
  if (!best) return null;
  ss.kit.push(best);
  recompile(state);
  if (!ai.weights.some((w) => w.building === best)) ai.weights.push({ building: best, weight: 1, maxOwned: -1, afterTick: 0 });
  return best;
}

function activate(state: BattleState, side: Side, ai: AiState, index: number): void {
  const c = ai.counter!;
  const rec = c.history[index]!;
  rec.active = true;
  c.current = index;
  ai.target = null; // re-pick under the new weights
  state.events.push({ t: 'counterActive', side, kind: rec.kind });
  sellForSpace(state, side, ai, rec);
}

/** Non-overlapping legal 2×2 positions in the side's territory, counted greedily up to `want`. */
export function freeSlots(state: BattleState, side: Side, buildingId: string, want: number): number {
  const placed: { col: number; row: number }[] = [];
  for (const p of legalPlacements(state, side, buildingId)) {
    if (placed.some((q) => q.col < p.col + 2 && p.col < q.col + 2 && q.row < p.row + 2 && p.row < q.row + 2)) continue;
    placed.push({ col: p.col, row: p.row });
    if (placed.length >= want) break;
  }
  return placed.length;
}

/**
 * With fewer than `freeSlots` free 2×2 slots, sells spawners outside the counter set that fare worst
 * against the opponent's dominant armor (lowest matrix multiplier), rearmost first (SPEC §7.4).
 */
function sellForSpace(state: BattleState, side: Side, ai: AiState, rec: CounterRecord): void {
  const cr = state.rules.ai.counter;
  const set = ai.counterSets![rec.kind];
  const probe = set.find((id) => state.sides[side].kit.includes(id) && state.compiled[side].buildings[id]);
  if (!probe) return;
  const free = freeSlots(state, side, probe, cr.freeSlots);
  const need = Math.min(cr.maxSells, cr.freeSlots - free);
  if (need <= 0) return;
  const mix = analyzeMix(state, other(side), ai.counter).shares;
  const armor = mix.heavy > mix.medium && mix.heavy > mix.light ? 'heavy' : mix.medium > mix.light ? 'medium' : 'light';
  const candidates = state.buildings.filter((b) => {
    if (b.side !== side || b.hp <= 0 || set.includes(b.buildingId) || isBesieged(state, b)) return false;
    return !!buildingDef(state, b).spawn;
  }).map((b) => {
    const u = state.compiled[side].units[buildingDef(state, b).spawn!.unit]!;
    return { b, mult: state.rules.matrix[u.damageType][armor] };
  });
  const rear = (b: BuildingState) => (side === 'enemy' ? -b.col : b.col);
  candidates.sort((x, y) => x.mult - y.mult || rear(x.b) - rear(y.b) || x.b.id - y.b.id);
  for (const { b } of candidates.slice(0, need)) {
    queueCommand(state, { tick: state.tick + 1, side, type: 'sell', entityId: b.id });
    rec.sold.push(b.buildingId);
  }
}
