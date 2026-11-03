import { describe, expect, it } from 'vitest';
import { ContentError, loadContent } from '../../src/data/registry.ts';
import { bodyOf, shapeProblems } from '../../src/data/shapes.ts';
import { protoContent, readRawContent } from '../../tools/lib/content.ts';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Loose = Record<string, any>;

describe('data', () => {
  const raw = readRawContent();

  it('every file validates and references resolve', () => {
    const c = loadContent(raw);
    expect(Object.keys(c.buildings)).toHaveLength(16); // the M4 roster, the Burster Pod and the Rhizomorph Tunnel
    expect(Object.keys(c.units)).toHaveLength(12);
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

  it('run content: tracks, relics, events, elites and the commanders', () => {
    const c = loadContent(raw);
    // a track for every building but R1's two: v2 replaces tracks with augments in R3 (§11.6)
    const tracked = Object.keys(c.buildings).filter((id) => id !== 'bursterPod' && id !== 'rhizomorphTunnel');
    expect(Object.keys(c.upgrades).sort()).toEqual(tracked.sort());
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
    bad2['relics.json'][0].effects.modifiers[0] = { stat: 'unit.hp', op: 'mul', value: 2, where: { zone: 'home' } };
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

  // R2a's rounds data, beside v1's fields (SPEC §11.1, §11.2, §14.2; R2a T007). v1's library leaves it out
  // (Call 27), so it moves no v1 hash: tests/unit/determinism.test.ts.
  describe('rounds data', () => {
    const c = loadContent(raw);
    /** §11.2's Squad column, with Capguard Hall at 3 (#7, R1's review gate, 2026-11-02). */
    const SQUADS = {
      sporelingBurrow: 8, capguardHall: 3, gillNest: 4, rootbreakerDen: 3, scythecapGrove: 3, veilstalkerHollow: 6,
      tendersRing: 3, hammercapForge: 4, amanitaLodge: 2, morelWarren: 6, bursterPod: 6, rhizomorphTunnel: 3,
    };

    it("every spawner fields R1's squad of the unit it spawns, and nothing else fields one", () => {
      const spawners = Object.values(c.buildings).filter((b) => b.kind === 'spawner');
      expect(Object.fromEntries(spawners.map((b) => [b.id, b.squad?.count]))).toEqual(SQUADS);
      for (const b of spawners) expect(b.squad!.unit, b.id).toBe(b.spawn!.unit);
      for (const b of Object.values(c.buildings)) if (b.kind !== 'spawner') expect(b.squad, b.id).toBeUndefined();
      const bad = structuredClone(raw) as Loose;
      bad['factions/velvet-bloom/buildings.json'][0].squad.unit = 'nobody';
      expect(() => loadContent(bad)).toThrow(/building sporelingBurrow: squad unit "nobody" does not exist/);
    });

    it('every economy building yields gold a round: the Truffle Cellar 50, the Spore Exchange 12', () => {
      const economy = Object.values(c.buildings).filter((b) => b.kind === 'economy');
      expect(Object.fromEntries(economy.map((b) => [b.id, b.economy!.goldPerRound]))).toEqual({ truffleCellar: 50, sporeExchange: 12 });
    });

    it("the rounds block validates, with the user's cap, Decision and interest (X5, R2-Q2)", () => {
      expect(c.balance.rounds).toEqual({
        maxRounds: 9, clashCapSeconds: 45, musterSeconds: 1, formationGapTiles: 6, heartcapDamagePerSupply: 100, siegeHeartcapMult: 2,
        arrivalShield: { minTypes: 2, shieldFrac: 0.2 },
        roundDamageCap: { flat: 750 }, decision: { by: 'shareOfMaxHp' }, interestPer: 10, interestCap: 30,
        sporestorm: { startRound: 5, stepBp: 2000, maxBp: 20000 },
        stipendPerRound: 100, comebackGold: 40, enemyIncomeMult: 1, sellRefundPlanted: 1,
        draftRounds: [2, 4, 6], lives: 3, plotGrowth: { perWin: 1, max: 4 },
        ai: {
          economyEarly: { beforeRound: 3, mult: 1.5 }, economyLate: { fromRound: 7, mult: 0.3 }, towerAfterLossMult: 2,
          score: { depth: 10, offCentre: 1, besideSame: 2, frontSupport: 3, loam: 8, backThird: 2, noise: 0.5 },
          counter: { cycles: [{ round: 4, from: 1 }, { round: 7, from: 4 }], bossCycles: [{ round: 3, from: 1 }], freePlots: 2 },
          // X8's two knobs ship off (R2a/T101)
          leanToLastAnswer: 0, replaceWhenFull: false,
        },
      });
      // T124 measures the other caps and the Decision by damage; a cap names one base
      const withCap = (cap: unknown, by = 'damage') => {
        const r = structuredClone(raw) as Loose;
        Object.assign(r['balance.json'].rounds, { roundDamageCap: cap, decision: { by } });
        return loadContent(r).balance.rounds;
      };
      for (const cap of [{ flat: 500 }, { flat: 500, stormScales: true }, { maxHpBp: 2500, stormScales: true }]) {
        expect(withCap(cap)).toMatchObject({ roundDamageCap: cap, decision: { by: 'damage' } });
      }
      for (const cap of [{}, { stormScales: true }, { flat: 500, maxHpBp: 2500 }]) expect(() => withCap(cap), JSON.stringify(cap)).toThrow(ContentError);
      expect(() => withCap({ maxHpBp: 2500 }, 'lanes')).toThrow(ContentError);
    });

    it('a limit by round sits beside every limit by seconds, one round a minute (§7.2, §7.9)', () => {
      const limits = [...Object.values(c.bots), ...Object.values(c.generals)].flatMap((p) => Object.values(p.limits ?? {}));
      const timed = limits.filter((l) => l.afterSeconds !== undefined);
      expect(timed.length).toBeGreaterThan(0);
      for (const l of timed) expect(l.afterRound).toBe(l.afterSeconds! / 60 + 1);
      expect(c.bots.balanced!.limits!.rootbreakerDen).toEqual({ afterSeconds: 180, afterRound: 4 });
      expect(c.bots.turtle!.limits!.rootbreakerDen).toEqual({ afterSeconds: 240, afterRound: 5 });
      const alone = structuredClone(raw) as Loose;
      alone['bots.json'][0].limits.rootbreakerDen = { afterRound: 3 };
      expect(loadContent(alone).bots.balanced!.limits!.rootbreakerDen).toEqual({ afterRound: 3 });
      alone['bots.json'][0].limits.rootbreakerDen = { afterRound: 0 };
      expect(() => loadContent(alone)).toThrow(ContentError);
    });

    it("both rosters list R1's adopted buildings, the Burster Pod and the Rhizomorph Tunnel", () => {
      for (const f of Object.values(c.factions)) expect(f.buildings, f.id).toEqual(expect.arrayContaining(['bursterPod', 'rhizomorphTunnel']));
    });
  });

  it('merge perks only use whitelisted patch keys and scenario units may start merged', () => {
    const bad = structuredClone(raw) as Loose;
    bad['factions/velvet-bloom/units.json'][0].mergePerks['2'].armor = 'heavy';
    expect(() => loadContent(bad)).toThrow(ContentError);
    const c = loadContent(raw);
    expect(c.scenarios['unit-lineup']!.sides.player.units!.some((u) => u.tier === 3)).toBe(true);
  });

  // The shape language (SPEC §5.8, §14.3, §16 R4 step 1; R4a, T018): the registry holds each unit's sprite to
  // the body its armor gives it and its sheet's bands. Units carry no weapon mark (§5.8, 2026-11-01; T077).
  describe('unit shapes', () => {
    const BANDS = { small: [8, 9], medium: [11, 12], big: [15, 16] };
    /** A raw unit sprite drawn to a shape: three frames of a body `bodyH` px tall and 6 wide. */
    function shaped(id: string, body: string, bodyH: number): Loose {
      const rows = Array.from({ length: bodyH }, () => 'vvvvvv.');
      return {
        id, w: 7, h: bodyH, anchor: [3, bodyH - 1], factionSwap: true, palette: { '.': null, k: '#1a1020', v: '#8a4fd8' },
        frames: [rows, rows, rows], shape: { body },
      };
    }
    /** The raw content with that sprite in place of the one with its id, and the bands on its sheet. */
    function withSprite(s: Loose): Loose {
      const r = structuredClone(raw) as Loose;
      const sheet = r['sprites/units.json'];
      sheet.bands = BANDS;
      sheet.sprites[sheet.sprites.findIndex((x: Loose) => x.id === s.id)] = s;
      return r;
    }

    it('accepts a unit drawn to its shape, and keeps its sheet and the bands', () => {
      const c = loadContent(withSprite(shaped('u-amanitaKnight', 'big', 15)));
      expect(c.sprites['u-amanitaKnight']!.shape).toEqual({ body: 'big' });
      expect(c.spriteSheet['u-amanitaKnight']).toBe('units');
      expect(c.bands.units).toEqual(BANDS);
    });

    it('rejects a heavy unit drawn small', () => {
      expect(() => loadContent(withSprite(shaped('u-amanitaKnight', 'small', 8))))
        .toThrow(/unit amanitaKnight: sprite u-amanitaKnight has a small body, but heavy armor draws a big one/);
      expect(() => loadContent(withSprite(shaped('u-amanitaKnight', 'big', 11))))
        .toThrow(/unit amanitaKnight: sprite u-amanitaKnight frame 0: big body out of band \(11 px tall, the band is 15–16\)/);
    });

    it('rejects a weapon mark in a shape block, since units carry none', () => {
      const s = shaped('u-hammercap', 'medium', 11);
      s.shape.mark = 'hammer';
      expect(() => loadContent(withSprite(s))).toThrow(/shape: Unrecognized key: "mark"/);
    });

    it('every sprite that declares a shape passes, in the default content and under ?proto=rework', () => {
      for (const c of [loadContent(raw), protoContent('rework')]) {
        for (const id of c.spriteOrder) {
          const s = c.sprites[id]!;
          if (s.shape) expect(shapeProblems(s, c.bands[c.spriteSheet[id]!]), id).toEqual([]);
        }
        for (const u of Object.values(c.units)) {
          const shape = c.sprites[u.sprite]!.shape;
          if (shape) expect(shape.body, u.id).toBe(bodyOf(u.armor));
        }
      }
    });
  });

  // An emplacement's sprite (§5.8, R4-Q5; R4a call 4, T029): every tower with an attack stands on `e-<id>`,
  // which declares a structure body.
  describe('emplacement shapes', () => {
    /** The raw content with the Mortar's emplacement edited, or dropped from its sheet. */
    function withMortar(edit: (s: Loose, sheet: Loose) => void): Loose {
      const r = structuredClone(raw) as Loose;
      const sheet = r['sprites/buildings.json'];
      edit(sheet.sprites.find((x: Loose) => x.id === 'e-puffballMortar'), sheet);
      return r;
    }

    it('rejects a tower with no emplacement, one with no shape, and one drawn as a unit', () => {
      expect(() => loadContent(withMortar((_, sheet) => { sheet.sprites = sheet.sprites.filter((x: Loose) => x.id !== 'e-puffballMortar'); })))
        .toThrow(/building puffballMortar: emplacement sprite "e-puffballMortar" does not exist/);
      expect(() => loadContent(withMortar((s) => { delete s.shape; })))
        .toThrow(/building puffballMortar: emplacement sprite e-puffballMortar declares no shape/);
      expect(() => loadContent(withMortar((s) => { s.shape.body = 'medium'; })))
        .toThrow(/building puffballMortar: sprite e-puffballMortar has a medium body, but an emplacement's is structure/);
    });
  });
});
