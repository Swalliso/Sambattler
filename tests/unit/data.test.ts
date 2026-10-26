import { describe, expect, it } from 'vitest';
import { ContentError, loadContent } from '../../src/data/registry.ts';
import { readRawContent } from '../../tools/lib/content.ts';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Loose = Record<string, any>;

describe('data', () => {
  const raw = readRawContent();

  it('every file validates and references resolve', () => {
    const c = loadContent(raw);
    expect(Object.keys(c.buildings)).toHaveLength(8); // the M2 roster
    expect(Object.keys(c.units)).toHaveLength(6);
    for (const f of Object.values(c.factions)) expect(f.buildings).toEqual(c.factions['velvet-bloom']!.buildings); // mirror until M7
    expect(c.maps['bogwater-hollow']).toBeDefined();
    for (const b of Object.values(c.buildings)) {
      expect(c.sprites[b.sprite]).toBeDefined();
      if (b.spawn) expect(c.units[b.spawn.unit]).toBeDefined();
    }
  });

  it('maps are point-symmetric and Bogwater Hollow matches the spec', () => {
    const c = loadContent(raw);
    for (const m of Object.values(c.maps)) {
      for (let r = 0; r < m.height; r++) for (let col = 0; col < m.width; col++) {
        expect(m.tiles[r]![col]).toBe(m.tiles[m.height - 1 - r]![m.width - 1 - col]);
      }
    }
    const bog = c.maps['bogwater-hollow']!;
    expect([bog.width, bog.height, bog.homeCols, bog.lanes.length]).toEqual([32, 8, 4, 1]);
  });

  it('rejects an asymmetric map and a sprite row of the wrong width', () => {
    const bad = structuredClone(raw) as Loose;
    bad['maps/bogwater-hollow.json'].tiles[0] = 'o' + bad['maps/bogwater-hollow.json'].tiles[0].slice(1);
    expect(() => loadContent(bad)).toThrow(/point-symmetric/);
    const bad2 = structuredClone(raw) as Loose;
    bad2['sprites/units.json'].sprites[0].frames[0][0] += '.';
    expect(() => loadContent(bad2)).toThrow(ContentError);
  });

  it('rejects dangling references', () => {
    const bad = structuredClone(raw) as Loose;
    bad['factions/velvet-bloom/buildings.json'][0].spawn.unit = 'nobody';
    expect(() => loadContent(bad)).toThrow(/does not exist/);
    const bad2 = structuredClone(raw) as Loose;
    bad2['balance-targets.json'].G7.slayers.mergeBot = 'nobody';
    expect(() => loadContent(bad2)).toThrow(/G7: bot "nobody"/);
    const bad3 = structuredClone(raw) as Loose;
    bad3['balance-targets.json'].G2.intendedEdges.push(['veilstalker', 'nobody@2']);
    expect(() => loadContent(bad3)).toThrow(/G2: unit "nobody"/);
  });

  it('merge perks only use whitelisted patch keys and scenario units may start merged', () => {
    const bad = structuredClone(raw) as Loose;
    bad['factions/velvet-bloom/units.json'][0].mergePerks['2'].armor = 'heavy';
    expect(() => loadContent(bad)).toThrow(ContentError);
    const c = loadContent(raw);
    expect(c.scenarios['elder-showcase']!.sides.player.units!.some((u) => u.tier === 3)).toBe(true);
  });
});
