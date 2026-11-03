import { describe, expect, it } from 'vitest';
import { hashState, queueCommand, runHeadless } from '../../../src/sim/rounds/index.ts';
import type { BattleState } from '../../../src/sim/rounds/index.ts';
import { planningState, playerScript, scriptedBattle } from '../../roundHelpers.ts';

/** The clash checkpoints every `every` ticks of a clash `length` ticks long (plan Call 17). */
const tickKeys = (round: number, length: number, every = 200): string[] =>
  Array.from({ length: Math.floor(length / every) }, (_, i) => `r${round}:${(i + 1) * every}`);
const clashLength = (s: BattleState, round: number): number => Math.max(...s.rounds[round - 1]!.lanes.map((l) => l.ticks));

describe('runHeadless by phase (SPEC §14.6, §15.2)', () => {
  it("plays to the battle's end", () => {
    const s = scriptedBattle();
    runHeadless(s, { until: 'end', commands: playerScript(9) });
    expect(s.phase).toBe('ended');
    expect(s.outcome).toBeDefined();
  });

  it("stops at a round's end, in its aftermath", () => {
    const s = scriptedBattle();
    runHeadless(s, { until: { round: 2 }, commands: playerScript(9) });
    expect([s.round, s.phase, s.rounds.length]).toEqual([2, 'aftermath', 2]);
  });

  it("stops at a tick of a round's clash, counted from the clash's start", () => {
    const s = scriptedBattle();
    runHeadless(s, { until: { round: 2, tick: 150 }, commands: playerScript(9) });
    expect([s.round, s.phase, s.tick - s.clash!.startTick]).toEqual([2, 'clash', 150]);
    expect(s.clash!.startTick).toBe(clashLength(s, 1));
    // tick 0 is the clash as Begin leaves it, with the muster resolved and no tick run
    const begun = scriptedBattle();
    runHeadless(begun, { until: { round: 1, tick: 0 }, commands: playerScript(9) });
    expect([begun.phase, begun.tick]).toEqual(['clash', 0]);
  });

  it("records hashes at Call 17's checkpoints, in battle order, and summaries where asked", () => {
    const s = scriptedBattle();
    const res = runHeadless(s, { until: { round: 2 }, commands: playerScript(9), hashEvery: 200, recordAt: ['r1', 'r2:100', 'r2.clash'] });
    expect(Object.keys(res.hashes)).toEqual([
      'r1.planning', 'r1.clash', ...tickKeys(1, clashLength(s, 1)), 'r1.aftermath',
      'r2.planning', 'r2.clash', ...tickKeys(2, clashLength(s, 2)), 'r2.aftermath',
    ]);
    expect(res.finalHash).toBe(hashState(s));
    expect(res.hashes['r2.aftermath']).toBe(res.finalHash);
    // `r<n>` alone is the end of round n's aftermath
    expect(res.summaries.r1).toMatchObject({ round: 1, phase: 'aftermath', hash: res.hashes['r1.aftermath'] });
    expect(res.summaries['r2.clash']).toMatchObject({ round: 2, phase: 'clash', hash: res.hashes['r2.clash'] });
    expect(res.summaries['r2:100']).toMatchObject({ round: 2, phase: 'clash', tick: clashLength(s, 1) + 100 });
    expect(Object.keys(res.summaries)).toHaveLength(3);
    // without `hashEvery` it hashes nothing on the way
    expect(runHeadless(scriptedBattle(), { until: { round: 1 }, commands: playerScript(9) }).hashes).toEqual({});
  });

  it('counts every event the battle raised, round 1\'s opening included', () => {
    const res = runHeadless(scriptedBattle(), { until: 'end', commands: playerScript(9) });
    expect(res.eventCounts).toMatchObject({ roundStarted: 9, clashStarted: 9, laneWon: 9, battleEnded: 1 });
  });

  it("throws a clear error when a human's planning phase has no Begin, rather than looping", () => {
    expect(() => runHeadless(planningState(), { until: 'end' })).toThrow(/round 1's planning never begins/);
    expect(() => runHeadless(scriptedBattle(), { until: 'end', commands: playerScript(2) })).toThrow(/round 3's planning never begins/);
  });

  it("doesn't count planning and aftermath steps as stalls", () => {
    // each round's Begin and each aftermath step run no tick, and a planning step that plants first still Begins
    const s = scriptedBattle();
    const sold = s.buildings.find((b) => b.side === 'player')!.id;
    runHeadless(s, { until: 'end', commands: playerScript(9, { 3: [{ type: 'sell', entityId: sold }] }) });
    expect([s.phase, s.stats.player.buildingsSold, s.stats.player.rejectedCommands]).toEqual(['ended', 1, 0]);
    // a Begin already queued at the planning checkpoint, as a bot's is (plan Call 14), runs with no commands given
    const queued = scriptedBattle();
    queueCommand(queued, { round: 1, tick: 0, side: 'player', type: 'beginClash' });
    runHeadless(queued, { until: { round: 1 } });
    expect([queued.round, queued.phase]).toEqual([1, 'aftermath']);
  });
});
