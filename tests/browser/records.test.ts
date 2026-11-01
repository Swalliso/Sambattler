// Run it back and the profile in the browser (SPEC §16 M6, §9.7, §13.8): on a finished run's summary,
// Enter or R starts one new run with the same commander and bans on another seed, straight on the route.
// Normal play remembers that setup in the profile, spore-sprawl/profile/v1; seeded, test and prototype
// pages never write it (RB-Q2).
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { chromium } from 'playwright';
import type { Browser, Page } from 'playwright';
import { PROFILE_KEY } from '../../src/meta/index.ts';
import { AUTOPLAY, RUN_KEY, simulateRun } from '../../src/run/index.ts';
import { nodeContent, protoContent } from '../../tools/lib/content.ts';
import { PROTO, closeServers, serve } from './serve.ts';

const SUMMARY = '/?scene=summary&seed=7&autoplay=run&test=1';
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
  // persisted pages need debug=1, not test=1; reduced motion makes screen changes instant (no spore wipe)
  page = await browser!.newPage({ viewport: { width: 1280, height: 720 }, reducedMotion: 'reduce' });
});

afterEach(async () => {
  await page?.close();
});

/** Opens a page, with `saves` in localStorage first; without a seed or test flag it persists as normal play does. */
async function open(url: string, saves: Record<string, string> = {}): Promise<void> {
  await page.addInitScript((s) => { for (const [k, v] of Object.entries(s)) localStorage.setItem(k, v); }, saves);
  await page.goto(url);
  await page.waitForFunction(() => window.__GAME__?.ready === true);
}

const brief = () => page.evaluate(() => window.__GAME__!.run()!);
const stored = (key: string) => page.evaluate((k) => localStorage.getItem(k), key);
/** Every profile key on the page, under any prefix. */
const profileKeys = () => page.evaluate(() => Object.keys(localStorage).filter((k) => k.includes('spore-sprawl/profile')));

/** Counts the route screens the page puts up from now on: each run started shows one. */
async function countRoutes(): Promise<() => Promise<number>> {
  await page.evaluate(() => {
    const w = window as unknown as { routesShown: number };
    w.routesShown = 0;
    new MutationObserver((changes) => {
      for (const c of changes) for (const n of c.addedNodes) if (n instanceof HTMLElement && n.id === 'route') w.routesShown++;
    }).observe(document.getElementById('app')!, { childList: true });
  });
  return () => page.evaluate(() => (window as unknown as { routesShown: number }).routesShown);
}

/** A keydown as the window's listeners see it, for a held key or a modifier that the page can't be sent safely. */
type KeyInit = { key: string; repeat?: boolean; ctrlKey?: boolean; metaKey?: boolean; altKey?: boolean };
const dispatchKey = (init: KeyInit) => page.evaluate((i) => { window.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, cancelable: true, ...i })); }, init);

describe('Run it back on the summary', () => {
  for (const key of ['R', 'Enter'] as const) {
    it(`${key} starts one run with the same commander and bans on another seed, straight on the route`, async () => {
      await open(`${game}${SUMMARY}`);
      const ended = await brief();
      expect(ended.screen).toBe('summary');
      expect(ended.outcome).not.toBeNull();
      expect(await page.locator('#run-it-back').evaluate((b) => b === document.activeElement)).toBe(true);
      const routes = await countRoutes();
      await page.keyboard.press(key);
      await page.waitForSelector('#route');
      const next = await brief();
      expect(next).toMatchObject({ screen: 'route', row: 0, commander: ended.commander, bans: ended.bans, outcome: null });
      expect(next.seed).not.toBe(ended.seed);
      // the key and the focused button start one run between them, and the key does nothing once the summary has gone
      await page.keyboard.press(key);
      expect(await routes()).toBe(1);
      expect((await brief()).seed).toBe(next.seed);
      expect(await profileKeys()).toEqual([]);
    });
  }

  it('leaves Enter to another focused button, and does nothing while the settings sheet is open, on a held key or with a modifier', async () => {
    await open(`${game}${SUMMARY}`);
    const ended = await brief();
    // Enter on another focused button is that button's: this one opens the settings sheet
    await page.locator('#settings-btn').focus();
    await page.keyboard.press('Enter');
    await page.waitForSelector('#settings');
    for (const key of ['r', 'R']) await page.keyboard.press(key);
    expect(await page.locator('#settings').count()).toBe(1);
    expect(await brief()).toEqual(ended);
    await page.keyboard.press('Escape');
    await page.waitForSelector('#settings', { state: 'detached' });
    await dispatchKey({ key: 'r', repeat: true });
    for (const mod of ['ctrlKey', 'metaKey', 'altKey']) await dispatchKey({ key: 'r', [mod]: true });
    expect(await brief()).toEqual(ended);
    // lower-case r works too, once nothing is in the way
    await page.keyboard.press('r');
    await page.waitForSelector('#route');
    expect(await brief()).toMatchObject({ screen: 'route', row: 0, commander: ended.commander, bans: ended.bans });
    expect(await profileKeys()).toEqual([]);
  });

  it('restarts a saved Armilla run with its ban, and remembers the setup in the profile', async () => {
    const run = simulateRun(nodeContent(), 7, AUTOPLAY, { commander: 'armilla', bans: ['scythecapGrove'] }).run;
    expect(run.outcome).toBeDefined();
    // scene=run without a seed or test flag resumes the saved run, which ended on its summary; debug=1 adds the bridge
    await open(`${game}/?scene=run&debug=1`, { [RUN_KEY]: JSON.stringify(run) });
    expect(await brief()).toMatchObject({ screen: 'summary', commander: 'armilla', bans: ['scythecapGrove'] });
    expect(await profileKeys()).toEqual([]);
    await page.keyboard.press('R');
    await page.waitForSelector('#route');
    const next = await brief();
    expect(next).toMatchObject({ screen: 'route', row: 0, commander: 'armilla', bans: ['scythecapGrove'], outcome: null });
    expect(next.seed).not.toBe(run.seed);
    expect(JSON.parse((await stored(PROFILE_KEY))!)).toEqual({ v: 1, lastSetup: { commander: 'armilla', bans: ['scythecapGrove'] } });
    // the new run is saved in place of the one that ended
    expect(JSON.parse((await stored(RUN_KEY))!)).toMatchObject({ seed: next.seed, commander: 'armilla', bans: ['scythecapGrove'], path: [] });
    expect(await profileKeys()).toEqual([PROFILE_KEY]);
  });

  it('works in a prototype run on the dev site, which writes no profile (RB-Q2)', async () => {
    const run = simulateRun(protoContent(PROTO), 7, AUTOPLAY, { commander: 'cordis', bans: ['hammercapForge'] }).run;
    await open(`${dev}/?proto=${PROTO}&scene=run&debug=1`, { [`dev/proto=${PROTO}/${RUN_KEY}`]: JSON.stringify(run) });
    expect(await brief()).toMatchObject({ screen: 'summary', commander: 'cordis', bans: ['hammercapForge'] });
    await page.locator('#run-it-back').click();
    await page.waitForSelector('#route');
    const next = await brief();
    expect(next).toMatchObject({ screen: 'route', row: 0, commander: 'cordis', bans: ['hammercapForge'] });
    expect(JSON.parse((await stored(`dev/proto=${PROTO}/${RUN_KEY}`))!)).toMatchObject({ seed: next.seed, path: [] });
    expect(await profileKeys()).toEqual([]);
  });
});
