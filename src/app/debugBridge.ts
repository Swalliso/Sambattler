// window.__GAME__ (SPEC §15.6), installed only with ?debug=1 or ?test=1: { ready, scene, tick, hash,
// summary(), run(), battle(), errors[] }. Lets Playwright compare the browser's state hash with Node's:
// the battle's hash while a battle is on screen, otherwise the run state's. battle() hands browser tests
// the live state to stage a HUD case (a smaller kit, less gold); a test that changes it gives up the hash.
// A run's battle is in rounds since R2b's S1: `round` and `phase` read it, and `roundBattle()` hands it over.
import { hashRun } from '../run/index.ts';
import type { RunState } from '../run/index.ts';
import { hashState, summarize } from '../sim/index.ts';
import type { BattleState, BattleSummary } from '../sim/index.ts';
import { hashState as hashRoundState } from '../sim/rounds/index.ts';
import type { BattleState as RoundState } from '../sim/rounds/index.ts';

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
  readonly tick: number;
  readonly hash: string;
  /** A run's battle in rounds: its round and phase, 0 and null without one. */
  readonly round: number;
  readonly phase: RoundState['phase'] | null;
  summary(): BattleSummary | null;
  run(): RunBrief | null;
  /** The live battle state, for screenshot staging only (changing it breaks the hash check). */
  battle(): BattleState | null;
  /** A run's live battle in rounds, for staging only. */
  roundBattle(): RoundState | null;
  errors: string[];
}

declare global {
  interface Window { __GAME__?: GameBridge }
}

export interface BridgeSources {
  scene: string;
  battle: () => BattleState | null;
  /** A run's battle, in rounds (R2b). */
  roundBattle?: () => RoundState | null;
  run: () => RunState | null;
}

export function installBridge(src: BridgeSources, errors: string[]): GameBridge {
  const bridge: GameBridge = {
    ready: false,
    get scene() { return src.scene; },
    get tick() { return src.battle()?.tick ?? src.roundBattle?.()?.tick ?? 0; },
    get hash() {
      const b = src.battle();
      if (b) return hashState(b);
      const rb = src.roundBattle?.();
      if (rb) return hashRoundState(rb);
      const r = src.run();
      return r ? hashRun(r) : '';
    },
    get round() { return src.roundBattle?.()?.round ?? 0; },
    get phase() { return src.roundBattle?.()?.phase ?? null; },
    summary: () => { const b = src.battle(); return b ? summarize(b) : null; },
    battle: () => src.battle(),
    roundBattle: () => src.roundBattle?.() ?? null,
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
  window.__GAME__ = bridge;
  return bridge;
}
