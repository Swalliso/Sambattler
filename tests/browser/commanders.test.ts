// Milestone 5 in the browser (SPEC §16 M5): the Underroot's commander cards and bans lead into a run
// with that commander, and the commander power's UX: Q or the button, a reticle with the power's
// radius, aiming while paused, firing on the next tick, and the cooldown ring.
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
  page = undefined;
});

async function open(query: string): Promise<Page> {
  const p = await browser!.newPage({ viewport: { width: 1280, height: 720 }, reducedMotion: 'reduce' });
  page = p;
  await p.goto(`${base}${query}`);
  await p.waitForFunction(() => window.__GAME__?.ready === true);
  await p.evaluate(() => document.fonts.ready.then(() => true));
  return p;
}

/** Moves the mouse to a point on the field given in world tiles. */
async function hoverTile(p: Page, x: number, y: number): Promise<void> {
  const at = await p.evaluate(([tx, ty]) => {
    const c = document.getElementById('battlefield') as HTMLCanvasElement;
    const r = c.getBoundingClientRect();
    return { x: r.left + ((tx + 2) * 16 * r.width) / c.width, y: r.top + (ty * 16 * r.height) / c.height };
  }, [x, y] as const);
  await p.mouse.move(at.x, at.y);
}

describe('the Underroot', () => {
  it('New run opens it; a commander and bans chosen there start the run', async () => {
    const p = await open('/?test=1&seed=5');
    await p.locator('#title-new').click();
    await p.waitForSelector('#underroot');
    expect(await p.locator('#underroot-hint').count()).toBe(1);
    expect(await p.locator('.commander-card').count()).toBe(3);
    expect(await p.locator('.commander-card.on').getAttribute('data-commander')).toBe('vesper');
    await p.locator('[data-commander="armilla"]').click();
    expect(await p.locator('[data-commander="armilla"]').getAttribute('aria-pressed')).toBe('true');
    // a starter building's tooltip says what it does
    await p.locator('[data-commander="armilla"] .uc-starter [data-building="puffballMortar"]').hover();
    expect(await p.locator('#underroot-tip').textContent()).toContain('Puffball Mortar');

    await p.locator('#tab-bans').click();
    expect(await p.locator('#bans').isVisible()).toBe(true);
    // Armilla's core can't be banned; three bans fill the list and lock the rest
    expect(await p.locator('[data-ban="hammercapForge"]').isDisabled()).toBe(true);
    expect(await p.locator('[data-ban="sporelingBurrow"]').isDisabled()).toBe(false);
    for (const id of ['sporelingBurrow', 'amanitaLodge', 'morelWarren']) await p.locator(`[data-ban="${id}"]`).click();
    expect(await p.locator('#ban-count').textContent()).toBe('3 of 3 banned.');
    expect(await p.locator('[data-ban="sporeExchange"]').isDisabled()).toBe(true);
    await p.locator('[data-ban="morelWarren"]').click(); // unban one
    expect(await p.locator('[data-ban="sporeExchange"]').isDisabled()).toBe(false);

    await p.locator('#underroot-begin').click();
    await p.waitForSelector('#route');
    const run = await p.evaluate(() => window.__GAME__!.run());
    expect(run).toMatchObject({ commander: 'armilla', bans: ['sporelingBurrow', 'amanitaLodge'], kit: ['capguardHall', 'truffleCellar', 'puffballMortar'] });
  });

  it('switching commander drops bans that are in the new core; Back returns to the title; the tip shows once', async () => {
    const p = await open('/?scene=underroot&tab=bans&test=1&seed=5');
    await p.locator('[data-ban="tendersRing"]').click();
    await p.locator('#tab-commanders').click();
    await p.locator('[data-commander="cordis"]').click();
    await p.locator('#tab-bans').click();
    expect(await p.locator('[data-ban="tendersRing"]').getAttribute('aria-pressed')).toBe('false');
    expect(await p.locator('[data-ban="tendersRing"]').isDisabled()).toBe(true);
    expect(await p.locator('#ban-count').textContent()).toBe('0 of 3 banned.');
    await p.locator('#underroot-back').click();
    await p.waitForSelector('#title');
    await p.locator('#title-new').click();
    await p.waitForSelector('#underroot');
    expect(await p.locator('#underroot-hint').count()).toBe(0);
  });
});

describe('the commander power', () => {
  it('Q aims a reticle with the power radius; a click while paused queues it, and it fires on the next tick', async () => {
    const p = await open('/?scenario=power-demo&paused=1&test=1&seed=1');
    const btn = p.locator('#power-btn');
    expect(await btn.getAttribute('data-state')).toBe('ready');
    expect(await p.locator('#power-state').textContent()).toBe('Ready');
    await p.keyboard.press('q');
    await expect.poll(() => btn.getAttribute('aria-pressed')).toBe('true');
    await hoverTile(p, 17.5, 3.2);
    await expect.poll(() => p.evaluate(() => document.getElementById('battlefield')!.dataset.reticle ?? '')).toMatch(/^17\.\d+,3\.\d+,2$/);
    expect(await p.locator('#aim-callout').textContent()).toMatch(/Spore Burst\d+ targets in range · click to fire/);
    // Esc cancels, the button aims again
    await p.keyboard.press('Escape');
    await expect.poll(() => btn.getAttribute('aria-pressed')).toBe('false');
    await expect.poll(() => p.locator('#aim-callout').count()).toBe(0);
    await btn.click();
    await hoverTile(p, 17.5, 3.2);
    const before = await p.evaluate(() => ({ tick: window.__GAME__!.tick, hp: window.__GAME__!.battle()!.units.filter((u) => u.side === 'enemy').reduce((n, u) => n + u.hp, 0) }));
    await p.mouse.down();
    await p.mouse.up();
    // paused: queued for the next tick, nothing happened yet
    const queued = await p.evaluate(() => window.__GAME__!.battle()!.queue.filter((c) => c.type === 'power').length);
    expect(queued).toBe(1);
    expect(await p.evaluate(() => window.__GAME__!.tick)).toBe(before.tick);
    await expect.poll(() => p.locator('#power-state').textContent()).toBe('Next tick');
    await p.keyboard.press('Space');
    await expect.poll(() => p.evaluate(() => window.__GAME__!.battle()!.stats.player.powerUses)).toBe(1);
    const after = await p.evaluate(() => window.__GAME__!.battle()!.units.filter((u) => u.side === 'enemy').reduce((n, u) => n + u.hp, 0));
    expect(after).toBeLessThan(before.hp);
    await p.keyboard.press('Space');
    // recharging: the ring restarts, the state counts down, and Q is refused with a reason
    await expect.poll(() => btn.getAttribute('data-state')).toBe('charging');
    await expect.poll(() => p.locator('#power-state').textContent()).toMatch(/^\d+ s$/);
    const charge = await btn.evaluate((b) => Number(getComputedStyle(b).getPropertyValue('--charge')));
    expect(charge).toBeLessThan(0.05);
    await p.keyboard.press('q');
    expect(await btn.getAttribute('aria-pressed')).toBe('false');
    await expect.poll(() => p.locator('.callout', { hasText: 'Spore Burst is ready in' }).count()).toBeGreaterThan(0);
  });

  it('the power button explains itself on hover; battles without a commander have none', async () => {
    const p = await open('/?scenario=power-demo&paused=1&test=1&seed=1');
    await p.locator('#power-btn').hover();
    const tip = await p.locator('#power-tip').textContent();
    expect(tip).toContain('90 crush damage');
    expect(tip).toContain('Ready at 0:45, then every 75 s');
    expect(tip).toContain('aim while paused');
    await p.close();
    const q = await open('/?scene=deploy&map=test-flat&enemy=human&seed=1&test=1');
    expect(await q.locator('#power-btn').count()).toBe(0);
  });
});
