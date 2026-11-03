// The preview of a battle in rounds, `scene=rounds` (SPEC §15.6, §13.5, §10.3; plan Calls 14–16, 28): the
// planning checkpoint and its hold, Begin by key with the empty-lane warning (R2-Q12, A065), a pause that never
// carries into a clash, a bot's queued Begin, a clash tick counted from the clash's start, and the refusals.
// Nothing here pins a combat outcome: the states are compared with Node's, computed live (A059, A075).
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { chromium } from 'playwright';
import type { Browser, Page } from 'playwright';
import { nodeContent } from '../../../tools/lib/content.ts';
import { roundStateForParams } from '../../../tools/lib/rounds/params.ts';
import { hashState } from '../../../src/sim/rounds/index.ts';
import type { RoundsBridge } from '../../../src/app/rounds/bridge.ts';
import { closeServers, serve } from '../serve.ts';

let browser: Browser | undefined;
let page: Page | undefined;
let base: string;
const content = nodeContent();

beforeAll(async () => {
  base = await serve();
  browser = await chromium.launch();
});

afterAll(async () => {
  await browser?.close();
  await closeServers();
});

afterEach(async () => {
  await page?.close();
});

async function open(query: string): Promise<Page> {
  const p = await browser!.newPage({ viewport: { width: 1280, height: 720 } });
  await p.goto(`${base}/?${query}`);
  await p.waitForFunction(() => window.__GAME__?.ready === true);
  return p;
}

/** What the bridge reports. */
const game = (p: Page) => p.evaluate(() => {
  const g = window.__GAME__ as unknown as RoundsBridge;
  return { round: g.round, phase: g.phase, tick: g.tick, hash: g.hash, errors: [...g.errors] };
});

/** Node's state for the same query, at the same checkpoint (T080). */
const node = (query: string) => roundStateForParams(content, new URLSearchParams(query));

const until = (p: Page, f: (g: RoundsBridge) => boolean) =>
  p.waitForFunction(`(${f.toString()})(window.__GAME__)`, null, { timeout: 15000 });

describe('the planning checkpoint (plan Call 14)', () => {
  it('holds round 1 planning at tick 0 with no input, at Node\'s hash', async () => {
    const q = 'scene=rounds&seed=1&test=1';
    page = await open(q);
    const first = await game(page);
    expect(first).toMatchObject({ round: 1, phase: 'planning', tick: 0, errors: [] });
    await page.waitForTimeout(1000);
    expect(await game(page)).toEqual(first);
    expect(first.hash).toBe(hashState(node(q)));
  });

  it('holds a bot player\'s plan with its beginClash queued under phase=planning', async () => {
    const q = 'scene=rounds&seed=1&test=1&player=bot:balanced&phase=planning';
    page = await open(q);
    await page.waitForTimeout(1000);
    const s = await page.evaluate(() => {
      const b = (window.__GAME__ as unknown as RoundsBridge).battle()!;
      return {
        phase: b.phase, tick: b.tick, queue: b.queue.map((c) => `${c.side}:${c.type}`),
        planted: b.log.filter((c) => c.side === 'player' && c.type === 'plant').length,
        mine: b.buildings.filter((x) => x.side === 'player').length,
      };
    });
    expect(s).toMatchObject({ phase: 'planning', tick: 0, queue: ['player:beginClash'] });
    expect(s.planted).toBeGreaterThan(0);
    expect(s.mine).toBeGreaterThan(0);
    expect((await game(page)).hash).toBe(hashState(node(q)));
  });
});

describe('Begin, the clash and the aftermath (§10.3, §13.5)', () => {
  it('warns on an empty colony, begins on a second Enter, and input after the clash opens round 2', async () => {
    // `phase=planning` makes the aftermath hold for input under ?test=1 (plan Call 15)
    page = await open('scene=rounds&seed=1&test=1&phase=planning');
    await page.waitForTimeout(450); // Begin by key waits about 400 ms after planning opens (R2-Q12)
    await page.keyboard.press('Enter');
    await page.waitForTimeout(150);
    expect(await game(page)).toMatchObject({ phase: 'planning', tick: 0 });
    expect(await page.locator('#begin-btn').textContent()).toContain('Begin anyway');
    await page.keyboard.press('Enter');
    await until(page, (g) => g.tick > 0);
    await until(page, (g) => g.phase === 'aftermath');
    expect((await game(page)).round).toBe(1);
    // the skip opens round 2's planning, and a second press straight after it doesn't Begin (A065)
    await page.keyboard.press('Enter');
    await page.keyboard.press('Enter');
    await until(page, (g) => g.round === 2 && g.phase === 'planning');
    await page.waitForTimeout(150);
    expect(await game(page)).toMatchObject({ round: 2, phase: 'planning' });
    expect(await page.locator('#begin-btn').textContent()).not.toContain('Begin anyway');
  });

  it('doesn\'t carry paused=1 in planning into the clash', async () => {
    page = await open('scene=rounds&seed=1&test=1&paused=1');
    await page.waitForTimeout(450);
    await page.keyboard.press('Enter');
    await page.keyboard.press('Enter');
    await until(page, (g) => g.tick > 0);
    expect((await game(page)).errors).toEqual([]);
  });
});

describe('fast-forwards (plan Call 16)', () => {
  it('opens a clash tick counted from the clash\'s start, at Node\'s hash', async () => {
    // the first seed whose round 4 clash lasts past 200 ticks, found live, so no combat outcome is pinned
    let q = '';
    for (let seed = 1; seed <= 30 && !q; seed++) {
      const at = `scene=rounds&seed=${seed}&test=1&player=bot:balanced&round=4&phase=clash&ticks=200&paused=1`;
      try { node(at); q = at; } catch { /* the battle or round 4's clash ended first */ }
    }
    expect(q).not.toBe('');
    const want = node(q);
    page = await open(q);
    const g = await game(page);
    expect(g).toMatchObject({ round: 4, phase: 'clash', tick: want.clash!.startTick + 200, errors: [] });
    expect(g.hash).toBe(hashState(want));
    await page.waitForTimeout(300);
    expect((await game(page)).tick).toBe(g.tick); // paused=1 holds the clash
  });

  it('fails a round past the battle\'s end with a message', async () => {
    page = await open('scene=rounds&seed=1&test=1&player=bot:balanced&round=10');
    expect(await page.locator('#rounds-refused').textContent()).toMatch(/ended in round \d/);
    expect((await game(page)).errors.length).toBe(1);
  });

  it('refuses round=2 for a human player without a scenario, with a message', async () => {
    page = await open('scene=rounds&seed=1&test=1&round=2');
    expect(await page.locator('#rounds-refused').textContent()).toMatch(/scenario/);
    expect(() => node('scene=rounds&seed=1&round=2')).toThrow(/scenario/);
  });
});
