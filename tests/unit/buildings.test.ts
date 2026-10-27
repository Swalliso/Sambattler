import { describe, expect, it } from 'vitest';
import { placementProblem, queueCommand, sellValue } from '../../src/sim/index.ts';
import { building, liveState, setBorders, steps, unit } from '../helpers.ts';
import { content } from '../helpers.ts';
import { createBattle, makeConfig, step } from '../../src/sim/index.ts';

describe('buildings (SPEC §4.4)', () => {
  it('placement legality: own territory, buildable, unoccupied, one lane', () => {
    const s = liveState({ map: 'bogwater-hollow' });
    expect(placementProblem(s, 'player', 'capguardHall', 0, 0, 0)).toBeNull();
    expect(placementProblem(s, 'player', 'capguardHall', 0, 3, 0)).toBe('not your territory');
    expect(placementProblem(s, 'player', 'capguardHall', 0, 0, 7)).toBe('must fit inside one lane');
    setBorders(s, 9, 28);
    expect(placementProblem(s, 'player', 'capguardHall', 0, 7, 4)).toBe('a stump is in the way'); // stump at (7, 5)
    building(s, 'player', 'capguardHall', 0, 0);
    expect(placementProblem(s, 'player', 'capguardHall', 0, 1, 1)).toBe('occupied');
  });

  it('first spawn at half the interval, then every interval', () => {
    const s = liveState();
    s.rules.test.turrets = false;
    building(s, 'player', 'capguardHall', 0, 0); // 15 s interval → 150, 450
    const spawnTicks: number[] = [];
    for (let i = 0; i < 460; i++) {
      step(s);
      if (s.events.some((e) => e.t === 'spawned')) spawnTicks.push(s.tick);
    }
    expect(spawnTicks).toEqual([150, 450]);
  });

  it('holds at the supply cap until the batch fits', () => {
    const s = liveState();
    s.rules.test.turrets = false;
    s.sides.player.supplyCap = 1;
    const b = building(s, 'player', 'sporelingBurrow', 0, 0); // needs 2 supply
    steps(s, 200);
    expect(b.holding).toBe(true);
    expect(s.units).toHaveLength(0);
    s.sides.player.supplyCap = 60;
    steps(s, 1);
    expect(s.units).toHaveLength(2);
    expect(b.holding).toBe(false);
  });

  it('besieged spawners run at half speed', () => {
    const s = liveState();
    s.rules.test.turrets = false;
    const b = building(s, 'player', 'capguardHall', 0, 0);
    for (let i = 0; i < 300; i++) { b.lastDamagedTick = s.tick; step(s); }
    expect(s.units.filter((u) => u.side === 'player')).toHaveLength(1);
    expect(s.stats.player.spawned.capguard).toBe(1);
  });

  it('selling: 100% in deploy or before production within 10 s, 60% after, never while besieged', () => {
    const s = createBattle(content, makeConfig(content, { seed: 1, mapId: 'test-flat', player: 'human', enemy: 'human' }));
    queueCommand(s, { tick: 0, side: 'player', type: 'place', buildingId: 'capguardHall', lane: 0, col: 0, row: 0 });
    step(s);
    const id = s.buildings[0]!.id;
    expect(s.sides.player.gold).toBe(150);
    queueCommand(s, { tick: 0, side: 'player', type: 'sell', entityId: id });
    step(s);
    expect(s.sides.player.gold).toBe(300);

    const fresh = liveState();
    const unproductive = building(fresh, 'player', 'capguardHall', 0, 0);
    steps(fresh, 100); // still before its first spawn
    expect(sellValue(fresh, unproductive.id)).toBe(150);
    const before = fresh.sides.player.gold;
    queueCommand(fresh, { tick: fresh.tick + 1, side: 'player', type: 'sell', entityId: unproductive.id });
    step(fresh);
    expect(fresh.sides.player.gold - before).toBe(150);

    const l = liveState();
    l.rules.test.turrets = false;
    const b = building(l, 'player', 'capguardHall', 0, 0);
    b.placedTick = 0;
    steps(l, 250);
    queueCommand(l, { tick: l.tick + 1, side: 'player', type: 'sell', entityId: b.id });
    const g0 = l.sides.player.gold;
    step(l);
    expect(l.sides.player.gold - g0).toBe(90);

    const c = liveState();
    c.rules.test.turrets = false;
    const b2 = building(c, 'player', 'capguardHall', 0, 0);
    b2.lastDamagedTick = 0;
    queueCommand(c, { tick: 1, side: 'player', type: 'sell', entityId: b2.id });
    step(c);
    expect(c.buildings).toHaveLength(1);
    expect(c.events.some((e) => e.t === 'commandRejected' && e.reason.includes('besieged'))).toBe(true);
  });

  it('repeated spawn-and-sell cycles pay the normal refund instead of generating free units', () => {
    const s = liveState();
    s.rules.test.turrets = false;
    for (let cycle = 0; cycle < 4; cycle++) {
      queueCommand(s, { tick: s.tick + 1, side: 'player', type: 'place', buildingId: 'gillNest', lane: 0, col: 0, row: 0 });
      step(s);
      const b = s.buildings[0]!;
      steps(s, 150);
      expect(sellValue(s, b.id)).toBe(90);
      const before = s.sides.player.gold;
      queueCommand(s, { tick: s.tick + 1, side: 'player', type: 'sell', entityId: b.id });
      step(s);
      expect(s.sides.player.gold - before).toBe(90);
    }
    expect(s.stats.player.spawned.gillArcher).toBe(4);
    expect(s.stats.player.buildingsSold).toBe(4);
    expect(s.stats.player.rejectedCommands).toBe(0);
    expect(s.sides.player.gold).toBe(300 + s.stats.player.goldEarned.stipend - 4 * 60);
  });

  it('losing its spawned units does not restore a full refund', () => {
    const s = liveState();
    const b = building(s, 'player', 'capguardHall', 0, 0);
    steps(s, 150);
    s.units[0]!.hp = 0;
    step(s);
    expect(s.units).toHaveLength(0);
    expect(sellValue(s, b.id)).toBe(90);
    queueCommand(s, { tick: s.tick + 1, side: 'player', type: 'sell', entityId: b.id });
    const before = s.sides.player.gold;
    step(s);
    expect(s.sides.player.gold - before).toBe(90);
  });

  it('an income payout or tower shot also ends the full-refund grace period', () => {
    const economy = liveState();
    const cellar = building(economy, 'player', 'truffleCellar', 0, 0);
    expect(sellValue(economy, cellar.id)).toBe(150);
    steps(economy, 100);
    expect(economy.stats.player.goldByBuilding[String(cellar.id)]).toBe(4);
    expect(sellValue(economy, cellar.id)).toBe(90);
    queueCommand(economy, { tick: economy.tick + 1, side: 'player', type: 'sell', entityId: cellar.id });
    const before = economy.sides.player.gold;
    step(economy);
    expect(economy.sides.player.gold - before).toBe(90);

    const battle = liveState();
    battle.rules.test.turrets = false;
    const mortar = building(battle, 'player', 'puffballMortar', 0, 0);
    unit(battle, 'enemy', 'capguard', 5, 1);
    expect(sellValue(battle, mortar.id)).toBe(160);
    step(battle);
    expect(mortar.lastAttackTick).toBe(1);
    expect(sellValue(battle, mortar.id)).toBe(96); // even before the projectile lands
  });

  it('a supply-blocked spawner retains its refund until it actually spawns', () => {
    const s = liveState();
    s.sides.player.supplyCap = 0;
    const b = building(s, 'player', 'capguardHall', 0, 0);
    steps(s, 150);
    expect(b.holding).toBe(true);
    expect(sellValue(s, b.id)).toBe(150);
    s.sides.player.supplyCap = 60;
    step(s);
    expect(sellValue(s, b.id)).toBe(90);
  });

  it('refund relics still apply after a building produces', () => {
    const config = makeConfig(content, { seed: 1, mapId: 'test-flat', player: 'human', enemy: 'human' });
    config.player.relics = ['secondFlush'];
    const s = createBattle(content, config);
    s.phase = 'live';
    const b = building(s, 'player', 'gillNest', 0, 0);
    expect(sellValue(s, b.id)).toBe(150);
    steps(s, 150);
    expect(sellValue(s, b.id)).toBe(120);
    queueCommand(s, { tick: s.tick + 1, side: 'player', type: 'sell', entityId: b.id });
    const before = s.sides.player.gold;
    step(s);
    expect(s.sides.player.gold - before).toBe(120);
  });

  it('units already spawned stay when their building is sold', () => {
    const s = liveState();
    s.rules.test.turrets = false;
    const b = building(s, 'player', 'sporelingBurrow', 0, 0);
    steps(s, 170);
    expect(s.units.length).toBe(2);
    queueCommand(s, { tick: s.tick + 1, side: 'player', type: 'sell', entityId: b.id });
    step(s);
    expect(s.buildings).toHaveLength(0);
    expect(s.units.length).toBe(2);
    void unit;
  });
});
