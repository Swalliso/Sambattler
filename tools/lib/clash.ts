// R1's clash check (SPEC §16 R1, §12.2), on the round sim since R2b (T158): whole armies at equal gold meet
// at once, in formation. This part builds the armies: each spawner's squad (§11.2), the army cards, and an
// army from a bot spec and a gold budget (R1-Q2, R1-Q4). Then the fields, the line and the slot each building
// takes (R1-Q1, R1-Q9). `playRoundClash` plays two armies' colonies through one round on the round sim
// (R2a/T116), and `clashRecord` reads a clash's record for R1's bars from it. Fields with no round source left
// the record in R2b: the cap reading after the muster (#13), how each lane ended (§6.7's E1–E6), the damage
// supply, the arrival before the muster, parked units and lanes held by emplacements, with v1's movement and
// targeting switches and the squad variants on v1's timers. v2's numbers that aren't in the data yet are
// named here (plan call 19).
import type { Content } from '../../src/data/registry.ts';
import type { ScenarioDef } from '../../src/data/schema.ts';
import { basePlots, buildable, colonyPlots } from '../../src/sim/colony.ts';
import { overflows, slotGrid } from '../../src/sim/formation.ts';
import type { FieldGeom } from '../../src/sim/formation.ts';
import {
  SIDES, analyzeFielded, bloomTrios, commandStamp, createBattle, createFromScenario, hash32, makeRoundConfig, nextFloat, other, planningView, queueCommand,
  runHeadless, seedStream, step, topKinds,
} from '../../src/sim/index.ts';
import type { BattleState, CounterKind, IntelProfile, Side } from '../../src/sim/index.ts';
import { nextSigned } from '../../src/sim/rng.ts';
import { clampToLane, unitRadius } from '../../src/sim/world.ts';
import { rosterIds } from './roster.ts';

/** v2's clash numbers, until R2a puts them in the data (§4.6, §5.6, §6.7, §12.3). */
export const CLASH = {
  /** Tiles between the two front ranks (§4.6). */
  gapTiles: 6,
  /** The muster: 1 s in which squads knit and nobody moves or attacks (§5.6). */
  musterTicks: 20,
  /** A clash ends at 45 s, the muster counted (§6.7, §18.2 #13). */
  capTicks: 900,
  /** The most Heartcap damage one round deals (§6.7). */
  damageCap: 500,
  /** G13: at most this share of clashes reach the cap (§12.3). */
  g13StallShare: 0.15,
  /** G13's target for the median clash length, in seconds, reported beside the bar (§12.3). */
  g13MedianSeconds: [20, 40],
} as const;

/** One building of an army: a spawner's squad, or a tower fielded as an emplacement. */
export interface ArmyEntry {
  buildingId: string;
  kind: 'squad' | 'emplacement';
  /** The squad's unit; an emplacement has none. */
  unitId?: string;
  /** The squad's units; 1 for an emplacement. */
  count: number;
  /** Whether the squad's units merge; an emplacement never does. */
  mergeOn: boolean;
}

/** An army built from a bot spec at a gold budget, in build-list order. */
export interface Army {
  controller: string;
  budget: number;
  spent: number;
  entries: ArmyEntry[];
  /** The squads' supply at tier 1; an emplacement counts 0 (§6.7's first guess). */
  supply: number;
  /** The units the squads field. */
  units: number;
}

/** How an army is built past its bot, gold and plots: the copies cap (X4). */
export interface ArmyOpts {
  /**
   * No card more than this many times (X4). A mono's card is capped at it, and its other plots and gold go
   * by `bot:balanced`'s weights (§18.2 #51's recommendation, provisionally).
   */
  copies?: number;
}

/** A spawner's squad (§11.2): the units its data's `squad` fields each round. */
export function squadSize(content: Content, buildingId: string): number {
  const b = content.buildings[buildingId];
  if (!b) throw new Error(`squadSize: unknown building ${buildingId}`);
  if (!b.squad) throw new Error(`squadSize: ${buildingId} fields no squad`);
  return b.squad.count;
}

/**
 * The army cards (§16 R1, A016): the roster's spawners, the Tender's Ring included, and its towers.
 * The economy and utility cards (the Truffle Cellar, the Spore Exchange and the Rhizome Vault) field
 * nothing in a clash, and one clash can't value them.
 */
export function clashArmyIds(content: Content): string[] {
  return rosterIds(content).filter((id) => {
    const kind = content.buildings[id]!.kind;
    return kind === 'spawner' || kind === 'tower';
  });
}

/** What an army takes from its bot: the opener and the weights, army cards only, and its merge policy. */
interface BuildList {
  opener: string[];
  weights: { building: string; weight: number; maxOwned: number }[];
  mergeOn: boolean;
}

const buildLists = new WeakMap<Content, Map<string, BuildList>>();

/**
 * The opener, the weights and `maxOwned` of the AI state the round `createBattle` resolves for `controller`
 * (§7.1), on a battle that's then dropped, with the economy and utility cards filtered out (R1-Q2).
 * `afterRound` is ignored, and "auto" merging reads as on. Neither the seed nor the budget changes them, so
 * each content's lists are kept.
 */
function buildList(content: Content, controller: string): BuildList {
  let lists = buildLists.get(content);
  if (!lists) buildLists.set(content, (lists = new Map()));
  const known = lists.get(controller);
  if (known) return known;
  const ai = createBattle(content, makeRoundConfig(content, { seed: 1, mapId: 'test-flat', player: controller, enemy: 'human' })).sides.player.ai;
  if (!ai) throw new Error(`armyFromBot: ${controller} has no build list`);
  const cards = new Set(clashArmyIds(content));
  const list: BuildList = {
    opener: ai.opener.filter((id) => cards.has(id)),
    weights: ai.weights.filter((w) => cards.has(w.building)).map(({ building, weight, maxOwned }) => ({ building, weight, maxOwned: maxOwned ?? -1 })),
    mergeOn: ai.mergePolicy !== 'off',
  };
  lists.set(controller, list);
  return list;
}

/**
 * The army `controller` builds with `budget` gold of army and `plots` plots (§16 R1, R1-Q2, R1-Q4):
 * its opener first, skipping what doesn't fit, then weighted picks from the army's own stream. A
 * pick that doesn't fit the gold left is skipped and drawing goes on, until no pickable card fits or
 * the plots are full. `maxOwned` holds, and so does `opts.copies`: a mono capped by it then fills its
 * plots by `bot:balanced`'s weights, on the same stream (#51). The stream is keyed by the seed and the
 * bot alone, so an army is the same in both seats and against every opponent.
 */
export function armyFromBot(content: Content, controller: string, budget: number, seed: number, plots: number, opts: ArmyOpts = {}): Army {
  const list = buildList(content, controller);
  const rng = seedStream(hash32(seed, controller, 0), 'ai.player', 0);
  const cost = (id: string): number => content.buildings[id]!.cost;
  const maxOf = new Map(list.weights.map((w) => [w.building, w.maxOwned]));
  const owned = new Map<string, number>();
  const built: string[] = [];
  let gold = budget;
  const copies = opts.copies ?? Infinity;
  const room = (id: string, max = maxOf.get(id) ?? -1): boolean => {
    const n = owned.get(id) ?? 0;
    return (max < 0 || n < max) && n < copies;
  };
  const buy = (id: string): void => {
    gold -= cost(id);
    owned.set(id, (owned.get(id) ?? 0) + 1);
    built.push(id);
  };
  for (const id of list.opener) {
    if (built.length >= plots) break;
    if (cost(id) <= gold && room(id)) buy(id);
  }
  const eff: number[] = [];
  const draw = (weights: BuildList['weights']): void => {
    while (built.length < plots) {
      eff.length = 0;
      let total = 0, fits = false;
      for (const w of weights) {
        const x = room(w.building, w.maxOwned) ? w.weight : 0;
        eff.push(x);
        total += x;
        if (x > 0 && cost(w.building) <= gold) fits = true;
      }
      if (!fits) return;
      // the AI's weighted pick (src/sim/ai/controller.ts)
      let roll = nextFloat(rng) * total;
      let pick = -1;
      for (let i = 0; i < eff.length && pick < 0; i++) {
        roll -= eff[i]!;
        if (roll < 0 && eff[i]! > 0) pick = i;
      }
      for (let i = eff.length - 1; i >= 0 && pick < 0; i--) if (eff[i]! > 0) pick = i;
      const id = weights[pick]!.building;
      if (cost(id) <= gold) buy(id);
    }
  };
  draw(list.weights);
  if (opts.copies !== undefined && controller.startsWith('bot:mono:')) draw(buildList(content, 'bot:balanced').weights);
  return armyOf(content, controller, budget, built, list.mergeOn);
}

/**
 * The army these buildings field, in this build-list order: each spawner its squad (§11.2), each tower
 * itself as an emplacement. `spent` is what they cost.
 */
export function armyOf(content: Content, controller: string, budget: number, buildingIds: readonly string[], mergeOn: boolean): Army {
  let spent = 0;
  const entries = buildingIds.map((id): ArmyEntry => {
    const b = content.buildings[id];
    if (!b) throw new Error(`armyOf: unknown building ${id}`);
    spent += b.cost;
    if (b.kind === 'tower') return { buildingId: id, kind: 'emplacement', count: 1, mergeOn: false };
    if (!b.squad) throw new Error(`armyOf: ${id} fields no squad`);
    return { buildingId: id, kind: 'squad', unitId: b.squad.unit, count: b.squad.count, mergeOn };
  });
  let supply = 0, units = 0;
  for (const e of entries) {
    if (e.kind !== 'squad') continue;
    units += e.count;
    supply += e.count * content.units[e.unitId!]!.supply;
  }
  return { controller, budget, spent, entries, supply, units };
}

/** R1's fields (§16 R1, "Fields"): the one-lane field, Twin Roots, and the three-lane screen (R1-Q9). */
export type FieldId = 'one' | 'twin' | 'three';

/** Each field's map. Units ignore stumps, so `test-flat` stands in for Bogwater Hollow and Stumpfield. */
const FIELD_MAPS: Record<FieldId, string> = { one: 'test-flat', twin: 'twin-roots', three: 'test-3lane' };

/** A plot by its place in a colony (§4.6): its lane, its rank (0 the front) and its file (1 at the lane's top). */
export interface PlotRef {
  lane: number;
  rank: number;
  file: number;
}

/** A field as one side's colony sees it: its geometry and the plots it opens. Both sides open the same ones. */
export interface ClashField {
  id: FieldId;
  mapId: string;
  geom: FieldGeom;
  /** How many plots a side holds. */
  plots: number;
  /** The open plots: both ranks of every lane, then the extra plots in the order they open. */
  open: PlotRef[];
}

/**
 * A field with its base plots, two ranks of one plot per pair of rows (8, 12 and 12 a side, a lane's
 * leftover row holding none, R1-Q9), plus `extraPlots` in a third rank (R1-Q4). These open as §4.6's
 * first guess has it (§18.2 #19): each lane in turn, the top lane first, its files centre-out. So files
 * 2, 3, 1, 4 on one lane; file 2 of each Twin Roots lane, then file 1, then file 3.
 */
export function clashField(content: Content, id: FieldId, opts: { extraPlots?: number } = {}): ClashField {
  const mapId = FIELD_MAPS[id];
  const map = content.maps[mapId];
  if (!map) throw new Error(`clashField: no map ${mapId}`);
  const geom: FieldGeom = { width: map.width, lanes: map.lanes.map(({ rowStart, rowEnd }) => ({ rowStart, rowEnd })), gapTiles: CLASH.gapTiles };
  const open: PlotRef[] = [];
  geom.lanes.forEach((l, lane) => {
    const files = Math.floor((l.rowEnd - l.rowStart + 1) / 2);
    for (let rank = 0; rank < 2; rank++) for (let file = 1; file <= files; file++) open.push({ lane, rank, file });
  });
  const order = geom.lanes.map(centreOut);
  const third: PlotRef[] = [];
  for (let i = 0; i < Math.max(...order.map((o) => o.length)); i++) {
    order.forEach((files, lane) => { if (i < files.length) third.push({ lane, rank: 2, file: files[i]! }); });
  }
  const extra = opts.extraPlots ?? 0;
  if (!Number.isInteger(extra) || extra < 0 || extra > third.length) {
    throw new Error(`clashField: the ${id} field opens 0 to ${third.length} extra plots, not ${extra}`);
  }
  open.push(...third.slice(0, extra));
  return { id, mapId, geom, plots: open.length, open };
}

/**
 * A lane's files from its centre out, by §7.3's `offCentre` (the distance from the file's centre row to
 * the lane's), ties to the lower file: 2, 3, 1, 4 in 8 rows; 2, 1, 3 in 6; 2, 1 in 5, whose leftover row
 * is at the bottom.
 */
function centreOut(lane: { rowStart: number; rowEnd: number }): number[] {
  const files = Math.floor((lane.rowEnd - lane.rowStart + 1) / 2);
  const off = (f: number) => Math.abs(2 * f - 1 - (lane.rowEnd - lane.rowStart + 1) / 2);
  return Array.from({ length: files }, (_, i) => i + 1).sort((a, b) => off(a) - off(b) || a - b);
}

/** Where a building's squad stands (§7.3). */
export type Line = 'front' | 'back';

/** A spawner whose unit has one of these tags stands at the back (§7.3; `burst` moved to the front, T159). */
const BACK_TAGS = ['ranged', 'support'];

/**
 * A building's line, by §7.3's tags (R1-Q1, A006): a spawner whose unit is `ranged` or `support`, and
 * every tower, stands at the back; every other spawner in front, the Burster's among them (T159).
 */
export function lineOf(content: Content, buildingId: string): Line {
  const b = content.buildings[buildingId];
  if (!b) throw new Error(`lineOf: unknown building ${buildingId}`);
  if (b.kind === 'tower') return 'back';
  if (b.kind !== 'spawner' || !b.squad) throw new Error(`lineOf: ${buildingId} isn't an army card`);
  return content.units[b.squad.unit]!.tags.some((t) => BACK_TAGS.includes(t)) ? 'back' : 'front';
}

/**
 * Which lane each building takes on a field of more than one (§16 R1): `line`, the lane with fewer
 * buildings of its line, then fewer in all, then the top lane (R1-Q1, A002); or `general`, §7.3's
 * round-1 rule, the lane with less planned supply, then the lower lane.
 */
export type LanesRule = 'line' | 'general';

/** One building of an army on its plot: its entry, its place in the build list, and the plot. */
export interface Placement extends PlotRef {
  entry: ArmyEntry;
  index: number;
}

/** The ranks a squad of each line tries, in order: a full rank sends it to the nearest other (plan call 1). */
const RANK_ORDER: Record<Line, readonly number[]> = { front: [0, 1, 2], back: [1, 2, 0] };

/**
 * Formation by role (§16 R1, R1-Q1): each building, in build-list order, takes a lane by the lanes
 * rule, then the first free plot of its line's rank there, files centre-out (A012). A full rank sends a
 * front-line squad to the back rank, then the third; a back-line squad to the third rank, then the
 * front. A full lane falls back to another. Returns the placements in build-list order.
 */
export function assignSlots(content: Content, army: Army, field: ClashField, opts: { lanesRule?: LanesRule } = {}): Placement[] {
  if (army.entries.length > field.plots) {
    throw new Error(`assignSlots: ${army.entries.length} buildings, but the ${field.id} field opens ${field.plots} plots a side`);
  }
  const rule = opts.lanesRule ?? 'line';
  const lanes = field.geom.lanes.length;
  // each lane's open plots by rank, files centre-out
  const plots = field.geom.lanes.map((l, lane) => {
    const files = centreOut(l);
    return [0, 1, 2].map((rank) => field.open.filter((p) => p.lane === lane && p.rank === rank).sort((a, b) => files.indexOf(a.file) - files.indexOf(b.file)));
  });
  const free = plots.map((ranks) => ranks.reduce((n, r) => n + r.length, 0));
  const count = { front: new Array<number>(lanes).fill(0), back: new Array<number>(lanes).fill(0) };
  const supply = new Array<number>(lanes).fill(0);
  const taken = new Set<PlotRef>();
  return army.entries.map((entry, index): Placement => {
    const line = lineOf(content, entry.buildingId);
    const all = (l: number) => count.front[l]! + count.back[l]!;
    const better = (l: number, best: number): boolean => rule === 'general'
      ? supply[l]! < supply[best]!
      : count[line][l]! < count[line][best]! || (count[line][l] === count[line][best] && all(l) < all(best));
    let lane = -1;
    for (let l = 0; l < lanes; l++) if (all(l) < free[l]! && (lane < 0 || better(l, lane))) lane = l;
    for (const rank of RANK_ORDER[line]) {
      const plot = plots[lane]![rank]!.find((p) => !taken.has(p));
      if (!plot) continue;
      taken.add(plot);
      count[line][lane]!++;
      if (entry.kind === 'squad') supply[lane]! += entry.count * content.units[entry.unitId!]!.supply;
      return { ...plot, entry, index };
    }
    throw new Error(`assignSlots: lane ${lane} has room but no plot`); // unreachable: a lane with room has a free plot
  });
}

/** The options a clash plays under, beside its armies (A017). Each is v2's first guess unless set. */
export interface ClashOpts {
  /** Merging, at the muster and after it (default on). */
  merging?: boolean;
  /** Plots a side opens past the base ones, in a third rank (R1-Q4; default 0). */
  extraPlots?: number;
  /** How buildings take lanes on a field of more than one (default `line`, R1-Q1). */
  lanesRule?: LanesRule;
}

/** One clash to play: two armies at a budget on a field, a seed, which seat the first army takes, and the jitter. */
export interface ClashJob {
  field: FieldId;
  seed: number;
  /** The side the job's first army plays; the second plays the other. */
  seat: Side;
  armies: [Army, Army];
  /** Up to ± this many tiles per unit per axis, after the muster's knits (default 0, which draws nothing). */
  jitter?: number;
  opts?: ClashOpts;
}

/** A lane's result, as the round locked it (§6.7). */
export interface LaneReading {
  winner: Side | 'draw';
  /** The tick it locked. */
  ticks: number;
  /** Whether the cap decided it. */
  capped: boolean;
  /** Each side's surviving supply. */
  surviving: Record<Side, number>;
  /** What the lane's win dealt to the loser's Heartcap, before the round's cap; 0 for a draw. */
  raw: number;
}

export interface LaneRecord {
  lane: number;
  cap: LaneReading;
}

/** A clash's result (§6.7, R1-Q3). */
export interface ClashReading {
  /** When its last lane locked: the clash's length in ticks. */
  ticks: number;
  /** Whether any lane reached the cap. */
  capped: boolean;
  lanesWon: Record<Side, number>;
  /** Each side's Heartcap damage taken: summed over the lanes it lost, and the round's, capped (storm ×1.0 in round 1). */
  heartcap: Record<Side, { uncapped: number; capped: number }>;
  /** The clash winner (R1-Q3): more lanes won, then more uncapped Heartcap damage dealt, else a draw. */
  winner: Side | 'draw';
  /** §6.7's round result: more Heartcap damage dealt after the cap, else a drawn round. */
  round: Side | 'draw';
}

/** Merges by the tier they made. */
export interface Merges {
  '2': number;
  '3': number;
}

/** §7.4's reading of what an army fielded (R2-Q3): its shares and the five kinds' scores, with no noise, and the top kind. */
export interface KindRead {
  shares: { light: number; medium: number; heavy: number; ranged: number; elite: number };
  scores: IntelProfile;
  /** Null when it fielded nothing the reading scores, such as emplacements alone. */
  top: CounterKind | null;
}

/** A squad too big to stand apart in its slot (§4.6, #11): its units are wider than its grid's spacing. */
export interface Overflow {
  buildingId: string;
  n: number;
  k: number;
  spacing: number;
  /** A unit's width, twice its radius. */
  width: number;
}

/** What one side fielded and did in a clash (§16 R1, "Records"). */
export interface ArmyRecord {
  controller: string;
  entries: ArmyEntry[];
  spent: number;
  buildings: number;
  /** Its units after the muster, by tier, and their supply. */
  mustered: { units: number; supply: number; base: number; bloomed: number; elders: number };
  /** Merges at the muster, and on the field after it. */
  merges: { muster: Merges; field: Merges };
  /** The round's fielded record as §7.4 reads it (`analyzeFielded`). */
  kinds: KindRead;
  overflow: Overflow[];
  /** The most trios Puppet Bloom's circle finds centred on any of its units after the muster (A057, R2-Q7). */
  bloomTrios: number;
}

/** One clash's record (§16 R1, "Records"). */
export interface ClashRecord {
  field: FieldId;
  budget: number;
  seed: number;
  /** The side the job's first army played. */
  seat: Side;
  jitter: number;
  opts: Required<ClashOpts>;
  armies: Record<Side, ArmyRecord>;
  lanes: LaneRecord[];
  cap: ClashReading;
}

/** A job's options with v2's first guesses filled in. */
export function clashOpts(opts: ClashOpts = {}): Required<ClashOpts> {
  return { merging: opts.merging ?? true, extraPlots: opts.extraPlots ?? 0, lanesRule: opts.lanesRule ?? 'line' };
}

// ---- one round clash ----

/** One round clash: two armies on one of R1's fields, a seed, the seat the first army takes, and its options. */
export interface RoundClashJob {
  field: FieldId;
  seed: number;
  /** The side the first army plays; the second plays the other. */
  seat: Side;
  armies: [Army, Army];
  opts?: {
    /** Merging, at the muster and after it (default on); an army's own policy sets each building's toggle. */
    merging?: boolean;
    /** Plots a side opens past the base ones, in a third rank (R1-Q4; default 0). */
    extraPlots?: number;
    lanesRule?: LanesRule;
    /** Per army, whether its front and back ranks trade places, a third rank left where it stands (G16, R2-Q10). */
    swap?: [boolean, boolean];
  };
}

/** A round clash as the tools read it, from the first army's side (`a`) and the second's (`b`). */
export interface RoundClashRecord {
  field: FieldId;
  seed: number;
  seat: Side;
  controllers: [string, string];
  budget: number;
  lanes: { winner: 'a' | 'b' | null; ticks: number; capped: boolean; survivors: [number, number] }[];
  /** The Heartcap damage each army dealt: capped (§6.7), and before the cap, each lane's summed. */
  damage: [number, number];
  uncapped: [number, number];
  /** R1-Q3's winner: more lanes won, then more uncapped damage, else a draw. */
  winner: 'a' | 'b' | 'draw';
  /** The gold each army has left on the field: every unit's HP share of its building's cost a unit. */
  value: [number, number];
  /** The clash's length, its longest lane, the muster counted. */
  ticks: number;
}

/**
 * Each side's slots on R1's field: `assignSlots` over the field's plots that are buildable on that side, since a
 * stump plot holds no building in rounds (§4.6) and R1's field, on v1's sim, has none (Twin Roots' front rank).
 */
function colonyFor(content: Content, army: Army, base: ClashField, side: Side, plots: number, lanesRule?: LanesRule, swap = false): NonNullable<ScenarioDef['sides']['player']['colony']> {
  const own = colonyPlots(content.maps[base.mapId]!, side, plots);
  const open = base.open.filter((r) => {
    const p = own.find((q) => q.lane === r.lane && q.rank === r.rank && q.file === r.file);
    return p !== undefined && buildable(p);
  });
  const traded = (rank: number) => (swap && rank < 2 ? 1 - rank : rank);
  return assignSlots(content, army, { ...base, open, plots: open.length }, lanesRule ? { lanesRule } : {})
    .map((p) => {
      const rank = traded(p.rank);
      if (!open.some((r) => r.lane === p.lane && r.rank === rank && r.file === p.file)) throw new Error(`colonyFor: ${base.id} has no plot at lane ${p.lane}, rank ${rank}, file ${p.file} to trade ranks into`);
      return { building: p.entry.buildingId, lane: p.lane, rank, file: p.file, merge: p.entry.mergeOn };
    });
}

/** The gold value a side has left on the field: each unit's HP share of what its building cost a unit of its squad. */
function fieldValue(state: BattleState, side: Side): number {
  let v = 0;
  for (const u of state.units) {
    if (u.side !== side || u.hp <= 0) continue;
    const b = state.buildings.find((x) => x.id === u.sourceBuildingId);
    const card = b ? state.compiled[side].buildings[b.buildingId] : undefined;
    if (card?.squad) v += (u.hp / u.maxHp) * (card.cost / card.squad.count);
  }
  return v;
}

/** Hooks a clash's reader uses: at the clash's first tick, after the arrival and the muster, and at the round's end. */
export interface RoundClashHooks {
  begun?: (state: BattleState) => void;
  ended?: (state: BattleState) => void;
}

/**
 * One round clash of two armies from R1's `armyFromBot` (or `armyOf`), on the round sim (R2a/T116, §12.2): their
 * slots by R1's `assignSlots` become each side's colony in a round scenario (`createFromScenario`, T029), both
 * sides human; the player's `beginClash` is queued and stepped, which runs the arrival and the muster, then
 * `runHeadless` plays to round 1's end, and `state.rounds[0]` is read. G1's squad duels, G12's clash rows, G16's
 * swaps and R1's clash check (`clashRecord`) play through it.
 */
export function playRoundClash(content: Content, job: RoundClashJob, hooks: RoundClashHooks = {}): RoundClashRecord {
  const opts = job.opts ?? {};
  const base = clashField(content, job.field, { extraPlots: opts.extraPlots ?? 0 });
  const plots = basePlots(content.maps[base.mapId]!) + (opts.extraPlots ?? 0);
  const armyOn = (s: Side): Army => job.armies[s === job.seat ? 0 : 1];
  const swapOn = (s: Side): boolean => opts.swap?.[s === job.seat ? 0 : 1] ?? false;
  const side = (s: Side) => ({ plots, colony: colonyFor(content, armyOn(s), base, s, plots, opts.lanesRule, swapOn(s)) });
  const def: ScenarioDef = {
    id: 'round-clash', description: 'One clash of two armies (R2a/T116).', map: base.mapId,
    flags: { merging: opts.merging ?? true, adaptiveGeneral: false, powers: false },
    sides: { player: side('player'), enemy: side('enemy') },
  };
  const state = createFromScenario(content, def, { seed: job.seed });
  queueCommand(state, { ...commandStamp(state), side: 'player', type: 'beginClash' });
  step(state);
  hooks.begun?.(state);
  runHeadless(state, { until: { round: 1 } });
  hooks.ended?.(state);
  const r = state.rounds[0];
  if (!r) throw new Error(`playRoundClash: the clash on ${job.field}, seed ${job.seed}, never ended`);
  const a = job.seat, b: Side = a === 'player' ? 'enemy' : 'player';
  const ab = (s: Side | null): 'a' | 'b' | null => (s === null ? null : s === a ? 'a' : 'b');
  const lanes = r.lanes.map((l) => ({ winner: ab(l.winner), ticks: l.ticks, capped: l.capped, survivors: [l.survivors[a], l.survivors[b]] as [number, number] }));
  const uncapped = (s: Side) => r.lanes.reduce((n, l) => n + (l.winner === s ? l.damage : 0), 0);
  const won = (w: 'a' | 'b') => lanes.filter((l) => l.winner === w).length;
  const ua = uncapped(a), ub = uncapped(b);
  const winner = won('a') !== won('b') ? (won('a') > won('b') ? 'a' : 'b') : ua !== ub ? (ua > ub ? 'a' : 'b') : 'draw';
  return {
    field: job.field, seed: job.seed, seat: job.seat, controllers: [job.armies[0].controller, job.armies[1].controller], budget: job.armies[0].budget,
    lanes, damage: [r.damage[a], r.damage[b]], uncapped: [ua, ub], winner, value: [fieldValue(state, a), fieldValue(state, b)],
    ticks: Math.max(...r.lanes.map((l) => l.ticks)),
  };
}

/**
 * One clash for R1's bars (§16 R1, plan calls 5–8), played through `playRoundClash`: both armies arrive in
 * formation (the job's first army in its seat) and muster at Begin, then the jitter, if any, moves each unit
 * before the clash's first tick. The record reads the round's result (§6.7): each lane's winner, length,
 * surviving supply and damage, the Heartcaps' damage summed per side and capped, and R1-Q3's winner. Each
 * army's mustered units, merges and Puppet Bloom trios are read at the clash's first tick, and §7.4's reading
 * of its fielded record at the round's end. A clash at jitter 0 draws no random number (both sides are human),
 * which the cache relies on to play it once for every seed (T055).
 */
export function clashRecord(content: Content, job: ClashJob): ClashRecord {
  const opts = clashOpts(job.opts);
  const armies = { [job.seat]: job.armies[0], [other(job.seat)]: job.armies[1] } as Record<Side, Army>;
  const atBegin = {} as Record<Side, Pick<ArmyRecord, 'mustered' | 'overflow' | 'bloomTrios'> & { merges: Merges }>;
  let streams = '', end: BattleState | undefined;
  playRoundClash(content, { field: job.field, seed: job.seed, seat: job.seat, armies: job.armies, opts }, {
    begun: (state) => {
      for (const side of SIDES) {
        atBegin[side] = {
          mustered: fielded(state, side), merges: { ...state.stats[side].merges }, overflow: overflowsOf(state, side, armies[side]),
          bloomTrios: mostBloomTrios(content, state, side),
        };
      }
      jitter(state, job);
      streams = JSON.stringify(state.rng);
    },
    ended: (state) => { end = state; },
  });
  const state = end!;
  if (!(job.jitter! > 0) && JSON.stringify(state.rng) !== streams) throw new Error('clashRecord: a clash at jitter 0 drew a random number, so its seed matters and the cache would merge clashes that differ');
  const r = state.rounds[0]!;
  const lanes = r.lanes.map((l, lane): LaneRecord => ({
    lane, cap: { winner: l.winner ?? 'draw', ticks: l.ticks, capped: l.capped, surviving: { ...l.survivors }, raw: l.winner ? l.damage : 0 },
  }));
  const armyRecord = (side: Side): ArmyRecord => {
    const army = armies[side], b = atBegin[side], all = state.stats[side].merges;
    const read = analyzeFielded(planningView(state, other(side)), 1, 1);
    return {
      controller: army.controller, entries: army.entries, spent: army.spent, buildings: army.entries.length, mustered: b.mustered,
      merges: { muster: b.merges, field: { '2': all['2'] - b.merges['2'], '3': all['3'] - b.merges['3'] } },
      kinds: { shares: read.shares, scores: read.scores, top: topKinds(read.scores, 1)[0] ?? null }, overflow: b.overflow, bloomTrios: b.bloomTrios,
    };
  };
  return {
    field: job.field, budget: job.armies[0].budget, seed: job.seed, seat: job.seat, jitter: job.jitter ?? 0, opts,
    armies: { player: armyRecord('player'), enemy: armyRecord('enemy') }, lanes, cap: scoreReading(lanes, r.damage),
  };
}

/**
 * The measurement's jitter (§12.2, plan call 5): each unit, in id order, moves up to ± `job.jitter` tiles
 * on each axis, uniformly, from the clash's own stream, and is clamped to its lane. It holds its new row.
 * Jitter 0 draws nothing.
 */
function jitter(state: BattleState, job: ClashJob): void {
  const j = job.jitter ?? 0;
  if (!(j > 0)) return;
  const rng = seedStream(hash32(job.seed, `jitter:${job.seat}`, 0), 'combat', 0);
  for (const u of state.units) {
    u.x += nextSigned(rng) * j;
    u.y += nextSigned(rng) * j;
    clampToLane(state, u, unitRadius(state, u));
    u.px = u.x; u.py = u.y; u.slotY = u.y;
  }
}

/** A side's units after the muster, by tier, and their supply. */
function fielded(state: BattleState, side: Side): ArmyRecord['mustered'] {
  const out = { units: 0, supply: 0, base: 0, bloomed: 0, elders: 0 };
  for (const u of state.units) {
    if (u.side !== side) continue;
    out.units++;
    out.supply += u.supply;
    if (u.tier === 1) out.base++; else if (u.tier === 2) out.bloomed++; else out.elders++;
  }
  return out;
}

/** The army's squads that overflow their slots (§4.6, #11), each building and squad size once. */
function overflowsOf(state: BattleState, side: Side, army: Army): Overflow[] {
  const out: Overflow[] = [];
  for (const e of army.entries) {
    if (e.kind !== 'squad' || out.some((o) => o.buildingId === e.buildingId && o.n === e.count)) continue;
    const radius = state.compiled[side].units[e.unitId!]!.tiers[0].radius;
    if (!overflows(e.count, radius)) continue;
    const { k, spacing } = slotGrid(e.count);
    out.push({ buildingId: e.buildingId, n: e.count, k, spacing, width: 2 * radius });
  }
  return out;
}

/** Puppet Bloom's circle (§11.10), from its data. */
function bloomRadius(content: Content): number {
  const power = Object.values(content.commanders).map((c) => c.power).find((p) => p.kind === 'bloom');
  if (!power || !('radius' in power)) throw new Error('clashRecord: no Puppet Bloom in the data');
  return power.radius;
}

/** The most trios `bloomTrios` finds in Puppet Bloom's circle centred on any of a side's units (A057). */
function mostBloomTrios(content: Content, state: BattleState, side: Side): number {
  const radius = bloomRadius(content);
  let most = 0;
  for (const u of state.units) if (u.side === side) most = Math.max(most, bloomTrios(state, side, u.x, u.y, radius).trios.length);
  return most;
}

/**
 * A clash's score (§6.7, R1-Q3): each Heartcap's damage taken, summed over the lanes it lost and as the round
 * capped it (`dealt`, by the side that dealt it). The clash goes to more lanes won, then more uncapped damage
 * dealt, else it's a draw; the round, to more capped damage dealt, else it's a drawn round.
 */
function scoreReading(lanes: readonly LaneRecord[], dealt: Record<Side, number>): ClashReading {
  const won = { player: 0, enemy: 0 }, taken = { player: 0, enemy: 0 };
  for (const { cap: l } of lanes) {
    if (l.winner === 'draw') continue;
    won[l.winner]++;
    taken[other(l.winner)] += l.raw;
  }
  const heartcap = {
    player: { uncapped: taken.player, capped: dealt.enemy },
    enemy: { uncapped: taken.enemy, capped: dealt.player },
  };
  const more = (p: number, e: number): Side | 'draw' => (p > e ? 'player' : e > p ? 'enemy' : 'draw');
  const byLanes = more(won.player, won.enemy);
  return {
    ticks: Math.max(...lanes.map((l) => l.cap.ticks)),
    capped: lanes.some((l) => l.cap.capped),
    lanesWon: won,
    heartcap,
    winner: byLanes !== 'draw' ? byLanes : more(heartcap.enemy.uncapped, heartcap.player.uncapped),
    round: more(heartcap.enemy.capped, heartcap.player.capped),
  };
}

/** A mirror's second army is built on seed 1,000 + s, so the two armies differ (Technical context, R1's task list). */
export const MIRROR_SEED = 1000;

/** One matchup over budgets, fields and seeds, in both seats (`--checks clash --pair`). */
export interface PairOpts {
  a: string;
  b: string;
  budgets: readonly number[];
  fields: readonly FieldId[];
  /** Seeds 1 to n. */
  seeds: number;
  jitter?: number;
  opts?: ClashOpts;
}

/**
 * Plays `a` against `b` at each budget on each field, seeds 1 to n, `a` in the player's seat and then
 * the enemy's. Each army is built once from its own stream, so both seats see the same two armies; a
 * mirror builds its second army on seed 1,000 + s. Records come by field, budget, seed, then seat.
 */
export function playPair(content: Content, p: PairOpts): ClashRecord[] {
  const out: ClashRecord[] = [];
  for (const id of p.fields) {
    const field = clashField(content, id, { extraPlots: p.opts?.extraPlots ?? 0 });
    for (const budget of p.budgets) {
      for (let seed = 1; seed <= p.seeds; seed++) {
        const armies: [Army, Army] = [
          armyFromBot(content, p.a, budget, seed, field.plots),
          armyFromBot(content, p.b, budget, p.a === p.b ? MIRROR_SEED + seed : seed, field.plots),
        ];
        for (const seat of SIDES) out.push(clashRecord(content, { field: id, seed, seat, armies, jitter: p.jitter ?? 0, ...(p.opts ? { opts: p.opts } : {}) }));
      }
    }
  }
  return out;
}

/**
 * One clash as a line, from the first army's side (`a`, in seat `a=…`): each lane's winner, whether the cap
 * decided it, the surviving supply a–b and when; each Heartcap's damage, capped (uncapped beside it when the
 * cap cut it); the clash's length; the clash and round results; and each army's merges at the muster, to
 * Bloomed + to Elder.
 */
export function pairLine(r: ClashRecord): string {
  const a = r.seat, b = other(r.seat);
  const who = (w: Side | 'draw') => (w === 'draw' ? 'draw' : w === a ? 'a' : 'b');
  const sec = (t: number) => `${(t / 20).toFixed(1)} s`;
  const lanes = r.lanes.map((l) => `L${l.lane} ${who(l.cap.winner)}${l.cap.capped ? ' at the cap' : ''} ${l.cap.surviving[a]}–${l.cap.surviving[b]} at ${sec(l.cap.ticks)}`).join('; ');
  const dmg = (s: Side) => {
    const h = r.cap.heartcap[s];
    return h.uncapped > h.capped ? `${h.capped} (${h.uncapped} uncapped)` : String(h.capped);
  };
  const merges = (s: Side) => `${r.armies[s].merges.muster['2']}+${r.armies[s].merges.muster['3']}`;
  return `${r.field.padEnd(5)} ${String(r.budget).padStart(4)}  seed ${r.seed}  a=${a.padEnd(6)}  ${lanes} | damage to a ${dmg(a)}, to b ${dmg(b)}`
    + ` | ${sec(r.cap.ticks)} | clash ${who(r.cap.winner)}, round ${who(r.cap.round)} | muster a ${merges(a)}, b ${merges(b)}`;
}

/** The first army's results over some records: wins, draws and losses, and its score with draws worth half. */
export function pairScore(records: readonly ClashRecord[]): { wins: number; draws: number; losses: number; score: number; capped: number } {
  let wins = 0, draws = 0, losses = 0, capped = 0;
  for (const r of records) {
    if (r.cap.winner === 'draw') draws++; else if (r.cap.winner === r.seat) wins++; else losses++;
    if (r.cap.capped) capped++;
  }
  return { wins, draws, losses, score: records.length ? (wins + draws / 2) / records.length : 0, capped };
}

// ---- the full colony and the overflow table (§13.7, §4.6; R1-Q5, #7, #11; A004, A020, A200) ----

/** §13.7's budget for a full colony (R1-Q5), and the plots it holds at most (§4.6). */
export const FULL_COLONY = {
  /** At most this many live units a side when the armies arrive. */
  units: 150,
  /** §4.6's earlier "about 100 supply" a side, reported beside it (A004). */
  supply: 100,
  /** R1-Q4's plots past the base ones: 12 on one lane, 16 on Twin Roots. */
  extraPlots: 4,
} as const;

/** A spawner's squad for the full colony. */
export interface ColonySquad {
  buildingId: string;
  unitId: string;
  /** Its squad (§11.2). No upgrade adds units in rounds until #27's fixed adds (R2b S5). */
  squad: number;
  /** A unit's supply. */
  supply: number;
  /** Its unit is tagged `swarm`, for Old Mother Mold's passive. */
  swarm: boolean;
}

/** A colony of one building's squads on every plot: its units a side, and their supply. */
export interface ColonyRead {
  buildingId: string;
  units: number;
  supply: number;
}

export interface ColonyField {
  field: FieldId;
  plots: number;
  /** The biggest colony by units, and by supply. */
  byUnits: ColonyRead;
  bySupply: ColonyRead;
  /** The biggest by units is inside §13.7's 150 live units a side. */
  fits: boolean;
  /** When it isn't, what brings it inside: the squad or the plots. */
  levers: string[];
}

export interface FullColony {
  squads: ColonySquad[];
  fields: ColonyField[];
  /** SPEC's other unit-adding first guesses (A200): each row's biggest colony by units, per field. */
  sensitivity: { id: 'vault' | 'shrine' | 'mold'; label: string; fields: ({ field: FieldId } & ColonyRead)[] }[];
  lines: string[];
}

/**
 * The most a full colony fields (§13.7, §15.4, R1-Q5): every plot a colony can hold planted with one
 * building's squad. A colony of mixed squads fields no more, since each plot counts alone. Per field, the biggest by units and by supply, against 150 live
 * units a side at the arrival and "about 100 supply"; then A200's rows for the Rhizome Vault's, the Velvet
 * Shrine's and Old Mother Mold's first guesses (§11.2, §7.7), each an upper bound.
 */
export function fullColony(content: Content, opts: { fields?: readonly FieldId[] } = {}): FullColony {
  const squads = clashArmyIds(content).filter((id) => content.buildings[id]!.squad).map((id): ColonySquad => {
    const squad = content.buildings[id]!.squad!, unit = content.units[squad.unit]!;
    return { buildingId: id, unitId: squad.unit, squad: squad.count, supply: unit.supply, swarm: unit.tags.includes('swarm') };
  });
  const fields = (opts.fields ?? ['one', 'twin']).map((id) => clashField(content, id, { extraPlots: FULL_COLONY.extraPlots }));
  /** The biggest colony on a field when each plot's squad is `size(squad, plot)`, by `key` (units, or supply), ties to more of the other. */
  const biggest = (f: ClashField, size: (s: ColonySquad, p: PlotRef) => number, key: 'units' | 'supply'): ColonyRead => {
    let best: ColonyRead | undefined;
    for (const s of squads) {
      const units = f.open.reduce((n, p) => n + size(s, p), 0);
      const read = { buildingId: s.buildingId, units, supply: units * s.supply };
      const other = key === 'units' ? 'supply' : 'units';
      if (!best || read[key] > best[key] || (read[key] === best[key] && read[other] > best[other])) best = read;
    }
    return best!;
  };
  const squadOf = (s: ColonySquad) => s.squad;
  const colonies = fields.map((f): ColonyField => {
    const byUnits = biggest(f, squadOf, 'units'), bySupply = biggest(f, squadOf, 'supply');
    const fits = byUnits.units <= FULL_COLONY.units;
    const top = squads.find((s) => s.buildingId === byUnits.buildingId)!;
    const levers = fits ? [] : [
      `squads: at most ${Math.floor(FULL_COLONY.units / f.plots)} units a squad on ${f.plots} plots`,
      `plots: at most ${Math.floor(FULL_COLONY.units / top.squad)} plots of ${top.squad}`,
    ];
    return { field: f.id, plots: f.plots, byUnits, bySupply, fits, levers };
  });
  // a plot has one behind it when the next rank opens the same file of its lane
  const behind = (f: ClashField, p: PlotRef) => f.open.some((q) => q.lane === p.lane && q.file === p.file && q.rank === p.rank + 1);
  const rows: { id: FullColony['sensitivity'][number]['id']; label: string; size: (f: ClashField) => (s: ColonySquad, p: PlotRef) => number }[] = [
    { id: 'vault', label: "every squad +1 (the Rhizome Vault's first guess, §11.2; an upper bound that ignores the Vaults' plots)", size: () => (s) => s.squad + 1 },
    { id: 'shrine', label: "the squad in front +2 (the Velvet Shrine's first guess, §11.2: each squad with a plot behind it; an upper bound that ignores the Shrines' plots)", size: (f) => (s, p) => s.squad + (behind(f, p) ? 2 : 0) },
    { id: 'mold', label: "swarm squads +10%, rounded up (Old Mother Mold's passive, §7.7's first guess)", size: () => (s) => (s.swarm ? Math.ceil((s.squad * 11) / 10) : s.squad) },
  ];
  const sensitivity = rows.map((r) => ({ id: r.id, label: r.label, fields: fields.map((f) => ({ field: f.id, ...biggest(f, r.size(f), 'units') })) }));

  const read = (c: ColonyRead) => `${c.buildingId} ${c.units} units, ${c.supply} supply`;
  const lines = [
    `full colony (§13.7, §4.6; R1-Q5, A004, A200): every plot planted with one building's squad; the budget is at most ${FULL_COLONY.units} live units a side at the arrival, beside "about ${FULL_COLONY.supply} supply"`,
    `  squads × supply: ${squads.map((s) => `${s.buildingId} ${s.squad}×${s.supply}`).join(' · ')}`,
    ...colonies.map((c) => `  ${c.fits ? 'fits' : 'OVER'} ${c.field} (${c.plots} plots): most units ${read(c.byUnits)}; most supply ${read(c.bySupply)}`
      + `; ${c.bySupply.supply > FULL_COLONY.supply ? 'over' : 'inside'} about ${FULL_COLONY.supply} supply${c.levers.length ? `. Levers: ${c.levers.join('; ')}` : ''}`),
    ...sensitivity.map((r) => `  if ${r.label}: ${r.fields.map((f) => `${f.field} ${f.units} units, ${f.supply} supply${f.units > FULL_COLONY.units ? ' (over)' : ''}`).join(' · ')}`),
  ];
  return { squads, fields: colonies, sensitivity, lines };
}

/** A squad's sizes for the overflow table: its squad, and the squad +1 (the Vault's first guess) and +2 (the Shrine's). */
export interface OverflowRow {
  buildingId: string;
  /** Its unit's width, twice its radius. */
  width: number;
  sizes: { at: 'squad' | '+1' | '+2'; n: number; overflows: boolean }[];
}

/**
 * Which squads overflow their slots (§4.6, #11, A020): each spawner's squad, and its squad +1 and +2, against its slot's grid (k × k cells, 2/k tiles apart). A squad whose units are
 * wider than that overflows, and fields on the same grid packed tighter.
 */
export function overflowTable(content: Content): { rows: OverflowRow[]; lines: string[] } {
  const rows = clashArmyIds(content).filter((id) => content.buildings[id]!.squad).map((id): OverflowRow => {
    const radius = content.units[content.buildings[id]!.squad!.unit]!.radius;
    const n = squadSize(content, id);
    const sizes = ([['squad', n], ['+1', n + 1], ['+2', n + 2]] as const)
      .map(([at, n]) => ({ at, n, overflows: overflows(n, radius) }));
    return { buildingId: id, width: 2 * radius, sizes };
  });
  const w = Math.max(...rows.map((r) => r.buildingId.length));
  return {
    rows,
    lines: [
      "overflow (§4.6, #11; A020): each squad, then the squad +1 (the Vault's first guess) and +2 (the Shrine's); * when its units are wider than its slot's grid spacing, so it fields packed tighter",
      ...rows.map((r) => `  ${r.buildingId.padEnd(w)} width ${r.width.toFixed(2)}: ${r.sizes.map((x) => `${x.n}${x.overflows ? '*' : ''}`.padStart(4)).join('')}`),
    ],
  };
}
