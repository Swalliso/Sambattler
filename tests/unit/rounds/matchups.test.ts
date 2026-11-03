// Matchup classes (SPEC §5.3, §10.4, §11.1 `effectiveness`, §14.6; plan Calls 6 and 22): `matchupClass` is the
// one classifier behind the planning screen's marks and the answer bot. It follows a hit's rule on the matrix
// and the tag multipliers, from `data/balance.json`, without merge-perk resistances, and a squad's tiers can
// take different classes (A069). It's pure: the battle never calls it while it runs.
import { describe, expect, it } from 'vitest';
import { createFromScenario, hashState, matchupClass, mergePreview } from '../../../src/sim/rounds/index.ts';
import type { BattleState } from '../../../src/sim/rounds/index.ts';
import { content, planningState } from '../../roundHelpers.ts';

const { matrix, tagMult, effectiveness } = content.balance;

/** The class of the player's `unitId` hits on the general's `targetId`, at the tiers given. */
const vs = (state: BattleState, unitId: string, targetId: string, targetTier: 1 | 2 | 3 = 1, tier: 1 | 2 | 3 = 1) =>
  matchupClass(state, 'player', unitId, tier, 'enemy', targetId, targetTier);

describe('matchupClass from the matrix (§5.3, §11.1)', () => {
  const state = planningState();

  it('reads the matrix and balance.effectiveness\'s thresholds', () => {
    expect(effectiveness).toEqual({ strongAtLeast: 1.5, weakAtMost: 0.75 });
    expect([matrix.slash.light, matrix.slash.medium, matrix.slash.heavy, matrix.crush.heavy]).toEqual([1.5, 1.0, 0.5, 1.5]);
  });

  it('a Sporeling\'s slash is strong on a Gill Archer, normal on a Capguard and weak on an Amanita Knight', () => {
    expect(vs(state, 'sporeling', 'gillArcher')).toBe('strong'); // slash on light, ×1.5
    expect(vs(state, 'sporeling', 'capguard')).toBe('normal'); // slash on medium, ×1.0
    expect(vs(state, 'sporeling', 'amanitaKnight')).toBe('weak'); // slash on heavy, ×0.5
  });

  it('a Hammercap\'s crush is strong on an Amanita Knight', () => {
    expect(vs(state, 'hammercap', 'amanitaKnight')).toBe('strong'); // crush on heavy, ×1.5
  });

  it('classes the thresholds themselves: ×0.75 is weak, and ×1.5 strong', () => {
    expect(matrix.pierce.heavy).toBe(0.75);
    expect(vs(state, 'gillArcher', 'amanitaKnight')).toBe('weak');
    expect(matrix.pierce.medium).toBe(1.5);
    expect(vs(state, 'gillArcher', 'capguard')).toBe('strong');
  });

  it('counts siege\'s ×2.0 against an emplacement\'s Structure armor', () => {
    expect(tagMult.siegeVsStructure).toBe(2.0);
    expect(state.compiled.enemy.units.puffballMortar!.armor).toBe('structure');
    expect(vs(state, 'rootbreaker', 'puffballMortar')).toBe('strong'); // crush on structure ×1.5, siege ×2.0
    expect(vs(state, 'sporeling', 'puffballMortar')).toBe('weak'); // slash on structure, ×0.5
  });
});

describe('the slayer tag (§5.3, §5.6)', () => {
  const state = planningState();

  it('a Veilstalker\'s hit on a Bloomed or Elder unit is strong, by the ×3.0 tag multiplier', () => {
    expect(tagMult.slayerVsElite).toBe(3.0);
    expect(vs(state, 'veilstalker', 'sporeling', 2)).toBe('strong'); // pierce on light ×1.0, slayer ×3.0
    expect(vs(state, 'veilstalker', 'amanitaKnight', 2)).toBe('strong'); // pierce on heavy ×0.75, slayer ×3.0
    expect(vs(state, 'veilstalker', 'capguard', 3)).toBe('strong');
  });

  it('on a base-tier unit it follows the matrix', () => {
    expect(vs(state, 'veilstalker', 'sporeling')).toBe('normal'); // pierce on light, ×1.0
    expect(vs(state, 'veilstalker', 'amanitaKnight')).toBe('weak'); // pierce on heavy, ×0.75
    expect(vs(state, 'veilstalker', 'capguard')).toBe('strong'); // pierce on medium, ×1.5
  });
});

describe('what never changes a class (§5.3, §10.4)', () => {
  const state = planningState();

  it('ignores merge-perk resistances', () => {
    // an Elder Capguard takes ×0.7 from pierce, so a Gill Archer's ×1.5 lands at ×1.05, and its class stays strong
    expect(state.compiled.enemy.units.capguard!.tiers[2].resist.pierce).toBe(0.7);
    for (const tier of [1, 2, 3] as const) expect(vs(state, 'gillArcher', 'capguard', tier)).toBe('strong');
    // and an Elder Amanita Knight's ×0.7 from slash keeps a Sporeling's hit weak, not weaker
    expect(state.compiled.enemy.units.amanitaKnight!.tiers[2].resist.slash).toBe(0.7);
    for (const tier of [1, 2, 3] as const) expect(vs(state, 'sporeling', 'amanitaKnight', tier)).toBe('weak');
  });

  it('writes nothing and draws on no stream', () => {
    const before = hashState(state);
    vs(state, 'veilstalker', 'sporeling', 2);
    vs(state, 'rootbreaker', 'puffballMortar');
    expect(hashState(state)).toBe(before);
  });

  it('refuses a unit its side doesn\'t have', () => {
    expect(() => vs(state, 'driftling', 'sporeling')).toThrow(/driftling/);
    expect(() => vs(state, 'sporeling', 'driftling')).toThrow(/driftling/);
  });
});

describe('classes per tier within one squad (plan Call 22, A069)', () => {
  it('a Burrow that fields as 2 Bloomed and 2 base takes a slayer\'s hits as normal on its base units and strong on its Bloomed', () => {
    const state = createFromScenario(content, {
      id: 'one-burrow', description: 'matchups.test', map: 'bogwater-hollow',
      sides: { player: {}, enemy: { colony: [{ building: 'sporelingBurrow', lane: 0, rank: 0, file: 2 }] } },
    });
    const burrow = state.buildings.find((b) => b.side === 'enemy')!;
    expect(mergePreview(state, 'enemy').byBuilding[burrow.id]).toEqual({ elders: 0, bloomed: 2, base: 2 });
    expect(vs(state, 'veilstalker', 'sporeling', 1)).toBe('normal');
    expect(vs(state, 'veilstalker', 'sporeling', 2)).toBe('strong');
    // a hit without a tier rule takes one class across the squad
    expect(vs(state, 'hammercap', 'sporeling', 1)).toBe(vs(state, 'hammercap', 'sporeling', 2));
  });
});
