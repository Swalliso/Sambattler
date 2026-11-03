// Prototype runs (`?proto=`) and saves: on the dev site a prototype run saves under keys of its own
// (`protoSpace` in src/app/channel.ts), apart from the real save; the game never saves or resumes one. A spec
// naming a preset that doesn't exist, such as one R2b's S4 deleted, says so on the page and saves nowhere (A117).
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { chromium } from 'playwright';
import type { Browser, Page } from 'playwright';
import { RUN_KEY, chooseNode, createRun } from '../../src/run/index.ts';
import { nodeContent } from '../../tools/lib/content.ts';
import { PROTO, closeServers, serve } from './serve.ts';

let game: string;
let dev: string;
let browser: Browser | undefined;
let page: Page;

beforeAll(async () => {
  game = await serve();
  dev = await serve('develop');
  browser = await chromium.launch();
});

afterAll(async () => {
  await browser?.close();
  await closeServers();
});

beforeEach(async () => {
  page = await browser!.newPage({ viewport: { width: 1280, height: 720 }, reducedMotion: 'reduce' });
});

afterEach(async () => {
  await page?.close();
});

/** Two saved runs told apart by their row: one on the route's first node (row 1), one not begun (row 0). */
function savedRuns(): { begun: string; unbegun: string } {
  const content = nodeContent();
  const begun = createRun(content, { seed: 9 });
  chooseNode(content, begun, 0);
  return { begun: JSON.stringify(begun), unbegun: JSON.stringify(createRun(content, { seed: 11 })) };
}

/** Opens a run with `saves` in localStorage, without a seed or test flag so it uses storage as normal play does; returns its row. */
async function openRun(url: string, saves: Record<string, string>): Promise<number> {
  await page.addInitScript((s) => { for (const [k, v] of Object.entries(s)) localStorage.setItem(k, v); }, saves);
  await page.goto(url);
  await page.waitForFunction(() => window.__GAME__?.ready === true);
  return page.evaluate(() => window.__GAME__!.run()!.row);
}

const stored = (key: string) => page.evaluate((k) => localStorage.getItem(k), key);

/** A preset R2b's S4 deleted (T058), named here so a grep of this folder for retired links finds none (US2). */
const RETIRED = 'rework';

describe('prototype runs and saves', () => {
  it('resumes a prototype run on the dev site from keys of its own', async () => {
    const { begun, unbegun } = savedRuns();
    const real = `dev/${RUN_KEY}`;
    expect(await openRun(`${dev}/?scene=run&debug=1&proto=${PROTO}`, { [real]: unbegun, [`dev/proto=${PROTO}/${RUN_KEY}`]: begun })).toBe(1);
    expect(await stored(real)).toBe(unbegun);
  });

  it("keeps the dev site's real save for a run without a prototype", async () => {
    const { begun, unbegun } = savedRuns();
    expect(await openRun(`${dev}/?scene=run&debug=1`, { [`dev/${RUN_KEY}`]: unbegun, [`dev/proto=${PROTO}/${RUN_KEY}`]: begun })).toBe(0);
  });

  it("never resumes the game's real save in a prototype run", async () => {
    const { begun } = savedRuns();
    expect(await openRun(`${game}/?scene=run&debug=1&proto=${PROTO}`, { [RUN_KEY]: begun })).toBe(0);
    expect(await stored(RUN_KEY)).toBe(begun);
  });

  it('says a retired preset is unknown, and opens no prototype save space for it (§13.8, A117)', async () => {
    const { begun, unbegun } = savedRuns();
    const space = `dev/proto=${RETIRED}/${RUN_KEY}`;
    const saves = { [`dev/${RUN_KEY}`]: unbegun, [space]: begun };
    expect(await openRun(`${dev}/?scene=run&debug=1&proto=${RETIRED}`, saves)).toBe(0);
    const notice = page.locator('#proto-notice');
    expect(await notice.isVisible()).toBe(true);
    expect(await notice.textContent()).toContain(`"${RETIRED}"`);
    // nothing read from or written to a save: the stored runs are as they were, and no prototype key appeared
    expect((await page.evaluate(() => Object.keys(localStorage))).filter((k) => k.includes('proto='))).toEqual([space]);
    for (const [k, v] of Object.entries(saves)) expect(await stored(k)).toBe(v);
  });
});
