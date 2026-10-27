import { describe, expect, it } from 'vitest';
import { resolveStat } from '../../src/sim/effects.ts';
import type { BattleModifier, BattleState, Side } from '../../src/sim/index.ts';
import type { EffectBundle, ModifierDef } from '../../src/data/schema.ts';
import { building, content, liveState, steps, unit } from '../helpers.ts';

const mod = (stat: ModifierDef['stat'], op: ModifierDef['op'], value: number, extra: Partial<ModifierDef> = {}): ModifierDef =>
  ({ stat, op, value, ...extra });
const on = (side: Side | 'both', effects: EffectBundle): BattleModifier => ({ side, source: 'test', effects });

/** A live flat-map battle with merging on, no turrets, and every unit standing still. */
function still(modifiers: BattleModifier[] = []): BattleState {
  const s = liveState({ flags: { merging: true }, modifiers });
  s.rules.test.turrets = false;
  for (const side of ['player', 'enemy'] as const) {
    for (const u of Object.values(s.compiled[side].units)) for (const t of u.tiers) t.speedPerTick = 0;
  }
  return s;
}

describe('effects DSL: compile order and selectors (SPEC §14.1)', () => {
  it('sums every add, multiplies every mul, then the last set wins', () => {
    const mods = [mod('unit.hp', 'mul', 2), mod('unit.hp', 'add', 10), mod('unit.hp', 'add', 5), mod('unit.hp', 'mul', 1.5)];
    expect(resolveStat(100, mods, 'unit.hp')).toBe((100 + 15) * 3);
    expect(resolveStat(100, [...mods, mod('unit.hp', 'set', 7), mod('unit.hp', 'set', 9)], 'unit.hp')).toBe(9);
    expect(resolveStat(100, mods, 'unit.damage')).toBe(100);
  });

  it('returns the base untouched (bit-identical) when nothing matches', () => {
    const base = 0.1 + 0.2;
    expect(Object.is(resolveStat(base, [], 'unit.hp'), base)).toBe(true);
  });

  it('unit modifiers resolve before tier scaling, and tier selectors pick tiers', () => {
    const s = liveState({ modifiers: [on('player', { modifiers: [
      mod('unit.hp', 'mul', 1.5, { where: { unit: 'sporeling' } }),
      mod('unit.damage', 'mul', 2, { where: { unit: 'capguard', tier: 3 } }),
    ] })] });
    const base = content.units.sporeling!.hp;
    const mult = content.balance.tierStatMult;
    expect(s.compiled.player.units.sporeling!.tiers[0].hp).toBe(Math.round(base * 1.5));
    expect(s.compiled.player.units.sporeling!.tiers[1].hp).toBe(Math.round(base * 1.5 * mult));
    expect(s.compiled.enemy.units.sporeling!.tiers[0].hp).toBe(base);
    const cg = s.compiled.player.units.capguard!;
    expect(cg.tiers[1].damage).toBeCloseTo(content.units.capguard!.damage * mult, 9);
    expect(cg.tiers[2].damage).toBeCloseTo(content.units.capguard!.damage * mult * mult * 2, 9);
  });

  it('a building selector on a unit stat means the units that building spawns; tags match too', () => {
    const s = liveState({ modifiers: [on('player', { modifiers: [
      mod('unit.speed', 'mul', 2, { where: { building: 'gillNest' } }),
      mod('building.spawnInterval', 'mul', 0.5, { where: { tag: 'swarm' } }),
    ] })] });
    const p = s.compiled.player, e = s.compiled.enemy;
    expect(p.units.gillArcher!.tiers[0].speedPerTick).toBeCloseTo(2 * e.units.gillArcher!.tiers[0].speedPerTick, 12);
    expect(p.units.capguard!.tiers[0].speedPerTick).toBe(e.units.capguard!.tiers[0].speedPerTick);
    expect(p.buildings.sporelingBurrow!.spawn!.intervalHalfTicks).toBe(e.buildings.sporelingBurrow!.spawn!.intervalHalfTicks / 2);
    expect(p.buildings.capguardHall!.spawn!.intervalHalfTicks).toBe(e.buildings.capguardHall!.spawn!.intervalHalfTicks);
  });

  it('`side: opponent` modifiers land on the other side; side stats feed the systems', () => {
    const s = liveState({ modifiers: [on('player', { modifiers: [
      mod('building.hp', 'mul', 0.5, { side: 'opponent' }),
      mod('side.supplyCap', 'add', 6),
      mod('side.mergeRadius', 'add', 0.5),
      mod('side.knitTicks', 'mul', 0.5),
    ] })] });
    expect(s.compiled.enemy.buildings.capguardHall!.hp).toBe(content.buildings.capguardHall!.hp / 2);
    expect(s.compiled.player.buildings.capguardHall!.hp).toBe(content.buildings.capguardHall!.hp);
    expect(s.sides.player.supplyCap).toBe(content.balance.supplyCap + 6);
    expect(s.sides.enemy.supplyCap).toBe(content.balance.supplyCap);
    expect(s.compiled.player.mergeRadius).toBe(content.balance.mergeRadius + 0.5);
    expect(s.compiled.player.knitTicks).toBe(s.compiled.enemy.knitTicks / 2);
  });

  it('starting gold and Heartcap max HP apply once at creation (Fortified scales current HP too)', () => {
    const s = liveState({ modifiers: [on('enemy', { modifiers: [mod('side.heartcapMaxHp', 'mul', 1.3), mod('side.startingGold', 'add', 150)] })] });
    expect(s.sides.enemy.heartcapMaxHp).toBe(Math.round(content.balance.heartcapEnemyHp.base * 1.3));
    expect(s.sides.enemy.heartcapHp).toBe(s.sides.enemy.heartcapMaxHp);
    expect(s.sides.enemy.gold).toBe(s.sides.player.gold + 150);
  });

  it('battle.sporestormStart shifts the storm for both sides', () => {
    const s = liveState({ modifiers: [on('both', { modifiers: [mod('battle.sporestormStart', 'add', -60)] })] });
    expect(s.rules.storm.startTick).toBe((content.balance.sporestorm.startSeconds - 60) * 20);
  });

  it('positional selectors are evaluated per building when the stat is used (adjacency)', () => {
    const s = still([on('player', { modifiers: [mod('building.spawnInterval', 'mul', 0.5, { where: { adjacentOwnBuildingsGte: 1 } })] })]);
    const lone = building(s, 'player', 'capguardHall', 0, 0);
    const a = building(s, 'player', 'capguardHall', 0, 4);
    building(s, 'player', 'truffleCellar', 2, 4); // shares an edge with `a`
    const full = s.compiled.player.buildings.capguardHall!.spawn!.intervalHalfTicks;
    lone.timer = 0; a.timer = 0;
    steps(s, 1);
    expect(lone.timer).toBe(full);
    expect(a.timer).toBe(full / 2);
  });
});

describe('effects DSL: triggers', () => {
  it('merge → gainGold fires once per completed merge', () => {
    const s = still([on('player', { triggers: [{ on: 'merge', do: [{ gainGold: 4 }] }] })]);
    const g0 = s.sides.player.gold;
    for (let i = 0; i < 3; i++) unit(s, 'player', 'capguard', 12, 3.5 + i * 0.7);
    steps(s, 10 + s.compiled.player.knitTicks);
    expect(s.stats.player.merges['2']).toBe(1);
    expect(s.sides.player.gold).toBe(g0 + 4);
    expect(s.stats.player.goldEarned.effects).toBe(4);
  });

  it('unitDeath → explode hits every enemy in the radius at full damage, next tick', () => {
    const s = still([on('player', { triggers: [{ on: 'unitDeath', do: [{ explode: { damage: 10, damageType: 'crush', radius: 1 } }] }] })]);
    const dying = unit(s, 'player', 'sporeling', 10, 3);
    const a = unit(s, 'enemy', 'capguard', 10.6, 3);
    const b = unit(s, 'enemy', 'capguard', 10, 3.8);
    const far = unit(s, 'enemy', 'capguard', 12.5, 3);
    dying.hp = 0;
    steps(s, 1); // dies; the burst is scheduled
    const hp0 = [a.hp, b.hp, far.hp];
    steps(s, 1);
    const expected = Math.round(10 * content.balance.matrix.crush.medium);
    expect(hp0[0]! - a.hp).toBeGreaterThanOrEqual(expected);
    expect(hp0[1]! - b.hp).toBeGreaterThanOrEqual(expected);
    expect(far.hp).toBe(hp0[2]);
  });

  it('enemyUnitKilled respects sporestormGte', () => {
    const s = still([on('player', { triggers: [{ on: 'enemyUnitKilled', if: { sporestormGte: 1 }, do: [{ gainGold: 1 }] }] })]);
    const g0 = s.sides.player.gold;
    unit(s, 'enemy', 'sporeling', 20, 3).hp = 0;
    steps(s, 1);
    expect(s.sides.player.gold).toBe(g0);
    s.sporestorm = 1;
    unit(s, 'enemy', 'sporeling', 20, 3).hp = 0;
    steps(s, 1);
    expect(s.sides.player.gold).toBe(g0 + 1);
  });

  it('waveStart → repairHeartcapPct repairs at each new wave, capped at max', () => {
    const s = still([on('player', { triggers: [{ on: 'waveStart', do: [{ repairHeartcapPct: 0.02 }] }] })]);
    s.sides.player.heartcapHp = 1000;
    s.tick = s.rules.waveTicks - 1;
    steps(s, 1);
    expect(s.sides.player.heartcapHp).toBe(1000 + Math.round(s.sides.player.heartcapMaxHp * 0.02));
  });

  it('buildingDestroyed fires for the side that lost the building', () => {
    const s = still([on('player', { triggers: [{ on: 'buildingDestroyed', do: [{ gainGold: 25 }] }] })]);
    const g = { p: s.sides.player.gold, e: s.sides.enemy.gold };
    building(s, 'player', 'capguardHall', 0, 0).hp = 0;
    building(s, 'enemy', 'capguardHall', 28, 0).hp = 0;
    steps(s, 1);
    expect(s.sides.player.gold - g.p).toBe(25);
    expect(s.sides.enemy.gold).toBe(g.e);
  });
});
