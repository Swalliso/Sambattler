// The planning screen's field in a battle in rounds (SPEC §4.6, §5.6, §10.2, §10.4; plan Calls 6 and 22): the
// formation preview stands every unit where the clash's arrival puts it, a merge toggle changes its slot's
// pips, a plot and its slot light together, a chosen card lights free plots only and is placed on its plot
// only, never by its squad's spot (T167), and the general's squads carry the class of the chosen card's hits.
// The bridge's `preview()` reports what the preview drew (T083).
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { chromium } from 'playwright';
import type { Browser, Page } from 'playwright';
import { nodeContent } from '../../tools/lib/content.ts';
import { formationBox } from '../../src/sim/formation.ts';
import type { BattleState, Side } from '../../src/sim/index.ts';
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
  return p;
}

const preview = (p: Page) => p.evaluate(() => window.__GAME__!.preview());
const battle = (p: Page): Promise<BattleState> => p.evaluate(() => window.__GAME__!.battle()!);

/** Waits for a test on the bridge, given an argument from Node. */
const until = <A>(p: Page, f: (arg: A) => boolean, arg: A) =>
  p.waitForFunction(`(${f.toString()})(${JSON.stringify(arg)})`, null, { timeout: 15000 });

/** The page point at tile (col, row) of the field: the canvas is the map with a Heartcap strip at each end. */
const pointAt = (p: Page, col: number, row: number) => p.evaluate(([c, r]) => {
  const cv = document.getElementById('battlefield') as HTMLCanvasElement;
  const b = window.__GAME__!.battle()!;
  const tile = cv.height / b.map.height, strip = (cv.width / tile - b.map.width) / 2;
  const rect = cv.getBoundingClientRect();
  return { x: rect.left + ((c! + strip) * tile * rect.width) / cv.width, y: rect.top + (r! * tile * rect.height) / cv.height };
}, [col, row]);

/** Hovers the middle of a 2×2 square (a plot or a slot) whose top-left tile is (col, row). */
async function hover(p: Page, sq: { col: number; row: number }): Promise<void> {
  const at = await pointAt(p, sq.col + 1, sq.row + 1);
  await p.mouse.move(at.x, at.y);
}

/** The hotkey of a card in your tray (§10.2: keys 1–9 follow tray order). */
async function keyOf(p: Page, buildingId: string): Promise<string> {
  const kit = (await battle(p)).sides.player.kit.map((k) => k.building);
  const i = trayOrder(content, kit).indexOf(buildingId);
  expect(i, `${buildingId} in the first nine cards`).toBeGreaterThanOrEqual(0);
  expect(i).toBeLessThan(9);
  return String(i + 1);
}

/** Your plot at a rank and file of lane 0. */
const plotOf = (s: BattleState, rank: number, file: number) => s.sides.player.plots.findIndex((p) => p.lane === 0 && p.rank === rank && p.file === file);

/** Plants a card on one of your plots with its hotkey and a click, and waits for the plant to run. */
async function plant(p: Page, buildingId: string, plot: number): Promise<void> {
  const s = await battle(p);
  const had = s.buildings.filter((b) => b.side === 'player').length;
  await p.keyboard.press(await keyOf(p, buildingId));
  await hover(p, s.sides.player.plots[plot]!);
  await p.mouse.down();
  await p.mouse.up();
  await until(p, (n) => window.__GAME__!.battle()!.buildings.filter((b) => b.side === 'player').length === n, had + 1);
}

describe('the formation preview (§4.6, §13.6, T083)', () => {
  it('draws every unit where the clash\'s first tick puts it', async () => {
    const q = 'scene=battle&seed=1&test=1&player=bot:balanced';
    page = await open(`${q}&phase=planning`);
    const drawn = (await preview(page))!;
    expect(drawn).not.toBeNull();
    for (const side of ['player', 'enemy'] as Side[]) expect(drawn[side].squads.length, side).toBeGreaterThan(0);
    await page.close();
    // the same battle at its clash's first tick: the arrival, then the muster's knits inside Begin (§5.6)
    page = await open(`${q}&phase=clash&ticks=0&paused=1`);
    const units = await page.evaluate(() => window.__GAME__!.battle()!.units.map((u) => ({ side: u.side, tier: u.tier, x: u.x, y: u.y })));
    expect(units.length).toBeGreaterThan(0);
    for (const u of units) {
      const d = drawn[u.side];
      // a base unit stands where the preview drew it; a knit one where its merge preview put it
      const spots = u.tier === 1 ? d.squads.flatMap((s) => s.units) : d.knits.filter((k) => k.tier === u.tier);
      expect(spots.some((s) => Math.abs(s.x - u.x) < 1e-9 && Math.abs(s.y - u.y) < 1e-9), `${u.side} tier ${u.tier} at (${u.x}, ${u.y})`).toBe(true);
    }
  });

  it('M on a Burrow beside another Burrow changes its slot\'s pips from Elder to none (§5.6)', async () => {
    page = await open('scene=battle&seed=1&test=1&phase=planning');
    const s = await battle(page);
    const first = plotOf(s, 0, 1), second = plotOf(s, 0, 2);
    await plant(page, 'sporelingBurrow', first);
    await plant(page, 'sporelingBurrow', second);
    const squadOn = async (plot: number) => (await preview(page!))!.player.squads.find((q) => q.plot === plot)!;
    // the two squads knit an Elder across their slots, which counts for the first (§5.6)
    expect((await squadOn(first)).fields).toEqual({ elders: 1, bloomed: 0, base: 0 });
    expect((await squadOn(second)).fields).toEqual({ elders: 0, bloomed: 2, base: 1 });
    await hover(page, s.sides.player.plots[first]!);
    await page.mouse.down();
    await page.mouse.up();
    await page.keyboard.press('m');
    await until(page, (plot) => window.__GAME__!.preview()!.player.squads.find((q) => q.plot === plot)!.fields.base === 8, first);
    expect((await squadOn(first)).fields).toEqual({ elders: 0, bloomed: 0, base: 8 });
    expect((await squadOn(second)).fields).toEqual({ elders: 0, bloomed: 2, base: 2 });
  });

  it('lights a plot and its slot together, hovering either (§10.2)', async () => {
    page = await open('scene=battle&seed=1&test=1&phase=planning');
    const s = await battle(page);
    const geom = { width: s.map.width, lanes: s.lanes, gapTiles: s.rules.formationGapTiles };
    for (const side of ['player', 'enemy'] as Side[]) {
      const plots = s.sides[side].plots;
      const f2 = plots.findIndex((p) => p.lane === 0 && p.rank === 0 && p.file === 2);
      const ranks = plots.reduce((n, p) => Math.max(n, p.rank + 1), 1);
      const slot = formationBox(geom, side, ranks).find((sl) => sl.lane === 0 && sl.rank === 0 && sl.file === 2)!;
      const lit = (want: { side: Side; plot: number | null }) => until(page!, (w) => window.__GAME__!.preview()![w.side].hover === w.plot, want);
      await hover(page, plots[f2]!);
      await lit({ side, plot: f2 });
      await page.mouse.move(1, 1);
      await lit({ side, plot: null });
      await hover(page, slot);
      await lit({ side, plot: f2 });
      await page.mouse.move(1, 1);
    }
  });
});

describe('placing (§10.2 "Placing")', () => {
  it('lights only the free plots for a chosen card, and the ghost on a stump says why not', async () => {
    page = await open('scene=battle&seed=1&test=1&phase=planning&map=stumpfield');
    const s0 = await battle(page);
    await plant(page, 'sporelingBurrow', plotOf(s0, 1, 1));
    await page.mouse.move(1, 1);
    // each plot's top edge, where the lit outline runs, in the canvas's own pixels
    const samples = () => page!.evaluate(() => {
      const cv = document.getElementById('battlefield') as HTMLCanvasElement;
      const b = window.__GAME__!.battle()!;
      const tile = cv.height / b.map.height, strip = (cv.width / tile - b.map.width) / 2;
      const g = cv.getContext('2d')!;
      return b.sides.player.plots.map((p) => [...g.getImageData((p.col + strip + 1) * tile, p.row * tile, 1, 1).data].join(','));
    });
    const before = await samples();
    await page.keyboard.press(await keyOf(page, 'sporelingBurrow'));
    await page.waitForTimeout(100);
    const after = await samples();
    const s = await battle(page);
    const plots = s.sides.player.plots;
    expect(plots.some((p) => p.terrain === 'stump') && plots.some((p) => !p.open) && plots.some((p) => p.building)).toBe(true);
    plots.forEach((p, i) => {
      const free = p.open && p.terrain !== 'stump' && !p.building;
      expect(after[i] !== before[i], `plot ${i} (rank ${p.rank}, file ${p.file}, ${p.terrain}${p.open ? '' : ', closed'}${p.building ? ', taken' : ''})`).toBe(free);
    });
    const stump = plots.find((p) => p.open && p.terrain === 'stump')!;
    await hover(page, stump);
    await page.waitForFunction(() => !(document.getElementById('ghost-tip') as HTMLElement).hidden);
    expect(await page.locator('#ghost-tip').textContent()).toContain('a stump fills this plot');
  });
});

describe('one highlight when placing (S21b/T161)', () => {
  it('lights the plot a chosen card hovers and stands its ghost squad in the field, with no box at the slot', async () => {
    page = await open('scene=battle&seed=1&test=1&phase=planning');
    // every outline the canvas draws, as [x, y, w, h] in its own pixels
    await page.evaluate(() => {
      const w = window as unknown as { rects: number[][] };
      w.rects = [];
      const stroke = CanvasRenderingContext2D.prototype.strokeRect;
      CanvasRenderingContext2D.prototype.strokeRect = function (x, y, rw, rh) { w.rects.push([x, y, rw, rh]); stroke.call(this, x, y, rw, rh); };
    });
    const s = await battle(page);
    const plot = plotOf(s, 0, 2), p = s.sides.player.plots[plot]!;
    const geom = { width: s.map.width, lanes: s.lanes, gapTiles: s.rules.formationGapTiles };
    const ranks = s.sides.player.plots.reduce((n, q) => Math.max(n, q.rank + 1), 1);
    const slot = formationBox(geom, 'player', ranks).find((sl) => sl.lane === 0 && sl.rank === 0 && sl.file === 2)!;
    /** Whether the frames drawn since the last call outlined the square whose top-left tile is (col, row). */
    const outlined = (sq: { col: number; row: number }) => page!.evaluate(([c, r]) => {
      const cv = document.getElementById('battlefield') as HTMLCanvasElement;
      const b = window.__GAME__!.battle()!;
      const tile = cv.height / b.map.height, strip = (cv.width / tile - b.map.width) / 2;
      const w = window as unknown as { rects: number[][] };
      const hit = w.rects.some(([x, y]) => Math.abs(x! - ((c! + strip) * tile + 0.5)) < 0.01 && Math.abs(y! - (r! * tile + 0.5)) < 0.01);
      w.rects = [];
      return hit;
    }, [sq.col, sq.row]);
    const frames = () => page!.evaluate(() => new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(done))));

    // with no card, hovering a plot lights its slot too (T083)
    await hover(page, p);
    await until(page, (i) => window.__GAME__!.preview()!.player.hover === i, plot);
    await frames();
    await outlined(slot);
    await frames();
    expect(await outlined(slot), 'the slot, hovering its plot with no card').toBe(true);

    // with a card chosen, the plot is lit and the ghost squad stands in its slot, unboxed
    await page.keyboard.press(await keyOf(page, 'capguardHall'));
    await until(page, () => !!window.__GAME__!.preview()!.player.squads.some((q) => q.ghost), 0);
    await frames();
    await outlined(slot);
    await frames();
    expect(await outlined(p), 'the plot').toBe(true);
    await frames();
    expect(await outlined(slot), 'the slot').toBe(false);
  });
});

describe('placing on plots only (T167)', () => {
  it("doesn't place a chosen card by its squad's spot in the field, hovering or clicking it; its plot still takes it", async () => {
    page = await open('scene=battle&seed=1&test=1&phase=planning');
    const s = await battle(page);
    const plot = plotOf(s, 0, 2);
    const geom = { width: s.map.width, lanes: s.lanes, gapTiles: s.rules.formationGapTiles };
    const ranks = s.sides.player.plots.reduce((n, q) => Math.max(n, q.rank + 1), 1);
    const slot = formationBox(geom, 'player', ranks).find((sl) => sl.lane === 0 && sl.rank === 0 && sl.file === 2)!;
    await page.keyboard.press(await keyOf(page, 'capguardHall'));
    // the squad's spot: no ghost, no lit plot and no tip
    await hover(page, slot);
    await page.waitForTimeout(150);
    const drawn = (await preview(page))!;
    expect(drawn.player.squads.some((q) => q.ghost), 'a ghost squad').toBe(false);
    expect(drawn.player.hover, 'the lit plot').toBeNull();
    expect(await page.locator('#ghost-tip').isHidden()).toBe(true);
    // and a click there plants nothing
    await page.mouse.down();
    await page.mouse.up();
    await page.waitForTimeout(200);
    const after = await battle(page);
    expect(after.buildings.filter((b) => b.side === 'player')).toEqual([]);
    expect(after.queue.filter((c) => c.side === 'player' && c.type === 'plant')).toEqual([]);
    // the plot itself takes the card, still chosen
    await hover(page, s.sides.player.plots[plot]!);
    await until(page, () => !!window.__GAME__!.preview()!.player.squads.some((q) => q.ghost), 0);
    await page.mouse.down();
    await page.mouse.up();
    await until(page, (i) => window.__GAME__!.battle()!.buildings.some((b) => b.side === 'player' && b.plot === i), plot);
  });
});

describe('the matchup marks (§10.4, plan Call 22, T084)', () => {
  it('marks the general\'s Gill Archers strong and its Capguards with none for a chosen Sporeling Burrow', async () => {
    page = await open('scene=battle&seed=1&test=1&scenario=formation-from-plots&phase=planning');
    const squads = async () => (await preview(page!))!.enemy.squads;
    // nothing chosen or hovered: no marks
    expect((await squads()).map((q) => q.marks)).toEqual([null, null]);
    await page.keyboard.press(await keyOf(page, 'sporelingBurrow'));
    await page.waitForFunction(() => window.__GAME__!.preview()!.enemy.squads.every((q) => q.marks !== null));
    const by = (unitId: string) => squads().then((all) => all.find((q) => q.unitId === unitId)!.marks);
    expect(await by('gillArcher')).toEqual({ base: 'strong', merged: null }); // slash on light, ×1.5
    expect(await by('capguard')).toEqual({ base: null, merged: null }); // slash on medium, ×1.0: no mark
    expect((await preview(page))!.player.squads).toEqual([]);
  });
});
