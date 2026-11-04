// The v3 prototype's switch and block (docs/v3-proto-plan.md; the concept's sections 3.3, 3.5 and 4; T001–T004):
// every v3 rule runs only when the battle's config says `rules: 'v3'`, and only then does the battle carry the `v3`
// block of data/balance.json. Under v3 merging is ×2.0, the gold upgrade is refused and no planner buys one, and both
// kits are the roster. `--proto v3.<key>:<value>` tunes the block as it tunes any data.
import { describe, expect, it } from 'vitest';
import { createBattle, hashState, makeRoundConfig, runHeadless, upgradeProblem } from '../../src/sim/index.ts';
import type { Content, RoundBattleOptions } from '../../src/sim/index.ts';
import { battleForParams, parseRoundParams } from '../../src/app/urlParams.ts';
import { protoContent } from '../../tools/lib/content.ts';
import { begin, content, plant } from '../helpers.ts';

const V3 = content.balance.v3!;
const battle = (opts: Partial<RoundBattleOptions> = {}, c: Content = content) =>
  createBattle(c, makeRoundConfig(c, { seed: 1, player: 'human', enemy: 'human', ...opts }));

describe('the switch (T001)', () => {
  it('a config without rules is v2: it names no rules, and its battle carries no v3 block', () => {
    const config = makeRoundConfig(content, { seed: 1 });
    expect('rules' in config).toBe(false);
    const s = createBattle(content, config);
    expect('v3' in s.library.balance).toBe(false);
    expect(s.library.balance.tierStatMult).toBe(content.balance.tierStatMult);
    // v2 asked for by name is the same battle, hash and all
    expect(hashState(createBattle(content, makeRoundConfig(content, { seed: 1, rules: 'v2' })))).toBe(hashState(s));
  });

  it('v3 is named in the config, and only its battle carries the block', () => {
    const s = battle({ rules: 'v3' });
    expect(s.config.rules).toBe('v3');
    expect(s.library.balance.v3).toEqual(V3);
  });
});

describe('?rules= (T001)', () => {
  it('opens a v3 battle, v2 by name or by default, and refuses any other value visibly', () => {
    const open = (q: string) => battleForParams(content, parseRoundParams(q), 1);
    expect(open('?scene=battle&rules=v3').config.rules).toBe('v3');
    expect('rules' in open('?scene=battle&rules=v2').config).toBe(false);
    expect('rules' in open('?scene=battle').config).toBe(false);
    expect(parseRoundParams('?scene=battle&rules=v4').problems).toEqual(["rules=v4 isn't v2 or v3"]);
    expect(() => open('?scene=battle&rules=v4')).toThrow("rules=v4 isn't v2 or v3");
  });
});

describe('under v3 (T003)', () => {
  it("merges at ×2.0: a Bloomed unit has ×2.0 its parts' stats and an Elder ×4.0, against v2's 2.8", () => {
    const v2 = battle().compiled.player.units.sporeling!.tiers, v3 = battle({ rules: 'v3' }).compiled.player.units.sporeling!.tiers;
    expect(V3.tierStatMult).toBe(2);
    expect(v3[0]).toEqual(v2[0]);
    expect(v3[1].damage / v2[1].damage).toBeCloseTo(2 / content.balance.tierStatMult, 9);
    expect(v3[2].damage / v2[2].damage).toBeCloseTo(4 / content.balance.tierStatMult ** 2, 9);
  });

  it("keeps both kits to the roster, in its order, the general's limits kept", () => {
    const s = battle({ rules: 'v3', enemy: 'general:mother-mold' });
    for (const side of ['player', 'enemy'] as const) expect(s.sides[side].kit.map((c) => c.building)).toEqual(V3.roster);
    expect(s.sides.enemy.kit.find((c) => c.building === 'truffleCellar')?.maxOwned).toBe(3);
  });

  it('refuses the upgrade command', () => {
    const s = battle({ rules: 'v3' });
    plant(s, 'player', 'sporelingBurrow', { lane: 0, rank: 0, file: 1 });
    expect(upgradeProblem(s, 'player', s.buildings[0]!.id)).toBe('upgradeRetired');
    begin(s);
    expect(s.rounds).toHaveLength(1);
  });

  it('keeps the general and the bots from buying upgrades, the whole battle through', () => {
    for (const map of ['bogwater-hollow', 'twin-roots']) {
      const s = battle({ rules: 'v3', player: 'bot:balanced', enemy: 'general:lichen-baron', mapId: map, seed: 2 });
      const { eventCounts } = runHeadless(s, { until: 'end' });
      expect(s.phase).toBe('ended');
      expect(eventCounts.buildingUpgraded).toBeUndefined();
      expect(s.sides.player.ai!.plans.some((p) => p.upgraded)).toBe(false);
      expect(s.sides.enemy.ai!.plans.some((p) => p.upgraded)).toBe(false);
      expect(s.stats.player.rejectedCommands + s.stats.enemy.rejectedCommands).toBe(0);
    }
  });
});

describe('--proto reaches the block (T002)', () => {
  it('v3.tierStatMult:2.1 applies under v3, and v2 is as it was', () => {
    const c = protoContent('v3.tierStatMult:2.1');
    expect(battle({ rules: 'v3' }, c).library.balance.tierStatMult).toBe(2.1);
    expect(battle({}, c).library.balance.tierStatMult).toBe(content.balance.tierStatMult);
  });

  it("V3-Q9's levers, once set, replace v2's numbers under v3: the Cellar's cost and gold, the round cap and each Heartcap", () => {
    const c = protoContent('v3.cellar:{"cost":120,"goldPerRound":60},v3.roundDamageCap:{"flat":600},v3.heartcapPlayerHp:2500,v3.heartcapEnemyHp:1800');
    const s = battle({ rules: 'v3' }, c), v2 = battle({}, c);
    expect(s.compiled.player.buildings.truffleCellar).toMatchObject({ cost: 120, economy: { goldPerRound: 60 } });
    expect(s.rules.roundDamageCap).toEqual({ flat: 600 });
    expect([s.sides.player.heartcapMaxHp, s.sides.enemy.heartcapMaxHp]).toEqual([2500, 1800]);
    expect(v2.compiled.player.buildings.truffleCellar).toMatchObject({ cost: 150, economy: { goldPerRound: 50 } });
    expect(v2.rules.roundDamageCap).toEqual(content.balance.roundDamageCap);
    expect([v2.sides.player.heartcapMaxHp, v2.sides.enemy.heartcapMaxHp]).toEqual([content.balance.heartcapPlayerHp, content.balance.heartcapEnemyHp.base]);
  });
});
