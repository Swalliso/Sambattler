// The formation box and the muster (SPEC §4.6, §5.6, §15.7): `src/sim/formation.ts`'s slot layout and
// the muster's knitting, as pure functions of plain records, for R1's clash check and R2a's
// `formationOf` and `mergePreview`. The muster's last case checks it against the sim's own merging.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  emplacementPosition, findTrios, formationBox, formationFor, formationOf, mergePreview, musterFor, musterKnits, overflows, slotGrid, slotPositions,
} from '../../src/sim/formation.ts';
import type {
  FieldGeom, FieldingBuilding, FormationInput, MergePreview, MusterOpts, MusterUnit, PlanChange, Slot, SquadPlan, TierCounts,
} from '../../src/sim/formation.ts';
import { addUnit, createFromScenario } from '../../src/sim/index.ts';
import type { BattleState, Side, Tier } from '../../src/sim/index.ts';
import { SIDES } from '../../src/sim/state.ts';
import { mergeTriosNow, mergingSystem } from '../../src/sim/systems/merging.ts';
import { clashTick, findUnit } from '../../src/sim/world.ts';
import { ROOT } from '../../tools/lib/content.ts';
import { colonyPlots, openOrder } from '../../src/sim/colony.ts';
import { hashState, restore, snapshot } from '../../src/sim/index.ts';
import { plant as plantAtOnce, sell as sellAtOnce, toggleMerge as toggleAtOnce, upgrade as upgradeAtOnce } from '../../src/sim/planning.ts';
import { content, planningState, plotAt } from '../helpers.ts';

/** A map's geometry with the clash check's 6-tile gap between the front ranks (plan call 19). */
function geom(mapId: string): FieldGeom {
  const map = content.maps[mapId]!;
  return { width: map.width, lanes: map.lanes, gapTiles: 6 };
}

const at = (slots: Slot[], lane: number, rank: number, file: number): Slot =>
  slots.find((s) => s.lane === lane && s.rank === rank && s.file === file)!;
const colsByRank = (slots: Slot[]) => [...new Set(slots.map((s) => `${s.rank}:${s.col}`))];

describe('the formation box (SPEC §4.6)', () => {
  it('on the one-lane field: front ranks 6 tiles apart mid-lane, files 1–4 down the lane', () => {
    const flat = geom('test-flat');
    expect(flat).toMatchObject({ width: 32, lanes: [{ rowStart: 0, rowEnd: 7 }] });
    const player = formationBox(flat, 'player', 2);
    const general = formationBox(flat, 'enemy', 2);
    // §4.1's Bogwater columns: the player's slots in 9–12, the general's in 19–22
    expect(colsByRank(player)).toEqual(['0:11', '1:9']);
    expect(colsByRank(general)).toEqual(['0:19', '1:21']);
    expect(at(general, 0, 0, 1).col - (at(player, 0, 0, 1).col + 2)).toBe(6);
    for (const slots of [player, general]) {
      expect(slots).toHaveLength(8);
      for (const rank of [0, 1]) expect([1, 2, 3, 4].map((f) => at(slots, 0, rank, f).row)).toEqual([0, 2, 4, 6]);
    }
    expect(colsByRank(formationBox(flat, 'player', 3))).toEqual(['0:11', '1:9', '2:7']);
    expect(colsByRank(formationBox(flat, 'enemy', 3))).toEqual(['0:19', '1:21', '2:23']);
  });

  it('on Twin Roots: 3 files a lane; on the three-lane field 2, with no slot on the leftover row', () => {
    const twin = formationBox(geom('twin-roots'), 'player', 2);
    expect(twin).toHaveLength(12);
    expect(twin.filter((s) => s.lane === 0 && s.rank === 0).map((s) => s.row)).toEqual([0, 2, 4]);
    expect(twin.filter((s) => s.lane === 1 && s.rank === 0).map((s) => s.row)).toEqual([7, 9, 11]);

    const three = geom('test-3lane');
    expect(three.width).toBe(30);
    for (const side of ['player', 'enemy'] as const) {
      const slots = formationBox(three, side, 2);
      expect(slots).toHaveLength(12);
      for (const [l, lane] of three.lanes.entries()) {
        expect(lane.rowEnd - lane.rowStart + 1).toBe(5);
        const rows = slots.filter((s) => s.lane === l && s.rank === 0).map((s) => s.row);
        expect(rows).toEqual([lane.rowStart, lane.rowStart + 2]);
        for (const s of slots.filter((t) => t.lane === l)) expect(s.row + 1).toBeLessThan(lane.rowEnd); // the bottom row holds none
      }
    }
    expect(at(formationBox(three, 'player', 2), 0, 0, 1).col).toBe(10);
    expect(at(formationBox(three, 'enemy', 2), 0, 0, 1).col).toBe(18);
  });

  it('orders its slots by lane, then rank, then file (SPEC §13.3 rule 4)', () => {
    for (const side of ['player', 'enemy'] as const) {
      const slots = formationBox(geom('twin-roots'), side, 3);
      const sorted = [...slots].sort((a, b) => a.lane - b.lane || a.rank - b.rank || a.file - b.file);
      expect(slots).toEqual(sorted);
      expect(slots[0]).toMatchObject({ lane: 0, rank: 0, file: 1 });
    }
  });

  it('refuses a box that would not fit or centre on the field', () => {
    expect(() => formationBox({ width: 31, lanes: [{ rowStart: 0, rowEnd: 7 }], gapTiles: 6 }, 'player', 2)).toThrow(/even/);
    expect(() => formationBox(geom('test-flat'), 'player', 7)).toThrow(/fit/);
    expect(formationBox(geom('test-flat'), 'player', 6).at(-1)!.col).toBe(1);
  });
});

describe('a squad in its slot (SPEC §4.6)', () => {
  const flat = geom('test-flat');
  const slotOf = (side: Side, file = 1) => at(formationBox(flat, side, 2), 0, 0, file);

  it('stands on a k × k grid with spacing 2/k, front to back, then top to bottom', () => {
    const ks: Record<number, number> = { 1: 1, 2: 2, 3: 2, 4: 2, 6: 3, 8: 3, 9: 3, 12: 4 };
    for (const [nText, k] of Object.entries(ks)) {
      const n = Number(nText);
      expect(slotGrid(n)).toEqual({ k, spacing: 2 / k });
      for (const side of ['player', 'enemy'] as const) {
        const slot = slotOf(side, 2);
        const ps = slotPositions(n, slot, side);
        expect(ps).toHaveLength(n);
        ps.forEach((p, j) => {
          const depth = ((j % k) + 0.5) * (2 / k); // from the slot's front: +x for the player, −x for the general
          expect(p.x).toBeCloseTo(side === 'player' ? slot.col + 2 - depth : slot.col + depth, 12);
          expect(p.y).toBeCloseTo(slot.row + (Math.floor(j / k) + 0.5) * (2 / k), 12);
          expect(p.x > slot.col && p.x < slot.col + 2 && p.y > slot.row && p.y < slot.row + 2).toBe(true);
        });
        if (k * k === n) { // a full grid is centred in the slot
          expect(ps.reduce((a, p) => a + p.x, 0) / n).toBeCloseTo(slot.col + 1, 12);
          expect(ps.reduce((a, p) => a + p.y, 0) / n).toBeCloseTo(slot.row + 1, 12);
        }
      }
    }
    expect(slotPositions(0, slotOf('player'), 'player')).toEqual([]);
  });

  it('8 Sporelings in the front slot of file 1, on both sides', () => {
    const third = 2 / 3;
    const player = slotPositions(8, slotOf('player'), 'player');
    const general = slotPositions(8, slotOf('enemy'), 'enemy');
    const expected = (x0: number, dir: number) => Array.from({ length: 8 }, (_, j) => ({
      x: x0 + dir * ((j % 3) + 0.5) * third, y: (Math.floor(j / 3) + 0.5) * third,
    }));
    for (const [ps, want] of [[player, expected(13, -1)], [general, expected(19, 1)]] as const) {
      ps.forEach((p, j) => { expect(p.x).toBeCloseTo(want[j]!.x, 12); expect(p.y).toBeCloseTo(want[j]!.y, 12); });
    }
    expect(player[0]!.x).toBeCloseTo(12 + 2 / 3, 12); // unit 0 stands front and top
    expect(player[7]!.x).toBeCloseTo(12, 12);
    expect(general[0]!.x).toBeCloseTo(19 + 1 / 3, 12);
  });

  it('one unit, or an emplacement, stands at the slot centre', () => {
    for (const side of ['player', 'enemy'] as const) {
      const slot = slotOf(side, 3);
      expect(slotPositions(1, slot, side)).toEqual([{ x: slot.col + 1, y: slot.row + 1 }]);
      expect(emplacementPosition(slot)).toEqual({ x: slot.col + 1, y: slot.row + 1 });
    }
  });

  it('overflows when its units are wider than the grid spacing', () => {
    expect(overflows(8, 0.25)).toBe(false); // 8 Sporelings: 0.5 < 0.667
    expect(overflows(2, 0.45)).toBe(false); // 2 Amanita Knights: 0.9 < 1.0
    expect(overflows(3, 0.45)).toBe(false); // 3 Rootbreakers: 0.9 < 1.0
    expect(overflows(5, 0.35)).toBe(true); // 5 Capguards: 0.7 > 0.667
    expect(overflows(12, 0.25)).toBe(false); // 12 Sporelings: 0.5 = 0.5, an exact fit
  });

  it('is a pure function of its input: the same answer twice, and no stream drawn', () => {
    const once = formationBox(geom('twin-roots'), 'enemy', 3).map((s) => slotPositions(8, s, 'enemy'));
    const twice = formationBox(geom('twin-roots'), 'enemy', 3).map((s) => slotPositions(8, s, 'enemy'));
    expect(twice).toEqual(once);
    const src = readFileSync(join(ROOT, 'src/sim/formation.ts'), 'utf8');
    expect(src).not.toMatch(/from '\.\/rng\.ts'|\brng\b|nextFloat|seedStream/);
  });
});

/** A unit placed by hand: where it stands, and what the muster reads of it. */
interface Placed {
  side: Side; lane: number; unitId: string; x: number; y: number;
  tier?: Tier; mergeOn?: boolean; eligible?: boolean; source?: number;
}

/** Muster records for placed units, keyed in list order from `key`. */
const records = (placed: Placed[], key = 0): MusterUnit[] => placed.map((p, i) => ({
  key: key + i, side: p.side, lane: p.lane, unitId: p.unitId, tier: p.tier ?? 1, x: p.x, y: p.y,
  mergeOn: p.mergeOn ?? true, eligible: p.eligible ?? true, source: p.source ?? 0,
}));

/** A squad of n at its slot's layout positions. */
const squadAt = (side: Side, slot: Slot, n: number, unitId: string, source: number, mergeOn = true): Placed[] =>
  slotPositions(n, slot, side).map((p): Placed => ({ side, lane: slot.lane, unitId, x: p.x, y: p.y, mergeOn, source }));

/** Sporeling Burrows (8 Sporelings each) in a lane's front-rank files, in slot order; a squad's source is its file. */
function burrows(side: Side, files: number[], o: { mapId?: string; lane?: number; mergeOff?: number[] } = {}): Placed[] {
  const slots = formationBox(geom(o.mapId ?? 'test-flat'), side, 2);
  return files.flatMap((f) => squadAt(side, at(slots, o.lane ?? 0, 0, f), 8, 'sporeling', f, !(o.mergeOff ?? []).includes(f)));
}

/** Player Sporelings in lane 0 at the given points, keyed in order. */
const sporelings = (...pts: [number, number][]): MusterUnit[] =>
  records(pts.map(([x, y]): Placed => ({ side: 'player', lane: 0, unitId: 'sporeling', x, y })));

const fielded = (units: MusterUnit[]) => ({
  elders: units.filter((u) => u.tier === 3).length,
  bloomed: units.filter((u) => u.tier === 2).length,
  base: units.filter((u) => u.tier === 1).length,
});

const compiled = planningState().compiled.player;
const radiusOf = (unitId: string, tier: Tier): number => compiled.units[unitId]!.tiers[tier - 1]!.radius;

/** The muster's options on a field, with merging's 1.5-tile radius (§5.6) unless given. */
function optsOn(g: FieldGeom, firstKey: number, mergeRadius = 1.5): MusterOpts {
  return { firstKey, mergeRadius, radiusOf, lanes: g.lanes.map((l) => ({ top: l.rowStart, bottom: l.rowEnd })), width: g.width };
}

/**
 * The key-order case: 0, 5 and 6 stand in a row 0.9 × the radius apart, so 6 is beyond 0's reach but
 * within 5's, and {1, 2, 3} stand out of 0's reach. The walk skips 0 (one match), forms {1, 2, 3}, then
 * 5 takes 0 and 6. Key 4 is a Capguard, on its own.
 */
const KEY_ORDER: Placed[] = ([[10, 1], [14, 5], [14.5, 5], [14, 5.5], [20, 4], [10 + 0.9 * 1.5, 1], [10 + 1.8 * 1.5, 1]] as [number, number][])
  .map(([x, y], i): Placed => ({ side: 'player', lane: 0, unitId: i === 4 ? 'capguard' : 'sporeling', x, y }));

describe('the muster: squads knit in place, to a fixed point (SPEC §5.6)', () => {
  const flat = geom('test-flat');

  it('one Burrow in a front slot fields 2 Bloomed + 2 base, in one pass', () => {
    for (const side of SIDES) {
      for (const file of [1, 2, 3, 4]) {
        const units = records(burrows(side, [file]));
        const res = musterKnits(units, optsOn(flat, 8));
        expect(fielded(res.units)).toEqual({ elders: 0, bloomed: 2, base: 2 });
        expect(res.passes).toEqual([findTrios(units, 1.5)]);
      }
    }
  });

  it('two Burrows side by side field 1 Elder + 2 Bloomed + 1 base, in 2 passes', () => {
    // On the two slots' grid, 3 columns from the front and 6 rows (file 2 holds keys 0–7, file 3 keys
    // 8–15), the first pass leaves 5 Bloomed and the base unit 13; the three Bloomed at the top then knit.
    for (const side of SIDES) {
      const res = musterKnits(records(burrows(side, [2, 3])), optsOn(flat, 16));
      expect(fielded(res.units)).toEqual({ elders: 1, bloomed: 2, base: 1 });
      expect(res.passes).toEqual([[[0, 1, 3], [2, 4, 5], [6, 7, 8], [9, 10, 12], [11, 14, 15]], [[16, 17, 18]]]);
      expect(res.units.map((u) => u.key)).toEqual([13, 19, 20, 21]);
    }
  });

  it('three Burrows side by side field 2 Elders + 2 Bloomed and no base', () => {
    for (const side of SIDES) {
      const res = musterKnits(records(burrows(side, [1, 2, 3])), optsOn(flat, 24));
      expect(fielded(res.units)).toEqual({ elders: 2, bloomed: 2, base: 0 });
      expect(res.passes).toEqual([
        [[0, 1, 3], [2, 4, 5], [6, 7, 8], [9, 10, 12], [11, 14, 15], [13, 17, 18], [16, 19, 20], [21, 22, 23]],
        [[24, 25, 26], [27, 28, 29]],
      ]);
    }
  });

  it('a Burrow beside a merge-off Burrow: the merge-off squad adds nothing and fields its 8 base', () => {
    for (const side of SIDES) {
      const units = records(burrows(side, [2, 3], { mergeOff: [3] }));
      const res = musterKnits(units, optsOn(flat, 16));
      expect(fielded(res.units.filter((u) => u.source === 2))).toEqual({ elders: 0, bloomed: 2, base: 2 });
      expect(res.units.filter((u) => u.source === 3)).toEqual(units.filter((u) => u.source === 3));
      expect(res.passes.flat(2).filter((k) => k >= 8 && k < 16)).toEqual([]);
    }
  });

  it('never knits across lanes, even with a merge radius of 3 across Twin Roots\' root wall', () => {
    // A Burrow in lane 0's file 3 (rows 4–5) and one in lane 1's file 1 (rows 7–8): their nearest units
    // stand 1.67 tiles apart, across the wall. Each lane fields as its Burrow alone would.
    const units = records([...burrows('player', [3], { mapId: 'twin-roots' }), ...burrows('player', [1], { mapId: 'twin-roots', lane: 1 })]);
    const res = musterKnits(units, optsOn(geom('twin-roots'), 16, 3));
    for (const lane of [0, 1]) expect(fielded(res.units.filter((u) => u.lane === lane))).toEqual({ elders: 0, bloomed: 2, base: 2 });
    expect(res.passes).toHaveLength(1);
    for (const trio of res.passes[0]!) expect(new Set(trio.map((k) => units[k]!.lane)).size).toBe(1);
  });

  it('knits only eligible units of one side, type, tier and lane', () => {
    const row = (...over: Partial<Placed>[]): MusterUnit[] =>
      records(over.map((o, i): Placed => ({ side: 'player', lane: 0, unitId: 'sporeling', x: 12 + 0.5 * i, y: 4, ...o })));
    expect(findTrios(row({}, {}, {}), 1.5)).toEqual([[0, 1, 2]]);
    expect(findTrios(row({ tier: 3 }, { tier: 3 }, { tier: 3 }), 1.5)).toEqual([]);
    expect(findTrios(row({}, { mergeOn: false }, {}), 1.5)).toEqual([]);
    expect(findTrios(row({}, {}, { eligible: false }), 1.5)).toEqual([]); // burrowed, or a burst unit
    expect(findTrios(row({}, { unitId: 'capguard' }, {}), 1.5)).toEqual([]);
    expect(findTrios(row({}, { tier: 2 }, {}), 1.5)).toEqual([]);
    expect(findTrios(row({}, {}, { side: 'enemy' }), 1.5)).toEqual([]);
    expect(findTrios(row({}, {}, { lane: 1 }), 1.5)).toEqual([]);
  });

  it('runs to a fixed point: on its own output it finds no trio', () => {
    for (const files of [[1], [2, 3], [1, 2, 3], [1, 2, 3, 4]]) {
      const units = records(burrows('player', files));
      const res = musterKnits(units, optsOn(flat, units.length));
      expect(res.passes.length).toBeGreaterThan(0);
      expect(findTrios(res.units, 1.5)).toEqual([]);
      expect(musterKnits(res.units, optsOn(flat, units.length + res.passes.flat().length))).toEqual({ passes: [], units: res.units });
    }
  });

  it('sends ties to the lower key', () => {
    // three matches exactly 1 tile from key 0: the two lower keys join it
    expect(findTrios(sporelings([10, 4], [10, 5], [11, 4], [9, 4]), 1.5)).toEqual([[0, 1, 2]]);
    // the nearest (key 3) joins first, then the lower of two at the same distance
    expect(findTrios(sporelings([10, 4], [10.5, 4], [9.5, 4], [10, 4.4]), 1.5)).toEqual([[0, 1, 3]]);
  });

  it('musters a colony the same on both sides: a tie goes by key, however the positions round', () => {
    // Five Burrows on one lane, as mono Sporeling plants them at 600 gold: front files 1–4, then back
    // file 2. The two sides' grids mirror, so every distance is the same on both, but their positions
    // round differently (13 − 1/3 against 19 + 1/3), which once sent ties different ways by seat (R1 S3).
    const colony = (side: Side): MusterUnit[] => {
      const slots = formationBox(flat, side, 2);
      return records(([[0, 1], [0, 2], [0, 3], [0, 4], [1, 2]] as const).flatMap(([rank, file]) => squadAt(side, at(slots, 0, rank, file), 8, 'sporeling', file)));
    };
    const player = musterKnits(colony('player'), optsOn(flat, 40));
    const general = musterKnits(colony('enemy'), optsOn(flat, 40));
    expect(fielded(player.units)).toEqual({ elders: 3, bloomed: 4, base: 1 });
    expect(general.passes).toEqual(player.passes);
    expect(general.units).toHaveLength(player.units.length);
    general.units.forEach((u, i) => {
      const p = player.units[i]!;
      expect([u.key, u.tier]).toEqual([p.key, p.tier]);
      expect(u.x).toBeCloseTo(flat.width - p.x, 9);
      expect(u.y).toBeCloseTo(p.y, 9);
    });
    // Scaled by 27, every coordinate is a whole number (the arrival's thirds, a Bloomed unit's ninths), so
    // every squared distance is exact: the walk gives the same passes
    const exact = colony('player').map((u) => ({ ...u, x: Math.round(27 * u.x), y: Math.round(27 * u.y) }));
    expect(musterKnits(exact, {
      ...optsOn(flat, 40, 27 * 1.5), radiusOf: (id, tier) => 27 * radiusOf(id, tier), lanes: [{ top: 0, bottom: 27 * 8 - 1 }], width: 27 * flat.width,
    }).passes).toEqual(player.passes);
  });

  it('gives a merged unit the next key, above every other, and its lowest-key parent\'s source and toggle', () => {
    const units = records([
      { side: 'player', lane: 0, unitId: 'sporeling', x: 12, y: 3, source: 9 },
      { side: 'player', lane: 0, unitId: 'sporeling', x: 12.5, y: 3, source: 2 },
      { side: 'player', lane: 0, unitId: 'capguard', x: 20, y: 3, source: 4 },
      { side: 'player', lane: 0, unitId: 'sporeling', x: 12, y: 3.5, source: 5 },
    ], 4); // keys 4–7
    const before = structuredClone(units);
    const res = musterKnits(units, optsOn(flat, 8));
    expect(units).toEqual(before); // its input is left as it was
    expect(res.passes).toEqual([[[4, 5, 7]]]);
    expect(res.units.map((u) => u.key)).toEqual([6, 8]);
    expect(res.units[1]).toMatchObject({ key: 8, side: 'player', lane: 0, unitId: 'sporeling', tier: 2, source: 9, mergeOn: true, eligible: true });
    expect(res.units[1]!.x).toBe((12 + 12.5 + 12) / 3);
    expect(res.units[1]!.y).toBe((3 + 3 + 3.5) / 3);
    expect(() => musterKnits(units, optsOn(flat, 7))).toThrow(/above every key/);
    const mixed = [...units, ...records([{ side: 'enemy', lane: 0, unitId: 'sporeling', x: 20, y: 3 }], 8)];
    expect(() => musterKnits(mixed, optsOn(flat, 9))).toThrow(/one side/);
  });

  it('clamps a merged unit to its lane by its merged radius, as addUnit does', () => {
    const opts: MusterOpts = { ...optsOn(geom('twin-roots'), 100), radiusOf: (_id, tier) => (tier === 1 ? 0.25 : 0.5) };
    const trioAt = (x: number, y: number, dx: number, dy: number, lane: number): MusterUnit[] =>
      records([[0, 0], [dx, 0], [0, dy]].map(([a, b]): Placed => ({ side: 'player', lane, unitId: 'sporeling', x: x + a!, y: y + b! })));
    const corner = (...args: [number, number, number, number, number]) => musterKnits(trioAt(...args), opts).units[0]!;
    expect(corner(0.25, 0.25, 0.5, 0.5, 0)).toMatchObject({ tier: 2, x: 0.5, y: 0.5 }); // r ≤ x, top + r ≤ y
    expect(corner(31.75, 12.75, -0.5, -0.5, 1)).toMatchObject({ tier: 2, x: 31.5, y: 12.5 }); // x ≤ width − r, y ≤ bottom + 1 − r
    const lane1 = corner(16, 7.25, 0.5, 0.5, 1); // lane 1's top row is 7
    expect(lane1.y).toBe(7.5);
    expect(lane1.x).toBe((16 + 16.5 + 16) / 3);
  });

  it('walks in key order: a unit skipped once joins a later trio, and new keys follow each trio\'s lowest key', () => {
    const units = records(KEY_ORDER);
    const res = musterKnits(units, optsOn(flat, 7));
    expect(res.passes).toEqual([[[0, 5, 6], [1, 2, 3]]]);
    expect(res.units.map((u) => u.key)).toEqual([4, 7, 8]);
    expect(res.units[1]!.x).toBe((units[0]!.x + units[5]!.x + units[6]!.x) / 3); // {0, 5, 6} takes key 7
    expect(res.units[2]!.y).toBe((5 + 5 + 5.5) / 3); // {1, 2, 3} takes key 8
  });
});

describe('the muster agrees with the sim\'s merging (src/sim/systems/merging.ts)', () => {
  const flatSlots = (side: Side) => formationBox(geom('test-flat'), side, 2);
  const cases: { name: string; map?: string; radius?: number; placed: Placed[] }[] = [
    { name: 'one Burrow a side', placed: [...burrows('player', [1]), ...burrows('enemy', [4])] },
    { name: 'two Burrows side by side, both sides', placed: [...burrows('player', [2, 3]), ...burrows('enemy', [2, 3])] },
    { name: 'three Burrows side by side, both sides', placed: [...burrows('player', [1, 2, 3]), ...burrows('enemy', [1, 2, 3])] },
    { name: 'a Burrow beside a merge-off Burrow', placed: burrows('player', [2, 3], { mergeOff: [3] }) },
    {
      name: 'a Capguard Hall above a Burrow, and a Gill Nest behind',
      placed: [
        ...squadAt('player', at(flatSlots('player'), 0, 0, 2), 4, 'capguard', 1),
        ...squadAt('player', at(flatSlots('player'), 0, 0, 3), 8, 'sporeling', 2),
        ...squadAt('player', at(flatSlots('player'), 0, 1, 2), 4, 'gillArcher', 3),
      ],
    },
    { name: 'the key-order case', placed: KEY_ORDER },
    {
      name: 'Twin Roots, with a merge radius of 3 across the root wall',
      map: 'twin-roots', radius: 3,
      placed: [
        ...burrows('player', [3], { mapId: 'twin-roots' }), ...burrows('player', [1], { mapId: 'twin-roots', lane: 1 }),
        ...burrows('enemy', [3], { mapId: 'twin-roots' }), ...burrows('enemy', [1], { mapId: 'twin-roots', lane: 1 }),
      ],
    },
  ];

  function battle(c: (typeof cases)[number]): BattleState {
    const s = createFromScenario(content, {
      id: 'muster', description: 'A muster test.', map: c.map ?? 'test-flat', flags: { merging: true }, sides: { player: {}, enemy: {} }, clash: { units: [] },
    });
    if (c.radius) for (const side of SIDES) s.compiled[side].mergeRadius = c.radius;
    for (const p of c.placed) {
      const u = addUnit(s, p.side, p.unitId, p.lane, p.x, p.y, p.source ?? 0);
      if (p.mergeOn === false) u.mergeOn = false;
    }
    return s;
  }

  const recordsOf = (s: BattleState, side: Side): MusterUnit[] => s.units.filter((u) => u.side === side).map((u) => ({
    key: u.id, side: u.side, lane: u.lane, unitId: u.unitId, tier: u.tier, x: u.x, y: u.y,
    mergeOn: u.mergeOn, eligible: !u.burrowed, source: u.sourceBuildingId,
  }));

  const musterOpts = (s: BattleState, side: Side): MusterOpts => ({
    firstKey: s.nextId, mergeRadius: s.compiled[side].mergeRadius,
    radiusOf: (id, tier) => s.compiled[side].units[id]!.tiers[tier - 1]!.radius,
    lanes: s.lanes.map((l) => ({ top: l.rowStart, bottom: l.rowEnd })), width: s.map.width,
  });

  /** The trios the sim's detection started knitting, each ascending, by their lowest id. */
  function knitTrios(s: BattleState, side: Side): number[][] {
    const groups = new Map<number, number[]>();
    for (const u of s.units) {
      if (u.side !== side || !u.knit) continue;
      const g = groups.get(u.knit.group);
      if (g) g.push(u.id); else groups.set(u.knit.group, [u.id]);
    }
    return [...groups.entries()].sort((a, b) => a[0] - b[0]).map(([, ids]) => ids);
  }

  for (const c of cases) {
    it(c.name, () => {
      // detection: on a check tick, mergingSystem starts exactly findTrios's first pass, per side
      const s = battle(c);
      expect(clashTick(s) % s.rules.merge.every).toBe(0);
      const before = { player: recordsOf(s, 'player'), enemy: recordsOf(s, 'enemy') };
      mergingSystem(s);
      let started = 0;
      for (const side of SIDES) {
        const trios = findTrios(before[side], s.compiled[side].mergeRadius);
        expect(knitTrios(s, side)).toEqual(trios);
        started += trios.length;
      }
      expect(started).toBeGreaterThan(0);

      // the muster: each side's passes, player first, applied with mergeTriosNow in order, leave
      // musterKnits's units, and every merged unit's id is its key
      const t = battle(c);
      for (const side of SIDES) {
        const res = musterKnits(recordsOf(t, side), musterOpts(t, side));
        for (const pass of res.passes) mergeTriosNow(t, pass.map((trio) => trio.map((k) => findUnit(t, k)!)));
        expect(recordsOf(t, side)).toEqual(res.units);
      }
    });
  }
});

// ---- the formation of a colony (R2a): plots to slots, the muster to a fixed point, and the previews ----

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
    'plant' in c ? plantAtOnce(s, side, c.plant.buildingId, c.plant.plot) : 'sell' in c ? sellAtOnce(s, side, c.sell)
      : 'toggle' in c ? toggleAtOnce(s, side, c.toggle.id, c.toggle.on) : upgradeAtOnce(s, side, c.upgrade);

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
