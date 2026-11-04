// The bottom band and the chrome of a battle in rounds (SPEC §4.4, §10.2, §10.3, §10.4) (A068, A071): the tray's
// price is `priceOf` on any free plot and a card is unlit only when gold is short, and a drafted blueprint's card
// joins it at once and plants in the same phase, as a drafted level redraws its card (§8.3); selling takes two presses
// and refunds the full price in the planting phase, 60% once the building has fielded; Enter's Begin never
// presses a focused inspector button; Begin sits in the bottom band, the planning hint in the callout lane, and
// the speed control replaces Begin from the clash on; an empty colony against the scripted general warns first;
// the round's result banner stays pinned through the aftermath, which Help holds as it pauses a clash; and
// the battle ends on the report by round; the inspector's buttons follow the selection and keep focus, and a
// unit's tier shows as pips. States come from the battle's parameters and Node's checkpoint, computed live, so no
// combat outcome is pinned (A059, A075).
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { chromium } from 'playwright';
import type { Browser, Page } from 'playwright';
import { nodeContent } from '../../tools/lib/content.ts';
import { battleStateForParams } from '../../tools/lib/params.ts';
import { priceOf } from '../../src/sim/index.ts';
import type { GameBridge } from '../../src/app/debugBridge.ts';
import { trayOrder } from '../../src/ui/buildingInfo.ts';
import { closeServers, serve } from './serve.ts';

let browser: Browser | undefined;
let page: Page | undefined;
let base: string;
const content = nodeContent();

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
  await p.evaluate(() => document.fonts.ready.then(() => true));
  return p;
}

/** Node's state for the same query, at the same checkpoint (T080). */
const node = (query: string) => battleStateForParams(content, new URLSearchParams(query));
const text = async (p: Page, sel: string) => (await p.locator(sel).first().textContent())?.trim() ?? '';
const game = (p: Page) => p.evaluate(() => {
  const g = window.__GAME__ as unknown as GameBridge;
  return { round: g.round, phase: g.phase, tick: g.tick, errors: [...g.errors] };
});
const until = (p: Page, f: (g: GameBridge) => boolean) => p.waitForFunction(`(${f.toString()})(window.__GAME__)`, null, { timeout: 20000 });
/** Two frames, for the view to show a change. */
const frames = (p: Page) => p.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
const setGold = async (p: Page, gold: number) => {
  await p.evaluate((g) => { window.__GAME__!.battle()!.sides.player.gold = g; }, gold);
  await frames(p);
};

/** The centre of one of your plots on the page: plots are 2×2 tiles of 16 px, right of a 2-tile strip. */
const plotPoint = (p: Page, i: number) => p.evaluate((n) => {
  const c = document.getElementById('battlefield') as HTMLCanvasElement;
  const r = c.getBoundingClientRect();
  const plot = window.__GAME__!.battle()!.sides.player.plots[n]!;
  return { x: r.left + ((plot.col + 3) * 16 * r.width) / c.width, y: r.top + ((plot.row + 1) * 16 * r.height) / c.height };
}, i);
/** Your free plots now, in plot order. */
const freePlots = (p: Page) => p.evaluate(() => window.__GAME__!.battle()!.sides.player.plots
  .flatMap((q, i) => (q.open && q.terrain !== 'stump' && !q.building ? [i] : [])));
const clickPlot = async (p: Page, i: number) => {
  const at = await plotPoint(p, i);
  await p.mouse.click(at.x, at.y);
  await frames(p);
  await frames(p);
};
/** Chooses the card and plants it on the plot; returns the new building's entity id. */
async function plantAt(p: Page, buildingId: string, plot: number): Promise<number> {
  await p.click(`#tray [data-building=${buildingId}]`);
  await clickPlot(p, plot);
  return p.evaluate((n) => window.__GAME__!.battle()!.sides.player.plots[n]!.building, plot);
}
const standing = (p: Page, id: number) => p.evaluate((x) => window.__GAME__!.battle()!.buildings.some((b) => b.id === x), id);

const SCRIPTED = 'scene=battle&seed=1&test=1&phase=planning&enemy=general:scripted';

describe('the tray (§10.2, §4.4)', () => {
  it('prices each card with priceOf, the same on any free plot, and unlights a card only when gold is short', async () => {
    page = await open(SCRIPTED);
    const want = node(SCRIPTED);
    const cards = await page.locator('#tray .card[data-building]').evaluateAll((els) => els.map((e) => ({
      id: e.getAttribute('data-building')!, price: e.querySelector('.price')!.textContent!.trim(),
    })));
    expect(cards.map((c) => c.id)).toEqual(trayOrder(content, want.sides.player.kit.map((k) => k.building)));
    for (const c of cards) expect(c.price, c.id).toBe(String(priceOf(want, 'player', c.id)));
    // the ghost's price is the card's on the colony's first and last free plots: no column term (§4.4, §6.3)
    const id = 'sporelingBurrow', price = priceOf(want, 'player', id);
    await page.click(`#tray [data-building=${id}]`);
    const free = await freePlots(page);
    for (const i of [free[0]!, free.at(-1)!]) {
      const at = await plotPoint(page, i);
      await page.mouse.move(at.x, at.y);
      await frames(page);
      expect(await text(page, '#ghost-tip'), `plot ${i}`).toContain(`· ${price} gold ·`);
    }
    // short by one: unlit with what it needs; with exactly its price, lit
    await setGold(page, price - 1);
    const poor = await page.locator('#tray .card[data-building]').evaluateAll((els) => els.map((e) => ({
      id: e.getAttribute('data-building')!, poor: e.classList.contains('poor'), need: e.querySelector('.need-label')?.textContent ?? '',
    })));
    for (const c of poor) expect(c.poor, c.id).toBe(priceOf(want, 'player', c.id) > price - 1);
    expect(poor.find((c) => c.id === id)!.need).toBe('need 1');
    await setGold(page, price);
    expect(await page.locator(`#tray [data-building=${id}]`).getAttribute('class')).not.toContain('poor');
  });

  it("takes a drafted blueprint's card at once, which plants in the same phase, and redraws a card a drafted level changes (§8.3)", async () => {
    // a run's battle in round 1's planning, with a draft staged: the Gill Archer Nest's blueprint, then the Truffle Cellar's first level
    page = await open('scene=run&seed=1&test=1&round=1');
    const pick = async (card: { id: string; type: 'blueprint' | 'upgrade' }) => {
      await page!.evaluate((c) => { window.__GAME__!.battle()!.sides.player.draft = { offer: [{ ...c, rarity: 'common' }], rerolls: 0, index: 1 }; }, card);
      await until(page!, () => !document.getElementById('draft')!.hidden);
      await page!.keyboard.press('1');
      await until(page!, (g) => !g.battle()!.sides.player.draft);
      await frames(page!);
    };
    const cards = () => page!.locator('#tray .card[data-building]').evaluateAll((els) => els.map((e) => e.getAttribute('data-building')!));
    const kit = () => page!.evaluate(() => window.__GAME__!.battle()!.sides.player.kit.map((k) => k.building));
    expect(await cards()).not.toContain('gillNest');
    await pick({ id: 'bp:gillNest', type: 'blueprint' });
    expect(await kit()).toContain('gillNest');
    expect(await cards()).toEqual(trayOrder(content, await kit()));
    await setGold(page, 9999);
    const plot = (await freePlots(page))[0]!;
    const built = await plantAt(page, 'gillNest', plot);
    expect(await page.evaluate((x) => window.__GAME__!.battle()!.buildings.find((b) => b.id === x)?.buildingId, built)).toBe('gillNest');
    expect(await game(page)).toMatchObject({ round: 1, phase: 'planning' });
    // the level recompiles the side: the Cellar's card shows its new income
    const income = () => page!.evaluate(() => window.__GAME__!.battle()!.compiled.player.buildings.truffleCellar!.economy!.goldPerRound);
    const before = await income();
    expect(await text(page, '#tray [data-building=truffleCellar] .out')).toBe(`+${before}\u00a0gold a\u00a0round`);
    await pick({ id: 'up:truffleCellar', type: 'upgrade' });
    expect(await income()).toBe(before + 12);
    expect(await text(page, '#tray [data-building=truffleCellar] .out')).toBe(`+${before + 12}\u00a0gold a\u00a0round`);
    expect((await game(page)).errors).toEqual([]);
  });
});

describe('inspect and selling (§10.4, §4.4)', () => {
  it('sells on the second press: 60% once a building has fielded, the full price in the phase it was planted', async () => {
    // round 4 of a round scenario, whose colony fielded in rounds 1–3
    page = await open('scene=battle&scenario=comeback-r4&test=1');
    expect(await text(page, '#callouts #planning-hint')).toContain('plan, then press Begin');
    const old = await page.evaluate(() => {
      const b = window.__GAME__!.battle()!;
      const x = b.buildings.find((y) => y.side === 'player')!;
      return { id: x.id, plot: x.plot, paid: x.pricePaid, fielded: x.fielded, gold: b.sides.player.gold };
    });
    expect(old.fielded).toBe(true);
    const sixty = Math.floor((old.paid * 60) / 100);
    await clickPlot(page, old.plot);
    expect(await text(page, '#sell-btn')).toBe(`Sell for ${sixty} [X]`);
    await page.keyboard.press('x');
    await frames(page);
    expect(await text(page, '#sell-btn')).toBe(`Confirm sell (+${sixty}) [X]`);
    expect(await standing(page, old.id)).toBe(true);
    await page.keyboard.press('x');
    await frames(page);
    expect(await standing(page, old.id)).toBe(false);
    expect((await page.evaluate(() => window.__GAME__!.battle()!.sides.player.gold))).toBe(old.gold + sixty);
    // planted now, it sells back for its full price, here through the inspector's button
    const fresh = await plantAt(page, 'sporelingBurrow', old.plot);
    const paid = priceOf(node('scene=battle&scenario=comeback-r4&test=1'), 'player', 'sporelingBurrow');
    await clickPlot(page, old.plot);
    expect(await text(page, '#inspect-title')).toContain('Sporeling Burrow');
    await page.click('#sell-btn');
    await frames(page);
    expect(await text(page, '#sell-btn')).toBe(`Confirm sell (+${paid}) [X]`);
    await page.click('#sell-btn');
    await frames(page);
    expect(await standing(page, fresh)).toBe(false);
    expect((await page.evaluate(() => window.__GAME__!.battle()!.sides.player.gold))).toBe(old.gold + sixty);
  });

  it("never presses a focused inspector button with Enter's Begin", async () => {
    page = await open(SCRIPTED);
    const [plot] = await freePlots(page);
    const id = await plantAt(page, 'sporelingBurrow', plot!);
    await clickPlot(page, plot!);
    // armed, so a press would sell it
    await page.keyboard.press('x');
    await frames(page);
    expect(await text(page, '#sell-btn')).toContain('Confirm sell');
    await page.evaluate(() => {
      const w = window as unknown as { sellClicks: number };
      w.sellClicks = 0;
      document.getElementById('sell-btn')!.addEventListener('click', () => { w.sellClicks++; });
    });
    await page.focus('#sell-btn');
    await page.waitForTimeout(450); // Begin by key waits about 400 ms after planning opens (R2-Q12)
    await page.keyboard.press('Enter');
    await until(page, (g) => g.phase !== 'planning');
    expect(await page.evaluate(() => (window as unknown as { sellClicks: number }).sellClicks)).toBe(0);
    expect(await standing(page, id)).toBe(true);
  });
});

describe('the planning and clash chrome (§10.2, §10.3)', () => {
  it('puts Begin in the bottom band and the planning hint in the callout lane, and the speed control in its place from the clash', async () => {
    page = await open(SCRIPTED);
    const gold = node(SCRIPTED).sides.player.gold;
    expect(await page.locator('footer.bottom #begin-btn').isVisible()).toBe(true);
    expect(await page.locator('.btn.primary:visible').count()).toBe(1);
    expect(await text(page, '#begin-btn kbd')).toBe('Space');
    const hint = await text(page, '#callouts #planning-hint');
    expect(hint).toContain('Round 1');
    expect(hint).toContain(`${gold} gold`);
    expect(hint).toContain('place your opener');
    expect(await page.locator('#speed-seg').isVisible()).toBe(false);
    const [plot] = await freePlots(page);
    await plantAt(page, 'capguardHall', plot!);
    await page.click('#begin-btn');
    await until(page, (g) => g.phase === 'clash');
    await page.keyboard.press(' ');
    await frames(page);
    expect(await page.locator('#speed-seg').isVisible()).toBe(true);
    expect(await page.locator('#pause-btn').isVisible()).toBe(true);
    expect(await page.locator('#begin-btn').isVisible()).toBe(false);
    expect(await page.locator('#planning-hint').count()).toBe(0);
    expect(await page.locator('#callouts #paused-callout').count()).toBe(1);
    // the tray takes no clicks in a clash (it says so with aria-disabled), but its tooltips open
    await page.click('#tray [data-building=sporelingBurrow]', { force: true });
    await frames(page);
    expect(await page.locator('#tray .card.sel').count()).toBe(0);
    await page.hover('#tray [data-building=gillNest]');
    await frames(page);
    expect(await page.locator('#card-tip').isVisible()).toBe(true);
    expect(await text(page, '#card-tip')).toContain('Gill Archer');
  });

  it("says it's the last round in round 9's hint, and who leads on the Decision", async () => {
    // you've dealt 70% of the general's max HP and it 50% of yours (§6.5, X5)
    page = await open('scene=battle&scenario=decision-round-9&test=1');
    const hint = await text(page, '#callouts #planning-hint');
    expect(hint).toContain('Round 9');
    expect(hint).toContain('the last round');
    expect(hint).toContain('you lead on the Decision');
  });

  it('warns on an empty colony against the scripted general, and planting clears the warning', async () => {
    page = await open(SCRIPTED);
    await page.click('#begin-btn');
    await frames(page);
    expect(await page.locator('#callouts #empty-lane-warning').count()).toBe(1);
    expect(await text(page, '#begin-btn')).toContain('Begin anyway');
    expect((await game(page)).phase).toBe('planning');
    const [plot] = await freePlots(page);
    await plantAt(page, 'capguardHall', plot!);
    expect(await page.locator('#empty-lane-warning').count()).toBe(0);
    expect(await text(page, '#begin-btn')).not.toContain('anyway');
  });

  it("begins on Begin's second press over an empty colony, and pins the result banner through the aftermath", async () => {
    // `phase=planning` makes the aftermath hold for input under ?test=1 (plan Call 15)
    page = await open(SCRIPTED);
    await page.click('#begin-btn');
    await frames(page);
    await page.click('#begin-btn');
    await until(page, (g) => g.tick > 0);
    // with nothing of yours in the lane, the general takes it at once
    await until(page, (g) => g.phase === 'aftermath');
    await frames(page);
    const banner = await text(page, '#callouts #round-banner');
    expect(banner).toContain('Round 1 lost');
    await page.waitForTimeout(1000);
    expect(await page.locator('#callouts #round-banner').count()).toBe(1);
    // the speed control stays live in the aftermath, without pause
    expect(await page.locator('#speed-seg').isVisible()).toBe(true);
    expect(await page.locator('#pause-btn').isVisible()).toBe(false);
    await page.keyboard.press('Enter');
    await until(page, (g) => g.round === 2 && g.phase === 'planning');
    await frames(page);
    expect(await page.locator('#round-banner').count()).toBe(0);
    expect(await text(page, '#callouts #planning-hint')).toContain('Round 2');
  });

  it('pauses a clash while Help is open, and holds the aftermath', async () => {
    // no `phase=` hold, so the aftermath plays its usual length (plan Call 15)
    const q = 'scene=battle&seed=1&test=1&enemy=general:scripted';
    page = await open(q);
    const [plot] = await freePlots(page);
    await plantAt(page, 'capguardHall', plot!);
    await page.click('#begin-btn');
    await until(page, (g) => g.phase === 'clash' && g.tick > 5);
    await page.keyboard.press('h');
    await frames(page);
    const t0 = (await game(page)).tick;
    await page.waitForTimeout(400);
    expect((await game(page)).tick).toBe(t0);
    expect(await page.locator('#help').isVisible()).toBe(true);
    await page.keyboard.press('h');
    await page.waitForFunction((t) => window.__GAME__!.tick > t, t0, { timeout: 20000 });
    // an empty colony's clash ends at once: Help then holds its aftermath past its 3 s
    await page.close();
    page = await open(q);
    await page.click('#begin-btn');
    await page.click('#begin-btn');
    await until(page, (g) => g.phase === 'aftermath');
    await page.keyboard.press('h');
    await page.waitForTimeout(4000);
    expect((await game(page)).phase).toBe('aftermath');
    await page.keyboard.press('h');
    await until(page, (g) => g.round === 2 && g.phase === 'planning');
  });
});

describe('the report by round (§10.4, §10.5)', () => {
  it('opens at the battle\'s end with a chart column per round, no lives, and Again and Rematch on the same parameters', async () => {
    const q = 'scene=battle&seed=1&test=1&player=bot:balanced&phase=ended';
    page = await open(q);
    await page.locator('#report').waitFor();
    const s = await page.evaluate(() => window.__GAME__!.summary()!);
    expect(s.phase).toBe('ended');
    const cols = await page.locator('#report-rounds [data-round]').evaluateAll((els) => els.map((e) => ({
      dealt: Number(e.getAttribute('data-dealt')), taken: Number(e.getAttribute('data-taken')),
    })));
    expect(cols).toEqual(s.roundLog.map((r) => ({ dealt: r.taken.enemy, taken: r.taken.player })));
    expect(await text(page, '#end-how')).toMatch(s.by === 'rout' ? /by Rout in round \d/ : /by Decision after round 9/);
    expect(await page.locator('#report-lives').count()).toBe(0);
    await Promise.all([page.waitForURL(/seed=(?!1&)\d+/), page.click('#report-rematch')]);
    const url = new URL(page.url());
    expect(url.searchParams.get('scene')).toBe('battle');
    expect(url.searchParams.get('player')).toBe('bot:balanced');
    expect(url.searchParams.get('seed')).not.toBe('1');
    expect(url.searchParams.has('phase')).toBe(false);
  });

  it('draws a Sporestorm round\'s multiplier clear of its damage label, the tallest bar\'s included (S20, T135)', async () => {
    // seed 1 against the scripted general ends in round 7, and rounds 5–7 each deal the round's cap: the tallest bars
    page = await open('scene=battle&seed=1&test=1&player=bot:balanced&enemy=general:scripted&phase=ended');
    await page.locator('#report').waitFor();
    const storms = await page.locator('#report-rounds [data-round]').evaluateAll((gs) => gs.flatMap((g) => {
      const texts = [...g.querySelectorAll('text')] as SVGTextElement[];
      const storm = texts.find((t) => t.textContent?.startsWith('☁'));
      const dealt = texts.find((t) => t.textContent === g.getAttribute('data-dealt'));
      if (!storm || !dealt) return [];
      const a = storm.getBBox(), b = dealt.getBBox();
      return [{ round: Number(g.getAttribute('data-round')), stormBottom: a.y + a.height, dealtTop: b.y }];
    }));
    expect(storms.length).toBeGreaterThan(0);
    for (const s of storms) expect(s.stormBottom, `round ${s.round}`).toBeLessThanOrEqual(s.dealtTop);
  });
});

// v1's inspector cases, in planning (R2b/T030): its buttons follow the selection and keep keyboard focus. Enter
// begins the clash in planning, so the buttons are clicked here
describe('the inspector follows the selection (§10.4)', () => {
  const focused = (p: Page) => p.evaluate(() => document.activeElement?.id);

  it('keeps focus on the merge toggle as Tab changes buildings, and toggles only the one selected', async () => {
    page = await open(SCRIPTED);
    const [a, b] = await freePlots(page);
    await plantAt(page, 'sporelingBurrow', a!);
    await plantAt(page, 'capguardHall', b!);
    await page.keyboard.press('Tab');
    await expect.poll(() => text(page!, '#inspect h3')).toBe('Sporeling Burrow · yours');
    const merge = page.locator('#merge-btn');
    await merge.click();
    await expect.poll(() => merge.textContent()).toBe('Merge OFF [M]');
    expect(await focused(page)).toBe('merge-btn');
    await page.keyboard.press('Tab');
    await expect.poll(() => text(page!, '#inspect h3')).toBe('Capguard Hall · yours');
    expect(await focused(page)).toBe('merge-btn');
    await expect.poll(() => merge.textContent()).toBe('Merge ON [M]');
    await merge.click();
    await expect.poll(() => merge.textContent()).toBe('Merge OFF [M]');
    // the new selection's toggle flipped the Hall, and left the Burrow as it was
    await page.keyboard.press('Tab');
    await expect.poll(() => text(page!, '#inspect h3')).toBe('Sporeling Burrow · yours');
    await expect.poll(() => merge.textContent()).toBe('Merge OFF [M]');
    const toggles = await page.evaluate(() => window.__GAME__!.battle()!.buildings.filter((x) => x.side === 'player').map((x) => x.mergeOn));
    expect(toggles).toEqual([false, false]);
  });

  it('clears a sell confirmation when the selection changes, and sells on the second press', async () => {
    page = await open(SCRIPTED);
    const [a, b] = await freePlots(page);
    await plantAt(page, 'sporelingBurrow', a!);
    await plantAt(page, 'capguardHall', b!);
    const mine = () => page!.evaluate(() => window.__GAME__!.battle()!.buildings.filter((x) => x.side === 'player').length);
    await page.keyboard.press('Tab');
    const sell = page.locator('#sell-btn');
    await sell.click();
    await expect.poll(() => sell.textContent()).toMatch(/^Confirm sell \(\+\d+\) \[X\]$/);
    expect(await mine()).toBe(2);
    await page.keyboard.press('Tab');
    await expect.poll(() => text(page!, '#inspect h3')).toBe('Capguard Hall · yours');
    await expect.poll(() => sell.textContent()).toMatch(/^Sell for \d+ \[X\]$/);
    expect(await focused(page)).toBe('sell-btn');
    await sell.click();
    await expect.poll(() => sell.textContent()).toMatch(/^Confirm sell \(\+\d+\) \[X\]$/);
    await sell.click();
    await expect.poll(mine).toBe(1);
    await page.waitForFunction(() => document.getElementById('inspect')?.dataset.mode === 'none');
    await page.keyboard.press('Tab');
    await expect.poll(() => text(page!, '#inspect h3')).toBe('Sporeling Burrow · yours');
    await expect.poll(() => sell.textContent()).toMatch(/^Sell for \d+ \[X\]$/);
    expect(await page.evaluate(() => window.__GAME__!.summary()!.rejectedCommands)).toBe(0);
  });
});

describe('unit inspection (§10.4)', () => {
  it("shows an Elder's tier as two pip sprites, without ✦", async () => {
    page = await open('scene=battle&scenario=unit-lineup&phase=clash&ticks=0&paused=1&seed=1&test=1');
    // the player's Elder Sporeling stands at (8.0, 1.6) at the clash's first tick, as in v1's lineup
    const at = await page.evaluate(() => {
      const c = document.getElementById('battlefield') as HTMLCanvasElement;
      const r = c.getBoundingClientRect();
      const u = window.__GAME__!.battle()!.units.find((x) => x.side === 'player' && x.tier === 3 && x.unitId === 'sporeling')!;
      return { x: r.left + ((u.x + 2) * 16 * r.width) / c.width, y: r.top + (u.y * 16 * r.height) / c.height };
    });
    await page.mouse.click(at.x, at.y);
    await expect.poll(() => text(page!, '#inspect h3')).toBe('Sporeling · yours');
    const tier = page.locator('#inspect .row').filter({ hasText: /^Tier/ });
    await expect.poll(() => tier.textContent()).toBe('TierElder');
    expect(await tier.locator('canvas.pip').count()).toBe(2);
  });
});
