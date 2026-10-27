import { describe, expect, it } from 'vitest';
import { ContentError, loadContent } from '../../src/data/registry.ts';
import { readRawContent } from '../../tools/lib/content.ts';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Loose = Record<string, any>;

describe('data', () => {
  const raw = readRawContent();

  it('every file validates and references resolve', () => {
    const c = loadContent(raw);
    expect(Object.keys(c.buildings)).toHaveLength(9); // the M3 roster
    expect(Object.keys(c.units)).toHaveLength(7);
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
    const stump = c.maps.stumpfield!, twin = c.maps['twin-roots']!;
    expect([stump.width, stump.height, stump.homeCols, stump.lanes.length]).toEqual([34, 8, 4, 1]);
    expect([twin.width, twin.height, twin.homeCols, twin.lanes.length]).toEqual([32, 13, 4, 2]);
    expect(twin.tiles[6]).toBe('#'.repeat(32));
    // Twin Roots: loam only in each side's far lane (player: lower lane, enemy: upper lane)
    const loam = (rows: string[], half: 'left' | 'right') => rows.some((r) => (half === 'left' ? r.slice(0, 16) : r.slice(16)).includes('$'));
    expect(loam(twin.tiles.slice(0, 6), 'left')).toBe(false);
    expect(loam(twin.tiles.slice(7), 'left')).toBe(true);
    expect(loam(twin.tiles.slice(0, 6), 'right')).toBe(true);
  });

  it('run content: tracks, relics, events, elites and the commander stand-in', () => {
    const c = loadContent(raw);
    expect(Object.keys(c.upgrades).sort()).toEqual(Object.keys(c.buildings).sort()); // a track for every building
    expect(c.relicOrder).toHaveLength(21);
    expect(c.relicOrder.filter((id) => c.relics[id]!.requires === undefined)).toHaveLength(20);
    expect(c.eventOrder).toHaveLength(8);
    expect(c.eliteOrder).toEqual(['fortified', 'veteran', 'swift']);
    const v = c.commanders.vesper!;
    expect(v.starter).toEqual(['sporelingBurrow', 'capguardHall', 'truffleCellar']);
    for (const id of v.starter) expect(v.core).toContain(id);
  });

  it('rejects malformed effects', () => {
    const bad = structuredClone(raw) as Loose;
    bad['relics.json'][0].effects.modifiers[0].stat = 'unit.armor';
    expect(() => loadContent(bad)).toThrow(ContentError);
    const bad2 = structuredClone(raw) as Loose;
    bad2['relics.json'][0].effects.modifiers[0] = { stat: 'unit.hp', op: 'mul', value: 2, where: { onLoam: true } };
    expect(() => loadContent(bad2)).toThrow(/positional selectors/);
    const bad3 = structuredClone(raw) as Loose;
    bad3['relics.json'][0].effects.modifiers[0].where = { unit: 'nobody' };
    expect(() => loadContent(bad3)).toThrow(/unit "nobody" does not exist/);
    const bad4 = structuredClone(raw) as Loose;
    bad4['factions/velvet-bloom/units.json'].find((u: Loose) => u.id === 'tender').tags = [];
    expect(() => loadContent(bad4)).toThrow(/support tag/);
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
