// Draft offers (SPEC §8.3–8.4), which the run's spoils use, and the drafts in planning after rounds 2, 4 and 6
// (§4.7 step 10, §8.3, §11.6, §14.5, §14.6; R2b T062).
import { describe, expect, it } from 'vitest';
import {
  applyCard, commandStamp, createBattle, draftLibrary, draftPool, generateOffer, hashState, kitCards, legalPlots, makeRoundConfig, nextLevel, parseCard,
  queueCommand, rarityWeights, rerollCost, runHeadless, seedStream, step,
} from '../../src/sim/index.ts';
import type { BattleConfig, BattleState, CommandBody, DraftPool, Loadout, SimEvent } from '../../src/sim/index.ts';
import { command, content, finishRound } from '../helpers.ts';

const flags = { merging: true, drafts: true, adaptiveGeneral: false, powers: false };
const pool: DraftPool = draftPool(content, 'velvet-bloom', 'vesper', flags);
const lib = draftLibrary(content, [...pool.core, ...pool.shared], pool.relics);
const starter = (): Loadout => ({ kit: ['sporelingBurrow', 'capguardHall', 'truffleCellar'], upgrades: {}, relics: [] });
const bigKit = (): Loadout => ({ kit: ['sporelingBurrow', 'capguardHall', 'truffleCellar', 'gillNest', 'rootbreakerDen'], upgrades: {}, relics: [] });

describe('draft offers (SPEC §8.3–8.4)', () => {
  it('the pool: Vesper core, the rest of the roster shared, Sporestorm Sigil held until powers and Mycorrhizal Link until combos', () => {
    expect(pool.core).toEqual(content.commanders.vesper!.core);
    expect(pool.shared).toEqual(['scythecapGrove', 'veilstalkerHollow', 'tendersRing', 'hammercapForge', 'amanitaLodge', 'morelWarren', 'sporeExchange', 'bursterPod', 'rhizomorphTunnel']);
    expect(pool.relics).toHaveLength(19);
    expect(pool.relics).not.toContain('mycorrhizalLink');
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

  it('upgrade cards carry the rarity of the next level offered, past one that is not (#27, A105)', () => {
    const none = { core: [], shared: [], relics: [] };
    const lo: Loadout = { kit: ['capguardHall', 'truffleCellar', 'sporelingBurrow'], upgrades: { capguardHall: 2, truffleCellar: 1, sporelingBurrow: 2 }, relics: [] };
    const offer = generateOffer(lib, none, lo, { cards: 3, battleIndex: 1 }, seedStream(1, 'draft', 1));
    // the Cellar's level 2 isn't offered, so its card is level 3's; the Burrow's level 3 isn't, so its track is full
    expect(offer.map((c) => c.id).sort()).toEqual(['up:capguardHall', 'up:truffleCellar']);
    expect(offer.find((c) => c.id === 'up:truffleCellar')!.rarity).toBe(content.upgrades.truffleCellar!.rarity[2]);
    expect(offer.find((c) => c.id === 'up:capguardHall')!.rarity).toBe(content.upgrades.capguardHall!.rarity[2]);
    applyCard(lo, 'up:truffleCellar', content.upgrades);
    expect(lo.upgrades.truffleCellar).toBe(3);
    expect(() => applyCard(lo, 'up:sporelingBurrow', content.upgrades)).toThrow(/no upgrade level left/);
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


// ---- drafts in planning (R2b T062) ----

const STARTER = ['sporelingBurrow', 'capguardHall', 'truffleCellar'];

/**
 * A battle with drafts on against the scripted general, which plans first: the player `human` unless set, with
 * Vesper's pool and, with `starter`, a run's starting kit rather than the roster (§8.1, §8.4).
 */
function draftConfig(seed = 1, opts: { player?: string; starter?: boolean } = {}): BattleConfig {
  const config = makeRoundConfig(content, { seed, player: opts.player ?? 'human', enemy: 'general:scripted', flags: { drafts: true } });
  if (opts.starter) config.player.kit = kitCards(content, config.player.controller, STARTER);
  return config;
}

/** Plays a human player's rounds, Beginning each with whatever it planted, until `round`'s planning opens. */
function toRound(s: BattleState, round: number): SimEvent[] {
  let opening: SimEvent[] = [];
  while (s.round < round) {
    if (s.sides.player.draft) command(s, 'player', { type: 'draftSkip' });
    finishRound(s);
    step(s);
    opening = [...s.events];
  }
  expect(s.phase).toBe('planning');
  return opening;
}

const rejected = (events: readonly SimEvent[]): string[] => events.flatMap((e) => (e.t === 'commandRejected' ? [e.reason] : []));

describe('drafts in planning (§4.7 step 10, §8.3)', () => {
  it("opens in round 3's planning once the general has planned, never in rounds 1–2, and in rounds 3, 5 and 7 only", () => {
    const s = createBattle(content, draftConfig());
    expect(s.sides.player.draft).toBeUndefined();
    toRound(s, 2);
    expect(s.sides.player.draft).toBeUndefined();
    const opening = toRound(s, 3);
    expect(s.sides.player.draft).toMatchObject({ index: 1, rerolls: 0 });
    expect(s.sides.player.draft!.offer).toHaveLength(content.balance.draft.cards);
    const kinds = opening.map((e) => (e.t === 'generalPlanned' || e.t === 'draftOpen' ? `${e.t}:${e.side}` : null)).filter(Boolean);
    expect(kinds).toEqual(['generalPlanned:enemy', 'draftOpen:player']);
    toRound(s, 4);
    expect(s.sides.player.draft).toBeUndefined();
    toRound(s, 5);
    expect(s.sides.player.draft).toMatchObject({ index: 2 });
    expect(s.sides.enemy.draftsOpened).toBe(0);
  });

  it('a battle has one draft for each round in `draftRounds` whose next planning it reached: one that ends in round 4 had 1', () => {
    expect(content.balance.rounds.draftRounds).toEqual([2, 4, 6]);
    for (const [hp, end, drafts] of [[2500, 4, 1], [3000, 5, 2]] as const) {
      const config = draftConfig();
      config.player.heartcapMaxHp = hp;
      const s = createBattle(content, config);
      let opened = 0;
      while (s.phase !== 'ended') {
        if (s.phase === 'planning') {
          if (s.sides.player.draft) { opened++; command(s, 'player', { type: 'draftSkip' }); }
          finishRound(s);
        } else step(s);
      }
      expect(s.outcome).toMatchObject({ winner: 'enemy', round: end });
      expect([opened, s.sides.player.draftsOpened]).toEqual([drafts, drafts]);
    }
  });

  it('Begin, plant, sell and the merge toggle are refused while it is open (#28), and Begin runs after a pick or a skip', () => {
    const s = createBattle(content, draftConfig());
    command(s, 'player', { type: 'plant', buildingId: 'capguardHall', plot: legalPlots(s, 'player', 'capguardHall')[0]! });
    const hall = s.buildings.find((b) => b.side === 'player')!;
    toRound(s, 3);
    expect(rejected(command(s, 'player', { type: 'beginClash' }))).toEqual(['draftOpen']);
    expect(rejected(command(s, 'player', { type: 'plant', buildingId: 'gillNest', plot: 0 }))).toEqual(['draftOpen']);
    expect(rejected(command(s, 'player', { type: 'sell', entityId: hall.id }))).toEqual(['draftOpen']);
    expect(rejected(command(s, 'player', { type: 'toggleMerge', entityId: hall.id, on: false }))).toEqual(['draftOpen']);
    expect(s.phase).toBe('planning');
    expect(s.stats.player.rejectedCommands).toBe(4);
    const offer = s.sides.player.draft!.offer;
    expect(command(s, 'player', { type: 'draftPick', cardId: offer[0]!.id })).toContainEqual({ t: 'drafted', side: 'player', cardId: offer[0]!.id, skipped: false });
    expect(s.sides.player.draft).toBeUndefined();
    expect(rejected(command(s, 'player', { type: 'draftSkip' }))).toEqual(['noDraftOpen']);
    command(s, 'player', { type: 'beginClash' });
    expect(s.phase).toBe('clash');
  });

  it('a skip pays +40 in this phase, counted in the gold banked at Begin; rerolls cost 20, then 30', () => {
    const s = createBattle(content, draftConfig());
    toRound(s, 3);
    const gold = s.sides.player.gold;
    expect(rerollCost(s, 'player')).toBe(20);
    const first = s.sides.player.draft!.offer;
    command(s, 'player', { type: 'draftReroll' });
    expect(s.sides.player.gold).toBe(gold - 20);
    expect(s.sides.player.draft).toMatchObject({ rerolls: 1, index: 1 });
    expect(s.sides.player.draft!.offer).not.toEqual(first);
    expect(rerollCost(s, 'player')).toBe(30);
    command(s, 'player', { type: 'draftReroll' });
    expect(s.sides.player.gold).toBe(gold - 50);
    s.sides.player.gold = 39;
    expect(rejected(command(s, 'player', { type: 'draftReroll' }))).toEqual(['notEnoughGold']);
    expect(command(s, 'player', { type: 'draftSkip' })).toContainEqual({ t: 'drafted', side: 'player', cardId: null, skipped: true });
    expect(s.sides.player.gold).toBe(39 + 40);
    expect(s.stats.player.goldEarned.drafts).toBe(40);
    command(s, 'player', { type: 'beginClash' });
    expect(s.sides.player.bankedAtBegin).toBe(79);
  });

  it('a picked blueprint plants in the same phase, and a pick adds its card to the side for the rest of the battle', () => {
    for (let seed = 1; ; seed++) {
      const s = createBattle(content, draftConfig(seed, { starter: true }));
      toRound(s, 3);
      const bp = s.sides.player.draft!.offer.find((c) => parseCard(c.id)!.type === 'blueprint');
      if (!bp) continue;
      const id = parseCard(bp.id)!.id;
      expect(legalPlots(s, 'player', id)).toEqual([]);
      command(s, 'player', { type: 'draftPick', cardId: bp.id });
      expect(s.sides.player.kit.map((c) => c.building)).toEqual([...STARTER, id]);
      expect(s.sides.player.drafted).toEqual([bp.id]);
      expect(s.compiled.player.buildings[id]).toBeDefined();
      s.sides.player.gold = 1000;
      const events = command(s, 'player', { type: 'plant', buildingId: id, plot: legalPlots(s, 'player', id)[0]! });
      expect(events.map((e) => e.t)).toContain('buildingPlanted');
      break;
    }
  });

  it('the general never drafts, even with a pool; a bot player answers before it plans, by its policy, in a logged command', () => {
    const config = draftConfig(2, { player: 'bot:balanced' });
    config.enemy.draft = config.player.draft;
    const s = createBattle(content, config);
    const r = runHeadless(s, { until: { round: 3, tick: 1 } });
    expect(s.sides.enemy.draftsOpened).toBe(0);
    expect(s.sides.player.draftsOpened).toBe(1);
    expect(r.eventCounts.draftOpen).toBe(1);
    expect(s.sides.player.drafted).toHaveLength(1);
    const round3 = s.log.filter((c) => c.round === 3 && c.side === 'player');
    expect(round3[0]).toMatchObject({ type: 'draftPick', cardId: s.sides.player.drafted![0], round: 3 });
    expect(round3.at(-1)!.type).toBe('beginClash');
    expect(s.stats.player.rejectedCommands).toBe(0);
  });

  it('draft commands carry their round: one queued early waits for its round\'s planning', () => {
    const s = createBattle(content, draftConfig());
    queueCommand(s, { round: 3, tick: 0, side: 'player', type: 'draftSkip' });
    toRound(s, 3);
    expect(s.sides.player.draft).toBeDefined();
    const gold = s.sides.player.gold;
    step(s);
    expect(s.sides.player.draft).toBeUndefined();
    expect(s.sides.player.gold).toBe(gold + 40);
    expect(s.log.find((c) => c.type === 'draftSkip')).toMatchObject({ round: 3 });
  });

  it('offers come from the battle\'s draft stream and replay exactly (A093)', () => {
    const offerAt3 = (seed: number) => { const s = createBattle(content, draftConfig(seed)); toRound(s, 3); return s.sides.player.draft!.offer; };
    expect(offerAt3(4)).toEqual(offerAt3(4));
    expect(new Set([1, 2, 3, 4, 5, 6].map((seed) => JSON.stringify(offerAt3(seed)))).size).toBeGreaterThan(3);
    // a battle with a reroll, a pick and a skip replays from its log to the same hash
    const s = createBattle(content, draftConfig(6, { starter: true }));
    const play: Record<number, (st: BattleState) => CommandBody[]> = {
      3: () => [{ type: 'draftReroll' }],
      5: (st) => [{ type: 'draftPick', cardId: st.sides.player.draft!.offer[1]!.id }],
    };
    while (s.phase !== 'ended') {
      if (s.phase === 'planning') {
        for (const body of play[s.round]?.(s) ?? []) command(s, 'player', body);
        if (s.sides.player.draft && s.round === 3) command(s, 'player', { type: 'draftPick', cardId: s.sides.player.draft.offer[0]!.id });
        if (s.sides.player.draft) command(s, 'player', { type: 'draftSkip' });
        finishRound(s);
      } else step(s);
    }
    expect(s.sides.player.drafted).toHaveLength(2);
    const again = createBattle(content, draftConfig(6, { starter: true }));
    runHeadless(again, { until: 'end', commands: s.log.filter((c) => c.side === 'player') });
    expect(hashState(again)).toBe(hashState(s));
  });

  it("no offer holds a level that isn't offered, the level after one stays reachable (A105), and no unit level adds a unit (#27)", () => {
    const pool = draftPool(content, 'velvet-bloom', 'vesper', { merging: true, drafts: true, adaptiveGeneral: false, powers: false });
    const lib = draftLibrary(content, [...pool.core, ...pool.shared], pool.relics);
    const tracks = Object.keys(content.upgrades);
    for (let seed = 1; seed <= 200; seed++) {
      const rng = seedStream(seed, 'draft', 1);
      const lo: Loadout = { kit: tracks, upgrades: Object.fromEntries(tracks.map((id, i) => [id, (seed + i) % 4])), relics: [] };
      for (const c of generateOffer(lib, pool, lo, { cards: 3, battleIndex: 2, types: ['upgrade'] }, rng)) {
        const id = parseCard(c.id)!.id, next = nextLevel(content.upgrades[id]!, lo.upgrades[id]!);
        expect(next, c.id).not.toBeNull();
        expect(content.upgrades[id]!.levels[next! - 1]!.offered, c.id).toBeUndefined();
      }
    }
    for (const id of ['rhizomeVault']) expect(nextLevel(content.upgrades[id]!, 0)).toBeNull();
    // the Exchange's interest +10 stays reachable past its dead level 2
    const ex: Loadout = { kit: ['sporeExchange'], upgrades: { sporeExchange: 1 }, relics: [] };
    expect(generateOffer(lib, { core: [], shared: [], relics: [] }, ex, { cards: 3, battleIndex: 1 }, seedStream(1, 'draft', 1)).map((c) => c.id)).toEqual(['up:sporeExchange']);
    applyCard(ex, 'up:sporeExchange', content.upgrades);
    expect(ex.upgrades.sporeExchange).toBe(3);
    // a Burrow fields R1's 8 and a Morel Warren its 6 at every level: their level 3 isn't offered
    const config = draftConfig();
    config.player.upgrades = { sporelingBurrow: 3, morelWarren: 3 };
    const s = createBattle(content, config);
    expect(s.compiled.player.buildings.sporelingBurrow!.squad!.count).toBe(8);
    expect(s.compiled.player.buildings.morelWarren!.squad!.count).toBe(6);
    expect(nextLevel(content.upgrades.sporelingBurrow!, 2)).toBeNull();
    expect(nextLevel(content.upgrades.morelWarren!, 2)).toBeNull();
  });

  it('a battle without drafts holds no pool and opens none; a draft command there is refused', () => {
    const s = createBattle(content, makeRoundConfig(content, { seed: 1, player: 'human', enemy: 'general:scripted' }));
    expect(s.config.player).not.toHaveProperty('draft');
    expect(s.compiled.player).not.toHaveProperty('draft');
    toRound(s, 3);
    expect(s.sides.player.draft).toBeUndefined();
    queueCommand(s, { ...commandStamp(s), side: 'player', type: 'draftSkip' });
    step(s);
    expect(rejected(s.events)).toEqual(['noDraftOpen']);
  });
});
