// The run in rounds (SPEC §8): the route, each battle's config in rounds, lives, sprawl and rewards, the Grove,
// events, saves and whole runs played headless. Runs saved before R2 are in migrate.test.ts.
import { describe, expect, it } from 'vitest';
import {
  MemoryStorage, battleConfig, battleProfile, battleRewards, chooseNode, createRun, eventChoose, finishBattle, generalKit, groveChoose,
  groveProblem, hashRun, loadRun, mapPool, outcomeAvailable, promptAnswer, recoverPendingChoice, runPool, saveRun, simulateRun, spoilsPick,
  spoilsReroll,
} from '../../src/run/index.ts';
import type { RunState } from '../../src/run/index.ts';
import { analyzeFielded, basePlots, createBattle, makeRoundConfig, planningView, runHeadless } from '../../src/sim/rounds/index.ts';
import type { BattleConfig, BattleState, Side } from '../../src/sim/rounds/index.ts';
import { protoContent } from '../../tools/lib/content.ts';
import { content } from '../helpers.ts';

const bal = content.balance;

const configOf = (run: RunState): BattleConfig => {
  if (run.screen.kind !== 'battle') throw new Error('not in battle');
  return run.screen.config;
};

/** Jumps the run to a row (earlier rows count as their first node) and enters node `index` there. */
function enter(run: RunState, row: number, index: number): void {
  run.path = Array.from({ length: row }, (_, i) => run.path[i] ?? 0);
  run.screen = { kind: 'route' };
  chooseNode(content, run, index);
}

/** A battle in rounds from the run's current battle config, ended with the given result in round 5. */
function ended(run: RunState, winner: Side, by: 'rout' | 'decision'): BattleState {
  const s = createBattle(content, configOf(run));
  s.phase = 'ended';
  s.outcome = { winner, by, round: 5 };
  return s;
}

/** The saved run, which must load. */
function load(storage: MemoryStorage): RunState {
  const r = loadRun(storage, content);
  if (r.kind !== 'run') throw new Error(`no run: ${r.kind}`);
  return r.run;
}

describe('route (SPEC §8.2)', () => {
  it('six rows in the fixed shape, deterministic per seed', () => {
    for (let seed = 1; seed <= 30; seed++) {
      const r = createRun(content, { seed }).route;
      expect(r.map((row) => row.map((n) => n.kind))).toEqual([
        ['battle'], ['battle', 'event', 'grove'], ['battle', 'elite'],
        expect.arrayContaining(['event', 'grove']), ['battle', 'elite'], ['boss'],
      ]);
      expect(r[3]).toHaveLength(2);
      expect(createRun(content, { seed }).route).toEqual(r);
    }
  });

  it('maps come from the playable pool (no test maps), distinct within a row; elites carry a modifier; events are distinct', () => {
    const pool = mapPool(content);
    expect(pool).toEqual(['bogwater-hollow', 'stumpfield', 'twin-roots']);
    const orders = new Set<string>();
    for (let seed = 1; seed <= 30; seed++) {
      const r = createRun(content, { seed }).route;
      for (const row of r) {
        const maps = row.filter((n) => n.map).map((n) => n.map!);
        for (const m of maps) expect(pool).toContain(m);
        expect(new Set(maps).size).toBe(maps.length);
        for (const n of row) {
          if (n.kind === 'elite') expect(content.eliteOrder).toContain(n.elite);
          if (n.map) expect(content.generals[n.general!]?.adaptive).toBe(true);
        }
      }
      const events = r.flat().filter((n) => n.kind === 'event').map((n) => n.event!);
      expect(new Set(events).size).toBe(2);
      // the first three battle-node maps never repeat before the 3-map pool runs dry
      expect(new Set([r[0]![0]!.map, r[1]![0]!.map, r[2]![0]!.map]).size).toBe(3);
      orders.add(r[3]!.map((n) => n.kind).join());
    }
    expect(orders.size).toBe(2); // row 4's order is drawn
  });

  it('generals (SPEC §7.7, §8.2): eligible by appearsIn, distinct within a row, the Pale Sovereign at the boss', () => {
    const rowIndex = [1, 2, 3, 3, 4];
    const seen = new Set<string>();
    for (let seed = 1; seed <= 40; seed++) {
      const r = createRun(content, { seed }).route;
      r.forEach((row, i) => {
        const gens = row.filter((n) => n.map && n.kind !== 'boss').map((n) => n.general!);
        expect(new Set(gens).size).toBe(gens.length);
        for (const g of gens) {
          expect(content.generals[g]!.appearsIn).toContain(rowIndex[i]);
          seen.add(g);
        }
      });
      expect(r[5]![0]!.general).toBe('pale-sovereign');
      expect(r[0]![0]!.general).not.toBe('blightwright'); // battles 2–4 only
    }
    expect([...seen].sort()).toEqual(['blightwright', 'lichen-baron', 'mother-mold']);
  });
});

describe('battle setup and rewards (SPEC §4.5, §4.6, §6.1, §6.5, §8.5–8.6)', () => {
  it('battle configs are in rounds and scale with the battle index; the boss has 3600 HP; elites carry their modifier', () => {
    const run = createRun(content, { seed: 3 });
    chooseNode(content, run, 0);
    const c1 = configOf(run);
    expect(c1.battleIndex).toBe(1);
    expect(c1.player.startingGold).toBe(bal.startingGold);
    expect(c1.enemy.heartcapMaxHp).toBe(bal.heartcapEnemyHp.base);
    expect(c1.player.heartcapMaxHp).toBe(bal.heartcapPlayerHp);
    for (const s of ['player', 'enemy'] as const) expect(c1[s]).not.toHaveProperty('heartcapHp');
    expect(c1.player.kit).toEqual([{ building: 'sporelingBurrow' }, { building: 'capguardHall' }, { building: 'truffleCellar' }]);
    expect(c1.flags.drafts).toBe(false); // drafts open in planning from T067
    expect(() => createBattle(content, c1)).not.toThrow();
    run.battles.push({ ...({} as RunState['battles'][number]), index: 1 }, { ...({} as RunState['battles'][number]), index: 2 });
    enter(run, 4, 1); // row 5 elite, battle 3
    const c3 = configOf(run);
    expect(c3.battleIndex).toBe(3);
    expect(c3.player.startingGold).toBe(bal.startingGold + 2 * bal.startingGoldPerBattle);
    expect(c3.enemy.heartcapMaxHp).toBe(bal.heartcapEnemyHp.base + 2 * bal.heartcapEnemyHp.perBattle);
    const elite = run.route[4]![1]!.elite!;
    if (elite !== 'veteran') expect(c3.modifiers!.map((m) => m.source)).toContain(`elite:${elite}`);
    expect(c3.modifiers!.map((m) => m.source)).toContain(`general:${run.route[4]![1]!.general}`); // the passive
    expect(c3.enemy.kit.map((c) => c.building)).toEqual(generalKit(content, run, run.route[4]![1]!, 3).kit);
    enter(run, 5, 0);
    expect(configOf(run).enemy.heartcapMaxHp).toBe(bal.heartcapEnemyHp.boss);
  });

  it('the general\'s kit grows with the battle index (SPEC §7.8)', () => {
    const run = createRun(content, { seed: 12 });
    const g = content.generals.scripted!;
    const levels = (u: Record<string, number>) => Object.values(u).reduce((a, b) => a + b, 0);
    const k1 = generalKit(content, run, { kind: 'battle', map: 'stumpfield', general: 'scripted' }, 1);
    expect(k1.kit).toEqual(g.opener);
    expect(levels(k1.upgrades)).toBe(0);
    const k3 = generalKit(content, run, { kind: 'battle', map: 'stumpfield', general: 'scripted' }, 3);
    expect(k3.kit).toEqual([...g.opener, ...g.preferred!.slice(0, 2)]);
    expect(levels(k3.upgrades)).toBe(2);
    for (const id of Object.keys(k3.upgrades)) expect(k3.kit).toContain(id);
    const e3 = generalKit(content, run, { kind: 'elite', map: 'stumpfield', general: 'scripted', elite: 'swift' }, 3);
    expect(levels(e3.upgrades)).toBe(3);
    const boss = generalKit(content, run, { kind: 'boss', map: 'stumpfield', general: 'scripted' }, 4);
    expect(boss.kit).toHaveLength(bal.enemyKit.bossBuildings);
    expect(levels(boss.upgrades)).toBe(bal.enemyKit.bossUpgrades);
    const vet = generalKit(content, run, { kind: 'elite', map: 'stumpfield', general: 'scripted', elite: 'veteran' }, 2);
    const spawners = vet.kit.filter((id) => content.buildings[id]!.spawn);
    for (const id of spawners) expect(vet.upgrades[id]).toBeGreaterThanOrEqual(1); // Veteran: +1 on every unit track
    expect(levels(vet.upgrades)).toBe(spawners.length + 2); // plus (i − 1) + elite random levels
    expect(generalKit(content, run, { kind: 'battle', map: 'stumpfield', general: 'scripted' }, 3)).toEqual(k3); // deterministic
  });

  it("no general's battle-1 kit holds R1's Burster Pod or Rhizomorph Tunnel: the kit append retired with aiWeight (R2-Q5, A048)", () => {
    const run = createRun(content, { seed: 12 });
    for (const general of Object.keys(content.generals)) {
      const { kit } = generalKit(content, run, { kind: 'battle', map: 'stumpfield', general }, 1);
      expect(kit, general).not.toContain('bursterPod');
      expect(kit, general).not.toContain('rhizomorphTunnel');
    }
  });

  it('the boss can buy every kit card and upgraded track, without changing single-battle profiles (R2-Q4)', () => {
    for (let seed = 1; seed <= 20; seed++) {
      const run = createRun(content, { seed });
      run.battles = Array.from({ length: 3 }, (_, i) => ({ index: i + 1 }) as RunState['battles'][number]);
      const config = battleConfig(content, run, { kind: 'boss', map: 'stumpfield', general: 'scripted' });
      const state = createBattle(content, config);
      const buyable = state.sides.enemy.ai!.weights.filter((w) => w.weight > 0).map((w) => w.building);
      expect(config.enemy.kit.map((c) => c.building)).toContain('scythecapGrove');
      for (const { building } of config.enemy.kit) expect(buyable).toContain(building);
      for (const id of Object.keys(config.enemy.upgrades!)) expect(buyable).toContain(id);
    }
    const single = createBattle(content, makeRoundConfig(content, { seed: 1, player: 'bot:balanced', enemy: 'general:scripted' }));
    expect(single.config.enemy.aiWeights).toBeUndefined();
    expect(single.sides.enemy.ai!.weights.map((w) => w.building)).not.toContain('scythecapGrove');
    expect(content.generals.scripted!.weights.scythecapGrove).toBeUndefined();
  });

  it('the boss plants its added Scythecap Grove in ordinary play', () => {
    const planted = Array.from({ length: 20 }, (_, i) => {
      const run = createRun(content, { seed: i + 1, player: 'bot:balanced' });
      run.battles = Array.from({ length: 3 }, (_, j) => ({ index: j + 1 }) as RunState['battles'][number]);
      const state = createBattle(content, battleConfig(content, run, { kind: 'boss', map: 'stumpfield', general: 'scripted' }));
      runHeadless(state, { until: { round: 5 } });
      expect(state.stats.enemy.rejectedCommands).toBe(0);
      return state.sides.enemy.ai!.plans.some((p) => p.planted.some((b) => b.building === 'scythecapGrove'));
    });
    expect(planted).toContain(true);
  });

  it('the reward table: a loss pays nothing, the boss pays in full by Decision (R2-Q14), a Decision win picks 1 of 2 (#17)', () => {
    const r = { rarityBiasStep: 10, eliteRareBonus: 10 };
    expect(battleRewards('battle', 'player', 'rout', r)).toEqual({ spores: 20, amber: 0, amberChance: 0, spoils: [{ label: 'Spoils', cards: 3, freeRerolls: 1, rareBonus: 10, relicsOnly: false }] });
    expect(battleRewards('battle', 'player', 'decision', r)).toMatchObject({ spores: 10, spoils: [{ cards: 2, freeRerolls: 0, rareBonus: 0 }] });
    const e = battleRewards('elite', 'player', 'rout', r);
    expect(e.spores).toBe(35);
    expect(e.amberChance).toBe(0.25);
    expect(e.spoils.map((s) => [s.relicsOnly, s.rareBonus])).toEqual([[false, 20], [true, 10]]);
    for (const by of ['rout', 'decision'] as const) {
      expect(battleRewards('boss', 'player', by, r)).toEqual({ spores: 60, amber: 2, amberChance: 0, spoils: [] });
      expect(battleRewards('battle', 'enemy', by, r)).toEqual({ spores: 0, amber: 0, amberChance: 0, spoils: [] });
    }
  });

  it('a won battle costs no life, pays Spores and spoils, and adds a plot, up to 4 (#18)', () => {
    const run = createRun(content, { seed: 5 });
    chooseNode(content, run, 0);
    const record = finishBattle(content, run, ended(run, 'player', 'rout'));
    expect([run.lives, run.spores, run.xp, run.plotsGained]).toEqual([{ left: 3, max: 3 }, 20, 20 + 25, 1]);
    expect(record).toMatchObject({ winner: 'player', by: 'rout', lifeLost: false, rounds: [], drafted: [] });
    expect(record.heartcaps).toEqual({ player: { max: 3000, end: 3000 }, enemy: { max: 2000, end: 2000 } });
    for (const gone of ['durationTicks', 'front', 'mapWidth', 'heartcapBefore', 'heartcapAfter']) expect(record).not.toHaveProperty(gone);
    expect(run.screen.kind).toBe('spoils');
    if (run.screen.kind === 'spoils') {
      expect(run.screen.picks[0]!.offer).toHaveLength(3);
      spoilsReroll(content, run);
      expect(() => spoilsReroll(content, run)).toThrow(/no rerolls/);
      const card = (run.screen as { picks: { offer: { id: string }[] }[] }).picks[0]!.offer[0]!.id;
      spoilsPick(content, run, card);
      expect(run.cards.at(-1)).toEqual({ card, source: 'spoils 1' });
    }
    expect(run.screen.kind).toBe('route');
    // sprawl stops at 4 more plots
    run.plotsGained = 4;
    enter(run, 1, 0);
    finishBattle(content, run, ended(run, 'player', 'decision'));
    expect(run.plotsGained).toBe(4);
    expect(run.screen.kind === 'spoils' && run.screen.picks[0]!.cards).toBe(2); // a pick of 1 from 2 (#17)
  });

  it('a lost battle costs a life and pays nothing; the run goes on with earlier Spores kept, ends at 0 lives, and a boss loss ends it (#16)', () => {
    const run = createRun(content, { seed: 5 });
    run.spores = 30;
    for (const [i, by] of (['decision', 'rout'] as const).entries()) {
      enter(run, i, 0);
      const record = finishBattle(content, run, ended(run, 'enemy', by));
      expect(record.lifeLost).toBe(true);
      expect(record.spores).toBe(0);
      expect(run.screen.kind).toBe('route');
      expect(run.outcome).toBeUndefined();
    }
    expect([run.lives.left, run.spores, run.plotsGained, run.amber]).toEqual([1, 30, 0, 0]);
    enter(run, 2, 0);
    finishBattle(content, run, ended(run, 'enemy', 'decision'));
    expect([run.lives.left, run.outcome, run.screen.kind]).toEqual([0, 'defeat', 'summary']);

    const boss = createRun(content, { seed: 6 });
    enter(boss, 5, 0);
    finishBattle(content, boss, ended(boss, 'enemy', 'decision'));
    expect([boss.lives.left, boss.outcome]).toEqual([2, 'defeat']);
  });

  it('a boss win, by Rout or by Decision, ends the run in victory with 60 Spores and +2 Amber (R2-Q14)', () => {
    for (const by of ['rout', 'decision'] as const) {
      const run = createRun(content, { seed: 6 });
      enter(run, 5, 0);
      finishBattle(content, run, ended(run, 'player', by));
      expect([run.outcome, run.spores, run.amber]).toEqual(['victory', 60, 2]);
    }
  });

  it("each battle's Heartcap starts at its max: 3000, 2550 after Fallen Oak, +15% for one battle after the Rest", () => {
    const run = createRun(content, { seed: 7 });
    chooseNode(content, run, 0);
    expect(configOf(run).player.heartcapMaxHp).toBe(3000);
    expect(createBattle(content, configOf(run)).sides.player.heartcapHp).toBe(3000);
    run.heartcapMaxPct = -0.15;
    run.next.heartcapMaxHpPct = 0.15;
    enter(run, 1, 0);
    expect(configOf(run).player.heartcapMaxHp).toBe(Math.round(3000 * 0.85 * 1.15));
    finishBattle(content, run, ended(run, 'player', 'rout'));
    expect(run.next).toEqual({ startingGold: 0, sporestormShiftRounds: 0, heartcapMaxHpPct: 0 });
    enter(run, 2, 0);
    expect(configOf(run).player.heartcapMaxHp).toBe(2550);
  });

  it('both colonies open the map\'s plots plus your sprawl (#18, #21), and start empty (#20)', () => {
    const run = createRun(content, { seed: 9 });
    run.plotsGained = 2;
    chooseNode(content, run, 0);
    const c = configOf(run);
    const map = content.maps[c.mapId]!;
    expect([c.player.plots, c.enemy.plots]).toEqual([basePlots(map) + 2, basePlots(map) + 2]);
    const s = createBattle(content, c);
    expect(s.buildings.filter((b) => b.side === 'player')).toEqual([]);
    expect(s.sides.player.plots.filter((p) => p.open)).toHaveLength(basePlots(map) + 2);
  });

  it('with `bosslives`, each life left adds 250 to your boss Heartcap; off by default (#16)', () => {
    const run = createRun(content, { seed: 6 });
    run.lives.left = 2;
    enter(run, 5, 0);
    expect(configOf(run).player.heartcapMaxHp).toBe(3000);
    const knob = protoContent('bosslives');
    expect(battleConfig(knob, run, run.route[5]![0]!).player.heartcapMaxHp).toBe(3000 + 2 * 250);
    expect(battleConfig(knob, run, run.route[0]![0]!).player.heartcapMaxHp).toBe(3000);
    expect(bal.livesAtBoss).toBeUndefined();
  });

  it("intel reads every battle, a lost one too: the mean of each round's kind scores over what you fielded, then ½ / ½ (§7.6)", () => {
    const run = createRun(content, { seed: 3, player: 'bot:balanced' });
    chooseNode(content, run, 0);
    const state = createBattle(content, configOf(run));
    runHeadless(state, { until: 'end' });
    const view = planningView(state, 'enemy');
    const per = state.rounds.map((r) => analyzeFielded(view, r.round, r.round)).filter((a) => a.total > 0);
    expect(per.length).toBeGreaterThan(0);
    const profile = battleProfile(state)!;
    for (const k of ['swarm', 'line', 'armor', 'elite', 'ranged'] as const) {
      expect(profile[k]).toBeCloseTo(per.reduce((n, a) => n + a.scores[k], 0) / per.length, 9);
    }
    state.outcome = { ...state.outcome!, winner: 'enemy' };
    const record = finishBattle(content, run, state);
    expect(record.lifeLost).toBe(true);
    expect(record.rounds).toEqual(state.rounds);
    expect(record.profile).toEqual(profile);
    expect(run.intel).toEqual(profile);
    // the second battle's profile moves intel halfway (`intelKeep`)
    const before = run.intel!;
    run.screen = { kind: 'route' };
    chooseNode(content, run, 0);
    const second = createBattle(content, configOf(run));
    runHeadless(second, { until: 'end' });
    const p2 = battleProfile(second)!;
    finishBattle(content, run, second);
    expect(run.intel!.swarm).toBeCloseTo(0.5 * before.swarm! + 0.5 * p2.swarm!, 9);
    expect(run.profiles).toHaveLength(2);
  });
});

describe('Grove and events (SPEC §8.7)', () => {
  const at = (kind: 'grove' | 'event', event?: string): RunState => {
    const run = createRun(content, { seed: 2 });
    run.path = [0, kind === 'grove' ? 2 : 1];
    run.screen = kind === 'grove' ? { kind: 'grove' } : { kind: 'event', event: event! };
    return run;
  };

  it('the Grove: a life up to the max, refused at full lives; graft through a prompt; Leave always (R2-Q21)', () => {
    let run = at('grove');
    expect(groveProblem(content, run, 'life')).toMatch(/full/);
    expect(() => groveChoose(content, run, 'life')).toThrow(/full/);
    run.lives.left = 2;
    groveChoose(content, run, 'life');
    expect(run.lives).toEqual({ left: 3, max: 3 });
    expect(run.screen.kind).toBe('route');
    run = at('grove');
    groveChoose(content, run, 'graft');
    expect(run.screen.kind).toBe('prompt');
    promptAnswer(content, run, 'capguardHall');
    expect(run.upgrades).toEqual({ capguardHall: 1 });
    expect(run.screen.kind).toBe('route');
    run = at('grove');
    run.lives.left = 1;
    expect(groveProblem(content, run, 'leave')).toBeNull();
    groveChoose(content, run, 'leave');
    expect([run.screen.kind, run.lives.left, run.upgrades]).toEqual(['route', 1, {}]);
  });

  it("Fallen Oak: a rare relic, and every later battle's Heartcap 15% lower", () => {
    const run = at('event', 'fallen-oak');
    eventChoose(content, run, 0);
    expect(run.relics).toHaveLength(1);
    expect(content.relics[run.relics[0]!]!.rarity).toBe('rare');
    expect(run.heartcapMaxPct).toBe(-0.15);
    expect(run.lives).toEqual({ left: 3, max: 3 });
    expect(run.screen.kind).toBe('route');
  });

  it('Spore Merchant: needs a non-starter blueprint; gives one up for two chosen upgrade levels', () => {
    const run = at('event', 'spore-merchant');
    expect(outcomeAvailable(content, run, content.events['spore-merchant']!.choices[0]!.outcome)).toBe(false);
    expect(() => eventChoose(content, run, 0)).toThrow(/not available/);
    run.kit.push('gillNest');
    eventChoose(content, run, 0);
    expect(run.screen.kind === 'prompt' && run.screen.prompt.options).toEqual(['gillNest']);
    promptAnswer(content, run, 'gillNest');
    expect(run.kit).not.toContain('gillNest');
    promptAnswer(content, run, 'sporelingBurrow');
    promptAnswer(content, run, 'sporelingBurrow');
    expect(run.upgrades).toEqual({ sporelingBurrow: 2 });
    expect(run.screen.kind).toBe('route');
  });

  it('Spore Merchant rejects trades when removal leaves fewer than two upgrade levels, without spending anything', () => {
    for (const sporeLevel of [2, 3]) {
      const run = at('event', 'spore-merchant');
      run.kit.push('gillNest');
      run.upgrades = { sporelingBurrow: sporeLevel, capguardHall: 3, truffleCellar: 3, gillNest: 2 };
      const before = hashRun(run);
      const outcome = content.events['spore-merchant']!.choices[0]!.outcome;
      expect(outcomeAvailable(content, run, outcome)).toBe(false);
      expect(() => eventChoose(content, run, 0)).toThrow(/not available/);
      expect(hashRun(run)).toBe(before);
    }
  });

  it('Spore Merchant offers only sacrifices that preserve two upgrade slots and rejects an invalid sacrifice without loss', () => {
    const run = at('event', 'spore-merchant');
    run.kit.push('gillNest', 'puffballMortar');
    run.upgrades = { sporelingBurrow: 3, capguardHall: 3, truffleCellar: 3, gillNest: 1, puffballMortar: 3 };
    const beforeEligibility = hashRun(run);
    const outcome = content.events['spore-merchant']!.choices[0]!.outcome;
    for (let i = 0; i < 3; i++) expect(outcomeAvailable(content, run, outcome)).toBe(true);
    expect(hashRun(run)).toBe(beforeEligibility);
    eventChoose(content, run, 0);
    expect(run.screen.kind === 'prompt' && run.screen.prompt.options).toEqual(['puffballMortar']);
    const beforeInvalid = hashRun(run);
    expect(() => promptAnswer(content, run, 'gillNest')).toThrow(/not an available option/);
    expect(hashRun(run)).toBe(beforeInvalid);
    promptAnswer(content, run, 'puffballMortar');
    promptAnswer(content, run, 'gillNest');
    promptAnswer(content, run, 'gillNest');
    expect(run.kit).not.toContain('puffballMortar');
    expect(run.upgrades.gillNest).toBe(3);
    expect(run.cards.map((c) => c.card)).toEqual(['up:gillNest', 'up:gillNest']);
    expect(run.screen.kind).toBe('route');
  });

  it('Spore Merchant delivers two levels split across nearly full tracks and rejects a maxed follow-up pick', () => {
    const run = at('event', 'spore-merchant');
    run.kit.push('gillNest');
    run.upgrades = { sporelingBurrow: 2, capguardHall: 2, truffleCellar: 3, gillNest: 3 };
    eventChoose(content, run, 0);
    promptAnswer(content, run, 'gillNest');
    promptAnswer(content, run, 'sporelingBurrow');
    expect(run.screen.kind === 'prompt' && run.screen.prompt.options).toEqual(['capguardHall']);
    const before = hashRun(run);
    expect(() => promptAnswer(content, run, 'sporelingBurrow')).toThrow(/not an available option/);
    expect(hashRun(run)).toBe(before);
    promptAnswer(content, run, 'capguardHall');
    expect(run.cards).toHaveLength(2);
    expect(run.upgrades).toMatchObject({ sporelingBurrow: 3, capguardHall: 3 });
    expect(run.screen.kind).toBe('route');
  });

  it('recovers a persisted legacy Merchant reward after the blueprint was already traded, preserving available levels and run progress', () => {
    for (const sporeLevel of [2, 3]) {
      const legacy = at('event', 'spore-merchant');
      // Before the fix the trade could remove Gill Nest, then save an unaffordable two-level reward.
      legacy.upgrades = { sporelingBurrow: sporeLevel, capguardHall: 3, truffleCellar: 3, gillNest: 2 };
      legacy.pending = [{ upgrade: { count: 2, pick: 'choose' } }];
      legacy.screen = { kind: 'prompt', prompt: {
        title: 'Spore Merchant', text: 'Choose an upgrade track for +1 level.',
        options: sporeLevel < 3 ? ['sporelingBurrow'] : [], optionKind: 'upgrade', remaining: 2,
      } };
      legacy.spores = 60;
      const storage = new MemoryStorage();
      saveRun(storage, legacy);
      const run = load(storage);
      const rngBefore = structuredClone(run.rng);
      const notice = recoverPendingChoice(content, run);
      expect(notice).toContain(sporeLevel === 2 ? 'only 1 of its 2 remaining levels' : 'could not restore its 2 remaining levels');
      expect(notice).toContain('without paying again');
      expect(run.kit).toEqual(legacy.kit);
      expect(run.path).toEqual(legacy.path);
      expect(run.lives).toEqual(legacy.lives);
      expect(run.spores).toBe(60);
      expect(run.rng).toEqual(rngBefore);
      expect(recoverPendingChoice(content, run)).toBeNull();
      // The migrated state itself round-trips and no longer needs recovery after another reload.
      saveRun(storage, run);
      const recovered = load(storage);
      expect(recoverPendingChoice(content, recovered)).toBeNull();
      if (sporeLevel === 2) {
        expect(recovered.screen.kind === 'prompt' && recovered.screen.prompt.remaining).toBe(1);
        promptAnswer(content, recovered, 'sporelingBurrow');
        expect(recovered.upgrades.sporelingBurrow).toBe(3);
        expect(recovered.cards.map((c) => c.card)).toEqual(['up:sporelingBurrow']);
      }
      expect(recovered.screen.kind).toBe('route');
      expect(recovered.pending).toEqual([]);
      expect(recovered.rng).toEqual(rngBefore);
    }
  });

  it('returns persisted legacy blueprint and relic prompts to their event when no sacrifice can deliver the reward', () => {
    for (const event of ['spore-merchant', 'hungry-roots']) {
      for (const hasRouteOrigin of [true, false]) {
        const legacy = at('event', event);
        if (hasRouteOrigin) legacy.route[1]![1] = { kind: 'event', event };
        else legacy.path = []; // An older prompt can still be recovered from its event title.
        legacy.kit.push('gillNest');
        legacy.upgrades = { sporelingBurrow: 3, capguardHall: 3, truffleCellar: 3, gillNest: 1 };
        if (event === 'hungry-roots') legacy.relics = [...runPool(content, legacy).relics];
        legacy.pending = structuredClone(content.events[event]!.choices[0]!.outcome);
        legacy.screen = { kind: 'prompt', prompt: {
          title: content.events[event]!.title, text: 'Choose an item to give up.', remaining: 1,
          optionKind: event === 'spore-merchant' ? 'blueprint' : 'relic',
          options: event === 'spore-merchant' ? ['gillNest'] : [...legacy.relics],
        } };
        const storage = new MemoryStorage();
        saveRun(storage, legacy);
        const run = load(storage);
        expect(recoverPendingChoice(content, run)).toContain('No items were spent');
        expect(run.screen).toEqual({ kind: 'event', event });
        expect(run.pending).toEqual([]);
        expect(run.kit).toEqual(legacy.kit);
        expect(run.relics).toEqual(legacy.relics);
        expect(run.upgrades).toEqual(legacy.upgrades);
        expect(run.path).toEqual(legacy.path);
        expect(run.rng).toEqual(legacy.rng);
        expect(recoverPendingChoice(content, run)).toBeNull();
        expect(() => eventChoose(content, run, 0)).toThrow(/not available/);
        eventChoose(content, run, 1);
        expect(run.screen.kind).toBe('route');
      }
    }
  });

  it('rebuilds a persisted legacy Merchant sacrifice prompt to keep feasible trades available', () => {
    const legacy = at('event', 'spore-merchant');
    legacy.kit.push('gillNest', 'puffballMortar');
    legacy.upgrades = { sporelingBurrow: 3, capguardHall: 3, truffleCellar: 3, gillNest: 1, puffballMortar: 3 };
    legacy.pending = structuredClone(content.events['spore-merchant']!.choices[0]!.outcome);
    legacy.screen = { kind: 'prompt', prompt: {
      title: 'Spore Merchant', text: 'Choose a blueprint to give up.', remaining: 1,
      optionKind: 'blueprint', options: ['gillNest', 'puffballMortar'],
    } };
    const storage = new MemoryStorage();
    saveRun(storage, legacy);
    const run = load(storage);
    expect(recoverPendingChoice(content, run)).toContain('Choose an available option');
    expect(run.screen.kind === 'prompt' && run.screen.prompt.options).toEqual(['puffballMortar']);
    expect(run.kit).toEqual(legacy.kit);
    expect(run.rng).toEqual(legacy.rng);
    expect(recoverPendingChoice(content, run)).toBeNull();
    promptAnswer(content, run, 'puffballMortar');
    promptAnswer(content, run, 'gillNest');
    promptAnswer(content, run, 'gillNest');
    expect(run.screen.kind).toBe('route');
    expect(run.upgrades.gillNest).toBe(3);
  });

  it('relic trades and gains reject exhausted rewards before charging their cost, without consuming RNG', () => {
    for (const event of ['hungry-roots', 'fallen-oak']) {
      const run = at('event', event);
      run.relics = [...runPool(content, run).relics];
      const before = hashRun(run);
      for (let i = 0; i < 3; i++) expect(outcomeAvailable(content, run, content.events[event]!.choices[0]!.outcome)).toBe(false);
      expect(() => eventChoose(content, run, 0)).toThrow(/not available/);
      expect(hashRun(run)).toBe(before);
    }
  });

  it('Hungry Roots grants both relics at the pool boundary and rejects invalid or stale sacrifice choices without loss', () => {
    const run = at('event', 'hungry-roots');
    const pool = runPool(content, run).relics;
    const absent = pool.at(-1)!;
    run.relics = pool.filter((id) => id !== absent);
    const beforeEligibility = hashRun(run);
    expect(outcomeAvailable(content, run, content.events['hungry-roots']!.choices[0]!.outcome)).toBe(true);
    expect(hashRun(run)).toBe(beforeEligibility);
    eventChoose(content, run, 0);
    const beforeInvalid = hashRun(run);
    expect(() => promptAnswer(content, run, absent)).toThrow(/not an available option/);
    expect(hashRun(run)).toBe(beforeInvalid);
    const stale = structuredClone(run);
    stale.relics.push(absent);
    const beforeStale = hashRun(stale);
    expect(() => promptAnswer(content, stale, stale.relics[0]!)).toThrow(/not an available option/);
    expect(hashRun(stale)).toBe(beforeStale);
    promptAnswer(content, run, run.relics[0]!);
    expect(new Set(run.relics)).toEqual(new Set(pool));
    expect(run.cards).toHaveLength(2);
    expect(run.screen.kind).toBe('route');
  });

  it('Hungry Roots: a relic for two one rarity lower; Mold Bloom: the next storm at round 4 with +150 gold, then it resets', () => {
    let run = at('event', 'hungry-roots');
    run.relics = ['sporeCloud'];
    eventChoose(content, run, 0);
    promptAnswer(content, run, 'sporeCloud');
    expect(run.relics).toHaveLength(2);
    for (const r of run.relics) expect(content.relics[r]!.rarity).toBe('uncommon');
    run = at('event', 'mold-bloom');
    eventChoose(content, run, 0);
    expect(run.next).toEqual({ startingGold: 150, sporestormShiftRounds: -1, heartcapMaxHpPct: 0 });
    run.path = [0];
    chooseNode(content, run, 0);
    const c = configOf(run);
    expect(c.player.startingGold).toBe(bal.startingGold + 150);
    expect(createBattle(content, c).rules.storm.startRound).toBe(bal.rounds.sporestorm.startRound - 1);
    finishBattle(content, run, ended(run, 'player', 'decision'));
    expect(run.next).toEqual({ startingGold: 0, sporestormShiftRounds: 0, heartcapMaxHpPct: 0 });
  });

  it("Quiet Clearing: Rest is the next battle's +15% max HP; Forage keeps v1's random level", () => {
    let run = at('event', 'quiet-clearing');
    eventChoose(content, run, 0);
    expect(run.next.heartcapMaxHpPct).toBe(0.15);
    run.path = [0];
    chooseNode(content, run, 0);
    expect(configOf(run).player.heartcapMaxHp).toBe(3450);
    run = at('event', 'quiet-clearing');
    eventChoose(content, run, 1);
    expect(Object.values(run.upgrades)).toEqual([1]);
  });
});

describe('save and resume (SPEC §8.9)', () => {
  it('the run state round-trips through storage at a node boundary', () => {
    const r = simulateRun(content, 11, { route: 'random', draft: 'greedy', player: 'bot:balanced' }, { maxBattles: 2 });
    const storage = new MemoryStorage();
    saveRun(storage, r.run);
    const back = load(storage);
    expect(back).toEqual(r.run);
    expect(hashRun(back)).toBe(hashRun(r.run));
  });
});

describe('whole runs (autoplay)', () => {
  it('are deterministic per seed and policies', () => {
    const p = { route: 'random' as const, draft: 'greedy' as const, player: 'bot:balanced' };
    const a = simulateRun(content, 7, p, { maxBattles: 2 });
    const b = simulateRun(content, 7, p, { maxBattles: 2 });
    expect(a.hashes).toEqual(b.hashes);
    expect(hashRun(a.run)).toBe(hashRun(b.run));
  });

  it('play to the summary in rounds: a life lost only in a lost battle, and 4–5 battles in a finished run', () => {
    for (const seed of [1, 2]) {
      const r = simulateRun(content, seed, { route: 'random', draft: 'greedy', player: 'bot:balanced' });
      expect(r.outcome).not.toBe('incomplete');
      expect(r.run.screen.kind).toBe('summary');
      for (const b of r.battles) expect(b.lifeLost, `seed ${seed} battle ${b.index}`).toBe(b.winner === 'enemy');
      // the Grove may give a life back; a defeat is at 0 lives or at the boss
      if (r.outcome === 'defeat') expect(r.lives.left === 0 || r.battles.at(-1)!.kind === 'boss').toBe(true);
      else expect(r.lives.left).toBeGreaterThan(0);
      if (r.reachedBoss) expect(r.battleCount).toBeGreaterThanOrEqual(4);
      expect(r.battleCount).toBeLessThanOrEqual(5);
      for (const b of r.battles) expect(b.rounds.length).toBeGreaterThan(0);
      expect(r.totalBattleTicks).toBeGreaterThan(0);
    }
  });
});
