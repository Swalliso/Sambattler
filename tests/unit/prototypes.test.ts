// Balance-backlog prototypes (docs/balance-backlog.md): each knob is absent from data/balance.json,
// so the shipped rules are unchanged; with the knob set, the prototype behaves as described. The
// `proto` spec (tools `--proto`, browser `?proto=`) applies presets and overrides to balance.json.
import { describe, expect, it } from 'vitest';
import { counterFloor, counterTick } from '../../src/sim/ai/counter.ts';
import { applyProtoToBalance, PROTO_PRESETS } from '../../src/data/proto.ts';
import { createBattle, hashState, makeConfig, queueCommand, rallyX, runHeadless, step, zeroProfile } from '../../src/sim/index.ts';
import type { BattleState } from '../../src/sim/index.ts';
import { protoContent } from '../../tools/lib/content.ts';
import { building, content, liveState, steps, unit } from '../helpers.ts';

const RUSH = { units: ['sporeling'], speedMult: 3, ticks: 30, cooldownTicks: 160 };

describe('prototype knobs are off by default', () => {
  it('balance.json sets none of them, so compiled rules carry none', () => {
    const b = content.balance;
    expect(b.approachRush).toBeUndefined();
    expect(b.firingCongestion).toBeUndefined();
    expect(b.unitLifespan).toBeUndefined();
    expect(b.ai.counter.counterFloorWeight).toBeUndefined();
    const s = liveState();
    expect(s.rules.rush).toBeUndefined();
    expect(s.rules.congestion).toBeUndefined();
    expect(s.rules.lifespan).toBeUndefined();
    expect(s.rules.ai.counter.floorWeight).toBeUndefined();
    expect(unit(s, 'player', 'sporeling', 5, 1)).not.toHaveProperty('expiresTick');
  });

  it('the proto spec applies presets and path:value overrides in order, and compiles to rules', () => {
    const { balance, problems } = applyProtoToBalance(content.balance, 'b1,approachRush.speedMult:4,besiegedBy:melee,nope');
    expect(problems).toEqual([expect.stringContaining('unknown preset "nope"')]);
    expect(balance.approachRush).toEqual({ ...PROTO_PRESETS.b1!.approachRush as object, speedMult: 4 });
    expect(balance.besiegedBy).toBe('melee');
    expect(content.balance.approachRush).toBeUndefined(); // a copy, not the shared content
    const lists = applyProtoToBalance(content.balance, 'b1,approachRush.units:["sporeling","morelRunner"]').balance;
    expect((lists.approachRush as { units: string[] }).units).toEqual(['sporeling', 'morelRunner']);

    const c = protoContent('b1,b3,b4,a2,a3');
    const s = createBattle(c, makeConfig(c, { seed: 1, mapId: 'test-flat', player: 'human', enemy: 'human' }));
    expect(s.rules.rush).toEqual({ units: ['sporeling'], speedMult: 3, ticks: 30, cooldownTicks: 160 });
    expect(s.rules.congestion).toEqual({ freeRanks: 2, halfWidth: 0.6, mult: 0.5 });
    expect(s.rules.lifespan).toEqual({ ticks: 1800, tierMult: 1 });
    expect(s.rules.ai.counter.floorWeight).toBe(1);
    expect(s.rules.ai.counter.cycles[0]).toEqual({ analyzeTick: 1800, activeTick: 4200 });
  });
});

describe('B1 approach rush (balance approachRush)', () => {
  /** A Sporeling 3.5 tiles from an archer that cannot move or shoot; x after `n` ticks. */
  function approach(rush: typeof RUSH | undefined, n: number, target = 'gillArcher'): { s: BattleState; x: number } {
    const s = liveState({ test: { noTurrets: true, noTerritory: true, noHeartcapTargets: true } });
    if (rush) s.rules.rush = rush;
    const u = unit(s, 'player', 'sporeling', 10, 2);
    if (target === 'building') building(s, 'enemy', 'capguardHall', 14, 1);
    else { const a = unit(s, 'enemy', target, 14, 2); a.cooldown = 1e9; s.compiled.enemy.units[target]!.tiers[0].speedPerTick = 0; }
    steps(s, n);
    return { s, x: u.x };
  }

  it('a Sporeling closing on an enemy unit sprints at speedMult, then walks', () => {
    const walk = approach(undefined, 10).x - 10;
    const rush = approach(RUSH, 10).x - 10;
    expect(walk).toBeCloseTo(10 * 1.5 / 20, 5);
    expect(rush).toBeGreaterThan(2.5 * walk); // ×3 for the ticks after it acquired the archer
  });

  it('the rush lasts its ticks, then cools down before the next one', () => {
    const { s } = approach(RUSH, 2);
    const u = s.units.find((x) => x.unitId === 'sporeling')!;
    expect(u.rushUntil).toBe(u.rushReady! - RUSH.cooldownTicks);
    expect(u.rushUntil! - s.tick).toBeLessThanOrEqual(RUSH.ticks);
  });

  it('only listed units rush, and only at enemy units (not buildings)', () => {
    expect(approach({ ...RUSH, units: ['capguard'] }, 10).x).toBeCloseTo(approach(undefined, 10).x, 9);
    expect(approach(RUSH, 10, 'building').x).toBeCloseTo(approach(undefined, 10, 'building').x, 9);
  });
});

describe('B3 firing congestion (balance firingCongestion)', () => {
  /** Three archers in a file, all shooting one target; the attacker-side damage of each one's shot. */
  function volley(on: boolean): Record<number, number> {
    const s = liveState({ test: { noTurrets: true, noTerritory: true, noHeartcapTargets: true } });
    if (on) s.rules.congestion = { freeRanks: 2, halfWidth: 0.6, mult: 0.5 };
    const front = unit(s, 'player', 'gillArcher', 12, 2);
    const mid = unit(s, 'player', 'gillArcher', 11, 2);
    const rear = unit(s, 'player', 'gillArcher', 10, 2);
    const t = unit(s, 'enemy', 'capguard', 15.5, 2);
    for (const u of [front, mid, rear]) u.targetId = t.id;
    s.compiled.enemy.units.capguard!.tiers[0].speedPerTick = 0;
    s.compiled.player.units.gillArcher!.tiers[0].speedPerTick = 0;
    step(s);
    return Object.fromEntries(s.hits.map((h) => [h.sourceId === front.id ? 0 : h.sourceId === mid.id ? 1 : 2, h.damage]));
  }

  it('a shot behind two friendly archers in its line of fire deals blockedDamageMult; the front ranks fire freely', () => {
    const off = volley(false), on = volley(true);
    expect(off[0]).toBe(14);
    expect(off[2]).toBe(14);
    expect(on[0]).toBe(14);
    expect(on[1]).toBe(14); // one archer in front: under freeRanks
    expect(on[2]).toBe(7);
  });
});

describe('B4 unit lifespan (balance unitLifespan)', () => {
  it('units wither at their lifespan; a merged unit starts a fresh one, × tierMult per tier', () => {
    const s = liveState({ test: { noTurrets: true, noTerritory: true, noHeartcapTargets: true } });
    s.rules.lifespan = { ticks: 40, tierMult: 1.5 };
    const a = unit(s, 'player', 'capguard', 2, 1);
    const b = unit(s, 'player', 'capguard', 2, 5, 2);
    expect(a.expiresTick).toBe(s.tick + 40);
    expect(b.expiresTick).toBe(s.tick + 60);
    steps(s, 39);
    expect(s.units).toContain(a);
    step(s);
    expect(s.units).not.toContain(a);
    expect(s.events).toContainEqual(expect.objectContaining({ t: 'died', id: a.id }));
    steps(s, 20);
    expect(s.units).not.toContain(b);
  });
});

describe('A2 counter floor weight (balance ai.counter.counterFloorWeight)', () => {
  function baronCountering(floor: number | undefined): BattleState {
    const s = createBattle(content, makeConfig(content, {
      seed: 1, mapId: 'test-flat', player: 'human', enemy: 'general:lichen-baron', flags: { merging: true, adaptiveGeneral: true },
    }));
    s.phase = 'live';
    if (floor) s.rules.ai.counter.floorWeight = floor;
    const ai = s.sides.enemy.ai!;
    ai.openerDone = true;
    ai.counter!.schedule = [];
    ai.counter!.history.push({ kind: 'elite', warnedAt: 0, activeAt: 1, active: false, scores: zeroProfile(), sold: [], built: {} });
    s.tick = 1;
    counterTick(s, 'enemy');
    return s;
  }

  it('lets a general field counter-set buildings outside its weights while the counter is active', () => {
    const off = baronCountering(undefined);
    expect(off.sides.enemy.ai!.weights.some((w) => w.building === 'veilstalkerHollow')).toBe(false);
    expect(counterFloor(off, off.sides.enemy.ai!, 'veilstalkerHollow')).toBe(0);

    const on = baronCountering(1);
    const ai = on.sides.enemy.ai!;
    expect(ai.weights.find((w) => w.building === 'veilstalkerHollow')).toMatchObject({ weight: 0 });
    expect(counterFloor(on, ai, 'veilstalkerHollow')).toBe(1);
    expect(counterFloor(on, ai, 'capguardHall')).toBe(0); // outside the Anti-Elite set
    on.sides.enemy.gold = 5000;
    runHeadless(on, { until: 2400 });
    expect(on.buildings.some((b) => b.side === 'enemy' && b.buildingId === 'veilstalkerHollow')).toBe(true);
  });
});

describe('A3 earlier first cycle (balance ai.counter.cycles)', () => {
  it('a 1:30 → 3:30 first cycle warns at tick 1800 and activates at 4200', () => {
    const c = protoContent('a3');
    const s = createBattle(c, makeConfig(c, { seed: 4, player: 'bot:mono:sporelingBurrow', enemy: 'general:mother-mold', flags: { merging: true, adaptiveGeneral: true } }));
    runHeadless(s, { until: 4300 });
    const h = s.sides.enemy.ai!.counter!.history[0]!;
    expect([h.warnedAt, h.activeAt, h.active]).toEqual([1800, 4200, true]);
  });
});

describe('E1 lane stance (balance laneStance)', () => {
  const STANCE = { rallyBack: 1.5, maxHoldTicks: 600, cooldownTicks: 200 };

  /** A live flat-map battle with the stance rules switched on by hand (both sides advancing). */
  function stanceState(rules: typeof STANCE = STANCE): BattleState {
    const s = liveState({ test: { noTurrets: true, noTerritory: true, noHeartcapTargets: true }, borders: [5, 26] });
    s.rules.stance = { ...rules };
    for (const side of ['player', 'enemy'] as const) s.sides[side].stance = [{ hold: false, since: 0, readyAt: 0 }];
    return s;
  }
  const order = (s: BattleState, hold: boolean, side: 'player' | 'enemy' = 'player') =>
    queueCommand(s, { tick: s.tick + 1, side, type: 'stance', lane: 0, hold });

  it('is off by default: no rules, no lane state, and the command is refused', () => {
    expect(content.balance.laneStance).toBeUndefined();
    const s = liveState();
    expect(s.rules.stance).toBeUndefined();
    expect(s.sides.player).not.toHaveProperty('stance');
    order(s, true);
    step(s);
    expect(s.events).toContainEqual(expect.objectContaining({ t: 'commandRejected', reason: 'stance is not available in this milestone' }));
  });

  it('the hold preset compiles to ticks and gives every side a stance per lane', () => {
    const c = protoContent('hold');
    const s = createBattle(c, makeConfig(c, { seed: 1, mapId: 'twin-roots', player: 'human', enemy: 'human' }));
    expect(s.rules.stance).toEqual({ ...STANCE, ai: { musterSupply: 12, spentSupply: 4 } });
    expect(s.sides.player.stance).toEqual([{ hold: false, since: 0, readyAt: 0 }, { hold: false, since: 0, readyAt: 0 }]);
  });

  it('held idle units gather at the rally line behind the border column; Advance releases them', () => {
    const s = stanceState();
    const u = unit(s, 'player', 'capguard', 10, 3);
    order(s, true);
    steps(s, 200);
    expect(s.sides.player.stance![0]!.hold).toBe(true);
    expect(rallyX(s, 'player', 0)).toBe(4.5); // border column 5: its front edge is x = 6
    expect(u.x).toBeCloseTo(4.5, 6);
    const e = unit(s, 'enemy', 'capguard', 20, 3);
    order(s, true, 'enemy');
    steps(s, 200);
    expect(rallyX(s, 'enemy', 0)).toBe(27.5);
    expect(e.x).toBeCloseTo(27.5, 6);
    order(s, false);
    steps(s, 20);
    expect(u.x).toBeGreaterThan(4.5 + 0.5);
    expect(s.sides.player.stance![0]).toMatchObject({ hold: false, readyAt: s.tick - 19 + 200 });
  });

  it('a held unit that fought in the last 2 s keeps advancing instead of walking back', () => {
    const s = stanceState();
    const u = unit(s, 'player', 'capguard', 10, 3);
    order(s, true);
    step(s);
    u.lastCombatTick = s.tick;
    const x0 = u.x;
    step(s);
    expect(u.x).toBeGreaterThan(x0);
    steps(s, s.rules.merge.cooldownTicks + 5);
    const x1 = u.x;
    step(s);
    expect(u.x).toBeLessThan(x1);
  });

  it('a hold runs out on its own, and the lane can hold again only after the cooldown', () => {
    const s = stanceState({ rallyBack: 1.5, maxHoldTicks: 40, cooldownTicks: 20 });
    order(s, true);
    steps(s, 40);
    expect(s.sides.player.stance![0]!.hold).toBe(true);
    step(s);
    expect(s.events).toContainEqual({ t: 'stance', side: 'player', lane: 0, hold: false, auto: true });
    order(s, true);
    step(s);
    expect(s.events).toContainEqual(expect.objectContaining({ t: 'commandRejected', reason: 'hold is on cooldown' }));
    order(s, false);
    step(s);
    expect(s.events).toContainEqual(expect.objectContaining({ t: 'commandRejected', reason: 'already advancing' }));
    steps(s, 17);
    order(s, true);
    step(s);
    expect(s.sides.player.stance![0]!.hold).toBe(true);
  });

  it('AI sides muster through ordinary stance commands, deterministically', () => {
    const c = protoContent('hold');
    const run = () => {
      const s = createBattle(c, makeConfig(c, { seed: 3, player: 'bot:balanced', enemy: 'general:mother-mold' }));
      runHeadless(s, { until: 3600 });
      return s;
    };
    const a = run(), b = run();
    expect(hashState(a)).toBe(hashState(b));
    for (const side of ['player', 'enemy'] as const) {
      const cmds = a.log.filter((x) => x.side === side && x.type === 'stance');
      expect(cmds.length).toBeGreaterThanOrEqual(2);
      expect(cmds[0]).toMatchObject({ hold: true });
      expect(a.stats[side].rejectedCommands).toBe(0);
    }
    // a profile filter limits the policy to matching AI sides
    const only = protoContent('hold,laneStance.ai.profiles:["bot:balanced"]');
    const s = createBattle(only, makeConfig(only, { seed: 3, player: 'bot:balanced', enemy: 'general:mother-mold' }));
    runHeadless(s, { until: 1200 });
    expect(s.log.some((x) => x.side === 'player' && x.type === 'stance')).toBe(true);
    expect(s.log.some((x) => x.side === 'enemy' && x.type === 'stance')).toBe(false);
  });
});
