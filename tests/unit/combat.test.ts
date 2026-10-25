import { describe, expect, it } from 'vitest';
import { HEARTCAP_ID } from '../../src/sim/index.ts';
import { targetingSystem } from '../../src/sim/systems/targeting.ts';
import { building, liveState, steps, unit } from '../helpers.ts';

function frozen() {
  const s = liveState();
  s.rules.test.turrets = false;
  for (const side of ['player', 'enemy'] as const) for (const u of Object.values(s.compiled[side].units)) u.speedPerTick = 0;
  return s;
}

describe('targeting and combat (SPEC §5.2–5.3)', () => {
  it('picks the nearest enemy by edge distance, ties to the lowest id', () => {
    const s = frozen();
    const me = unit(s, 'player', 'capguard', 10, 4);
    const far = unit(s, 'enemy', 'sporeling', 13, 4);
    const near = unit(s, 'enemy', 'sporeling', 12, 4);
    s.tick = 5 - (me.id % 5); // a retarget tick for `me`
    targetingSystem(s);
    expect(me.targetId).toBe(near.id);
    // equidistant: lowest id wins
    const s2 = frozen();
    const a = unit(s2, 'player', 'capguard', 10, 4);
    const t1 = unit(s2, 'enemy', 'sporeling', 12, 3);
    unit(s2, 'enemy', 'sporeling', 12, 5);
    s2.tick = 5 - (a.id % 5);
    targetingSystem(s2);
    expect(a.targetId).toBe(t1.id);
    void far;
  });

  it('siege units prefer buildings and the Heartcap over nearer units', () => {
    const s = frozen();
    const rb = unit(s, 'player', 'rootbreaker', 26, 4);
    unit(s, 'enemy', 'sporeling', 26.8, 4); // touching
    const b = building(s, 'enemy', 'truffleCellar', 28, 3);
    s.tick = 5 - (rb.id % 5);
    targetingSystem(s);
    expect(rb.targetId).toBe(b.id);
    b.hp = 0;
    s.buildings.length = 0;
    rb.x = 29;
    targetingSystem(s);
    expect(rb.targetId).toBe(HEARTCAP_ID.enemy);
  });

  it('keeps a target within aggro × leash and drops it beyond', () => {
    const s = frozen();
    const me = unit(s, 'player', 'capguard', 10, 4);
    const t = unit(s, 'enemy', 'sporeling', 13, 4);
    s.tick = 5 - (me.id % 5);
    targetingSystem(s);
    expect(me.targetId).toBe(t.id);
    const closer = unit(s, 'enemy', 'sporeling', 11.5, 2);
    t.x = 14.4; // edge 3.8 > aggro 4? no: 14.4 − 10 − 0.6 = 3.8 ≤ 4 × 1.25 → sticky
    s.tick += 5;
    targetingSystem(s);
    expect(me.targetId).toBe(t.id);
    t.x = 16.5; // edge 5.9 > 5 → dropped for the nearest candidate
    s.tick += 5;
    targetingSystem(s);
    expect(me.targetId).toBe(closer.id);
  });

  it('ranged hits land after ceil(distance / speed × 20) ticks; melee lands the same tick', () => {
    const s = frozen();
    const archer = unit(s, 'player', 'gillArcher', 10, 4);
    const target = unit(s, 'enemy', 'capguard', 15.0, 4); // edge 15 − 10 − 0.25 − 0.35 = 4.4
    steps(s, 1);
    const hit = s.hits.find((h) => h.sourceId === archer.id)!;
    expect(hit.tick - hit.fireTick).toBe(Math.ceil((4.4 / 8) * 20));
    const hp0 = target.hp;
    while (s.tick < hit.tick) steps(s, 1);
    expect(target.hp).toBe(hp0 - 21); // 14 pierce × 1.5 vs medium

    const m = frozen();
    unit(m, 'player', 'capguard', 10, 4);
    const victim = unit(m, 'enemy', 'sporeling', 10.9, 4);
    steps(m, 1);
    expect(victim.hp).toBe(72 - 21); // 14 slash × 1.5 vs light, same tick
  });

  it('splash: full damage to the primary target, 50% to others in radius', () => {
    const s = frozen();
    const mortar = building(s, 'player', 'puffballMortar', 4, 3); // centre (5, 4)
    const primary = unit(s, 'enemy', 'capguard', 9.0, 4);
    const side = unit(s, 'enemy', 'capguard', 9.0, 4.8);
    const outside = unit(s, 'enemy', 'capguard', 9.0, 6.5);
    void mortar;
    for (let i = 0; i < 60 && primary.hp === primary.maxHp; i++) steps(s, 1);
    expect(primary.maxHp - primary.hp).toBe(18); // 24 crush × 0.75
    expect(side.maxHp - side.hp).toBe(9);
    expect(outside.hp).toBe(outside.maxHp);
  });

  it('Mortar respects its minimum range', () => {
    const s = frozen();
    building(s, 'player', 'puffballMortar', 4, 3);
    const hugger = unit(s, 'enemy', 'sporeling', 6.2, 4); // edge ≈ 0.95 < 1.5
    steps(s, 80);
    expect(hugger.hp).toBe(hugger.maxHp);
  });

  it('deaths free supply and fire events after all hits resolve', () => {
    const s = frozen();
    unit(s, 'player', 'capguard', 10, 4);
    const v = unit(s, 'enemy', 'sporeling', 10.9, 4);
    v.hp = 5;
    const sup = s.sides.enemy.supplyUsed;
    steps(s, 1);
    expect(s.units.find((u) => u.id === v.id)).toBeUndefined();
    expect(s.sides.enemy.supplyUsed).toBe(sup - 1);
    expect(s.events.some((e) => e.t === 'died' && e.id === v.id)).toBe(true);
  });
});
