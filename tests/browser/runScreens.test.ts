// The run screens (docs/archive/v1/ui-ux-plan.md, Phase 2; SPEC §8.2, §8.5, §8.8, §10.5): the title opens with no
// scene, offers Continue only with a saved run, and describes rounds, as the link previews do; the route draws a
// hypha from every node to every node in the next row, lights a pod's threads on hover, and shows each battle
// node's general's kit; the run bar and a run battle's top band light a cap per Regrowth left; spoils take keys
// 1–3; event choices carry outcome chips with a real minus for costs; the summary gives each battle's outcome and
// round sparkline and the run's play time; `scene=run` opens a battle at a round and phase with Node's hash (R2b
// S9); Help's six tabs fit at 1280×720; and no run screen clips at 1280×720 or 1366×650.
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { chromium } from 'playwright';
import type { Browser, Page } from 'playwright';
import { createServer } from 'vite';
import type { ViteDevServer } from 'vite';
import { AUTOPLAY, RUN_KEY, chooseNode, createRun, generalKit, hashRun, isBattle, simulateRun } from '../../src/run/index.ts';
import type { BattleRecord, RunState } from '../../src/run/index.ts';
import { hashState } from '../../src/sim/index.ts';
import { nodeContent } from '../../tools/lib/content.ts';
import { runForParams } from '../../tools/lib/params.ts';

let server: ViteDevServer | undefined;
let browser: Browser | undefined;
let page: Page | undefined;
let base: string;

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

async function open(query: string, opts: { width?: number; height?: number; run?: RunState } = {}): Promise<Page> {
  const p = await browser!.newPage({ viewport: { width: opts.width ?? 1280, height: opts.height ?? 720 }, reducedMotion: 'reduce' });
  page = p;
  if (opts.run) await p.addInitScript(([k, v]) => localStorage.setItem(k, v), [RUN_KEY, JSON.stringify(opts.run)] as const);
  await p.goto(`${base}${query}`);
  await p.waitForFunction(() => window.__GAME__?.ready === true);
  await p.evaluate(() => document.fonts.ready.then(() => true));
  return p;
}

/** Elements that poke out of the window (screen px), ignoring hidden ones. */
async function clipped(p: Page): Promise<string[]> {
  return p.evaluate(() => {
    const W = window.innerWidth, H = window.innerHeight;
    const out: string[] = [];
    for (const el of document.querySelectorAll<HTMLElement>('#app button, #app h1, #app table, #app .runbar, #app .runfoot, #app .choice, #app .draft-card, #app .route-node, .helpcard')) {
      const r = el.getBoundingClientRect();
      if (r.width && r.height && (r.bottom > H + 0.5 || r.right > W + 0.5 || r.top < -0.5 || r.left < -0.5)) out.push(`${el.id || el.className}: ${Math.round(r.right)}×${Math.round(r.bottom)}`);
    }
    return out;
  });
}

const content = nodeContent();
// seed 4: on R1's chosen set (R2a S1), seed 3's run ends in its first battle
const mid = (): RunState => simulateRun(content, 4, AUTOPLAY, { maxBattles: 2 }).run;
/** `scene=summary&seed=7&autoplay=run`'s run, played once. */
let whole: RunState | undefined;
const ended = (): RunState => (whole ??= simulateRun(content, 7, AUTOPLAY).run);
/** A battle's result as the summary words it (§8.8): a Rout names the round a Heartcap fell, unless the record has no rounds. */
const outcome = (b: BattleRecord): string =>
  `${b.winner === 'player' ? 'Won' : 'Lost'} by ${b.by === 'decision' ? 'Decision' : `Rout${b.rounds.length ? ` in round ${b.rounds.at(-1)!.round}` : ''}`}`;
/** A route row's nominal battle index (`ROW_INDEX` in src/run/route.ts), which picks its generals. */
const NOMINAL = [1, 2, 3, 3, 4, 5];

describe('the title', () => {
  it('opens with no scene; without a save the primary button is New run', async () => {
    const p = await open('/?test=1');
    expect(await p.evaluate(() => window.__GAME__!.scene)).toBe('title');
    expect(await p.locator('#title .wordmark').textContent()).toBe('Spore & Sprawl');
    expect(await p.locator('#title-continue').count()).toBe(0);
    expect(await p.locator('#title-new').getAttribute('class')).toContain('primary');
    expect(await clipped(p)).toEqual([]);
  });

  it('offers Continue for a saved run, naming its row and Regrowths, and resumes it', async () => {
    const run = mid();
    const p = await open('/?debug=1', { run });
    expect(await p.locator('#title-continue').textContent()).toContain(`Row ${run.path.length + 1} of ${run.route.length} · ${run.lives.left} Regrowth`);
    expect(await p.locator('#title-continue').getAttribute('title')).toContain('lives');
    await p.locator('#title-continue').click();
    await p.waitForSelector('#route');
    expect(await p.evaluate(() => window.__GAME__!.run()?.battles.length)).toBe(run.battles.length);
    // and the route leads back to the title
    await p.locator('#to-title').click();
    await p.waitForSelector('#title-continue');
  });

  it('describes rounds in its blurb and its link previews, with no tug-of-war, front line or columns', async () => {
    const p = await open('/?test=1');
    const blurb = (await p.locator('#title .title-blurb').textContent())!;
    for (const want of [/plan/i, /general/i, /clash/i, /round/i]) expect(blurb).toMatch(want);
    const previews = await p.evaluate(() => ['meta[name="description"]', 'meta[property="og:description"]', 'meta[name="twitter:description"]']
      .map((sel) => document.querySelector<HTMLMetaElement>(sel)?.content ?? ''));
    for (const text of [blurb, ...previews]) {
      expect(text).toMatch(/round/i);
      expect(text).not.toMatch(/tug-of-war|front line|column/i);
    }
  });

  it('opens Help in six tabs, and the settings screen with sound and damage numbers', async () => {
    const p = await open('/?test=1');
    await p.locator('#title-help').click();
    expect(await p.locator('#help [role="tab"]').allTextContents()).toEqual(['Matrix', 'Merging', 'The general', 'Economy', 'Sporestorm', 'Keys']);
    await p.locator('#help-tab-matrix').focus();
    await p.keyboard.press('ArrowRight');
    expect(await p.locator('#help-tab-merging').getAttribute('aria-selected')).toBe('true');
    expect(await p.locator('#help-merging').isVisible()).toBe(true);
    await p.keyboard.press('Escape');
    expect(await p.locator('#help').count()).toBe(0);
    await p.locator('#settings-btn').click();
    expect(await p.locator('#settings input[data-level]').count()).toBe(3);
    expect(await p.locator('#settings [data-numbers]').count()).toBe(3);
    expect(await p.locator('#settings-paused').count()).toBe(0);
    expect(await clipped(p)).toEqual([]);
  });
});

describe('the route', () => {
  it('joins every node to every node in the next row, and lights a pod’s threads on hover', async () => {
    const p = await open('/?scene=route&seed=4&autoplay=battles:2&test=1');
    const run = simulateRun(content, 4, AUTOPLAY, { maxBattles: 2 }).run;
    const sizes = run.route.map((r) => r.length);
    const want = sizes[0]! + sizes.slice(1).reduce((n, s, i) => n + s * sizes[i]!, 0);
    expect(await p.locator('.hyphae .thread').count()).toBe(want);
    expect(await p.locator('.thread.walked').count()).toBe(run.path.length);
    expect(await p.locator('.thread.open').count()).toBe(sizes[run.path.length]!);
    expect(await p.locator('.route-node.open').count()).toBe(sizes[run.path.length]!);
    const node = p.locator('.route-node.future').first();
    const id = await node.getAttribute('data-node');
    await node.hover();
    const hot = await p.locator('.thread.hot').evaluateAll((ts) => ts.map((t) => [(t as SVGElement).dataset.from, (t as SVGElement).dataset.to]));
    expect(hot.length).toBeGreaterThan(0);
    for (const [a, b] of hot) expect([a, b]).toContain(id);
    expect(await p.locator('#route-legend .legend-item').count()).toBe(7);
    expect(await clipped(p)).toEqual([]);
  });

  it('lights a cap per Regrowth left on the run bar, with lives in its tooltip', async () => {
    const run = mid();
    run.lives.left = 2;
    const p = await open('/?scene=run&debug=1', { run });
    expect(await p.evaluate(() => window.__GAME__!.run()!.lives)).toEqual({ left: 2, max: 3 });
    expect(await p.locator('#run-lives .cap').count()).toBe(3);
    expect(await p.locator('#run-lives .cap.lit').count()).toBe(2);
    expect(await p.locator('#run-lives').getAttribute('title')).toContain('lives');
  });

  it("shows each battle node's general's kit at the index it's fought at, the boss's intel note, and no bosslives bonus by default", async () => {
    const p = await open('/?scene=route&seed=4&autoplay=battles:2&test=1');
    const run = mid();
    const row = run.path.length;
    let nodes = 0;
    for (const [r, list] of run.route.entries()) {
      for (const [i, node] of list.entries()) {
        if (!isBattle(node)) continue;
        // the nominal index, or the actual one in the row you choose from (§8.2)
        const want = generalKit(content, run, node, r === row ? run.battles.length + 1 : NOMINAL[r]!);
        const got = await p.locator(`[data-node="${r}:${i}"] .node-kit [data-building]`)
          .evaluateAll((els) => els.map((e) => [(e as HTMLElement).dataset.building, Number((e as HTMLElement).dataset.level)]));
        expect(got, `node ${r}:${i}`).toEqual(want.kit.map((id) => [id, want.upgrades[id] ?? 0]));
        nodes++;
      }
    }
    expect(nodes).toBeGreaterThanOrEqual(6);
    expect(await p.locator('.route-node.boss .node-note').textContent()).toContain('intel');
    expect(await p.locator('.node-bosslives').count()).toBe(0);
    expect(await clipped(p)).toEqual([]);
  });

  it('shows the bosslives bonus on the boss node when the knob is on', async () => {
    const p = await open('/?scene=route&seed=4&autoplay=battles:2&test=1&proto=bosslives');
    const lives = await p.evaluate(() => window.__GAME__!.run()!.lives);
    expect(await p.locator('.route-node.boss .node-bosslives').textContent()).toContain(`+${250 * lives.left}`);
  });
});

describe('lives in battle', () => {
  it('a run battle lights a cap per Regrowth left under your Heartcap; a single battle shows none', async () => {
    const run = createRun(content, { seed: 9 });
    chooseNode(content, run, 0);
    run.lives.left = 2;
    const p = await open('/?scene=run&debug=1', { run });
    expect(await p.locator('#hud-hp-player #hud-lives .cap').count()).toBe(3);
    expect(await p.locator('#hud-lives .cap.lit').count()).toBe(2);
    expect(await p.locator('#hud-lives').getAttribute('title')).toContain('lives');
    await p.close();
    const single = await open('/?scene=battle&seed=1&test=1&phase=planning');
    expect(await single.locator('#hud-lives').count()).toBe(0);
  });

  it("scene=run opens the run's battle at a round and phase, with Node's hash there (T157)", async () => {
    const query = 'scene=run&seed=7&player=bot:balanced&round=2&phase=planning';
    const p = await open(`/?${query}&test=1`);
    const got = await p.evaluate(() => ({ round: window.__GAME__!.round, phase: window.__GAME__!.phase, hash: window.__GAME__!.hash }));
    expect(got).toEqual({ round: 2, phase: 'planning', hash: hashState(runForParams(content, new URLSearchParams(query)).battle!) });
    expect(await p.locator('#hud-lives .cap.lit').count()).toBe(3);
  });

  it("times the run's battles on the run's one clock (T109)", async () => {
    const p = await open('/?scene=run&seed=7&player=bot:balanced&round=1&phase=planning&test=1');
    for (let i = 0; i < 4; i++) {
      await p.mouse.move(100 + 40 * i, 200);
      await p.waitForTimeout(300);
    }
    const t = (await p.evaluate(() => window.__GAME__!.playTime()))!;
    expect(t.planning.map((x) => x.round)).toEqual([1]);
    expect(t.planning[0]!.seconds).toBeGreaterThan(0.5);
    expect(t.minutes).toBeGreaterThan(0);
  });
});

describe('spoils, events and the Grove', () => {
  it('spoils show 1–3 keycaps and take the keys', async () => {
    const run = mid();
    run.screen = { kind: 'spoils', picks: [{ label: 'Spoils', battleIndex: 2, freeRerolls: 0, cards: 3, rareBonus: 0, relicsOnly: false,
      offer: [{ id: 'bp:hammercapForge', type: 'blueprint', rarity: 'uncommon' }, { id: 'up:gillNest', type: 'upgrade', rarity: 'common' }, { id: 'relic:martyrsBloom', type: 'relic', rarity: 'rare' }] }] };
    const p = await open('/?scene=run&debug=1', { run });
    expect(await p.locator('#spoils-cards .draft-key').allTextContents()).toEqual(['1', '2', '3']);
    expect(await p.locator('#spoils-cards .draft-card.blueprint .draft-chips').textContent()).toContain('170');
    expect(await p.locator('#spoils-cards .draft-card.rare .sparkle').count()).toBe(2);
    expect(await clipped(p)).toEqual([]);
    await p.keyboard.press('3');
    await p.waitForFunction(() => window.__GAME__!.run()?.screen !== 'spoils');
    expect(await p.evaluate((k) => JSON.parse(localStorage.getItem(k)!).relics, RUN_KEY)).toContain('martyrsBloom');
  });

  it('an event shows its scene and outcome chips, with a real minus for costs', async () => {
    const run = mid();
    run.screen = { kind: 'event', event: 'fallen-oak' };
    const p = await open('/?scene=run&debug=1', { run });
    expect(await p.locator('#event .vignette canvas.scene').count()).toBe(1);
    const chips = await p.locator('#event .choice').first().locator('.outcome').allTextContents();
    expect(chips).toEqual(['+1 rare relic', '−15% max Heartcap, every battle']);
    expect(await p.locator('#event .choice').first().locator('.outcome.cost').count()).toBe(1);
    expect(await clipped(p)).toEqual([]);
  });

  it('the Grove offers three choices: a Regrowth unlit at full lives, Graft disabled once every track is maxed, and Leave', async () => {
    const run = createRun(content, { seed: 9 });
    for (const id of run.kit) run.upgrades[id] = content.upgrades[id]!.levels.length;
    run.screen = { kind: 'grove' };
    const p = await open('/?scene=run&debug=1', { run });
    const choices = p.locator('#grove .choice');
    expect(await choices.count()).toBe(3);
    expect(await choices.nth(0).isDisabled()).toBe(true);
    expect(await choices.nth(0).textContent()).toContain('Regrowths are full');
    expect(await choices.nth(1).isDisabled()).toBe(true);
    expect(await choices.nth(1).textContent()).toContain('last level');
    expect(await choices.nth(2).isDisabled()).toBe(false);
    await choices.nth(2).click();
    await p.waitForFunction(() => window.__GAME__!.run()?.screen === 'route');
    // the save that Leave wrote holds no play time (§8.2, A185)
    const save = (await p.evaluate((k) => localStorage.getItem(k), RUN_KEY))!;
    expect(JSON.parse(save).screen.kind).toBe('route');
    expect(save).not.toMatch(/"(play[A-Z]\w*|planning\w*|minutes|seconds|clock)":/);
  });

  it('the Grove regains a Regrowth when one is lost', async () => {
    const run = createRun(content, { seed: 9 });
    run.lives.left = 2;
    run.screen = { kind: 'grove' };
    const p = await open('/?scene=run&debug=1', { run });
    expect(await p.locator('#run-regrowths').textContent()).toBe('2/3');
    await p.locator('#grove .choice').nth(0).click();
    await p.waitForFunction(() => window.__GAME__!.run()?.screen === 'route');
    expect(await p.evaluate(() => window.__GAME__!.run()!.lives)).toEqual({ left: 3, max: 3 });
  });
});

describe('the summary', () => {
  it("gives each battle's outcome, Regrowths lost and round sparkline, the kit at run end and the play time", async () => {
    const p = await open('/?scene=summary&seed=7&autoplay=run&test=1');
    const run = ended();
    expect(await p.evaluate(() => window.__GAME__!.hash)).toBe(hashRun(run));
    const heads = await p.locator('#summary-battles th').allTextContents();
    expect(heads).toEqual(['#', 'Node', 'Map', 'General', 'Result', 'Rounds', 'Regrowths', 'Countered']);
    for (const gone of ['Length', 'Heartcap', 'Front line']) expect(heads).not.toContain(gone);
    expect(await p.locator('#summary-battles .result').allTextContents()).toEqual(run.battles.map(outcome));
    expect(await p.locator('#summary-battles .lives').allTextContents()).toEqual(run.battles.map((b) => (b.lifeLost ? '−1' : '-')));
    // one sparkline a battle: each round's damage dealt rising and taken hanging
    expect(await p.locator('#summary-battles .sparkline').count()).toBe(run.battles.length);
    for (const [i, b] of run.battles.entries()) {
      const spark = p.locator('#summary-battles .summary-battle').nth(i).locator('.sparkline');
      expect(await spark.locator('.dealt').count()).toBe(b.rounds.length);
      expect(await spark.locator('.taken').count()).toBe(b.rounds.length);
    }
    expect(await p.locator('#summary-kit [data-building]').evaluateAll((els) => els.map((e) => (e as HTMLElement).dataset.building))).toEqual(run.kit);
    // autoplay played the run before the page's clock started (T109)
    expect(await p.locator('#summary-playtime').textContent()).toMatch(/^Play time: /);
    expect(await p.locator('#run-it-back').count()).toBe(1);
  });

  it('renders a battle migrated from before R2, which has no rounds', async () => {
    const run = structuredClone(ended());
    run.battles[0]!.rounds = [];
    delete run.battles[0]!.heartcaps;
    const p = await open('/?scene=run&debug=1', { run });
    await p.waitForSelector('#summary');
    const first = p.locator('#summary-battles .summary-battle').first();
    expect(await first.locator('.result').textContent()).toBe(outcome(run.battles[0]!));
    expect(await first.locator('.sparkline').count()).toBe(0);
    expect(await p.locator('#summary-battles .sparkline').count()).toBe(run.battles.length - 1);
  });
});

describe('fit at small windows', () => {
  for (const [w, hgt] of [[1280, 720], [1366, 650]] as const) {
    it(`no run screen clips at ${w}×${hgt}`, async () => {
      for (const q of ['/?test=1', '/?scene=route&seed=4&autoplay=battles:2&test=1', '/?scene=summary&seed=7&autoplay=run&test=1']) {
        const p = await open(q, { width: w, height: hgt });
        expect(await clipped(p), q).toEqual([]);
        await p.close();
        page = undefined;
      }
    });
  }

  // a commander power adds the Q row to Keys (it overflowed until 2026-10-31), and a battle in rounds always has one
  for (const [label, query] of [
    ['a battle with Vesper\'s Spore Burst', '/?scene=battle&map=test-flat&seed=1&test=1&phase=planning'],
    ['a battle with Armilla\'s Rhizome Tithe', '/?scene=battle&seed=1&test=1&commander=armilla&phase=planning'],
  ] as const) it(`Help fits at 1280×720 with no key cell over two lines: ${label}`, async () => {
    const p = await open(query);
    await p.locator('#help-btn').click();
    for (const tab of ['matrix', 'merging', 'general', 'economy', 'storm', 'keys']) {
      await p.locator(`#help-tab-${tab}`).click();
      const fit = await p.evaluate(() => {
        const card = document.getElementById('help')!.getBoundingClientRect();
        const panel = document.querySelector<HTMLElement>('.help-panel:not([hidden])')!;
        return { bottom: card.bottom, overflow: panel.scrollHeight - panel.clientHeight };
      });
      expect(fit.bottom, tab).toBeLessThanOrEqual(720);
      expect(fit.overflow, tab).toBeLessThanOrEqual(0);
    }
    const cells = await p.locator('#help-keys .caps').evaluateAll((caps) => caps.map((c) => c.getBoundingClientRect().height));
    for (const hgt of cells) expect(hgt).toBeLessThan(40);
  });
});
