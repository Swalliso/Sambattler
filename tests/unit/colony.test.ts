// The colony (SPEC §4.1, §4.6, §11.9, §13.3): each map's `colony` block, the plots it gives both sides,
// their terrain and neighbours, and the order the closed third rank opens in (§18.2 #19). `colony.ts`
// is pure functions of the map, so these cases need no battle.
import { describe, expect, it } from 'vitest';
import { MapSchema } from '../../src/data/schema.ts';
import type { MapDef } from '../../src/data/schema.ts';
import { basePlots, buildable, colonyPlots, openOrder, plotNeighbors } from '../../src/sim/colony.ts';
import type { ColonyPlot } from '../../src/sim/colony.ts';
import { SIDES } from '../../src/sim/state.ts';
import { content } from '../helpers.ts';

const COLONY_MAPS = ['bogwater-hollow', 'stumpfield', 'twin-roots', 'test-flat', 'test-3lane'];
const map = (id: string): MapDef => content.maps[id]!;
/** Every plot the colony can hold, the closed ranks' included. */
const allPlots = (m: MapDef): number => openOrder(m).length;
const at = (plots: readonly ColonyPlot[], lane: number, rank: number, file: number): ColonyPlot =>
  plots.find((p) => p.lane === lane && p.rank === rank && p.file === file)!;
/** A rank's terrain by file, as §11.9 draws it: · soil, $ loam, o stump. */
const rankOf = (plots: readonly ColonyPlot[], lane: number, rank: number): string =>
  plots.filter((p) => p.lane === lane && p.rank === rank).map((p) => ({ soil: '·', loam: '$', stump: 'o' })[p.terrain]).join(' ');

describe('the colony block in the map data (SPEC §4.1, §11.9)', () => {
  it('the five maps have one, with homeCols 6, startRanks 2 and the arena plain soil; the four two-lane test maps have none', () => {
    for (const m of Object.values(content.maps)) {
      if (!COLONY_MAPS.includes(m.id)) { expect(m.colony, m.id).toBeUndefined(); continue; }
      const c = m.colony!;
      expect([c.homeCols, c.startRanks], m.id).toEqual([6, 2]);
      c.tiles.forEach((row, r) => {
        // the root walls are v1's, and only the colonies hold terrain
        expect(row === '#'.repeat(m.width), `${m.id} row ${r}`).toBe(m.tiles[r] === '#'.repeat(m.width));
        expect(row.slice(c.homeCols, m.width - c.homeCols), `${m.id} row ${r}`).toMatch(/^(\.+|#+)$/);
      });
    }
  });

  it('refuses odd homeCols, too many open ranks, asymmetric tiles, terrain in the arena or on a leftover row', () => {
    const edited = (id: string, edit: (m: MapDef) => void): string[] => {
      const m = structuredClone(map(id));
      edit(m);
      const res = MapSchema.safeParse(m);
      return res.success ? [] : res.error.issues.map((i) => i.message);
    };
    const put = (m: MapDef, glyph: string, col: number, row: number): void => {
      const rows = m.colony!.tiles;
      rows[row] = rows[row]!.slice(0, col) + glyph + rows[row]!.slice(col + 1);
    };
    expect(edited('bogwater-hollow', () => {})).toEqual([]);
    expect(edited('bogwater-hollow', (m) => { m.colony!.homeCols = 5; })).toEqual([expect.stringMatching(/homeCols 5 must be even/)]);
    expect(edited('bogwater-hollow', (m) => { m.colony!.startRanks = 4; })).toEqual([expect.stringMatching(/startRanks 4 is more than its 3 ranks/)]);
    expect(edited('bogwater-hollow', (m) => { put(m, 'o', 0, 0); })).toEqual([expect.stringMatching(/not point-symmetric at \(0, 0\)/)]);
    expect(edited('bogwater-hollow', (m) => { put(m, '$', 10, 0); put(m, '$', 21, 7); })).toEqual([
      expect.stringMatching(/terrain at \(10, 0\) lies outside the colonies/), expect.stringMatching(/terrain at \(21, 7\) lies outside the colonies/),
    ]);
    // test-3lane's lanes have 5 rows: your bottom row and the general's top row hold no plot
    expect(edited('test-3lane', (m) => { put(m, 'o', 0, 4); put(m, 'o', 29, 12); })).toEqual([
      expect.stringMatching(/lane 0's leftover row/), expect.stringMatching(/lane 2's leftover row/),
    ]);
    expect(edited('test-flat', (m) => { m.colony!.tiles.pop(); })).toEqual([expect.stringMatching(/colony\.tiles must be 8 rows of 32/)]);
  });
});

describe("the colony's plots (SPEC §4.6)", () => {
  it('rank 0 borders the arena on both sides, with each rank behind it 2 columns farther back, and files from the top', () => {
    const bog = map('bogwater-hollow');
    for (const side of SIDES) {
      const plots = colonyPlots(bog, side, 8);
      expect(plots).toHaveLength(12);
      for (const rank of [0, 1, 2]) expect([1, 2, 3, 4].map((f) => at(plots, 0, rank, f).row)).toEqual([0, 2, 4, 6]);
    }
    // the arena is columns 6–25: your ranks stand in 4–5, 2–3 and 0–1, the general's in 26–27, 28–29 and 30–31
    expect([0, 1, 2].map((r) => at(colonyPlots(bog, 'player', 8), 0, r, 1).col)).toEqual([4, 2, 0]);
    expect([0, 1, 2].map((r) => at(colonyPlots(bog, 'enemy', 8), 0, r, 1).col)).toEqual([26, 28, 30]);
  });

  it("mirrors yours for the general: its file 1 mirrors your last file, and its lanes yours from the bottom", () => {
    for (const id of COLONY_MAPS) {
      const m = map(id);
      const player = colonyPlots(m, 'player', allPlots(m)), general = colonyPlots(m, 'enemy', allPlots(m));
      expect(general).toHaveLength(player.length);
      for (const p of player) {
        const files = player.filter((q) => q.lane === p.lane && q.rank === p.rank).length;
        const g = at(general, m.lanes.length - 1 - p.lane, p.rank, files + 1 - p.file);
        expect([g.col, g.row, g.terrain], `${id} lane ${p.lane} rank ${p.rank} file ${p.file}`).toEqual([m.width - 2 - p.col, m.height - 2 - p.row, p.terrain]);
      }
    }
  });

  it("leaves a lane's odd row out: your lane's bottom row, the general's top row", () => {
    const three = map('test-3lane');
    for (const [l, lane] of three.lanes.entries()) {
      expect(lane.rowEnd - lane.rowStart + 1).toBe(5);
      expect(colonyPlots(three, 'player', 12).filter((p) => p.lane === l && p.rank === 0).map((p) => p.row)).toEqual([lane.rowStart, lane.rowStart + 2]);
      expect(colonyPlots(three, 'enemy', 12).filter((p) => p.lane === l && p.rank === 0).map((p) => p.row)).toEqual([lane.rowStart + 1, lane.rowStart + 3]);
    }
  });

  it('reads loam and stump plots from the tiles, as §11.9 lays them out, with the third rank plain soil', () => {
    const ranks = (id: string, side: 'player' | 'enemy'): string[] => {
      const m = map(id), plots = colonyPlots(m, side, 8);
      return m.lanes.flatMap((_, l) => [0, 1, 2].map((r) => rankOf(plots, l, r)));
    };
    // front, back and third rank, lane by lane
    expect(ranks('bogwater-hollow', 'player')).toEqual(['· · · ·', '· $ · ·', '· · · ·']);
    expect(ranks('bogwater-hollow', 'enemy')).toEqual(['· · · ·', '· · $ ·', '· · · ·']);
    expect(ranks('stumpfield', 'player')).toEqual(['· o · $', '· · o ·', '· · · ·']);
    expect(ranks('stumpfield', 'enemy')).toEqual(['$ · o ·', '· o · ·', '· · · ·']);
    expect(ranks('twin-roots', 'player')).toEqual(['· o ·', '· · ·', '· · ·', '· · ·', '$ · $', '· · ·']);
    // the general's loam lane faces your stump lane (§11.9)
    expect(ranks('twin-roots', 'enemy')).toEqual(['· · ·', '$ · $', '· · ·', '· o ·', '· · ·', '· · ·']);
    // a plot is a stump plot if any of its tiles is a stump: Stumpfield's front file 2 has one
    const stump = at(colonyPlots(map('stumpfield'), 'player', 8), 0, 0, 2);
    const glyphs = [0, 1].flatMap((dr) => [...map('stumpfield').colony!.tiles[stump.row + dr]!.slice(stump.col, stump.col + 2)]);
    expect(glyphs.filter((g) => g === 'o')).toHaveLength(1);
  });

  it('never lets a stump plot be built on, and counts 8, 6 and 11 buildable plots', () => {
    for (const [id, n] of [['bogwater-hollow', 8], ['stumpfield', 6], ['twin-roots', 11]] as const) {
      const m = map(id);
      for (const side of SIDES) {
        expect(colonyPlots(m, side, basePlots(m)).filter(buildable), `${id} ${side}`).toHaveLength(n);
        for (const p of colonyPlots(m, side, allPlots(m))) expect(buildable(p)).toBe(p.terrain !== 'stump');
      }
    }
  });

  it('orders plots by lane, rank and file', () => {
    for (const id of COLONY_MAPS) {
      for (const side of SIDES) {
        const plots = colonyPlots(map(id), side, allPlots(map(id)));
        expect(plots).toEqual([...plots].sort((p, q) => p.lane - q.lane || p.rank - q.rank || p.file - q.file));
      }
    }
  });

  it('refuses a map with no colony block, and a count past the colony', () => {
    const { colony: _colony, ...bare } = map('bogwater-hollow');
    expect(() => colonyPlots({ ...bare, id: 'no-colony' }, 'player', 8)).toThrow(/no-colony has no colony block/);
    expect(() => colonyPlots(map('bogwater-hollow'), 'player', 13)).toThrow(/holds 0 to 12 plots, not 13/);
  });
});

describe('neighbours (SPEC §4.6, §11.14)', () => {
  it('in front of, behind and beside, never at a corner', () => {
    const plots = colonyPlots(map('bogwater-hollow'), 'player', 12);
    const i = (rank: number, file: number): number => plots.indexOf(at(plots, 0, rank, file));
    expect(plotNeighbors(plots, i(1, 2))).toEqual({ inFront: i(0, 2), behind: i(2, 2), beside: [i(1, 1), i(1, 3)] });
    expect(plotNeighbors(plots, i(0, 1))).toEqual({ inFront: null, behind: i(1, 1), beside: [i(0, 2)] });
    expect(plotNeighbors(plots, i(2, 4))).toEqual({ inFront: i(1, 4), behind: null, beside: [i(2, 3)] });
  });

  it("never across lanes: Twin Roots' upper file 3 has no neighbour below the root wall", () => {
    const plots = colonyPlots(map('twin-roots'), 'player', 12);
    const i = (lane: number, rank: number, file: number): number => plots.indexOf(at(plots, lane, rank, file));
    expect(plotNeighbors(plots, i(0, 0, 3))).toEqual({ inFront: null, behind: i(0, 1, 3), beside: [i(0, 0, 2)] });
    expect(plotNeighbors(plots, i(1, 1, 1))).toEqual({ inFront: i(1, 0, 1), behind: i(1, 2, 1), beside: [i(1, 1, 2)] });
  });
});

describe('the closed third rank and the order plots open in (SPEC §4.6, §18.2 #19)', () => {
  it('opens the start ranks first, in plot order; then on one lane files 2, 3, 1 and 4 of the third', () => {
    for (const id of ['bogwater-hollow', 'stumpfield', 'test-flat']) {
      const m = map(id);
      expect(basePlots(m)).toBe(8);
      for (const side of SIDES) {
        const plots = colonyPlots(m, side, 8);
        expect(plots.filter((p) => p.open).map((p) => p.rank)).toEqual([0, 0, 0, 0, 1, 1, 1, 1]);
        expect(openOrder(m).slice(0, 8)).toEqual(plots.flatMap((p, i) => (p.rank < 2 ? [i] : [])));
        expect(openOrder(m).slice(8).map((i) => [plots[i]!.rank, plots[i]!.file])).toEqual([[2, 2], [2, 3], [2, 1], [2, 4]]);
        // each plot gained opens the next in that order
        [2, 3, 1, 4].forEach((file, k) => {
          const open = colonyPlots(m, side, 9 + k).filter((p) => p.open && p.rank === 2).map((p) => p.file);
          expect(open.sort()).toEqual([2, 3, 1, 4].slice(0, k + 1).sort());
          expect(open).toContain(file);
        });
      }
    }
  });

  it('on Twin Roots, files 2, 1 and 3, alternating lanes from the top', () => {
    const twin = map('twin-roots');
    expect(basePlots(twin)).toBe(12);
    for (const side of SIDES) {
      const plots = colonyPlots(twin, side, 12);
      expect(plots.filter((p) => !p.open).every((p) => p.rank === 2)).toBe(true);
      expect(openOrder(twin).slice(12).map((i) => [plots[i]!.lane, plots[i]!.rank, plots[i]!.file])).toEqual([
        [0, 2, 2], [1, 2, 2], [0, 2, 1], [1, 2, 1], [0, 2, 3], [1, 2, 3],
      ]);
    }
  });
});
