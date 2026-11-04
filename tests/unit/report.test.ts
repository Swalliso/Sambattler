// The report of a battle in rounds (SPEC §10.4, §10.5, §6.5, §6.7) (A068): its round chart has one column per
// round, equal to that round's Heartcap damage both ways, with each Heartcap's HP after it, and on Twin Roots one
// half-pip per lane under the column, which stays one bar; its gold rows add up to the gold the side earned; and
// the outcome reads right for a Rout in round 6 and for a Decision after round 9, with each side's damage dealt
// as a share of the other's max HP (X5). The report's figures are plain functions of the state, so these run
// in Node without a page.
import { describe, expect, it } from 'vitest';
import type { ScenarioDef } from '../../src/data/schema.ts';
import { chooseNode, createRun, finishBattle } from '../../src/run/index.ts';
import type { RunState } from '../../src/run/index.ts';
import { createBattle, createFromScenario, runHeadless, step } from '../../src/sim/index.ts';
import type { BattleState, Side } from '../../src/sim/index.ts';
import { resultOf } from '../../src/ui/hud/explain.ts';
import { bankedByRound, bannerLine, goldBySource, outcomeText, resultNotice, roundChart, runLine, runLinesOf } from '../../src/ui/report.ts';
import { command, content, finishRound, fromScenario, playerScript, scriptedBattle } from '../helpers.ts';

/** Plays the round to its end and steps the aftermath, which ends the battle after its last round. */
function finish(s: BattleState): BattleState {
  finishRound(s);
  step(s);
  return s;
}

/** Round 6, with the general's Heartcap all but gone and nothing of its own in the lane: your Capguards take it. */
const ROUT_ROUND_6: ScenarioDef = {
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
    // you dealt 1400 of the general's 2000 (70%); it dealt 1950 of your 3000 (65%) once its Capguards take round 9
    const s = finish(fromScenario('decision-round-9'));
    expect(s.outcome).toMatchObject({ winner: 'player', by: 'decision', round: 9 });
    const dealt = (side: Side) => s.rounds.reduce((n, r) => n + r.damage[side], 0);
    expect([dealt('player'), dealt('enemy')]).toEqual([1400, 1950]);
    const text = outcomeText(s);
    expect(text).toMatch(/^The Velvet Bloom wins by Decision after round 9/);
    expect(text).toContain('1400');
    expect(text).toContain('70%');
    expect(text).toContain('1950');
    expect(text).toContain('65%');
  });
});

// R2b/T094, T098: a run battle's report reads its BattleRecord, written as the battle ended (R2-Q22)
describe("a run battle's lines (§10.4, §10.5, §8.5)", () => {
  /** A run at its first node of `kind`, with that battle ended at once: `winner` by Rout, so it has no rounds to name. */
  function endedAt(seed: number, kind: 'battle' | 'elite', winner: Side): { run: RunState; state: BattleState } {
    const run = createRun(content, { seed });
    const row = run.route.findIndex((r) => r.some((n) => n.kind === kind));
    run.path = Array.from({ length: row }, () => 0);
    chooseNode(content, run, run.route[row]!.findIndex((n) => n.kind === kind));
    if (run.screen.kind !== 'battle') throw new Error('not in battle');
    const state = createBattle(content, run.screen.config);
    state.phase = 'ended';
    state.outcome = { winner, by: 'rout', round: 5 };
    return { run, state };
  }

  it("a loss's name the Regrowth lost and those left, and pay nothing; a single battle's say nothing of lives", () => {
    // a run's first battle played by a human who plants nothing, so the general routs it
    const run = createRun(content, { seed: 9 });
    chooseNode(content, run, 0);
    if (run.screen.kind !== 'battle') throw new Error('not in battle');
    const state = createBattle(content, run.screen.config);
    while (state.phase !== 'ended') {
      if (state.phase !== 'planning') step(state);
      else command(state, 'player', state.sides.player.draft ? { type: 'draftSkip' } : { type: 'beginClash' });
    }
    expect(state.outcome).toMatchObject({ winner: 'enemy', by: 'rout' });
    const plots = run.plotsGained;
    const record = finishBattle(content, run, state);
    const lines = runLinesOf(record, run, plots);
    expect(runLine(lines)).toBe('You lose a Regrowth: 2 of 3 left.');
    expect(bannerLine(state, lines)).not.toMatch(/Spores|Amber/);
    expect(resultNotice(record, run)).toBe(`Lost by Rout in round ${state.outcome!.round} · a Regrowth lost, 2 of 3 left`);
    expect(bannerLine(state)).not.toMatch(/Regrowth|Spores|Amber/);
  });

  it("a win's banner has its Spores and the Amber the battle's end rolled, an elite's chance included (R2-Q22)", () => {
    const rolled = new Set<number>();
    for (let seed = 1; seed <= 40 && rolled.size < 2; seed++) {
      const { run, state } = endedAt(seed, 'elite', 'player');
      const amber = run.amber, plots = run.plotsGained;
      const record = finishBattle(content, run, state);
      expect(record.amber, `seed ${seed}`).toBe(run.amber - amber);
      rolled.add(record.amber!);
      const banner = bannerLine(state, runLinesOf(record, run, plots));
      expect(banner).toContain(`+${record.spores} Spores`);
      expect(banner.includes('Amber'), `seed ${seed}: ${banner}`).toBe(record.amber! > 0);
      if (record.amber) expect(banner).toContain(`+${record.amber} Amber`);
      expect(runLine(runLinesOf(record, run, plots))).toBe('Your colony gains a plot.');
      expect(resultNotice(record, run)).toBe(`Won by Rout · +${record.spores} Spores${record.amber ? ` · +${record.amber} Amber` : ''}`);
    }
    // the elite's 25% chance came up both ways
    expect([...rolled].sort()).toEqual([0, 1]);
  });
});

