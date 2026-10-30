// The settings screen (SPEC §10.5, docs/ui-ux-plan.md Phase 3) in a real browser: it opens from the title,
// the battle's cog and the run bar; every setting saves into spore-sprawl/settings/v1 and survives a
// reload; records saved before Phase 3 (and before sound) still load; Esc closes it; and each setting
// does what it says (UI scale, reduced motion, color-blind assist, default speed). Also the motion that
// came with it: the spore wipe between screens and the roll-up counters, which hold still under ?test=1.
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { chromium } from 'playwright';
import type { Browser, Page } from 'playwright';
import { createServer } from 'vite';
import type { ViteDevServer } from 'vite';

let server: ViteDevServer | undefined;
let browser: Browser | undefined;
let page: Page | undefined;
let base: string;

const KEY = 'spore-sprawl/settings/v1';

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

interface OpenOpts { width?: number; height?: number; settings?: unknown; reduced?: boolean }

/** Opens a page; `settings` is written to the settings record before the game boots. */
async function open(query: string, o: OpenOpts = {}): Promise<Page> {
  const p = await browser!.newPage({ viewport: { width: o.width ?? 1280, height: o.height ?? 720 }, reducedMotion: o.reduced ? 'reduce' : 'no-preference' });
  page = p;
  const errors: string[] = [];
  p.on('pageerror', (e) => errors.push(String(e)));
  (p as Page & { errors?: string[] }).errors = errors;
  if (o.settings !== undefined) await p.addInitScript(([k, v]) => { if (!sessionStorage.getItem('seeded')) { localStorage.setItem(k, v); sessionStorage.setItem('seeded', '1'); } }, [KEY, JSON.stringify(o.settings)] as const);
  await p.goto(`${base}${query}`);
  await p.waitForFunction(() => window.__GAME__?.ready === true);
  await p.evaluate(() => document.fonts.ready.then(() => true));
  return p;
}

const saved = async (p: Page) => JSON.parse((await p.evaluate((k) => localStorage.getItem(k), KEY)) ?? '{}');
const pressed = (p: Page, setting: string, value: string) => p.locator(`[data-setting="${setting}"] [data-value="${value}"]`).getAttribute('aria-pressed');

async function reload(p: Page): Promise<void> {
  await p.reload();
  await p.waitForFunction(() => window.__GAME__?.ready === true);
}

describe('the settings screen', () => {
  it('saves every setting under the one key, and each survives a reload', async () => {
    const p = await open('/?test=1');
    await p.locator('#settings-btn').click();
    const choices: [string, string, unknown][] = [
      ['damageNumbers', 'big', 'big'], ['defaultSpeed', '3', 3], ['screenShake', 'true', true],
      ['uiScale', '1.5', 1.5], ['reducedMotion', 'on', 'on'], ['colorAssist', 'true', true],
    ];
    for (const [setting, value] of choices) {
      await p.locator(`[data-setting="${setting}"] [data-value="${value}"]`).click();
      expect(await pressed(p, setting, value)).toBe('true');
    }
    await p.locator('#settings input[data-level="sfx"]').fill('35');
    await p.locator('#settings .sound-mute').click();
    const s = await saved(p);
    for (const [setting, , stored] of choices) expect(s[setting]).toEqual(stored);
    expect(s).toMatchObject({ sfxVolume: 0.35, muted: true });
    expect(await p.evaluate(() => Object.keys(localStorage))).toEqual([KEY]);

    await reload(p);
    await p.locator('#settings-btn').click();
    for (const [setting, value] of choices) expect(await pressed(p, setting, value)).toBe('true');
    expect(await p.locator('#settings input[data-level="sfx"]').inputValue()).toBe('35');
    expect(await p.locator('#settings .sound-mute').getAttribute('aria-pressed')).toBe('true');
  });

  it('loads records saved before it existed, and keeps their fields when it saves', async () => {
    // a record from before sound, and one from the Phase 1b popover
    for (const old of [{ damageNumbers: 'all' }, { damageNumbers: 'big', masterVolume: 0.3, sfxVolume: 0.8, ambientVolume: 0.5, muted: true }]) {
      const p = await open('/?test=1', { settings: old });
      await p.locator('#settings-btn').click();
      expect(await pressed(p, 'damageNumbers', old.damageNumbers)).toBe('true');
      for (const [setting, value] of [['defaultSpeed', '1'], ['screenShake', 'false'], ['uiScale', 'auto'], ['reducedMotion', 'system'], ['colorAssist', 'false']]) {
        expect(await pressed(p, setting!, value!)).toBe('true');
      }
      await p.locator('[data-setting="colorAssist"] [data-value="true"]').click();
      expect(await saved(p)).toMatchObject({ ...old, colorAssist: true, defaultSpeed: 1, uiScale: 'auto' });
      expect((p as Page & { errors?: string[] }).errors).toEqual([]);
      await p.close();
    }
  });

  it('ignores values it does not know and falls back to the defaults', async () => {
    const p = await open('/?test=1', { settings: { reducedMotion: 'sometimes', uiScale: 3, defaultSpeed: 7, colorAssist: 'yes', screenShake: 1 } });
    await p.locator('#settings-btn').click();
    for (const [setting, value] of [['reducedMotion', 'system'], ['uiScale', 'auto'], ['defaultSpeed', '1'], ['colorAssist', 'false'], ['screenShake', 'false']]) {
      expect(await pressed(p, setting!, value!)).toBe('true');
    }
    expect(await p.evaluate(() => document.documentElement.classList.contains('assist'))).toBe(false);
  });

  it('closes with Esc, fits 1280×720, and keeps keys from reaching the screen behind it', async () => {
    const p = await open('/?test=1');
    await p.locator('#settings-btn').click();
    const card = (await p.locator('#settings').boundingBox())!;
    expect(card.y).toBeGreaterThanOrEqual(0);
    expect(card.y + card.height).toBeLessThanOrEqual(720);
    expect(await p.evaluate(() => { const c = document.getElementById('settings')!; return c.scrollHeight - c.clientHeight; })).toBe(0);
    // H opens Help on the title, but not through the settings screen
    await p.keyboard.press('h');
    expect(await p.locator('#help').count()).toBe(0);
    // Tab stays inside
    for (let i = 0; i < 30; i++) await p.keyboard.press('Tab');
    expect(await p.evaluate(() => !!document.activeElement?.closest('#settings'))).toBe(true);
    await p.keyboard.press('Escape');
    expect(await p.locator('#settings').count()).toBe(0);
    expect(await p.evaluate(() => document.activeElement?.id)).toBe('settings-btn');
  });

  it('opens from the run bar’s cog on the route', async () => {
    const p = await open('/?scene=route&seed=3&test=1');
    await p.locator('#runbar #settings-btn').click();
    expect(await p.locator('#settings').isVisible()).toBe(true);
    await p.keyboard.press('Escape');
    expect(await p.locator('#settings').count()).toBe(0);
    // the route still takes its clicks
    await p.locator('.route-node.open').first().click();
    await expect.poll(() => p.evaluate(() => window.__GAME__!.run()?.screen)).not.toBe('route');
    expect(await p.evaluate(() => window.__GAME__!.run()?.screen)).toBeTruthy();
  });
});

describe('what each setting does', () => {
  it('UI scale: a fixed step scales big windows up, but never lays the page out below 1280×720', async () => {
    const p = await open('/?test=1', { width: 1920, height: 1080, settings: { uiScale: 1.5 } });
    expect(await p.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--ui-scale'))).toBe('1.5');
    expect(await p.evaluate(() => document.body.clientWidth)).toBe(1280);
    await p.locator('#settings-btn').click();
    await p.locator('[data-setting="uiScale"] [data-value="2"]').click();
    // 1920×1080 fits 150% at most
    expect(await p.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--ui-scale'))).toBe('1.5');
    expect(await p.locator('[data-setting="uiScale"] .set-hint').textContent()).toContain('fits up to 150%');
    await p.locator('[data-setting="uiScale"] [data-value="auto"]').click();
    expect(await p.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--ui-scale'))).toBe('1');
    expect(await p.evaluate(() => document.body.clientWidth)).toBe(1920);
  });

  it('UI scale: the battle refits its field when the step changes', async () => {
    const p = await open('/?scene=deploy&map=test-flat&enemy=human&seed=1&test=1&paused=1', { width: 1920, height: 1080 });
    const before = (await p.locator('#battlefield').boundingBox())!;
    await p.locator('#settings-btn').click();
    await p.locator('[data-setting="uiScale"] [data-value="1.5"]').click();
    await p.keyboard.press('Escape');
    const after = (await p.locator('#battlefield').boundingBox())!;
    // the bands grew, so the field (still in whole screen pixels) is no wider than before, and inside the window
    expect(after.width).toBeLessThanOrEqual(before.width);
    expect(after.x + after.width).toBeLessThanOrEqual(1920);
    expect(after.y + after.height).toBeLessThanOrEqual(1080);
  });

  it('reduced motion: follows the device, or the player’s choice either way', async () => {
    const isReduced = (p: Page) => p.evaluate(() => document.documentElement.classList.contains('reduce-motion'));
    const p = await open('/?test=1', { reduced: true });
    expect(await isReduced(p)).toBe(true);
    await p.locator('#settings-btn').click();
    expect(await p.locator('[data-setting="reducedMotion"] .set-hint').textContent()).toContain('asks for less motion');
    await p.locator('[data-setting="reducedMotion"] [data-value="off"]').click();
    expect(await isReduced(p)).toBe(false);
    await p.close();
    const q = await open('/?test=1', { settings: { reducedMotion: 'on' } });
    expect(await isReduced(q)).toBe(true);
  });

  it('color-blind assist: redraws its preview, then marks the field and the tug bar’s pattern', async () => {
    const q = '/?scene=battle&test=1&seed=4&player=bot:balanced&ticks=3600&paused=1';
    const p = await open(q);
    const tug = () => p.evaluate(() => getComputedStyle(document.querySelector('.tugbar .e')!).backgroundImage);
    const plain = await tug();
    const field = await p.evaluate(() => document.querySelector<HTMLCanvasElement>('#battlefield')!.toDataURL());
    await p.locator('#settings-btn').click();
    // the screen's preview redraws with the marks the moment the assist turns on
    const preview = () => p.evaluate(() => document.querySelector<HTMLCanvasElement>('#assist-preview canvas')!.toDataURL());
    const plainPreview = await preview();
    expect(await p.locator('#assist-preview').getAttribute('data-assist')).toBe('false');
    await p.locator('[data-setting="colorAssist"] [data-value="true"]').click();
    expect(await p.locator('#assist-preview').getAttribute('data-assist')).toBe('true');
    expect(await preview()).not.toBe(plainPreview);
    expect(await p.locator('#assist-preview').getAttribute('aria-label')).toContain('light rings');
    await p.keyboard.press('Escape');
    expect(await p.evaluate(() => document.documentElement.classList.contains('assist'))).toBe(true);
    expect(await tug()).not.toBe(plain);
    expect(await tug()).toContain('135deg');
    // the field redraws with the team marks and the bolder mats (it is paused, so nothing else moved)
    await expect.poll(() => p.evaluate(() => document.querySelector<HTMLCanvasElement>('#battlefield')!.toDataURL())).not.toBe(field);
  });

  it('default speed: a battle runs at it once it begins', async () => {
    const p = await open('/?scene=deploy&map=test-flat&enemy=human&seed=1&test=1', { settings: { defaultSpeed: 2 } });
    await p.locator('#begin-btn').click();
    await expect.poll(() => p.locator('[data-speed="2"]').getAttribute('aria-pressed')).toBe('true');
  });
});

describe('motion', () => {
  it('a spore wipe covers a screen change, then clears; ?test=1 changes at once', async () => {
    // New run goes through the Underroot (commander and bans), then Begin run opens the route
    const p = await open('/?debug=1&seed=5');
    await p.locator('#title-new').click();
    expect(await p.locator('.spore-wipe').count()).toBe(1);
    await expect.poll(() => p.locator('.spore-wipe').count(), { timeout: 2000 }).toBe(0);
    expect(await p.locator('#underroot').count()).toBe(1);
    await p.locator('#underroot-begin').click();
    expect(await p.locator('.spore-wipe').count()).toBe(1);
    await expect.poll(() => p.locator('.spore-wipe').count(), { timeout: 2000 }).toBe(0);
    expect(await p.locator('#route').count()).toBe(1);
    await p.close();
    const q = await open('/?test=1&seed=5');
    await q.locator('#title-new').click();
    expect(await q.locator('.spore-wipe').count()).toBe(0);
    await q.locator('#underroot-begin').click();
    expect(await q.locator('#route').count()).toBe(1);
  });

  it('under reduced motion there is no wipe, only a short fade', async () => {
    const p = await open('/?debug=1&seed=5', { reduced: true });
    await p.locator('#title-new').click();
    expect(await p.locator('.spore-wipe').count()).toBe(0);
    await p.locator('#underroot-begin').click();
    expect(await p.locator('.spore-wipe').count()).toBe(0);
    expect(await p.locator('#route').count()).toBe(1);
    expect(await p.evaluate(() => document.getElementById('app')!.classList.contains('fade-in'))).toBe(true);
  });

  it('rewards roll up to their totals, and show them at once under ?test=1', async () => {
    const q = '/?scene=summary&seed=6&autoplay=run';
    const p = await open(`${q}&test=1`);
    const spores = Number(await p.locator('#run-spores').textContent());
    expect(spores).toBeGreaterThan(0);
    expect(await p.locator('#summary-earned .spores b').textContent()).toBe(String(spores));
    await p.close();
    const r = await open(`${q}&debug=1`);
    expect(Number(await r.locator('#summary-earned .spores b').textContent())).toBeLessThan(spores);
    await expect.poll(() => r.locator('#summary-earned .spores b').textContent(), { timeout: 3000 }).toBe(String(spores));
  });

  it('the report shows the gold the battle earned', async () => {
    const p = await open('/?scene=report&test=1&seed=4&player=bot:balanced');
    const gold = await p.evaluate(() => Object.values(window.__GAME__!.battle()!.stats.player.goldEarned).reduce((a, b) => a + b, 0));
    expect(await p.locator('#report-rewards [data-reward="gold"] b').textContent()).toBe(gold.toLocaleString('en-US'));
    expect(await p.locator('#report-rewards [data-reward="spores"]').count()).toBe(0);
  });
});
