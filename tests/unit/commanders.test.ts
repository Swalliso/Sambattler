// Commanders in runs (SPEC §8.1, §8.4, §11.10, §16 Milestone 5): the three commanders' pools and
// starter kits, ban filtering and its rules, core-pool weighting, and the commander in run battles.
import { describe, expect, it } from 'vitest';
import { banProblem, battleConfig, botCoreWeights, createRun, loadRun, MemoryStorage, RUN_KEY, runPool, simulateRun } from '../../src/run/index.ts';
import type { RouteNode } from '../../src/run/index.ts';
import { buildLibrary, createBattle, draftPool, generateOffer, parseCard, seedStream } from '../../src/sim/index.ts';
import { candidates } from '../../src/sim/draft.ts';
import type { DraftPool, Loadout } from '../../src/sim/index.ts';
import { content } from '../helpers.ts';

const FLAGS = { merging: true, drafts: true, adaptiveGeneral: true, powers: true };
const ROSTER = content.factions['velvet-bloom']!.buildings;

describe('the three commanders (SPEC §11.10)', () => {
  it('each has six core buildings, a starter kit of three from its core, a passive and a power', () => {
    expect(Object.keys(content.commanders)).toEqual(['vesper', 'armilla', 'cordis']);
    const powers = { vesper: ['sporeBurst', 75, 45], armilla: ['rhizomeSurge', 100, 90], cordis: ['puppetBloom', 80, 60] } as const;
    for (const [id, [power, cooldown, first]] of Object.entries(powers)) {
      const c = content.commanders[id]!;
      expect(c.core).toHaveLength(6);
      for (const b of c.starter) expect(c.core).toContain(b);
      for (const b of c.core) expect(ROSTER).toContain(b);
      expect(c.power).toMatchObject({ id: power, cooldown, firstReady: first });
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
      const s = createBattle(content, config);
      expect(s.sides.player.powerCooldown).toBe(content.commanders[id]!.power.firstReady * 20);
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
    expect(pool.shared).toEqual(ROSTER.filter((id) => !pool.core.includes(id) && !bans.includes(id)));
    const lib = buildLibrary(content, ROSTER, pool.relics);
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
    const storage = new MemoryStorage();
    storage.set(RUN_KEY, JSON.stringify({ ...run, bans: undefined }));
    expect(loadRun(storage)!.bans).toEqual([]); // a save from before bans loads with none
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
      const lib = buildLibrary(content, ROSTER, []);
      const cands = candidates(lib, pool, { kit: [], upgrades: {}, relics: [] }, 'blueprint');
      for (const c of cands) expect(c.weight).toBe(pool.core.includes(parseCard(c.card.id)!.id) ? content.balance.draft.coreWeight : 1);
    }
    // measured: a common core building against a common shared one, by commander (Armilla's Hammercap is shared for Vesper)
    const lib = buildLibrary(content, ROSTER, []);
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
