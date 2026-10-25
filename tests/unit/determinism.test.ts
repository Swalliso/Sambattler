import { describe, expect, it } from 'vitest';
import {
  createBattle, hashState, makeConfig, queueCommand, restore, runHeadless, snapshot, step,
} from '../../src/sim/index.ts';
import type { BattleState } from '../../src/sim/index.ts';
import type { QueuedCommand } from '../../src/sim/commands.ts';
import { hashValue } from '../../src/sim/hash.ts';
import { content } from '../helpers.ts';

const config = () => makeConfig(content, { seed: 11, player: 'bot:balanced', enemy: 'general:scripted' });

function hashesEvery(state: BattleState, every: number, until: number): string[] {
  const out: string[] = [];
  runHeadless(state, { until, onTick: (s) => { if (s.tick % every === 0) out.push(hashState(s)); } });
  return out;
}

describe('determinism (SPEC §13.3, §15.5)', () => {
  it('same config and commands give equal hashes every 200 ticks', () => {
    const a = hashesEvery(createBattle(content, config()), 200, 4000);
    const b = hashesEvery(createBattle(content, config()), 200, 4000);
    expect(a).toHaveLength(20);
    expect(a).toEqual(b);
    const other = hashesEvery(createBattle(content, makeConfig(content, { seed: 12, player: 'bot:balanced', enemy: 'general:scripted' })), 200, 4000);
    expect(other).not.toEqual(a);
  });

  it('snapshot at T → restore → continue matches an uninterrupted run', () => {
    const whole = createBattle(content, config());
    runHeadless(whole, { until: 3000 });
    const part = createBattle(content, config());
    runHeadless(part, { until: 1234 });
    const resumed = restore(snapshot(part));
    expect(hashState(resumed)).toBe(hashState(part));
    runHeadless(resumed, { until: 3000 });
    expect(hashState(resumed)).toBe(hashState(whole));
  });

  it('a mid-battle resume from the command log matches (human player)', () => {
    const human = makeConfig(content, { seed: 5, player: 'human', enemy: 'general:scripted' });
    const live = createBattle(content, human);
    const script: QueuedCommand[] = [
      { tick: 0, side: 'player', type: 'place', buildingId: 'sporelingBurrow', lane: 0, col: 0, row: 0 },
      { tick: 0, side: 'player', type: 'place', buildingId: 'capguardHall', lane: 0, col: 2, row: 4 },
      { tick: 0, side: 'player', type: 'begin' },
    ];
    for (const c of script) queueCommand(live, c);
    step(live);
    for (let t = 1; t <= 2400; t++) {
      if (t === 900) queueCommand(live, { tick: t, side: 'player', type: 'place', buildingId: 'gillNest', lane: 0, col: 0, row: 4 });
      if (t === 1500) queueCommand(live, { tick: t, side: 'player', type: 'sell', entityId: live.buildings.find((b) => b.side === 'player')!.id });
      step(live);
    }
    const log = live.log.filter((c) => c.side === 'player');
    const resumed = createBattle(content, human);
    runHeadless(resumed, { until: 2400, commands: log });
    expect(hashState(resumed)).toBe(hashState(live));
  });

  it('hashState is canonical: key order, -0 and undefined fields do not matter', () => {
    expect(hashValue({ a: 1, b: [1, 2] })).toBe(hashValue({ b: [1, 2], a: 1 }));
    expect(hashValue({ x: -0 })).toBe(hashValue({ x: 0 }));
    expect(hashValue({ x: 1, y: undefined })).toBe(hashValue({ x: 1 }));
    expect(hashValue({ x: 1.5 })).not.toBe(hashValue({ x: 1.5000000000000002 }));
    expect(hashValue('ab')).not.toBe(hashValue('ba'));
    expect(hashState(createBattle(content, config()))).toMatch(/^[0-9a-f]{16}$/);
  });
});
