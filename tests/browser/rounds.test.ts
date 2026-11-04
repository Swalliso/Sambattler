// The preview of a battle in rounds, `scene=battle` (SPEC §15.6, §13.5, §10.3; plan Calls 14–16, 28): the
// planning checkpoint and its hold, Begin by key with the empty-lane warning (R2-Q12, A065), a pause that never
// carries into a clash, a bot's queued Begin, a clash tick counted from the clash's start, and the refusals; and
// `scene=draft`'s draft in round 3's planning, as a bottom sheet (R2-Q24, R2b/T111, T115, T116). Nothing here pins
// a combat outcome: the states are compared with Node's, computed live (A059, A075).
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { chromium } from 'playwright';
import type { Browser, Page } from 'playwright';
import { nodeContent } from '../../tools/lib/content.ts';
import { battleStateForParams, runForParams } from '../../tools/lib/params.ts';
import { STRIP, TILE } from '../../src/render/renderer.ts';
import { hashState } from '../../src/sim/index.ts';
import type { GameBridge } from '../../src/app/debugBridge.ts';
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

/** What the bridge reports. */
const game = (p: Page) => p.evaluate(() => {
  const g = window.__GAME__ as unknown as GameBridge;
  return { round: g.round, phase: g.phase, tick: g.tick, hash: g.hash, errors: [...g.errors] };
});

/** Node's state for the same query, at the same checkpoint (T080). */
const node = (query: string) => battleStateForParams(content, new URLSearchParams(query));

const until = (p: Page, f: (g: GameBridge) => boolean) =>
  p.waitForFunction(`(${f.toString()})(window.__GAME__)`, null, { timeout: 15000 });

describe('the planning checkpoint (plan Call 14)', () => {
  it('holds round 1 planning at tick 0 with no input, at Node\'s hash', async () => {
    const q = 'scene=battle&seed=1&test=1';
    page = await open(q);
    const first = await game(page);
    expect(first).toMatchObject({ round: 1, phase: 'planning', tick: 0, errors: [] });
    await page.waitForTimeout(1000);
    expect(await game(page)).toEqual(first);
    expect(first.hash).toBe(hashState(node(q)));
  });

  it('holds a bot player\'s plan with its beginClash queued under phase=planning', async () => {
    const q = 'scene=battle&seed=1&test=1&player=bot:balanced&phase=planning';
    page = await open(q);
    await page.waitForTimeout(1000);
    const s = await page.evaluate(() => {
      const b = window.__GAME__!.battle()!;
      return {
        phase: b.phase, tick: b.tick, queue: b.queue.map((c) => `${c.side}:${c.type}`),
        planted: b.log.filter((c) => c.side === 'player' && c.type === 'plant').length,
        mine: b.buildings.filter((x) => x.side === 'player').length,
      };
    });
    expect(s).toMatchObject({ phase: 'planning', tick: 0, queue: ['player:beginClash'] });
    expect(s.planted).toBeGreaterThan(0);
    expect(s.mine).toBeGreaterThan(0);
    expect((await game(page)).hash).toBe(hashState(node(q)));
  });
});

describe('Begin, the clash and the aftermath (§10.3, §13.5)', () => {
  it('warns on an empty colony, begins on a second Enter, and input after the clash opens round 2', async () => {
    // `phase=planning` makes the aftermath hold for input under ?test=1 (plan Call 15)
    page = await open('scene=battle&seed=1&test=1&phase=planning');
    await page.waitForTimeout(450); // Begin by key waits about 400 ms after planning opens (R2-Q12)
    await page.keyboard.press('Enter');
    await page.waitForTimeout(150);
    expect(await game(page)).toMatchObject({ phase: 'planning', tick: 0 });
    expect(await page.locator('#begin-btn').textContent()).toContain('Begin anyway');
    await page.keyboard.press('Enter');
    await until(page, (g) => g.tick > 0);
    await until(page, (g) => g.phase === 'aftermath');
    expect((await game(page)).round).toBe(1);
    // the skip opens round 2's planning, and a second press straight after it doesn't Begin (A065)
    await page.keyboard.press('Enter');
    await page.keyboard.press('Enter');
    await until(page, (g) => g.round === 2 && g.phase === 'planning');
    await page.waitForTimeout(150);
    expect(await game(page)).toMatchObject({ round: 2, phase: 'planning' });
    expect(await page.locator('#begin-btn').textContent()).not.toContain('Begin anyway');
  });

  it('doesn\'t carry paused=1 in planning into the clash', async () => {
    page = await open('scene=battle&seed=1&test=1&paused=1');
    await page.waitForTimeout(450);
    await page.keyboard.press('Enter');
    await page.keyboard.press('Enter');
    await until(page, (g) => g.tick > 0);
    expect((await game(page)).errors).toEqual([]);
  });
});

describe('fast-forwards (plan Call 16)', () => {
  it('opens a clash tick counted from the clash\'s start, at Node\'s hash', async () => {
    // the first seed whose round 4 clash lasts past 200 ticks, found live, so no combat outcome is pinned
    let q = '';
    for (let seed = 1; seed <= 30 && !q; seed++) {
      const at = `scene=battle&seed=${seed}&test=1&player=bot:balanced&round=4&phase=clash&ticks=200&paused=1`;
      try { node(at); q = at; } catch { /* the battle or round 4's clash ended first */ }
    }
    expect(q).not.toBe('');
    const want = node(q);
    page = await open(q);
    const g = await game(page);
    expect(g).toMatchObject({ round: 4, phase: 'clash', tick: want.clash!.startTick + 200, errors: [] });
    expect(g.hash).toBe(hashState(want));
    await page.waitForTimeout(300);
    expect((await game(page)).tick).toBe(g.tick); // paused=1 holds the clash
  });

  it('fails a round past the battle\'s end with a message', async () => {
    page = await open('scene=battle&seed=1&test=1&player=bot:balanced&round=10');
    expect(await page.locator('#battle-refused').textContent()).toMatch(/ended in round \d/);
    expect((await game(page)).errors.length).toBe(1);
  });

  it('refuses round=2 for a human player without a scenario, with a message', async () => {
    page = await open('scene=battle&seed=1&test=1&round=2');
    expect(await page.locator('#battle-refused').textContent()).toMatch(/scenario/);
    expect(() => node('scene=battle&seed=1&round=2')).toThrow(/scenario/);
  });
});

type Box = { x: number; y: number; width: number; height: number };
const overlap = (a: Box, b: Box) => a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;
/** The light in a patch of pixels: its RGB summed. */
const light = (px: number[]) => px.reduce((n, v, i) => (i % 4 === 3 ? n : n + v), 0);

// R2b/T111: the draft in round 3's planning, as a bottom sheet in the bottom band's place (§10.2, §8.3, R2-Q24)
describe("scene=draft's draft in planning (R2-Q24)", () => {
  it("opens round 3's planning with 3 cards in the bottom band's place, at Node's hash, with Begin unlit and its tooltip", async () => {
    const q = 'scene=draft&seed=1&test=1';
    page = await open(q);
    const g = await game(page);
    expect(g).toMatchObject({ round: 3, phase: 'planning', errors: [] });
    expect(g.hash).toBe(hashState(runForParams(content, new URLSearchParams(q)).battle!));
    expect(await page.locator('#draft .draft-card').count()).toBe(3);
    expect(await page.locator('#draft-title').textContent()).toBe('Draft 1');
    // the sheet takes the bottom band's place, under the field, and nothing covers the field
    expect(await page.locator('footer.bottom').isVisible()).toBe(false);
    const [sheet, field] = await Promise.all(['#draft', '#battlefield'].map((sel) => page!.locator(sel).boundingBox()));
    expect(sheet!.y).toBeGreaterThanOrEqual(field!.y + field!.height - 0.5);
    expect(sheet!.y + sheet!.height).toBeLessThanOrEqual(720.5);
    // Begin is unlit, with why in its tooltip; Space says so too, and doesn't Begin
    const begin = page.locator('#draft-begin');
    expect(await begin.getAttribute('aria-disabled')).toBe('true');
    expect(await begin.getAttribute('title')).toBe('Pick or skip the draft first');
    await page.keyboard.press('Space');
    await expect.poll(() => page!.locator('#callouts').textContent()).toContain('Pick or skip the draft first');
    expect(await page.evaluate(() => window.__GAME__!.battle()!.queue.some((c) => c.type === 'beginClash'))).toBe(false);
    expect(await page.locator('#draft-reroll').textContent()).toContain('20');
    expect(await page.locator('#draft-skip').textContent()).toBe('Skip (+40 gold)');
    // a card's whole text is in its tooltip
    await page.locator('#draft .draft-card').first().hover();
    await expect.poll(() => page!.locator('#draft-tip').isVisible()).toBe(true);
    expect(await page.locator('#draft-tip').textContent()).toContain(await page.locator('#draft .draft-card .draft-text').first().textContent() ?? '?');
  });

  it("keeps the general's slots clear of the sheet and lit while the field around them dims", async () => {
    page = await open('scene=draft&seed=1&test=1');
    const read = await page.evaluate(async ({ strip, tile }) => {
      const g = window.__GAME__!;
      const canvas = document.getElementById('battlefield') as HTMLCanvasElement;
      const ctx = canvas.getContext('2d')!;
      const slots = g.preview()!.enemy.squads.map((s) => s.slot);
      const mine = g.battle()!.sides.player.plots[0]!;
      const patch = (col: number, row: number) => Array.from(ctx.getImageData((col + strip) * tile, row * tile, 2 * tile, 2 * tile).data);
      const shot = () => ({ slots: slots.map((s) => patch(s.col, s.row)), mine: patch(mine.col, mine.row) });
      const frames = () => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
      // the general's slots on the page
      const box = canvas.getBoundingClientRect(), k = box.width / canvas.width;
      const rects = slots.map((s) => ({ x: box.x + (s.col + strip) * tile * k, y: box.y + s.row * tile * k, width: 2 * tile * k, height: 2 * tile * k }));
      const dimmed = shot();
      // the same frame without the draft (staged, then put back): no command is queued, so the battle doesn't step
      const b = g.battle()!, draft = b.sides.player.draft;
      delete b.sides.player.draft;
      await frames();
      const plain = shot();
      b.sides.player.draft = draft;
      await frames();
      return { rects, dimmed, plain, open: !document.getElementById('draft')!.hidden };
    }, { strip: STRIP, tile: TILE });
    expect(read.open).toBe(true);
    expect(read.rects.length).toBeGreaterThan(0);
    const sheet = (await page.locator('#draft').boundingBox())!;
    for (const r of read.rects) expect(overlap(r, sheet)).toBe(false);
    // inside its slots the general's army keeps its light (a little give for the Elders' glow); your colony dims
    read.rects.forEach((_, i) => expect(light(read.dimmed.slots[i]!) / light(read.plain.slots[i]!), `slot ${i}`).toBeGreaterThan(0.95));
    expect(light(read.dimmed.mine) / light(read.plain.mine)).toBeLessThan(0.6);
  });

  it('picks with keys 1–3, the bot then plans its round, and the bottom band comes back', async () => {
    page = await open('scene=draft&seed=1&test=1');
    const offer = await page.evaluate(() => window.__GAME__!.battle()!.sides.player.draft!.offer.map((c) => c.id));
    expect(offer).toHaveLength(3);
    await page.keyboard.press('2');
    await until(page, (g) => !g.battle()!.sides.player.draft);
    expect(await page.evaluate(() => window.__GAME__!.battle()!.sides.player.drafted)).toEqual([offer[1]]);
    // the bot's round-3 plan runs once the draft resolves (T115): it Begins
    await until(page, (g) => g.phase !== 'planning');
    expect(await page.locator('#draft').isVisible()).toBe(false);
    expect(await page.locator('footer.bottom').isVisible()).toBe(true);
    expect((await game(page)).errors).toEqual([]);
  });
});
