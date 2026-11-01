// The formation box and the muster (SPEC §4.6, §5.6, §15.7): `src/sim/formation.ts`'s slot layout, as
// pure functions of a field's geometry, for R1's clash check and R2a's `formationOf`.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { emplacementPosition, formationBox, overflows, slotGrid, slotPositions } from '../../src/sim/formation.ts';
import type { FieldGeom, Slot } from '../../src/sim/formation.ts';
import type { Side } from '../../src/sim/index.ts';
import { ROOT } from '../../tools/lib/content.ts';
import { content } from '../helpers.ts';

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
