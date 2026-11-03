// The playtest's measures in a battle in rounds (SPEC §7.5, §8.2, §10.2, §16 R2 gate; R2-Q1, X6; T126–T128). The
// "last fielded" view (`reveal=last`): from round 2 the general's colony and squads are drawn as it fielded them
// last round, derived from its plan for the round (plan Call 12), so it holds after a headless fast-forward, and
// it's a view rule: the clash starts from the real formation and no hash moves (A198). Then the play clock:
// the report shows the seconds you spent planning, the console logs the readout, and nothing is saved (A203).
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { chromium } from 'playwright';
import type { Browser, Page } from 'playwright';
import { nodeContent } from '../../../tools/lib/content.ts';
import { roundStateForParams } from '../../../tools/lib/rounds/params.ts';
import { formationOf, hashState } from '../../../src/sim/rounds/index.ts';
import type { BattleState, SquadPlan } from '../../../src/sim/rounds/index.ts';
import type { DrawnSquad, RoundsBridge } from '../../../src/app/rounds/bridge.ts';
import { parseRoundParams } from '../../../src/app/rounds/urlParams.ts';
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

async function open(query: string): Promise<Page> {
  const p = await browser!.newPage({ viewport: { width: 1280, height: 720 } });
  await p.goto(`${base}/?${query}`);
  await p.waitForFunction(() => window.__GAME__?.ready === true);
  return p;
}

const preview = (p: Page) => p.evaluate(() => (window.__GAME__ as unknown as RoundsBridge).preview()!);
const hashOf = (p: Page) => p.evaluate(() => (window.__GAME__ as unknown as RoundsBridge).hash);

/** Node's state for the same query, at the same checkpoint (T080). */
const node = (query: string): BattleState => roundStateForParams(content, new URLSearchParams(query));

/** A bot plays your side, against the preview's adaptive general (Mother Mold), whose counter cycle sells for room (S15). */
const bot = (seed: number) => `scene=rounds&seed=${seed}&test=1&player=bot:balanced`;

type Placed = { plot: number; buildingId: string };
const byPlot = <T extends { plot: number }>(xs: T[]): T[] => [...xs].sort((a, b) => a.plot - b.plot);
/** The general's colony as it stands in a state. */
const colonyOf = (s: BattleState): Placed[] => byPlot(s.buildings.filter((b) => b.side === 'enemy').map((b) => ({ plot: b.plot, buildingId: b.buildingId })));
/** Squads by plot, with their units where they stand: the drawn preview's or the sim's `formationOf`. */
const squadsOf = (xs: (DrawnSquad | SquadPlan)[]) => byPlot(xs.map((q) => ({ plot: q.plot, unitId: q.unitId, units: q.units.map((u) => ({ x: u.x, y: u.y })) })));

/**
 * Opens round `round`'s planning with `reveal=last` and checks it draws what the general fielded in round
 * `round - 1`: its colony and formation at that round's planning checkpoint, once it had planned. None of the
 * general's buildings has a "New" sprout, and the battle hashes as Node's without the view.
 */
async function drawsLastFielded(seed: number, round: number): Promise<void> {
  const q = `${bot(seed)}&round=${round}&phase=planning`;
  const last = node(`${bot(seed)}&round=${round - 1}&phase=planning`);
  page = await open(`${q}&reveal=last`);
  const drawn = (await preview(page)).enemy;
  expect(drawn.colony.filter((b) => b.sprout), 'no "New" sprout before Begin').toEqual([]);
  expect(byPlot(drawn.colony.map(({ plot, buildingId }) => ({ plot, buildingId })))).toEqual(colonyOf(last));
  expect(squadsOf(drawn.squads)).toEqual(squadsOf(formationOf(last, 'enemy')));
  expect(await hashOf(page)).toBe(hashState(node(q)));
  expect(await page.locator('#intent-planted').textContent()).toBe('Changes show at Begin');
}

/** A round whose plan sold something (the counter cycle sells for room, S15), on the first seed that has one. */
function roundWithSale(): { seed: number; round: number } {
  for (const seed of [1, 2, 3, 4, 5]) {
    const end = node(`${bot(seed)}&phase=ended`);
    const plan = end.sides.enemy.ai!.plans.find((p) => p.round > 1 && p.sold.length > 0 && p.planted.length > 0);
    if (plan) return { seed, round: plan.round };
  }
  throw new Error('the general neither planted nor sold in one round on seeds 1 to 5');
}

describe('the "last fielded" view, reveal=last (§7.5, R2-Q1, T127)', () => {
  it('shows round 2\'s planting with its sprout under the full reveal, and hides it under reveal=last', async () => {
    const q = `${bot(1)}&round=2&phase=planning`;
    const plan = node(q).sides.enemy.ai!.plans.find((p) => p.round === 2)!;
    expect(plan.planted.length, 'the general plants in round 2').toBeGreaterThan(0);
    page = await open(q);
    const full = (await preview(page)).enemy;
    expect(byPlot(full.colony.filter((b) => b.sprout).map(({ plot, buildingId }) => ({ plot, buildingId }))))
      .toEqual(byPlot(plan.planted.map((x) => ({ plot: x.plot, buildingId: x.building }))));
    expect(await page.locator('#intent-planted').textContent()).toMatch(/^New: /);
    await page.close();
    await drawsLastFielded(1, 2);
  });

  it('round=4&reveal=last draws round 3\'s fielded colony after a headless fast-forward', async () => {
    await drawsLastFielded(1, 4);
  });

  it('stands a building sold this round again, from its plan\'s record (plan Call 12)', async () => {
    const { seed, round } = roundWithSale();
    await drawsLastFielded(seed, round);
  });

  it('starts the clash from the general\'s real formation: its plantings take the field at Begin', async () => {
    const q = `${bot(1)}&round=2`;
    // the full reveal draws the real formation, as planning.test.ts checks against the clash's first tick
    page = await open(`${q}&phase=planning`);
    const real = (await preview(page)).enemy;
    await page.close();
    const start = `${q}&phase=clash&ticks=0&paused=1`;
    page = await open(`${start}&reveal=last`);
    expect(await hashOf(page)).toBe(hashState(node(start)));
    const units = await page.evaluate(() => (window.__GAME__ as unknown as RoundsBridge).battle()!.units
      .filter((u) => u.side === 'enemy').map((u) => ({ tier: u.tier, x: u.x, y: u.y })));
    expect(units.length).toBeGreaterThan(0);
    for (const u of units) {
      // a base unit stands where its squad's slot puts it; a knit one where the muster put it (§5.6)
      const spots = u.tier === 1 ? real.squads.flatMap((s) => s.units) : real.knits.filter((k) => k.tier === u.tier);
      expect(spots.some((s) => Math.abs(s.x - u.x) < 1e-9 && Math.abs(s.y - u.y) < 1e-9), `tier ${u.tier} at (${u.x}, ${u.y})`).toBe(true);
    }
  });

  it('refuses a reveal= it doesn\'t know, so a mistyped A/B doesn\'t show the full reveal unnoticed', () => {
    expect(parseRoundParams('scene=rounds&reveal=lst').problems).toEqual(['reveal=lst isn\'t last or full']);
    expect(parseRoundParams('scene=rounds&reveal=full')).toMatchObject({ reveal: null, problems: [] });
  });

  it('moves no hash: general-plans-first hashes equal in both modes, in round 2\'s planning and at its Begin', async () => {
    for (const at of ['round=2&phase=planning', 'round=2&phase=clash&ticks=0&paused=1']) {
      const q = `scene=rounds&scenario=general-plans-first&seed=1&test=1&${at}`;
      page = await open(q);
      const full = await hashOf(page);
      await page.close();
      page = await open(`${q}&reveal=last`);
      expect(await hashOf(page), at).toBe(full);
      expect(full, at).toBe(hashState(node(q)));
      await page.close();
      page = undefined;
    }
  });
});

describe('planning seconds on the report (X6, RB-Q3, T128)', () => {
  it('shows the seconds you planned, logs the readout and saves nothing', async () => {
    // round 9, the battle's last, with nothing of yours: the general's Capguards win the lane on the first tick
    page = await open('scene=rounds&scenario=decision-round-9&test=1');
    const logged: string[] = [];
    page.on('console', (m) => { if (m.type() === 'info') logged.push(m.text()); });
    const keys = await page.evaluate(() => Object.keys(localStorage).sort());
    await page.mouse.move(400, 300);
    await page.waitForTimeout(2600);
    // Begin: the first Enter pins the empty-lane warning (R2-Q12), the second begins
    await page.keyboard.press('Enter');
    await page.waitForTimeout(150);
    await page.keyboard.press('Enter');
    const line = (await page.locator('#report-planning').textContent({ timeout: 20000 }))!;
    const m = /^Planning time by round: R9 (\d+) s · median (\d+) s · (\d+\.\d) min of active play$/.exec(line);
    expect(m, line).not.toBeNull();
    expect(Number(m![1])).toBeGreaterThanOrEqual(3);
    expect(Number(m![1])).toBeLessThan(60);
    expect(m![2]).toBe(m![1]);
    await page.waitForTimeout(200);
    expect(logged.filter((x) => x.startsWith('[play time] Planning time by round: R9'))).toHaveLength(1);
    expect(await page.evaluate(() => Object.keys(localStorage).sort())).toEqual(keys);
  });
});
