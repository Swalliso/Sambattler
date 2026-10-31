// Prototype runs (`?proto=`) and saves: on the dev site a prototype run saves under keys of its own
// (`protoSpace` in src/app/channel.ts), apart from the real save; the game never saves or resumes one.
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { chromium } from 'playwright';
import type { Browser, Page } from 'playwright';
import { createServer } from 'vite';
import type { ViteDevServer } from 'vite';
import { RUN_KEY, chooseNode, createRun } from '../../src/run/index.ts';
import { nodeContent } from '../../tools/lib/content.ts';

const PROTO = 'hotstart';
const servers: ViteDevServer[] = [];
let game: string;
let dev: string;
let browser: Browser | undefined;
let page: Page;

/**
 * A Vite server for the game, or (`develop`) for the dev site, whose keys all get the `dev/` prefix. The
 * dev site's server keeps its own dependency cache: its config differs, so sharing `node_modules/.vite`
 * would make it and the other test files' servers re-optimize under each other's pages.
 */
async function serve(mode?: string): Promise<string> {
  const cacheDir = mode ? `node_modules/.vite-${mode}` : undefined;
  const server = await createServer({ mode, cacheDir, server: { host: '127.0.0.1', port: 0, watch: null, hmr: false } });
  servers.push(server);
  await server.listen();
  const address = server.httpServer?.address();
  if (!address || typeof address === 'string') throw new Error('Vite did not open a TCP port');
  return `http://127.0.0.1:${address.port}`;
}

beforeAll(async () => {
  game = await serve();
  dev = await serve('develop');
  browser = await chromium.launch();
});

afterAll(async () => {
  await browser?.close();
  for (const server of servers) await server.close();
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
});
