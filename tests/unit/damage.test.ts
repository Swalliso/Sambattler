import { describe, expect, it } from 'vitest';
import { damageFor } from '../../src/sim/systems/combat.ts';
import type { Armor, DamageType } from '../../src/sim/index.ts';
import { liveState } from '../helpers.ts';

const r = liveState().rules;
const ARMORS: Armor[] = ['light', 'medium', 'heavy', 'structure'];
const TYPES: DamageType[] = ['slash', 'pierce', 'crush'];

describe('damage formula and matrix (SPEC §5.3)', () => {
  it('applies the matrix for every type pair', () => {
    const expected: Record<DamageType, number[]> = {
      slash: [15, 10, 5, 5], pierce: [10, 15, 8, 5], crush: [8, 8, 15, 15],
    };
    for (const t of TYPES) {
      ARMORS.forEach((a, i) => expect(damageFor(r, 10, t, false, 1, a, 1, 1), `${t} vs ${a}`).toBe(expected[t][i]));
    }
  });

  it('siege ×2 vs structure only; the slayer multiplier vs tier ≥ 2 only', () => {
    expect(damageFor(r, 28, 'crush', true, 1, 'structure', 1, 1)).toBe(84); // 28 × 1.5 × 2
    expect(damageFor(r, 28, 'crush', true, 1, 'medium', 1, 1)).toBe(21); // 28 × 0.75
    expect(damageFor(r, 18, 'pierce', false, 1.75, 'medium', 2, 1)).toBe(47); // 18 × 1.5 × 1.75 = 47.25
    expect(damageFor(r, 18, 'pierce', false, 1.75, 'medium', 1, 1)).toBe(27);
    expect(damageFor(r, 18, 'pierce', false, 2.0, 'medium', 3, 1)).toBe(54); // a per-unit multiplier (Elder perk)
  });

  it('rounds to the nearest integer with a minimum of 1', () => {
    expect(damageFor(r, 7, 'slash', false, 1, 'light', 1, 1)).toBe(11); // 10.5 → 11
    expect(damageFor(r, 7, 'slash', false, 1, 'structure', 1, 1)).toBe(4); // 3.5 → 4
    expect(damageFor(r, 1, 'slash', false, 1, 'heavy', 1, 1)).toBe(1); // 0.5 → 1 (minimum)
    expect(damageFor(r, 0.1, 'slash', false, 1, 'heavy', 1, 1)).toBe(1);
  });

  it('target multipliers (Heartcap storm vulnerability) multiply in', () => {
    expect(damageFor(r, 20, 'slash', false, 1, 'structure', 1, 1.5)).toBe(15);
  });
});
