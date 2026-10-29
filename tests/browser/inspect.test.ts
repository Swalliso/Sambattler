import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { chromium } from 'playwright';
import type { Browser, Locator, Page } from 'playwright';
import { createServer } from 'vite';
import type { ViteDevServer } from 'vite';

let server: ViteDevServer | undefined;
let browser: Browser | undefined;
let page: Page;
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

beforeEach(async () => {
  page = await browser!.newPage({ viewport: { width: 1280, height: 720 } });
  await page.goto(`${base}/?scene=deploy&map=test-flat&enemy=human&seed=1&test=1&paused=1`);
  await page.waitForFunction(() => window.__GAME__?.ready === true);

  // Two different home buildings let us check that persistent controls follow the selection.
  const canvas = page.locator('#battlefield');
  const box = (await canvas.boundingBox())!;
  await page.locator('[data-building="sporelingBurrow"]').click();
  await canvas.click({ position: { x: box.width * 2.5 / 36, y: box.height * 0.5 / 8 } });
  await page.waitForFunction(() => window.__GAME__?.summary()?.buildings.player === 1);
  await page.locator('[data-building="capguardHall"]').click();
  await canvas.click({ position: { x: box.width * 2.5 / 36, y: box.height * 3.5 / 8 } });
  await page.waitForFunction(() => window.__GAME__?.summary()?.buildings.player === 2);
});

afterEach(async () => {
  await page?.close();
});

async function advanceTicks(count: number): Promise<void> {
  const tick = await page.evaluate(() => window.__GAME__!.tick);
  await page.waitForFunction((target) => (window.__GAME__?.tick ?? 0) >= target, tick + count);
}

async function expectText(locator: Locator, value: string | RegExp): Promise<void> {
  if (typeof value === 'string') await expect.poll(() => locator.textContent()).toBe(value);
  else await expect.poll(() => locator.textContent()).toMatch(value);
}

async function expectFocused(id: string): Promise<void> {
  expect(await page.evaluate(() => document.activeElement?.id)).toBe(id);
}

describe('deploy-phase inspection', () => {
  it('begins with Enter without activating a focused inspector button', async () => {
    await page.keyboard.press('Tab');
    await expectText(page.locator('#inspect h3'), 'Sporeling Burrow · yours');
    const sell = page.locator('#sell-btn');
    await sell.click();
    await expectText(sell, /^Confirm sell \(\+\d+\) \[X\]$/);
    await expectFocused('sell-btn');

    await page.keyboard.press('Enter');
    await page.waitForFunction(() => window.__GAME__?.summary()?.phase === 'live');
    await page.keyboard.press('Space');
    await advanceTicks(2);
    expect(await page.evaluate(() => window.__GAME__!.summary()!.buildings.player)).toBe(2);
  });
});

describe('live building inspection at 3× speed', () => {
  beforeEach(async () => {
    await page.keyboard.press('Enter');
    await page.keyboard.press('Tab');
    await page.waitForFunction(() => document.querySelector('#inspect h3')?.textContent === 'Sporeling Burrow · yours');
    await page.locator('[data-speed="3"]').click();
    await page.keyboard.press('Space');
  });

  it('accepts a mouse click spanning ticks and retains keyboard focus when changing buildings', async () => {
    const merge = page.locator('#merge-btn');
    const tick = await page.evaluate(() => window.__GAME__!.tick);
    await merge.click({ delay: 150 });
    await expectText(merge, 'Merge OFF [M]');
    expect(await page.evaluate(() => window.__GAME__!.tick)).toBeGreaterThan(tick + 3);
    await advanceTicks(6);
    await expectFocused('merge-btn');

    await merge.press('Enter');
    await expectText(merge, 'Merge ON [M]');
    await page.keyboard.press('Tab');
    await expectText(page.locator('#inspect h3'), 'Capguard Hall · yours');
    await advanceTicks(6);
    await expectFocused('merge-btn');
    await page.keyboard.press('Enter');
    await expectText(merge, 'Merge OFF [M]');

    // The new selection's handler must toggle the Capguard Hall, leaving the Burrow alone.
    await page.keyboard.press('Tab');
    await expectText(page.locator('#inspect h3'), 'Sporeling Burrow · yours');
    await expectText(merge, 'Merge ON [M]');
  });

  it('requires two sell presses for the same building and clears confirmation on selection changes', async () => {
    const sell = page.locator('#sell-btn');
    await sell.click({ delay: 150 });
    await expectText(sell, /^Confirm sell \(\+\d+\) \[X\]$/);
    expect(await page.evaluate(() => window.__GAME__!.summary()!.buildings.player)).toBe(2);
    await advanceTicks(6);
    await expectFocused('sell-btn');

    await page.keyboard.press('Tab');
    await expectText(page.locator('#inspect h3'), 'Capguard Hall · yours');
    await expectText(sell, /^Sell for \d+ \[X\]$/);
    await expectFocused('sell-btn');
    await page.keyboard.press('Enter');
    await expectText(sell, /^Confirm sell \(\+\d+\) \[X\]$/);
    expect(await page.evaluate(() => window.__GAME__!.summary()!.buildings.player)).toBe(2);

    await sell.click({ delay: 150 });
    await page.waitForFunction(() => window.__GAME__?.summary()?.buildings.player === 1);
    await page.waitForFunction(() => document.getElementById('inspect')?.dataset.mode === 'none');
    await page.keyboard.press('Tab');
    await expectText(page.locator('#inspect h3'), 'Sporeling Burrow · yours');
    await expectText(sell, /^Sell for \d+ \[X\]$/);
    expect(await page.evaluate(() => window.__GAME__!.summary()!.rejectedCommands)).toBe(0);
  });
});
