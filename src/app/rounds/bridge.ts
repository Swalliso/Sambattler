// window.__GAME__ for the preview of a battle in rounds (SPEC §15.6), installed only with ?debug=1 or ?test=1:
// v1's bridge (`src/app/debugBridge.ts`) with R2's `round`, `phase` and `preview()`, and rounds' own hash and
// summary, so a capture can compare the page with Node at the same round, phase and tick. `tick` is the
// battle's cumulative `state.tick` (plan Call 16). `battle()` is the live state, for browser tests that stage
// a case; changing it gives up the hash check. It stands beside v1's bridge until R2b folds the two.
import { hashState, summarize } from '../../sim/rounds/index.ts';
import type { BattleState, RoundSummary, Side } from '../../sim/rounds/index.ts';
import { stormBpFor } from '../../sim/rounds/systems/victory.ts';

/** `summarize`'s, with this round's storm as a multiplier, which the storm chip shows (§6.4, T087); the round log has past rounds'. */
export type BridgeSummary = RoundSummary & { storm: number };

/** One side's formation preview as it was drawn: each squad and its units' positions (T083). */
export interface DrawnPreview {
  squads: { building: number; unitId: string; units: { x: number; y: number; tier: number }[] }[];
}

export interface RoundsBridge {
  ready: boolean;
  readonly scene: 'rounds';
  /** 0 before a battle opens, as when the parameters were refused. */
  readonly round: number;
  readonly phase: BattleState['phase'] | null;
  readonly tick: number;
  readonly hash: string;
  summary(): BridgeSummary | null;
  /** The live battle state, for staging only (changing it breaks the hash check). */
  battle(): BattleState | null;
  /** What the formation preview last drew, per side, or null before its first draw (T083). */
  preview(): Record<Side, DrawnPreview> | null;
  /** Run screens' brief: a single battle in rounds has none. */
  run(): null;
  errors: string[];
  /** With `measure=frames`, the last frames' times in ms (T115). */
  readonly frames?: number[];
}

export interface RoundsBridgeSources {
  battle: () => BattleState | null;
  preview: () => Record<Side, DrawnPreview> | null;
  frames: (() => number[]) | null;
}

export function installRoundsBridge(src: RoundsBridgeSources, errors: string[]): RoundsBridge {
  const bridge: RoundsBridge = {
    ready: false,
    scene: 'rounds',
    get round() { return src.battle()?.round ?? 0; },
    get phase() { return src.battle()?.phase ?? null; },
    get tick() { return src.battle()?.tick ?? 0; },
    get hash() { const b = src.battle(); return b ? hashState(b) : ''; },
    summary: () => { const b = src.battle(); return b ? { ...summarize(b), storm: stormBpFor(b.rules.storm, b.round) / 10000 } : null; },
    battle: () => src.battle(),
    preview: () => src.preview(),
    run: () => null,
    errors,
  };
  if (src.frames) Object.defineProperty(bridge, 'frames', { get: src.frames, enumerable: true });
  // v1's `GameBridge` types the global; the preview's bridge is its own shape
  (window as unknown as { __GAME__: RoundsBridge }).__GAME__ = bridge;
  return bridge;
}
