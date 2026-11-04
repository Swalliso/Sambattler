// The v3 prototype on the screen (docs/v3-proto-plan.md, S2; T012–T017; docs/spec-v3-concept.md, C3.1 and C3.2),
// after tests/browser/reveal.test.ts. Behind `?rules=v3`: every building is a sprout until the clash after the
// round it's planted in, drawn with the round it fields in on its plot, and its slot in the formation preview
// stands empty. From round 2 the general's plantings this round are neither drawn nor inspectable until Begin,
// when they appear as sprouts, and the Intent panel shows its gold at the start of its turn in place of what it
// banked. Round 1's clash is empty, so Begin goes straight to round 2's planning. The dev site's title opens the
// battle, which carries a tag and writes no save or record. It's a view rule: the battle hashes as Node's.
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { chromium } from 'playwright';
import type { Browser, Page } from 'playwright';
import { nodeContent } from '../../tools/lib/content.ts';
import { battleStateForParams } from '../../tools/lib/params.ts';
import { hashState, visibleColony } from '../../src/sim/index.ts';
import type { BattleState, Side } from '../../src/sim/index.ts';
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
  page = undefined;
});

async function open(query: string, at = base): Promise<Page> {
  const p = await browser!.newPage({ viewport: { width: 1280, height: 720 } });
  await p.goto(`${at}/?${query}`);
  await p.waitForFunction(() => window.__GAME__?.ready === true);
  return p;
}

const frames = (p: Page) => p.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
const preview = (p: Page) => p.evaluate(() => window.__GAME__!.preview()!);
/** Node's state for the same query, at the same checkpoint (T080). */
const node = (query: string): BattleState => battleStateForParams(content, new URLSearchParams(query));

/** The centre of one of a side's plots on the page: plots are 2×2 tiles of 16 px, right of a 2-tile strip. */
const plotPoint = (p: Page, side: Side, i: number) => p.evaluate(([s, n]) => {
  const c = document.getElementById('battlefield') as HTMLCanvasElement;
  const r = c.getBoundingClientRect();
  const plot = window.__GAME__!.battle()!.sides[s].plots[n]!;
  return { x: r.left + ((plot.col + 3) * 16 * r.width) / c.width, y: r.top + ((plot.row + 1) * 16 * r.height) / c.height };
}, [side, i] as const);
const clickPlot = async (p: Page, side: Side, i: number) => {
  const at = await plotPoint(p, side, i);
  await p.mouse.click(at.x, at.y);
  await frames(p);
  await frames(p);
};
const inspectMode = (p: Page) => p.locator('#inspect').getAttribute('data-mode');

/** A bot plays your side, so both colonies have plantings; any input would let its queued Begin through. */
const bot = (seed: number) => `scene=battle&rules=v3&seed=${seed}&test=1&player=bot:balanced`;
/** You play your side, from an empty colony. */
const you = (seed: number) => `scene=battle&rules=v3&seed=${seed}&test=1`;

describe('sprouts and their timers (C3.2, T013)', () => {
  it('round 1: both openers stand in view as sprouts that field from round 2, and neither formation fields a squad', async () => {
    page = await open(`${bot(1)}&round=1&phase=planning`);
    const drawn = await preview(page);
    for (const side of ['player', 'enemy'] as const) {
      expect(drawn[side].colony.length, side).toBeGreaterThan(0);
      expect(drawn[side].colony.map((b) => [b.sprout, b.fruits]), side).toEqual(drawn[side].colony.map(() => [true, 2]));
      expect(drawn[side].squads, side).toEqual([]);
    }
    // round 1 keeps the full reveal (C3.1)
    expect(await page.locator('#intent-planted').textContent()).toMatch(/^New: /);
    expect(await page.locator('#v3-tag').textContent()).toBe('v3 prototype');
  });
});

describe('the general\'s hidden plantings (C3.1, T012, T014, T015)', () => {
  it('round 2: its planting isn\'t drawn, its gold at the start of its turn is, and your planting sprouts in an empty slot', async () => {
    const q = `${bot(1)}&round=2&phase=planning`;
    const n = node(q);
    const seen = visibleColony(n, 'enemy');
    expect(n.buildings.some((b) => b.side === 'enemy' && b.plantedRound === 2), 'the general plants in round 2').toBe(true);
    page = await open(q);
    expect(await page.evaluate(() => window.__GAME__!.hash), 'a view rule moves no hash').toBe(hashState(n));

    // the general as you may see it: what it planted before, none of it sprouting, and its formation
    const drawn = await preview(page);
    expect(drawn.enemy.colony.map((b) => b.building).sort()).toEqual(seen.buildings.map((b) => b.id).sort());
    expect(drawn.enemy.colony.filter((b) => b.sprout)).toEqual([]);
    expect(drawn.enemy.squads.map((s) => s.plot).sort()).toEqual(seen.formation.map((s) => s.plot).sort());

    // the gold tell: its gold at the start of its turn and its income; what it banked and planted waits for Begin
    const plan = n.sides.enemy.ai!.plans.find((p) => p.round === 2)!;
    expect(await page.locator('#intent-gold').textContent()).toBe(`gold ${seen.gold}`);
    expect(await page.locator('#intent-income').textContent()).toBe(`income ${plan.income}`);
    expect(await page.locator('#intent-banked').textContent()).toBe('');
    expect(await page.locator('#intent-planted').textContent()).toBe('Plantings show at Begin');

    // yours: this round's planting is a sprout with its timer, and its slot in the formation preview stands empty
    const mine = n.buildings.filter((b) => b.side === 'player' && b.plantedRound === 2);
    expect(mine.length, 'the bot plants in round 2').toBeGreaterThan(0);
    for (const b of mine) {
      expect(drawn.player.colony.find((x) => x.building === b.id)).toMatchObject({ sprout: true, fruits: 3 });
      expect(drawn.player.squads.some((s) => s.plot === b.plot)).toBe(false);
    }
  });
});

describe('a battle from round 1 (C3.1, C3.2, Plan-Q1; T012, T014, T017)', () => {
  it('Begin skips the empty clash, and round 2\'s planting can\'t be inspected until Begin, when it appears as a sprout', async () => {
    page = await open(`${you(1)}&phase=planning`);
    // your opener sprouts, with the round it fields in, and fields nothing yet
    const free = await page.evaluate(() => window.__GAME__!.battle()!.sides.player.plots.findIndex((p) => p.open && p.terrain !== 'stump' && !p.building));
    await page.click('#tray [data-building=sporelingBurrow]');
    await clickPlot(page, 'player', free);
    let drawn = await preview(page);
    expect(drawn.player.colony.find((b) => b.plot === free)).toMatchObject({ buildingId: 'sporelingBurrow', sprout: true, fruits: 2 });
    expect(drawn.player.squads.filter((s) => !s.ghost)).toEqual([]);

    // Begin: neither side fields a squad, so no clash or aftermath shows. `phase=` under ?test=1 holds an
    // aftermath for input, so reaching round 2 unaided means none was shown
    const seen: string[] = [];
    await page.exposeFunction('notePhase', (p: string) => { seen.push(p); });
    await page.evaluate(() => {
      const note = () => {
        const s = window.__GAME__!.battle()!;
        (window as unknown as { notePhase(p: string): void }).notePhase(`${s.round}:${s.phase}`);
        if (s.round < 2) requestAnimationFrame(note);
      };
      note();
    });
    await page.click('#begin-btn');
    await page.waitForFunction(() => window.__GAME__!.battle()!.round === 2 && window.__GAME__!.battle()!.phase === 'planning', null, { timeout: 5000 });
    await frames(page);
    expect([...new Set(seen)], 'no clash or aftermath drawn').toEqual(['1:planning', '2:planning']);
    expect(await page.locator('#empty-lane-warning').count(), 'nothing fields on either side, so no warning').toBe(0);
    await expect.poll(() => page!.locator('#mount-callouts').textContent()).toContain('Both colonies sprout');

    // round 2: the general's planting this round is neither drawn nor inspectable
    const general = await page.evaluate(() => {
      const s = window.__GAME__!.battle()!;
      const plan = s.sides.enemy.ai!.plans.find((p) => p.round === 2)!;
      const theirs = s.buildings.filter((b) => b.side === 'enemy');
      return { shown: theirs.filter((b) => b.plantedRound < 2), hidden: theirs.filter((b) => b.plantedRound === 2), goldAtStart: plan.goldAtStart };
    });
    expect(general.hidden.length, 'the general plants in round 2').toBeGreaterThan(0);
    drawn = await preview(page);
    expect(drawn.enemy.colony.map((b) => b.building).sort()).toEqual(general.shown.map((b) => b.id).sort());
    expect(drawn.player.colony.find((b) => b.plot === free)?.sprout, 'your opener has fruited').toBe(false);
    expect(await page.locator('#intent-gold').textContent()).toBe(`gold ${general.goldAtStart}`);
    await clickPlot(page, 'enemy', general.shown[0]!.plot);
    expect(await inspectMode(page)).toBe('building');
    await clickPlot(page, 'enemy', general.hidden[0]!.plot);
    expect(await inspectMode(page)).toBe('none');

    // Begin: your opener fields, and the general's planting appears, as a sprout that fields from round 3
    await page.click('#begin-btn');
    await page.waitForFunction(() => window.__GAME__!.battle()!.phase !== 'planning');
    await frames(page);
    const after = (await preview(page)).enemy.colony;
    for (const b of general.hidden) expect(after.find((x) => x.building === b.id), `${b.buildingId} on plot ${b.plot}`).toMatchObject({ sprout: true, fruits: 3 });
  });
});

describe('the preview link (T016)', () => {
  it('the dev site\'s title opens a v3 battle, which writes no save or record', async () => {
    const dev = await serve('develop');
    page = await browser!.newPage({ viewport: { width: 1280, height: 720 } });
    await page.goto(`${dev}/`);
    await page.locator('#title-v3').waitFor();
    // the tips store remembers the tips shown (spore-sprawl/tips/v1), in any battle: it isn't a save or a record
    const keys = () => page!.evaluate(() => Object.keys(localStorage).filter((k) => !k.endsWith('spore-sprawl/tips/v1')).sort());
    const before = await keys();
    await page.click('#title-v3');
    await page.locator('#v3-tag').waitFor();
    const q = new URL(page.url()).searchParams;
    expect([q.get('scene'), q.get('rules')]).toEqual(['battle', 'v3']);
    await page.locator('#begin-btn').click();
    await expect.poll(() => page!.locator('#mount-callouts').textContent()).toContain('Both colonies sprout');
    expect(await keys()).toEqual(before);
  });

  it('the game\'s title has no such button', async () => {
    page = await browser!.newPage({ viewport: { width: 1280, height: 720 } });
    await page.goto(`${base}/?test=1`);
    await page.locator('#title').waitFor();
    expect(await page.locator('#title-v3').count()).toBe(0);
  });
});
