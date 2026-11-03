// The balance tools in round form (SPEC §12.2, §15.3; R2a/T116, T117): `playRoundClash` plays R1's armies as one
// round clash on the round sim, from either seat, and the pool's round jobs give what an in-process run gives,
// in job order, as a worker's dispatch does.
import { describe, expect, it } from 'vitest';
import { armyFromBot, playRoundClash } from '../../tools/lib/clash.ts';
import type { RoundClashJob } from '../../tools/lib/clash.ts';
import { dispatch, inProcessRounds } from '../../tools/lib/pool.ts';
import { playRoundJob, squadDuel } from '../../tools/lib/balance.ts';
import type { RoundJob } from '../../tools/lib/balance.ts';
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
