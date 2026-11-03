import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { chromium } from 'playwright';
import type { Browser, Page } from 'playwright';
import { createServer } from 'vite';
import type { ViteDevServer } from 'vite';
import { BATTLE_KEY, RUN_KEY, createRun, runPool } from '../../src/run/index.ts';
import { nodeContent } from '../../tools/lib/content.ts';

/** A save from before R2 (R2b/T006): its records as the browser wrote them. */
const v1Save = (file: string): string => readFileSync(join(import.meta.dirname, '..', 'fixtures', 'saves', 'v1', file), 'utf8');

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
  // a run saved before R2, mid-battle (§16 R2 verification 6, §8.9, #32): the run migrates, and its v1 battle can't be
  // restored, so the battle restarts at round 1's planning with the notice
  it('opens a v1 battle save at round 1\'s planning, with the restart notice, the run migrated and the battle key cleared', async () => {
    const savedRun = v1Save('run-battle.json');
    const v1 = JSON.parse(savedRun) as { path: number[]; kit: string[] };
    await openSavedRun(savedRun, v1Save('battle-v2.json'));

    expect(await page.evaluate(() => [window.__GAME__!.phase, window.__GAME__!.round])).toEqual(['planning', 1]);
    expect(await page.locator('#save-recovery').isVisible()).toBe(true);
    expect(await page.locator('#save-recovery').getAttribute('role')).toBe('status');
    expect(await page.locator('#save-recovery').textContent()).toContain("restarted from round 1's planning; your run progress is preserved");
    expect(await page.locator('#run-notice').textContent()).toContain('saved before battles in rounds');
    expect(await page.evaluate((key) => localStorage.getItem(key), BATTLE_KEY)).toBeNull();
    expect(await page.evaluate(() => window.__GAME__!.run())).toMatchObject({
      screen: 'battle', row: v1.path.length, kit: v1.kit, lives: { left: 3, max: 3 },
    });
    expect(await page.evaluate(() => window.__GAME__!.battle()!.sides.player.kit.map((c) => c.building))).toEqual(v1.kit);
    expect(await page.evaluate(() => window.__GAME__!.errors)).toEqual([]);
  });

  it('opens a legacy battle save (no version) the same way', async () => {
    await openSavedRun(v1Save('run-battle.json'), v1Save('battle-legacy.json'));
    expect(await page.evaluate(() => [window.__GAME__!.phase, window.__GAME__!.round])).toEqual(['planning', 1]);
    expect(await page.locator('#save-recovery').isVisible()).toBe(true);
    expect(await page.evaluate((key) => localStorage.getItem(key), BATTLE_KEY)).toBeNull();
    expect(await page.evaluate(() => window.__GAME__!.errors)).toEqual([]);
  });

  it('recovers a legacy Merchant prompt, explains the shortfall and lets the run continue', async () => {
    const run = createRun(nodeContent(), { seed: 9 });
    run.path = [0, 1];
    run.spores = 60;
    // the Burrow's level 3 isn't offered (#27), so at level 1 it has one level left
    run.upgrades = { sporelingBurrow: 1, capguardHall: 3, truffleCellar: 3 };
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
    expect(finished.upgrades.sporelingBurrow).toBe(2);
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
