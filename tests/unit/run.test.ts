import { describe, expect, it } from 'vitest';
import {
  MemoryStorage, battleRewards, battleSave, chooseNode, createRun, eventChoose, finishBattle, groveChoose, hashRun, loadRun,
  mapPool, outcomeAvailable, promptAnswer, resumeBattle, saveRun, simulateRun, spoilsPick, spoilsReroll,
} from '../../src/run/index.ts';
import type { RunState } from '../../src/run/index.ts';
import { createBattle, hashState, legalPlacements, queueCommand, runHeadless, step } from '../../src/sim/index.ts';
import type { BattleConfig, BattleState, Side } from '../../src/sim/index.ts';
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

/** A battle state from the run's current battle config, ended with the given result. */
function ended(run: RunState, winner: Side, by: 'rout' | 'decision', playerHp: number): BattleState {
  if (run.screen.kind !== 'battle') throw new Error('not in battle');
  const s = createBattle(content, run.screen.config);
  s.phase = 'ended';
  s.tick = 7000;
  s.outcome = { winner, by, tick: s.tick };
  s.sides.player.heartcapHp = playerHp;
  return s;
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
          if (n.map) expect(n.general).toBe('scripted');
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
});

describe('battle setup and rewards (SPEC §6.1, §6.5, §8.5–8.6)', () => {
  it('battle configs scale with the battle index; the boss has 3600 HP; elites carry their modifier', () => {
    const run = createRun(content, { seed: 3 });
    chooseNode(content, run, 0);
    const c1 = configOf(run);
    expect(c1.battleIndex).toBe(1);
    expect(c1.player.startingGold).toBe(bal.startingGold);
    expect(c1.enemy.heartcapHp).toBe(bal.heartcapEnemyHp.base);
    expect(c1.player.kit).toEqual(['sporelingBurrow', 'capguardHall', 'truffleCellar']);
    expect(c1.flags.drafts).toBe(true);
    run.battles.push({ ...({} as RunState['battles'][number]), index: 1 }, { ...({} as RunState['battles'][number]), index: 2 });
    enter(run, 4, 1); // row 5 elite, battle 3
    const c3 = configOf(run);
    expect(c3.battleIndex).toBe(3);
    expect(c3.player.startingGold).toBe(bal.startingGold + 2 * bal.startingGoldPerBattle);
    expect(c3.enemy.heartcapHp).toBe(bal.heartcapEnemyHp.base + 2 * bal.heartcapEnemyHp.perBattle);
    const elite = run.route[4]![1]!.elite!;
    if (elite === 'veteran') expect(Object.values(c3.enemy.upgrades!).every((v) => v === 1)).toBe(true);
    else expect(c3.modifiers![0]!.source).toBe(`elite:${elite}`);
    enter(run, 5, 0);
    expect(configOf(run).enemy.heartcapHp).toBe(bal.heartcapEnemyHp.boss);
  });

  it('the reward table', () => {
    const r = { routRepair: 0.1, decisionLossDamage: 0.25, rarityBiasStep: 10, eliteRareBonus: 10 };
    expect(battleRewards('battle', 'player', 'rout', r)).toMatchObject({ spores: 20, heartcapPct: 0.1, spoils: [{ cards: 3, freeRerolls: 1, rareBonus: 10 }] });
    expect(battleRewards('battle', 'player', 'decision', r)).toMatchObject({ spores: 10, heartcapPct: 0, spoils: [{ cards: 2, freeRerolls: 0 }] });
    const e = battleRewards('elite', 'player', 'rout', r);
    expect(e.spores).toBe(35);
    expect(e.amberChance).toBe(0.25);
    expect(e.spoils.map((s) => [s.relicsOnly, s.rareBonus])).toEqual([[false, 20], [true, 10]]);
    expect(battleRewards('boss', 'player', 'decision', r)).toMatchObject({ spores: 60, amber: 2, spoils: [] });
    expect(battleRewards('battle', 'enemy', 'decision', r)).toMatchObject({ spores: 0, heartcapPct: -0.25 });
    expect(battleRewards('battle', 'enemy', 'rout', r)).toMatchObject({ heartcapZero: true });
  });

  it('Heartcap carryover: Rout win +10%, Decision loss −25% (run continues), Rout loss ends the run', () => {
    let run = createRun(content, { seed: 5 });
    chooseNode(content, run, 0);
    finishBattle(content, run, ended(run, 'player', 'rout', 2000));
    expect(run.heartcap.hp).toBe(2000 + 300);
    expect(run.spores).toBe(20);
    expect(run.xp).toBe(20 + 25);
    expect(run.screen.kind).toBe('spoils');
    if (run.screen.kind === 'spoils') {
      const before = run.screen.picks[0]!.offer;
      expect(before).toHaveLength(3);
      spoilsReroll(content, run);
      expect(() => spoilsReroll(content, run)).toThrow(/no rerolls/);
      const card = (run.screen as { picks: { offer: { id: string }[] }[] }).picks[0]!.offer[0]!.id;
      spoilsPick(content, run, card);
      expect(run.cards.at(-1)).toEqual({ card, source: 'spoils 1' });
    }
    expect(run.screen.kind).toBe('route');

    run = createRun(content, { seed: 5 });
    chooseNode(content, run, 0);
    finishBattle(content, run, ended(run, 'enemy', 'decision', 2000));
    expect(run.heartcap.hp).toBe(2000 - 750);
    expect(run.screen.kind).toBe('route');
    expect(run.outcome).toBeUndefined();

    run = createRun(content, { seed: 5 });
    chooseNode(content, run, 0);
    finishBattle(content, run, ended(run, 'enemy', 'decision', 500));
    expect(run.heartcap.hp).toBe(0);
    expect(run.outcome).toBe('defeat');

    run = createRun(content, { seed: 5 });
    chooseNode(content, run, 0);
    finishBattle(content, run, ended(run, 'enemy', 'rout', 0));
    expect(run.outcome).toBe('defeat');
    expect(run.screen.kind).toBe('summary');
  });

  it('a boss win ends the run in victory; a boss loss of any kind in defeat', () => {
    let run = createRun(content, { seed: 6 });
    enter(run, 5, 0);
    finishBattle(content, run, ended(run, 'player', 'decision', 1000));
    expect([run.outcome, run.spores, run.amber]).toEqual(['victory', 60, 2]);
    run = createRun(content, { seed: 6 });
    enter(run, 5, 0);
    finishBattle(content, run, ended(run, 'enemy', 'decision', 3000));
    expect(run.outcome).toBe('defeat');
  });
});

describe('Grove and events (SPEC §8.7)', () => {
  const at = (kind: 'grove' | 'event', event?: string): RunState => {
    const run = createRun(content, { seed: 2 });
    run.path = [0, kind === 'grove' ? 2 : 1];
    run.screen = kind === 'grove' ? { kind: 'grove' } : { kind: 'event', event: event! };
    return run;
  };

  it('Grove: repair 30% (capped) or graft +1 level through a prompt', () => {
    let run = at('grove');
    run.heartcap.hp = 1000;
    groveChoose(content, run, 'repair');
    expect(run.heartcap.hp).toBe(1900);
    expect(run.screen.kind).toBe('route');
    run = at('grove');
    groveChoose(content, run, 'graft');
    expect(run.screen.kind).toBe('prompt');
    promptAnswer(content, run, 'capguardHall');
    expect(run.upgrades).toEqual({ capguardHall: 1 });
    expect(run.screen.kind).toBe('route');
  });

  it('Fallen Oak: a rare relic for 15% of max HP', () => {
    const run = at('event', 'fallen-oak');
    eventChoose(content, run, 0);
    expect(run.relics).toHaveLength(1);
    expect(content.relics[run.relics[0]!]!.rarity).toBe('rare');
    expect(run.heartcap.max).toBe(Math.round(3000 * 0.85));
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

  it('Hungry Roots: a relic for two one rarity lower; Mold Bloom shapes the next battle', () => {
    let run = at('event', 'hungry-roots');
    run.relics = ['sporeCloud'];
    eventChoose(content, run, 0);
    promptAnswer(content, run, 'sporeCloud');
    expect(run.relics).toHaveLength(2);
    for (const r of run.relics) expect(content.relics[r]!.rarity).toBe('uncommon');
    run = at('event', 'mold-bloom');
    eventChoose(content, run, 0);
    expect(run.next).toEqual({ startingGold: 150, sporestormShiftSeconds: -60 });
    run.path = [0];
    chooseNode(content, run, 0);
    const c = configOf(run);
    expect(c.player.startingGold).toBe(bal.startingGold + 150);
    const s = createBattle(content, c);
    expect(s.rules.storm.startTick).toBe((bal.sporestorm.startSeconds - 60) * 20);
  });
});

describe('save and resume (SPEC §8.9)', () => {
  it('the run state round-trips through storage at a node boundary', () => {
    const r = simulateRun(content, 11, { route: 'random', draft: 'greedy', player: 'bot:balanced' }, { maxBattles: 2 });
    const storage = new MemoryStorage();
    saveRun(storage, r.run);
    const back = loadRun(storage)!;
    expect(back).toEqual(r.run);
    expect(hashRun(back)).toBe(hashRun(r.run));
    storage.set('spore-sprawl.run.v1', JSON.stringify({ ...r.run, v: 99 }));
    expect(loadRun(storage)).toBeNull();
  });

  it('a mid-battle save resumes to the same state hash (re-simulated from the command log)', () => {
    const run = createRun(content, { seed: 8 });
    chooseNode(content, run, 0);
    const config = configOf(run);
    const live = createBattle(content, config);
    // the human places an opener, begins, builds more later and answers the first draft
    const spot = legalPlacements(live, 'player', 'sporelingBurrow')[0]!;
    queueCommand(live, { tick: 0, side: 'player', type: 'place', buildingId: 'sporelingBurrow', lane: spot.lane, col: spot.col, row: spot.row });
    step(live);
    queueCommand(live, { tick: 0, side: 'player', type: 'begin' });
    step(live);
    runHeadless(live, { until: 1500 });
    const s2 = legalPlacements(live, 'player', 'capguardHall')[0]!;
    queueCommand(live, { tick: live.tick + 1, side: 'player', type: 'place', buildingId: 'capguardHall', lane: s2.lane, col: s2.col, row: s2.row });
    runHeadless(live, { until: 2400 });
    expect(live.held).toBe(true);
    queueCommand(live, { tick: live.tick + 1, side: 'player', type: 'draftPick', cardId: live.sides.player.draft!.offer[1]!.id });
    step(live);
    runHeadless(live, { until: 3000 });
    const save = JSON.parse(JSON.stringify(battleSave(live)));
    const resumed = resumeBattle(content, save);
    expect(hashState(resumed)).toBe(hashState(live));
    // and both continue identically
    runHeadless(live, { until: 3600 });
    runHeadless(resumed, { until: 3600 });
    expect(hashState(resumed)).toBe(hashState(live));
  });

  it('a save taken while a draft is open (and one answered on that tick) resumes exactly', () => {
    const run = createRun(content, { seed: 9 });
    chooseNode(content, run, 0);
    const config = configOf(run);
    const live = createBattle(content, config);
    queueCommand(live, { tick: 0, side: 'player', type: 'begin' });
    runHeadless(live, { until: 2400 });
    expect(resumeBattle(content, JSON.parse(JSON.stringify(battleSave(live)))).held).toBe(true);
    queueCommand(live, { tick: live.tick + 1, side: 'player', type: 'draftSkip' });
    step(live);
    expect(hashState(resumeBattle(content, JSON.parse(JSON.stringify(battleSave(live)))))).toBe(hashState(live));
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
});
