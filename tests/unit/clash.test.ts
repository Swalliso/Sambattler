// R1's clash check (SPEC §16 R1, §12.2): squads, the army cards, and an army from a bot spec and a
// gold budget (R1-Q2, R1-Q4).
import { describe, expect, it } from 'vitest';
import { counterBotSpec } from '../../tools/lib/balance.ts';
import { armyFromBot, clashArmyIds, squadSize } from '../../tools/lib/clash.ts';
import type { Army } from '../../tools/lib/clash.ts';
import { protoContent } from '../../tools/lib/content.ts';
import { content } from '../helpers.ts';

const ids = (a: Army): string[] => a.entries.map((e) => e.buildingId);

describe("R1's squads and army cards (SPEC §11.2, §16 R1)", () => {
  it("squadSize at 60 s reproduces §11.2's Squad column", () => {
    const squads: Record<string, number> = {
      sporelingBurrow: 8, capguardHall: 4, gillNest: 4, amanitaLodge: 2, hammercapForge: 4,
      rootbreakerDen: 3, scythecapGrove: 3, veilstalkerHollow: 6, morelWarren: 6, tendersRing: 3,
    };
    for (const [id, n] of Object.entries(squads)) expect(squadSize(content, id), id).toBe(n);
    expect(squadSize(protoContent('burster'), 'bursterPod')).toBe(6);
    expect(squadSize(protoContent('rhizomorph'), 'rhizomorphTunnel')).toBe(3);
  });

  it('squadSize counts whole batches, halves rounded up, and only spawners have one', () => {
    expect(squadSize(content, 'amanitaLodge', 45)).toBe(2); // 1 × round(1.5)
    expect(squadSize(content, 'veilstalkerHollow', 45)).toBe(6); // 2 × round(2.5)
    expect(squadSize(content, 'sporelingBurrow', 75)).toBe(10); // 2 × round(4.6875)
    expect(() => squadSize(content, 'puffballMortar')).toThrow(/spawns nothing/);
  });

  it('the army cards are the roster without its economy and utility cards (A016)', () => {
    const roster = content.factions['velvet-bloom']!.buildings;
    expect(clashArmyIds(content)).toEqual(roster.filter((id) => !['truffleCellar', 'sporeExchange', 'rhizomeVault'].includes(id)));
    expect(clashArmyIds(content)).toContain('tendersRing');
    expect(clashArmyIds(content)).toContain('puffballMortar');
    expect(clashArmyIds(protoContent('burster'))).toContain('bursterPod');
  });
});

describe("R1's armies from build lists (SPEC §12.2, §16 R1; R1-Q2)", () => {
  it('a mono army holds as many of its card as the gold and the plots allow', () => {
    const two = armyFromBot(content, 'bot:mono:sporelingBurrow', 300, 1, 8);
    expect(ids(two)).toEqual(['sporelingBurrow', 'sporelingBurrow']);
    expect(two.spent).toBe(220);
    const capped = armyFromBot(content, 'bot:mono:sporelingBurrow', 1500, 1, 8); // the one-lane field's 8 plots
    expect(ids(capped)).toEqual(Array<string>(8).fill('sporelingBurrow'));
    expect(capped.spent).toBe(880);
    expect(armyFromBot(content, 'bot:mono:sporelingBurrow', 1500, 1, 12).spent).toBe(1320); // the late-run colony's 4 more
    expect(ids(armyFromBot(content, 'bot:mono:amanitaLodge', 300, 1, 8))).toEqual(['amanitaLodge']);
  });

  it("an army's entries: each spawner's squad from §11.2, and the Mortar as an emplacement", () => {
    const burrow = { buildingId: 'sporelingBurrow', kind: 'squad', unitId: 'sporeling', count: 8, mergeOn: true };
    expect(armyFromBot(content, 'bot:mono:sporelingBurrow', 300, 1, 8)).toEqual({
      controller: 'bot:mono:sporelingBurrow', budget: 300, spent: 220, entries: [burrow, burrow], supply: 16, units: 16,
    });
    const mortar = armyFromBot(content, 'bot:mono:puffballMortar', 300, 1, 8);
    expect(mortar.entries).toEqual([{ buildingId: 'puffballMortar', kind: 'emplacement', count: 1, mergeOn: false }]);
    expect([mortar.spent, mortar.supply, mortar.units]).toEqual([160, 0, 0]);
    const ring = armyFromBot(content, 'bot:mono:tendersRing', 300, 1, 8);
    expect(ring.entries).toEqual([{ buildingId: 'tendersRing', kind: 'squad', unitId: 'tender', count: 3, mergeOn: true }]);
    expect([ring.supply, ring.units]).toEqual([3, 3]);
  });

  it("bot:balanced skips its opener's Cellar, ignores afterSeconds, and stops only when nothing fits or the plots are full", () => {
    const cards = clashArmyIds(content);
    const cheapest = Math.min(...Object.keys(content.bots.balanced!.weights).filter((id) => cards.includes(id)).map((id) => content.buildings[id]!.cost));
    let den = false;
    for (const budget of [300, 600, 900, 1200, 1500]) {
      for (let seed = 1; seed <= 50; seed++) {
        const a = armyFromBot(content, 'bot:balanced', budget, seed, 8);
        expect(ids(a)[0]).toBe('sporelingBurrow');
        expect(ids(a)).not.toContain('truffleCellar');
        expect(a.spent).toBeLessThanOrEqual(budget);
        expect(a.entries.length === 8 || budget - a.spent < cheapest).toBe(true);
        if (budget === 600 && ids(a).includes('rootbreakerDen')) den = true; // its limit says "after 3:00"
      }
    }
    expect(den).toBe(true);
  });

  it('maxOwned holds', () => {
    let most = 0;
    for (let seed = 1; seed <= 20; seed++) {
      const mortars = ids(armyFromBot(content, 'bot:turtle', 1500, seed, 8)).filter((id) => id === 'puffballMortar').length;
      expect(mortars).toBeLessThanOrEqual(4);
      most = Math.max(most, mortars);
    }
    expect(most).toBe(4);
  });

  it('an army depends only on the bot, the budget and the seed, so it is the same in both seats and against every opponent', () => {
    const first = armyFromBot(content, 'bot:balanced', 900, 7, 8);
    armyFromBot(content, 'bot:mono:gillNest', 900, 7, 8);
    armyFromBot(content, 'general:scripted', 600, 3, 12);
    expect(armyFromBot(content, 'bot:balanced', 900, 7, 8)).toEqual(first);
    const distinct = new Set<string>();
    for (let seed = 1; seed <= 10; seed++) distinct.add(ids(armyFromBot(content, 'bot:balanced', 900, seed, 8)).join());
    expect(distinct.size).toBeGreaterThanOrEqual(2);
  });

  it('general:scripted builds an army too: its Cellar skipped, its squads merging ("auto" reads as on)', () => {
    for (let seed = 1; seed <= 10; seed++) {
      const a = armyFromBot(content, 'general:scripted', 600, seed, 8);
      expect(ids(a)[0]).toBe('sporelingBurrow');
      expect(ids(a)).not.toContain('truffleCellar');
      for (const e of a.entries) if (e.kind === 'squad') expect(e.mergeOn).toBe(true);
    }
  });

  it("the counter check's pair bots build their opener, and a merge-off bot's squads don't merge", () => {
    const cc = protoContent(counterBotSpec(content));
    expect(ids(armyFromBot(cc, 'bot:pair-capguardHall-gillNest', 300, 1, 8))).toEqual(['capguardHall', 'gillNest']);
    const off = armyFromBot(content, 'bot:balanced-nomerge', 900, 1, 8);
    expect(off.entries.length).toBeGreaterThan(0);
    for (const e of off.entries) if (e.kind === 'squad') expect(e.mergeOn).toBe(false);
  });
});
