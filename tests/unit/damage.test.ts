import { describe, expect, it } from 'vitest';
import { damageFor } from '../../src/sim/systems/combat.ts';
import { addCloud } from '../../src/sim/systems/clouds.ts';
import type { Armor, BattleState, DamageType, Side } from '../../src/sim/index.ts';
import { building, liveState, steps, unit } from '../helpers.ts';

const r = liveState().rules;
const ARMORS: Armor[] = ['light', 'medium', 'heavy', 'structure'];
const TYPES: DamageType[] = ['slash', 'pierce', 'crush'];

describe('damage formula and matrix (SPEC §5.3)', () => {
  it('applies the matrix for every type pair', () => {
    const expected: Record<DamageType, number[]> = {
      slash: [15, 10, 5, 5], pierce: [10, 15, 8, 5], crush: [8, 8, 15, 15],
    };
    for (const t of TYPES) {
      ARMORS.forEach((a, i) => expect(damageFor(r, 10, t, 1, 1, a, 1, 1), `${t} vs ${a}`).toBe(expected[t][i]));
    }
  });

  it('siege ×2 vs structure only; the slayer multiplier vs tier ≥ 2 only', () => {
    expect(damageFor(r, 28, 'crush', r.siegeMult, 1, 'structure', 1, 1)).toBe(84); // 28 × 1.5 × 2
    expect(damageFor(r, 28, 'crush', r.siegeMult, 1, 'medium', 1, 1)).toBe(21); // 28 × 0.75
    expect(damageFor(r, 18, 'pierce', 1, 1.75, 'medium', 2, 1)).toBe(47); // 18 × 1.5 × 1.75 = 47.25
    expect(damageFor(r, 18, 'pierce', 1, 1.75, 'medium', 1, 1)).toBe(27);
    expect(damageFor(r, 18, 'pierce', 1, 2.0, 'medium', 3, 1)).toBe(54); // a per-unit multiplier (Elder perk)
  });

  it('rounds to the nearest integer with a minimum of 1', () => {
    expect(damageFor(r, 7, 'slash', 1, 1, 'light', 1, 1)).toBe(11); // 10.5 → 11
    expect(damageFor(r, 7, 'slash', 1, 1, 'structure', 1, 1)).toBe(4); // 3.5 → 4
    expect(damageFor(r, 1, 'slash', 1, 1, 'heavy', 1, 1)).toBe(1); // 0.5 → 1 (minimum)
    expect(damageFor(r, 0.1, 'slash', 1, 1, 'heavy', 1, 1)).toBe(1);
  });

  it('target multipliers (Heartcap storm vulnerability) multiply in', () => {
    expect(damageFor(r, 20, 'slash', 1, 1, 'structure', 1, 1.5)).toBe(15);
  });
});

// R1's chosen set (§5.3), default data since R2a S1: spore clouds, cleave and bursts deal their damage as below.
// Pinning is in combat.test.ts.
describe('spore clouds, cleave and bursts (SPEC §5.3)', () => {
  const NO_FIELD = { noTurrets: true, noTerritory: true, noHeartcapTargets: true };
  /** Freezes a side's unit type: it neither moves nor attacks. */
  function freeze(s: BattleState, side: Side, id: string): void {
    for (const t of s.compiled[side].units[id]!.tiers) t.speedPerTick = 0;
    for (const u of s.units) if (u.side === side && u.unitId === id) u.cooldown = 1e9;
  }
  const dealt = (x: { hp: number; maxHp: number }) => x.maxHp - x.hp;

  it('a cloud deals 10 a second for 6 s, ignoring armor, to the enemy units inside it only', () => {
    const s = liveState({ test: NO_FIELD });
    const knight = unit(s, 'enemy', 'amanitaKnight', 10, 3);
    const archer = unit(s, 'enemy', 'gillArcher', 10.8, 3.6);
    const outside = unit(s, 'enemy', 'sporeling', 13, 3);
    const friend = unit(s, 'player', 'capguard', 9.2, 2.2);
    const cellar = building(s, 'enemy', 'truffleCellar', 9, 4);
    for (const [side, id] of [['enemy', 'amanitaKnight'], ['enemy', 'gillArcher'], ['enemy', 'sporeling'], ['player', 'capguard']] as const) freeze(s, side, id);
    addCloud(s, 'player', 0, 10, 3, 0, s.rules.cloud!);
    steps(s, 200);
    expect([dealt(knight), dealt(archer)]).toEqual([60, 60]); // heavy armor doesn't matter
    expect([dealt(outside), dealt(friend), dealt(cellar)]).toEqual([0, 0, 0]);
    expect(s.clouds).toEqual([]);
    expect(s.stats.player.damageBySource.sporeCloud).toBe(120);
  });

  it("cleave: a Scythecap's swing deals full damage within 1.0, 1.2 and 1.4 tiles by tier; buildings still take the falloff", () => {
    expect(liveState().rules.cleave).toEqual({ units: ['scythecap'] });
    expect(liveState().compiled.player.units.scythecap!.tiers.map((t) => t.splashRadius)).toEqual([1, 1.2, 1.4]);
    const swing = (cleave: boolean) => {
      const s = liveState({ test: NO_FIELD });
      if (!cleave) delete s.rules.cleave;
      const scy = unit(s, 'player', 'scythecap', 9, 4);
      freeze(s, 'player', 'scythecap');
      scy.cooldown = 0;
      const target = unit(s, 'enemy', 'sporeling', 9.8, 4);
      const near = unit(s, 'enemy', 'sporeling', 10.5, 4); // 0.45 tiles from the target's edge
      const far = unit(s, 'enemy', 'sporeling', 11.6, 4); // 1.55 tiles
      const cellar = building(s, 'enemy', 'truffleCellar', 10, 4); // 0.2 tiles from the target
      freeze(s, 'enemy', 'sporeling');
      steps(s, 2);
      return { target: dealt(target), near: dealt(near), far: dealt(far), cellar: dealt(cellar) };
    };
    const on = swing(true), off = swing(false);
    expect(on.target).toBeGreaterThan(0);
    expect(on.near).toBe(on.target);
    expect(off.near).toBe(Math.max(1, Math.round(off.target * 0.5))); // a plain splash's falloff
    expect(on.far).toBe(0);
    expect(on.cellar).toBe(off.cellar);
    expect(on.cellar).toBeGreaterThan(0);
  });

  it('a burst deals 40 through any armor within 1.5 tiles, then a 4 s cloud; never buildings or friends', () => {
    const s = liveState({ test: NO_FIELD });
    const b = unit(s, 'player', 'burster', 8, 4);
    const knight = unit(s, 'enemy', 'amanitaKnight', 8.9, 4);
    const capguard = unit(s, 'enemy', 'capguard', 9.9, 4.5);
    const far = unit(s, 'enemy', 'sporeling', 12.5, 4); // past 1.5 tiles of both, so the Knight (nearer) is the knot's pick
    const friend = unit(s, 'player', 'capguard', 9.4, 3.2);
    const cellar = building(s, 'enemy', 'truffleCellar', 9, 5);
    for (const [side, id] of [['enemy', 'amanitaKnight'], ['enemy', 'capguard'], ['enemy', 'sporeling'], ['player', 'capguard']] as const) freeze(s, side, id);
    let at = -1;
    for (let i = 0; i < 20 && at < 0; i++) { steps(s, 1); if (s.events.some((e) => e.t === 'burst')) at = s.tick; }
    expect(at).toBeGreaterThan(0);
    expect(s.units.includes(b)).toBe(false);
    expect([dealt(knight), dealt(capguard), dealt(far), dealt(friend)]).toEqual([40, 40, 0, 0]);
    expect(cellar.hp).toBe(cellar.maxHp);
    expect(s.clouds).toHaveLength(1);
    expect(s.clouds![0]).toMatchObject({ side: 'player', radius: 1.5, damage: 10, untilTick: at + 80, x: knight.x, y: knight.y });
    steps(s, 80);
    expect([dealt(knight), dealt(capguard), dealt(far)]).toEqual([80, 80, 0]);
    expect(s.clouds).toEqual([]);
  });
});
