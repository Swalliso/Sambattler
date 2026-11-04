// The run in rounds (SPEC §8): the route, each battle's config in rounds, lives, sprawl and rewards, the Grove,
// events, saves and whole runs played headless. Runs saved before R2 are in migrate.test.ts.
import { describe, expect, it } from 'vitest';
import {
  BATTLE_KEY, MemoryStorage, battleConfig, battleSave, battleProfile, battleRewards, chooseNode, createRun, eventChoose, finishBattle, generalKit, groveChoose,
  groveProblem, hashRun, loadRun, mapPool, outcomeAvailable, promptAnswer, recoverPendingChoice, resumeBattle, runPool, saveBattle, saveRun, simulateRun,
  spoilsPick, spoilsReroll,
} from '../../src/run/index.ts';
import type { RouteNode, RunState } from '../../src/run/index.ts';
import { analyzeFielded, basePlots, createBattle, hashState, makeRoundConfig, planningView, runHeadless } from '../../src/sim/index.ts';
import type { BattleConfig, BattleState, IntelProfile, Side } from '../../src/sim/index.ts';
import { matchupClass } from '../../src/sim/matchups.ts';
import type { RunJob } from '../../tools/lib/balance.ts';
import { protoContent } from '../../tools/lib/content.ts';
import { inProcessRuns, runJobPool } from '../../tools/lib/pool.ts';
import { content, playOn } from '../helpers.ts';

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

/** A battle in rounds from the run's current battle config, ended with the given result in `round`: the last, so it skipped no draft, unless set. */
function ended(run: RunState, winner: Side, by: 'rout' | 'decision', round = 9): BattleState {
  const s = createBattle(content, configOf(run));
  s.phase = 'ended';
  s.outcome = { winner, by, round };
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
  it('battle configs are in rounds and scale with the battle index; the boss has its own Heartcap; elites carry their modifier', () => {
    const run = createRun(content, { seed: 3 });
    chooseNode(content, run, 0);
    const c1 = configOf(run);
    expect(c1.battleIndex).toBe(1);
    expect(c1.player.startingGold).toBe(bal.startingGold);
    expect(c1.enemy.heartcapMaxHp).toBe(bal.heartcapEnemyHp.base);
    expect(c1.player.heartcapMaxHp).toBe(bal.heartcapPlayerHp);
    for (const s of ['player', 'enemy'] as const) expect(c1[s]).not.toHaveProperty('heartcapHp');
    expect(c1.player.kit).toEqual([{ building: 'sporelingBurrow' }, { building: 'capguardHall' }, { building: 'truffleCellar' }]);
    expect(c1.flags.drafts).toBe(true); // you draft in planning (T067), and the general never does
    expect(c1.player.draft).toEqual(runPool(content, run));
    expect(c1.enemy).not.toHaveProperty('draft');
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
    const k = bal.enemyKit;
    expect(levels(k3.upgrades)).toBe(2 * k.upgradesPerBattle);
    for (const id of Object.keys(k3.upgrades)) expect(k3.kit).toContain(id);
    const e3 = generalKit(content, run, { kind: 'elite', map: 'stumpfield', general: 'scripted', elite: 'swift' }, 3);
    expect(levels(e3.upgrades)).toBe(2 * k.upgradesPerBattle + k.eliteUpgrades);
    const boss = generalKit(content, run, { kind: 'boss', map: 'stumpfield', general: 'scripted' }, 4);
    expect(boss.kit).toHaveLength(bal.enemyKit.bossBuildings);
    expect(levels(boss.upgrades)).toBe(bal.enemyKit.bossUpgrades);
    const vet = generalKit(content, run, { kind: 'elite', map: 'stumpfield', general: 'scripted', elite: 'veteran' }, 2);
    const spawners = vet.kit.filter((id) => content.buildings[id]!.squad);
    for (const id of spawners) expect(vet.upgrades[id]).toBeGreaterThanOrEqual(1); // Veteran: +1 on every unit track
    // plus (i − 1) × 3 + the elite's random levels, less any +1 a track already full couldn't take
    expect(levels(vet.upgrades)).toBeGreaterThanOrEqual(Math.max(spawners.length, k.upgradesPerBattle + k.eliteUpgrades));
    expect(levels(vet.upgrades)).toBeLessThanOrEqual(spawners.length + k.upgradesPerBattle + k.eliteUpgrades);
    expect(generalKit(content, run, { kind: 'battle', map: 'stumpfield', general: 'scripted' }, 3)).toEqual(k3); // deterministic
  });

  it("the general's random levels and Veteran land only on levels that are offered, by the tracks' lengths in the data (#27, A100)", () => {
    const live = (id: string, level: number) => level <= content.upgrades[id]!.levels.length && content.upgrades[id]!.levels[level - 1]!.offered !== false;
    for (let seed = 1; seed <= 25; seed++) {
      const run = createRun(content, { seed });
      for (const general of ['scripted', 'lichen-baron', 'mother-mold', 'blightwright', 'pale-sovereign']) {
        for (const node of [
          { kind: 'battle', general }, { kind: 'elite', general, elite: 'veteran' }, { kind: 'boss', general },
        ] as const) {
          for (const index of [2, 4, 6]) {
            const { upgrades } = generalKit(content, run, { ...node, map: 'stumpfield' }, index);
            for (const [id, level] of Object.entries(upgrades)) expect(live(id, level), `${general} ${node.kind} ${index}: ${id} ${level}`).toBe(true);
          }
        }
      }
    }
    // the Lichen Baron's Amanita Lodge joins at battle 6, and Veteran never takes its dead level 3
    const run = createRun(content, { seed: 4 });
    const vet = generalKit(content, run, { kind: 'elite', map: 'stumpfield', general: 'lichen-baron', elite: 'veteran' }, 6);
    expect(vet.kit).toContain('amanitaLodge');
    expect(vet.upgrades.amanitaLodge).toBeGreaterThanOrEqual(1);
    expect(vet.upgrades.amanitaLodge).toBeLessThanOrEqual(2);
  });

  it('Old Mother Mold opens battle 1 with a Sporeling Burrow and a Truffle Cellar, and her Gill Archer Nest joins in battle 2 (R2-Q13, T068)', () => {
    const run = createRun(content, { seed: 3 });
    const mold = (index: number) => generalKit(content, run, { kind: 'battle', map: 'bogwater-hollow', general: 'mother-mold' }, index).kit;
    expect(mold(1)).toEqual(['sporelingBurrow', 'truffleCellar']);
    expect(mold(2)).toEqual(['sporelingBurrow', 'truffleCellar', 'gillNest']);
    // battle 1's kit holds only her first opener, so the draw among her openers can't change it (#69)
    const s = createBattle(content, battleConfig(content, run, { kind: 'battle', map: 'bogwater-hollow', general: 'mother-mold' }));
    expect(s.sides.enemy.ai!.plans[0]!.planted.slice(0, 2).map((p) => p.building)).toEqual(['sporelingBurrow', 'truffleCellar']);
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

  it("the boss kit's first extra card answers the run's top intel kind: no swarm building against a Swarm, no Morel Warren against a Line (§7.8, §7.4, A056)", () => {
    const boss: RouteNode = { kind: 'boss', map: 'stumpfield', general: 'pale-sovereign' };
    const opener = content.generals['pale-sovereign']!.opener;
    const firstExtra = (profile: IntelProfile, target: string) => {
      const run = createRun(content, { seed: 3, player: 'bot:balanced' });
      run.profiles = [profile];
      const config = battleConfig(content, run, boss);
      const state = createBattle(content, config);
      const id = config.enemy.kit[opener.length]!.building, unit = content.buildings[id]!.squad!.unit;
      return { id, swarm: content.units[unit]!.tags.includes('swarm'), cls: matchupClass(state, 'enemy', unit, 1, 'player', target, 1) };
    };
    // mono Sporeling Burrows read as Swarm: the Capguard Hall is in the opener, so the next answer joins
    expect(firstExtra({ swarm: 1 }, 'sporeling')).toEqual({ id: 'rhizomorphTunnel', swarm: false, cls: 'strong' });
    // mono Capguard Halls read as Line: the Gill Nest is in the opener, and the swarm's Morel Warren is no answer
    expect(firstExtra({ line: 1 }, 'capguard')).toEqual({ id: 'veilstalkerHollow', swarm: false, cls: 'strong' });
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

  it('a won battle pays each draft it ended before as an extra spoils pick: 3 cards, no reroll, +10 rare after an elite (#17, A207)', () => {
    const picks = (row: number, node: number, round: number) => {
      const run = createRun(content, { seed: 5 });
      enter(run, row, node);
      finishBattle(content, run, ended(run, 'player', 'rout', round));
      return run.screen.kind === 'spoils' ? run.screen.picks.map((p) => [p.label, p.cards, p.freeRerolls, p.rareBonus, p.relicsOnly]) : [];
    };
    const rout = ['Spoils', 3, 1, bal.draft.rarityBiasStep, false];
    const skipped = ['Spoils', 3, 0, 0, false];
    // a Rout in round 4 never reached round 5's or 7's planning; one in round 6, round 7's; one in round 7 reached them all
    expect(picks(0, 0, 4)).toEqual([rout, skipped, skipped]);
    expect(picks(0, 0, 6)).toEqual([rout, skipped]);
    expect(picks(0, 0, 7)).toEqual([rout]);
    expect(picks(0, 0, 9)).toEqual([rout]);
    const elite = picks(2, 1, 6);
    expect(elite).toEqual([
      ['Spoils', 3, 1, bal.draft.rarityBiasStep + bal.draft.eliteRareBonus, false], ['Spoils', 3, 0, bal.draft.eliteRareBonus, false],
      ['Elite relic', 3, 0, bal.draft.eliteRareBonus, true],
    ]);
    // a loss pays none
    const run = createRun(content, { seed: 5 });
    chooseNode(content, run, 0);
    finishBattle(content, run, ended(run, 'enemy', 'rout', 4));
    expect(run.screen.kind).toBe('route');
  });

  it("the cards you drafted in a battle join the run, win or lose, and its record lists them (§8.3, T067)", () => {
    for (const winner of ['player', 'enemy'] as const) {
      const run = createRun(content, { seed: 5 });
      chooseNode(content, run, 0);
      const s = ended(run, winner, 'rout');
      s.sides.player.drafted = ['bp:gillNest', 'up:truffleCellar', 'up:truffleCellar'];
      const record = finishBattle(content, run, s);
      expect(record.drafted).toEqual(['bp:gillNest', 'up:truffleCellar', 'up:truffleCellar']);
      expect(run.kit).toEqual(['sporelingBurrow', 'capguardHall', 'truffleCellar', 'gillNest']);
      expect(run.upgrades.truffleCellar).toBe(3); // its level 2 isn't offered (#27)
      expect(run.cards.slice(0, 3)).toEqual(record.drafted.map((card) => ({ card, source: 'battle 1' })));
    }
  });

  it("a saved spoils offer or prompt naming a level that's no longer offered is dealt again, or answered with a notice (A084, #27)", () => {
    const run = createRun(content, { seed: 8 });
    chooseNode(content, run, 0);
    finishBattle(content, run, ended(run, 'player', 'rout'));
    if (run.screen.kind !== 'spoils') throw new Error('no spoils');
    run.upgrades.sporelingBurrow = 2;
    // a run saved before #27 dealt the Burrow's level 3
    run.screen.picks[0]!.offer[0] = { id: 'up:sporelingBurrow', type: 'upgrade', rarity: 'uncommon' };
    expect(recoverPendingChoice(content, run)).toMatch(/dealt again/);
    expect(run.screen.picks[0]!.offer.map((c) => c.id)).not.toContain('up:sporelingBurrow');
    expect(run.screen.picks[0]!.offer).toHaveLength(3);
    expect(recoverPendingChoice(content, run)).toBeNull();
    // a Grove graft saved with the Burrow among its tracks offers the others
    const grove = createRun(content, { seed: 8 });
    grove.path = [0, 2];
    grove.upgrades = { sporelingBurrow: 2 };
    grove.pending = [{ upgrade: { count: 1, pick: 'choose' } }];
    grove.screen = { kind: 'prompt', prompt: { title: 'Grove', text: 'Choose an upgrade track for +1 level.', options: ['sporelingBurrow', 'capguardHall', 'truffleCellar'], optionKind: 'upgrade', remaining: 1 } };
    expect(recoverPendingChoice(content, grove)).toMatch(/no level left to offer/);
    expect(grove.screen.kind === 'prompt' && grove.screen.prompt.options).toEqual(['capguardHall', 'truffleCellar']);
    expect(recoverPendingChoice(content, grove)).toBeNull();
    promptAnswer(content, grove, 'truffleCellar');
    expect(grove.upgrades.truffleCellar).toBe(1);
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
    // the Burrow's level 3 isn't offered (#27): at 1 it has one level left, at 2 none
    for (const sporeLevel of [1, 2]) {
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
    // the Burrow's level 3 isn't offered (#27), so level 2 fills its track
    run.upgrades = { sporelingBurrow: 1, capguardHall: 2, truffleCellar: 3, gillNest: 3 };
    eventChoose(content, run, 0);
    promptAnswer(content, run, 'gillNest');
    promptAnswer(content, run, 'sporelingBurrow');
    expect(run.screen.kind === 'prompt' && run.screen.prompt.options).toEqual(['capguardHall']);
    const before = hashRun(run);
    expect(() => promptAnswer(content, run, 'sporelingBurrow')).toThrow(/not an available option/);
    expect(hashRun(run)).toBe(before);
    promptAnswer(content, run, 'capguardHall');
    expect(run.cards).toHaveLength(2);
    expect(run.upgrades).toMatchObject({ sporelingBurrow: 2, capguardHall: 3 });
    expect(run.screen.kind).toBe('route');
  });

  it('recovers a persisted legacy Merchant reward after the blueprint was already traded, preserving available levels and run progress', () => {
    // the Burrow's level 3 isn't offered (#27): at 1 it has one level left, at 2 none
    for (const sporeLevel of [1, 2]) {
      const legacy = at('event', 'spore-merchant');
      // Before the fix the trade could remove Gill Nest, then save an unaffordable two-level reward.
      legacy.upgrades = { sporelingBurrow: sporeLevel, capguardHall: 3, truffleCellar: 3, gillNest: 2 };
      legacy.pending = [{ upgrade: { count: 2, pick: 'choose' } }];
      legacy.screen = { kind: 'prompt', prompt: {
        title: 'Spore Merchant', text: 'Choose an upgrade track for +1 level.',
        options: sporeLevel < 2 ? ['sporelingBurrow'] : [], optionKind: 'upgrade', remaining: 2,
      } };
      legacy.spores = 60;
      const storage = new MemoryStorage();
      saveRun(storage, legacy);
      const run = load(storage);
      const rngBefore = structuredClone(run.rng);
      const notice = recoverPendingChoice(content, run);
      expect(notice).toContain(sporeLevel === 1 ? 'only 1 of its 2 remaining levels' : 'could not restore its 2 remaining levels');
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
      if (sporeLevel === 1) {
        expect(recovered.screen.kind === 'prompt' && recovered.screen.prompt.remaining).toBe(1);
        promptAnswer(content, recovered, 'sporelingBurrow');
        expect(recovered.upgrades.sporelingBurrow).toBe(2);
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
    expect(createBattle(content, c).rules.storm.startRound).toBe(bal.sporestorm.startRound - 1);
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

  it("a save round-trip between rounds: the run at its battle and the battle at round 2's planning load back as they were (§16 R2 verification 1)", () => {
    const run = createRun(content, { seed: 9 });
    chooseNode(content, run, 0);
    const s = createBattle(content, configOf(run));
    playOn(s, (x) => x.round === 2);
    const storage = new MemoryStorage();
    saveRun(storage, run);
    saveBattle(storage, battleSave(s)!);
    const back = load(storage);
    expect(back).toEqual(run);
    const battle = resumeBattle(content, storage.get(BATTLE_KEY)!, configOf(back))!;
    expect([battle.round, battle.phase]).toEqual([2, 'planning']);
    expect(hashState(battle)).toBe(hashState(s));
  });
});

describe('whole runs (autoplay)', () => {
  it('are deterministic per seed and policies, under both planning policies (§15.2, X7)', () => {
    for (const player of ['bot:balanced', 'bot:answer']) {
      const p = { route: 'random' as const, draft: 'greedy' as const, player, power: 'auto' as const };
      const a = simulateRun(content, 7, p, { commander: 'armilla' });
      const b = simulateRun(content, 7, p, { commander: 'armilla' });
      expect(a.outcome, player).not.toBe('incomplete');
      expect(a.hashes).toEqual(b.hashes);
      expect(hashRun(a.run)).toBe(hashRun(b.run));
    }
  });

  it('a run that loses battle 1 costs a life and goes on to battle 2 (§8.5)', () => {
    const p = { route: 'random' as const, draft: 'greedy' as const, player: 'bot:balanced' };
    const lost = Array.from({ length: 30 }, (_, i) => simulateRun(content, i + 1, p, { maxBattles: 2 })).find((r) => r.battles[0]!.winner === 'enemy');
    expect(lost, 'a seed in 1–30 whose battle 1 is lost').toBeDefined();
    const [first, second] = lost!.battles;
    expect(first!.lifeLost).toBe(true);
    expect(second?.index).toBe(2);
    expect(lost!.outcome).toBe('incomplete');
  });

  it('a run played on the pool equals one played in process (§12.2, A102)', async () => {
    const jobs: RunJob[] = [
      { seed: 3, player: 'bot:balanced', commander: 'cordis', maxBattles: 2 },
      { seed: 4, player: 'bot:answer', commander: 'vesper', maxBattles: 1 },
    ];
    const pool = runJobPool('', 1);
    try {
      const pooled = await pool.run(jobs);
      expect(pooled).toEqual(await inProcessRuns(content)(jobs));
      expect(pooled.map((r) => r.battles.length)).toEqual([2, 1]);
    } finally {
      await pool.close();
    }
  }, 60_000);

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
