// The combat rework's settings (docs/ideas/combat-rework.md, P1): pinned, call for help, spore
// clouds, the Rhizomorph and waves. Every setting is absent from data/balance.json and its content
// exists only under its preset, so the shipped rules are unchanged; with a setting on, it behaves as
// described.
import { describe, expect, it } from 'vitest';
import { createBattle, makeConfig } from '../../src/sim/index.ts';
import type { BattleState, Content } from '../../src/sim/index.ts';
import { protoContent } from '../../tools/lib/content.ts';
import { content, liveState, steps, unit } from '../helpers.ts';

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
    const s = liveState();
    expect(s.rules.pin).toBeUndefined();
  });

  it('the presets compile', () => {
    for (const p of ['pinned']) expect(() => protoContent(p)).not.toThrow();
    expect(protoState(protoContent('pinned')).rules.pin).toEqual({ radius: 1, permille: 350 });
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
