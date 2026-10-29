// The clarity pass (playtest round 3, docs/playtest-feedback.md): Space begins the battle in deploy and a
// deploy pause never carries into it; the top band's chips have real tooltips (hover, keyboard focus, Esc)
// with the gold breakdown; an event's random result says what you got; a first-time tip shows once, can be
// turned off and shown again; your relics and upgrades open in battle; spawn timers draw under your
// spawners and turn off; and the spoils and elite nodes say what they give.
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { chromium } from 'playwright';
import type { Browser, Page } from 'playwright';
import { createServer } from 'vite';
import type { ViteDevServer } from 'vite';
import { AUTOPLAY, RUN_KEY, simulateRun } from '../../src/run/index.ts';
import type { RunState } from '../../src/run/index.ts';
import { nodeContent } from '../../tools/lib/content.ts';

let server: ViteDevServer | undefined;
let browser: Browser | undefined;
let page: Page | undefined;
let base: string;

const TIPS_KEY = 'spore-sprawl/tips/v1';
const DEPLOY = '/?scene=deploy&map=test-flat&enemy=human&seed=1&test=1';
/** Battle 1 on the flat map with a bot placing for the player, live from tick 0. */
const BATTLE = '/?scene=battle&map=test-flat&enemy=human&seed=1&test=1&battleIndex=1&player=bot:balanced';

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

async function open(query: string, o: { run?: RunState; tips?: string[]; reduced?: boolean } = {}): Promise<Page> {
  const p = await browser!.newPage({ viewport: { width: 1280, height: 720 }, reducedMotion: o.reduced ? 'reduce' : 'no-preference' });
  page = p;
  if (o.run) await p.addInitScript(([k, v]) => { if (!sessionStorage.getItem('seeded')) { localStorage.setItem(k, v); sessionStorage.setItem('seeded', '1'); } }, [RUN_KEY, JSON.stringify(o.run)] as const);
  if (o.tips) await p.addInitScript(([k, v]) => localStorage.setItem(k, v), [TIPS_KEY, JSON.stringify({ shown: o.tips })] as const);
  await p.goto(`${base}${query}`);
  await p.waitForFunction(() => window.__GAME__?.ready === true);
  await p.evaluate(() => document.fonts.ready.then(() => true));
  return p;
}

const tick = (p: Page) => p.evaluate(() => window.__GAME__!.tick);
const content = nodeContent();
const mid = (): RunState => simulateRun(content, 3, AUTOPLAY, { maxBattles: 2 }).run;

describe('Space in deploy', () => {
  it('begins the battle, which runs even though deploy was paused', async () => {
    const p = await open(`${DEPLOY}&paused=1`);
    expect(await p.locator('#begin-btn kbd').textContent()).toBe('Space');
    expect(await p.locator('#deploy-hint kbd').textContent()).toBe('Space');
    await p.keyboard.press('Space');
    await p.waitForFunction(() => window.__GAME__!.summary()?.phase === 'live');
    // not paused: the clock moves, and no "Paused" pin
    const t0 = await tick(p);
    await p.waitForFunction((t) => window.__GAME__!.tick > t + 5, t0);
    expect(await p.locator('#paused-callout').count()).toBe(0);
    expect(await p.locator('#pause-btn').getAttribute('aria-pressed')).toBe('false');
    // once live, Space pauses as before
    await p.keyboard.press('Space');
    await expect.poll(() => p.locator('#callouts #paused-callout').count()).toBe(1);
  });

  it('the Begin button clears a deploy pause too, and Help lists both keys', async () => {
    const p = await open(`${DEPLOY}&paused=1`);
    await p.locator('#help-btn').click();
    await p.locator('#help-tab-keys').click();
    expect(await p.locator('table#help-keys').textContent()).toContain('Space/Enterbegin the battle (in deploy)');
    await p.keyboard.press('Escape');
    await p.locator('#begin-btn').click();
    const t0 = await p.evaluate(() => { const g = window.__GAME__!; return g.summary()?.phase === 'live' ? g.tick : 0; });
    await p.waitForFunction((t) => window.__GAME__!.tick > t + 5, t0);
  });
});

describe('HUD tooltips', () => {
  it('open on hover with the income breakdown and the next wave’s interest, and close when the pointer leaves', async () => {
    const p = await open(`${BATTLE}&ticks=1300&paused=1`);
    const tip = p.locator('#hud-tip');
    expect(await tip.isVisible()).toBe(false);
    // native title text is gone from the chips
    expect(await p.locator('.chips [title]').count()).toBe(0);
    await p.locator('#chip-gold').hover();
    await expect.poll(() => tip.isVisible()).toBe(true);
    const text = (await tip.textContent())!;
    expect(text).toContain('Heartcap stipend');
    expect(text).toContain('Comeback');
    expect(text).toContain('Interest, paid at each new wave');
    expect(text).toMatch(/Next wave, in \d:\d\d\+\d+/);
    // the total is the chip's own figure
    const chip = (await p.locator('#hud-income').textContent())!.replace('+', '').replace('/min', '');
    expect(await tip.locator('.row.total').textContent()).toContain(`+${chip}/min`);
    // the rows add up to the total
    const rows = await tip.locator('.row:not(.total) > :last-child').allTextContents();
    const perMin = rows.filter((r) => r.endsWith('/min')).map((r) => Number(r.replace('/min', '').replace('−', '-')));
    expect(perMin.reduce((a, b) => a + b, 0)).toBe(Number(chip));
    await p.mouse.move(640, 400);
    await expect.poll(() => tip.isVisible()).toBe(false);
    // the storm explains itself, now and per stack
    await p.locator('#chip-storm').hover();
    await expect.poll(() => tip.textContent()).toContain('Each stack');
    expect(await tip.textContent()).toContain('The Sporestorm ends stalemates');
  });

  it('open on keyboard focus: I steps into the band, Tab moves along it, Esc closes and lets go', async () => {
    const p = await open(`${BATTLE}&ticks=1300&paused=1`);
    const tip = p.locator('#hud-tip');
    await p.keyboard.press('i');
    expect(await p.evaluate(() => document.activeElement?.id)).toBe('chip-gold');
    await expect.poll(() => tip.textContent()).toContain('Income, paid every 5 s');
    await p.keyboard.press('Tab');
    expect(await p.evaluate(() => document.activeElement?.id)).toBe('chip-supply');
    await expect.poll(() => tip.textContent()).toContain('Every living unit uses supply');
    await p.keyboard.press('Tab');
    await expect.poll(() => tip.textContent()).toContain('Each new wave');
    expect(await tip.textContent()).toContain('Interest pays out');
    expect(await tip.textContent()).toContain('The Sporestorm thickens');
    await p.keyboard.press('Escape');
    expect(await tip.isVisible()).toBe(false);
    expect(await p.evaluate(() => document.activeElement === document.body)).toBe(true);
  });
});

describe('an event’s random result', () => {
  it('Quiet Clearing’s Forage says which track went up, and to what level', async () => {
    const run = mid();
    run.screen = { kind: 'event', event: 'quiet-clearing' };
    const p = await open('/?scene=run&debug=1', { run, reduced: true });
    await p.keyboard.press('2');
    await p.waitForSelector('#event-result');
    const saved = JSON.parse((await p.evaluate((k) => localStorage.getItem(k), RUN_KEY))!) as RunState;
    // the run is already back on the route; the result screen is the UI's
    expect(saved.screen.kind).toBe('route');
    const raised = Object.keys(saved.upgrades).find((id) => saved.upgrades[id] !== (run.upgrades[id] ?? 0))!;
    const card = p.locator(`#event-results [data-result="up:${raised}"]`);
    expect(await card.textContent()).toContain(content.buildings[raised]!.name);
    expect(await card.textContent()).toContain(`Level ${saved.upgrades[raised]} of 3`);
    expect(await p.locator('#event-result .eventtext').textContent()).toContain('You chose Forage');
    await p.keyboard.press('Enter');
    await p.waitForSelector('#route');
  });

  it('Fallen Oak names the relic it gave, with its text, and the Heartcap cost', async () => {
    const run = mid();
    run.screen = { kind: 'event', event: 'fallen-oak' };
    const p = await open('/?scene=run&debug=1', { run, reduced: true });
    await p.keyboard.press('1');
    await p.waitForSelector('#event-result');
    const saved = JSON.parse((await p.evaluate((k) => localStorage.getItem(k), RUN_KEY))!) as RunState;
    const relic = saved.relics.find((id) => !run.relics.includes(id))!;
    const card = p.locator(`#event-results [data-result="relic:${relic}"]`);
    expect(await card.locator('b').textContent()).toBe(content.relics[relic]!.name);
    expect(await card.textContent()).toContain('New relic');
    expect(await p.locator('#event-results .outcome.cost').textContent()).toContain('max Heartcap');
  });

  it('a choice with no chance in it goes straight back to the route', async () => {
    const run = mid();
    run.screen = { kind: 'event', event: 'quiet-clearing' };
    const p = await open('/?scene=run&debug=1', { run, reduced: true });
    await p.keyboard.press('1');
    await p.waitForSelector('#route');
    expect(await p.locator('#event-result').count()).toBe(0);
  });
});

describe('first-time tips', () => {
  it('show once, are remembered, stay off when turned off, and come back with "Show tips again"', async () => {
    const p = await open(`${BATTLE}&ticks=100`);
    const tip = p.locator('#callouts .callout.tip');
    await expect.poll(() => tip.textContent(), { timeout: 8000 }).toContain('glowing frontier line');
    // short enough for one line beside other callouts at 1280 px
    expect((await tip.boundingBox())!.width).toBeLessThan(640);
    expect(await tip.locator('.tip-word').textContent()).toBe('Tip');
    expect(JSON.parse((await p.evaluate((k) => localStorage.getItem(k), TIPS_KEY))!).shown).toEqual(['frontier']);
    // never over the field: the tip is in the callout lane, above the battlefield
    const lane = (await p.locator('#callouts').boundingBox())!, field = (await p.locator('#battlefield').boundingBox())!;
    expect(lane.y + lane.height).toBeLessThanOrEqual(field.y + 0.5);

    // the same page again: the tip was seen, so it doesn't come back
    await p.reload();
    await p.waitForFunction(() => window.__GAME__?.ready === true);
    const t0 = await tick(p);
    await p.waitForFunction((t) => window.__GAME__!.tick > t + 30, t0);
    expect(await p.locator('#callouts .callout.tip').count()).toBe(0);

    // "Show tips again" forgets them; with Tips off, none shows
    await p.locator('#settings-btn').click();
    await p.locator('#tips-reset').click();
    expect(await p.evaluate((k) => localStorage.getItem(k), TIPS_KEY)).toBeNull();
    await p.locator('#settings [data-setting="tips"] [data-value="false"]').click();
    await p.keyboard.press('Escape');
    await p.reload();
    await p.waitForFunction(() => window.__GAME__?.ready === true);
    const t1 = await tick(p);
    await p.waitForFunction((t) => window.__GAME__!.tick > t + 30, t1);
    expect(await p.locator('#callouts .callout.tip').count()).toBe(0);

    // Tips on again: the forgotten frontier tip comes back as soon as the battle runs on (no reload: the tip
    // may show before one, and a shown tip is remembered)
    await p.locator('#settings-btn').click();
    await p.locator('#settings [data-setting="tips"] [data-value="true"]').click();
    await p.keyboard.press('Escape');
    await expect.poll(() => p.locator('#callouts .callout.tip').textContent(), { timeout: 8000 }).toContain('glowing frontier line');
    await expect.poll(() => p.evaluate((k) => localStorage.getItem(k), TIPS_KEY)).toContain('frontier');
  });

  it('never show after battle 2', async () => {
    const p = await open(`${BATTLE.replace('battleIndex=1', 'battleIndex=3')}&ticks=100`);
    const t0 = await tick(p);
    await p.waitForFunction((t) => window.__GAME__!.tick > t + 40, t0);
    expect(await p.locator('#callouts .callout.tip').count()).toBe(0);
  });
});

describe('relics and upgrades in battle', () => {
  it('open with R, read from the keyboard, and close with Esc', async () => {
    const p = await open(`${BATTLE}&ticks=600&paused=1`);
    await p.evaluate(() => {
      const s = window.__GAME__!.battle()!.sides.player;
      s.relics.push('mycorrhizalLink', 'deepCellars');
      s.upgrades.gillNest = 2;
    });
    await expect.poll(() => p.locator('#kit-btn').textContent()).toContain('2');
    await p.keyboard.press('r');
    const pop = p.locator('#kit-pop');
    expect(await pop.isVisible()).toBe(true);
    expect(await p.locator('#kit-btn').getAttribute('aria-expanded')).toBe('true');
    expect(await pop.locator('.relic').count()).toBe(2);
    // the run bar's badges, with their tooltips on focus; the layout relic has its picture
    expect(await p.evaluate(() => (document.activeElement as HTMLElement).dataset.relic)).toBe('mycorrhizalLink');
    await expect.poll(() => pop.locator('[data-relic="mycorrhizalLink"] .relic-tip').isVisible()).toBe(true);
    expect(await pop.locator('[data-relic="mycorrhizalLink"] .relic-tip').textContent()).toContain('on a side, not just a corner');
    expect(await pop.locator('[data-relic="mycorrhizalLink"] .adj-diagram').count()).toBe(1);
    // Tab stays inside the popover instead of cycling buildings
    await p.keyboard.press('Tab');
    expect(await p.evaluate(() => (document.activeElement as HTMLElement).dataset.relic)).toBe('deepCellars');
    const gill = pop.locator('[data-upgrade="gillNest"]');
    expect(await gill.textContent()).toContain('Level 2 of 3');
    expect(await gill.locator('li.on').count()).toBe(2);
    await p.keyboard.press('Escape');
    expect(await pop.isVisible()).toBe(false);
    // and the chip opens it too
    await p.locator('#kit-btn').click();
    expect(await pop.isVisible()).toBe(true);
    await p.keyboard.press('r');
    expect(await pop.isVisible()).toBe(false);
  });
});

describe('spawn timers', () => {
  it('fill a bar under your spawner, and turn off from the settings screen', async () => {
    const p = await open(`${DEPLOY}&paused=1`);
    const box = (await p.locator('#battlefield').boundingBox())!;
    await p.locator('[data-building="sporelingBurrow"]').click();
    await p.locator('#battlefield').click({ position: { x: box.width * 2.5 / 36, y: box.height * 0.5 / 8 } });
    await p.waitForFunction(() => window.__GAME__?.summary()?.buildings.player === 1);
    // the burrow stands at column 0, row 0: its bar runs along row 30 of the canvas, half full before its first spawn
    const px = (x: number) => p.evaluate((xx) => [...(document.getElementById('battlefield') as HTMLCanvasElement).getContext('2d')!.getImageData(xx, 30, 1, 1).data].slice(0, 3), x);
    await expect.poll(() => px(38)).toEqual([201, 162, 255]);
    expect(await px(58)).not.toEqual([201, 162, 255]);
    await p.locator('#settings-btn').click();
    await p.locator('#settings [data-setting="spawnTimers"] [data-value="false"]').click();
    await p.keyboard.press('Escape');
    await expect.poll(() => px(38)).not.toEqual([201, 162, 255]);
    expect(JSON.parse((await p.evaluate(() => localStorage.getItem('spore-sprawl/settings/v1')))!).spawnTimers).toBe(false);
  });
});

describe('labels', () => {
  it('elite route nodes show their extra reward, and spoils say what they are', async () => {
    const p = await open('/?scene=route&seed=7&test=1');
    const reward = p.locator('.route-node.elite .node-reward').first();
    expect(await reward.textContent()).toBe('Extra rewardRelic pick+15 Spores25% Amber');
    await p.close();
    const run = mid();
    run.screen = { kind: 'spoils', picks: [{ label: 'Spoils', battleIndex: 2, freeRerolls: 0, cards: 3, rareBonus: 0, relicsOnly: false,
      offer: [{ id: 'bp:hammercapForge', type: 'blueprint', rarity: 'uncommon' }, { id: 'up:gillNest', type: 'upgrade', rarity: 'common' }, { id: 'relic:mycorrhizalLink', type: 'relic', rarity: 'rare' }] }] };
    const q = await open('/?scene=run&debug=1', { run, reduced: true });
    expect(await q.locator('#spoils-what').textContent()).toContain('the same kinds of cards as the drafts in battle');
    // the relic card reads in plain words, with its picture
    expect(await q.locator('[data-card="relic:mycorrhizalLink"] .draft-text').textContent()).toContain('touching 2 or more');
    expect(await q.locator('[data-card="relic:mycorrhizalLink"] .adj-diagram').count()).toBe(1);
  });
});
