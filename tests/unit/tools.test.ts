// The balance tools in round form (SPEC §12.2, §15.3; R2a/T116, T117): `playRoundClash` plays R1's armies as one
// round clash on the round sim, from either seat, and the pool's round jobs give what an in-process run gives,
// in job order, as a worker's dispatch does. The screenshot mirror plays `scene=run` to a round and phase as the
// page does (R2b/T157).
import { describe, expect, it } from 'vitest';
import { armyFromBot, playRoundClash } from '../../tools/lib/clash.ts';
import type { RoundClashJob } from '../../tools/lib/clash.ts';
import { dispatch, inProcessRounds } from '../../tools/lib/pool.ts';
import { playRoundJob, squadDuel } from '../../tools/lib/balance.ts';
import type { RoundJob } from '../../tools/lib/balance.ts';
import { runForParams } from '../../tools/lib/params.ts';
import { BattleRefusal } from '../../src/app/urlParams.ts';
import { createBattle, hashState } from '../../src/sim/index.ts';
import { content } from '../helpers.ts';

const army = (bot: string, budget = 600) => armyFromBot(content, bot, budget, 1, 8);

describe('playRoundClash (T116)', () => {
  it('fields both armies in formation from their plots, and a mirror of an army ends level', () => {
    const a = army('bot:mono:capguardHall');
    const r = playRoundClash(content, { field: 'one', seed: 1, seat: 'player', armies: [a, a] });
    expect([r.controllers, r.winner, r.lanes[0]!.survivors[0]]).toEqual([['bot:mono:capguardHall', 'bot:mono:capguardHall'], 'draw', r.lanes[0]!.survivors[1]]);
  });

  it('gives the same clash from either seat, read from the first army', () => {
    const job: RoundClashJob = { field: 'one', seed: 1, seat: 'player', armies: [army('bot:mono:sporelingBurrow'), army('bot:mono:capguardHall')] };
    const asPlayer = playRoundClash(content, job), asEnemy = playRoundClash(content, { ...job, seat: 'enemy' });
    // the capped damage reads the loser's max HP, 3000 as the player and 2000 as the general, so it's left out
    const { seat: _p, damage: _dp, ...p } = asPlayer, { seat: _e, damage: _de, ...e } = asEnemy;
    expect(e).toEqual(p);
    expect(asPlayer.winner).not.toBe('draw');
  });

  it("skips a side's stump plots on Twin Roots, which R1's field doesn't have", () => {
    const a = armyFromBot(content, 'bot:mono:sporelingBurrow', 1500, 1, 12);
    expect(a.entries).toHaveLength(12);
    const r = playRoundClash(content, { field: 'twin', seed: 1, seat: 'player', armies: [a, army('bot:balanced', 1500)], opts: { extraPlots: 1 } });
    expect(r.lanes).toHaveLength(2);
  });

  it("a squad duel spends the budget on as many of one building as the one-lane field's plots hold", () => {
    const job = squadDuel(content, 'sporelingBurrow', 'capguardHall', 1, 600);
    expect(job.armies.map((x) => x.entries.length)).toEqual([5, 4]);
  });
});

describe("the pool's round jobs (T117)", () => {
  const jobs: RoundJob[] = [
    { kind: 'clash', job: squadDuel(content, 'gillNest', 'capguardHall', 1, 600) },
    { kind: 'supply', job: { a: 'capguard', b: 'sporeling', seed: 2, supply: 12 } },
    { kind: 'battle', job: { seed: 1, map: 'bogwater-hollow', player: 'bot:balanced', enemy: 'general:scripted' } },
  ];

  it('plays them in process, one result per job in job order, as a worker dispatch does', async () => {
    const results = await inProcessRounds(content)(jobs);
    expect(results).toHaveLength(jobs.length);
    results.forEach((r, i) => {
      expect(r).toEqual(playRoundJob(content, jobs[i]!));
      expect(dispatch(content, jobs[i]!)).toEqual(r);
    });
  });
});

describe('scene=run at a round and phase (§15.6, R2b/T157)', () => {
  const q = (s: string) => new URLSearchParams(s);

  it("enters the run's first battle and plays it to the checkpoint, with the bot planning and beginning", () => {
    const { run, battle } = runForParams(content, q('scene=run&seed=7&player=bot:balanced&round=2&phase=planning'));
    expect(run.screen.kind).toBe('battle');
    expect(run.path).toEqual([0]);
    expect([battle!.round, battle!.phase, battle!.config.battleIndex]).toEqual([2, 'planning', 1]);
    if (run.screen.kind !== 'battle') return;
    expect(battle!.config).toEqual(run.screen.config);
    // the same checkpoint each time, and past round 1's start
    expect(hashState(runForParams(content, q('scene=run&seed=7&player=bot:balanced&round=2&phase=planning')).battle!)).toBe(hashState(battle!));
    expect(hashState(battle!)).not.toBe(hashState(createBattle(content, run.screen.config)));
  });

  it('opens the route, with no battle, when it names neither', () => {
    const { run, battle } = runForParams(content, q('scene=run&seed=7&player=bot:balanced'));
    expect([run.screen.kind, battle]).toEqual(['route', null]);
  });

  it("refuses what a single battle refuses: a human's planning past round 1, or a phase that isn't one", () => {
    expect(() => runForParams(content, q('scene=run&seed=7&round=2&phase=planning'))).toThrow(BattleRefusal);
    expect(() => runForParams(content, q('scene=run&seed=7&player=bot:balanced&phase=lunch'))).toThrow(/phase=lunch/);
  });
});
