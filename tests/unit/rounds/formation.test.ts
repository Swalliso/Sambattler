// The formation's pure core (SPEC §4.6, §5.6, §14.6; §15.7 Formation and Merging): `formationFor` stands
// a side's squads in the slots its plots copy, and `musterFor` knits them in place to a fixed point, in
// arrival order. Both run on R1's `src/sim/formation.ts`, from plain records built here on the maps'
// colonies. `formationOf` and `mergePreview` build the same records from a battle's state, with a change
// to preview (plan Call 6).
import { describe, expect, it } from 'vitest';
import { colonyPlots, openOrder } from '../../../src/sim/rounds/colony.ts';
import { formationFor, formationOf, mergePreview, musterFor } from '../../../src/sim/rounds/formation.ts';
import type { FieldingBuilding, FormationInput, MergePreview, PlanChange, SquadPlan, TierCounts } from '../../../src/sim/rounds/formation.ts';
import { createFromScenario, hashState, restore, snapshot } from '../../../src/sim/rounds/index.ts';
import type { BattleState } from '../../../src/sim/rounds/index.ts';
import { plant as plantAtOnce, sell as sellAtOnce, toggleMerge as toggleAtOnce } from '../../../src/sim/rounds/planning.ts';
import { SIDES } from '../../../src/sim/state.ts';
import type { Side, Tier } from '../../../src/sim/state.ts';
import { content, liveState } from '../../helpers.ts';
import { plotAt } from '../../roundHelpers.ts';

const compiled = liveState().compiled.player;
const radiusOf = (unitId: string, tier: Tier): number => compiled.units[unitId]!.tiers[tier - 1]!.radius;

/** A Sporeling Burrow: 8 Sporelings (§5.6, §11.2). */
const burrow = (id: number, mergeOn = true): FieldingBuilding =>
  ({ id, kind: 'spawner', squad: { unitId: 'sporeling', count: 8, radius: radiusOf('sporeling', 1) }, mergeOn });
const cellar = (id: number): FieldingBuilding => ({ id, kind: 'economy', mergeOn: true });
const counts = (elders: number, bloomed: number, base: number): TierCounts => ({ elders, bloomed, base });

/** A building planted at a lane, rank and file. */
type Planted = [lane: number, rank: number, file: number, building: FieldingBuilding];

/** A side's input on a map: every plot of its colony, with the formation's 6-tile gap (§4.6). */
function on(mapId: string, side: Side, planted: Planted[]): FormationInput {
  const m = content.maps[mapId]!;
  const plots = colonyPlots(m, side, openOrder(m).length).map(({ lane, rank, file }) => ({
    lane, rank, file, building: planted.find(([l, r, f]) => l === lane && r === rank && f === file)?.[3] ?? null,
  }));
  return { geom: { width: m.width, lanes: m.lanes, gapTiles: 6 }, side, plots };
}
const muster = (mapId: string, side: Side, planted: Planted[], mergeRadius = 1.5): MergePreview =>
  musterFor({ ...on(mapId, side, planted), mergeRadius, radiusOf });

describe('formationFor: the formation copies the colony (SPEC §4.6)', () => {
  it("on Bogwater: your slots in columns 9–12, the general's in 19–22, the third rank 2 columns further back", () => {
    const cols = (side: Side): number[] => {
      const input = on('bogwater-hollow', side, []);
      const { slots, squads } = formationFor(input);
      expect(squads).toEqual([]);
      // one slot per plot, in its rank and file
      expect(slots.map((s) => [s.lane, s.rank, s.file])).toEqual(input.plots.map((p) => [p.lane, p.rank, p.file]));
      return [0, 1, 2].map((rank) => slots.find((s) => s.rank === rank)!.col);
    };
    expect(cols('player')).toEqual([11, 9, 7]);
    expect(cols('enemy')).toEqual([19, 21, 23]);
  });

  it("fills a slot's k × k grid front to back, then top to bottom, with front toward the enemy", () => {
    for (const side of SIDES) {
      const { squads } = formationFor(on('bogwater-hollow', side, [[0, 0, 2, burrow(1)]]));
      expect(squads).toHaveLength(1);
      const { slot, units } = squads[0]!;
      expect([slot.rank, slot.file, slot.row]).toEqual([0, 2, 2]);
      expect(units).toHaveLength(8);
      // k = 3, cells 2/3 of a tile wide: unit j stands j mod 3 cells from the slot's front, in row floor(j / 3)
      const front = side === 'player' ? slot.col + 2 : slot.col;
      const ahead = side === 'player' ? 1 : -1;
      units.forEach((u, j) => {
        expect(ahead * (front - u.x)).toBeCloseTo(((j % 3) + 0.5) * (2 / 3), 9);
        expect(u.y - slot.row).toBeCloseTo((Math.floor(j / 3) + 0.5) * (2 / 3), 9);
      });
    }
  });

  it('leaves holes: an empty plot or an economy building fields nothing, and nothing closes up', () => {
    // Stumpfield's front rank: file 1 empty, file 2 a stump, file 3 a Truffle Cellar and file 4 a Burrow
    for (const side of SIDES) {
      const { squads } = formationFor(on('stumpfield', side, [[0, 0, 3, cellar(2)], [0, 0, 4, burrow(1)], [0, 1, 1, burrow(3)]]));
      expect(squads.map((s) => [s.building, s.rank, s.file, s.slot.row])).toEqual([[1, 0, 4, 6], [3, 1, 1, 0]]);
      for (const s of squads) for (const u of s.units) expect(u.y > s.slot.row && u.y < s.slot.row + 2).toBe(true);
    }
  });

  it("stands a tower's emplacement at its slot's centre, and it never knits", () => {
    const tower = (id: number): FieldingBuilding => ({ id, kind: 'tower', squad: { unitId: 'emplacement', count: 1, radius: 0.5 }, mergeOn: true });
    for (const side of SIDES) {
      const input = on('bogwater-hollow', side, [[0, 1, 1, tower(1)], [0, 1, 2, tower(2)], [0, 1, 3, tower(3)]]);
      for (const s of formationFor(input).squads) {
        expect(s).toMatchObject({ emplacement: true, eligible: false });
        expect(s.units).toEqual([{ x: s.slot.col + 1, y: s.slot.row + 1 }]);
      }
      // three alike within a merge radius of 3, yet none knits
      expect(musterFor({ ...input, mergeRadius: 3, radiusOf })).toEqual({ byBuilding: { 1: counts(0, 0, 1), 2: counts(0, 0, 1), 3: counts(0, 0, 1) }, trios: [] });
    }
  });

  it('packs an overflowing squad tighter on the same grid (§18.2 #11), and holds it in its lane as addUnit does', () => {
    const nine = (radius: number): FieldingBuilding => ({ id: 1, kind: 'spawner', squad: { unitId: 'capguard', count: 9, radius }, mergeOn: true });
    // 9 units on a 3 × 3 grid stand 2/3 of a tile apart: a radius of 0.3 fits, 0.45 overlaps
    const inFile2 = (radius: number): SquadPlan => formationFor(on('bogwater-hollow', 'player', [[0, 0, 2, nine(radius)]])).squads[0]!;
    const fits = inFile2(0.3), packed = inFile2(0.45);
    expect([fits.overflows, packed.overflows]).toEqual([false, true]);
    expect(packed.units).toEqual(fits.units);
    // in file 1 the lane's top edge holds the top row's centres a radius in: 1/3 becomes 0.45
    const edge = formationFor(on('bogwater-hollow', 'player', [[0, 0, 1, nine(0.45)]])).squads[0]!;
    expect(edge.units.slice(0, 3).map((u) => u.y)).toEqual([0.45, 0.45, 0.45]);
    expect(edge.units[3]!.y).toBeCloseTo(1, 9);
  });

  it('arrives in plot order (lane, rank, file), then by j, whatever order the plots come in (A024)', () => {
    const input = on('twin-roots', 'player', [[1, 0, 1, burrow(2)], [0, 1, 3, burrow(4)], [0, 0, 2, burrow(9)], [0, 0, 1, cellar(5)]]);
    const f = formationFor(input);
    expect(f.squads.map((s) => [s.building, s.lane, s.rank, s.file])).toEqual([[9, 0, 0, 2], [4, 0, 1, 3], [2, 1, 0, 1]]);
    const reversed = { ...input, plots: [...input.plots].reverse() };
    const r = formationFor(reversed);
    const placed = (s: SquadPlan): SquadPlan => ({ ...s, plot: -1 });
    expect(r.squads.map(placed)).toEqual(f.squads.map(placed));
    expect(r.squads.map((s) => reversed.plots[s.plot])).toEqual(f.squads.map((s) => input.plots[s.plot]));
    expect(muster('twin-roots', 'player', [[0, 0, 2, burrow(9)], [0, 1, 3, burrow(4)], [1, 0, 1, burrow(2)]]))
      .toEqual(musterFor({ ...reversed, mergeRadius: 1.5, radiusOf }));
  });

  it('refuses two buildings on one plot, one building on two plots and a spawner with no squad', () => {
    const input = on('bogwater-hollow', 'player', [[0, 0, 1, burrow(1)]]);
    expect(() => formationFor({ ...input, plots: [...input.plots, input.plots[0]!] })).toThrow(/two plots at lane 0, rank 0, file 1/);
    expect(() => formationFor(on('bogwater-hollow', 'player', [[0, 0, 1, burrow(1)], [0, 0, 2, burrow(1)]]))).toThrow(/building 1 stands on two plots/);
    expect(() => formationFor(on('bogwater-hollow', 'player', [[0, 0, 1, { id: 1, kind: 'spawner', mergeOn: true }]]))).toThrow(/spawner 1 needs a squad/);
  });
});

describe('musterFor: squads knit in place at the muster (SPEC §5.6)', () => {
  it("a Burrow's 8 come to 2 Bloomed and 2 base, in one pass, at their trios' centroids", () => {
    for (const side of SIDES) {
      for (const file of [1, 2, 3, 4]) {
        const planted: Planted[] = [[0, 0, file, burrow(1)]];
        const p = muster('bogwater-hollow', side, planted);
        expect(p.byBuilding).toEqual({ 1: counts(0, 2, 2) });
        expect(p.trios.map((t) => [t.tier, t.pass, t.parts.length])).toEqual([[2, 1, 3], [2, 1, 3]]);
        const arrival = formationFor(on('bogwater-hollow', side, planted)).squads[0]!.units;
        for (const t of p.trios) {
          expect(t.x).toBeCloseTo(t.parts.reduce((x, q) => x + arrival[q.j]!.x, 0) / 3, 9);
          expect(t.y).toBeCloseTo(t.parts.reduce((y, q) => y + arrival[q.j]!.y, 0) / 3, 9);
        }
      }
    }
  });

  it('two Burrows side by side, and three in a row, give the same result whichever was planted first', () => {
    // a building's id follows the order it was planted in; the muster follows plot order instead (A024)
    const byFile = (side: Side, files: number[], ids: number[]) => {
      const fileOf = (id: number): number => files[ids.indexOf(id)]!;
      const p = muster('bogwater-hollow', side, files.map((file, i): Planted => [0, 0, file, burrow(ids[i]!)]));
      return {
        byFile: Object.fromEntries(Object.entries(p.byBuilding).map(([id, n]) => [fileOf(Number(id)), n])),
        trios: p.trios.map((t) => ({ ...t, parts: t.parts.map((q) => [fileOf(q.building), q.j]) })),
      };
    };
    const cases: [number[], number[][], TierCounts][] = [
      [[2, 3], [[1, 2], [2, 1]], counts(1, 2, 1)],
      [[1, 2, 3], [[1, 2, 3], [1, 3, 2], [2, 1, 3], [2, 3, 1], [3, 1, 2], [3, 2, 1]], counts(2, 2, 0)],
    ];
    for (const side of SIDES) {
      for (const [files, orders, total] of cases) {
        const first = byFile(side, files, orders[0]!);
        for (const ids of orders) expect(byFile(side, files, ids)).toEqual(first);
        const sum = (k: keyof TierCounts): number => Object.values(first.byFile).reduce((n, c) => n + c[k], 0);
        expect(counts(sum('elders'), sum('bloomed'), sum('base'))).toEqual(total);
        // the neighbours share an Elder: its 9 parts come from more than one Burrow
        expect(first.trios.some((t) => t.tier === 3 && t.pass === 2 && t.parts.length === 9 && new Set(t.parts.map(([f]) => f)).size > 1)).toBe(true);
      }
    }
  });

  it('a merge-off Burrow adds nothing to its neighbour and fields its 8 base; a burst squad never knits', () => {
    const pod: FieldingBuilding = { id: 3, kind: 'spawner', squad: { unitId: 'burster', count: 6, radius: 0.25, eligible: false }, mergeOn: true };
    for (const side of SIDES) {
      expect(muster('bogwater-hollow', side, [[0, 0, 2, burrow(1)], [0, 0, 3, burrow(2, false)]]).byBuilding).toEqual({ 1: counts(0, 2, 2), 2: counts(0, 0, 8) });
      expect(muster('bogwater-hollow', side, [[0, 0, 2, pod]])).toEqual({ byBuilding: { 3: counts(0, 0, 6) }, trios: [] });
    }
  });

  it("knits nothing across Twin Roots' root wall, even with a merge radius of 3 (A040)", () => {
    // lane 0's file 3 (rows 4–5) and lane 1's file 1 (rows 7–8): their nearest units stand 1.67 tiles apart
    for (const side of SIDES) {
      const p = muster('twin-roots', side, [[0, 0, 3, burrow(1)], [1, 0, 1, burrow(2)]], 3);
      expect(p.byBuilding).toEqual({ 1: counts(0, 2, 2), 2: counts(0, 2, 2) });
      for (const t of p.trios) expect(new Set(t.parts.map((q) => q.building)).size).toBe(1);
    }
  });

  it('is a pure function of its input: the same input gives the same result and is left as it was', () => {
    const input = { ...on('bogwater-hollow', 'enemy', [[0, 0, 2, burrow(1)], [0, 0, 3, burrow(2)]]), mergeRadius: 1.5, radiusOf };
    const before = JSON.stringify(input);
    expect(musterFor(input)).toEqual(musterFor(input));
    expect(formationFor(input)).toEqual(formationFor(input));
    expect(JSON.stringify(input)).toBe(before);
  });
});

describe("formationOf and mergePreview on a battle's state (SPEC §4.6, §5.6, §14.6, plan Call 6)", () => {
  const front = (file: number) => ({ lane: 0, rank: 0, file });
  /** Each side's two Burrows side by side, and a Gill Nest behind the first, in round 1's planning. */
  const colony = (flags: { merging?: boolean } = {}): BattleState => {
    const planted = [{ building: 'sporelingBurrow', ...front(2) }, { building: 'sporelingBurrow', ...front(3) }, { building: 'gillNest', lane: 0, rank: 1, file: 2 }];
    return createFromScenario(content, { id: 'previews', description: 'Previews.', map: 'bogwater-hollow', flags, sides: { player: { colony: planted }, enemy: { colony: planted } } });
  };
  const changes: [string, (s: BattleState, side: Side) => PlanChange][] = [
    ['a plant', (s, side) => ({ plant: { buildingId: 'sporelingBurrow', plot: plotAt(s, side, front(4)) } })],
    ['a sale', (s, side) => ({ sell: s.buildings.find((b) => b.side === side)!.id })],
    ['a toggle', (s, side) => ({ toggle: { id: s.buildings.find((b) => b.side === side)!.id, on: false } })],
  ];
  /** The change, made as its command makes it: at once, as the general's turn runs its commands in the opening (T068). */
  const make = (s: BattleState, side: Side, c: PlanChange): string | null =>
    'plant' in c ? plantAtOnce(s, side, c.plant.buildingId, c.plant.plot) : 'sell' in c ? sellAtOnce(s, side, c.sell) : toggleAtOnce(s, side, c.toggle.id, c.toggle.on);

  it("builds T020's input from the state: the squads and the muster the plain records give", () => {
    const s = colony();
    for (const side of SIDES) {
      const [a, b, nest] = s.buildings.filter((x) => x.side === side);
      const archers: FieldingBuilding = { id: nest!.id, kind: 'spawner', squad: { unitId: 'gillArcher', count: 4, radius: radiusOf('gillArcher', 1) }, mergeOn: true };
      const planted: Planted[] = [[0, 0, 2, burrow(a!.id)], [0, 0, 3, burrow(b!.id)], [0, 1, 2, archers]];
      expect(formationOf(s, side)).toEqual(formationFor(on('bogwater-hollow', side, planted)).squads);
      expect(mergePreview(s, side)).toEqual(muster('bogwater-hollow', side, planted));
    }
  });

  it.each(changes)('previews %s as the state after it, on both sides', (_, change) => {
    for (const side of SIDES) {
      const s = colony(), c = change(s, side), after = restore(snapshot(s));
      expect(make(after, side, c)).toBeNull();
      expect(formationOf(s, side, c)).toEqual(formationOf(after, side));
      expect(mergePreview(s, side, c)).toEqual(mergePreview(after, side));
      expect(formationOf(s, side, c)).not.toEqual(formationOf(s, side));
    }
  });

  it('previews a change its command would refuse as the colony stands', () => {
    const s = colony();
    const refused: PlanChange[] = [
      { plant: { buildingId: 'gillNest', plot: plotAt(s, 'player', front(2)) } }, // a taken plot
      { plant: { buildingId: 'gillNest', plot: plotAt(s, 'player', { lane: 0, rank: 2, file: 1 }) } }, // a closed plot
      { sell: s.buildings.find((b) => b.side === 'enemy')!.id }, // the general's building
      { toggle: { id: 99, on: false } }, // no building
    ];
    for (const c of refused) {
      expect(formationOf(s, 'player', c)).toEqual(formationOf(s, 'player'));
      expect(mergePreview(s, 'player', c)).toEqual(mergePreview(s, 'player'));
    }
  });

  it('writes nothing and draws on no stream: hashState and every stream are the same after either call (§13.3)', () => {
    const s = colony();
    const hash = hashState(s), streams = JSON.stringify(s.rng);
    for (const side of SIDES) {
      for (const c of [undefined, ...changes.map(([, change]) => change(s, side))]) {
        formationOf(s, side, c);
        mergePreview(s, side, c);
      }
    }
    expect([hashState(s), JSON.stringify(s.rng)]).toEqual([hash, streams]);
  });

  it("knits nothing with the battle's merging off, nor a squad that arrives burrowed or bursts (§5.6)", () => {
    const off = colony({ merging: false });
    for (const side of SIDES) {
      expect(mergePreview(off, side).trios).toEqual([]);
      expect(formationOf(off, side).some((q) => q.eligible)).toBe(false);
    }
    const s = colony();
    for (const buildingId of ['bursterPod', 'rhizomorphTunnel']) {
      const squads = formationOf(s, 'player', { plant: { buildingId, plot: plotAt(s, 'player', front(4)) } });
      expect(squads.find((q) => q.building === s.nextId)?.eligible, buildingId).toBe(false);
    }
  });
});
