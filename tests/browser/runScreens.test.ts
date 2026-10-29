// The run screens (docs/ui-ux-plan.md, Phase 2): the title opens with no scene and offers Continue only
// with a saved run; the route draws a hypha from every node to every node in the next row and lights a
// pod's threads on hover; spoils take keys 1–3; event choices carry outcome chips with a real minus for
// costs; Help's four tabs fit at 1280×720; and no run screen clips at 1280×720 or 1366×650.
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { chromium } from 'playwright';
import type { Browser, Page } from 'playwright';
import { createServer } from 'vite';
import type { ViteDevServer } from 'vite';
import { AUTOPLAY, RUN_KEY, createRun, simulateRun } from '../../src/run/index.ts';
import type { RunState } from '../../src/run/index.ts';
import { nodeContent } from '../../tools/lib/content.ts';

let server: ViteDevServer | undefined;
let browser: Browser | undefined;
let page: Page | undefined;
let base: string;

beforeAll(async () => {
  server = await createServer({ server: { host: '127.0.0.1', port: 0, watch: null, hmr: false } });
  await server.listen();
  const address = server.httpServer?.address();
  if (!address || typeof address === 'string') throw new Error('Vite did not open a TCP port');
  base = `http://127.0.0.1:${address.port}`;
  browser = await chromium.launch();
});

afterAll(async () => {
  await browser?.close();
  await server?.close();
});

afterEach(async () => {
  await page?.close();
  page = undefined;
});

async function open(query: string, opts: { width?: number; height?: number; run?: RunState } = {}): Promise<Page> {
  const p = await browser!.newPage({ viewport: { width: opts.width ?? 1280, height: opts.height ?? 720 }, reducedMotion: 'reduce' });
  page = p;
  if (opts.run) await p.addInitScript(([k, v]) => localStorage.setItem(k, v), [RUN_KEY, JSON.stringify(opts.run)] as const);
  await p.goto(`${base}${query}`);
  await p.waitForFunction(() => window.__GAME__?.ready === true);
  await p.evaluate(() => document.fonts.ready.then(() => true));
  return p;
}

/** Elements that poke out of the window (screen px), ignoring hidden ones. */
async function clipped(p: Page): Promise<string[]> {
  return p.evaluate(() => {
    const W = window.innerWidth, H = window.innerHeight;
    const out: string[] = [];
    for (const el of document.querySelectorAll<HTMLElement>('#app button, #app h1, #app table, #app .runbar, #app .runfoot, #app .choice, #app .draft-card, #app .route-node, .helpcard')) {
      const r = el.getBoundingClientRect();
      if (r.width && r.height && (r.bottom > H + 0.5 || r.right > W + 0.5 || r.top < -0.5 || r.left < -0.5)) out.push(`${el.id || el.className}: ${Math.round(r.right)}×${Math.round(r.bottom)}`);
    }
    return out;
  });
}

const content = nodeContent();
const mid = (): RunState => simulateRun(content, 3, AUTOPLAY, { maxBattles: 2 }).run;

describe('the title', () => {
  it('opens with no scene; without a save the primary button is New run', async () => {
    const p = await open('/?test=1');
    expect(await p.evaluate(() => window.__GAME__!.scene)).toBe('title');
    expect(await p.locator('#title .wordmark').textContent()).toBe('Spore & Sprawl');
    expect(await p.locator('#title-continue').count()).toBe(0);
    expect(await p.locator('#title-new').getAttribute('class')).toContain('primary');
    expect(await clipped(p)).toEqual([]);
  });

  it('offers Continue for a saved run and resumes it', async () => {
    const run = mid();
    const p = await open('/?debug=1', { run });
    expect(await p.locator('#title-continue').textContent()).toContain(`Heartcap ${run.heartcap.hp}/${run.heartcap.max}`);
    await p.locator('#title-continue').click();
    await p.waitForSelector('#route');
    expect(await p.evaluate(() => window.__GAME__!.run()?.battles.length)).toBe(run.battles.length);
    // and the route leads back to the title
    await p.locator('#to-title').click();
    await p.waitForSelector('#title-continue');
  });

  it('opens Help in four tabs, and the settings screen with sound and damage numbers', async () => {
    const p = await open('/?test=1');
    await p.locator('#title-help').click();
    expect(await p.locator('#help [role="tab"]').allTextContents()).toEqual(['Matrix', 'Merging', 'The general', 'Keys']);
    await p.locator('#help-tab-matrix').focus();
    await p.keyboard.press('ArrowRight');
    expect(await p.locator('#help-tab-merging').getAttribute('aria-selected')).toBe('true');
    expect(await p.locator('#help-merging').isVisible()).toBe(true);
    await p.keyboard.press('Escape');
    expect(await p.locator('#help').count()).toBe(0);
    await p.locator('#settings-btn').click();
    expect(await p.locator('#settings input[data-level]').count()).toBe(3);
    expect(await p.locator('#settings [data-numbers]').count()).toBe(3);
    expect(await p.locator('#settings-paused').count()).toBe(0);
    expect(await clipped(p)).toEqual([]);
  });
});

describe('the route', () => {
  it('joins every node to every node in the next row, and lights a pod’s threads on hover', async () => {
    const p = await open('/?scene=route&seed=3&autoplay=battles:2&test=1');
    const run = simulateRun(content, 3, AUTOPLAY, { maxBattles: 2 }).run;
    const sizes = run.route.map((r) => r.length);
    const want = sizes[0]! + sizes.slice(1).reduce((n, s, i) => n + s * sizes[i]!, 0);
    expect(await p.locator('.hyphae .thread').count()).toBe(want);
    expect(await p.locator('.thread.walked').count()).toBe(run.path.length);
    expect(await p.locator('.thread.open').count()).toBe(sizes[run.path.length]!);
    expect(await p.locator('.route-node.open').count()).toBe(sizes[run.path.length]!);
    const node = p.locator('.route-node.future').first();
    const id = await node.getAttribute('data-node');
    await node.hover();
    const hot = await p.locator('.thread.hot').evaluateAll((ts) => ts.map((t) => [(t as SVGElement).dataset.from, (t as SVGElement).dataset.to]));
    expect(hot.length).toBeGreaterThan(0);
    for (const [a, b] of hot) expect([a, b]).toContain(id);
    expect(await p.locator('#route-legend .legend-item').count()).toBe(7);
    expect(await clipped(p)).toEqual([]);
  });
});

describe('spoils, events and the Grove', () => {
  it('spoils show 1–3 keycaps and take the keys', async () => {
    const run = mid();
    run.screen = { kind: 'spoils', picks: [{ label: 'Spoils', battleIndex: 2, freeRerolls: 0, cards: 3, rareBonus: 0, relicsOnly: false,
      offer: [{ id: 'bp:hammercapForge', type: 'blueprint', rarity: 'uncommon' }, { id: 'up:gillNest', type: 'upgrade', rarity: 'common' }, { id: 'relic:martyrsBloom', type: 'relic', rarity: 'rare' }] }] };
    const p = await open('/?scene=run&debug=1', { run });
    expect(await p.locator('#spoils-cards .draft-key').allTextContents()).toEqual(['1', '2', '3']);
    expect(await p.locator('#spoils-cards .draft-card.blueprint .draft-chips').textContent()).toContain('170');
    expect(await p.locator('#spoils-cards .draft-card.rare .sparkle').count()).toBe(2);
    expect(await clipped(p)).toEqual([]);
    await p.keyboard.press('3');
    await p.waitForFunction(() => window.__GAME__!.run()?.screen !== 'spoils');
    expect(await p.evaluate((k) => JSON.parse(localStorage.getItem(k)!).relics, RUN_KEY)).toContain('martyrsBloom');
  });

  it('an event shows its scene and outcome chips, with a real minus for costs', async () => {
    const run = mid();
    run.screen = { kind: 'event', event: 'fallen-oak' };
    const p = await open('/?scene=run&debug=1', { run });
    expect(await p.locator('#event .vignette canvas.scene').count()).toBe(1);
    const chips = await p.locator('#event .choice').first().locator('.outcome').allTextContents();
    expect(chips).toEqual(['+1 rare relic', '−15% max Heartcap']);
    expect(await p.locator('#event .choice').first().locator('.outcome.cost').count()).toBe(1);
    expect(await clipped(p)).toEqual([]);
  });

  it('the Grove disables Graft with its reason once every track is maxed', async () => {
    const run = createRun(content, { seed: 9 });
    for (const id of run.kit) run.upgrades[id] = content.upgrades[id]!.levels.length;
    run.screen = { kind: 'grove' };
    const p = await open('/?scene=run&debug=1', { run });
    const graft = p.locator('#grove .choice').nth(1);
    expect(await graft.isDisabled()).toBe(true);
    expect(await graft.textContent()).toContain('last level');
  });
});

describe('fit at small windows', () => {
  for (const [w, hgt] of [[1280, 720], [1366, 650]] as const) {
    it(`no run screen clips at ${w}×${hgt}`, async () => {
      for (const q of ['/?test=1', '/?scene=route&seed=3&autoplay=battles:2&test=1', '/?scene=summary&seed=7&autoplay=run&test=1']) {
        const p = await open(q, { width: w, height: hgt });
        expect(await clipped(p), q).toEqual([]);
        await p.close();
        page = undefined;
      }
    });
  }

  it('Help fits at 1280×720 with no key cell over two lines', async () => {
    const p = await open('/?scene=deploy&map=test-flat&enemy=human&seed=1&test=1&paused=1');
    await p.locator('#help-btn').click();
    for (const tab of ['matrix', 'merging', 'general', 'keys']) {
      await p.locator(`#help-tab-${tab}`).click();
      const fit = await p.evaluate(() => {
        const card = document.getElementById('help')!.getBoundingClientRect();
        const panel = document.querySelector<HTMLElement>('.help-panel:not([hidden])')!;
        return { bottom: card.bottom, overflow: panel.scrollHeight - panel.clientHeight };
      });
      expect(fit.bottom, tab).toBeLessThanOrEqual(720);
      expect(fit.overflow, tab).toBeLessThanOrEqual(0);
    }
    const cells = await p.locator('#help-keys .caps').evaluateAll((caps) => caps.map((c) => c.getBoundingClientRect().height));
    for (const hgt of cells) expect(hgt).toBeLessThan(40);
  });
});
