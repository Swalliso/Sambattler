import { describe, expect, it } from 'vitest';
import {
  buildLibrary, createBattle, draftPool, generateOffer, hashState, makeConfig, parseCard, queueCommand, rarityWeights, runHeadless,
  seedStream, step,
} from '../../src/sim/index.ts';
import type { BattleState, DraftPool, Loadout } from '../../src/sim/index.ts';
import { building, content } from '../helpers.ts';

const flags = { merging: true, drafts: true, adaptiveGeneral: false, powers: false };
const pool: DraftPool = draftPool(content, 'velvet-bloom', 'vesper', flags);
const lib = buildLibrary(content, [...pool.core, ...pool.shared], pool.relics);
const starter = (): Loadout => ({ kit: ['sporelingBurrow', 'capguardHall', 'truffleCellar'], upgrades: {}, relics: [] });
const bigKit = (): Loadout => ({ kit: ['sporelingBurrow', 'capguardHall', 'truffleCellar', 'gillNest', 'rootbreakerDen'], upgrades: {}, relics: [] });

describe('draft offers (SPEC §8.3–8.4)', () => {
  it('the pool: Vesper core, the rest of the roster shared, Sporestorm Sigil held until powers', () => {
    expect(pool.core).toEqual(content.commanders.vesper!.core);
    expect(pool.shared).toEqual(['scythecapGrove', 'veilstalkerHollow', 'tendersRing', 'hammercapForge', 'amanitaLodge', 'morelWarren', 'rhizomeVault', 'sporeExchange']);
    expect(pool.relics).toHaveLength(20);
    expect(pool.relics).not.toContain('sporestormSigil');
    expect(draftPool(content, 'velvet-bloom', 'vesper', { ...flags, powers: true }).relics).toContain('sporestormSigil');
  });

  it('is deterministic per seed and stream', () => {
    const a = generateOffer(lib, pool, starter(), { cards: 3, battleIndex: 1 }, seedStream(7, 'draft', 1));
    const b = generateOffer(lib, pool, starter(), { cards: 3, battleIndex: 1 }, seedStream(7, 'draft', 1));
    expect(a).toEqual(b);
    expect(a).toHaveLength(3);
    const offers = new Set<string>();
    for (let s = 1; s <= 20; s++) offers.add(JSON.stringify(generateOffer(lib, pool, starter(), { cards: 3, battleIndex: 1 }, seedStream(s, 'draft', 1))));
    expect(offers.size).toBeGreaterThan(10);
  });

  it('never offers duplicates, owned blueprints, maxed tracks, owned relics or upgrades outside the kit', () => {
    const lo: Loadout = { ...bigKit(), upgrades: { gillNest: 3, capguardHall: 1 }, relics: ['thickCaps', 'sporeCloud'] };
    for (let s = 1; s <= 300; s++) {
      const offer = generateOffer(lib, pool, lo, { cards: 3, battleIndex: 2 }, seedStream(s, 'draft', 2));
      expect(new Set(offer.map((c) => c.id)).size).toBe(offer.length);
      for (const c of offer) {
        const p = parseCard(c.id)!;
        if (p.type === 'blueprint') expect(lo.kit).not.toContain(p.id);
        if (p.type === 'upgrade') { expect(lo.kit).toContain(p.id); expect(p.id).not.toBe('gillNest'); }
        if (p.type === 'relic') expect(lo.relics).not.toContain(p.id);
      }
    }
  });

  it('upgrade cards carry the rarity of the next level', () => {
    const lo: Loadout = { kit: ['sporelingBurrow'], upgrades: { sporelingBurrow: 2 }, relics: [] };
    const offer = generateOffer(lib, { core: [], shared: [], relics: [] }, lo, { cards: 3, battleIndex: 1 }, seedStream(1, 'draft', 1));
    expect(offer).toEqual([{ id: 'up:sporelingBurrow', type: 'upgrade', rarity: content.upgrades.sporelingBurrow!.rarity[2] }]);
  });

  it('type weights: 35/45/20, blueprints 50% while the kit is under 5; empty types are reweighted away', () => {
    const tally = (lo: Loadout, n: number) => {
      const t = { blueprint: 0, upgrade: 0, relic: 0 };
      const rng = seedStream(3, 'draft', 1);
      for (let i = 0; i < n; i++) t[generateOffer(lib, pool, lo, { cards: 1, battleIndex: 1 }, rng)[0]!.type]++;
      return t;
    };
    const n = 6000;
    const big = tally(bigKit(), n);
    expect(big.blueprint / n).toBeCloseTo(0.35, 1);
    expect(big.upgrade / n).toBeCloseTo(0.45, 1);
    expect(big.relic / n).toBeCloseTo(0.20, 1);
    const small = tally(starter(), n);
    expect(small.blueprint / n).toBeCloseTo(0.5, 1);
    const all: Loadout = { kit: [...pool.core, ...pool.shared], upgrades: {}, relics: [] };
    expect(tally(all, 500).blueprint).toBe(0);
  });

  it('rarity: 70/25/5, moving 3 points per battle from common to rare, plus bonuses', () => {
    expect(rarityWeights(lib, 1)).toEqual([70, 25, 5]);
    expect(rarityWeights(lib, 3)).toEqual([64, 25, 11]);
    expect(rarityWeights(lib, 2, 10)).toEqual([57, 25, 18]);
    // relic-only draws follow the weights (the pool has rares at every battle)
    const t = { common: 0, uncommon: 0, rare: 0 };
    const rng = seedStream(5, 'draft', 1);
    for (let i = 0; i < 6000; i++) t[generateOffer(lib, pool, starter(), { cards: 1, battleIndex: 1, types: ['relic'] }, rng)[0]!.rarity]++;
    expect(t.common / 6000).toBeCloseTo(0.70, 1);
    expect(t.rare / 6000).toBeCloseTo(0.05, 1);
  });

  it('core blueprints are weighted ×2 against shared ones', () => {
    // two common candidates: one core, one shared (made common for the test)
    const l2 = structuredClone(lib);
    l2.buildings.scythecapGrove!.rarity = 'common';
    const p2: DraftPool = { core: ['gillNest'], shared: ['scythecapGrove'], relics: [] };
    const lo: Loadout = { kit: [], upgrades: {}, relics: [] };
    let core = 0;
    const rng = seedStream(9, 'draft', 1);
    for (let i = 0; i < 6000; i++) if (generateOffer(l2, p2, lo, { cards: 1, battleIndex: 1 }, rng)[0]!.id === 'bp:gillNest') core++;
    expect(core / 6000).toBeCloseTo(2 / 3, 1);
  });
});

/** A live run-style battle with drafts on: the player is `player`, the enemy the scripted general. */
function draftBattle(player = 'human', seed = 4): BattleState {
  const config = makeConfig(content, { seed, player, flags });
  config.player.kit = ['sporelingBurrow', 'capguardHall', 'truffleCellar'];
  const s = createBattle(content, config);
  queueCommand(s, { tick: 0, side: 'player', type: 'begin' });
  return s;
}

describe('in-battle drafts and the hold', () => {
  it('opens at the end of wave 2 and holds the clock until the player picks', () => {
    const s = draftBattle();
    runHeadless(s, { until: 2399 });
    expect(s.held).toBe(false);
    step(s);
    expect(s.tick).toBe(2400);
    expect(s.held).toBe(true);
    expect(s.events.some((e) => e.t === 'draftOpen' && e.side === 'player')).toBe(true);
    const offer = s.sides.player.draft!.offer;
    expect(offer).toHaveLength(3);
    const hash = hashState(s);
    for (let i = 0; i < 5; i++) step(s);
    expect(s.tick).toBe(2400); // held: no tick passes
    queueCommand(s, { tick: s.tick + 1, side: 'player', type: 'place', buildingId: 'sporelingBurrow', lane: 0, col: 0, row: 0 });
    queueCommand(s, { tick: s.tick + 1, side: 'player', type: 'draftPick', cardId: offer[0]!.id });
    step(s);
    expect(s.tick).toBe(2400);
    expect(s.held).toBe(false);
    expect(s.stats.player.drafted).toEqual([offer[0]!.id]);
    expect(s.queue.some((c) => c.type === 'place')).toBe(true); // ordinary commands wait for the hold to end
    expect(hashState(s)).not.toBe(hash);
    step(s);
    expect(s.tick).toBe(2401);
    expect(s.queue.some((c) => c.type === 'place' && c.side === 'player')).toBe(false);
  });

  it('a pick applies its card and recompiles (blueprint into the kit, relic stats live)', () => {
    const s = draftBattle();
    runHeadless(s, { until: 2400 });
    const ss = s.sides.player;
    ss.draft!.offer = [{ id: 'relic:mycelialWeb', type: 'relic', rarity: 'uncommon' }, { id: 'bp:gillNest', type: 'blueprint', rarity: 'common' }];
    queueCommand(s, { tick: s.tick + 1, side: 'player', type: 'draftPick', cardId: 'relic:mycelialWeb' });
    step(s);
    expect(ss.relics).toEqual(['mycelialWeb']);
    expect(ss.supplyCap).toBe(content.balance.supplyCap + 6);
    expect(s.compiled.player.supplyCap).toBe(content.balance.supplyCap + 6);
  });

  it('standing buildings keep their HP fraction when a pick raises their maximum', () => {
    const s = draftBattle();
    runHeadless(s, { until: 2400 });
    const b = building(s, 'player', 'capguardHall', 0, 0);
    b.hp = Math.round(b.maxHp / 2);
    s.sides.player.draft!.offer = [{ id: 'relic:thickCaps', type: 'relic', rarity: 'common' }];
    queueCommand(s, { tick: s.tick + 1, side: 'player', type: 'draftPick', cardId: 'relic:thickCaps' });
    step(s);
    expect(b.maxHp).toBe(Math.round(content.buildings[b.buildingId]!.hp * 1.15));
    expect(b.hp).toBe(Math.round(b.maxHp / 2));
  });

  it('rerolls cost 20, then 30 battle gold; a skip gives +40; an off-offer pick is rejected', () => {
    const s = draftBattle();
    runHeadless(s, { until: 2400 });
    const ss = s.sides.player;
    ss.gold = 100;
    queueCommand(s, { tick: s.tick + 1, side: 'player', type: 'draftReroll' });
    queueCommand(s, { tick: s.tick + 1, side: 'player', type: 'draftReroll' });
    step(s);
    expect(ss.gold).toBe(50);
    expect(ss.draft!.rerolls).toBe(2);
    queueCommand(s, { tick: s.tick + 1, side: 'player', type: 'draftPick', cardId: 'bp:nothing' });
    step(s);
    expect(s.events.some((e) => e.t === 'commandRejected')).toBe(true);
    expect(s.held).toBe(true);
    queueCommand(s, { tick: s.tick + 1, side: 'player', type: 'draftSkip' });
    step(s);
    expect(ss.gold).toBe(90);
    expect(s.held).toBe(false);
    expect(s.stats.player.goldEarned.drafts).toBe(40);
  });

  it('runHeadless refuses to spin on a held battle with no draft command', () => {
    const s = draftBattle();
    expect(() => runHeadless(s, { until: 3000 })).toThrow(/held for a draft/);
  });

  it('a bot side answers its own drafts; four drafts per full battle at most', () => {
    const s = draftBattle('bot:balanced');
    const opened: number[] = [];
    runHeadless(s, { until: 'end', onTick: (st) => { for (const e of st.events) if (e.t === 'draftOpen') opened.push(st.tick); } });
    expect(s.held).toBe(false);
    expect(s.stats.player.drafted.length).toBe(s.sides.player.draftsOpened);
    expect(opened.every((t, i) => t === 2400 * (i + 1))).toBe(true);
    expect(opened.length).toBeLessThanOrEqual(4);
  });
});
