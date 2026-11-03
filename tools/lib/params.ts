// Rebuilds, in Node, the state the browser shows for a URL query (mirrors src/app/main.ts and src/app/run.ts),
// so the screenshot check can compare state hashes: a battle scene's (`scene=battle`, `scene=report`) at the
// same round, phase and tick (SPEC §15.6, R2a plan Calls 14 and 16), through the page's own `battleForParams`,
// so the checkpoints match exactly, with the seed the page would have written into its URL; and a run scene's
// run state, with the battle state for `scene=draft` and for `scene=run` at a round and phase (R2b/T157).
import type { Content } from '../../src/data/registry.ts';
import { battleForParams, forwardBattle, parseRoundParams, runCheckpoint, sceneOf } from '../../src/app/urlParams.ts';
import { runForScene } from '../../src/run/index.ts';
import type { RunState } from '../../src/run/index.ts';
import { createBattle } from '../../src/sim/index.ts';
import type { BattleState } from '../../src/sim/index.ts';

export { sceneOf } from '../../src/app/urlParams.ts';
export const RUN_SCENES = ['run', 'route', 'draft', 'summary'];

/** A battle scene's state for the query, seed 1 unless it names one; throws a `BattleRefusal` with the page's message for one it can't open. */
export function battleStateForParams(content: Content, q: URLSearchParams): BattleState {
  const p = parseRoundParams(q);
  return battleForParams(content, p, p.seed ?? 1);
}

/**
 * Run scenes: the run state, plus the battle on screen: `scene=draft`'s at round 1's planning (its draft opens in
 * planning from R2b's T067 and T115), and `scene=run`'s at the round and phase it names, as the page plays it
 * (T157). Throws a `BattleRefusal` with the page's message for a checkpoint it can't reach.
 */
export function runForParams(content: Content, q: URLSearchParams): { run: RunState; battle: BattleState | null } {
  const scene = sceneOf(q);
  const auto = q.get('autoplay');
  const am = auto?.match(/^battles:(\d+)$/);
  const at = runCheckpoint(q);
  const run = runForScene(content, {
    scene, seed: Number(q.get('seed') ?? 1),
    player: q.get('player') ?? (scene === 'draft' ? 'bot:balanced' : 'human'),
    autoplay: auto === 'run' ? { battles: 'all' } : am ? { battles: Number(am[1]) } : null,
    enterBattle: at !== null,
  });
  if (run.screen.kind !== 'battle' || (scene !== 'draft' && !at)) return { run, battle: null };
  const battle = createBattle(content, run.screen.config);
  return { run, battle: at ? forwardBattle(battle, at) : battle };
}
