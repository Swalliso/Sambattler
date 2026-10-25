// The Milestone 1 rule scenarios (SPEC §16 M1 verification step 4), asserted in the fast suite too.
import { describe, expect, it } from 'vitest';
import { runBattle } from '../../tools/lib/run.ts';
import { content } from '../helpers.ts';

const at = (scenario: string, ticks: number[]) =>
  runBattle(content, { seed: 1, scenario, until: Math.max(...ticks), recordAt: ticks }).result.at as Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any

describe('rule scenarios', () => {
  it('fort-blocks-flip: the border holds until the fort falls, then flips', () => {
    const r = at('fort-blocks-flip', [300, 600]);
    expect(r['300'].lanes[0].pBorder).toBe(7);
    expect(r['600'].lanes[0].pBorder).toBe(6);
  });
  it('home-never-flips', () => {
    expect(at('home-never-flips', [1200])['1200'].lanes[0].pBorder).toBe(3);
  });
  it('besieged-half-speed vs besieged-control', () => {
    expect(at('besieged-half-speed', [700])['700'].spawned.player.capguard).toBe(1);
    expect(at('besieged-control', [700])['700'].spawned.player.capguard).toBe(2);
  });
});
