// The clarity pass (playtest round 3, docs/playtest-feedback.md): the top band's chips have real tooltips on
// hover, with the gold breakdown, and no native title text; the first-time tips of a battle in rounds show once,
// are remembered, turn off and come back, never after battle 2, and count as shown only once on screen (R2b/T113,
// T118, A067); your relics and upgrades open with R in a run's battle (T175); an event's random result says what
// you got; and the spoils and elite nodes say what they give. v1's deploy and spawn timers went with v1's battle
// in R2b (T030): R2a's suite covers Begin and the band's keyboard focus in rounds.
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { chromium } from 'playwright';
import type { Browser, Page } from 'playwright';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { createServer } from 'vite';
import type { ViteDevServer } from 'vite';
import { AUTOPLAY, BATTLE_KEY, RUN_KEY, simulateRun } from '../../src/run/index.ts';
import type { RunState } from '../../src/run/index.ts';
import { nodeContent } from '../../tools/lib/content.ts';

let server: ViteDevServer | undefined;
let browser: Browser | undefined;
let page: Page | undefined;
let base: string;

/** Round 3's planning of a battle on the flat map with a bot planting for the player, held there. */
const BATTLE = '/?scene=battle&map=test-flat&seed=1&test=1&player=bot:balanced&round=3&phase=planning';
const TIPS_KEY = 'spore-sprawl/tips/v1';
/** Battle 1's round 1 planning, as you plan it: the army tip's moment. */
const FIRST = '/?scene=battle&map=test-flat&seed=1&test=1&battleIndex=1';

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

async function open(query: string, o: { run?: RunState | string; battle?: string; reduced?: boolean } = {}): Promise<Page> {
  const p = await browser!.newPage({ viewport: { width: 1280, height: 720 }, reducedMotion: o.reduced ? 'reduce' : 'no-preference' });
  page = p;
  const run = typeof o.run === 'string' ? o.run : o.run ? JSON.stringify(o.run) : null;
  if (run) {
    await p.addInitScript(([k, v, bk, bv]) => {
      if (sessionStorage.getItem('seeded')) return;
      localStorage.setItem(k!, v!);
      if (bv) localStorage.setItem(bk!, bv);
      sessionStorage.setItem('seeded', '1');
    }, [RUN_KEY, run, BATTLE_KEY, o.battle ?? ''] as const);
  }
  await p.goto(`${base}${query}`);
  await ready(p);
  return p;
}

async function ready(p: Page): Promise<void> {
  await p.waitForFunction(() => window.__GAME__?.ready === true);
  await p.evaluate(() => document.fonts.ready.then(() => true));
}

const tipsStored = (p: Page) => p.evaluate((k) => localStorage.getItem(k), TIPS_KEY);

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

describe('first-time tips (§10.2, T118)', () => {
  it("show the army tip as round 1's planning opens, once: remembered, off when turned off, and back after Show tips again", async () => {
    const p = await open(FIRST);
    const tip = p.locator('#callouts .callout.tip');
    await expect.poll(() => tip.textContent(), { timeout: 8000 }).toContain('The general has planned');
    // short enough for one line beside other callouts at 1280 px, with its lilac word
    expect((await tip.boundingBox())!.width).toBeLessThan(640);
    expect(await tip.locator('.tip-word').textContent()).toBe('Tip');
    expect(JSON.parse((await tipsStored(p))!).shown).toEqual(['army']);
    // never over the field: the tip is in the callout lane, above the battlefield
    const lane = (await p.locator('#callouts').boundingBox())!, field = (await p.locator('#battlefield').boundingBox())!;
    expect(lane.y + lane.height).toBeLessThanOrEqual(field.y + 0.5);

    // the same page again: the tip was seen, so it doesn't come back
    await p.reload();
    await ready(p);
    await p.waitForTimeout(600);
    expect(await tip.count()).toBe(0);

    // "Show tips again" forgets them; with Tips off, none shows
    await p.locator('#settings-btn').click();
    await p.locator('#tips-reset').click();
    expect(await tipsStored(p)).toBeNull();
    await p.locator('#settings [data-setting="tips"] [data-value="false"]').click();
    await p.keyboard.press('Escape');
    await p.reload();
    await ready(p);
    await p.waitForTimeout(600);
    expect(await tip.count()).toBe(0);
    expect(await tipsStored(p)).toBeNull();

    // Tips on again: the forgotten tip comes back as round 1's planning opens
    await p.locator('#settings-btn').click();
    await p.locator('#settings [data-setting="tips"] [data-value="true"]').click();
    await p.keyboard.press('Escape');
    await p.reload();
    await ready(p);
    await expect.poll(() => tip.textContent(), { timeout: 8000 }).toContain('The general has planned');
    await expect.poll(() => tipsStored(p)).toContain('army');
  });

  it('never show after battle 2', async () => {
    const p = await open(FIRST.replace('battleIndex=1', 'battleIndex=3'));
    await p.waitForTimeout(800);
    expect(await p.locator('#callouts .callout.tip').count()).toBe(0);
    expect(await tipsStored(p)).toBeNull();
  });

  it('count as shown only once on screen: a tip the pinned notices slice off isn\'t remembered (A067)', async () => {
    // a run saved before R2, mid-battle: battle 1's round 1 planning opens with two notices pinned beside the planning hint
    const fixture = (file: string) => readFileSync(join(import.meta.dirname, '..', 'fixtures', 'saves', 'v1', file), 'utf8');
    const p = await open('/?scene=run&debug=1', { run: fixture('run-battle.json'), battle: fixture('battle-v2.json') });
    expect(await p.evaluate(() => [window.__GAME__!.round, window.__GAME__!.phase])).toEqual([1, 'planning']);
    await p.waitForTimeout(1000);
    expect(await p.locator('#callouts .callout').count()).toBe(3);
    expect(await p.locator('#callouts #save-recovery').count()).toBe(1);
    expect(await p.locator('#callouts .callout.tip').count()).toBe(0);
    expect(await tipsStored(p)).toBeNull();
  });
});

describe('relics and upgrades in battle (§10.2, T175)', () => {
  it("open with R in a run's battle, with the relics' text, the levels and this battle's gold upgrades, and close with Esc", async () => {
    const p = await open('/?scene=run&seed=1&test=1&round=1');
    // stage two relics, a level on the Capguard Hall, and a Capguard Hall planted and upgraded with gold
    await p.evaluate(() => {
      const s = window.__GAME__!.battle()!;
      s.sides.player.relics.push('rootStipend', 'martyrsBloom');
      s.sides.player.upgrades.capguardHall = 2;
      const plot = s.sides.player.plots.findIndex((x) => x.open && x.terrain !== 'stump' && !x.building);
      s.queue.push({ round: s.round, tick: s.tick, side: 'player', seq: s.nextSeq.player++, type: 'plant', buildingId: 'capguardHall', plot });
    });
    await p.waitForFunction(() => window.__GAME__!.battle()!.buildings.some((b) => b.side === 'player' && b.buildingId === 'capguardHall'));
    await p.evaluate(() => { window.__GAME__!.battle()!.buildings.find((b) => b.side === 'player' && b.buildingId === 'capguardHall')!.upgrade = { paid: 450, fielded: false }; });
    const chip = p.locator('#kit-btn');
    // 2 relics; 2 levels and 1 gold upgrade
    await expect.poll(() => chip.textContent()).toBe('23R');
    await p.keyboard.press('r');
    const pop = p.locator('#kit-pop');
    expect(await pop.isVisible()).toBe(true);
    expect(await chip.getAttribute('aria-expanded')).toBe('true');
    expect(await pop.locator('.relic').count()).toBe(2);
    // the run bar's badges, with their v2 text in a tooltip on focus (§11.7)
    expect(await p.evaluate(() => (document.activeElement as HTMLElement).dataset.relic)).toBe('rootStipend');
    await expect.poll(() => pop.locator('[data-relic="rootStipend"] .relic-tip').isVisible()).toBe(true);
    expect(await pop.locator('[data-relic="martyrsBloom"] .relic-tip').textContent()).toContain('last unit of one of your squads');
    // Tab stays inside the popover instead of cycling buildings
    await p.keyboard.press('Tab');
    expect(await p.evaluate(() => (document.activeElement as HTMLElement).dataset.relic)).toBe('martyrsBloom');
    const hall = pop.locator('[data-upgrade="capguardHall"]');
    expect(await hall.textContent()).toContain('Level 2 of 3');
    expect(await hall.locator('li.on').count()).toBe(2);
    expect(await hall.locator('.kit-gold').textContent()).toBe('One upgraded with gold: its squad arrives Bloomed for the rest of this battle.');
    await p.keyboard.press('Escape');
    expect(await pop.isVisible()).toBe(false);
    // and the chip opens it too
    await chip.click();
    expect(await pop.isVisible()).toBe(true);
    await p.keyboard.press('r');
    expect(await pop.isVisible()).toBe(false);
    expect(await p.evaluate(() => window.__GAME__!.errors)).toEqual([]);
  });

  it('stay out of a single battle without drafts', async () => {
    const p = await open(FIRST);
    expect(await p.locator('#kit-btn').count()).toBe(0);
    await p.keyboard.press('r');
    expect(await p.evaluate(() => window.__GAME__!.errors)).toEqual([]);
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
