// window.__GAME__ (SPEC §15.6), installed only with ?debug=1 or ?test=1: { ready, scene, tick, hash,
// summary(), run(), battle(), errors[] }. Lets Playwright compare the browser's state hash with Node's:
// the battle's hash while a battle is on screen, otherwise the run state's. battle() hands browser tests
// the live state to stage a HUD case (a smaller kit, less gold); a test that changes it gives up the hash.
import { hashRun } from '../run/index.ts';
import type { RunState } from '../run/index.ts';
import { hashState, summarize } from '../sim/index.ts';
import type { BattleState, BattleSummary } from '../sim/index.ts';

export interface RunBrief {
  screen: RunState['screen']['kind'];
  row: number;
  battles: { index: number; kind: string; map: string; winner: string; by: string }[];
  heartcap: RunState['heartcap'];
  outcome: RunState['outcome'] | null;
}

export interface GameBridge {
  ready: boolean;
  readonly scene: string;
  readonly tick: number;
  readonly hash: string;
  summary(): BattleSummary | null;
  run(): RunBrief | null;
  /** The live battle state, for screenshot staging only (changing it breaks the hash check). */
  battle(): BattleState | null;
  errors: string[];
}

declare global {
  interface Window { __GAME__?: GameBridge }
}

export interface BridgeSources {
  scene: string;
  battle: () => BattleState | null;
  run: () => RunState | null;
}

export function installBridge(src: BridgeSources, errors: string[]): GameBridge {
  const bridge: GameBridge = {
    ready: false,
    get scene() { return src.scene; },
    get tick() { return src.battle()?.tick ?? 0; },
    get hash() {
      const b = src.battle();
      if (b) return hashState(b);
      const r = src.run();
      return r ? hashRun(r) : '';
    },
    summary: () => { const b = src.battle(); return b ? summarize(b) : null; },
    battle: () => src.battle(),
    run: () => {
      const r = src.run();
      if (!r) return null;
      return {
        screen: r.screen.kind, row: r.path.length, heartcap: { ...r.heartcap }, outcome: r.outcome ?? null,
        battles: r.battles.map((b) => ({ index: b.index, kind: b.kind, map: b.map, winner: b.winner, by: b.by })),
      };
    },
    errors,
  };
  window.__GAME__ = bridge;
  return bridge;
}
