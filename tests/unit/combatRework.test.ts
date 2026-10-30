// The combat rework's settings (docs/ideas/combat-rework.md, P1): pinned, call for help, spore
// clouds, the Rhizomorph and waves. Every setting is absent from data/balance.json and its content
// exists only under its preset, so the shipped rules are unchanged; with a setting on, it behaves as
// described.
import { describe, expect, it } from 'vitest';
import { laneCover } from '../../src/sim/ai/controller.ts';
import { createBattle, makeConfig } from '../../src/sim/index.ts';
import type { BattleState, Content } from '../../src/sim/index.ts';
import { addCloud } from '../../src/sim/systems/clouds.ts';
import { protoContent } from '../../tools/lib/content.ts';
import { building, content, liveState, setBorders, steps, unit } from '../helpers.ts';

const NO_FIELD = { noTurrets: true, noTerritory: true, noHeartcapTargets: true };

/** A live battle on the flat test map from proto content, with both sides idle. */
function protoState(c: Content, test: BattleState['config']['test'] = NO_FIELD): BattleState {
  const s = createBattle(c, makeConfig(c, { seed: 1, mapId: 'test-flat', player: 'human', enemy: 'human', ...(test ? { test } : {}) }));
  s.phase = 'live';
  return s;
}

/** Freezes a side's unit type: it neither moves nor attacks. */
function freeze(s: BattleState, side: 'player' | 'enemy', id: string): void {
  for (const t of s.compiled[side].units[id]!.tiers) t.speedPerTick = 0;
  for (const u of s.units) if (u.side === side && u.unitId === id) u.cooldown = 1e9;
}

describe('the combat rework settings are off by default', () => {
  it('balance.json sets none of them, so compiled rules carry none', () => {
    const b = content.balance;
    expect(b.pinned).toBeUndefined();
    expect(b.callForHelp).toBeUndefined();
    expect(b.sporeCloud).toBeUndefined();
    const s = liveState();
    expect(s.rules.pin).toBeUndefined();
    expect(s.rules.help).toBeUndefined();
    expect(s.rules.cloud).toBeUndefined();
  });

  it('the presets compile', () => {
    for (const p of ['pinned', 'callforhelp', 'sporecloud']) expect(() => protoContent(p)).not.toThrow();
    expect(protoState(protoContent('pinned')).rules.pin).toEqual({ radius: 1, permille: 350 });
    expect(protoState(protoContent('callforhelp')).rules.help).toEqual({ radius: 5 });
  });
});

describe('pinned (balance pinned)', () => {
  /** Shots an archer fires at a sturdy frozen Capguard 3 tiles away in `ticks`, with a frozen enemy `pinner` at `gap` tiles (edge distance). */
  function shots(pinned: boolean, gap: number | null, ticks = 400, shooter = 'gillArcher'): number {
    const s = liveState({ test: NO_FIELD, flags: { merging: false } });
    if (pinned) s.rules.pin = { radius: 1, permille: 350 };
    const a = unit(s, 'player', shooter, 10, 2);
    const target = unit(s, 'enemy', 'capguard', shooter === 'gillArcher' ? 13.6 : 10.85, 2);
    target.hp = target.maxHp = 1e6;
    if (gap !== null) {
      const p = unit(s, 'enemy', 'capguard', 10 + 0.25 + 0.35 + gap, 3.2);
      p.hp = p.maxHp = 1e6;
      p.y = 2; // straight ahead, so the edge distance is exactly `gap`
    }
    freeze(s, 'enemy', 'capguard');
    s.compiled.player.units[shooter]!.tiers[0].speedPerTick = 0;
    let n = 0;
    for (let i = 0; i < ticks; i++) { steps(s, 1); if (a.lastAttackTick === s.tick) n++; }
    return n;
  }

  it('a ranged unit with an enemy unit within 1 tile attacks at 0.35× its rate', () => {
    const free = shots(true, null);
    expect(free).toBe(shots(false, null));
    expect(free).toBe(17); // every 24 ticks over 20 s
    const held = shots(true, 0.5);
    expect(held / free).toBeGreaterThan(0.3);
    expect(held / free).toBeLessThan(0.4);
    expect(shots(false, 0.5)).toBe(free); // off: the same as today
  });

  it('only within the radius, and only ranged units', () => {
    expect(shots(true, 1.5)).toBe(shots(false, 1.5));
    expect(shots(true, 0.5, 400, 'capguard')).toBe(shots(false, 0.5, 400, 'capguard'));
  });
});

describe('call for help (balance callForHelp)', () => {
  /**
   * E1's failure: an enemy archer that can't move shoots a Truffle Cellar from 5 tiles while the
   * player holds the lane, so its Capguard waits at the rally line beyond its aggro range.
   */
  function siege(help: boolean, ticks: number, opts: { busy?: boolean } = {}) {
    const s = liveState({ test: NO_FIELD, flags: { merging: false }, borders: [6, 25] });
    if (help) s.rules.help = { radius: 5 };
    s.sides.player.stance![0] = { hold: true, since: 0, readyAt: 0 };
    const cellar = building(s, 'player', 'truffleCellar', 4, 1);
    const guard = unit(s, 'player', 'capguard', 3, 2);
    const archer = unit(s, 'enemy', 'gillArcher', 6 + 5 + 0.25, 2);
    s.compiled.enemy.units.gillArcher!.tiers[0].speedPerTick = 0;
    if (opts.busy) {
      // a frozen enemy Capguard right beside the guard keeps it fighting
      const foe = unit(s, 'enemy', 'capguard', 3, 3.2);
      foe.hp = foe.maxHp = 1e6;
      freeze(s, 'enemy', 'capguard');
    }
    steps(s, ticks);
    return { s, cellar, guard, archer };
  }

  it('a unit with no target near a building under fire takes the attacker, and closes on it beyond its leash', () => {
    const { guard, archer } = siege(true, 40);
    expect(archer.targetId).not.toBe(guard.id); // still shooting the Cellar
    expect(guard.targetId).toBe(archer.id);
    const later = siege(true, 400);
    expect(later.s.units.some((u) => u.unitId === 'gillArcher')).toBe(false); // the guard reached and killed it
  });

  it('off: the held Capguard waits at its rally line while the archer shoots the Cellar', () => {
    const { s, cellar, guard } = siege(false, 400);
    expect(guard.targetId).toBe(0);
    expect(guard.x).toBeLessThan(6);
    expect(cellar.hp).toBeLessThan(cellar.maxHp);
    expect(s.units.some((u) => u.unitId === 'gillArcher')).toBe(true);
  });

  it('a unit that is already fighting keeps its own target', () => {
    const { guard, archer } = siege(true, 40, { busy: true });
    expect(guard.targetId).not.toBe(0);
    expect(guard.targetId).not.toBe(archer.id);
  });
});

describe('spore clouds (balance sporeCloud)', () => {
  it('the Mortar reaches 7 tiles under the setting, 6 without; battles without it carry no clouds', () => {
    expect(liveState().compiled.player.buildings.puffballMortar!.attack!.range).toBe(6);
    expect(liveState().clouds).toBeUndefined();
    const s = protoState(protoContent('sporecloud'));
    expect(s.compiled.player.buildings.puffballMortar!.attack!.range).toBe(7);
    expect(s.rules.cloud).toEqual({ buildings: ['puffballMortar'], radius: 1.5, ticks: 120, pulseTicks: 20, damage: 10, aiCover: 1 });
    expect(s.clouds).toEqual([]);
  });

  it('a cloud deals 10 a second for 6 s, ignoring armor, to the enemy units inside it only', () => {
    const s = protoState(protoContent('sporecloud'));
    const knight = unit(s, 'enemy', 'amanitaKnight', 10, 3);
    const archer = unit(s, 'enemy', 'gillArcher', 10.8, 3.6);
    const outside = unit(s, 'enemy', 'sporeling', 13, 3);
    const friend = unit(s, 'player', 'capguard', 9.2, 2.2);
    const cellar = building(s, 'enemy', 'truffleCellar', 9, 4);
    for (const [side, id] of [['enemy', 'amanitaKnight'], ['enemy', 'gillArcher'], ['enemy', 'sporeling'], ['player', 'capguard']] as const) freeze(s, side, id);
    addCloud(s, 'player', 0, 10, 3, 0);
    steps(s, 200);
    expect(knight.maxHp - knight.hp).toBe(60); // heavy armor doesn't matter
    expect(archer.maxHp - archer.hp).toBe(60);
    expect(outside.hp).toBe(outside.maxHp);
    expect(friend.hp).toBe(friend.maxHp);
    expect(cellar.hp).toBe(cellar.maxHp);
    expect(s.clouds).toEqual([]);
    expect(s.stats.player.damageBySource.sporeCloud).toBe(120);
  });

  it("a Mortar's shell leaves a cloud where it lands; without the setting it leaves none", () => {
    for (const on of [true, false]) {
      const s = on ? protoState(protoContent('sporecloud')) : liveState({ test: NO_FIELD });
      building(s, 'player', 'puffballMortar', 4, 2);
      const knight = unit(s, 'enemy', 'amanitaKnight', 10, 3);
      freeze(s, 'enemy', 'amanitaKnight');
      steps(s, 60);
      if (!on) { expect(s.clouds).toBeUndefined(); continue; }
      expect(s.clouds).toHaveLength(1);
      expect(s.clouds![0]).toMatchObject({ side: 'player', lane: 0, x: knight.x, y: knight.y });
    }
  });

  it('the AI scores a cloud tower by the lane it reaches past its border', () => {
    const s = protoState(protoContent('sporecloud'));
    setBorders(s, 6, 25);
    expect(laneCover(s, 'player', 0, 5, 7)).toBe(5);
    expect(laneCover(s, 'player', 0, 1, 3)).toBe(0);
    expect(laneCover(s, 'enemy', 0, 27, 7)).toBe(5);
  });
});
