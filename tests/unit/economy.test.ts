import { describe, expect, it } from 'vitest';
import { priceAt } from '../../src/sim/index.ts';
import { incomeSystem } from '../../src/sim/systems/economy.ts';
import { building, liveState, setBorders } from '../helpers.ts';

function incomeAt(s: ReturnType<typeof liveState>, tick: number): number {
  const before = s.sides.player.gold;
  s.tick = tick;
  incomeSystem(s);
  return s.sides.player.gold - before;
}

describe('economy (SPEC §6.2–6.3)', () => {
  it('pays the stipend every income tick and nothing in between', () => {
    const s = liveState({ map: 'bogwater-hollow' });
    expect(incomeAt(s, 99)).toBe(0);
    expect(incomeAt(s, 100)).toBe(8);
  });

  it('Truffle Cellar: +4, ×1.5 on loam, halved (floor) while besieged', () => {
    const s = liveState({ map: 'bogwater-hollow' });
    setBorders(s, 12, 28);
    building(s, 'player', 'truffleCellar', 0, 0);
    expect(incomeAt(s, 100)).toBe(8 + 4);
    building(s, 'player', 'truffleCellar', 10, 0); // cols 10–11 rows 0–1 are Rich Loam
    expect(incomeAt(s, 200)).toBe(8 + 4 + 6);
    s.buildings[1]!.lastDamagedTick = 290;
    expect(incomeAt(s, 300)).toBe(8 + 4 + 3);
    s.buildings[0]!.lastDamagedTick = 390;
    s.buildings[1]!.lastDamagedTick = 0;
    expect(incomeAt(s, 400)).toBe(8 + 2 + 6);
  });

  it('comeback income: min(6, floor(deficit / 2)) for the side behind', () => {
    const s = liveState({ map: 'bogwater-hollow' });
    setBorders(s, 3, 21); // player 4 columns, enemy 11 → deficit 7
    expect(incomeAt(s, 100)).toBe(8 + 3);
    setBorders(s, 3, 10); // deficit 18 → capped at 6
    expect(incomeAt(s, 200)).toBe(8 + 6);
    const e0 = s.sides.enemy.gold;
    incomeAt(s, 300);
    expect(s.sides.enemy.gold - e0).toBe(8);
  });

  it('interest at wave boundaries: floor(gold / 20), capped at 10', () => {
    const s = liveState({ map: 'bogwater-hollow' });
    s.sides.player.gold = 139;
    expect(incomeAt(s, 1200)).toBe(8 + 7); // floor(147 / 20) after the stipend
    s.sides.player.gold = 1000;
    expect(incomeAt(s, 2400)).toBe(8 + 10);
  });

  it('supply-line price: ceil(cost × (1 + 0.05 × depth)) in integer arithmetic', () => {
    const s = liveState({ map: 'bogwater-hollow' });
    expect(priceAt(s, 'player', 'capguardHall', 2)).toBe(150); // home
    expect(priceAt(s, 'player', 'capguardHall', 8)).toBe(195); // cols 8–9: depth 6 → ×1.30
    expect(priceAt(s, 'player', 'sporelingBurrow', 4)).toBe(121); // depth 2 → 110 × 1.1
    expect(priceAt(s, 'enemy', 'capguardHall', 22)).toBe(195); // mirrored
    expect(priceAt(s, 'player', 'truffleCellar', 5)).toBe(173); // depth 3 → 172.5 → 173
  });
});
