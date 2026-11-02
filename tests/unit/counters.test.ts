// The counter-matrix check (tools/lib/balance.ts, combat rework P0): its answer bots join the content
// through a proto spec without touching the shipped bots, and a tiny in-process run screens on the
// first seeds and confirms its top answers on the next ones. Then R1's clash bars (SPEC §12.2, §12.3,
// §16 R1): the pool's clash jobs, the cache, clash G3, the strict clash counter matrix (G12) and G13.
import { describe, expect, it } from 'vitest';
import { SIDES, other } from '../../src/sim/index.ts';
import type { Side } from '../../src/sim/index.ts';
import {
  armyIds, clashCache, clashG13, clashRace, counterAnswers, counterBots, counterBotSpec, evaluateClashCounters, evaluateClashG3, evaluateClashG4Row, evaluateCounters,
  evaluateG3, evaluatePairings, g3Row, pairingBotSpec, uniqueCells,
} from '../../tools/lib/balance.ts';
import type { Cell, CellRecord, ClashRunner } from '../../tools/lib/balance.ts';
import { armyFromBot, playClash } from '../../tools/lib/clash.ts';
import type { ClashJob, ClashRecord, FieldId } from '../../tools/lib/clash.ts';
import { protoContent } from '../../tools/lib/content.ts';
import { dispatch, inProcessClashes } from '../../tools/lib/pool.ts';
import { content } from '../helpers.ts';

const cc = protoContent(counterBotSpec(content));

describe('counter matrix answers', () => {
  it('pairs every two army buildings evenly, with an opener the starting gold covers', () => {
    const army = armyIds(content);
    expect(army).toHaveLength(10);
    expect(army).toContain('puffballMortar');
    expect(army).not.toContain('tendersRing');
    const pairs = Object.entries(counterBots(content)).filter(([id]) => id.startsWith('pair-'));
    expect(pairs).toHaveLength(45);
    for (const [, bot] of pairs) {
      const [a, b] = Object.keys(bot.weights);
      expect(bot.weights).toEqual({ [a!]: 1, [b!]: 1 });
      expect(bot.opener[0]).toBe(a);
      expect(bot.opener.reduce((s, id) => s + content.buildings[id]!.cost, 0)).toBeLessThanOrEqual(content.balance.startingGold);
    }
    expect(cc.bots['pair-sporelingBurrow-gillNest']!.opener).toEqual(['sporelingBurrow', 'gillNest']);
  });

  it('adds its bots through the spec and leaves the shipped bots alone', () => {
    for (const id of Object.keys(content.bots)) expect(cc.bots[id]).toEqual(content.bots[id]);
    expect(Object.keys(cc.bots)).toHaveLength(Object.keys(content.bots).length + Object.keys(counterBots(content)).length);
    const { description: _description, ...balanced } = content.bots.balanced!;
    expect(cc.bots['d1-adaptive']).toEqual({ ...balanced, id: 'd1-adaptive', adaptive: true, fixedWeights: true, description: expect.stringContaining('D1') });
  });

  it("keeps every answer bot to its own weights (a prototype building's aiWeight skips them)", () => {
    for (const id of Object.keys(counterBots(content))) expect(cc.bots[id]!.fixedWeights).toBe(true);
    for (const id of Object.keys(content.bots)) expect(cc.bots[id]!.fixedWeights).toBeUndefined();
  });

  it('tries every other mono bot, the pairs, bot:balanced, the counter bots and the other data bots', () => {
    const answers = counterAnswers(cc, 'gillNest');
    expect(answers).not.toContain('bot:mono:gillNest');
    expect(answers.filter((a) => a.startsWith('bot:mono:'))).toHaveLength(13);
    expect(answers.filter((a) => a.startsWith('bot:pair-'))).toHaveLength(45);
    expect(answers).toEqual(expect.arrayContaining(['bot:balanced', 'bot:d1-burrows', 'bot:diverdef', 'bot:counter-swarm', 'bot:rush']));
    expect(answers).not.toContain('bot:balanced-nomerge');
  });
});

describe('counter matrix run', () => {
  it('screens on the first seeds, confirms the top answers on the next ones and flags mono answers that fail G3', async () => {
    const map = 'bogwater-hollow';
    const g3 = evaluateG3(cc, { maps: [map], ids: ['gillNest', 'sporelingBurrow'], seeds: 1 });
    const answers = ['bot:balanced', 'bot:mono:sporelingBurrow'];
    const r = await evaluateCounters(cc, { maps: [map], builds: ['gillNest'], answers, g3, screenSeeds: 1, confirmSeeds: 1, top: 1 });
    const [b] = r.builds;
    expect(b!.screen.map((s) => s.answer).sort()).toEqual([...answers].sort());
    expect(b!.screen[0]!.mean).toBeGreaterThanOrEqual(b!.screen[1]!.mean);
    expect(b!.top).toHaveLength(1);
    const t = b!.top[0]!;
    expect(t.answer).toBe(b!.screen[0]!.answer);
    // the confirmation plays seed 2 in both seats; the answer wins every game the mono build loses
    const row = g3Row(cc, map, 'gillNest', 1, t.answer, 2);
    expect(t.games).toBe(2);
    expect(t.wins).toBe(row.games - row.wins);
    expect(b!.pass).toBe(t.mean >= 0.6);
    const sporeling = g3.bots.find((x) => x.id === 'sporelingBurrow')!;
    expect(b!.screen.find((s) => s.answer === 'bot:mono:sporelingBurrow')!.failsG3).toBe(!sporeling.pass);
    expect(b!.screen.find((s) => s.answer === 'bot:balanced')!.failsG3).toBe(false);
  });
});

// ---------------------------------------------------------------- R1's clash bars

/** A real clash's record, whose shape the scripted runner reuses. */
const template: ClashRecord = playClash(cc, {
  field: 'one', seed: 1, seat: 'player',
  armies: [armyFromBot(cc, 'bot:mono:sporelingBurrow', 300, 1, 8), armyFromBot(cc, 'bot:mono:capguardHall', 300, 1, 8)],
});

/**
 * A runner that plays nothing: `decide(job)` names each clash's winner ('a' for the job's first army, 'b'
 * for the second, or 'draw'), on the template's shape, so a test sets every cell's result. `seen` collects
 * the jobs it was given.
 */
function scripted(decide: (job: ClashJob) => 'a' | 'b' | 'draw', seen: ClashJob[] = []): ClashRunner {
  return (jobs) => Promise.resolve(jobs.map((job): ClashRecord => {
    seen.push(job);
    const d = decide(job);
    const winner: Side | 'draw' = d === 'draw' ? 'draw' : d === 'a' ? job.seat : other(job.seat);
    const reading = { ...template.cap, winner, round: winner };
    return {
      ...template, field: job.field, budget: job.armies[0].budget, seed: job.seed, seat: job.seat, jitter: job.jitter ?? 0,
      armies: {
        [job.seat]: { ...template.armies.player, controller: job.armies[0].controller },
        [other(job.seat)]: { ...template.armies.enemy, controller: job.armies[1].controller },
      } as ClashRecord['armies'],
      cap: reading, capAfterMuster: reading,
    };
  }));
}

/** A game's place among a cell group's four: its seed's place from `first` (two seeds a seat), then its seat. */
const game = (job: ClashJob, first: number): number => 2 * (job.seed - first) + (job.seat === 'player' ? 0 : 1);

describe("the pool's clash jobs (tools/lib/pool.ts)", () => {
  it("plays clashes in process, one record per job in job order, as a worker's dispatch does", async () => {
    const jobs = [300, 600].flatMap((budget) => SIDES.map((seat): ClashJob => ({
      field: 'one', seed: 1, seat, jitter: 0.2,
      armies: [armyFromBot(cc, 'bot:mono:sporelingBurrow', budget, 1, 8), armyFromBot(cc, 'bot:balanced', budget, 1, 8)],
    })));
    const records = await inProcessClashes(cc)(jobs);
    expect(records).toHaveLength(jobs.length);
    records.forEach((r, i) => {
      const job = jobs[i]!;
      expect([r.budget, r.seat, r.armies[job.seat].controller]).toEqual([job.armies[0].budget, job.seat, 'bot:mono:sporelingBurrow']);
      expect(r).toEqual(playClash(cc, job));
      expect(dispatch(cc, { kind: 'clash', job })).toEqual(r);
    });
  });

  it('still plays G3 cells for rowPool', () => {
    const job = { map: 'test-flat', id: 'sporelingBurrow', seeds: 1, defender: 'bot:balanced' };
    expect(dispatch(cc, { kind: 'g3', job })).toEqual(g3Row(cc, job.map, job.id, job.seeds, job.defender));
  });
});

describe('the clash cache (A007)', () => {
  // mono Burrow fills the one-lane field's 8 plots at 1,200 gold and at 1,500, and so does mono Capguard
  const cells = [1200, 1500].flatMap((budget) => [1, 2].flatMap((seed) => SIDES.map((seat): Cell => ({
    a: 'bot:mono:sporelingBurrow', b: 'bot:mono:capguardHall', field: 'one', budget, seed, seat,
  }))));

  it('plays a fixed pair of armies once a seat without jitter, whatever the seed and budget', async () => {
    const cache = clashCache(cc, inProcessClashes(cc));
    const records = await cache.full(cells);
    expect(cache.stats()).toEqual({ cells: 8, played: 2 });
    records.forEach((r, i) => expect([r.budget, r.seed, r.seat]).toEqual([cells[i]!.budget, cells[i]!.seed, cells[i]!.seat]));
    expect({ ...records[7]!, budget: 1200, seed: 1 }).toEqual(records[1]);
    // its premise: with no jitter a clash draws nothing, so another seed plays the same clash
    const job: ClashJob = { field: 'one', seed: 1, seat: 'player', armies: [cache.army('bot:balanced', 600, 1, 'one'), cache.army('bot:mono:gillNest', 600, 1, 'one')] };
    expect(playClash(cc, { ...job, seed: 7 })).toEqual({ ...playClash(cc, job), seed: 7 });
  });

  it('shares nothing between seeds with jitter, which draws on the seed', async () => {
    const cache = clashCache(cc, inProcessClashes(cc), { jitter: 0.2 });
    const records = await cache.slim(cells);
    expect(cache.stats()).toEqual({ cells: 8, played: 4 }); // the budgets still share: the same armies on the same seed
    expect(records[4]).toEqual({ ...records[0], budget: 1500 });
  });

  it("a full record after a slim one reuses the kept record, and a clash played again for its full record counts once (S4's review)", async () => {
    const seen: ClashJob[] = [];
    const runner: ClashRunner = (jobs) => { seen.push(...jobs); return inProcessClashes(cc)(jobs); };
    const kept = clashCache(cc, runner, { keep: true });
    await kept.slim(cells);
    const full = await kept.full(cells);
    expect([seen.length, kept.stats().played, kept.records().length]).toEqual([2, 2, 2]);
    expect(full[0]).toEqual(kept.records()[0]);
    seen.length = 0;
    const plain = clashCache(cc, runner);
    await plain.slim(cells);
    expect(await plain.full(cells)).toEqual(full);
    expect([seen.length, plain.stats().played]).toEqual([4, 2]);
  });
});

describe('clash G3 (SPEC §12.3, §16 R1)', () => {
  it("plays each mono army against bot:balanced's at each budget and field, in both seats", async () => {
    const g3 = await evaluateClashG3(cc, { cache: clashCache(cc, inProcessClashes(cc)), ids: ['sporelingBurrow', 'capguardHall'], budgets: [300], fields: ['one', 'twin'], seeds: 2 });
    expect(g3.records).toHaveLength(2 * 2 * 2 * 2); // monos × fields × seeds × seats
    g3.bots.forEach((bot, i) => {
      const mine = g3.records.slice(8 * i, 8 * (i + 1));
      for (const r of mine) expect([r.armies[r.seat].controller, r.armies[other(r.seat)].controller, r.budget]).toEqual([`bot:mono:${bot.id}`, 'bot:balanced', 300]);
      const rate = (field: FieldId) => {
        const rs = mine.filter((r) => r.field === field);
        return rs.reduce((s, r) => s + (r.cap.winner === r.seat ? 1 : r.cap.winner === 'draw' ? 0.5 : 0), 0) / rs.length;
      };
      expect(bot.fields.one!.rate).toBeCloseTo(rate('one'), 12);
      expect(bot.mean).toBeCloseTo((2 * rate('one') + rate('twin')) / 3, 12); // the one-lane field counts twice
      expect(bot.worst).toBeCloseTo(Math.max(rate('one'), rate('twin')), 12);
      expect(bot.pass).toBe(bot.mean <= 0.55 && bot.worst <= 0.6);
    });
    expect(g3.armies.find((a) => a.controller === 'bot:mono:sporelingBurrow' && a.field === 'one')).toMatchObject({ budget: 300, spent: 220, units: 16 });
  });

  it('counts a draw as half a win, weighs the budgets evenly, and flags a budget over the bar while the pool passes', async () => {
    // at 300, mono Sporeling wins on the one-lane field but for one draw, and loses on Twin Roots; at 600
    // it loses on the one-lane field and draws on Twin Roots
    const runner = scripted((job) => {
      if (job.armies[0].budget === 300) return job.field === 'one' ? (game(job, 1) === 3 ? 'draw' : 'a') : 'b';
      return job.field === 'twin' ? 'draw' : 'b';
    });
    const g3 = await evaluateClashG3(cc, { cache: clashCache(cc, runner, { jitter: 0.2 }), ids: ['sporelingBurrow'], budgets: [300, 600], fields: ['one', 'twin'], seeds: 2 });
    const bot = g3.bots[0]!;
    const at = (budget: number) => bot.budgets.find((b) => b.budget === budget)!;
    expect(at(300).fields.one).toEqual({ wins: 3, draws: 1, losses: 0, games: 4, rate: 0.875 });
    expect(at(600).fields.twin).toEqual({ wins: 0, draws: 4, losses: 0, games: 4, rate: 0.5 });
    expect(bot.fields.one!.rate).toBe(3.5 / 8);
    expect(bot.fields.twin!.rate).toBe(2 / 8);
    expect(bot.mean).toBeCloseTo((2 * (3.5 / 8) + 2 / 8) / 3, 12);
    expect([bot.worst, bot.worstField, bot.pass]).toEqual([3.5 / 8, 'one', true]);
    expect(at(300)).toMatchObject({ worst: 0.875, worstField: 'one', over: true });
    expect(at(300).mean).toBeCloseTo((2 * 0.875) / 3, 12);
    expect(at(600)).toMatchObject({ worst: 0.5, worstField: 'twin', over: false });
    expect(g3.pass).toBe(true);
    expect(g3.details.join('\n')).toMatch(/flag: 300/);
  });
});

describe('the strict clash counter matrix (G12, SPEC §12.3)', () => {
  it("screens by the worst field, confirms the best answers that count on fresh seeds, and passes on the best one's worst field", async () => {
    // clash G3: mono Sporeling wins everything and mono Gill Nest half, so both are builds. Mono Capguard's
    // mean is low, so it isn't one, but it wins 75% on Twin Roots, so it fails G3
    const g3Rates: Record<string, Partial<Record<FieldId, number>>> = {
      'bot:mono:sporelingBurrow': { one: 1, twin: 1 }, 'bot:mono:gillNest': { one: 0.5, twin: 0.5 }, 'bot:mono:capguardHall': { one: 0, twin: 0.75 },
    };
    const g3 = await evaluateClashG3(cc, {
      cache: clashCache(cc, scripted((job) => (game(job, 1) < 4 * g3Rates[job.armies[0].controller]![job.field]! ? 'a' : 'b')), { jitter: 0.2 }),
      ids: ['sporelingBurrow', 'gillNest', 'capguardHall'], budgets: [600], fields: ['one', 'twin'], seeds: 2,
    });
    expect(g3.bots.map((b) => [b.id, b.pass])).toEqual([['sporelingBurrow', false], ['gillNest', true], ['capguardHall', false]]);

    // each answer's win rate against each build on the one-lane field and Twin Roots, in the screen (seeds
    // 1–2) and the confirmation (seeds 3–4)
    const mono = 'bot:mono:capguardHall', pair = 'bot:pair-capguardHall-gillNest', knights = 'bot:counter-knights';
    const rates: Record<string, Record<string, { screen: [number, number]; confirm: [number, number] }>> = {
      'bot:mono:sporelingBurrow': {
        [mono]: { screen: [1, 1], confirm: [1, 1] },
        [pair]: { screen: [1, 0.75], confirm: [1, 0.5] },
        [knights]: { screen: [0.5, 1], confirm: [0.75, 0.75] },
      },
      'bot:mono:gillNest': {
        [mono]: { screen: [0.5, 0.25], confirm: [0.5, 0.25] },
        [pair]: { screen: [0.25, 0.25], confirm: [0.25, 0.25] },
        [knights]: { screen: [0.25, 0.5], confirm: [0.25, 0.25] },
      },
    };
    const seen: ClashJob[] = [];
    const runner = scripted((job) => {
      const confirm = job.seed > 2;
      const r = rates[job.armies[0].controller]![job.armies[1].controller]![confirm ? 'confirm' : 'screen'][job.field === 'one' ? 0 : 1];
      return game(job, confirm ? 3 : 1) < 4 * r ? 'b' : 'a';
    }, seen);
    const v = await evaluateClashCounters(cc, { cache: clashCache(cc, runner, { jitter: 0.2 }), g3, answers: [mono, pair, knights], screenSeeds: 2, confirmSeeds: 2, top: 2 });
    const [sporeling, gill] = v.builds;
    expect(v.builds.map((b) => b.build)).toEqual(['sporelingBurrow', 'gillNest']);

    // ranked by the worst field, then the mean; mono Capguard is flagged and isn't confirmed
    expect(sporeling!.screen.map((a) => [a.answer, a.worst])).toEqual([[mono, 1], [pair, 0.75], [knights, 0.5]]);
    expect(sporeling!.screen.map((a) => a.failsG3)).toEqual([true, false, false]);
    expect(gill!.screen.map((a) => a.answer)).toEqual([mono, knights, pair]); // all 25% on the worst field
    // confirmed on seeds 3–4 only, and only the answers that count
    expect([...new Set(seen.filter((j) => j.seed > 2).map((j) => j.armies[1].controller))].sort()).toEqual([knights, pair].sort());
    expect([...new Set(seen.map((j) => j.seed))].sort()).toEqual([1, 2, 3, 4]);
    expect(sporeling!.top.map((a) => [a.answer, a.worst, a.worstField])).toEqual([[knights, 0.75, 'one'], [pair, 0.5, 'twin']]);
    expect(sporeling!.top[0]!.fields.one).toMatchObject({ wins: 3, games: 4 });
    expect(sporeling!.pass).toBe(true);
    expect([gill!.top[0]!.worst, gill!.pass]).toEqual([0.25, false]);
    expect(v.pass).toBe(false);

    // the clash matrix: the screen's best answers at each budget, with the kinds §7.4 puts their buildings in
    const row = sporeling!.matrix[0]!;
    expect(row.budget).toBe(600);
    expect(row.answers.map((a) => a.answer)).toEqual([mono, pair, knights]);
    expect(row.answers[0]).toMatchObject({ cards: ['capguardHall'], kinds: ['swarm'], failsG3: true, swarm: false });
    expect(v.sets.swarm).toContain('capguardHall');
  });
});

describe('G13, clash stalls (SPEC §12.3)', () => {
  let seed = 0;
  /** A cell, on a seed of its own, whose cap reading locked at `ticks` and whose cap after the muster locked at `after`. */
  const cell = (field: FieldId, budget: number, ticks: number, after = ticks): CellRecord => ({
    field, budget, seed: ++seed, seat: 'player' as Side, jitter: 0, armies: { player: { controller: 'bot:a' }, enemy: { controller: 'bot:b' } },
    cap: { ...template.cap, ticks, capped: ticks >= 900 }, capAfterMuster: { ...template.capAfterMuster, ticks: after, capped: after >= 920 },
  });

  it("reads the share of every clash that reached the cap, with G3's share and the cap after the muster beside it", () => {
    const g3 = [cell('one', 300, 900, 920), cell('one', 300, 400), cell('twin', 300, 300), cell('twin', 600, 200)];
    const matrix = [cell('one', 300, 900, 910), cell('one', 600, 500), cell('one', 600, 600), cell('twin', 300, 700), cell('twin', 600, 800), cell('one', 300, 100)];
    const v = clashG13([...g3, ...matrix], g3);
    expect(v.all.cap).toEqual({ clashes: 10, capped: 2, share: 0.2, medianSeconds: 550 / 20 });
    expect(v.all.capAfterMuster).toMatchObject({ clashes: 10, capped: 1, share: 0.1 });
    expect(v.g3.cap).toMatchObject({ clashes: 4, capped: 1, share: 0.25 });
    expect(v.cells.find((c) => c.budget === 300 && c.field === 'one')!.cap).toMatchObject({ clashes: 4, capped: 2, share: 0.5 });
    expect(v.cells.map((c) => `${c.field} ${c.budget}`)).toEqual(['one 300', 'twin 300', 'one 600', 'twin 600']);
    expect(v.pass).toBe(false); // 20% is over the 15% bar
    expect(clashG13(matrix.slice(1)).pass).toBe(true);
    // a cell the matrix shares with G3 counts once
    const twice = uniqueCells(g3, [{ ...g3[0]! }, ...matrix]);
    expect(twice).toHaveLength(10);
    expect(clashG13(twice, g3).all).toEqual(v.all);
  });
});

describe("the race section: the G4 row, the cap-binding share and drawn rounds (SPEC §6.7, §12.3 G4; A208, A022)", () => {
  it('the G4 row plays bot:balanced against general:scripted, then against itself, on the one-lane field in both seats', async () => {
    const seen: ClashJob[] = [];
    const row = await evaluateClashG4Row(cc, { cache: clashCache(cc, scripted(() => 'a', seen), { jitter: 0.2 }), budgets: [300, 600], seeds: 2 });
    expect(row.records).toHaveLength(16);
    expect(row.records.map((r) => `${r.armies[r.seat].controller} ${r.armies[other(r.seat)].controller}`)).toEqual([
      ...Array<string>(8).fill('bot:balanced general:scripted'), ...Array<string>(8).fill('bot:balanced bot:balanced'),
    ]);
    expect(row.records.map((r) => `${r.field} ${r.budget} ${r.seed} ${r.seat}`).slice(0, 4)).toEqual(['one 300 1 player', 'one 300 1 enemy', 'one 300 2 player', 'one 300 2 enemy']);
    expect(row.scores.map((s) => [s.budget, s.score.rate])).toEqual([[300, 1], [600, 1]]);
    // a mirror's second army is built on seed 1,000 + s
    const mirror = seen.find((j) => j.armies[1].controller === 'bot:balanced')!;
    expect(mirror.armies[1]).toEqual(armyFromBot(cc, 'bot:balanced', mirror.armies[0].budget, 1000 + mirror.seed, 8));
    expect(row.details[1]).toMatch(/300 100 · 600 100/);
  });

  let seed = 0;
  /** A cell the enemy lost, with `taken` uncapped damage to its Heartcap and the round's result. */
  const lost = (field: FieldId, budget: number, taken: number, round: Side | 'draw' = 'player'): CellRecord => {
    const reading = {
      ...template.cap, winner: 'player' as Side, round,
      heartcap: { player: { uncapped: 0, capped: 0 }, enemy: { uncapped: taken, capped: Math.min(500, taken) } },
    };
    return { field, budget, seed: ++seed, seat: 'player', jitter: 0, armies: { player: { controller: 'bot:a' }, enemy: { controller: 'bot:b' } }, cap: reading, capAfterMuster: reading };
  };

  it("reads the share of clashes whose loser's uncapped damage passes 500, at storm ×1.0 and at the budget's round storm, and the share of drawn rounds", () => {
    const cells = [lost('one', 900, 450), lost('one', 900, 600), lost('one', 900, 400), lost('one', 900, 500, 'draw'), lost('one', 1500, 300), lost('twin', 1500, 200, 'draw')];
    const v = clashRace(cells, []);
    expect(v.cells.map((c) => [c.budget, c.field, c.clashes, c.binds, c.bindsStorm, c.stormBp, c.drawn])).toEqual([
      [900, 'one', 4, 0.25, 0.75, 12000, 0.25], [1500, 'one', 1, 0, 1, 20000, 0], [1500, 'twin', 1, 0, 0, 20000, 1],
    ]);
    expect(v.all).toMatchObject({ clashes: 6, binds: 1 / 6, bindsStorm: 4 / 6, drawn: 2 / 6 });
    expect(v.details.join('\n')).toMatch(/900 \(round 5, ×1\.2\): one 25% → 75%, drawn 25%/);
    expect(v.race.groups).toEqual([]);
  });
});

describe("battle 1's pairing table (SPEC §16 R1, §12.3 G14; R2-Q13)", () => {
  it("plays each starter's candidates against each battle-1 general's army in the enemy seat, and reports the best and the pairings with no answer at 60%", async () => {
    const pc = protoContent([counterBotSpec(content), pairingBotSpec(content)].join(','));
    const seen: ClashJob[] = [];
    // mono Capguard always wins; everything else loses
    const v = await evaluatePairings(pc, { cache: clashCache(pc, scripted((job) => (job.armies[0].controller === 'bot:mono:capguardHall' ? 'a' : 'b'), seen), { jitter: 0.2 }), seeds: 2 });
    expect(seen.every((j) => j.seat === 'player' && j.armies[1].controller.startsWith('bot:kit1-'))).toBe(true);
    expect(new Set(seen.map((j) => j.armies[0].budget))).toEqual(new Set([300, 600, 900]));
    expect(new Set(seen.map((j) => j.field))).toEqual(new Set(['one', 'twin']));
    expect(v.rows.map((r) => `${r.commander} ${r.general} ${r.pooled.best} ${r.pooled.rate} ${r.answered}`)).toEqual([
      'vesper mother-mold bot:mono:capguardHall 1 true', 'vesper lichen-baron bot:mono:capguardHall 1 true',
      'armilla mother-mold bot:mono:capguardHall 1 true', 'armilla lichen-baron bot:mono:capguardHall 1 true',
      'cordis mother-mold bot:mono:sporelingBurrow 0 false', 'cordis lichen-baron bot:mono:sporelingBurrow 0 false',
    ]);
    expect(v.unanswered).toBeCloseTo(1 / 3);
    expect(v.budgets.map((b) => b.unanswered)).toEqual([2 / 6, 2 / 6, 2 / 6]);
    expect(v.details.join('\n')).toMatch(/jitter ±0\.2/);
  });
});
