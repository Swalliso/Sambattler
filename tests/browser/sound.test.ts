// Sound (SPEC §13.9) in a real browser: ?test=1 never makes an AudioContext, mute survives a reload
// under the same settings key, and the sound board plays every sound without errors.
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { chromium } from 'playwright';
import type { Browser, Page } from 'playwright';
import { createServer } from 'vite';
import type { ViteDevServer } from 'vite';

let server: ViteDevServer | undefined;
let browser: Browser | undefined;
let page: Page | undefined;
let base: string;

declare global {
  interface Window { __audioContexts?: number }
}

/** Counts AudioContexts the page makes (and still lets it make them). */
async function countContexts(p: Page): Promise<void> {
  await p.addInitScript(() => {
    window.__audioContexts = 0;
    const Real = window.AudioContext;
    if (!Real) return;
    window.AudioContext = class extends Real {
      constructor(...args: ConstructorParameters<typeof AudioContext>) {
        super(...args);
        window.__audioContexts = (window.__audioContexts ?? 0) + 1;
      }
    };
  });
}

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
});

const DEPLOY = '/?scene=deploy&map=test-flat&enemy=human&seed=1&test=1&paused=1';

describe('sound', () => {
  it('?test=1 makes no AudioContext, whatever the player clicks or presses', async () => {
    page = await browser!.newPage({ viewport: { width: 1280, height: 720 } });
    await countContexts(page);
    await page.goto(`${base}${DEPLOY}`);
    await page.waitForFunction(() => window.__GAME__?.ready === true);
    await page.locator('[data-building="sporelingBurrow"]').click();
    const box = (await page.locator('#battlefield').boundingBox())!;
    await page.mouse.click(box.x + box.width * 0.1, box.y + box.height * 0.6);
    await page.keyboard.press('Space');
    await page.locator('.sound-mute').click();
    await page.keyboard.press('s');
    await page.locator('#begin-btn').click();
    expect(await page.evaluate(() => window.__audioContexts)).toBe(0);
    expect(await page.evaluate(() => window.__GAME__!.errors)).toEqual([]);
  });

  it('mute persists across a reload, under spore-sprawl/settings/v1', async () => {
    page = await browser!.newPage({ viewport: { width: 1280, height: 720 } });
    await page.goto(`${base}${DEPLOY}`);
    await page.waitForFunction(() => window.__GAME__?.ready === true);
    // a save from before sound keeps its setting and gains the sound defaults
    await page.evaluate(() => localStorage.setItem('spore-sprawl/settings/v1', JSON.stringify({ damageNumbers: 'big' })));
    await page.reload();
    await page.waitForFunction(() => window.__GAME__?.ready === true);
    const mute = page.locator('.sound-mute');
    await expect.poll(() => mute.getAttribute('aria-pressed')).toBe('false');
    await mute.click();
    await expect.poll(() => mute.getAttribute('aria-pressed')).toBe('true');

    await page.reload();
    await page.waitForFunction(() => window.__GAME__?.ready === true);
    await expect.poll(() => page!.locator('.sound-mute').getAttribute('aria-pressed')).toBe('true');
    const saved = JSON.parse((await page.evaluate(() => localStorage.getItem('spore-sprawl/settings/v1')))!);
    expect(saved).toMatchObject({ damageNumbers: 'big', masterVolume: 0.6, sfxVolume: 0.8, ambientVolume: 0.5, muted: true });
    await page.locator('#settings-btn').click();
    expect(await page.locator('#numbers [data-numbers="big"]').getAttribute('aria-pressed')).toBe('true');
    await page.keyboard.press('Escape');

    // S unmutes, and that persists too
    await page.keyboard.press('s');
    await expect.poll(() => page!.locator('.sound-mute').getAttribute('aria-pressed')).toBe('false');
    await page.reload();
    await page.waitForFunction(() => window.__GAME__?.ready === true);
    await expect.poll(() => page!.locator('.sound-mute').getAttribute('aria-pressed')).toBe('false');
  });

  it('the volume popover opens on hover and its sliders save', async () => {
    page = await browser!.newPage({ viewport: { width: 1280, height: 720 } });
    await page.goto(`${base}${DEPLOY}`);
    await page.waitForFunction(() => window.__GAME__?.ready === true);
    await page.locator('.sound-mute').hover();
    const slider = page.locator('.sound-pop input[data-level="ambient"]');
    await expect.poll(() => slider.isVisible()).toBe(true);
    await slider.fill('20');
    const saved = JSON.parse((await page.evaluate(() => localStorage.getItem('spore-sprawl/settings/v1')))!);
    expect(saved.ambientVolume).toBe(0.2);
    // the popover opens above the speaker, inside the window
    const pop = (await page.locator('.sound-pop').boundingBox())!;
    expect(pop.y).toBeGreaterThanOrEqual(0);
    expect(pop.x + pop.width).toBeLessThanOrEqual(1280);
    expect(pop.y + pop.height).toBeLessThanOrEqual((await page.locator('.sound-mute').boundingBox())!.y);
  });

  it('the sound board plays every sound', async () => {
    page = await browser!.newPage({ viewport: { width: 1280, height: 720 } });
    await countContexts(page);
    const problems: string[] = [];
    page.on('pageerror', (e) => problems.push(e.message));
    page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') problems.push(m.text()); });
    // automated browsers have sound off unless ?sound=1
    await page.goto(`${base}/?scene=sounds&sound=1`);
    const plays = page.locator('.sb-play');
    const n = await plays.count();
    expect(n).toBeGreaterThanOrEqual(30);
    for (let i = 0; i < n; i++) await plays.nth(i).click();
    expect(await page.evaluate(() => window.__audioContexts)).toBe(1);
    await expect.poll(() => page!.locator('#sb-voices').textContent()).toMatch(/^voices \d+\/12$/);
    expect(problems).toEqual([]);
  });
});
