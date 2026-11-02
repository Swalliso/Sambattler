import { describe, expect, it } from 'vitest';
import { addUnit } from '../../src/sim/create.ts';
import { HEARTCAP_ID, createBattle, makeConfig } from '../../src/sim/index.ts';
import type { BattleConfig, BattleState } from '../../src/sim/index.ts';
import { targetingSystem } from '../../src/sim/systems/targeting.ts';
import { protoContent } from '../../tools/lib/content.ts';
import { building, liveState, steps, unit } from '../helpers.ts';

function frozen(test?: BattleConfig['test']) {
  const s = liveState({ test });
  s.rules.test.turrets = false;
  for (const side of ['player', 'enemy'] as const) for (const u of Object.values(s.compiled[side].units)) for (const t of u.tiers) t.speedPerTick = 0;
  return s;
}

/** A live battle whose enemy units stand still, with Heartcap turrets off. */
function idle(test?: BattleConfig['test'], map?: string): BattleState {
  const s = liveState({ test, map });
  s.rules.test.turrets = false;
  for (const u of Object.values(s.compiled.enemy.units)) for (const t of u.tiers) t.speedPerTick = 0;
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
    // the Mortar aims at the densest knot within its cloud's 1.5 tiles (§5.3), ties to the nearer: the primary
    const primary = unit(s, 'enemy', 'capguard', 9.0, 4);
    const side = unit(s, 'enemy', 'capguard', 9.0, 3.2);
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

describe("R1's tool-only switches for v2's targeting and movement (SPEC §5.2, §16 R1)", () => {
  it('are absent unless set, so no battle carries them', () => {
    for (const s of [liveState(), liveState({ test: { noBuildingPreference: false, idleSeek: false } })]) {
      expect(s.rules.test).toEqual({ turrets: true, territory: true, heartcapTargets: true });
      expect('noBuildingPreference' in s.rules.test).toBe(false);
      expect('idleSeek' in s.rules.test).toBe(false);
    }
    expect(liveState({ test: { noBuildingPreference: true, idleSeek: true } }).rules.test).toEqual({
      turrets: true, territory: true, heartcapTargets: true, noBuildingPreference: true, idleSeek: true,
    });
  });

  it('noBuildingPreference: a siege unit fights the nearest enemy, where v1 goes for the building', () => {
    for (const flag of [false, true]) {
      const s = frozen(flag ? { noBuildingPreference: true } : undefined);
      const rb = unit(s, 'player', 'rootbreaker', 10, 4);
      const cg = unit(s, 'enemy', 'capguard', 12, 4); // 2 tiles away: edge 2 − 0.45 − 0.35 = 1.2
      const mortar = building(s, 'enemy', 'puffballMortar', 13, 3); // 3 tiles away: edge 3 − 0.45 = 2.55, inside aggro 4
      s.tick = 5 - (rb.id % 5);
      targetingSystem(s);
      expect(rb.targetId).toBe(flag ? cg.id : mortar.id);
    }
    // a building that turns up later doesn't pull it off its target, where v1's preference would
    for (const flag of [false, true]) {
      const s = frozen(flag ? { noBuildingPreference: true } : undefined);
      const rb = unit(s, 'player', 'rootbreaker', 10, 4);
      const cg = unit(s, 'enemy', 'capguard', 12, 4);
      s.tick = 5 - (rb.id % 5);
      targetingSystem(s);
      expect(rb.targetId).toBe(cg.id);
      const mortar = building(s, 'enemy', 'puffballMortar', 13, 3);
      s.tick += 5;
      targetingSystem(s);
      expect(rb.targetId).toBe(flag ? cg.id : mortar.id);
    }
  });

  it('idleSeek: a unit with no target steps toward the nearest enemy it could target, at its speed', () => {
    const s = idle({ idleSeek: true });
    const sp = unit(s, 'player', 'sporeling', 10, 1);
    sp.y = 2; // a row off its spawn row, which the seek ignores
    const cg = unit(s, 'enemy', 'capguard', 18, 5); // 8 tiles ahead and 3 rows down: edge ≈ 7.94, beyond aggro 4
    const speed = s.compiled.player.units.sporeling!.tiers[0].speedPerTick;
    for (let i = 0; i < 5; i++) {
      const x0 = sp.x, y0 = sp.y;
      const d = Math.hypot(cg.x - x0, cg.y - y0);
      steps(s, 1);
      expect(sp.targetId).toBe(0);
      expect(sp.x - x0).toBeCloseTo(((cg.x - x0) / d) * speed, 12);
      expect(sp.y - y0).toBeCloseTo(((cg.y - y0) / d) * speed, 12);
    }
  });

  it('without idleSeek, an idle unit advances along +x and drifts back toward its spawn row, as v1 does', () => {
    const s = idle();
    const sp = unit(s, 'player', 'sporeling', 10, 1);
    sp.y = 2;
    unit(s, 'enemy', 'capguard', 18, 5);
    const speed = s.compiled.player.units.sporeling!.tiers[0].speedPerTick;
    steps(s, 1);
    expect(sp.x).toBeCloseTo(10 + speed, 12);
    expect(sp.y).toBeCloseTo(2 - s.rules.driftPerTick, 12);
  });

  it('idleSeek never seeks a burrowed unit, walks at a lone Mortar, and advances with no enemy in its lane', () => {
    const speed = idle().compiled.player.units.sporeling!.tiers[0].speedPerTick;
    // a burrowed enemy is no candidate, so the unit advances as before
    const b = idle({ idleSeek: true });
    const sb = unit(b, 'player', 'sporeling', 10, 2);
    unit(b, 'enemy', 'capguard', 18, 5).burrowed = true;
    steps(b, 1);
    expect(sb.x).toBeCloseTo(10 + speed, 12);
    expect(sb.y).toBe(2);
    // the Mortar alone: toward its centre (21, 5)
    const m = idle({ idleSeek: true });
    const sm = unit(m, 'player', 'sporeling', 10, 2);
    building(m, 'enemy', 'puffballMortar', 20, 4); // edge ≈ 9.95, beyond aggro 4
    steps(m, 1);
    expect(sm.x).toBeCloseTo(10 + (11 / Math.hypot(11, 3)) * speed, 12);
    expect(sm.y).toBeCloseTo(2 + (3 / Math.hypot(11, 3)) * speed, 12);
    // Twin Roots: an enemy in the other lane is no candidate
    const t = idle({ idleSeek: true }, 'twin-roots');
    const st = addUnit(t, 'player', 'sporeling', 0, 10, 2, 0);
    addUnit(t, 'enemy', 'capguard', 1, 18, 9, 0);
    steps(t, 1);
    expect(st.x).toBeCloseTo(10 + speed, 12);
    expect(st.y).toBe(2);
  });

  it('idleSeek: a support unit never seeks an enemy, and advances as before', () => {
    const s = idle({ idleSeek: true });
    const tender = unit(s, 'player', 'tender', 10, 2);
    unit(s, 'enemy', 'capguard', 18, 5);
    steps(s, 1);
    expect(tender.x).toBeCloseTo(10 + s.compiled.player.units.tender!.tiers[0].speedPerTick, 12);
    expect(tender.y).toBe(2);
  });

  it('idleSeek: a burst unit seeks only the units it aims at, never a tower', () => {
    const s = liveState({ test: { noTurrets: true, idleSeek: true } });
    const bu = unit(s, 'player', 'burster', 10, 2);
    building(s, 'enemy', 'puffballMortar', 20, 4);
    steps(s, 1);
    expect(bu.x).toBeCloseTo(10 + s.compiled.player.units.burster!.tiers[0].speedPerTick, 12);
    expect(bu.y).toBe(2);
  });

  it("idleSeek: the step is capped as the advance is, so the waves' ranged gap still holds", () => {
    const c = protoContent('waves');
    const s = createBattle(c, makeConfig(c, { seed: 1, mapId: 'test-flat', player: 'human', enemy: 'human', test: { noTurrets: true, idleSeek: true } }));
    s.phase = 'live';
    for (const u of Object.values(s.compiled.enemy.units)) for (const t of u.tiers) t.speedPerTick = 0;
    const front = unit(s, 'player', 'capguard', 10, 4);
    const archer = unit(s, 'player', 'gillArcher', 9.2, 4); // already inside the 1-tile gap behind its melee front
    unit(s, 'enemy', 'capguard', 24, 4); // beyond both aggro ranges
    steps(s, 1);
    expect(front.x).toBeCloseTo(10 + s.compiled.player.units.capguard!.tiers[0].speedPerTick, 12);
    expect(archer.x).toBe(9.2);
  });
});

// Pinning (§5.3), default data since R2a S1: a ranged unit with an enemy unit within 1 tile attacks at ×0.35.
describe('pinning (SPEC §5.3)', () => {
  /** Shots `shooter` fires at a sturdy frozen Capguard in 400 ticks, with a frozen enemy Capguard `gap` tiles away (edge distance), or none. */
  function shots(gap: number | null, shooter = 'gillArcher'): number {
    const s = liveState({ test: { noTurrets: true, noTerritory: true, noHeartcapTargets: true }, flags: { merging: false } });
    const a = unit(s, 'player', shooter, 10, 2);
    const target = unit(s, 'enemy', 'capguard', shooter === 'gillArcher' ? 13.6 : 10.85, 2);
    target.hp = target.maxHp = 1e6;
    if (gap !== null) {
      const p = unit(s, 'enemy', 'capguard', 10 + 0.25 + 0.35 + gap, 3.2);
      p.hp = p.maxHp = 1e6;
      p.y = 2; // straight ahead, so the edge distance is exactly `gap`
    }
    for (const t of s.compiled.enemy.units.capguard!.tiers) t.speedPerTick = 0;
    for (const u of s.units) if (u.side === 'enemy') u.cooldown = 1e9;
    s.compiled.player.units[shooter]!.tiers[0].speedPerTick = 0;
    let n = 0;
    for (let i = 0; i < 400; i++) { steps(s, 1); if (a.lastAttackTick === s.tick) n++; }
    return n;
  }

  it('a ranged unit with an enemy unit within 1 tile attacks at ×0.35 its rate', () => {
    expect(liveState().rules.pin).toEqual({ radius: 1, permille: 350 });
    const free = shots(null);
    expect(free).toBe(17); // every 24 ticks over 20 s
    const held = shots(0.5);
    expect(held / free).toBeGreaterThan(0.3);
    expect(held / free).toBeLessThan(0.4);
  });

  it('only within the radius, and only ranged units', () => {
    expect(shots(1.5)).toBe(shots(null));
    expect(shots(0.5, 'capguard')).toBe(shots(null, 'capguard'));
  });
});
