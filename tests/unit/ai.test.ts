// The adaptive general (SPEC §7.4–7.8, §15.7 "AI (M4)"): spawn-mix analysis, counter sets, the
// cycle's schedule, doctrine weights, drafting a missing counter, selling for space, the intel file,
// lane choice, and the Rhizome Vault / Spore Exchange caps.
import { describe, expect, it } from 'vitest';
import { choosePlacement, assessPressure } from '../../src/sim/ai/controller.ts';
import { counterTick } from '../../src/sim/ai/counter.ts';
import {
  analyzeMix, counterSets, createBattle, doctrineMult, hashState, makeConfig, queueCommand, restore, runHeadless, snapshot, step,
  topKind, zeroProfile,
} from '../../src/sim/index.ts';
import type { BattleConfig, BattleState, CounterState, IntelProfile, SimEvent } from '../../src/sim/index.ts';
import { averageProfile, battleProfile, createRun, intelDots, simulateRun, updateIntel } from '../../src/run/index.ts';
import { building, content, liveState, setBorders, steps } from '../helpers.ts';

const ADAPTIVE = { merging: true, adaptiveGeneral: true };

/** A live battle on the flat map: a human player against an adaptive general (opener skipped). */
function vsGeneral(general: string, edit?: (c: BattleConfig) => void): BattleState {
  const config = makeConfig(content, { seed: 1, mapId: 'test-flat', player: 'human', enemy: `general:${general}`, flags: ADAPTIVE });
  edit?.(config);
  const s = createBattle(content, config);
  s.phase = 'live';
  s.sides.enemy.ai!.openerDone = true;
  return s;
}

/** Player spawners in the home columns (2×2 slots at cols 0/2, rows 0/2/4/6). */
function playerMix(s: BattleState, ids: string[]) {
  return ids.map((id, i) => building(s, 'player', id, (i >> 2) * 2, (i % 4) * 2));
}

/** A counter state that saw each spawner make `spawned` units per wave and lose `merged` of them to merges. */
function track(ids: number[], spawned: number, merged: number): CounterState {
  const t: CounterState = { schedule: [], history: [], current: -1, track: {}, waveIds: [], samples: [] };
  for (const id of ids) t.track[String(id)] = { spawned: { 0: spawned, 1: spawned }, merged: { 0: merged, 1: merged } };
  return t;
}

const events = (s: BattleState, t: SimEvent['t']) => s.events.filter((e) => e.t === t);

describe('spawn-mix analysis (SPEC §7.4)', () => {
  it('synthetic mixes pick their kind: Sporelings → Swarm, Amanita → Armor, Capguard or Rootbreaker → Line', () => {
    const cases: [string[], string][] = [
      [['sporelingBurrow', 'sporelingBurrow'], 'swarm'],
      [['amanitaLodge', 'amanitaLodge'], 'armor'],
      [['capguardHall', 'capguardHall', 'sporelingBurrow'], 'line'],
      [['rootbreakerDen', 'rootbreakerDen', 'gillNest'], 'line'],
    ];
    for (const [ids, kind] of cases) {
      const s = liveState();
      playerMix(s, ids);
      expect(topKind(analyzeMix(s, 'player').scores)).toBe(kind);
    }
  });

  it('rates are count × supply / interval, split by armor', () => {
    const s = liveState();
    playerMix(s, ['sporelingBurrow', 'capguardHall']); // 2 × 1 / 16 vs 1 × 2 / 15
    const a = analyzeMix(s, 'player');
    const sp = 2 / 16, cg = 2 / 15;
    expect(a.shares.light).toBeCloseTo(sp / (sp + cg), 9);
    expect(a.scores.line).toBeCloseTo(cg / (sp + cg), 9);
    expect(a.scores.armor).toBe(0);
  });

  it('a merge-heavy swarm with a high merged fraction reads as Elite', () => {
    const s = liveState();
    s.tick = 2400;
    const bs = playerMix(s, ['sporelingBurrow', 'sporelingBurrow']);
    const a = analyzeMix(s, 'player', track(bs.map((b) => b.id), 8, 7));
    expect(a.shares.elite).toBeCloseTo(7 / 8, 9);
    expect(a.scores.elite).toBeCloseTo(1.2 * 7 / 8, 9);
    expect(a.scores.swarm).toBeCloseTo(1 - 0.5 * 7 / 8, 9);
    expect(topKind(a.scores)).toBe('elite');
  });

  it('a merge toggle left on with no actual merges is not Elite', () => {
    const s = liveState();
    s.tick = 2400;
    const bs = playerMix(s, ['sporelingBurrow', 'sporelingBurrow']);
    for (const b of bs) expect(b.mergeOn).toBe(true);
    const a = analyzeMix(s, 'player', track(bs.map((b) => b.id), 8, 0));
    expect(a.scores.elite).toBe(0);
    expect(topKind(a.scores)).toBe('swarm');
  });

  it('merged fractions count only spawners with merging on, over the last two waves', () => {
    const s = liveState();
    s.tick = 2400;
    const [a, b] = playerMix(s, ['sporelingBurrow', 'sporelingBurrow']);
    b!.mergeOn = false;
    const t = track([a!.id, b!.id], 8, 8);
    t.track[String(a!.id)]!.merged = { 0: 0, 1: 0, 5: 8 }; // wave 6's merges are outside the window
    expect(analyzeMix(s, 'player', t).shares.elite).toBe(0);
  });

  it('ties go Elite, Armor, Line, Swarm', () => {
    expect(topKind({ swarm: 0.5, line: 0.5, armor: 0.5, elite: 0.5 })).toBe('elite');
    expect(topKind({ swarm: 0.5, line: 0.5, armor: 0.5, elite: 0 })).toBe('armor');
    expect(topKind({ swarm: 0.5, line: 0.5, armor: 0, elite: 0 })).toBe('line');
  });

  it('counter sets hold spawners by their unit; towers, economy, utility and healers are in none', () => {
    const s = liveState();
    const sets = counterSets(s.library, content.factions['gray-rot']!.buildings);
    expect(sets.swarm).toEqual(['sporelingBurrow', 'capguardHall', 'scythecapGrove', 'amanitaLodge']);
    expect(sets.line).toEqual(['gillNest', 'veilstalkerHollow', 'morelWarren']);
    expect(sets.armor).toEqual(['rootbreakerDen', 'hammercapForge']);
    expect(sets.elite).toEqual(['veilstalkerHollow']);
    for (const id of ['puffballMortar', 'truffleCellar', 'tendersRing', 'rhizomeVault', 'sporeExchange']) {
      expect(Object.values(sets).flat()).not.toContain(id);
    }
  });
});

describe('the counter cycle (SPEC §7.4)', () => {
  const ticksOf = (general: string, until: number) => {
    const s = createBattle(content, makeConfig(content, { seed: 4, player: 'bot:mono:sporelingBurrow', enemy: `general:${general}`, flags: ADAPTIVE }));
    const warned: [number, number][] = [], active: number[] = [];
    runHeadless(s, {
      until, onTick: (st) => {
        for (const e of st.events) {
          if (e.t === 'counterWarned' && e.side === 'enemy') warned.push([st.tick, e.activatesAtTick]);
          if (e.t === 'counterActive' && e.side === 'enemy') active.push(st.tick);
        }
      },
    });
    return { warned, active, state: s };
  };

  it('warnings at 2:00 and 5:00, activations at 4:00 and 7:00', () => {
    const { warned, active, state } = ticksOf('mother-mold', 8400);
    expect(warned).toEqual([[2400, 4800], [6000, 8400]]);
    expect(active).toEqual([4800, 8400]);
    expect(state.sides.enemy.ai!.counter!.history.map((c) => c.kind)).toEqual(['swarm', 'swarm']);
  });

  it('the boss adds an early cycle: analysis at 1:00, active at 3:00', () => {
    const { warned, active } = ticksOf('pale-sovereign', 4800);
    expect(warned.slice(0, 2)).toEqual([[1200, 3600], [2400, 4800]]);
    expect(active).toEqual([3600, 4800]);
  });

  it('without the adaptive flag (or for the scripted general) there is no cycle', () => {
    const off = createBattle(content, makeConfig(content, { seed: 4, player: 'bot:balanced', enemy: 'general:mother-mold', flags: { merging: true, adaptiveGeneral: false } }));
    expect(off.sides.enemy.ai!.counter).toBeUndefined();
    const scripted = createBattle(content, makeConfig(content, { seed: 4, player: 'bot:balanced', enemy: 'general:scripted', flags: ADAPTIVE }));
    expect(scripted.sides.enemy.ai!.counter).toBeUndefined();
  });

  it('doctrine weights: ×3 on the active counter set, ×0.6 on everything else', () => {
    const s = vsGeneral('lichen-baron');
    const ai = s.sides.enemy.ai!;
    expect(doctrineMult(s, ai, 'hammercapForge')).toBe(1);
    ai.counter!.history.push({ kind: 'armor', warnedAt: 0, activeAt: 0, active: true, scores: zeroProfile(), sold: [], built: {} });
    ai.counter!.current = 0;
    expect(doctrineMult(s, ai, 'hammercapForge')).toBe(3);
    expect(doctrineMult(s, ai, 'rootbreakerDen')).toBe(3);
    expect(doctrineMult(s, ai, 'capguardHall')).toBeCloseTo(0.6, 9);
    expect(doctrineMult(s, ai, 'puffballMortar')).toBeCloseTo(0.6, 9);
  });

  it('drafts the cheapest counter blueprint from its roster when the warning fires and its kit has none', () => {
    const s = vsGeneral('lichen-baron', (c) => { c.enemy.kit = ['capguardHall', 'truffleCellar']; });
    playerMix(s, ['amanitaLodge', 'amanitaLodge']);
    s.tick = 2400;
    counterTick(s, 'enemy');
    expect(events(s, 'counterWarned')).toEqual([{ t: 'counterWarned', side: 'enemy', kind: 'armor', activatesAtTick: 4800 }]);
    const ai = s.sides.enemy.ai!;
    expect(ai.counter!.history[0]!.drafted).toBe('hammercapForge'); // 170 < Rootbreaker Den's 200
    expect(s.sides.enemy.kit).toContain('hammercapForge');
    expect(s.compiled.enemy.buildings.hammercapForge).toBeDefined();
    // it keeps its doctrine weight (the Baron's Hammercap 2) and would get 1 if it had none
    expect(ai.weights.find((w) => w.building === 'hammercapForge')!.weight).toBe(content.generals['lichen-baron']!.weights.hammercapForge);
    expect(s.sides.enemy.gold).toBe(s.config.enemy.startingGold); // drafting costs nothing and grants nothing
  });

  it('sells for space at activation: worst matrix multiplier against the dominant armor, rearmost first', () => {
    const s = vsGeneral('lichen-baron');
    playerMix(s, ['amanitaLodge']); // Heavy: slash ×0.5, pierce ×0.75
    const placed: [string, number, number][] = [
      ['capguardHall', 28, 0], ['sporelingBurrow', 28, 2], ['gillNest', 28, 4], ['truffleCellar', 28, 6],
      ['hammercapForge', 30, 0], ['capguardHall', 30, 2], ['gillNest', 30, 4],
    ];
    const bs = placed.map(([id, col, row]) => building(s, 'enemy', id, col, row));
    s.tick = 4800;
    const ai = s.sides.enemy.ai!;
    ai.counter!.schedule = [];
    ai.counter!.history.push({ kind: 'armor', warnedAt: 2400, activeAt: 4800, active: false, scores: zeroProfile(), sold: [], built: {} });
    counterTick(s, 'enemy');
    expect(events(s, 'counterActive')).toHaveLength(1);
    // one free slot left (30, 6): sell one, the rearmost slash spawner outside the Anti-Armor set
    const sells = s.queue.filter((c) => c.type === 'sell');
    expect(sells).toHaveLength(1);
    expect(sells[0]).toMatchObject({ side: 'enemy', tick: 4801, entityId: bs[5]!.id });
    expect(ai.counter!.history[0]!.sold).toEqual(['capguardHall']);
  });

  it('does not sell with two free slots', () => {
    const s = vsGeneral('lichen-baron');
    playerMix(s, ['amanitaLodge']);
    building(s, 'enemy', 'capguardHall', 30, 2);
    s.tick = 4800;
    const ai = s.sides.enemy.ai!;
    ai.counter!.schedule = [];
    ai.counter!.history.push({ kind: 'armor', warnedAt: 2400, activeAt: 4800, active: false, scores: zeroProfile(), sold: [], built: {} });
    counterTick(s, 'enemy');
    expect(s.queue.filter((c) => c.type === 'sell')).toHaveLength(0);
  });

  it('is deterministic and survives a snapshot round trip mid-battle', () => {
    const make = () => createBattle(content, makeConfig(content, { seed: 9, player: 'bot:mono:capguardHall', enemy: 'general:mother-mold', flags: ADAPTIVE }));
    const a = make(), b = make();
    runHeadless(a, { until: 5000 });
    runHeadless(b, { until: 5000 });
    expect(hashState(a)).toBe(hashState(b));
    const c = restore(snapshot(a));
    runHeadless(a, { until: 'end' });
    runHeadless(c, { until: 'end' });
    expect(hashState(c)).toBe(hashState(a));
    expect(a.sides.enemy.ai!.counter!.history.length).toBeGreaterThan(0);
  });
});

describe('intel (SPEC §7.6)', () => {
  const p = (swarm: number, line: number, armor: number, elite: number): IntelProfile => ({ swarm, line, armor, elite });

  it('the update rule: the first battle sets it, then ½ intel + ½ profile', () => {
    const first = updateIntel(undefined, p(1, 0, 0, 0), 0.5);
    expect(first).toEqual(p(1, 0, 0, 0));
    expect(updateIntel(first, p(0, 1, 0, 0.4), 0.5)).toEqual(p(0.5, 0.5, 0, 0.2));
    const avg = averageProfile([p(1, 0, 0, 0), p(0, 1, 0, 0), p(0, 0, 1, 0.3)])!;
    for (const [k, v] of Object.entries(p(1 / 3, 1 / 3, 1 / 3, 0.1))) expect(avg[k as keyof IntelProfile]).toBeCloseTo(v, 12);
    expect(averageProfile([])).toBeNull();
    expect(intelDots(p(1, 0.5, 0.1, 1.3))).toEqual(p(4, 2, 0, 4));
  });

  it('opening doctrine: intel\'s top kind at ×2 / ×0.8, until the first counter activates', () => {
    const s = vsGeneral('mother-mold', (c) => { c.enemy.intel = p(0.2, 0.7, 0.1, 0); });
    const ai = s.sides.enemy.ai!;
    expect(ai.opening).toEqual({ kinds: ['line'], mult: 2, otherMult: 0.8, dual: false });
    expect(doctrineMult(s, ai, 'gillNest')).toBe(2);
    expect(doctrineMult(s, ai, 'sporelingBurrow')).toBeCloseTo(0.8, 9);
    ai.counter!.history.push({ kind: 'swarm', warnedAt: 0, activeAt: 0, active: true, scores: zeroProfile(), sold: [], built: {} });
    ai.counter!.current = 0;
    expect(doctrineMult(s, ai, 'sporelingBurrow')).toBe(3);
    expect(doctrineMult(s, ai, 'gillNest')).toBeCloseTo(0.6, 9);
  });

  it('dual doctrine: the boss leans ×2.5 into the top two kinds for the whole battle, on top of its counters', () => {
    const s = vsGeneral('pale-sovereign', (c) => { c.enemy.intel = p(0.6, 0.1, 0.3, 0); });
    const ai = s.sides.enemy.ai!;
    expect(ai.opening).toEqual({ kinds: ['swarm', 'armor'], mult: 2.5, otherMult: 1, dual: true });
    expect(doctrineMult(s, ai, 'capguardHall')).toBe(2.5); // swarm set
    expect(doctrineMult(s, ai, 'hammercapForge')).toBe(2.5); // armor set
    expect(doctrineMult(s, ai, 'amanitaLodge')).toBe(2.5); // in a set once, not squared
    expect(doctrineMult(s, ai, 'gillNest')).toBe(1);
    ai.counter!.history.push({ kind: 'line', warnedAt: 0, activeAt: 0, active: true, scores: zeroProfile(), sold: [], built: {} });
    ai.counter!.current = 0;
    expect(doctrineMult(s, ai, 'gillNest')).toBe(3);
    expect(doctrineMult(s, ai, 'capguardHall')).toBeCloseTo(0.6 * 2.5, 9);
  });

  it('an empty intel file gives no opening doctrine', () => {
    expect(vsGeneral('mother-mold', (c) => { c.enemy.intel = zeroProfile(); }).sides.enemy.ai!.opening).toBeUndefined();
  });

  it('across a run: a mono-Sporeling player is read as Swarm and the next general opens against it', () => {
    const r = simulateRun(content, 3, { route: 'battles', draft: 'greedy', player: 'bot:mono:sporelingBurrow' }, { maxBattles: 1 });
    const b1 = r.battles[0]!;
    expect(b1.profile).toBeDefined();
    expect(topKind(b1.profile!)).toBe('swarm');
    expect(r.run.intel).toEqual(b1.profile);
    expect(r.run.profiles).toEqual([b1.profile]);
    // the profile is the mean of the readable samples at 2:00, 5:00 and the end
    expect(b1.counters!.length).toBeGreaterThan(0);
  });

  it('battleProfile is null when the enemy did not adapt', () => {
    const s = createBattle(content, makeConfig(content, { seed: 1, player: 'bot:balanced', enemy: 'general:scripted' }));
    queueCommand(s, { tick: 0, side: 'player', type: 'begin' });
    runHeadless(s, { until: 3000 });
    expect(battleProfile(s)).toBeNull();
    expect(createRun(content, { seed: 1 }).intel).toBeUndefined();
  });
});

describe('lane choice (SPEC §7.3)', () => {
  it('the Blightwright sends spawners to the lane where the player holds least; defensive generals do not filter', () => {
    for (const [general, expectLane] of [['blightwright', 1], ['lichen-baron', null]] as const) {
      const config = makeConfig(content, { seed: 1, mapId: 'twin-roots', player: 'human', enemy: `general:${general}`, flags: ADAPTIVE });
      const s = createBattle(content, config);
      s.phase = 'live';
      setBorders(s, 12, 27, 0); // the player holds 13 columns in lane 0
      setBorders(s, 5, 27, 1); // and 6 in lane 1
      const choice = choosePlacement(s, 'enemy', 'gillNest', [], assessPressure(s, 'enemy'));
      if (expectLane !== null) expect(choice!.lane).toBe(expectLane);
      else expect(choice).not.toBeNull();
    }
  });
});

describe('Rhizome Vault and Spore Exchange (SPEC §11.2)', () => {
  it('each Vault adds 6 supply cap while it stands, at most two count', () => {
    const s = liveState();
    const cap = s.sides.player.supplyCap;
    const v = [0, 2, 4].map((row) => building(s, 'player', 'rhizomeVault', 0, row));
    expect(s.sides.player.supplyCap).toBe(cap + 12);
    v[0]!.hp = 0;
    steps(s, 1);
    expect(s.sides.player.supplyCap).toBe(cap + 12); // the third Vault now counts
    v[1]!.hp = 0;
    steps(s, 1);
    expect(s.sides.player.supplyCap).toBe(cap + 6);
    queueCommand(s, { tick: s.tick + 1, side: 'player', type: 'sell', entityId: v[2]!.id });
    step(s);
    expect(s.sides.player.supplyCap).toBe(cap);
  });

  it('a Spore Exchange pays 1 gold per income tick and raises the interest cap by 10', () => {
    const s = liveState();
    s.rules.test.turrets = false;
    building(s, 'player', 'sporeExchange', 0, 0);
    s.sides.player.gold = 1000;
    steps(s, s.rules.waveTicks);
    // stipend 8 + 1 per income tick over the wave, then interest capped at 10 + 10
    const ticks = s.rules.waveTicks / s.rules.incomeTicks;
    expect(s.stats.player.goldEarned.economy).toBe(ticks);
    expect(s.stats.player.goldEarned.interest).toBe(20);
  });
});
