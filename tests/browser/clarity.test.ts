// The clarity pass (playtest round 3, docs/playtest-feedback.md): the top band's chips have real tooltips on
// hover, with the gold breakdown, and no native title text; an event's random result says what you got; and the
// spoils and elite nodes say what they give. v1's deploy, its first-time tips in battle, the relics popover and
// spawn timers went with v1's battle in R2b (T030): R2a's suite covers Begin and the band's keyboard focus in
// rounds, and T118 brings the tips into the battle in rounds.
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

/** Round 3's planning of a battle on the flat map with a bot planting for the player, held there. */
const BATTLE = '/?scene=battle&map=test-flat&seed=1&test=1&player=bot:balanced&round=3&phase=planning';

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

async function open(query: string, o: { run?: RunState; reduced?: boolean } = {}): Promise<Page> {
  const p = await browser!.newPage({ viewport: { width: 1280, height: 720 }, reducedMotion: o.reduced ? 'reduce' : 'no-preference' });
  page = p;
  if (o.run) await p.addInitScript(([k, v]) => { if (!sessionStorage.getItem('seeded')) { localStorage.setItem(k, v); sessionStorage.setItem('seeded', '1'); } }, [RUN_KEY, JSON.stringify(o.run)] as const);
  await p.goto(`${base}${query}`);
  await p.waitForFunction(() => window.__GAME__?.ready === true);
  await p.evaluate(() => document.fonts.ready.then(() => true));
  return p;
}

const content = nodeContent();
const mid = (): RunState => simulateRun(content, 3, AUTOPLAY, { maxBattles: 2 }).run;

describe('HUD tooltips', () => {
  it('open on hover with the income breakdown and the storm by round, and close when the pointer leaves', async () => {
    const p = await open(BATTLE);
    const tip = p.locator('#hud-tip');
    expect(await tip.isVisible()).toBe(false);
    // native title text is gone from the chips
    expect(await p.locator('.chips [title]').count()).toBe(0);
    await p.locator('#chip-gold').hover();
    await expect.poll(() => tip.isVisible()).toBe(true);
    expect(await tip.textContent()).toContain('Heartcap stipend');
    await p.mouse.move(640, 400);
    await expect.poll(() => tip.isVisible()).toBe(false);
    await p.locator('#chip-storm').hover();
    await expect.poll(() => tip.textContent()).toContain('By round');
    expect(await tip.textContent()).toContain('The Sporestorm raises the Heartcap damage a round deals');
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

describe('labels', () => {
  it('elite route nodes show their extra reward, and spoils say what they are', async () => {
    const p = await open('/?scene=route&seed=7&test=1');
    const reward = p.locator('.route-node.elite .node-reward').first();
    expect(await reward.textContent()).toBe('Extra rewardRelic pick+15 Spores25% Amber');
    await p.close();
    const run = mid();
    run.screen = { kind: 'spoils', picks: [{ label: 'Spoils', battleIndex: 2, freeRerolls: 0, cards: 3, rareBonus: 0, relicsOnly: false,
      offer: [{ id: 'bp:hammercapForge', type: 'blueprint', rarity: 'uncommon' }, { id: 'up:gillNest', type: 'upgrade', rarity: 'common' }, { id: 'relic:martyrsBloom', type: 'relic', rarity: 'rare' }] }] };
    const q = await open('/?scene=run&debug=1', { run, reduced: true });
    expect(await q.locator('#spoils-what').textContent()).toContain('the same kinds of cards as the drafts in battle');
    // the relic card reads in plain words, its v2 effect (§11.7)
    expect(await q.locator('[data-card="relic:martyrsBloom"] .draft-text').textContent()).toContain('last unit of one of your squads');
  });
});
