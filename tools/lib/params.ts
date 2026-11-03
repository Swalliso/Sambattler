// Rebuilds, in Node, the run state the browser shows for a run scene's URL query (mirrors src/app/main.ts and
// src/app/run.ts) so the screenshot check can compare state hashes: the battle state for `scene=draft`, the run
// state for the other run scenes. A battle scene's state comes from `roundStateForParams`
// (`tools/lib/rounds/params.ts`), through the page's own `battleForParams`.
import type { Content } from '../../src/data/registry.ts';
import { sceneOf } from '../../src/app/urlParams.ts';
import { runForScene } from '../../src/run/index.ts';
import type { RunState } from '../../src/run/index.ts';
import { createBattle as createRoundBattle } from '../../src/sim/rounds/index.ts';
import type { BattleState as RoundState } from '../../src/sim/rounds/index.ts';

export { sceneOf } from '../../src/app/urlParams.ts';
export const RUN_SCENES = ['run', 'route', 'draft', 'summary'];

/**
 * Run scenes: the run state, plus the battle on screen for `scene=draft`, which is in rounds since R2b's S1, at
 * round 1's planning (a run's battle takes no `ticks`). Its draft opens in planning from R2b's T067 and T115.
 */
export function runForParams(content: Content, q: URLSearchParams): { run: RunState; battle: RoundState | null } {
  const scene = sceneOf(q);
  const auto = q.get('autoplay');
  const am = auto?.match(/^battles:(\d+)$/);
  const run = runForScene(content, {
    scene, seed: Number(q.get('seed') ?? 1),
    player: q.get('player') ?? (scene === 'draft' ? 'bot:balanced' : 'human'),
    autoplay: auto === 'run' ? { battles: 'all' } : am ? { battles: Number(am[1]) } : null,
  });
  if (scene !== 'draft' || run.screen.kind !== 'battle') return { run, battle: null };
  return { run, battle: createRoundBattle(content, run.screen.config) };
}
