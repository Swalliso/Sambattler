import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { chromium } from 'playwright';
import type { Browser, Page } from 'playwright';
import { createServer } from 'vite';
import type { ViteDevServer } from 'vite';
import { BATTLE_KEY, RUN_KEY, battleSave, chooseNode, createRun, runPool } from '../../src/run/index.ts';
import { createBattle, queueCommand, runHeadless, step, summarize } from '../../src/sim/index.ts';
import { nodeContent } from '../../tools/lib/content.ts';

let server: ViteDevServer | undefined;
let browser: Browser | undefined;
let page: Page;
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

beforeEach(async () => {
  // persisted runs need debug=1, not test=1; reduced motion makes screen changes instant (no spore wipe)
  page = await browser!.newPage({ viewport: { width: 1280, height: 720 }, reducedMotion: 'reduce' });
});

afterEach(async () => {
  await page?.close();
});

function checkpointWithPendingReroll() {
  const content = nodeContent();
  const run = createRun(content, { seed: 9 });
  chooseNode(content, run, 0);
  if (run.screen.kind !== 'battle') throw new Error('expected the first route node to be a battle');
  const state = createBattle(content, run.screen.config);
  queueCommand(state, { tick: 0, side: 'player', type: 'begin' });
  runHeadless(state, { until: 2400 });
  expect(state.held).toBe(true);
  queueCommand(state, { tick: state.tick + 1, side: 'player', type: 'draftReroll' });
  return { run, state, checkpoint: battleSave(state) };
}

async function openSavedRun(run: string, battle: string): Promise<void> {
  await page.addInitScript(({ runKey, battleKey, runText, battleText }) => {
    localStorage.setItem(runKey, runText);
    localStorage.setItem(battleKey, battleText);
  }, { runKey: RUN_KEY, battleKey: BATTLE_KEY, runText: run, battleText: battle });
  // No seed or test flag: use the same persistent resume path as normal play (scene=run skips the title).
  await page.goto(`${base}/?scene=run&debug=1`);
  await page.waitForFunction(() => window.__GAME__?.ready === true);
  await page.evaluate(() => document.fonts.ready.then(() => true)); // layout settles once the fonts swap in
}

describe('saved run recovery', () => {
  it('resumes a pending draft reroll and executes it once on the first browser frame', async () => {
    const { run, state, checkpoint } = checkpointWithPendingReroll();
    const savedRun = JSON.stringify(run);
    const savedBattle = JSON.stringify(checkpoint);
    step(state);
    expect(state.tick).toBe(2400);
    expect(state.held).toBe(true);
    expect(state.sides.player.draft?.rerolls).toBe(1);
    const expected = summarize(state);

    await openSavedRun(savedRun, savedBattle);
    expect(await page.evaluate(() => window.__GAME__!.summary())).toEqual(expected);
    expect(await page.locator('#draft').isVisible()).toBe(true);
    expect(await page.locator('#draft-cards .draft-card').evaluateAll((cards) => cards.map((card) => (card as HTMLElement).dataset.card)))
      .toEqual(state.sides.player.draft!.offer.map((card) => card.id));
    expect(await page.locator('#save-recovery').count()).toBe(0);
    expect(await page.evaluate((key) => localStorage.getItem(key), RUN_KEY)).toBe(savedRun);
    expect(await page.evaluate((key) => localStorage.getItem(key), BATTLE_KEY)).toBe(savedBattle);
    expect(await page.evaluate(() => window.__GAME__!.errors)).toEqual([]);
  });

  it('clears an invalid checkpoint, explains the restart and preserves the saved run', async () => {
    const { run, checkpoint } = checkpointWithPendingReroll();
    const savedRun = JSON.stringify(run);
    await openSavedRun(savedRun, JSON.stringify({ ...checkpoint, hash: 'invalid-checkpoint-hash' }));

    const summary = await page.evaluate(() => window.__GAME__!.summary());
    expect(summary?.phase).toBe('deploy');
    expect(summary?.tick).toBe(0);
    expect(await page.locator('#save-recovery').isVisible()).toBe(true);
    expect(await page.locator('#save-recovery').getAttribute('role')).toBe('status');
    expect(await page.locator('#save-recovery').textContent()).toContain('your run progress is preserved');
    expect(await page.evaluate((key) => localStorage.getItem(key), BATTLE_KEY)).toBeNull();
    expect(await page.evaluate((key) => localStorage.getItem(key), RUN_KEY)).toBe(savedRun);
    expect(await page.evaluate(() => window.__GAME__!.run())).toMatchObject({
      screen: 'battle', row: run.path.length, heartcap: run.heartcap,
    });
    expect(await page.evaluate(() => window.__GAME__!.errors)).toEqual([]);
  });

  it('recovers a legacy Merchant prompt, explains the shortfall and lets the run continue', async () => {
    const run = createRun(nodeContent(), { seed: 9 });
    run.path = [0, 1];
    run.spores = 60;
    run.upgrades = { sporelingBurrow: 2, capguardHall: 3, truffleCellar: 3 };
    run.pending = [{ upgrade: { count: 2, pick: 'choose' } }];
    run.screen = { kind: 'prompt', prompt: {
      title: 'Spore Merchant', text: 'Choose an upgrade track for +1 level.',
      optionKind: 'upgrade', options: ['sporelingBurrow'], remaining: 2,
    } };
    await openSavedRun(JSON.stringify(run), 'null');
    expect(await page.locator('#reward-recovery').isVisible()).toBe(true);
    expect(await page.locator('#reward-recovery').textContent()).toContain('only 1 of its 2 remaining levels');
    const migrated = await page.evaluate((key) => JSON.parse(localStorage.getItem(key)!), RUN_KEY);
    expect(migrated.screen.prompt.remaining).toBe(1);
    expect(migrated.rng).toEqual(run.rng);

    await page.locator('[data-option="sporelingBurrow"]').click();
    await page.waitForFunction(() => window.__GAME__?.run()?.screen === 'route');
    const finished = await page.evaluate((key) => JSON.parse(localStorage.getItem(key)!), RUN_KEY);
    expect(finished.upgrades.sporelingBurrow).toBe(3);
    expect(finished.pending).toEqual([]);
    expect(finished.path).toEqual(run.path);
    expect(finished.spores).toBe(60);
    expect(finished.rng).toEqual(run.rng);
    expect(await page.locator('#reward-recovery').count()).toBe(0);
    expect(await page.evaluate(() => window.__GAME__!.errors)).toEqual([]);
  });

  it.each(['spore-merchant', 'hungry-roots'])('returns an impossible legacy %s sacrifice to its event without charging an item', async (event) => {
    const content = nodeContent();
    const run = createRun(content, { seed: 9 });
    run.path = [0, 1];
    run.route[1]![1] = { kind: 'event', event };
    run.spores = 60;
    run.kit.push('gillNest');
    run.upgrades = { sporelingBurrow: 3, capguardHall: 3, truffleCellar: 3, gillNest: 1 };
    if (event === 'hungry-roots') run.relics = [...runPool(content, run).relics];
    run.pending = structuredClone(content.events[event]!.choices[0]!.outcome);
    run.screen = { kind: 'prompt', prompt: {
      title: content.events[event]!.title, text: 'Choose an item to give up.', remaining: 1,
      optionKind: event === 'spore-merchant' ? 'blueprint' : 'relic',
      options: event === 'spore-merchant' ? ['gillNest'] : [...run.relics],
    } };
    await openSavedRun(JSON.stringify(run), 'null');
    expect(await page.locator('#event').isVisible()).toBe(true);
    expect(await page.locator('#reward-recovery').textContent()).toContain('No items were spent');
    expect(await page.locator('#event .choice').first().isDisabled()).toBe(true);
    const migrated = await page.evaluate((key) => JSON.parse(localStorage.getItem(key)!), RUN_KEY);
    expect(migrated.screen).toEqual({ kind: 'event', event });
    expect(migrated.pending).toEqual([]);
    expect(migrated.kit).toEqual(run.kit);
    expect(migrated.relics).toEqual(run.relics);
    expect(migrated.path).toEqual(run.path);
    expect(migrated.spores).toBe(60);
    expect(migrated.rng).toEqual(run.rng);
    await page.locator('#event .choice').nth(1).click();
    await page.waitForFunction(() => window.__GAME__?.run()?.screen === 'route');
    expect(await page.locator('#reward-recovery').count()).toBe(0);
    expect(await page.evaluate(() => window.__GAME__!.errors)).toEqual([]);
  });
});
