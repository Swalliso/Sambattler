import { describe, expect, it } from 'vitest';
import { ContentError, loadContent } from '../../src/data/registry.ts';
import { bodyOf, shapeProblems } from '../../src/data/shapes.ts';
import { createBattle, makeRoundConfig } from '../../src/sim/index.ts';
import { readRawContent } from '../../tools/lib/content.ts';

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
      if (b.squad) expect(c.units[b.squad.unit]).toBeDefined();
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
    // the Sporestorm Sigil needs powers, and Mycorrhizal Link R3's combos (§11.7, R2-Q19)
    expect(c.relicOrder.filter((id) => c.relics[id]!.requires !== undefined)).toEqual(['mycorrhizalLink', 'sporestormSigil']);
    expect(c.eventOrder).toHaveLength(8);
    expect(c.eliteOrder).toEqual(['fortified', 'veteran', 'swift']);
    const v = c.commanders.vesper!;
    expect(v.starter).toEqual(['sporelingBurrow', 'capguardHall', 'truffleCellar']);
    for (const id of v.starter) expect(v.core).toContain(id);
  });

  it('relics validate in v2 form: none uses a stat, selector, trigger or action that rounds retired (§11.7, §15.7)', () => {
    const c = loadContent(raw);
    const retired = {
      stats: ['building.hp', 'building.spawnInterval', 'building.spawnCount', 'building.goldPerTick', 'building.firstSpawnFraction', 'side.supplyCap',
        'side.captureSpeed', 'side.supplyLineRate', 'side.turretDamage', 'side.powerCooldown'],
      selectors: ['zone', 'adjacentOwnBuildingsGte'],
      triggers: ['buildingDestroyed', 'waveStart'],
      actions: ['repairHeartcapPct'],
    };
    for (const id of c.relicOrder) {
      const fx = c.relics[id]!.effects;
      for (const m of fx.modifiers ?? []) {
        expect(retired.stats, `${id}: ${m.stat}`).not.toContain(m.stat);
        for (const k of Object.keys(m.where ?? {})) expect(retired.selectors, `${id}: ${k}`).not.toContain(k);
      }
      for (const t of fx.triggers ?? []) {
        expect(retired.triggers, `${id}: ${t.on}`).not.toContain(t.on);
        for (const k of Object.keys(t.if ?? {})) expect(retired.selectors, `${id}: ${k}`).not.toContain(k);
        for (const a of t.do) expect(retired.actions, `${id}: ${Object.keys(a)[0]}`).not.toContain(Object.keys(a)[0]);
      }
    }
    // and every relic compiles in a round battle, but Mycorrhizal Link's corner rule, which waits for R3's combos
    const cfg = makeRoundConfig(c, { seed: 1, player: 'human', enemy: 'human' });
    cfg.player.relics = [...c.relicOrder];
    expect(createBattle(c, cfg).compiled.player.ignored).toEqual([{ source: 'relic:mycorrhizalLink', stat: 'side.comboCorners' }]);
  });

  // T130 (§11.1, §14.2, §15.7): v1's keys left the schema with T129, and R2a's rounds blocks folded into §11.1's names.
  describe("v1's retired keys", () => {
    const rejects = (edit: (r: Loose) => void, why: RegExp) => {
      const r = structuredClone(raw) as Loose;
      edit(r);
      expect(() => loadContent(r)).toThrow(why);
    };

    it('rejects a modifier on side.supplyCap, a waveStart trigger, a building with hp and a limit with afterSeconds', () => {
      rejects((r) => { r['relics.json'][0].effects.modifiers[0] = { stat: 'side.supplyCap', op: 'add', value: 6 }; }, /relics\.json: 0\.effects\.modifiers\.0\.stat: Invalid option/);
      rejects((r) => { r['relics.json'][0].effects = { triggers: [{ on: 'waveStart', do: [{ gainGold: 5 }] }] }; }, /relics\.json: 0\.effects\.triggers\.0\.on: Invalid option/);
      rejects((r) => { r['factions/velvet-bloom/buildings.json'][0].hp = 450; }, /Unrecognized key: "hp"/);
      rejects((r) => { r['bots.json'][0].limits.rootbreakerDen = { afterSeconds: 180, afterRound: 4 }; }, /Unrecognized key: "afterSeconds"/);
    });

    it('rejects the rest of the retired effects: v1 selectors, triggers, actions and stats', () => {
      for (const where of [{ zone: 'home' }, { adjacentOwnBuildingsGte: 2 }]) {
        rejects((r) => { r['relics.json'][0].effects.modifiers[0] = { stat: 'unit.hp', op: 'mul', value: 2, where }; }, /Unrecognized key/);
      }
      rejects((r) => { r['relics.json'][0].effects = { triggers: [{ on: 'buildingDestroyed', do: [{ gainGold: 5 }] }] }; }, /0\.effects\.triggers\.0\.on: Invalid option/);
      rejects((r) => { r['relics.json'][0].effects = { triggers: [{ on: 'roundWon', do: [{ repairHeartcapPct: 0.1 }] }] }; }, /0\.effects\.triggers\.0\.do\.0/);
      for (const stat of ['building.hp', 'building.spawnInterval', 'building.goldPerTick', 'side.turretDamage', 'side.powerCooldown']) {
        rejects((r) => { r['relics.json'][0].effects.modifiers[0] = { stat, op: 'add', value: 1 }; }, /0\.effects\.modifiers\.0\.stat: Invalid option/);
      }
      rejects((r) => { r['factions/velvet-bloom/buildings.json'][0].spawn = { unit: 'sporeling', count: 4, interval: 10 }; }, /Unrecognized key: "spawn"/);
      rejects((r) => { r['factions/velvet-bloom/buildings.json'].find((b: Loose) => b.id === 'truffleCellar').economy.goldPerTick = 4; }, /Unrecognized key: "goldPerTick"/);
    });

    it('data/balance.json has no rounds block, nor v1 keys, and a tower keeps its emplacement HP in its attack', () => {
      expect(raw['balance.json']).not.toHaveProperty('rounds');
      expect(raw['balance-targets.json']).not.toHaveProperty('rounds');
      for (const k of ['waveSeconds', 'supplyCap', 'turret', 'captureSeconds', 'timeLimitSeconds', 'routRepair', 'draftWaves', 'laneStance']) {
        expect(raw['balance.json'], k).not.toHaveProperty(k);
        rejects((r) => { r['balance.json'][k] = 1; }, new RegExp(`Unrecognized key: "${k}"`));
      }
      rejects((r) => { r['balance.json'].rounds = { maxRounds: 9 }; }, /Unrecognized key: "rounds"/);
      const c = loadContent(raw);
      expect(c.buildings.puffballMortar!.attack!.hp).toBe(500);
      rejects((r) => { delete r['factions/velvet-bloom/buildings.json'].find((b: Loose) => b.id === 'puffballMortar').attack.hp; }, /puffballMortar needs "attack\.hp"/);
    });
  });

  it('rejects malformed effects', () => {
    const bad = structuredClone(raw) as Loose;
    bad['relics.json'][0].effects.modifiers[0].stat = 'unit.armor';
    expect(() => loadContent(bad)).toThrow(ContentError);
    const bad2 = structuredClone(raw) as Loose;
    bad2['relics.json'][0].effects.modifiers[0] = { stat: 'tower.damage', op: 'mul', value: 2, where: { rank: 0 } };
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
    const bad2 = structuredClone(raw) as Loose;
    bad2['balance-targets.json'].G7.slayers.mergeBot = 'nobody';
    expect(() => loadContent(bad2)).toThrow(/G7: bot "nobody"/);
    const bad3 = structuredClone(raw) as Loose;
    bad3['balance-targets.json'].G2.intendedEdges.push(['veilstalker', 'nobody@2']);
    expect(() => loadContent(bad3)).toThrow(/G2: unit "nobody"/);
  });

  // The data in rounds (SPEC §11.1, §11.2, §14.2; R2a T007), at §11.1's top-level names since R2b's T129.
  describe('rounds data', () => {
    const c = loadContent(raw);
    /** §11.2's Squad column, with Capguard Hall at 3 (#7, R1's review gate, 2026-11-02). */
    const SQUADS = {
      sporelingBurrow: 8, capguardHall: 3, gillNest: 4, rootbreakerDen: 3, scythecapGrove: 3, veilstalkerHollow: 6,
      tendersRing: 3, hammercapForge: 4, amanitaLodge: 2, morelWarren: 6, bursterPod: 6, rhizomorphTunnel: 3,
    };

    it("every spawner fields R1's squad, and nothing else fields one", () => {
      const spawners = Object.values(c.buildings).filter((b) => b.kind === 'spawner');
      expect(Object.fromEntries(spawners.map((b) => [b.id, b.squad?.count]))).toEqual(SQUADS);
      for (const b of Object.values(c.buildings)) if (b.kind !== 'spawner') expect(b.squad, b.id).toBeUndefined();
      const bad = structuredClone(raw) as Loose;
      bad['factions/velvet-bloom/buildings.json'][0].squad.unit = 'nobody';
      expect(() => loadContent(bad)).toThrow(/building sporelingBurrow: squad unit "nobody" does not exist/);
    });

    it('every economy building yields gold a round: the Truffle Cellar 50, the Spore Exchange 12', () => {
      const economy = Object.values(c.buildings).filter((b) => b.kind === 'economy');
      expect(Object.fromEntries(economy.map((b) => [b.id, b.economy!.goldPerRound]))).toEqual({ truffleCellar: 50, sporeExchange: 12 });
    });

    it("the round keys validate at §11.1's names, with the user's cap, Decision and interest (X5, R2-Q2)", () => {
      expect(c.balance).toMatchObject({
        maxRounds: 9, clashCapSeconds: 45, musterSeconds: 1, formationGapTiles: 6, heartcapDamagePerSupply: 100, siegeHeartcapMult: 2,
        arrivalShield: { minTypes: 2, shieldFrac: 0.2 },
        roundDamageCap: { flat: 750 }, decision: { by: 'shareOfMaxHp' }, interestPer: 10, interestCap: 30,
        sporestorm: { startRound: 5, stepBp: 2000, maxBp: 20000 },
        stipendPerRound: 100, comebackGold: 40, enemyIncomeMult: 1.05, sellRefund: 0.6, sellRefundPlanted: 1,
        draftRounds: [2, 4, 6], upgradeCostPct: 300, lives: 3, plotGrowth: { perWin: 1, max: 4 },
      });
      // the planning AI's round keys beside the counter weights v1's AI had (§7.2–§7.4); X8's two knobs are gone (T172)
      expect(c.balance.ai).toEqual({
        mergeOffSlayerShare: 0.25,
        economyEarly: { beforeRound: 3, mult: 1.5 }, economyLate: { fromRound: 7, mult: 0.3 }, towerAfterLossMult: 2,
        score: { depth: 10, offCentre: 1, besideSame: 2, frontSupport: 3, loam: 8, backThird: 2, noise: 0.5 },
        counter: {
          cycles: [{ round: 4, from: 1 }, { round: 7, from: 4 }], bossCycles: [{ round: 3, from: 1 }], freePlots: 2,
          scoreNoise: 0.03, swarmEliteDiscount: 0.5, eliteScoreMult: 1.2,
          counterMult: 3, otherMult: 0.6, openingMult: 2, openingOtherMult: 0.8, dualMult: 2.5, maxSells: 2, intelKeep: 0.5,
        },
      });
      // T124 measures the other caps and the Decision by damage; a cap names one base
      const withCap = (cap: unknown, by = 'damage') => {
        const r = structuredClone(raw) as Loose;
        Object.assign(r['balance.json'], { roundDamageCap: cap, decision: { by } });
        return loadContent(r).balance;
      };
      for (const cap of [{ flat: 500 }, { flat: 500, stormScales: true }, { maxHpBp: 2500, stormScales: true }]) {
        expect(withCap(cap)).toMatchObject({ roundDamageCap: cap, decision: { by: 'damage' } });
      }
      for (const cap of [{}, { stormScales: true }, { flat: 500, maxHpBp: 2500 }]) expect(() => withCap(cap), JSON.stringify(cap)).toThrow(ContentError);
      expect(() => withCap({ maxHpBp: 2500 }, 'lanes')).toThrow(ContentError);
    });

    it('a limit by round, which replaced the limit by seconds one round a minute (§7.2, §7.9)', () => {
      expect(c.bots.balanced!.limits!.rootbreakerDen).toEqual({ afterRound: 4 });
      expect(c.bots.turtle!.limits!.rootbreakerDen).toEqual({ afterRound: 5 });
      expect(c.generals.scripted!.limits!.rootbreakerDen).toEqual({ afterRound: 4 });
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
    expect(c.scenarios['unit-lineup']!.clash!.units.some((u) => u.tier === 3)).toBe(true);
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

    it('every sprite that declares a shape passes', () => {
      const c = loadContent(raw);
      for (const id of c.spriteOrder) {
        const s = c.sprites[id]!;
        if (s.shape) expect(shapeProblems(s, c.bands[c.spriteSheet[id]!]), id).toEqual([]);
      }
      for (const u of Object.values(c.units)) {
        const shape = c.sprites[u.sprite]!.shape;
        if (shape) expect(shape.body, u.id).toBe(bodyOf(u.armor));
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
