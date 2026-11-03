// The top band of a battle in rounds (SPEC §10.2, §6.2, §6.4, §6.7, §7.5): both Heartcaps frame it and the
// chips stay clear of their labels; the chips agree with the bridge's summary, with no lives in a single
// battle (A063); the round tally's past pips follow each round's damage, with "dealt" their sum (A064); the
// lane tug shows surviving supply in a clash; Twin Roots splits a pip into lane halves; and the Intent panel
// lists the general's changes this round, with no countdown (A070). States come from the preview's parameters
// and Node's same checkpoint, computed live, so no combat outcome is pinned (A059, A075).
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { chromium } from 'playwright';
import type { Browser, Page } from 'playwright';
import { nodeContent } from '../../../tools/lib/content.ts';
import { roundStateForParams } from '../../../tools/lib/rounds/params.ts';
import { incomePreview, survivingSupply } from '../../../src/sim/rounds/index.ts';
import type { BattleState } from '../../../src/sim/rounds/index.ts';
import type { RoundsBridge } from '../../../src/app/rounds/bridge.ts';
import { closeServers, serve } from '../serve.ts';

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

async function open(query: string, width = 1280, height = 720): Promise<Page> {
  const p = await browser!.newPage({ viewport: { width, height } });
  await p.goto(`${base}/?${query}`);
  await p.waitForFunction(() => window.__GAME__?.ready === true);
  await p.evaluate(() => document.fonts.ready.then(() => true));
  return p;
}

/** Node's state for the same query, at the same checkpoint (T080). */
const node = (query: string) => roundStateForParams(content, new URLSearchParams(query));
const text = (p: Page, sel: string) => p.locator(sel).first().textContent();
const summary = (p: Page) => p.evaluate(() => (window.__GAME__ as unknown as RoundsBridge).summary()!);
/** Changes the live state for a staged case, then waits two frames for the band to show it. */
const stage = async (p: Page, f: (b: BattleState) => void) => {
  await p.evaluate(`(${f.toString()})(window.__GAME__.battle())`);
  await p.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
};

/** The first seed whose round 4 clash lasts past 200 ticks with a bot player, found live (as S11's fast-forward test does). */
let clashQuery = '';
function clashAt(): string {
  for (let seed = 1; seed <= 30 && !clashQuery; seed++) {
    const at = `scene=rounds&seed=${seed}&test=1&player=bot:balanced&round=4&phase=clash&ticks=200&paused=1`;
    try { node(at); clashQuery = at; } catch { /* the battle or round 4's clash ended first */ }
  }
  expect(clashQuery).not.toBe('');
  return clashQuery;
}

type Box = { x: number; y: number; width: number; height: number };
const overlap = (a: Box, b: Box) => a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;
const boxes = (p: Page, sel: string) => p.locator(sel).evaluateAll((els) => els.map((e) => {
  const b = e.getBoundingClientRect();
  return { id: e.id, box: { x: b.x, y: b.y, width: b.width, height: b.height } };
}));

describe('the top band (§10.2)', () => {
  for (const [width, height] of [[1280, 720], [1366, 768], [1440, 900]] as const) {
    it(`frames the band with both Heartcaps and keeps the chips clear of their labels at ${width}×${height}`, async () => {
      // a clash, whose round chip carries the clock, with late numbers: four-digit gold
      page = await open(clashAt(), width, height);
      await stage(page, (b) => { b.sides.player.gold = 1888; });
      const [band, mine, theirs, mineLabel, theirsLabel, tug, intent] = await Promise.all(
        ['.rounds-top', '#hud-hp-player', '#hud-hp-enemy', '#hud-hp-player .heart-label', '#hud-hp-enemy .heart-label', '#hud-tug', '#hud-intent']
          .map((s) => page!.locator(s).boundingBox()));
      expect(mine!.x - band!.x).toBeLessThan(24);
      expect(mine!.x + mine!.width).toBeLessThanOrEqual(tug!.x);
      expect(theirs!.x).toBeGreaterThanOrEqual(tug!.x + tug!.width);
      expect(intent!.x).toBeGreaterThanOrEqual(theirs!.x + theirs!.width);
      const chips = await boxes(page, '#mount-top .chip');
      expect(chips.map((c) => c.id)).toEqual(['chip-gold', 'chip-plots', 'chip-round', 'chip-storm']);
      for (const c of chips) {
        expect(overlap(c.box, mineLabel!), c.id).toBe(false);
        expect(overlap(c.box, theirsLabel!), c.id).toBe(false);
        expect(c.box.x, c.id).toBeGreaterThanOrEqual(mine!.x + mine!.width);
        expect(c.box.x + c.box.width, c.id).toBeLessThanOrEqual(theirs!.x);
        expect(c.box.y + c.box.height, c.id).toBeLessThanOrEqual(band!.y + band!.height);
      }
    });
  }

  it('shows the gold, plots, round and storm the summary gives, the income incomePreview gives, and no lives', async () => {
    // round 5, the storm's first round (§6.4)
    let q = '';
    for (let seed = 1; seed <= 30 && !q; seed++) {
      const at = `scene=rounds&seed=${seed}&test=1&player=bot:balanced&round=5&phase=planning`;
      try { node(at); q = at; } catch { /* the battle ended first */ }
    }
    page = await open(q);
    const s = await summary(page);
    expect(s.round).toBe(5);
    expect(await text(page, '#hud-gold')).toBe(String(s.gold.player));
    expect(await text(page, '#hud-income')).toBe(`+${incomePreview(node(q), 'player').total}`);
    expect(await text(page, '#hud-plots')).toBe(`${s.plots.player.planted}/${s.plots.player.owned}`);
    expect(await text(page, '#hud-round')).toBe(String(s.round));
    expect(await text(page, '#hud-storm')).toBe(`×${s.storm.toFixed(1)}`);
    expect(s.storm).toBe(1.2);
    expect(await page.locator('#chip-storm').getAttribute('class')).toContain('on');
    expect(await text(page, '#hud-hp-player .heart-hp b')).toBe(String(s.heartcap.player));
    expect(await text(page, '#hud-hp-enemy .heart-hp b')).toBe(String(s.heartcap.enemy));
    expect(await page.locator('#hud-lives').count()).toBe(0);
  });

  it('leaves the storm chip unlit at ×1.0 before round 5', async () => {
    page = await open('scene=rounds&seed=1&test=1');
    expect(await text(page, '#hud-storm')).toBe('×1.0');
    expect(await page.locator('#chip-storm').getAttribute('class')).not.toContain('on');
  });

  it('opens the gold tip on I, totalling the chip\'s +N, moves along the band on Tab and closes on Esc', async () => {
    page = await open('scene=rounds&seed=1&test=1&phase=planning');
    await page.keyboard.press('i');
    await expect.poll(() => page!.evaluate(() => document.activeElement?.id)).toBe('chip-gold');
    expect(await page.locator('#hud-tip').isVisible()).toBe(true);
    const income = await text(page, '#hud-income');
    expect(await text(page, '#hud-tip .row.total')).toContain(income!);
    await page.keyboard.press('Tab');
    expect(await page.evaluate(() => document.activeElement?.id)).toBe('chip-plots');
    expect(await text(page, '#hud-tip')).toMatch(/plots/i);
    await page.keyboard.press('Escape');
    expect(await page.locator('#hud-tip').isVisible()).toBe(false);
    expect(await page.evaluate(() => document.activeElement?.id ?? '')).not.toBe('chip-plots');
  });
});

describe('the round tally and the lane tug (§10.2, §6.7)', () => {
  it('fills each past pip from its round\'s damage, outlines the current one, and sums "dealt" and "taken"', async () => {
    let q = '';
    for (let seed = 1; seed <= 30 && !q; seed++) {
      const at = `scene=rounds&seed=${seed}&test=1&player=bot:balanced&round=4&phase=planning`;
      try { node(at); q = at; } catch { /* the battle ended first */ }
    }
    page = await open(q);
    const damage = await page.evaluate(() => (window.__GAME__ as unknown as RoundsBridge).battle()!.rounds.map((r) => r.damage));
    expect(damage.length).toBe(3);
    const pips = await page.locator('#hud-tally .pip').evaluateAll((els) => els.map((e) => ({ round: Number((e as HTMLElement).dataset.round), cls: e.className })));
    expect(pips.map((p) => p.round)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);
    damage.forEach((d, i) => {
      const want = d.player > d.enemy ? 'won' : d.player < d.enemy ? 'lost' : 'drawn';
      expect(pips[i]!.cls, `round ${i + 1}`).toContain(want);
    });
    expect(pips[3]!.cls).toContain('current');
    for (const p of pips.slice(3)) expect(p.cls).toContain('future');
    const s = await summary(page);
    expect(await text(page, '#hud-dealt')).toContain(String(damage.reduce((n, d) => n + d.player, 0)));
    expect(await text(page, '#hud-dealt')).toContain(String(s.dealt.player));
    expect(await text(page, '#hud-taken')).toContain(String(s.dealt.enemy));
    expect(await page.locator('#hud-tug').isVisible()).toBe(false);
  });

  it('shows each lane\'s surviving supply on the tug in a clash, in the tally\'s place', async () => {
    const q = clashAt();
    const want = node(q);
    page = await open(q);
    expect(await page.locator('#hud-tally').isVisible()).toBe(false);
    expect(await page.locator('#hud-tug .tugbar').count()).toBe(want.lanes.length);
    for (let lane = 0; lane < want.lanes.length; lane++) {
      expect(await text(page, `#hud-tug [data-lane="${lane}"] .num.p`)).toBe(String(survivingSupply(want, 'player', lane)));
      expect(await text(page, `#hud-tug [data-lane="${lane}"] .num.e`)).toBe(String(survivingSupply(want, 'enemy', lane)));
    }
  });

  it('splits a Twin Roots pip into lane halves (split-lanes)', async () => {
    page = await open('scene=rounds&scenario=split-lanes&test=1&phase=aftermath');
    const lanes = await page.evaluate(() => (window.__GAME__ as unknown as RoundsBridge).battle()!.rounds[0]!.lanes.map((l) => l.winner));
    expect(lanes).toEqual(['player', 'enemy']);
    const halves = await page.locator('#hud-tally .pip[data-round="1"] .half').evaluateAll((els) => els.map((e) => e.className));
    expect(halves.length).toBe(2);
    expect(halves[0]).toContain('won');
    expect(halves[1]).toContain('lost');
  });
});

describe("the General's Intent panel (§7.5, §10.2)", () => {
  it('lists the buildings the general planted and sold this round, its income and its bank, and has no countdown', async () => {
    page = await open('scene=rounds&seed=1&test=1&phase=planning');
    const plan = await page.evaluate(() => {
      const b = (window.__GAME__ as unknown as RoundsBridge).battle()!;
      return b.sides.enemy.ai!.plans.find((p) => p.round === b.round)!;
    });
    expect(plan.planted.length).toBeGreaterThan(0);
    const planted = await text(page, '#intent-planted');
    for (const p of plan.planted.slice(0, 2)) expect(planted).toContain(content.buildings[p.building]!.name);
    expect(await text(page, '#intent-income')).toContain(String(plan.income));
    expect(await text(page, '#intent-banked')).toContain(String(plan.banked));
    expect(await page.locator('#hud-countdown, #hud-warning').count()).toBe(0);
    expect(await text(page, '#hud-intent')).not.toMatch(/countdown|wave/i);
    // a staged plan with a sale and a long list: the sale shows, and the list is cut short with a count
    await stage(page, (b) => {
      const p = b.sides.enemy.ai!.plans.find((x) => x.round === b.round)!;
      p.planted = ['capguardHall', 'gillNest', 'sporelingBurrow', 'hammercapForge', 'amanitaLodge', 'bursterPod'].map((building, plot) => ({ building, plot }));
      p.sold = [{ building: 'truffleCellar', plot: 9 }];
    });
    expect(await text(page, '#intent-sold')).toContain('Truffle Cellar');
    const long = await text(page, '#intent-planted');
    expect(long).toContain('Capguard Hall');
    expect(long).toMatch(/\+\d/);
    expect(long).not.toContain('Burster Pod');
  });

  it('shows the plan of the round on screen after a fast-forward', async () => {
    let q = '';
    for (let seed = 1; seed <= 30 && !q; seed++) {
      const at = `scene=rounds&seed=${seed}&test=1&player=bot:balanced&round=3&phase=planning`;
      try { node(at); q = at; } catch { /* the battle ended first */ }
    }
    page = await open(q);
    const plan = node(q).sides.enemy.ai!.plans.find((p) => p.round === 3)!;
    expect(await text(page, '#intent-income')).toContain(String(plan.income));
    expect(await text(page, '#intent-banked')).toContain(String(plan.banked));
  });
});
