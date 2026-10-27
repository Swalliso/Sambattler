import { describe, expect, it } from 'vitest';
import type { BattleState } from '../../src/sim/index.ts';
import { content, liveState, steps, unit } from '../helpers.ts';

/** A live flat-map battle with no turrets and every unit standing still. */
function still(modifiers: BattleState['config']['modifiers'] = []): BattleState {
  const s = liveState({ modifiers });
  s.rules.test.turrets = false;
  for (const side of ['player', 'enemy'] as const) {
    for (const u of Object.values(s.compiled[side].units)) for (const t of u.tiers) t.speedPerTick = 0;
  }
  return s;
}

/** Steps until the healer's next heal tick has passed (heals are staggered by id). */
function untilHeal(s: BattleState, healerId: number): void {
  const every = s.compiled.player.units.tender!.tiers[0].healTicks;
  do steps(s, 1); while ((s.tick + healerId) % every !== 0);
}

describe('healing (SPEC §11.3 Tender, step 11)', () => {
  const amount = content.units.tender!.heal!.amount;

  it('heals the ally missing the most HP within range; ties go to the lower id', () => {
    const s = still();
    const t = unit(s, 'player', 'tender', 10, 3);
    const a = unit(s, 'player', 'capguard', 11, 3);
    const b = unit(s, 'player', 'capguard', 11, 4);
    const far = unit(s, 'player', 'capguard', 14, 3); // beyond range 2.5
    a.hp -= 20; b.hp -= 20; far.hp -= 50;
    untilHeal(s, t.id);
    expect(a.hp).toBe(a.maxHp - 20 + amount); // tie → lower id
    expect(b.hp).toBe(b.maxHp - 20);
    expect(far.hp).toBe(far.maxHp - 50);
    b.hp -= 10; // now b is missing more
    untilHeal(s, t.id);
    expect(b.hp).toBe(b.maxHp - 30 + amount);
    expect(s.stats.player.healingDone).toBe(2 * amount);
  });

  it('never heals above max, never heals enemies, never attacks', () => {
    const s = still();
    const t = unit(s, 'player', 'tender', 10, 3);
    const a = unit(s, 'player', 'capguard', 11, 3);
    const foe = unit(s, 'enemy', 'capguard', 9, 1.2); // inside the Tender's range, outside a's reach
    a.hp -= 3; foe.hp -= 50;
    const foeHp = foe.hp;
    untilHeal(s, t.id);
    expect(a.hp).toBe(a.maxHp);
    steps(s, 40);
    expect(foe.hp).toBe(foeHp); // not healed, and the Tender never hit it
    expect(s.stats.player.damageDealt).toBe(0);
  });

  it('an Elder Tender heals two targets', () => {
    const s = still();
    const t = unit(s, 'player', 'tender', 10, 3, 3);
    const a = unit(s, 'player', 'capguard', 11, 3);
    const b = unit(s, 'player', 'capguard', 11, 4);
    a.hp -= 100; b.hp -= 100;
    untilHeal(s, t.id);
    expect(a.hp).toBeGreaterThan(a.maxHp - 100);
    expect(b.hp).toBeGreaterThan(b.maxHp - 100);
  });

  it('regenerates out of combat only (Elder\'s Patience)', () => {
    const s = still([{ side: 'player', source: 'test', effects: { modifiers: [{ stat: 'unit.regenPctPerSec', op: 'add', value: 0.02, where: { tier: 3 } }] } }]);
    const e = unit(s, 'player', 'capguard', 10, 3, 3);
    e.hp -= 500;
    e.lastCombatTick = s.tick; // just fought
    steps(s, 20);
    expect(e.hp).toBe(e.maxHp - 500); // still inside the quiet window
    steps(s, s.rules.merge.cooldownTicks);
    expect(e.hp).toBeGreaterThanOrEqual(e.maxHp - 500 + Math.floor(e.maxHp * 0.02));
  });
});
