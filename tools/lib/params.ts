// Rebuilds, in Node, the battle state the browser shows for a given URL query (mirrors
// src/app/main.ts) so the screenshot check can compare state hashes at the same tick.
import type { Content } from '../../src/data/registry.ts';
import {
  createBattle, createFromScenario, makeConfig, parseController, queueCommand, runHeadless,
} from '../../src/sim/index.ts';
import type { BattleState } from '../../src/sim/index.ts';

export function stateForParams(content: Content, q: URLSearchParams): BattleState {
  const seed = Number(q.get('seed') ?? 1);
  const player = q.get('player') ?? 'human';
  const enemy = q.get('enemy');
  const scenario = q.get('scenario');
  const ticksRaw = q.get('ticks');
  const ticks: number | 'end' | null = ticksRaw === 'end' ? 'end' : ticksRaw === null ? null : Number(ticksRaw);
  let state: BattleState;
  if (scenario) {
    state = createFromScenario(content, scenario, { seed, ...(player !== 'human' ? { player } : {}), ...(enemy !== null ? { enemy } : {}) });
  } else {
    state = createBattle(content, makeConfig(content, {
      seed, mapId: q.get('map') ?? 'bogwater-hollow', battleIndex: Number(q.get('battleIndex') ?? 1),
      player: parseController(player), enemy: parseController(enemy ?? 'general:scripted'),
    }));
  }
  const human = state.config.player.controller.kind === 'human';
  if (state.phase === 'deploy' && (!human || ticks !== null)) queueCommand(state, { tick: 0, side: 'player', type: 'begin' });
  if (ticks !== null) runHeadless(state, { until: ticks });
  return state;
}
