// The report of a battle in rounds (SPEC §10.4, §10.5, §6.5, §6.7) (A068): its round chart has one column per
// round, equal to that round's Heartcap damage both ways, with each Heartcap's HP after it, and on Twin Roots one
// half-pip per lane under the column, which stays one bar; its gold rows add up to the gold the side earned; and
// the outcome reads right for a Rout in round 6 and for a Decision after round 9, with each side's damage dealt
// as a share of the other's max HP (X5). The report's figures are plain functions of the state, so these run
// in Node without a page.
import { describe, expect, it } from 'vitest';
import type { RoundScenarioDef } from '../../../src/data/schema.ts';
import { createFromScenario, runHeadless, step } from '../../../src/sim/rounds/index.ts';
import type { BattleState, Side } from '../../../src/sim/rounds/index.ts';
import { resultOf } from '../../../src/ui/rounds/hud/explain.ts';
import { bankedByRound, goldBySource, outcomeText, roundChart } from '../../../src/ui/rounds/report.ts';
import { content, finishRound, fromScenario, playerScript, scriptedBattle } from '../../roundHelpers.ts';

/** Plays the round to its end and steps the aftermath, which ends the battle after its last round. */
function finish(s: BattleState): BattleState {
  finishRound(s);
  step(s);
  return s;
}

/** Round 6, with the general's Heartcap all but gone and nothing of its own in the lane: your Capguards take it. */
const ROUT_ROUND_6: RoundScenarioDef = {
  id: 'report-rout-6', description: 'report test: a Rout in round 6', map: 'bogwater-hollow', round: 6,
  sides: {
    player: { colony: [{ building: 'capguardHall', lane: 0, rank: 0, file: 2, merge: false }] },
    enemy: { heartcapHp: 1 },
  },
};

const earned = (s: BattleState, side: Side) => Object.values(s.stats[side].goldEarned).reduce((a, b) => a + b, 0);
const sum = (rows: { value: number }[]) => rows.reduce((n, r) => n + r.value, 0);

describe('the round chart (§10.4, A068)', () => {
  it('has one column per round, each its Heartcap damage both ways and the HP after it', () => {
    const s = scriptedBattle();
    runHeadless(s, { until: 'end', commands: playerScript(9) });
    const chart = roundChart(s);
    expect(chart).toHaveLength(s.rounds.length);
    expect(chart.map((c) => c.round)).toEqual(s.rounds.map((r) => r.round));
    expect(chart.map((c) => [c.dealt, c.taken])).toEqual(s.rounds.map((r) => [r.damage.player, r.damage.enemy]));
    expect(chart.map((c) => c.hp)).toEqual(s.rounds.map((r) => r.heartcaps));
    expect(chart.map((c) => c.storm)).toEqual(s.rounds.map((r) => r.stormBp > 10000));
    // one lane: no half-pips
    expect(chart.every((c) => c.lanes.length === 0)).toBe(true);
  });

  it('keeps a Twin Roots column one bar, the capped total, with each lane\'s result as a half-pip under it', () => {
    const s = fromScenario('split-lanes');
    finishRound(s);
    const [col] = roundChart(s);
    const r = s.rounds[0]!;
    expect(col!.dealt).toBe(r.damage.player);
    expect(col!.taken).toBe(r.damage.enemy);
    expect(col!.lanes).toEqual(r.lanes.map((l) => resultOf(l.winner)));
    expect(col!.lanes).toHaveLength(2);
  });
});

describe('gold by source (§10.4, §6.2)', () => {
  it('adds up to the gold each side earned in the battle, and names the gold banked at each Begin', () => {
    const s = scriptedBattle();
    runHeadless(s, { until: 'end', commands: playerScript(9) });
    for (const side of ['player', 'enemy'] as const) {
      const rows = goldBySource(s, side);
      expect(sum(rows), side).toBe(earned(s, side));
      expect(rows.every((r) => r.value > 0), side).toBe(true);
    }
    expect(goldBySource(s, 'player').map((r) => r.label)).toContain('Stipend');
    expect(bankedByRound(s)).toEqual(s.rounds.map((r) => r.stats.player.maxGoldBanked));
  });
});

describe('the outcome (§10.4, §6.5)', () => {
  it('names the round of a Rout', () => {
    const s = finish(createFromScenario(content, ROUT_ROUND_6));
    expect(s.outcome).toEqual({ winner: 'player', by: 'rout', round: 6 });
    const text = outcomeText(s);
    expect(text).toMatch(/^The Velvet Bloom wins by Rout in round 6/);
    expect(text).toContain("the Gray Rot's Heartcap fell");
  });

  it('gives a Decision after round 9 with each side\'s damage dealt, as a share of the other\'s max HP', () => {
    // you dealt 1400 of the general's 2000 (70%); it dealt 1800 of your 3000 (60%) once its Capguards take round 9
    const s = finish(fromScenario('decision-round-9'));
    expect(s.outcome).toMatchObject({ winner: 'player', by: 'decision', round: 9 });
    const dealt = (side: Side) => s.rounds.reduce((n, r) => n + r.damage[side], 0);
    expect([dealt('player'), dealt('enemy')]).toEqual([1400, 1800]);
    const text = outcomeText(s);
    expect(text).toMatch(/^The Velvet Bloom wins by Decision after round 9/);
    expect(text).toContain('1400');
    expect(text).toContain('70%');
    expect(text).toContain('1800');
    expect(text).toContain('60%');
  });
});
