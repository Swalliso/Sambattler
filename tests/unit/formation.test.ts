// The formation box and the muster (SPEC §4.6, §5.6, §15.7): `src/sim/formation.ts`'s slot layout and
// the muster's knitting, as pure functions of plain records, for R1's clash check and R2a's
// `formationOf` and `mergePreview`. The muster's last case checks it against the sim's own merging.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { addUnit } from '../../src/sim/create.ts';
import { emplacementPosition, findTrios, formationBox, musterKnits, overflows, slotGrid, slotPositions } from '../../src/sim/formation.ts';
import type { FieldGeom, MusterOpts, MusterUnit, Slot } from '../../src/sim/formation.ts';
import type { BattleState, Side, Tier } from '../../src/sim/index.ts';
import { SIDES } from '../../src/sim/state.ts';
import { mergeTriosNow, mergingSystem } from '../../src/sim/systems/merging.ts';
import { findUnit } from '../../src/sim/world.ts';
import { ROOT } from '../../tools/lib/content.ts';
import { content, liveState } from '../helpers.ts';

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

const compiled = liveState().compiled.player;
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
    const s = liveState({ map: c.map ?? 'test-flat', flags: { merging: true } });
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
      expect(s.tick % s.rules.merge.every).toBe(0);
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
