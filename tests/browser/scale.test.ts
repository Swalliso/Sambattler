// UI scale (docs/ui-ux-plan.md, D1): a window under 1280×720 lays the page out at 1280×720 or more and
// scales it down to fit. Nothing is clipped, and the mouse still lands on the tile under it.
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { chromium } from 'playwright';
import type { Browser, Page } from 'playwright';
import { createServer } from 'vite';
import type { ViteDevServer } from 'vite';

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
});

for (const [width, height] of [[1366, 650], [1024, 600]] as const) {
  describe(`a ${width}×${height} window`, () => {
    it('fits both bands and keeps the mouse on the right tile', async () => {
      page = await browser!.newPage({ viewport: { width, height } });
      await page.goto(`${base}/?scene=deploy&map=test-flat&enemy=human&seed=1&test=1&paused=1`);
      await page.waitForFunction(() => window.__GAME__?.ready === true);
      await page.evaluate(() => document.fonts.ready.then(() => true));

      const ui = Math.min(1, width / 1280, height / 720);
      expect(Number(await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--ui-scale')))).toBeCloseTo(ui, 5);
      const top = (await page.locator('header.top').boundingBox())!;
      const bottom = (await page.locator('footer.bottom').boundingBox())!;
      expect(top.y).toBeGreaterThanOrEqual(0);
      expect(bottom.y + bottom.height).toBeLessThanOrEqual(height + 0.5);
      expect(bottom.x + bottom.width).toBeLessThanOrEqual(width + 0.5);

      // test-flat is 32×8 tiles plus a two-tile Heartcap strip at each end
      const box = (await page.locator('#battlefield').boundingBox())!;
      const at = (col: number, row: number) => ({ x: box.x + ((col + 2.5) * box.width) / 36, y: box.y + ((row + 0.5) * box.height) / 8 });

      // hovering: the ghost tip sits just right of the hovered 2×2 footprint
      await page.locator('[data-building="sporelingBurrow"]').click();
      await page.mouse.move(at(20, 5).x, at(20, 5).y);
      const tip = (await page.locator('#ghost-tip').boundingBox())!;
      expect(Math.abs(tip.x - (box.x + ((20 + 3) * box.width) / 36 + 14 * ui))).toBeLessThan(1.5);

      // placing and inspecting: the building lands under the mouse and a click on it selects it
      await page.mouse.click(at(1, 5).x, at(1, 5).y);
      await page.waitForFunction(() => window.__GAME__?.summary()?.buildings.player === 1);
      await page.mouse.click(at(2, 6).x, at(2, 6).y);
      await expect.poll(() => page!.locator('#inspect h3').textContent()).toBe('Sporeling Burrow · yours');
      await page.mouse.click(at(3, 6).x, at(3, 6).y);
      await expect.poll(() => page!.locator('#inspect h3').textContent()).toBe('INSPECT');
    });
  });
}
