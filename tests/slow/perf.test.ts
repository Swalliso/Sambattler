// G11's round budgets (SPEC §12.3, §13.7, §15.4; R2a/T113, A113), on the round bench's cases
// (`tools/lib/rounds/bench.ts`, plan Call 24): a tick of bench-300's clash at 300 live units, the arrival of two
// full colonies, the general's planning turn, one battle of rounds with bots on both sides, and the sim part of a
// planning command. Every budget is G11's in `data/balance-targets.json` (T119, folded in R2b's T129): v1's
// tick and battle budgets, and the arrival, the turn, the planning command and the full colony, new in v2. The
// 4 ms Chromium figure for the whole command is `tests/browser/rounds/perf.test.ts`'s.
import { describe, expect, it } from 'vitest';
import { nodeContent } from '../../tools/lib/content.ts';
import { bench300, fullBattle, fullColonyClashes, generalTurns, planCommand } from '../../tools/lib/bench.ts';

const content = nodeContent();
const g = content.targets.G11;

describe("G11's round budgets (§13.7)", () => {
  it('a tick of bench-300 at 300 live units: mean ≤ 1.0 ms and p99 ≤ 2.5 ms, weighted by live units, peaking at 300', () => {
    const r = bench300(content, g.benchTicks);
    expect(r.ticks).toBe(g.benchTicks);
    expect(r.peakUnits).toBeGreaterThanOrEqual(300);
    expect(r.meanMs).toBeLessThanOrEqual(g.tickMeanMs);
    expect(r.p99Ms).toBeLessThanOrEqual(g.tickP99Ms);
  });

  it('the arrival of two full colonies: ≤ 5 ms, with at most 150 live units a side', () => {
    for (const c of fullColonyClashes(content)) {
      expect({ field: c.field, fits: c.units <= g.colonyUnits }).toEqual({ field: c.field, fits: true });
      expect(c.arrivalMs, `${c.field}'s arrival`).toBeLessThanOrEqual(g.arrivalMs);
    }
  });

  it("the general's planning turn ≤ 20 ms", () => {
    const t = generalTurns(content, [1, 2, 3]);
    expect(t.turns).toBeGreaterThan(0);
    expect(t.maxMs, `${t.worst.enemy}, seed ${t.worst.seed}, round ${t.worst.round}`).toBeLessThanOrEqual(g.generalTurnMs);
  });

  it('one battle of rounds with bots on both sides ≤ 3 s', () => {
    const b = fullBattle(content);
    expect(b.rounds).toBeGreaterThan(0);
    expect(b.wallMs).toBeLessThanOrEqual(g.battleWallMs);
  });

  it("a planning command's sim part, a plant then formationOf and mergePreview, under its Node budget", () => {
    for (const c of planCommand(content, 50)) expect(c.maxMs, `${c.field}'s plant`).toBeLessThanOrEqual(g.planCommandMs);
  });
});
