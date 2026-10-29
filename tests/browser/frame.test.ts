// The field's frame (docs/ui-ux-plan.md, Phase 1a): the roots ceiling and soil bed fill the void between
// the bands at any window, line up with the field's pixels, take no input and, under ?test=1, hold still.
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

// 2× and 3× integer scales, UI scale below 720, and Twin Roots' fractional scale
for (const [width, height, map] of [[1280, 720, 'bogwater-hollow'], [1920, 1080, 'bogwater-hollow'], [1366, 650, 'bogwater-hollow'], [1280, 720, 'twin-roots']] as const) {
  describe(`${map} in a ${width}×${height} window`, () => {
    it('fills the void between the bands, on the field\'s pixel grid, and lets clicks through', async () => {
      page = await browser!.newPage({ viewport: { width, height } });
      await page.goto(`${base}/?map=${map}&seed=1&test=1`);
      await page.waitForFunction(() => window.__GAME__?.ready === true);
      await page.evaluate(() => document.fonts.ready.then(() => true));
      await page.waitForTimeout(100);

      const m = await page.evaluate(() => {
        const r = (el: Element) => el.getBoundingClientRect();
        const field = document.getElementById('battlefield') as HTMLCanvasElement;
        const [back, spores] = [...document.querySelectorAll<HTMLCanvasElement>('.fieldframe canvas')];
        const box = r(document.querySelector('.fieldframe')!), f = r(field), b = r(back!);
        const above = document.elementFromPoint(f.left + f.width / 2, (box.top + f.top) / 2);
        return {
          top: r(document.querySelector('header.top')!).bottom, bottom: r(document.querySelector('footer.bottom')!).top,
          box: { top: box.top, bottom: box.bottom, left: box.left, right: box.right },
          back: { left: b.left, top: b.top, right: b.right, bottom: b.bottom }, field: { left: f.left, top: f.top, width: f.width },
          fieldNative: field.width, backNative: back!.width, sporesNative: [spores!.width, spores!.height], backNativeH: back!.height,
          overflow: getComputedStyle(document.querySelector('.fieldframe')!).overflow,
          clickThrough: !above?.closest('.fieldframe'),
        };
      });
      // the frame's box runs from the top band to the bottom band, clipped, and its canvas covers all of it
      expect(Math.abs(m.box.top - m.top)).toBeLessThan(0.5);
      expect(Math.abs(m.box.bottom - m.bottom)).toBeLessThan(0.5);
      expect(m.overflow).toBe('hidden');
      expect(m.back.left).toBeLessThanOrEqual(m.box.left + 0.5);
      expect(m.back.right).toBeGreaterThanOrEqual(m.box.right - 0.5);
      expect(m.back.top).toBeLessThanOrEqual(m.box.top + 0.5);
      expect(m.back.bottom).toBeGreaterThanOrEqual(m.box.bottom - 0.5);
      // one frame pixel is one field pixel, and the grids line up
      const s = m.field.width / m.fieldNative;
      expect((m.back.right - m.back.left) / m.backNative).toBeCloseTo(s, 3);
      const off = (m.field.left - m.back.left) / s, offY = (m.field.top - m.back.top) / s;
      expect(Math.abs(off - Math.round(off))).toBeLessThan(0.01);
      expect(Math.abs(offY - Math.round(offY))).toBeLessThan(0.01);
      expect(m.sporesNative).toEqual([m.backNative, m.backNativeH]);
      // the frame never takes the mouse
      expect(m.clickThrough).toBe(true);
    });
  });
}

describe('ambient spores', () => {
  it('hold still under ?test=1', async () => {
    page = await browser!.newPage({ viewport: { width: 1280, height: 720 } });
    await page.goto(`${base}/?map=bogwater-hollow&seed=1&test=1`);
    await page.waitForFunction(() => window.__GAME__?.ready === true);
    const pixels = () => page!.evaluate(() => {
      const c = document.querySelectorAll<HTMLCanvasElement>('.fieldframe canvas')[1]!;
      const d = c.getContext('2d')!.getImageData(0, 0, c.width, c.height).data;
      const lit: number[] = [];
      for (let i = 3; i < d.length; i += 4) if (d[i]) lit.push(i);
      return lit;
    });
    const first = await pixels();
    expect(first.length).toBeGreaterThan(10);
    await page.waitForTimeout(500);
    expect(await pixels()).toEqual(first);
  });
});
