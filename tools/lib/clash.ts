// R1's clash check (SPEC §16 R1, §12.2): whole armies at equal gold meet at once, in formation, on
// v1's sim. This part builds the armies: each spawner's squad (§11.2), the army cards, and an army
// from a bot spec and a gold budget (R1-Q2, R1-Q4). Then the fields, the line and the slot each
// building takes (R1-Q1, R1-Q9), and the arrival. R2a's `playRoundClash` builds on `armyFromBot`,
// `lineOf` and `assignSlots` (R2a/T116); `placeArmy` is a tool on v1's sim. v2's numbers that aren't
// in the data yet are named here (plan call 19); R2a moves them into balance.json (§11.1).
import type { Content } from '../../src/data/registry.ts';
import { addBuilding, addUnit } from '../../src/sim/create.ts';
import { formationBox, slotPositions } from '../../src/sim/formation.ts';
import type { FieldGeom, Slot } from '../../src/sim/formation.ts';
import { createBattle, hash32, makeConfig, nextFloat, seedStream } from '../../src/sim/index.ts';
import type { BattleState, Side } from '../../src/sim/index.ts';
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
