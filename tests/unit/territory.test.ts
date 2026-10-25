import { describe, expect, it } from 'vitest';
import { building, liveState, steps, unit } from '../helpers.ts';

const flipTicks = (s: ReturnType<typeof liveState>) => s.rules.captureThreshold / s.rules.captureStep;

describe('territory: column tug-of-war (SPEC §4.3)', () => {
  it('captures only the frontier column, after captureSeconds of presence', () => {
    const s = liveState();
    expect(s.lanes[0]!.pBorder).toBe(3);
    unit(s, 'player', 'capguard', 6.5, 4); // in column 6, not the frontier (4)
    s.units[0]!.spawnY = 4;
    const sp = s.compiled.player.units.capguard!;
    sp.speedPerTick = 0; // hold still
    steps(s, flipTicks(s) + 5);
    expect(s.lanes[0]!.pBorder).toBe(3);
    s.units[0]!.x = 4.5; // now in the frontier
    steps(s, flipTicks(s) - 1);
    expect(s.lanes[0]!.pBorder).toBe(3);
    steps(s, 1);
    expect(s.lanes[0]!.pBorder).toBe(4);
    expect(s.lanes[0]!.owner[4]).toBe(1);
  });

  it('needs presence ≥ 1.5× the defender, and decays otherwise', () => {
    const s = liveState();
    for (const side of ['player', 'enemy'] as const) s.compiled[side].units.capguard!.speedPerTick = 0;
    for (const side of ['player', 'enemy'] as const) s.compiled[side].units.sporeling!.speedPerTick = 0;
    s.rules.test.turrets = false;
    // 2 (capguard) vs 2 (two sporelings, too far apart to fight? place them in column 4 out of aggro is impossible) → use ratios
    unit(s, 'player', 'capguard', 4.2, 0.5);
    unit(s, 'enemy', 'sporeling', 4.8, 7.5);
    for (const u of s.units) u.spawnY = u.y;
    // A = 2, D = 1 → 2 ≥ 1.5 → progress
    s.units.forEach((u) => { u.cooldown = 1e9; });
    steps(s, 10);
    expect(s.lanes[0]!.capture.player.progress).toBe(10 * s.rules.captureStep);
    unit(s, 'enemy', 'sporeling', 4.6, 7.0); // D = 2 → 2 < 3 → decay
    s.units.forEach((u) => { u.cooldown = 1e9; u.spawnY = u.y; });
    steps(s, 2);
    expect(s.lanes[0]!.capture.player.progress).toBe(10 * s.rules.captureStep - 2 * s.rules.captureDecay);
  });

  it('forts block the flip until the building falls; home columns never flip', () => {
    const s = liveState({ borders: [7, 8] });
    s.rules.test.turrets = false;
    const b = building(s, 'player', 'truffleCellar', 6, 0);
    unit(s, 'enemy', 'capguard', 7.5, 6);
    s.compiled.enemy.units.capguard!.speedPerTick = 0;
    s.units[0]!.cooldown = 1e9;
    steps(s, flipTicks(s) * 3);
    expect(s.lanes[0]!.pBorder).toBe(7);
    b.hp = 0;
    steps(s, 1); // building removed at the death step; capture then accrues
    steps(s, flipTicks(s) + 1);
    expect(s.lanes[0]!.pBorder).toBe(6);
    expect(s.lanes[0]!.eBorder).toBe(7);

    const h = liveState({ borders: [3, 4] });
    h.rules.test.turrets = false;
    h.rules.test.heartcapTargets = false;
    unit(h, 'enemy', 'capguard', 3.5, 4);
    h.compiled.enemy.units.capguard!.speedPerTick = 0;
    steps(h, flipTicks(h) * 4);
    expect(h.lanes[0]!.pBorder).toBe(3);
    expect(h.lanes[0]!.owner[3]).toBe(1);
  });

  it('a single neutral column is contested by both sides', () => {
    const s = liveState({ borders: [14, 16] });
    s.rules.test.turrets = false;
    expect(s.lanes[0]!.capture.player.column).toBe(15);
    expect(s.lanes[0]!.capture.enemy.column).toBe(15);
    unit(s, 'enemy', 'capguard', 15.5, 1);
    s.compiled.enemy.units.capguard!.speedPerTick = 0;
    steps(s, flipTicks(s));
    expect(s.lanes[0]!.eBorder).toBe(15);
    expect(s.lanes[0]!.pBorder).toBe(14);
    expect(s.events.some((e) => e.t === 'columnFlipped')).toBe(true);
  });
});
