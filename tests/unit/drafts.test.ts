// Draft offers (SPEC §8.3–8.4), which the run's spoils use. R2b's T062 adds the drafts in planning.
import { describe, expect, it } from 'vitest';
import { draftLibrary, draftPool, generateOffer, parseCard, rarityWeights, seedStream } from '../../src/sim/index.ts';
import type { DraftPool, Loadout } from '../../src/sim/index.ts';
import { content } from '../helpers.ts';

const flags = { merging: true, drafts: true, adaptiveGeneral: false, powers: false };
const pool: DraftPool = draftPool(content, 'velvet-bloom', 'vesper', flags);
const lib = draftLibrary(content, [...pool.core, ...pool.shared], pool.relics);
const starter = (): Loadout => ({ kit: ['sporelingBurrow', 'capguardHall', 'truffleCellar'], upgrades: {}, relics: [] });
const bigKit = (): Loadout => ({ kit: ['sporelingBurrow', 'capguardHall', 'truffleCellar', 'gillNest', 'rootbreakerDen'], upgrades: {}, relics: [] });

describe('draft offers (SPEC §8.3–8.4)', () => {
  it('the pool: Vesper core, the rest of the roster shared, Sporestorm Sigil held until powers', () => {
    expect(pool.core).toEqual(content.commanders.vesper!.core);
    expect(pool.shared).toEqual(['scythecapGrove', 'veilstalkerHollow', 'tendersRing', 'hammercapForge', 'amanitaLodge', 'morelWarren', 'rhizomeVault', 'sporeExchange', 'bursterPod', 'rhizomorphTunnel']);
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
