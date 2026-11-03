// The play clock (SPEC §8.2, RB-Q3; X6, X10; T128): active play time in a battle in rounds, by phase. Active time
// is wall time with the tab visible, paused while it's hidden and after 60 s without input; Help and the settings
// screen count, and so does a paused clash, until the idle cutoff. `main.ts` feeds it the battle's phases, the
// page's input and its visibility, and passes its readout to the report, which can't import `src/app`. A run
// holds one more clock, which each of its battles feeds beside its own, and the run's summary shows it (R2b/T109).
// It's the one play-time module: records-2 adds the run's total, `restore` and `still` (run-it-back.md T016). It
// never saves, and nothing in it enters the battle state or its hash (§13.3, A185).
import type { PlayTimeReadout } from '../ui/report.ts';

/** A battle's phase as the clock counts it: the report, after the battle's end, counts toward none. */
export type PlayPhase = 'planning' | 'clash' | 'aftermath' | 'ended';

export interface PlayClockOptions {
  /** How long without input before the clock pauses, in ms: 60 000 by default (RB-Q3). */
  idleMs?: number;
}

/** One planning phase the clock timed: its round, and its active seconds. */
export interface PlanningTime {
  round: number;
  seconds: number;
}

export class PlayClock {
  private readonly idleMs: number;
  private visible = true;
  private lastInput: number;
  /** The time it has counted up to. */
  private since: number;
  private current: { round: number; phase: PlayPhase } | null = null;
  /** The active ms of each planning phase it timed, in order: a run's next battle starts again from round 1. */
  private planning: { round: number; ms: number }[] = [];
  private clashMs = 0;
  private aftermathMs = 0;

  /** @param now the wall clock in ms: `performance.now` in the page, and the test's own in a unit test */
  constructor(private readonly now: () => number, opts: PlayClockOptions = {}) {
    this.idleMs = opts.idleMs ?? 60_000;
    this.since = this.lastInput = now();
  }

  /** The tab was shown or hidden: hidden time never counts, and showing it isn't input. */
  setVisible(v: boolean): void {
    this.settle();
    this.visible = v;
  }

  /** Input from the player (a key, the pointer or the wheel) restarts the idle cutoff; an idle gap before it isn't counted. */
  input(): void {
    this.settle();
    this.lastInput = this.since;
  }

  /** The battle is in round `round`'s phase `p` from now. Saying the phase it's in already changes nothing. */
  phase(round: number, p: PlayPhase): void {
    this.settle();
    if (this.current?.round === round && this.current.phase === p) return;
    this.current = { round, phase: p };
    if (p === 'planning') this.planning.push({ round, ms: 0 });
  }

  /** Each planning phase it timed, in order, with its active seconds. */
  planningSecondsByRound(): PlanningTime[] {
    this.settle();
    return this.planning.map((x) => ({ round: x.round, seconds: x.ms / 1000 }));
  }

  clashSeconds(): number {
    this.settle();
    return this.clashMs / 1000;
  }

  aftermathSeconds(): number {
    this.settle();
    return this.aftermathMs / 1000;
  }

  /** Counts the time since it last counted toward the phase it's in: while the tab is visible, up to the idle cutoff. */
  private settle(): void {
    const t = this.now();
    const end = Math.min(t, this.lastInput + this.idleMs);
    if (this.visible && this.current && end > this.since) {
      const ms = end - this.since;
      if (this.current.phase === 'planning') this.planning.at(-1)!.ms += ms;
      else if (this.current.phase === 'clash') this.clashMs += ms;
      else if (this.current.phase === 'aftermath') this.aftermathMs += ms;
    }
    this.since = t;
  }
}

/** The report's and the console's readout (X6): the planning seconds by round with their median, and the battle's active minutes. */
export function readoutOf(clock: PlayClock): PlayTimeReadout {
  const planning = clock.planningSecondsByRound();
  const seconds = planning.reduce((n, p) => n + p.seconds, 0) + clock.clashSeconds() + clock.aftermathSeconds();
  return { planning, medianPlanningSeconds: median(planning.map((p) => p.seconds)), minutes: seconds / 60 };
}

function median(xs: number[]): number | null {
  if (!xs.length) return null;
  const s = [...xs].sort((a, b) => a - b), m = s.length >> 1;
  return s.length % 2 ? s[m]! : (s[m - 1]! + s[m]!) / 2;
}
