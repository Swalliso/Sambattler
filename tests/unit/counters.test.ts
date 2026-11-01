// The counter-matrix check (tools/lib/balance.ts, combat rework P0): its answer bots join the content
// through a proto spec without touching the shipped bots, and a tiny in-process run screens on the
// first seeds and confirms its top answers on the next ones.
import { describe, expect, it } from 'vitest';
import {
  armyIds, counterAnswers, counterBots, counterBotSpec, evaluateCounters, evaluateG3, g3Row,
} from '../../tools/lib/balance.ts';
import { protoContent } from '../../tools/lib/content.ts';
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
