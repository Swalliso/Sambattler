// Run states for URL scenes (SPEC §15.6), shared by the browser and the Node screenshot mirror so
// both build exactly the same state: `scene=route` (optionally after `autoplay=battles:<n>`),
// `scene=summary&autoplay=run`, and `scene=draft` (battle 1 of the run with a bot placing and the
// drafts left to the player).
import { chooseNode } from './flow.ts';
import { simulateRun } from './auto.ts';
import type { AutoPolicies } from './auto.ts';
import { createRun } from './runState.ts';
import type { RunState } from './runState.ts';
import type { Content } from '../sim/index.ts';

/** The policies browser autoplay uses (the same defaults as `npm run sim -- --run`). */
export const AUTOPLAY: AutoPolicies = { route: 'random', draft: 'greedy', player: 'bot:balanced' };

export interface SceneParams {
  scene: string;
  seed: number;
  player: string;
  autoplay: { battles: number | 'all' } | null;
}

export function runForScene(content: Content, p: SceneParams): RunState {
  if (p.autoplay) {
    const max = p.autoplay.battles === 'all' ? undefined : p.autoplay.battles;
    return simulateRun(content, p.seed, AUTOPLAY, max === undefined ? {} : { maxBattles: max }).run;
  }
  if (p.scene === 'draft') {
    // a bot places buildings so the field isn't empty; drafts wait for the player
    const run = createRun(content, { seed: p.seed, player: p.player, autoDraft: 'none' });
    chooseNode(content, run, 0);
    return run;
  }
  return createRun(content, { seed: p.seed, player: p.player });
}
