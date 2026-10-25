// window.__GAME__ (SPEC §15.6), installed only with ?debug=1 or ?test=1: { ready, tick, hash,
// summary(), errors[] }. Lets Playwright compare the browser's state hash with Node's.
import { hashState, summarize } from '../sim/index.ts';
import type { BattleState, BattleSummary } from '../sim/index.ts';

export interface GameBridge {
  ready: boolean;
  readonly tick: number;
  readonly hash: string;
  summary(): BattleSummary;
  errors: string[];
}

declare global {
  interface Window { __GAME__?: GameBridge }
}

export function installBridge(getState: () => BattleState, errors: string[]): GameBridge {
  const bridge: GameBridge = {
    ready: false,
    get tick() { return getState().tick; },
    get hash() { return hashState(getState()); },
    summary: () => summarize(getState()),
    errors,
  };
  window.__GAME__ = bridge;
  return bridge;
}
