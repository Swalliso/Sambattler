// Runs saved before R2 (SPEC §8.9, §13.8, §18.2 #32, §16 R2 verification 6): each v1 record from
// `tests/fixtures/saves/v1/` loads migrated, never null, keeping the run and turning v1's run-long Heartcap into
// lives. An unreadable record says so and is never replaced by a fresh run.
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  MemoryStorage, RUN_KEY, battleConfig, createRun, currentRow, loadRun, migrateRun, nodeAt, promptAnswer, saveRun,
} from '../../src/run/index.ts';
import type { RunState } from '../../src/run/index.ts';
import { content } from '../helpers.ts';

const DIR = join(import.meta.dirname, '..', 'fixtures', 'saves', 'v1');
const raw = (file: string): string => readFileSync(join(DIR, file), 'utf8');
// v1's fields, read loosely: the fixtures are v1's records, not today's types
type Loose = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
const v1 = (file: string): Loose => JSON.parse(raw(file)) as Loose;
const RUNS = readdirSync(DIR).filter((f) => f.startsWith('run-')).sort();

/** The migrated run of a fixture, which must load. */
function migrated(file: string): RunState {
  const r = migrateRun(content, raw(file));
  if (r.kind !== 'run') throw new Error(`${file}: ${r.notice}`);
  return r.run;
}

describe('a run saved before R2 migrates (§8.9, #32)', () => {
  it('has a fixture per screen, and after Fallen Oak, a Decision loss and Mold Bloom', () => {
    const screens = RUNS.map((f) => v1(f).screen.kind);
    for (const s of ['route', 'battle', 'spoils', 'event', 'grove', 'prompt', 'summary']) expect(screens).toContain(s);
    expect(RUNS).toEqual(expect.arrayContaining(['run-fallen-oak.json', 'run-decision-loss.json', 'run-mold-bloom.json']));
    for (const f of RUNS) expect(v1(f).v, f).toBe(1);
  });

  it.each(RUNS)('%s loads migrated, keeping the run, with lives in place of the Heartcap', (file) => {
    const old = v1(file);
    const r = migrateRun(content, raw(file));
    expect(r.kind).toBe('run');
    if (r.kind !== 'run') return;
    expect(r.notice).toMatch(/saved before battles in rounds/);
    const run = r.run;
    expect(run.v).toBe(2);
    const kept = [
      'seed', 'commander', 'bans', 'faction', 'player', 'autoDraft', 'flags', 'route', 'path', 'kit', 'upgrades', 'relics',
      'cards', 'spores', 'amber', 'xp', 'intelHalvings', 'intel', 'profiles', 'rng', 'outcome',
    ] as const;
    for (const k of kept) expect(run[k], k).toEqual(old[k]);
    expect(run).not.toHaveProperty('heartcap');
    const lost = old.battles.filter((b: Loose) => b.winner === 'enemy').length;
    const won = old.battles.length - lost;
    expect(run.lives).toEqual({ left: Math.max(1, 3 - lost), max: 3 });
    expect(run.plotsGained).toBe(Math.min(4, won));
    expect(run.heartcapMaxPct).toBeCloseTo(old.heartcap.max / content.balance.heartcapPlayerHp - 1, 9);
    expect(run.next).toEqual({ startingGold: old.next.startingGold, sporestormShiftRounds: old.next.sporestormShiftSeconds / 60, heartcapMaxHpPct: 0 });
    run.battles.forEach((b, i) => {
      expect(b.rounds).toEqual([]);
      expect(b.lifeLost).toBe(old.battles[i].winner === 'enemy');
      for (const gone of ['durationTicks', 'front', 'mapWidth', 'heartcapBefore', 'heartcapAfter']) expect(b).not.toHaveProperty(gone);
      for (const k of ['index', 'row', 'kind', 'map', 'general', 'winner', 'by', 'finalHash', 'damageByBuilding', 'drafted', 'spores'] as const) {
        expect(b[k], `battle ${i + 1} ${k}`).toEqual(old.battles[i][k]);
      }
    });
    // a migrated run saves as v2, which passes through unchanged
    expect(migrateRun(content, JSON.stringify(run))).toEqual({ kind: 'run', run });
  });

  it("keeps each screen: the spoils' offer, the event, the Grove and the prompt with its pending upgrade", () => {
    for (const f of ['run-spoils.json', 'run-event.json', 'run-grove.json', 'run-prompt.json', 'run-summary.json', 'run-route.json']) {
      expect(migrated(f).screen, f).toEqual(v1(f).screen);
    }
    expect(migrated('run-prompt.json').pending).toEqual(v1('run-prompt.json').pending);
    expect(migrated('run-spoils.json').screen).toMatchObject({ kind: 'spoils', picks: [{ offer: expect.arrayContaining([expect.objectContaining({ id: expect.stringMatching(/^up:/) })]) }] });
  });

  it("Fallen Oak's lower max becomes heartcapMaxPct −0.15; a Decision loss costs a life; Mold Bloom's −60 s is −1 round", () => {
    expect(migrated('run-fallen-oak.json').heartcapMaxPct).toBe(-0.15);
    const loss = migrated('run-decision-loss.json');
    expect(loss.lives).toEqual({ left: 2, max: 3 });
    expect(loss.battles.map((b) => b.lifeLost)).toEqual([false, true]);
    expect(loss.plotsGained).toBe(1);
    expect(migrated('run-mold-bloom.json').next).toEqual({ startingGold: 150, sporestormShiftRounds: -1, heartcapMaxHpPct: 0 });
    const won = migrated('run-summary.json');
    expect([won.outcome, won.lives.left, won.plotsGained]).toEqual(['victory', 3, 4]);
  });

  it("a v1 counter record's round is floor(activeAt / 1200) + 1", () => {
    const old = v1('run-summary.json');
    const run = migrated('run-summary.json');
    const counters = run.battles.flatMap((b) => b.counters ?? []);
    expect(counters.length).toBeGreaterThan(0);
    run.battles.forEach((b, i) => {
      expect(b.counters ?? []).toEqual((old.battles[i].counters ?? []).map((c: Loose) => ({
        kind: c.kind, round: Math.floor(c.activeAt / 1200) + 1, ...(c.drafted ? { drafted: c.drafted } : {}), sold: c.sold, built: c.built,
      })));
    });
  });

  it("a battle screen's v1 config is rebuilt by battleConfig from its route node, in rounds", () => {
    const run = migrated('run-battle.json');
    if (run.screen.kind !== 'battle') throw new Error('expected the battle screen');
    const row = currentRow(run) - 1;
    expect(run.screen.config).toEqual(battleConfig(content, run, nodeAt(run, row, run.path[row]!)!));
    expect(run.screen.config.player).not.toHaveProperty('heartcapHp');
    expect(run.screen.config.player.heartcapMaxHp).toBe(content.balance.heartcapPlayerHp);
    expect(run.screen.config.player.kit).toEqual(v1('run-battle.json').kit.map((building: string) => ({ building })));
  });

  it('a pending Quiet Clearing Rest becomes the next battle\'s +15% max HP, and a storm shift in seconds one in rounds', () => {
    const old = v1('run-prompt.json');
    old.pending = [...old.pending, { repairPct: 0.15 }, { nextBattle: { sporestormShiftSeconds: -60, startingGold: 150 } }];
    const r = migrateRun(content, JSON.stringify(old));
    if (r.kind !== 'run') throw new Error(r.notice);
    expect(r.run.pending.slice(1)).toEqual([{ nextBattle: { heartcapMaxHpPct: 0.15 } }, { nextBattle: { sporestormShiftRounds: -1, startingGold: 150 } }]);
    const run = r.run;
    if (run.screen.kind !== 'prompt') throw new Error('expected the prompt');
    promptAnswer(content, run, run.screen.prompt.options[0]!);
    expect(run.next).toEqual({ startingGold: 150, sporestormShiftRounds: -1, heartcapMaxHpPct: 0.15 });
  });

  it('corrupt JSON, an unknown version and a broken v1 record are unreadable, with a notice', () => {
    const broken = v1('run-battle.json');
    broken.path = [9];
    for (const text of ['{"v":1,', 'null', '[]', JSON.stringify({ ...v1('run-route.json'), v: 99 }), JSON.stringify({ v: 'x' }), JSON.stringify(broken)]) {
      const r = migrateRun(content, text);
      expect(r, text.slice(0, 40)).toEqual({ kind: 'unreadable', notice: expect.stringMatching(/could not be read/) });
    }
  });

  it('a v2 record passes through unchanged, with no notice', () => {
    const run = createRun(content, { seed: 4 });
    expect(migrateRun(content, JSON.stringify(run))).toEqual({ kind: 'run', run });
  });
});

describe('loadRun tells no save from an unreadable one (§8.9, §13.8, A084)', () => {
  it('none, a v2 run, a migrated v1 run with its notice, and an unreadable save, under the same key', () => {
    const storage = new MemoryStorage();
    expect(loadRun(storage, content)).toEqual({ kind: 'none' });
    const run = createRun(content, { seed: 4 });
    saveRun(storage, run);
    expect(loadRun(storage, content)).toEqual({ kind: 'run', run });
    storage.set(RUN_KEY, raw('run-decision-loss.json'));
    expect(loadRun(storage, content)).toMatchObject({ kind: 'run', run: { v: 2, lives: { left: 2 } }, notice: expect.any(String) });
    storage.set(RUN_KEY, 'not json');
    expect(loadRun(storage, content)).toMatchObject({ kind: 'unreadable' });
    expect(storage.get(RUN_KEY)).toBe('not json');
    expect(RUN_KEY).toBe('spore-sprawl.run.v1');
  });
});
