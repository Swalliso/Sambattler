// The play clock (SPEC §8.2, RB-Q3; X6, X10; T126, T128), with an injected clock: planning seconds are kept per
// round, and the planning, clash and aftermath seconds add up; the clock stops while the tab is hidden and after
// 60 s without input; Help and settings count; a paused clash counts until the idle cutoff; the report's line
// reads the readout; and nothing enters the state or the hash, nor storage. records-2 adds its run-total
// cases here (run-it-back.md T015), at `tests/unit/playTime.test.ts` after R2b's move.
import { afterEach, describe, expect, it, vi } from 'vitest';
import { PlayClock, readoutOf } from '../../../src/app/playTime.ts';
import { battleForParams, parseRoundParams } from '../../../src/app/urlParams.ts';
import { hashState, step } from '../../../src/sim/rounds/index.ts';
import { playTimeText } from '../../../src/ui/report.ts';
import { content } from '../../roundHelpers.ts';

/** A wall clock the test moves by hand, in ms. */
function wall() {
  const w = { t: 1_000, now: () => w.t };
  return w;
}

/** Moves the wall clock on by `ms`, with an input every `every` ms on the way if given (and none at the end). */
function pass(w: { t: number }, clock: PlayClock, ms: number, every?: number): void {
  if (!every) { w.t += ms; return; }
  for (let left = ms; left > 0; left -= every) {
    w.t += Math.min(every, left);
    if (left > every) clock.input();
  }
}

const planning = (c: PlayClock) => c.planningSecondsByRound();

describe('the play clock (RB-Q3, T128)', () => {
  it('keeps planning seconds per round, and the planning, clash and aftermath seconds add up', () => {
    const w = wall();
    const c = new PlayClock(w.now);
    let elapsed = 0;
    const round = (r: number, plan: number, clash: number, after: number) => {
      c.phase(r, 'planning');
      pass(w, c, plan, 10_000);
      c.phase(r, 'planning'); // the page says the phase every frame: saying it again changes nothing
      pass(w, c, 0);
      c.input();
      c.phase(r, 'clash');
      pass(w, c, clash, 10_000);
      c.input();
      c.phase(r, 'aftermath');
      pass(w, c, after);
      c.input();
      elapsed += plan + clash + after;
    };
    round(1, 34_000, 28_000, 4_000);
    round(2, 75_000, 31_000, 4_500);
    round(3, 12_500, 22_000, 3_000);
    c.phase(3, 'ended');
    pass(w, c, 20_000, 5_000); // the report counts toward none
    expect(planning(c)).toEqual([{ round: 1, seconds: 34 }, { round: 2, seconds: 75 }, { round: 3, seconds: 12.5 }]);
    expect(c.clashSeconds()).toBe(81);
    expect(c.aftermathSeconds()).toBe(11.5);
    const sum = planning(c).reduce((n, p) => n + p.seconds, 0) + c.clashSeconds() + c.aftermathSeconds();
    expect(sum * 1000).toBeCloseTo(elapsed, 6);
  });

  it('times only the rounds it saw, as after a round= fast-forward, and a new battle\'s round 1 as its own', () => {
    const w = wall();
    const c = new PlayClock(w.now);
    c.phase(4, 'planning');
    pass(w, c, 5_000);
    c.input();
    c.phase(4, 'clash');
    pass(w, c, 20_000);
    c.input();
    c.phase(5, 'planning');
    pass(w, c, 8_000);
    c.input();
    // a run's next battle starts again from round 1 (R2b/T109 holds one clock for the run)
    c.phase(1, 'planning');
    pass(w, c, 3_000);
    expect(planning(c)).toEqual([{ round: 4, seconds: 5 }, { round: 5, seconds: 8 }, { round: 1, seconds: 3 }]);
  });

  it('stops while the tab is hidden', () => {
    const w = wall();
    const c = new PlayClock(w.now);
    c.phase(1, 'planning');
    pass(w, c, 10_000);
    c.setVisible(false);
    pass(w, c, 30_000);
    c.setVisible(true);
    c.input();
    pass(w, c, 5_000);
    expect(planning(c)).toEqual([{ round: 1, seconds: 15 }]);
    // showing the tab isn't input: back after the idle cutoff, it counts from the next input
    c.setVisible(false);
    pass(w, c, 120_000);
    c.setVisible(true);
    pass(w, c, 20_000);
    c.input();
    pass(w, c, 2_000);
    expect(planning(c)).toEqual([{ round: 1, seconds: 17 }]);
  });

  it('stops after 60 s without input, and the next input resumes it without the idle gap', () => {
    const w = wall();
    const c = new PlayClock(w.now);
    c.phase(1, 'planning');
    pass(w, c, 100_000);
    expect(planning(c)).toEqual([{ round: 1, seconds: 60 }]);
    c.input();
    pass(w, c, 10_000);
    expect(planning(c)).toEqual([{ round: 1, seconds: 70 }]);
  });

  it('takes its idle cutoff from idleMs', () => {
    const w = wall();
    const c = new PlayClock(w.now, { idleMs: 10_000 });
    c.phase(1, 'clash');
    pass(w, c, 25_000);
    expect(c.clashSeconds()).toBe(10);
  });

  it('counts Help and settings: nothing but the tab and the idle cutoff stops it', () => {
    // Help or the settings screen open in planning is still planning: the page tells the clock nothing about
    // them, and reading Help with a key or the pointer now and then keeps the count going
    const w = wall();
    const c = new PlayClock(w.now);
    c.phase(2, 'planning');
    pass(w, c, 90_000, 20_000);
    expect(planning(c)).toEqual([{ round: 2, seconds: 90 }]);
  });

  it('counts a paused clash until the idle cutoff', () => {
    const w = wall();
    const c = new PlayClock(w.now);
    c.phase(3, 'clash');
    pass(w, c, 12_000);
    c.input(); // the pause
    pass(w, c, 200_000);
    expect(c.clashSeconds()).toBe(72);
  });
});

describe('the readout on the report (X6, T128)', () => {
  it('gives the median planning seconds and the battle\'s active minutes, and the report shows them', () => {
    const w = wall();
    const c = new PlayClock(w.now);
    for (const [r, s] of [[1, 40], [2, 21], [3, 30], [4, 18]] as const) {
      c.phase(r, 'planning');
      pass(w, c, s * 1000);
      c.input();
      c.phase(r, 'clash');
      pass(w, c, 30_000);
      c.input();
    }
    c.phase(4, 'ended');
    const out = readoutOf(c);
    expect(out.planning.map((p) => p.seconds)).toEqual([40, 21, 30, 18]);
    expect(out.medianPlanningSeconds).toBe(25.5);
    expect(out.minutes).toBeCloseTo((109 + 120) / 60, 9);
    expect(playTimeText(out)).toBe('Planning time by round: R1 40 s · R2 21 s · R3 30 s · R4 18 s · median 26 s · 3.8 min of active play');
  });

  it('says so when it timed no planning, as when the preview opens at the battle\'s end', () => {
    const w = wall();
    const c = new PlayClock(w.now);
    c.phase(9, 'ended');
    pass(w, c, 5_000);
    const out = readoutOf(c);
    expect(out).toEqual({ planning: [], medianPlanningSeconds: null, minutes: 0 });
    expect(playTimeText(out)).toBe('Planning time: none timed, since the battle opened past planning');
  });
});

describe('what the clock touches (§13.3, A185)', () => {
  afterEach(() => { vi.unstubAllGlobals(); });

  it('leaves the state and its hash alone, and never saves', () => {
    const storage = { getItem: vi.fn(() => null), setItem: vi.fn(), removeItem: vi.fn(), clear: vi.fn(), key: vi.fn(), length: 0 };
    vi.stubGlobal('localStorage', storage);
    const q = 'scene=battle&player=bot:balanced&enemy=general:scripted';
    const fed = battleForParams(content, parseRoundParams(q), 3);
    const w = wall();
    const c = new PlayClock(w.now);
    // the page's feed: the phase each frame, with input now and then
    while (fed.phase !== 'ended') {
      c.phase(fed.round, fed.phase);
      c.input();
      w.t += 500;
      step(fed);
    }
    c.phase(fed.round, fed.phase);
    expect(readoutOf(c).planning.length).toBeGreaterThan(0);
    const alone = battleForParams(content, parseRoundParams(`${q}&phase=ended`), 3);
    expect(hashState(fed)).toBe(hashState(alone));
    expect(JSON.stringify(fed)).toBe(JSON.stringify(alone));
    for (const f of [storage.setItem, storage.removeItem, storage.clear]) expect(f).not.toHaveBeenCalled();
  });
});
