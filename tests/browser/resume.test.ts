import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { chromium } from 'playwright';
import type { Browser, Page } from 'playwright';
import { createServer } from 'vite';
import type { ViteDevServer } from 'vite';
import { BATTLE_KEY, RUN_KEY, battleSave, chooseNode, createRun, finishBattle, runPool } from '../../src/run/index.ts';
import type { BattleSave, RunState } from '../../src/run/index.ts';
import { createBattle, step } from '../../src/sim/index.ts';
import type { BattleState } from '../../src/sim/index.ts';
import { nodeContent } from '../../tools/lib/content.ts';
import { command, playOn } from '../helpers.ts';

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

/** Opens the saved run, and its battle save unless it's null, on the tab's first load only, so a reload finds what the page saved. */
async function openSavedRun(run: string, battle: string | null): Promise<void> {
  await page.addInitScript(({ runKey, battleKey, runText, battleText }) => {
    if (sessionStorage.getItem('seeded')) return;
    sessionStorage.setItem('seeded', '1');
    localStorage.setItem(runKey, runText);
    if (battleText !== null) localStorage.setItem(battleKey, battleText);
  }, { runKey: RUN_KEY, battleKey: BATTLE_KEY, runText: run, battleText: battle });
  // No seed or test flag: use the same persistent resume path as normal play (scene=run skips the title).
  await page.goto(`${base}/?scene=run&debug=1`);
  await ready();
}

async function ready(): Promise<void> {
  await page.waitForFunction(() => window.__GAME__?.ready === true);
  await page.evaluate(() => document.fonts.ready.then(() => true)); // layout settles once the fonts swap in
}

const stored = <T>(key: string): Promise<T | null> => page.evaluate((k) => JSON.parse(localStorage.getItem(k) ?? 'null') as T | null, key);

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
    // the old save is gone: the key holds the restarted battle's own, at round 1's planning (T096)
    expect(await stored(BATTLE_KEY)).toMatchObject({ v: 3, round: 1, phase: 'planning', commands: [] });
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
    expect(await stored(BATTLE_KEY)).toMatchObject({ v: 3, round: 1, phase: 'planning' });
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

// R2b/T093: a run's battle saves between rounds and resumes there (§8.9, §15.6); its end is the run's node
// boundary, recorded before the report (A081, R2-Q22)
describe('battle saves between rounds', () => {
  const content = nodeContent();

  /** A run at its first node of `kind` (its first battle by default), as the page saves it. */
  function runAt(seed: number, kind: 'battle' | 'elite' = 'battle'): RunState {
    const run = createRun(content, { seed });
    const row = run.route.findIndex((r) => r.some((n) => n.kind === kind));
    run.path = Array.from({ length: row }, () => 0);
    chooseNode(content, run, run.route[row]!.findIndex((n) => n.kind === kind));
    return run;
  }

  const battleOf = (run: RunState): BattleState => {
    if (run.screen.kind !== 'battle') throw new Error('not in battle');
    return createBattle(content, run.screen.config);
  };

  /** A human who plants nothing (its draft skipped) and Begins, until `stop`: the general routs it in a few rounds. */
  function idle(s: BattleState, stop: (s: BattleState) => boolean = () => false): void {
    while (s.phase !== 'ended' && !stop(s)) {
      if (s.phase !== 'planning') step(s);
      else command(s, 'player', s.sides.player.draft ? { type: 'draftSkip' } : { type: 'beginClash' });
    }
  }

  const players = () => page.evaluate(() => window.__GAME__!.battle()!.buildings.filter((b) => b.side === 'player').map((b) => [b.buildingId, b.plot]));

  /** Begin, twice: the first press over an empty lane pins the warning instead (§10.2). */
  async function beginAnyway(): Promise<void> {
    await page.locator('#begin-btn').click();
    if (await page.evaluate(() => window.__GAME__!.phase === 'planning')) await page.locator('#begin-btn').click();
  }

  it('resumes a planning save with two plantings, with both and the same gold', async () => {
    await openSavedRun(JSON.stringify(runAt(9)), null);
    expect(await stored(BATTLE_KEY)).toMatchObject({ v: 3, round: 1, phase: 'planning', commands: [] });
    // two plants, queued as the session issues them; the planning step runs each, and the page saves after it
    const plots = await page.evaluate(() => {
      const s = window.__GAME__!.battle()!;
      const free = s.sides.player.plots.flatMap((p, i) => (p.open && p.terrain !== 'stump' ? [i] : []));
      const cards = s.sides.player.kit.map((k) => k.building).slice(0, 2);
      cards.forEach((buildingId, k) => s.queue.push({ round: s.round, tick: s.tick, side: 'player', seq: s.nextSeq.player++, type: 'plant', buildingId, plot: free[k]! }));
      return cards.length;
    });
    expect(plots).toBe(2);
    await page.waitForFunction(() => JSON.parse(localStorage.getItem('spore-sprawl.battle.v1') ?? '{}').commands?.length === 2);
    const planted = await players();
    expect(planted).toHaveLength(2);
    const gold = await page.evaluate(() => window.__GAME__!.battle()!.sides.player.gold);
    await page.reload();
    await ready();
    expect(await page.evaluate(() => [window.__GAME__!.phase, window.__GAME__!.round])).toEqual(['planning', 1]);
    expect(await players()).toEqual(planted);
    expect(await page.evaluate(() => window.__GAME__!.battle()!.sides.player.gold)).toBe(gold);
    expect(await page.locator('#save-recovery').count()).toBe(0);
    expect(await page.evaluate(() => window.__GAME__!.errors)).toEqual([]);
  });

  // R2b/T114: the draft sheet's commands go through the queue, so a reroll saves and resumes like any planning command
  it("resumes a draft reroll in round 3's planning, and runs it once", async () => {
    const run = runAt(9);
    const s = battleOf(run);
    // a human who plants nothing and Begins, to round 3's planning, where its first draft opens
    idle(s, (x) => x.round === 3 && x.phase === 'planning');
    expect(s.sides.player.draft).toBeDefined();
    await openSavedRun(JSON.stringify(run), JSON.stringify(battleSave(s)));
    expect(await page.evaluate(() => [window.__GAME__!.phase, window.__GAME__!.round])).toEqual(['planning', 3]);
    expect(await page.locator('#draft').isVisible()).toBe(true);
    const drafting = () => page.evaluate(() => {
      const p = window.__GAME__!.battle()!.sides.player;
      return { gold: p.gold, offer: p.draft?.offer.map((c) => c.id) ?? [], rerolls: p.draft?.rerolls ?? -1 };
    });
    const before = await drafting();
    await page.locator('#draft-reroll').click();
    await page.waitForFunction(() => (JSON.parse(localStorage.getItem('spore-sprawl.battle.v1') ?? '{}').commands ?? []).some((c: { type: string }) => c.type === 'draftReroll'));
    const after = await drafting();
    expect(after).toMatchObject({ rerolls: 1, gold: before.gold - 20 });
    await page.reload();
    await ready();
    // the save replays the reroll once: the same offer and gold, one reroll paid, and the sheet still open
    expect(await page.evaluate(() => [window.__GAME__!.phase, window.__GAME__!.round])).toEqual(['planning', 3]);
    expect(await drafting()).toEqual(after);
    expect((await stored<BattleSave>(BATTLE_KEY))!.commands.filter((c) => c.type === 'draftReroll')).toHaveLength(1);
    expect(await page.locator('#draft').isVisible()).toBe(true);
    expect(await page.locator('#save-recovery').count()).toBe(0);
    expect(await page.evaluate(() => window.__GAME__!.errors)).toEqual([]);
  });

  it("restarts a save whose hash doesn't match at round 1's planning, with the notice, and keeps the run", async () => {
    const run = runAt(9);
    const s = battleOf(run);
    playOn(s, (x) => x.round === 2);
    const bad: BattleSave = { ...battleSave(s)!, hash: 'not-this-battle' };
    await openSavedRun(JSON.stringify(run), JSON.stringify(bad));
    expect(await page.evaluate(() => [window.__GAME__!.phase, window.__GAME__!.round])).toEqual(['planning', 1]);
    expect(await page.locator('#save-recovery').textContent()).toContain("restarted from round 1's planning; your run progress is preserved");
    expect(await page.evaluate(() => window.__GAME__!.run())).toMatchObject({ screen: 'battle', row: run.path.length, lives: run.lives });
    expect(await stored<BattleSave>(BATTLE_KEY)).toMatchObject({ v: 3, round: 1, phase: 'planning', commands: [] });
    expect(await page.evaluate(() => window.__GAME__!.errors)).toEqual([]);
  });

  it('records the battle in the run before its report, and a reload on the report opens the next screen with its result', async () => {
    const run = runAt(9);
    const whole = battleOf(run);
    idle(whole);
    expect(whole.outcome).toMatchObject({ winner: 'enemy', by: 'rout' });
    const last = whole.outcome!.round;
    // saved at the planning of the round the general routs it in, any draft there skipped
    const s = battleOf(run);
    idle(s, (x) => x.round === last && x.phase === 'planning' && !x.sides.player.draft);
    await openSavedRun(JSON.stringify(run), JSON.stringify(battleSave(s)));
    expect(await page.evaluate(() => [window.__GAME__!.phase, window.__GAME__!.round])).toEqual(['planning', last]);
    expect(await page.locator('#save-recovery').count()).toBe(0);
    await beginAnyway();
    await page.locator('#report').waitFor({ timeout: 60000 });
    // the run has moved on before the report shows: a Regrowth lost, the battle recorded, its save cleared
    const saved = (await stored<RunState & { reportOpen?: boolean }>(RUN_KEY))!;
    expect(saved).toMatchObject({ screen: { kind: 'route' }, lives: { left: 2, max: 3 }, reportOpen: true });
    expect(saved.battles).toHaveLength(1);
    expect(await stored(BATTLE_KEY)).toBeNull();
    expect(await page.locator('#report-run').textContent()).toBe('You lose a Regrowth: 2 of 3 left.');
    await page.reload();
    await ready();
    expect(await page.evaluate(() => window.__GAME__!.run()!.screen)).toBe('route');
    expect(await page.locator('#report').count()).toBe(0);
    expect(await page.locator('#report-recovery').textContent()).toBe(`Lost by Rout in round ${last} · a Regrowth lost, 2 of 3 left`);
    expect((await stored<{ reportOpen?: boolean }>(RUN_KEY))!.reportOpen).toBeUndefined();
    expect(await page.evaluate(() => window.__GAME__!.errors)).toEqual([]);
  });

  it("shows on the report the Amber the battle's end rolled, as the run has it", async () => {
    // an elite whose win rolls its 25% chance of +1 Amber, as Node rolls it on the same run
    const seed = [...Array(40).keys()].map((i) => i + 1).find((x) => {
      const run = runAt(x, 'elite');
      const state = battleOf(run);
      state.phase = 'ended';
      state.outcome = { winner: 'player', by: 'rout', round: 1 };
      return finishBattle(content, run, state).amber === 1;
    })!;
    const run = runAt(seed, 'elite');
    await openSavedRun(JSON.stringify(run), null);
    await beginAnyway();
    await page.waitForFunction(() => window.__GAME__!.phase === 'aftermath', null, { timeout: 60000 });
    // a staged win: the aftermath's step ends the battle with it
    await page.evaluate(() => { const b = window.__GAME__!.battle()!; b.outcome = { winner: 'player', by: 'rout', round: b.round }; });
    await page.locator('#report').waitFor({ timeout: 30000 });
    const saved = (await stored<RunState>(RUN_KEY))!;
    expect(saved.amber).toBe(run.amber + 1);
    expect(saved.battles.at(-1)!.amber).toBe(1);
    expect(await page.locator('#report .banner-meta').textContent()).toContain(`+${saved.battles.at(-1)!.spores} Spores · +1 Amber`);
    expect(await page.evaluate(() => window.__GAME__!.errors)).toEqual([]);
  });
});
