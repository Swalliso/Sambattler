// Commanders in runs (SPEC §8.1, §8.4, §11.10, §16 Milestone 5): the three commanders' pools and
// starter kits, ban filtering and its rules, core-pool weighting, the commander in run battles, and the
// passives in rounds: Home Brood (R2-Q15), Landholder (§4.6) and Cordis's (R2-Q7). The powers are in powers.test.ts.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { banProblem, battleConfig, botCoreWeights, createRun, loadRun, MemoryStorage, RUN_KEY, runPool, simulateRun } from '../../src/run/index.ts';
import type { RouteNode } from '../../src/run/index.ts';
import {
  basePlots, createFromScenario, draftLibrary, draftPool, formationOf, generateOffer, mergePreview, openOrder, parseCard, seedStream,
} from '../../src/sim/index.ts';
import { candidates } from '../../src/sim/draft.ts';
import { createBattle as createRoundBattle } from '../../src/sim/index.ts';
import type { BattleState, DraftPool, Loadout } from '../../src/sim/index.ts';
import type { ScenarioDef } from '../../src/data/schema.ts';
import { begin, content } from '../helpers.ts';

type Colony = NonNullable<ScenarioDef['sides']['player']['colony']>;
const at = (building: string, lane: number, rank: number, file: number, merge = true): Colony[number] => ({ building, lane, rank, file, merge });

/** Round 1's planning on Bogwater Hollow with this colony and commander, both sides human. */
const battle = (commander: string | undefined, colony: Colony): BattleState => createFromScenario(content, {
  id: 'passives', description: 'A passive test.', map: 'bogwater-hollow', sides: { player: { colony, ...(commander ? { commander } : {}) }, enemy: {} },
});

const FLAGS = { merging: true, drafts: true, adaptiveGeneral: true, powers: true };
const ROSTER = content.factions['velvet-bloom']!.buildings;

describe('the three commanders (SPEC §11.10)', () => {
  it('each has six core buildings, a starter kit of three from its core, a passive and a power', () => {
    expect(Object.keys(content.commanders)).toEqual(['vesper', 'armilla', 'cordis']);
    const powers = { vesper: ['sporeBurst', 'burst'], armilla: ['rhizomeTithe', 'harvest'], cordis: ['puppetBloom', 'bloom'] } as const;
    for (const [id, [power, kind]] of Object.entries(powers)) {
      const c = content.commanders[id]!;
      expect(c.core).toHaveLength(6);
      for (const b of c.starter) expect(c.core).toContain(b);
      for (const b of c.core) expect(ROSTER).toContain(b);
      // once per clash, so v1's cooldown and first-ready time are gone (§6.6)
      expect(c.power).toMatchObject({ id: power, kind });
      expect(c.power).not.toHaveProperty('cooldown');
      expect(c.power).not.toHaveProperty('firstReady');
      expect(c.passive.effects.modifiers?.length).toBeGreaterThan(0);
    }
    expect(content.commanders.armilla!.starter).toEqual(['capguardHall', 'truffleCellar', 'puffballMortar']);
    expect(content.commanders.cordis!.core).toContain('tendersRing');
  });

  it("a run starts with its commander's starter kit and puts the commander and power on the player's side", () => {
    for (const id of Object.keys(content.commanders)) {
      const run = createRun(content, { seed: 4, commander: id });
      expect(run.kit).toEqual(content.commanders[id]!.starter);
      expect(run.flags.powers).toBe(true);
      const node: RouteNode = { kind: 'battle', map: 'bogwater-hollow', general: 'scripted' };
      const config = battleConfig(content, run, node);
      expect(config.player.commander).toBe(id);
      expect(config.player.power).toBe(content.commanders[id]!.power.id);
      expect(config.modifiers?.find((m) => m.source === `commander:${id}`)?.side).toBe('player');
      // a battle in rounds: the power is ready in every clash (§6.6)
      const s = createRoundBattle(content, config);
      expect(s.sides.player.powerUsed).toBe(false);
      expect(s.library.powers?.[content.commanders[id]!.power.id]).toBeDefined();
    }
  });
});

describe('bans (SPEC §8.1, §8.4)', () => {
  it('allow up to 3 distinct shared-pool buildings, never a core one', () => {
    expect(banProblem(content, 'vesper', 'velvet-bloom', ['amanitaLodge', 'morelWarren', 'sporeExchange'])).toBeNull();
    expect(banProblem(content, 'vesper', 'velvet-bloom', ['amanitaLodge', 'morelWarren', 'sporeExchange', 'tendersRing'])).toBe('at most 3 bans');
    expect(banProblem(content, 'vesper', 'velvet-bloom', ['gillNest'])).toMatch(/core pool and can't be banned/);
    expect(banProblem(content, 'cordis', 'velvet-bloom', ['tendersRing'])).toMatch(/core pool/);
    expect(banProblem(content, 'vesper', 'velvet-bloom', ['tendersRing'])).toBeNull();
    expect(banProblem(content, 'vesper', 'velvet-bloom', ['amanitaLodge', 'amanitaLodge'])).toBe('a building is banned twice');
    expect(banProblem(content, 'vesper', 'velvet-bloom', ['nope'])).toMatch(/not in the shared pool/);
    expect(() => createRun(content, { seed: 1, commander: 'armilla', bans: ['hammercapForge'] })).toThrow(/core pool/);
  });

  it('take banned buildings out of the shared pool, and so out of every offer and spoils pick', () => {
    const bans = ['amanitaLodge', 'scythecapGrove', 'sporeExchange'];
    const pool = draftPool(content, 'velvet-bloom', 'vesper', FLAGS, bans);
    expect(pool.core).toEqual(content.commanders.vesper!.core);
    for (const b of bans) expect(pool.shared).not.toContain(b);
    // the Rhizome Vault waits for R3's combos (#26)
    expect(pool.shared).toEqual(ROSTER.filter((id) => !pool.core.includes(id) && !bans.includes(id) && id !== 'rhizomeVault'));
    const lib = draftLibrary(content, ROSTER, pool.relics);
    const lo: Loadout = { kit: ['sporelingBurrow', 'capguardHall', 'truffleCellar'], upgrades: {}, relics: [] };
    for (let s = 1; s <= 400; s++) {
      for (const c of generateOffer(lib, pool, lo, { cards: 3, battleIndex: 1 + (s % 5) }, seedStream(s, 'draft', 1))) {
        if (c.type === 'blueprint') expect(bans).not.toContain(parseCard(c.id)!.id);
      }
    }
    // the run keeps its bans: in the saved state, the pool and each battle's draft pool
    const run = createRun(content, { seed: 9, bans });
    expect(run.bans).toEqual(bans);
    expect(runPool(content, run).shared).toEqual(pool.shared);
    expect(battleConfig(content, run, { kind: 'battle', map: 'bogwater-hollow', general: 'scripted' }).player.draft!.shared).toEqual(pool.shared);
    // a save from before bans, which is a v1 record, loads with none
    const storage = new MemoryStorage();
    const v1 = JSON.parse(readFileSync(join(import.meta.dirname, '..', 'fixtures', 'saves', 'v1', 'run-route.json'), 'utf8')) as Record<string, unknown>;
    storage.set(RUN_KEY, JSON.stringify({ ...v1, bans: undefined }));
    expect(loadRun(storage, content)).toMatchObject({ kind: 'run', run: { v: 2, bans: [] } });
  });

  it('a whole autoplayed run never drafts a banned building', () => {
    const bans = ['scythecapGrove', 'veilstalkerHollow', 'tendersRing'];
    for (const seed of [1, 2, 3]) {
      const r = simulateRun(content, seed, { route: 'random', draft: 'greedy', player: 'bot:balanced' }, { bans });
      for (const b of bans) expect(r.kit).not.toContain(b);
      for (const card of r.cards) expect(bans.map((b) => `bp:${b}`)).not.toContain(card.card);
    }
  });
});

describe('core-pool weighting (SPEC §8.3–8.4)', () => {
  it("weights each commander's core blueprints ×2 against shared ones", () => {
    for (const id of Object.keys(content.commanders)) {
      const pool = draftPool(content, 'velvet-bloom', id, FLAGS);
      const lib = draftLibrary(content, ROSTER, []);
      const cands = candidates(lib, pool, { kit: [], upgrades: {}, relics: [] }, 'blueprint');
      for (const c of cands) expect(c.weight).toBe(pool.core.includes(parseCard(c.card.id)!.id) ? content.balance.draft.coreWeight : 1);
    }
    // measured: a common core building against a common shared one, by commander (Armilla's Hammercap is shared for Vesper)
    const lib = draftLibrary(content, ROSTER, []);
    const common = { ...lib, buildings: { ...lib.buildings, hammercapForge: { ...lib.buildings.hammercapForge!, rarity: 'common' as const } } };
    const count = (pool: DraftPool) => {
      const rng = seedStream(5, 'draft', 1);
      let hammer = 0, cellar = 0;
      for (let i = 0; i < 6000; i++) {
        const c = generateOffer(common, pool, { kit: ['sporelingBurrow', 'capguardHall', 'gillNest', 'rootbreakerDen', 'puffballMortar'], upgrades: {}, relics: [] }, { cards: 1, battleIndex: 1, types: ['blueprint'] }, rng)[0]!;
        if (c.id === 'bp:hammercapForge') hammer++;
        if (c.id === 'bp:truffleCellar') cellar++;
      }
      return hammer / cellar;
    };
    const two = (core: string[], shared: string[]): DraftPool => ({ core, shared, relics: [] });
    expect(count(two(['hammercapForge', 'truffleCellar'], []))).toBeCloseTo(1, 0); // both core
    const ratio = count(two(['truffleCellar'], ['hammercapForge']));
    expect(ratio).toBeGreaterThan(0.42);
    expect(ratio).toBeLessThan(0.58);
  });

  it("gives a bot player weight on its commander's core buildings its profile never buys (runs only)", () => {
    expect(botCoreWeights(content, createRun(content, { seed: 1, player: 'bot:balanced', commander: 'vesper' }))).toEqual({});
    expect(botCoreWeights(content, createRun(content, { seed: 1, player: 'bot:balanced', commander: 'armilla' }))).toEqual({ hammercapForge: 1, rhizomeVault: 1 });
    expect(botCoreWeights(content, createRun(content, { seed: 1, player: 'bot:balanced', commander: 'cordis' }))).toEqual({ tendersRing: 1 });
    expect(botCoreWeights(content, createRun(content, { seed: 1, commander: 'cordis' }))).toEqual({});
  });
});

describe("the commanders' passives in rounds (SPEC §11.10, §4.6)", () => {
  it("Home Brood: Vesper's front-rank squads have +10% HP and damage, the back rank none, and the preview agrees (R2-Q15)", () => {
    const s = battle('vesper', [at('capguardHall', 0, 0, 1, false), at('capguardHall', 0, 1, 1, false)]);
    const preview = formationOf(s, 'player').map((p) => ({ rank: p.rank, units: p.units.length }));
    begin(s);
    const plain = s.compiled.player.units.capguard!.tiers[0];
    const [front, back] = [0, 1].map((rank) => s.squads.find((q) => q.side === 'player' && q.rank === rank)!);
    expect(front!.stats!.tiers[0]).toMatchObject({ hp: Math.round(plain.hp * 1.1), damage: plain.damage * 1.1 });
    expect(back!.stats).toBeUndefined();
    const hp = (sq: typeof front) => s.units.filter((u) => u.side === 'player' && u.sourceBuildingId === sq!.building).map((u) => u.maxHp);
    expect([hp(front), hp(back)]).toEqual([[242, 242, 242], [220, 220, 220]]);
    // a uniform bonus, not +1 unit: both squads field as the formation preview showed
    expect([front, back].map((q) => ({ rank: q!.rank, units: q!.units }))).toEqual(preview);
    expect(preview.map((p) => p.units)).toEqual([3, 3]);
  });

  it("Landholder: Armilla's colony opens one more plot from battle 1, the first third-rank plot by #19's order, and the general's doesn't (§4.6)", () => {
    const map = content.maps['bogwater-hollow']!, order = openOrder(map), base = basePlots(map);
    const open = (s: BattleState, side: 'player' | 'enemy') => s.sides[side].plots.flatMap((p, i) => (p.open ? [i] : []));
    const sorted = (ids: number[]) => [...ids].sort((a, b) => a - b);
    const node: RouteNode = { kind: 'battle', map: 'bogwater-hollow', general: 'scripted' };
    const armilla = createRoundBattle(content, battleConfig(content, createRun(content, { seed: 4, commander: 'armilla' }), node));
    expect(open(armilla, 'player')).toEqual(sorted(order.slice(0, base + 1)));
    expect(armilla.sides.player.plots[order[base]!]).toMatchObject({ rank: 2, open: true });
    expect(open(armilla, 'enemy')).toEqual(sorted(order.slice(0, base)));
    const vesper = createRoundBattle(content, battleConfig(content, createRun(content, { seed: 4, commander: 'vesper' }), node));
    expect(open(vesper, 'player')).toEqual(sorted(order.slice(0, base)));
  });

  it('Cordis: merged units start with +10% HP, at the muster and on the field, and her knit time is the plain one (R2-Q7)', () => {
    const gills = [at('gillNest', 0, 0, 1), at('gillNest', 0, 0, 2), at('gillNest', 0, 0, 3)];
    const plain = battle(undefined, gills), cordis = battle('cordis', gills);
    const hp = (s: BattleState) => s.compiled.player.units.gillArcher!.tiers.map((t) => t.hp);
    const [p, c] = [hp(plain), hp(cordis)];
    expect(c[0]).toBe(p[0]);
    expect(c[1]! / p[1]!).toBeCloseTo(1.1, 2);
    expect(c[2]! / p[2]!).toBeCloseTo(1.1, 2);
    expect(cordis.compiled.player.knitTicks).toBe(plain.compiled.player.knitTicks);
    begin(cordis);
    for (const u of cordis.units.filter((x) => x.side === 'player')) expect(u.maxHp).toBe(c[u.tier - 1]);
  });

  it("Cordis: a merge radius of 2.0 lets the muster knit across squads it couldn't reach", () => {
    const gills = [at('gillNest', 0, 0, 1), at('gillNest', 0, 0, 2), at('gillNest', 0, 0, 3)];
    const tiers = (s: BattleState) => s.units.filter((u) => u.side === 'player').map((u) => u.tier).sort();
    const plain = battle(undefined, gills), cordis = battle('cordis', gills);
    expect([plain.compiled.player.mergeRadius, cordis.compiled.player.mergeRadius]).toEqual([1.5, 2]);
    const preview = (s: BattleState) => Object.values(mergePreview(s, 'player').byBuilding).reduce((n, b) => [n[0]! + b.elders, n[1]! + b.bloomed, n[2]! + b.base], [0, 0, 0]);
    expect([preview(plain), preview(cordis)]).toEqual([[0, 4, 0], [1, 1, 0]]);
    begin(plain);
    begin(cordis);
    expect([tiers(plain), tiers(cordis)]).toEqual([[2, 2, 2, 2], [2, 3]]);
  });
});
