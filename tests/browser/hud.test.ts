// The battle HUD (docs/ui-ux-plan.md, Phase 1b): both Heartcaps frame the top band, Begin and its hint
// stay off the field, the tray never clips or scrolls sideways (two compact rows when 14 cards don't fit
// one row), unaffordable cards are unlit rather than faded, legal tiles light up while placing, the
// ghost tip stays beside its footprint inside the field, damage numbers save from the settings popover,
// and battle 1's economy tip still fires.
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

/** test-flat (32×8 tiles plus a two-tile Heartcap strip at each end) in deploy, with the full 14-building kit. */
const DEPLOY = '/?scene=deploy&map=test-flat&enemy=human&seed=1&test=1';

async function open(query: string, width = 1280, height = 720): Promise<Page> {
  const p = await browser!.newPage({ viewport: { width, height } });
  await p.goto(`${base}${query}`);
  await p.waitForFunction(() => window.__GAME__?.ready === true);
  await p.evaluate(() => document.fonts.ready.then(() => true));
  return p;
}

type Box = { x: number; y: number; width: number; height: number };
const inside = (a: Box, b: Box) => a.x >= b.x - 0.5 && a.y >= b.y - 0.5 && a.x + a.width <= b.x + b.width + 0.5 && a.y + a.height <= b.y + b.height + 0.5;
const overlap = (a: Box, b: Box) => a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;

describe('the top band', () => {
  it('puts your Heartcap and theirs at the ends of the territory tug', async () => {
    page = await open(`${DEPLOY}&paused=1`);
    const [mine, tug, theirs] = await Promise.all(['#hud-hp-player', '#hud-tug', '#hud-hp-enemy'].map((s) => page!.locator(s).boundingBox()));
    expect(mine!.x + mine!.width).toBeLessThanOrEqual(tug!.x);
    expect(theirs!.x).toBeGreaterThanOrEqual(tug!.x + tug!.width);
    expect(await page.locator('#hud-hp-player .heart-hp').textContent()).toBe('3000/3000');
    expect(await page.locator('#hud-hp-enemy .heart-label').textContent()).toBe('Gray Rot Heartcap');
    // nothing is pinned to the field's corners any more
    expect(await page.locator('.fieldwrap .hp').count()).toBe(0);
  });
});

describe('the tray', () => {
  // the longest names and summaries; nine full-size cards at 1280 are the narrowest they get
  const NINE = ['truffleCellar', 'sporeExchange', 'sporelingBurrow', 'gillNest', 'rootbreakerDen', 'hammercapForge', 'veilstalkerHollow', 'puffballMortar', 'rhizomeVault'];
  for (const [width, height, cards, compact] of [[1280, 720, 14, true], [1366, 650, 14, true], [1920, 1080, 14, false], [1280, 720, 9, false]] as const) {
    it(`fits ${cards} cards in a ${width}×${height} window with nothing clipped`, async () => {
      page = await open(`${DEPLOY}&paused=1`, width, height);
      if (cards === 9) {
        await page.evaluate((kit) => { window.__GAME__!.battle()!.sides.player.kit.splice(0, Infinity, ...kit); }, NINE);
        await expect.poll(() => page!.locator('#tray .card').count()).toBe(9);
      }
      const m = await page.evaluate(() => {
        const tray = document.getElementById('tray')!;
        const r = (e: Element) => { const b = e.getBoundingClientRect(); return { x: b.x, y: b.y, width: b.width, height: b.height }; };
        return {
          compact: tray.classList.contains('compact'), scroll: tray.scrollWidth - tray.clientWidth, tray: r(tray),
          band: r(document.querySelector('footer.bottom')!),
          cards: [...tray.querySelectorAll<HTMLElement>('.card')].map((c) => ({
            box: r(c),
            // what overflows, by name, so a failure says where
            clipped: [
              ...(c.scrollHeight > c.clientHeight + 0.5 ? [`${c.dataset.building} card ${c.scrollHeight}/${c.clientHeight}`] : []),
              ...[...c.querySelectorAll('.name, .role, .out, .price')].filter((e) => e.scrollWidth > e.clientWidth + 0.5)
                .map((e) => `${c.dataset.building} .${e.className} ${e.scrollWidth}/${e.clientWidth}`),
            ],
          })),
        };
      });
      expect(m.cards).toHaveLength(cards);
      expect(m.compact).toBe(compact);
      expect(m.scroll).toBeLessThanOrEqual(0);
      for (const c of m.cards) {
        expect(inside(c.box, m.tray)).toBe(true);
        expect(inside(c.box, m.band)).toBe(true);
        expect(c.clipped).toEqual([]);
      }
    });
  }

  it('keeps three cards at card width instead of stretching them', async () => {
    page = await open(`${DEPLOY}&paused=1`);
    await page.evaluate(() => { window.__GAME__!.battle()!.sides.player.kit.splice(0, Infinity, 'sporelingBurrow', 'capguardHall', 'truffleCellar'); });
    await expect.poll(() => page!.locator('#tray .card').count()).toBe(3);
    // economy first, and the hotkeys follow
    expect(await page.locator('#tray .card').first().getAttribute('data-building')).toBe('truffleCellar');
    expect(await page.locator('#tray .card .key').first().textContent()).toBe('1');
    for (const b of await page.locator('#tray .card').evaluateAll((cs) => cs.map((c) => c.getBoundingClientRect().width))) expect(b).toBeLessThanOrEqual(108.5);
    expect(await page.locator('#tray').evaluate((t) => t.classList.contains('compact'))).toBe(false);
  });

  it('unlights cards you can\'t afford, with what you still need, and never fades them', async () => {
    page = await open(`${DEPLOY}&paused=1`);
    await page.evaluate(() => { window.__GAME__!.battle()!.sides.player.gold = 120; });
    const hall = page.locator('[data-building="capguardHall"]');
    await expect.poll(() => hall.evaluate((c) => c.classList.contains('poor'))).toBe(true);
    expect(await hall.locator('.need-label').textContent()).toBe('need 30');
    expect(await hall.getAttribute('aria-label')).toBe('Capguard Hall, 150 gold, not enough gold');
    const look = await hall.evaluate((c) => ({
      opacity: getComputedStyle(c).opacity, art: getComputedStyle(c.querySelector('.art')!).filter,
      price: getComputedStyle(c.querySelector('.price')!).color, name: getComputedStyle(c.querySelector('.name')!).color,
    }));
    expect(look.opacity).toBe('1');
    expect(look.art).toContain('grayscale(1)');
    expect(look.price).toBe('rgb(224, 100, 90)'); // --danger
    expect(look.name).toBe('rgb(236, 228, 244)'); // --text: the name stays readable
    // a card you can afford stays lit
    expect(await page.locator('[data-building="sporelingBurrow"]').evaluate((c) => c.classList.contains('poor'))).toBe(false);
  });
});

describe('deploy', () => {
  it('puts Begin in the bottom band and its hint in the callout lane; speed and pause replace it once live', async () => {
    page = await open(DEPLOY);
    const begin = (await page.locator('#begin-btn').boundingBox())!;
    expect(inside(begin, (await page.locator('footer.bottom').boundingBox())!)).toBe(true);
    expect(overlap(begin, (await page.locator('#battlefield').boundingBox())!)).toBe(false);
    expect(await page.locator('#callouts #deploy-hint').textContent()).toContain('then press Begin');
    expect(await page.locator('.seg.speed').isVisible()).toBe(false);
    await page.keyboard.press('Enter');
    await page.waitForFunction(() => (window.__GAME__?.tick ?? 0) > 0);
    await expect.poll(() => page!.locator('#begin-btn').isVisible()).toBe(false);
    expect(await page.locator('#deploy-hint').count()).toBe(0);
    expect(await page.locator('.seg.speed [data-speed="1"]').getAttribute('aria-pressed')).toBe('true');
    // pausing pins "Paused" in the callout lane, not over the field
    await page.keyboard.press('Space');
    await expect.poll(() => page!.locator('#callouts #paused-callout').count()).toBe(1);
    expect(await page.locator('#pause-btn').getAttribute('aria-pressed')).toBe('true');
  });

  it('lights your legal tiles while placing, and only yours', async () => {
    page = await open(`${DEPLOY}&paused=1`);
    // the left edge of a tile, on its middle row, in native canvas pixels (two-tile strip at each end)
    const edge = (col: number, row: number) => page!.evaluate(([c, r]) => {
      const cv = document.getElementById('battlefield') as HTMLCanvasElement;
      return [...cv.getContext('2d')!.getImageData((c! + 2) * 16, r! * 16 + 8, 1, 1).data].slice(0, 3);
    }, [col, row]);
    await page.mouse.move(5, 5); // off the field: no ghost
    const mineBefore = await edge(1, 1), theirsBefore = await edge(30, 1);
    await page.locator('[data-building="capguardHall"]').click();
    await page.mouse.move(5, 5);
    await page.waitForTimeout(100);
    expect(await edge(1, 1)).not.toEqual(mineBefore);
    expect(await edge(30, 1)).toEqual(theirsBefore);
    await page.keyboard.press('Escape');
    await page.waitForTimeout(100);
    expect(await edge(1, 1)).toEqual(mineBefore);
  });

  it('keeps the ghost tip inside the field and off the footprint, even at the right edge', async () => {
    page = await open(`${DEPLOY}&paused=1`);
    const box = (await page.locator('#battlefield').boundingBox())!;
    const tile = box.width / 36;
    await page.locator('[data-building="sporelingBurrow"]').click();
    for (const col of [4, 16, 31]) {
      await page.mouse.move(box.x + (col + 2.5) * tile, box.y + 4.5 * tile);
      const tip = (await page.locator('#ghost-tip').boundingBox())!;
      // a 2×2 footprint centred on the cursor, clamped to the map
      const left = Math.min(col, 30);
      const footprint = { x: box.x + (left + 2) * tile, y: box.y + 4 * tile, width: 2 * tile, height: 2 * tile };
      expect(inside(tip, box)).toBe(true);
      expect(overlap(tip, footprint)).toBe(false);
    }
    expect(await page.locator('#ghost-tip .bad').textContent()).toBe('not your territory');
  });
});

describe('controls', () => {
  it('saves damage numbers from the settings popover', async () => {
    page = await open(`${DEPLOY}&paused=1`);
    await page.evaluate(() => localStorage.removeItem('spore-sprawl/settings/v1'));
    expect(await page.locator('#settings-pop').isVisible()).toBe(false);
    await page.locator('#settings-btn').click();
    expect(await page.locator('#settings-pop').isVisible()).toBe(true);
    expect(await page.locator('#settings-btn').getAttribute('aria-expanded')).toBe('true');
    await page.locator('#numbers [data-numbers="all"]').click();
    await expect.poll(() => page!.locator('#numbers [data-numbers="all"]').getAttribute('aria-pressed')).toBe('true');
    expect(JSON.parse((await page.evaluate(() => localStorage.getItem('spore-sprawl/settings/v1')))!).damageNumbers).toBe('all');
    // Escape closes the popover and leaves focus on the cog
    await page.keyboard.press('Escape');
    expect(await page.locator('#settings-pop').isVisible()).toBe(false);
    expect(await page.evaluate(() => document.activeElement?.id)).toBe('settings-btn');
    // the popover sits above the band, inside the window
    await page.locator('#settings-btn').click();
    const pop = (await page.locator('#settings-pop').boundingBox())!;
    expect(pop.x).toBeGreaterThanOrEqual(0);
    expect(pop.y + pop.height).toBeLessThanOrEqual((await page.locator('#settings-btn').boundingBox())!.y);
    // a press outside closes it
    await page.mouse.click(640, 40);
    expect(await page.locator('#settings-pop').isVisible()).toBe(false);
  });

  it('shows the empty inspect panel as a short tip', async () => {
    page = await open(`${DEPLOY}&paused=1`);
    const text = (await page.locator('#inspect').textContent())!;
    expect(text).toContain('Click a building or unit');
    expect(text).not.toContain('Tab cycle');
  });
});

describe('battle 1', () => {
  it('still tips the economy at 0:30 when none is built, and pulses the economy cards', async () => {
    page = await open('/?map=test-flat&enemy=human&seed=1&test=1&battleIndex=1&ticks=590');
    await expect.poll(() => page!.locator('#callouts').textContent(), { timeout: 10_000 }).toContain('Tip: a Truffle Cellar [1]');
    expect(await page.locator('[data-building="truffleCellar"]').evaluate((c) => c.classList.contains('nudge'))).toBe(true);
    expect(await page.locator('[data-building="capguardHall"]').evaluate((c) => c.classList.contains('nudge'))).toBe(false);
  });
});
