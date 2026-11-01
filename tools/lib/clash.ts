// R1's clash check (SPEC §16 R1, §12.2): whole armies at equal gold meet at once, in formation, on
// v1's sim. This part builds the armies: each spawner's squad (§11.2), the army cards, and an army
// from a bot spec and a gold budget (R1-Q2, R1-Q4). Then the fields, the line and the slot each
// building takes (R1-Q1, R1-Q9), and the arrival. R2a's `playRoundClash` builds on `armyFromBot`,
// `lineOf` and `assignSlots` (R2a/T116); `placeArmy` is a tool on v1's sim. v2's numbers that aren't
// in the data yet are named here (plan call 19); R2a moves them into balance.json (§11.1).
import type { Content } from '../../src/data/registry.ts';
import { addBuilding, addUnit } from '../../src/sim/create.ts';
import { formationBox, musterKnits, overflows, slotGrid, slotPositions } from '../../src/sim/formation.ts';
import type { FieldGeom, MusterUnit, Slot } from '../../src/sim/formation.ts';
import { SIDES, bloomTrios, createBattle, hash32, makeConfig, nextFloat, other, runHeadless, seedStream, topKind } from '../../src/sim/index.ts';
import type { BattleState, CounterKind, IntelProfile, Side } from '../../src/sim/index.ts';
import { nextSigned } from '../../src/sim/rng.ts';
import { mergeTriosNow } from '../../src/sim/systems/merging.ts';
import { clampToLane, findUnit, unitDef, unitRadius } from '../../src/sim/world.ts';
import { rosterIds } from './balance.ts';

/** v2's clash numbers, until R2a puts them in the data (§4.6, §5.6, §6.7, §12.3). */
export const CLASH = {
  /** Tiles between the two front ranks (§4.6). */
  gapTiles: 6,
  /** The muster: 1 s in which squads knit and nobody moves or attacks (§5.6). */
  musterTicks: 20,
  /** A clash ends at 45 s, the muster counted (§6.7, §18.2 #13). */
  capTicks: 900,
  /** Heartcap damage per point of a lane's margin (§6.7). */
  damagePerSupply: 25,
  /** Siege units count double toward Heartcap damage (§5.4, §6.7). */
  siegeDamageMult: 2,
  /** The most Heartcap damage one round deals (§6.7). */
  damageCap: 500,
  /** G13: at most this share of clashes reach the cap (§12.3). */
  g13StallShare: 0.15,
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

/**
 * A spawner's squad (§11.2): what it made in `seconds` under v1's timers, in whole batches with
 * halves rounded up, `count × round(seconds / interval)`.
 */
export function squadSize(content: Content, buildingId: string, seconds = 60): number {
  const b = content.buildings[buildingId];
  if (!b) throw new Error(`squadSize: unknown building ${buildingId}`);
  if (!b.spawn) throw new Error(`squadSize: ${buildingId} spawns nothing`);
  return b.spawn.count * Math.round(seconds / b.spawn.interval);
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
 * The opener, the weights and `maxOwned` of the AI state `createBattle` resolves for `controller`
 * (§7.1), on a battle that's then dropped, with the economy and utility cards filtered out (R1-Q2).
 * `afterSeconds` is ignored, and "auto" merging reads as on. Neither the seed nor the budget changes
 * them, so each content's lists are kept.
 */
function buildList(content: Content, controller: string): BuildList {
  let lists = buildLists.get(content);
  if (!lists) buildLists.set(content, (lists = new Map()));
  const known = lists.get(controller);
  if (known) return known;
  const ai = createBattle(content, makeConfig(content, { seed: 1, mapId: 'test-flat', player: controller, enemy: 'human' })).sides.player.ai;
  if (!ai) throw new Error(`armyFromBot: ${controller} has no build list`);
  const cards = new Set(clashArmyIds(content));
  const list: BuildList = {
    opener: ai.opener.filter((id) => cards.has(id)),
    weights: ai.weights.filter((w) => cards.has(w.building)).map(({ building, weight, maxOwned }) => ({ building, weight, maxOwned })),
    mergeOn: ai.mergePolicy !== 'off',
  };
  lists.set(controller, list);
  return list;
}

/**
 * The army `controller` builds with `budget` gold of army and `plots` plots (§16 R1, R1-Q2, R1-Q4):
 * its opener first, skipping what doesn't fit, then weighted picks from the army's own stream. A
 * pick that doesn't fit the gold left is skipped and drawing goes on, until no pickable card fits or
 * the plots are full. `maxOwned` holds. The stream is keyed by the seed and the bot alone, so an
 * army is the same in both seats and against every opponent.
 */
export function armyFromBot(content: Content, controller: string, budget: number, seed: number, plots: number): Army {
  const list = buildList(content, controller);
  const rng = seedStream(hash32(seed, controller, 0), 'ai', 0);
  const cost = (id: string): number => content.buildings[id]!.cost;
  const maxOf = new Map(list.weights.map((w) => [w.building, w.maxOwned]));
  const owned = new Map<string, number>();
  const built: string[] = [];
  let gold = budget;
  const room = (id: string): boolean => {
    const max = maxOf.get(id) ?? -1;
    return max < 0 || (owned.get(id) ?? 0) < max;
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
  while (built.length < plots) {
    eff.length = 0;
    let total = 0, fits = false;
    for (const w of list.weights) {
      const x = room(w.building) ? w.weight : 0;
      eff.push(x);
      total += x;
      if (x > 0 && cost(w.building) <= gold) fits = true;
    }
    if (!fits) break;
    // the AI's weighted pick (src/sim/ai/controller.ts)
    let roll = nextFloat(rng) * total;
    let pick = -1;
    for (let i = 0; i < eff.length && pick < 0; i++) {
      roll -= eff[i]!;
      if (roll < 0 && eff[i]! > 0) pick = i;
    }
    for (let i = eff.length - 1; i >= 0 && pick < 0; i--) if (eff[i]! > 0) pick = i;
    const id = list.weights[pick]!.building;
    if (cost(id) <= gold) buy(id);
  }
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
    if (!b.spawn) return { buildingId: id, kind: 'emplacement', count: 1, mergeOn: false };
    return { buildingId: id, kind: 'squad', unitId: b.spawn.unit, count: squadSize(content, id), mergeOn };
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

/** A spawner whose unit has one of these tags stands at the back (§7.3). */
const BACK_TAGS = ['ranged', 'support', 'burst'];

/**
 * A building's line, by §7.3's tags (R1-Q1, A006): a spawner whose unit is `ranged`, `support` or
 * `burst`, and every tower, stands at the back; every other spawner in front.
 */
export function lineOf(content: Content, buildingId: string): Line {
  const b = content.buildings[buildingId];
  if (!b) throw new Error(`lineOf: unknown building ${buildingId}`);
  if (b.kind === 'tower') return 'back';
  if (b.kind !== 'spawner' || !b.spawn) throw new Error(`lineOf: ${buildingId} isn't an army card`);
  return content.units[b.spawn.unit]!.tags.some((t) => BACK_TAGS.includes(t)) ? 'back' : 'front';
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

/**
 * The arrival (§16 R1): one side's army appears in its formation box at once. Units are created in
 * slot order (lane, rank, file), then by j within a squad, whatever order the placements come in, so
 * ids and the muster depend only on the colony, as R2a's arrival will (A024). Each unit stands at
 * `slotPositions` (clamped to its lane by `addUnit`) with its squad's `mergeOn`, burrowed if it tunnels,
 * and counts in `stats.spawned`. Units carry `sourceBuildingId` 0, since no spawner stands on the
 * field and a real building's id could collide with an emplacement's (plan call 20). A tower stands on
 * its slot as a building. Returns each unit's placement, by its index in `placements`.
 */
export function placeArmy(state: BattleState, side: Side, placements: readonly Placement[]): Map<number, number> {
  const ranks = Math.max(2, ...placements.map((p) => p.rank + 1));
  const box = formationBox({ width: state.map.width, lanes: state.lanes, gapTiles: CLASH.gapTiles }, side, ranks);
  const slotOf = (p: PlotRef): Slot => {
    const slot = box.find((s) => s.lane === p.lane && s.rank === p.rank && s.file === p.file);
    if (!slot) throw new Error(`placeArmy: no slot at lane ${p.lane}, rank ${p.rank}, file ${p.file}`);
    return slot;
  };
  const order = placements.map((_, i) => i).sort((i, j) => {
    const p = placements[i]!, q = placements[j]!;
    return p.lane - q.lane || p.rank - q.rank || p.file - q.file;
  });
  const squadOf = new Map<number, number>();
  const spawned = state.stats[side].spawned;
  order.forEach((i, n) => {
    const p = placements[i]!, e = p.entry;
    const prev = n > 0 ? placements[order[n - 1]!]! : undefined;
    if (prev && prev.lane === p.lane && prev.rank === p.rank && prev.file === p.file) throw new Error(`placeArmy: two buildings on one plot (${p.lane}, ${p.rank}, ${p.file})`);
    const slot = slotOf(p);
    if (e.kind === 'emplacement') {
      addBuilding(state, side, e.buildingId, slot.lane, slot.col, slot.row, state.compiled[side].buildings[e.buildingId]?.cost ?? 0);
      return;
    }
    const unitId = e.unitId!;
    const burrow = state.compiled[side].units[unitId]!.tags.includes('burrow');
    for (const at of slotPositions(e.count, slot, side)) {
      const u = addUnit(state, side, unitId, slot.lane, at.x, at.y, 0);
      u.mergeOn = e.mergeOn;
      if (burrow) u.burrowed = true;
      spawned[unitId] = (spawned[unitId] ?? 0) + 1;
      squadOf.set(u.id, i);
    }
  });
  return squadOf;
}

/** The options a clash plays under, beside its armies (A017). Each is v2's first guess unless set. */
export interface ClashOpts {
  /** Merging, at the muster and after it (default on). */
  merging?: boolean;
  /** Plots a side opens past the base ones, in a third rank (R1-Q4; default 0). */
  extraPlots?: number;
  /** How buildings take lanes on a field of more than one (default `line`, R1-Q1). */
  lanesRule?: LanesRule;
  /** v1's movement, without the idle seek (R1-Q8): units with no target march to the far edge. */
  v1Movement?: boolean;
  /** v1's targeting (R1-Q7): siege units go for buildings, the Mortar's first. */
  v1Targeting?: boolean;
}

/** One clash to play: two armies at a budget on a field, a seed, which seat the first army takes, and the jitter. */
export interface ClashJob {
  field: FieldId;
  seed: number;
  /** The side the first army plays; the second plays the other. */
  seat: Side;
  armies: [Army, Army];
  /** Up to ± this many tiles per unit per axis, after the muster's knits (default 0, which draws nothing). */
  jitter?: number;
  opts?: ClashOpts;
}

/** Hooks a test uses to stage units and look at the clash at its start. */
export interface ClashHooks {
  /** After the arrival, before the muster: place exact units. */
  stage?: (state: BattleState) => void;
  /** At tick 20, after the muster's knits and the jitter, before the first step. */
  mustered?: (state: BattleState) => void;
}

/** The two readings of the 45 s cap (§18.2 #13): with the muster counted (the first guess), and after it. */
export type Reading = 'cap' | 'capAfterMuster';

/** How a lane's clash ended: a side wiped out (`wipe`), the 45 s comparison (`cap`), or one of §6.7's edge cases. */
export type LaneCase = 'wipe' | 'cap' | 'E1' | 'E2' | 'E3' | 'E4' | 'E5' | 'E6';

/** A lane's result in one reading, as it locked (§6.7). */
export interface LaneReading {
  case: LaneCase;
  winner: Side | 'draw';
  /** The tick it locked: the lane's length, the muster counted. */
  ticks: number;
  /** Whether the cap decided it. */
  capped: boolean;
  /** Each side's surviving supply: its living units' own supply. */
  surviving: Record<Side, number>;
  /** Surviving supply with each siege unit counted twice. */
  damageSupply: Record<Side, number>;
  /** 25 × the margin, to the loser's Heartcap; 0 for a draw. */
  raw: number;
}

export interface LaneRecord {
  lane: number;
  cap: LaneReading;
  capAfterMuster: LaneReading;
  /** The lane reached the cap (`cap` reading) with a side kept in it by emplacements alone (#10). */
  emplacementsHeld: boolean;
}

/** A clash's result in one reading (§6.7, R1-Q3). */
export interface ClashReading {
  /** When its last lane locked: the clash's length in ticks, the muster counted. */
  ticks: number;
  /** Whether any lane reached the cap. */
  capped: boolean;
  lanesWon: Record<Side, number>;
  /** Each side's Heartcap damage: summed over the lanes it lost (storm ×1.0), and that sum capped at 500. */
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

/** §7.4's four counter kinds' scores, with no noise, and the top kind (ties Elite, Armor, Line, Swarm). */
export interface KindRead {
  scores: IntelProfile;
  top: CounterKind;
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
  /** Its units at the arrival, and their supply. */
  arrival: { units: number; supply: number };
  /** Its units after the muster, by tier, and their supply. */
  mustered: { units: number; supply: number; base: number; bloomed: number; elders: number };
  /** Merges at the muster, and on the field after it. */
  merges: { muster: Merges; field: Merges };
  /**
   * After the muster, the share of its units' supply that merged, each unit at its parts' base supply (a
   * Bloomed unit its 3 parts' tier-1 supply, an Elder its 9; R2-Q3, A014): plain; with the swarm read,
   * which leaves out units of at most `ai.counter.swarmMaxSupply` (1 where the data leaves it unset);
   * and Elders alone.
   */
  eliteShare: { plain: number; swarmRead: number; elderOnly: number };
  /** The armor classes' and ranged units' shares, by the same measure. */
  shares: { light: number; medium: number; heavy: number; ranged: number };
  /** §7.4's kinds under each eliteShare reading (A041). */
  kinds: Record<keyof ArmyRecord['eliteShare'], KindRead>;
  overflow: Overflow[];
  /** The most trios Puppet Bloom's circle finds centred on any of its units at tick 20 (A057, R2-Q7). */
  bloomTrios: number;
  /** Its units within 0.5 tiles of the far edge when their lane locked in the `cap` reading (A021). */
  parked: number;
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
  capAfterMuster: ClashReading;
}

/** The tick each reading's cap falls on: 45 s of the clash clock, or 45 s after the muster. */
const CAP_TICK: Record<Reading, number> = { cap: CLASH.capTicks, capAfterMuster: CLASH.capTicks + CLASH.musterTicks };

/** A job's options with v2's first guesses filled in. */
export function clashOpts(opts: ClashOpts = {}): Required<ClashOpts> {
  return {
    merging: opts.merging ?? true, extraPlots: opts.extraPlots ?? 0, lanesRule: opts.lanesRule ?? 'line',
    v1Movement: opts.v1Movement ?? false, v1Targeting: opts.v1Targeting ?? false,
  };
}

/**
 * One clash on v1's sim (§16 R1, plan calls 5–8). Both armies arrive at tick 0 in formation (the job's
 * first army in its seat), then the muster: per side, the player first, `musterKnits` runs on the units
 * where they stand and each pass is applied with `mergeTriosNow`, so each merged unit's id is its key
 * (A024). Then the jitter, if any, and the clock jumps to tick 20: nobody moved or attacked in the
 * muster. Lanes where one side or neither fields anything lock at tick 0 (E1, E2). The rest fight in
 * `runHeadless`, with v2's targeting and movement switched on unless the job asks for v1's, until each
 * lane ends by §6.7's rule: a side has no units and no emplacements left, or the cap. The cap reading
 * locks the lanes still fighting at tick 900, the muster counted (the first guess); the clash runs on to
 * tick 920 for the other reading (#13). Both are scored by §6.7, storm ×1.0, and by R1-Q3's winner.
 */
export function playClash(content: Content, job: ClashJob, hooks: ClashHooks = {}): ClashRecord {
  const opts = clashOpts(job.opts);
  const field = clashField(content, job.field, { extraPlots: opts.extraPlots });
  const state = createBattle(content, makeConfig(content, {
    seed: job.seed, mapId: field.mapId, player: 'human', enemy: 'human', flags: { merging: opts.merging },
    test: {
      // as the supply duels run, with v1's time limit past the 920 ticks both readings need
      noTurrets: true, noTerritory: true, noHeartcapTargets: true, timeLimitSeconds: 47,
      ...(opts.v1Targeting ? {} : { noBuildingPreference: true }), ...(opts.v1Movement ? {} : { idleSeek: true }),
    },
  }));
  state.phase = 'live';
  const armies = { [job.seat]: job.armies[0], [other(job.seat)]: job.armies[1] } as Record<Side, Army>;
  for (const side of SIDES) placeArmy(state, side, assignSlots(content, armies[side], field, { lanesRule: opts.lanesRule }));
  hooks.stage?.(state);

  const arrival = { player: fielded(state, 'player'), enemy: fielded(state, 'enemy') };

  const atMuster = muster(state);
  jitter(state, job);
  state.tick = CLASH.musterTicks;
  const mustered = { player: fielded(state, 'player'), enemy: fielded(state, 'enemy') };
  const reads = { player: mixOf(state, 'player'), enemy: mixOf(state, 'enemy') };
  const bloom = { player: mostBloomTrios(content, state, 'player'), enemy: mostBloomTrios(content, state, 'enemy') };
  hooks.mustered?.(state);

  const lanes = state.lanes.map(() => ({} as Partial<Record<Reading, LaneReading>> & { held?: boolean }));
  const parked = { player: 0, enemy: 0 };
  const lockCap = (s: BattleState, l: number, r: LaneReading): void => {
    lanes[l]!.cap = r;
    for (const side of SIDES) parked[side] += parkedIn(s, side, l);
  };
  // E1 and E2: decided by what each side fields, before anyone moves
  tally(state).forEach((t, l) => {
    if (t.player.alive && t.enemy.alive) return;
    const r = t.player.alive || t.enemy.alive ? ended(t, 0, 'E1') : ended(t, 0, 'E2');
    lockCap(state, l, r);
    lanes[l]!.capAfterMuster = r;
  });
  const open = () => lanes.some((l) => !l.cap || !l.capAfterMuster);
  if (open()) {
    runHeadless(state, {
      until: CAP_TICK.capAfterMuster,
      onTick: (s) => {
        tally(s).forEach((t, l) => {
          const lane = lanes[l]!;
          const end = !t.player.alive || !t.enemy.alive ? ended(t, s.tick) : undefined;
          if (!lane.cap && (end || s.tick >= CAP_TICK.cap)) {
            lockCap(s, l, end ?? capped(t, s.tick));
            if (!end) lane.held = t.player.units === 0 || t.enemy.units === 0;
          }
          if (!lane.capAfterMuster && (end || s.tick >= CAP_TICK.capAfterMuster)) lane.capAfterMuster = end ?? capped(t, s.tick);
        });
        if (!open()) s.phase = 'ended';
      },
    });
  }
  const laneRecords = lanes.map((l, lane): LaneRecord => ({ lane, cap: l.cap!, capAfterMuster: l.capAfterMuster!, emplacementsHeld: l.held ?? false }));
  const armyRecord = (side: Side): ArmyRecord => {
    const army = armies[side], all = state.stats[side].merges, m = atMuster[side];
    return {
      controller: army.controller, entries: army.entries, spent: army.spent, buildings: army.entries.length,
      arrival: { units: arrival[side].units, supply: arrival[side].supply }, mustered: mustered[side],
      merges: { muster: m, field: { '2': all['2'] - m['2'], '3': all['3'] - m['3'] } },
      ...reads[side], overflow: overflowsOf(state, side, army), bloomTrios: bloom[side], parked: parked[side],
    };
  };
  return {
    field: job.field, budget: job.armies[0].budget, seed: job.seed, seat: job.seat, jitter: job.jitter ?? 0, opts,
    armies: { player: armyRecord('player'), enemy: armyRecord('enemy') },
    lanes: laneRecords,
    cap: scoreReading(laneRecords.map((l) => l.cap)),
    capAfterMuster: scoreReading(laneRecords.map((l) => l.capAfterMuster)),
  };
}

/**
 * The muster's knits (§5.6, plan call 6): per side, the player first, `musterKnits` on the units as they
 * stand, each pass applied with `mergeTriosNow` in its order, so each merged unit's id equals its key.
 * Returns each side's merges. With merging off, nothing knits.
 */
function muster(state: BattleState): Record<Side, Merges> {
  const lanes = state.lanes.map((l) => ({ top: l.rowStart, bottom: l.rowEnd }));
  for (const side of SIDES) {
    if (!state.config.flags.merging) break;
    const firstKey = state.nextId;
    const res = musterKnits(state.units.filter((u) => u.side === side).map((u): MusterUnit => ({
      key: u.id, side, lane: u.lane, unitId: u.unitId, tier: u.tier, x: u.x, y: u.y, mergeOn: u.mergeOn, source: u.sourceBuildingId,
      // §5.6's eligibility apart from the toggle and the tier, which the record carries: burrowed and burst units never knit
      eligible: !u.burrowed && !(state.rules.burst && unitDef(state, u).tags.includes('burst')),
    })), {
      firstKey, mergeRadius: state.compiled[side].mergeRadius, lanes, width: state.map.width,
      radiusOf: (unitId, tier) => state.compiled[side].units[unitId]!.tiers[tier - 1]!.radius,
    });
    for (const pass of res.passes) mergeTriosNow(state, pass.map((trio) => trio.map((key) => findUnit(state, key)!)));
    const units = state.units.filter((u) => u.side === side);
    if (units.length !== res.units.length || units.some((u, i) => u.id !== res.units[i]!.key || u.tier !== res.units[i]!.tier)) {
      throw new Error(`playClash: ${side}'s muster gave units whose ids aren't musterKnits's keys`);
    }
  }
  return { player: { ...state.stats.player.merges }, enemy: { ...state.stats.enemy.merges } };
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
    u.px = u.x; u.py = u.y; u.spawnY = u.y;
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

/** A merged unit's parts, by tier: a Bloomed unit knit 3 base units, an Elder 9. */
const PARTS = [1, 3, 9] as const;

/**
 * A side's mix after the muster (§7.4, R2-Q3): each unit at its parts' base supply, the eliteShare
 * readings, the armor and ranged shares, and the four kinds' scores from `ai.counter`, with no noise.
 */
function mixOf(state: BattleState, side: Side): Pick<ArmyRecord, 'eliteShare' | 'shares' | 'kinds'> {
  const cr = state.rules.ai.counter;
  const swarmMax = cr.swarmMaxSupply ?? 1;
  let total = 0, light = 0, medium = 0, heavy = 0, ranged = 0, merged = 0, swarmRead = 0, elders = 0;
  for (const u of state.units) {
    if (u.side !== side) continue;
    const def = unitDef(state, u);
    const base = def.tiers[0].supply;
    const parts = PARTS[u.tier - 1]! * base;
    total += parts;
    if (def.armor === 'light') light += parts; else if (def.armor === 'medium') medium += parts; else heavy += parts;
    if (def.tags.includes('ranged')) ranged += parts;
    if (u.tier === 1) continue;
    merged += parts;
    if (base > swarmMax) swarmRead += parts;
    if (u.tier === 3) elders += parts;
  }
  const share = (x: number) => (total > 0 ? x / total : 0);
  const eliteShare = { plain: share(merged), swarmRead: share(swarmRead), elderOnly: share(elders) };
  const shares = { light: share(light), medium: share(medium), heavy: share(heavy), ranged: share(ranged) };
  const read = (elite: number): KindRead => {
    const scores: IntelProfile = { swarm: shares.light * (1 - cr.swarmEliteDiscount * elite), line: shares.medium, armor: shares.heavy, elite: cr.eliteScoreMult * elite };
    return { scores, top: topKind(scores) };
  };
  return { eliteShare, shares, kinds: { plain: read(eliteShare.plain), swarmRead: read(eliteShare.swarmRead), elderOnly: read(eliteShare.elderOnly) } };
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
  if (!power || !('radius' in power)) throw new Error('playClash: no Puppet Bloom in the data');
  return power.radius;
}

/** The most trios `bloomTrios` finds in Puppet Bloom's circle centred on any of a side's units (A057). */
function mostBloomTrios(content: Content, state: BattleState, side: Side): number {
  const radius = bloomRadius(content);
  let most = 0;
  for (const u of state.units) if (u.side === side) most = Math.max(most, bloomTrios(state, side, u.x, u.y, radius).trios.length);
  return most;
}

/** A side's units in a lane whose bodies stand within 0.5 tiles of the far edge (A021). */
function parkedIn(state: BattleState, side: Side, lane: number): number {
  let n = 0;
  for (const u of state.units) {
    if (u.side !== side || u.lane !== lane) continue;
    const r = unitRadius(state, u);
    if ((side === 'player' ? state.map.width - (u.x + r) : u.x - r) <= 0.5) n++;
  }
  return n;
}

/** What one side has in a lane: living units and emplacements, its surviving supply and its damage supply. */
interface SideTally { units: number; towers: number; alive: boolean; surviving: number; damage: number }
type LaneTally = Record<Side, SideTally>;

/** Each lane's tally (§6.7): every living unit counts its own supply, a siege unit twice for damage. */
function tally(state: BattleState): LaneTally[] {
  const out = state.lanes.map((): LaneTally => ({
    player: { units: 0, towers: 0, alive: false, surviving: 0, damage: 0 },
    enemy: { units: 0, towers: 0, alive: false, surviving: 0, damage: 0 },
  }));
  for (const u of state.units) {
    if (u.hp <= 0) continue;
    const t = out[u.lane]![u.side];
    t.units++;
    t.surviving += u.supply;
    t.damage += unitDef(state, u).tags.includes('siege') ? u.supply * CLASH.siegeDamageMult : u.supply;
  }
  // every building on a clash's field is an emplacement
  for (const b of state.buildings) if (b.hp > 0) out[b.lane]![b.side].towers++;
  for (const t of out) for (const side of SIDES) t[side].alive = t[side].units + t[side].towers > 0;
  return out;
}

/**
 * A lane that ended because a side is out of it, or both (E4), at `tick`: the side left wins, its whole
 * damage supply the margin. It's E6 when only emplacements are left to win it. At tick 0, `arrival`
 * names the case: E1 when one side fields nothing, E2 when neither does.
 */
function ended(t: LaneTally, tick: number, arrival?: 'E1' | 'E2'): LaneReading {
  const winner: Side | 'draw' = t.player.alive ? 'player' : t.enemy.alive ? 'enemy' : 'draw';
  const kase: LaneCase = arrival ?? (winner === 'draw' ? 'E4' : t[winner].units > 0 ? 'wipe' : 'E6');
  return lock(t, tick, kase, winner, false);
}

/**
 * A lane still fighting at the cap: the side with more surviving supply wins it, its margin its damage
 * supply less the loser's, never below 0 (#22's first guess). Only emplacements left on both sides (E5)
 * or equal surviving supply (E3) is a draw.
 */
function capped(t: LaneTally, tick: number): LaneReading {
  if (t.player.units === 0 && t.enemy.units === 0) return lock(t, tick, 'E5', 'draw', true);
  if (t.player.surviving === t.enemy.surviving) return lock(t, tick, 'E3', 'draw', true);
  return lock(t, tick, 'cap', t.player.surviving > t.enemy.surviving ? 'player' : 'enemy', true);
}

function lock(t: LaneTally, tick: number, kase: LaneCase, winner: Side | 'draw', isCapped: boolean): LaneReading {
  const margin = winner === 'draw' ? 0 : Math.max(0, t[winner].damage - t[other(winner)].damage);
  return {
    case: kase, winner, ticks: tick, capped: isCapped,
    surviving: { player: t.player.surviving, enemy: t.enemy.surviving },
    damageSupply: { player: t.player.damage, enemy: t.enemy.damage },
    raw: CLASH.damagePerSupply * margin,
  };
}

/**
 * A clash's score in one reading (§6.7, R1-Q3): each lane's raw damage to its loser's Heartcap, storm
 * ×1.0 (so `floor(raw × 10000 / 10000)` is the raw), summed per Heartcap and capped at 500. The clash
 * goes to more lanes won, then more uncapped damage dealt, else it's a draw; the round, to more capped
 * damage dealt, else it's a drawn round.
 */
function scoreReading(lanes: readonly LaneReading[]): ClashReading {
  const won = { player: 0, enemy: 0 }, taken = { player: 0, enemy: 0 };
  for (const l of lanes) {
    if (l.winner === 'draw') continue;
    won[l.winner]++;
    taken[other(l.winner)] += l.raw;
  }
  const heartcap = {
    player: { uncapped: taken.player, capped: Math.min(CLASH.damageCap, taken.player) },
    enemy: { uncapped: taken.enemy, capped: Math.min(CLASH.damageCap, taken.enemy) },
  };
  const more = (p: number, e: number): Side | 'draw' => (p > e ? 'player' : e > p ? 'enemy' : 'draw');
  const byLanes = more(won.player, won.enemy);
  return {
    ticks: Math.max(...lanes.map((l) => l.ticks)),
    capped: lanes.some((l) => l.capped),
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
        for (const seat of SIDES) out.push(playClash(content, { field: id, seed, seat, armies, jitter: p.jitter ?? 0, ...(p.opts ? { opts: p.opts } : {}) }));
      }
    }
  }
  return out;
}

/**
 * One clash as a line, from the first army's side (`a`, in seat `a=…`) in the `cap` reading: each lane's
 * winner, how it ended, the surviving supply a–b and when; each Heartcap's damage, capped (uncapped
 * beside it when the cap cut it); the clash's length, and when it was capped the other reading; the clash
 * and round results; and each army's merges at the muster, to Bloomed + to Elder.
 */
export function pairLine(r: ClashRecord): string {
  const a = r.seat, b = other(r.seat);
  const who = (w: Side | 'draw') => (w === 'draw' ? 'draw' : w === a ? 'a' : 'b');
  const sec = (t: number) => `${(t / 20).toFixed(1)} s`;
  const lanes = r.lanes.map((l) => `L${l.lane} ${who(l.cap.winner)} ${l.cap.case} ${l.cap.surviving[a]}–${l.cap.surviving[b]} at ${sec(l.cap.ticks)}`).join('; ');
  const dmg = (s: Side) => {
    const h = r.cap.heartcap[s];
    return h.uncapped > h.capped ? `${h.capped} (${h.uncapped} uncapped)` : String(h.capped);
  };
  const after = r.cap.capped ? `, capped (after the muster: ${sec(r.capAfterMuster.ticks)}, clash ${who(r.capAfterMuster.winner)})` : '';
  const merges = (s: Side) => `${r.armies[s].merges.muster['2']}+${r.armies[s].merges.muster['3']}`;
  return `${r.field.padEnd(5)} ${String(r.budget).padStart(4)}  seed ${r.seed}  a=${a.padEnd(6)}  ${lanes} | damage to a ${dmg(a)}, to b ${dmg(b)}`
    + ` | ${sec(r.cap.ticks)}${after} | clash ${who(r.cap.winner)}, round ${who(r.cap.round)} | muster a ${merges(a)}, b ${merges(b)}`;
}

/** The first army's results over some records, in the `cap` reading: wins, draws and losses, and its score with draws worth half. */
export function pairScore(records: readonly ClashRecord[]): { wins: number; draws: number; losses: number; score: number; capped: number } {
  let wins = 0, draws = 0, losses = 0, capped = 0;
  for (const r of records) {
    if (r.cap.winner === 'draw') draws++; else if (r.cap.winner === r.seat) wins++; else losses++;
    if (r.cap.capped) capped++;
  }
  return { wins, draws, losses, score: records.length ? (wins + draws / 2) / records.length : 0, capped };
}
