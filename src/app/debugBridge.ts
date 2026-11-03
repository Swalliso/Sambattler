// window.__GAME__ (SPEC §15.6), installed only with ?debug=1 or ?test=1: { ready, scene, round, phase, tick, hash,
// summary(), battle(), preview(), run(), errors[] }. Lets Playwright compare the browser's state hash with Node's:
// the battle's hash while a battle is on screen, at the same round, phase and tick, otherwise the run state's.
// `tick` is the battle's cumulative `state.tick` (R2a plan Call 16). battle() hands browser tests the live state
// to stage a case (a smaller kit, less gold); a test that changes it gives up the hash. preview() is what the
// formation preview last drew (T083), and with `measure=frames` `frames` holds the last frames' times (T115).
import type { DrawnPreview } from '../render/preview.ts';
import { hashRun } from '../run/index.ts';
import type { RunState } from '../run/index.ts';
import { hashState, summarize } from '../sim/rounds/index.ts';
import type { BattleState, RoundSummary, Side } from '../sim/rounds/index.ts';
import { stormBpFor } from '../sim/rounds/systems/victory.ts';

/** `summarize`'s, with this round's storm as a multiplier, which the storm chip shows (§6.4, T087); the round log has past rounds'. */
export type BridgeSummary = RoundSummary & { storm: number };

/** One side's formation preview as it was drawn: its squads with their units, merge previews and marks, the muster's knits and the lit plot (T083). */
export type { DrawnPreview, DrawnSquad, SquadMarks } from '../render/preview.ts';

export interface RunBrief {
  screen: RunState['screen']['kind'];
  seed: number;
  row: number;
  battles: { index: number; kind: string; map: string; winner: string; by: string; lifeLost: boolean }[];
  lives: RunState['lives'];
  plotsGained: number;
  outcome: RunState['outcome'] | null;
  commander: string;
  bans: string[];
  kit: string[];
}

export interface GameBridge {
  ready: boolean;
  readonly scene: string;
  /** The battle on screen's round and phase: 0 and null without one, as when its parameters were refused. */
  readonly round: number;
  readonly phase: BattleState['phase'] | null;
  readonly tick: number;
  readonly hash: string;
  summary(): BridgeSummary | null;
  /** The live battle state, for staging only (changing it breaks the hash check). */
  battle(): BattleState | null;
  /** What the formation preview last drew, per side, or null before its first draw (T083). */
  preview(): Record<Side, DrawnPreview> | null;
  run(): RunBrief | null;
  errors: string[];
  /** With `measure=frames`, the last frames' times in ms (T115). */
  readonly frames?: number[];
}

declare global {
  interface Window { __GAME__?: GameBridge }
}

export interface BridgeSources {
  scene: string;
  battle: () => BattleState | null;
  preview?: () => Record<Side, DrawnPreview> | null;
  frames?: (() => number[]) | null;
  run: () => RunState | null;
}

export function installBridge(src: BridgeSources, errors: string[]): GameBridge {
  const bridge: GameBridge = {
    ready: false,
    get scene() { return src.scene; },
    get round() { return src.battle()?.round ?? 0; },
    get phase() { return src.battle()?.phase ?? null; },
    get tick() { return src.battle()?.tick ?? 0; },
    get hash() {
      const b = src.battle();
      if (b) return hashState(b);
      const r = src.run();
      return r ? hashRun(r) : '';
    },
    summary: () => { const b = src.battle(); return b ? { ...summarize(b), storm: stormBpFor(b.rules.storm, b.round) / 10000 } : null; },
    battle: () => src.battle(),
    preview: () => src.preview?.() ?? null,
    run: () => {
      const r = src.run();
      if (!r) return null;
      return {
        screen: r.screen.kind, seed: r.seed, row: r.path.length, lives: { ...r.lives }, plotsGained: r.plotsGained, outcome: r.outcome ?? null,
        commander: r.commander, bans: [...r.bans], kit: [...r.kit],
        battles: r.battles.map((b) => ({ index: b.index, kind: b.kind, map: b.map, winner: b.winner, by: b.by, lifeLost: b.lifeLost })),
      };
    },
    errors,
  };
  if (src.frames) Object.defineProperty(bridge, 'frames', { get: src.frames, enumerable: true });
  window.__GAME__ = bridge;
  return bridge;
}
