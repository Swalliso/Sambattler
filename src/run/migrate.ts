// Reading a saved run (SPEC §8.9, §13.8, §18.2 #32): a pure function of the record's text, chained by
// version, so a save never changes key and is never lost silently. v1 (before R2) → v2 turns the run-long
// Heartcap into lives and sprawl, and rebuilds a battle screen's config in rounds; R3 adds its own steps
// (R3-Q6). A record that can't be read is reported with a notice, never replaced by a fresh run.
import type { RunEffect } from '../data/schema.ts';
import type { Content } from '../sim/index.ts';
import { battleConfig, nodeAt } from './flow.ts';
import { RUN_VERSION, currentRow } from './runState.ts';
import type { BattleRecord, CounterRecordBrief, RunState } from './runState.ts';

export type LoadedRun = { kind: 'run'; run: RunState; notice?: string } | { kind: 'unreadable'; notice: string };

export const UNREADABLE_NOTICE = 'Your saved run could not be read, so it can\'t be continued. Starting a new run will replace it.';

// v1's fields, read loosely: a v1 record isn't today's type
type Loose = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any

/** The run a saved record holds, migrated to today's version, or why it can't be read. */
export function migrateRun(content: Content, raw: string): LoadedRun {
  try {
    const rec = JSON.parse(raw) as Loose | null;
    if (!rec || typeof rec !== 'object' || Array.isArray(rec)) return { kind: 'unreadable', notice: UNREADABLE_NOTICE };
    if (rec.v === RUN_VERSION) return { kind: 'run', run: rec as RunState };
    if (rec.v === 1) return fromV1(content, rec);
  } catch {
    // a record that isn't JSON, or a v1 record its field map can't read
  }
  return { kind: 'unreadable', notice: UNREADABLE_NOTICE };
}

/**
 * v1 → v2 (#32): lives = 3 − v1 battles lost, at least 1; plots by sprawl from battles won; Fallen Oak's lower
 * max as `heartcapMaxPct`; the next battle's storm shift in rounds, one a minute; v1 BattleRecords with no rounds.
 */
function fromV1(content: Content, v1: Loose): LoadedRun {
  const bal = content.balance;
  const battles = (v1.battles as Loose[]).map(battleFromV1);
  const lost = battles.filter((b) => b.lifeLost).length;
  const lives = bal.rounds.lives;
  const growth = bal.rounds.plotGrowth;
  const {
    v: _v, heartcap, next, battles: _battles, pending, screen, bans, ...kept
  } = v1;
  const run = {
    v: RUN_VERSION,
    ...kept,
    bans: bans ?? [], // saved before M5's bans
    plotsGained: Math.min(growth.max, growth.perWin * (battles.length - lost)),
    lives: { left: Math.max(1, lives - lost), max: lives },
    heartcapMaxPct: Math.round((heartcap.max / bal.heartcapPlayerHp - 1) * 10000) / 10000,
    battles,
    next: { startingGold: next.startingGold, sporestormShiftRounds: shiftRounds(next.sporestormShiftSeconds), heartcapMaxHpPct: 0 },
    pending: (pending as Loose[]).map(effectFromV1),
    screen: { kind: 'route' },
  } as unknown as RunState;
  if (screen.kind === 'battle') {
    const row = currentRow(run) - 1;
    const node = nodeAt(run, row, run.path[row]!);
    if (!node) throw new Error('the battle has no route node');
    run.screen = { kind: 'battle', config: battleConfig(content, run, node) };
  } else {
    run.screen = screen;
  }
  const plots = run.plotsGained;
  const notice = 'This run was saved before battles in rounds. It carries on in rounds with '
    + `${run.lives.left} of ${lives} Regrowths${lost ? `, one lost for each battle you lost` : ''}`
    + `${plots ? `, and ${plots} more plot${plots === 1 ? '' : 's'} for the battles you won` : ''}.`;
  return { kind: 'run', run, notice };
}

/** One a minute, as v1's seconds read rounds (§6.4). */
const shiftRounds = (seconds: number): number => Math.round((seconds ?? 0) / 60);

function battleFromV1(b: Loose): BattleRecord {
  const { durationTicks: _d, front: _f, mapWidth: _w, heartcapBefore: _hb, heartcapAfter: _ha, counters, ...kept } = b;
  return {
    ...(kept as Omit<BattleRecord, 'rounds' | 'lifeLost'>),
    rounds: [],
    lifeLost: b.winner === 'enemy',
    ...(counters ? { counters: (counters as Loose[]).map(counterFromV1) } : {}),
  };
}

/** v1's counters ran on a clock: its round is the minute it activated in (§7.4). */
const counterFromV1 = (c: Loose): CounterRecordBrief => ({
  kind: c.kind, round: Math.floor(c.activeAt / 1200) + 1, ...(c.drafted ? { drafted: c.drafted } : {}), sold: c.sold, built: c.built,
});

/** A pending Rest repairs nothing in v2: it's the next battle's max HP (§8.7). Seconds of storm become rounds. */
function effectFromV1(e: Loose): RunEffect {
  if ('repairPct' in e) return { nextBattle: { heartcapMaxHpPct: e.repairPct } };
  if ('nextBattle' in e && 'sporestormShiftSeconds' in e.nextBattle) {
    const { sporestormShiftSeconds, ...rest } = e.nextBattle;
    return { nextBattle: { sporestormShiftRounds: shiftRounds(sporestormShiftSeconds), ...rest } };
  }
  return e as RunEffect;
}
