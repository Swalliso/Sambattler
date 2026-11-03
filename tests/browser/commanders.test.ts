// The commander power's controls in a battle in rounds (SPEC §6.6, §10.2, §10.3, T108): Q aims during a paused
// muster, and the click fires on the next tick; the button then reads "Used this clash", and Q again is refused
// with a callout; the next clash lights it again; outside a clash it's unlit and Q is refused; and no tooltip
// mentions a cooldown, since the power is once per clash. States come from the battle's parameters and the
// live bridge, so no combat outcome is pinned. The Underroot's commander cards and bans lead into a run with that
// commander (SPEC §16 M5).
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { chromium } from 'playwright';
import type { Browser, Page } from 'playwright';
import type { BattleState } from '../../src/sim/rounds/index.ts';
import { closeServers, serve } from './serve.ts';

let browser: Browser | undefined;
let page: Page | undefined;
let base: string;

beforeAll(async () => {
  base = await serve();
  browser = await chromium.launch();
});

afterAll(async () => {
  await browser?.close();
  await closeServers();
});

afterEach(async () => {
  await page?.close();
});

async function open(query: string): Promise<Page> {
  const p = await browser!.newPage({ viewport: { width: 1280, height: 720 } });
  await p.goto(`${base}/?${query}`);
  await p.waitForFunction(() => window.__GAME__?.ready === true);
  return p;
}

const battle = (p: Page): Promise<BattleState> => p.evaluate(() => window.__GAME__!.battle()!);
/** Waits for a test on the live battle. */
const until = (p: Page, f: (b: BattleState) => boolean) =>
  p.waitForFunction(`(${f.toString()})(window.__GAME__.battle())`, null, { timeout: 20000 });
/** Two frames, so the view has drawn what the last input changed. */
const frames = (p: Page) => p.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
const button = async (p: Page) => [await p.locator('#power-btn').getAttribute('data-state'), await p.locator('#power-state').textContent()];
const callouts = (p: Page) => p.locator('#callouts .callout').allTextContents();

/** The page point at a field position in tiles: the canvas is the map with a Heartcap strip at each end. */
const pointAt = (p: Page, x: number, y: number) => p.evaluate(([fx, fy]) => {
  const cv = document.getElementById('battlefield') as HTMLCanvasElement;
  const b = window.__GAME__!.battle()!;
  const tile = cv.height / b.map.height, strip = (cv.width / tile - b.map.width) / 2;
  const rect = cv.getBoundingClientRect();
  return { x: rect.left + ((fx! + strip) * tile * rect.width) / cv.width, y: rect.top + (fy! * tile * rect.height) / cv.height };
}, [x, y]);

describe('the commander power, once per clash (§6.6, §10.3)', () => {
  it('aims with Q in a paused muster, fires on the next tick, and refuses a second Q with a callout', async () => {
    page = await open('scene=battle&seed=1&test=1&player=bot:balanced&phase=clash&ticks=5&paused=1');
    let b = await battle(page);
    expect([b.phase, b.tick - b.clash!.startTick, b.config.player.power]).toEqual(['clash', 5, 'sporeBurst']);
    await frames(page);
    expect(await button(page)).toEqual(['ready', 'Ready']);
    await page.keyboard.press('q');
    await frames(page);
    expect(await button(page)).toEqual(['aiming', 'Aiming']);
    expect(await page.locator('#battlefield').getAttribute('class')).toContain('aiming');
    // over the general's first unit, the reticle and its callout preview Spore Burst's targets and damage
    const target = b.units.find((u) => u.side === 'enemy')!;
    const at = await pointAt(page, target.x, target.y);
    await page.mouse.move(at.x, at.y);
    await frames(page);
    expect(await page.locator('#battlefield').getAttribute('data-reticle')).toMatch(/^[\d.]+,[\d.]+,2$/);
    expect(await page.locator('#aim-callout').textContent()).toMatch(/^Spore Burst\d+ targets? · \d+ damage · click to fire/);
    await page.mouse.down();
    await page.mouse.up();
    await frames(page);
    b = await battle(page);
    const clicked = b.tick;
    expect(b.queue.filter((c) => c.type === 'power')).toMatchObject([{ side: 'player', tick: clicked + 1 }]);
    expect(await button(page)).toEqual(['pending', 'Next tick']);
    // resume until it has fired, then pause again
    await page.keyboard.press(' ');
    await until(page, (s) => s.sides.player.powerUsed);
    await page.keyboard.press(' ');
    b = await battle(page);
    expect(b.log.filter((c) => c.type === 'power')).toMatchObject([{ side: 'player', tick: clicked + 1 }]);
    expect([b.phase, b.stats.player.powerUses]).toEqual(['clash', 1]);
    await frames(page);
    expect(await button(page)).toEqual(['used', 'Used this clash']);
    await page.keyboard.press('q');
    await frames(page);
    expect(await button(page)).toEqual(['used', 'Used this clash']);
    expect(await callouts(page)).toContain('Spore Burst: used this clash');

    // the next clash lights it again: the general's units fall, and Space skips the aftermath
    await page.evaluate(() => { for (const u of window.__GAME__!.battle()!.units) if (u.side === 'enemy') u.hp = 0; });
    await page.keyboard.press(' ');
    await until(page, (s) => s.phase === 'aftermath');
    await page.keyboard.press(' ');
    await until(page, (s) => s.phase === 'clash' && s.round === 2);
    await frames(page);
    expect(await button(page)).toEqual(['ready', 'Ready']);
    await page.keyboard.press('q');
    await frames(page);
    expect(await button(page)).toEqual(['aiming', 'Aiming']);
    await page.keyboard.press('Escape');
    await frames(page);
    expect(await button(page)).toEqual(['ready', 'Ready']);
  });

  it('is unlit outside a clash, where Q is refused with a callout', async () => {
    page = await open('scene=battle&seed=1&test=1');
    await frames(page);
    expect(await button(page)).toEqual(['idle', 'Next clash']);
    await page.keyboard.press('q');
    await frames(page);
    expect(await button(page)).toEqual(['idle', 'Next clash']);
    expect(await callouts(page)).toContain('Spore Burst: only in a clash');
  });

  for (const commander of ['vesper', 'cordis', 'armilla']) {
    it(`gives ${commander}'s power a tooltip with no cooldown`, async () => {
      page = await open(`scene=battle&seed=1&test=1&commander=${commander}`);
      await page.locator('#power-btn').hover();
      await page.waitForFunction(() => !(document.getElementById('power-tip') as HTMLElement).hidden);
      const tip = (await page.locator('#power-tip').textContent())!;
      expect(tip).toContain('once per clash');
      expect(tip).not.toMatch(/cooldown|recharg|ready at|ready in|every \d+ ?s/i);
    });
  }
});

/** The title or the Underroot, with reduced motion so the spore wipes between screens are instant. */
async function openUnderroot(query: string): Promise<Page> {
  const p = await browser!.newPage({ viewport: { width: 1280, height: 720 }, reducedMotion: 'reduce' });
  page = p;
  await p.goto(`${base}/?${query}`);
  await p.waitForFunction(() => window.__GAME__?.ready === true);
  await p.evaluate(() => document.fonts.ready.then(() => true));
  return p;
}

describe('the Underroot', () => {
  it('New run opens it; a commander and bans chosen there start the run', async () => {
    const p = await openUnderroot('test=1&seed=5');
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
    const p = await openUnderroot('scene=underroot&tab=bans&test=1&seed=5');
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
