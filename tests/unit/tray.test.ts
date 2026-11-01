// The tray's price (docs/ideas/after-the-rework.md, "The tray's price"): each card shows the cheapest
// price you can build it for right now, so a lit card never fails on gold. Once no home plot is free
// that's the nearest forward plot's, with the supply line (SPEC §6.3).
import { describe, expect, it } from 'vitest';
import { queueCommand } from '../../src/sim/index.ts';
import type { BattleModifier, BattleState } from '../../src/sim/index.ts';
import { cheapestPrice } from '../../src/ui/hud/tray.ts';
import { building, liveState, setBorders } from '../helpers.ts';

/** Bogwater Hollow's home columns (0–3, rows 0–7) filled with 2×2 buildings whose left column is `col`. */
function fillHome(s: BattleState, cols: number[]): void {
  for (const row of [0, 2, 4, 6]) for (const col of cols) building(s, 'player', 'truffleCellar', col, row);
}

describe("the tray's price", () => {
  it("is the building's own price while a home plot is free", () => {
    const s = liveState({ map: 'bogwater-hollow' });
    expect(cheapestPrice(s, 'capguardHall')).toBe(150);
    expect(cheapestPrice(s, 'sporelingBurrow')).toBe(110);
    fillHome(s, [0]);
    expect(cheapestPrice(s, 'capguardHall')).toBe(150); // columns 2–3 are still free
  });

  it("is the nearest forward plot's once home is full, and null with nowhere to build", () => {
    const s = liveState({ map: 'bogwater-hollow' });
    fillHome(s, [0, 2]);
    expect(cheapestPrice(s, 'capguardHall')).toBeNull(); // the home columns are all the player holds
    setBorders(s, 9, 28);
    expect(cheapestPrice(s, 'capguardHall')).toBe(165); // columns 4–5: 2 past home, ×1.10
    expect(cheapestPrice(s, 'sporelingBurrow')).toBe(121);
  });

  it('counts a plot that straddles the home line as one column past home', () => {
    const s = liveState({ map: 'bogwater-hollow' });
    setBorders(s, 9, 28);
    fillHome(s, [1]); // leaves column 0 and column 3 free, neither wide enough alone
    expect(cheapestPrice(s, 'capguardHall')).toBe(158); // columns 3–4: 150 × 1.05 = 157.5, rounded up
  });

  it("skips a plot the player's queued placement will take, but not the enemy's", () => {
    const s = liveState({ map: 'bogwater-hollow' });
    setBorders(s, 9, 28);
    fillHome(s, [0]);
    for (const row of [0, 2, 4]) building(s, 'player', 'truffleCellar', 2, row);
    expect(cheapestPrice(s, 'capguardHall')).toBe(150); // columns 2–3, rows 6–7
    queueCommand(s, { tick: s.tick + 1, side: 'enemy', type: 'place', buildingId: 'truffleCellar', lane: 0, col: 2, row: 6 });
    expect(cheapestPrice(s, 'capguardHall')).toBe(150);
    queueCommand(s, { tick: s.tick + 1, side: 'player', type: 'place', buildingId: 'truffleCellar', lane: 0, col: 2, row: 6 });
    expect(cheapestPrice(s, 'capguardHall')).toBe(165);
  });

  it('takes the cheapest plot in any lane on a two-lane map', () => {
    const s = liveState({ map: 'twin-roots' }); // lanes on rows 0–5 and 7–12
    for (const row of [0, 2, 4]) for (const col of [0, 2]) building(s, 'player', 'truffleCellar', col, row);
    setBorders(s, 9, 28, 0);
    expect(cheapestPrice(s, 'capguardHall')).toBe(150); // lane 1's home is still free
    for (const row of [7, 9, 11]) for (const col of [0, 2]) building(s, 'player', 'truffleCellar', col, row).lane = 1;
    expect(cheapestPrice(s, 'capguardHall')).toBe(165); // lane 0, columns 4–5
    setBorders(s, 3, 28, 0);
    setBorders(s, 7, 28, 1);
    expect(cheapestPrice(s, 'capguardHall')).toBe(165); // lane 1, columns 4–5
    setBorders(s, 3, 28, 1);
    expect(cheapestPrice(s, 'capguardHall')).toBeNull();
  });

  it("follows the side's own supply line (Forward Spores halves it)", () => {
    const half: BattleModifier = { side: 'player', source: 'test', effects: { modifiers: [{ stat: 'side.supplyLineRate', op: 'mul', value: 0.5 }] } };
    const s = liveState({ map: 'bogwater-hollow', modifiers: [half] });
    setBorders(s, 9, 28);
    fillHome(s, [0, 2]);
    expect(cheapestPrice(s, 'capguardHall')).toBe(158); // 2 past home at 2.5% a column: 157.5, rounded up
  });
});
