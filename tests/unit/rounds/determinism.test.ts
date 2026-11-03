import { describe, expect, it } from 'vitest';
import { hashState, legalPlots, restore, runHeadless, snapshot, step } from '../../../src/sim/rounds/index.ts';
import type { Command, HeadlessUntil } from '../../../src/sim/rounds/index.ts';
import { begin, playerScript, scriptedBattle } from '../../roundHelpers.ts';

// round 2 plants a Sporeling Burrow, so its clash differs from round 1's, and from round 3 the colonies stand still
const plot = legalPlots(scriptedBattle(), 'player', 'sporelingBurrow')[0]!;
const script = (): Command[] => playerScript(9, { 2: [{ type: 'plant', buildingId: 'sporelingBurrow', plot }] });
function play() {
  const s = scriptedBattle();
  return { s, res: runHeadless(s, { until: 'end', commands: script(), hashEvery: 200 }) };
}

describe('determinism in rounds (SPEC §13.3, §15.5)', () => {
  it('the same config and commands give equal hashes at every phase boundary and every 200 clash ticks', () => {
    const a = play(), b = play();
    expect([a.s.stats.player.buildingsPlanted, a.s.stats.player.rejectedCommands]).toEqual([1, 0]);
    expect(a.res.hashes).toEqual(b.res.hashes);
    expect(a.res.finalHash).toBe(b.res.finalHash);
    for (let r = 1; r <= a.s.round; r++) {
      expect(Object.keys(a.res.hashes)).toEqual(expect.arrayContaining([`r${r}.planning`, `r${r}.clash`, `r${r}:200`, `r${r}.aftermath`]));
    }
    // without round 2's plant, round 1 is the same and round 2's clash isn't
    const other = runHeadless(scriptedBattle(), { until: 'end', commands: playerScript(9), hashEvery: 200 });
    expect(other.hashes['r1.aftermath']).toBe(a.res.hashes['r1.aftermath']);
    expect(other.hashes['r2.planning']).toBe(a.res.hashes['r2.planning']);
    expect(other.hashes['r2.clash']).not.toBe(a.res.hashes['r2.clash']);
  });

  it('a snapshot at any checkpoint or clash tick, restored and continued, gives the same final hash', () => {
    const whole = play();
    const stops: (HeadlessUntil | 'r2.planning')[] = [
      { round: 1, tick: 0 }, { round: 1, tick: 137 }, { round: 1 }, 'r2.planning', { round: 2, tick: 200 }, { round: 3, tick: 1 }, { round: 4 },
    ];
    for (const stop of stops) {
      const part = scriptedBattle();
      runHeadless(part, { until: stop === 'r2.planning' ? { round: 1 } : stop, commands: script() });
      if (stop === 'r2.planning') step(part); // the aftermath's step opens round 2
      const resumed = restore(snapshot(part));
      expect(hashState(resumed)).toBe(hashState(part));
      // the whole script again: the commands already run are skipped
      const rest = runHeadless(resumed, { until: 'end', commands: script(), hashEvery: 200 });
      expect(rest.finalHash, JSON.stringify(stop)).toBe(whole.res.finalHash);
      for (const [key, hash] of Object.entries(rest.hashes)) expect(hash, `${JSON.stringify(stop)} ${key}`).toBe(whole.res.hashes[key]);
    }
  });

  // rounds 3 and 4 of the battle, where neither colony changes and no power fires: each tick's units, by id counted
  // from the clash's first, where they stand and their HP, then the round's results
  function quietRounds() {
    const s = scriptedBattle();
    runHeadless(s, { until: { round: 2 }, commands: script() });
    const playRound = () => {
      step(s);
      const base = s.nextId;
      begin(s);
      const ticks: string[] = [];
      while (s.phase === 'clash') {
        step(s);
        ticks.push(JSON.stringify(s.units.map((u) => [u.id - base, u.unitId, u.tier, u.x, u.y, u.hp])));
      }
      const { lanes, damageByBuilding, survivorsByBuilding, fielded } = s.rounds.at(-1)!;
      // a lane's Heartcap damage follows the round's storm, which the clash doesn't see
      return { ticks, lanes: lanes.map(({ damage: _damage, ...lane }) => lane), damageByBuilding, survivorsByBuilding, fielded };
    };
    const third = playRound(), fourth = playRound();
    return { s, third, fourth };
  }

  it('rounds 3 and 4 field the same colonies', () => {
    const { s, third, fourth } = quietRounds();
    expect([s.round, third.ticks.length > 200]).toEqual([4, true]);
    expect(fourth.fielded).toEqual(third.fielded);
  });

  // T149: the kept systems time their staggers and periodic checks from the battle's tick and unit ids, which
  // start from a different place each round, so a hit lands a tick apart. This flips once they count from the
  // clash's start.
  it.fails('a round in which neither colony changed and no power fired replays the last clash exactly', () => {
    const { third, fourth } = quietRounds();
    expect(fourth).toEqual(third);
  });
});
