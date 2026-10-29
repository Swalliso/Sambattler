// Rebuilds, in Node, the state the browser shows for a given URL query (mirrors src/app/main.ts and
// src/app/run.ts) so the screenshot check can compare state hashes: the battle state for battle
// scenes and `scene=draft`, the run state for the other run scenes.
import type { Content } from '../../src/data/registry.ts';
import { runForScene } from '../../src/run/index.ts';
import type { RunState } from '../../src/run/index.ts';
import {
  createBattle, createFromScenario, makeConfig, parseController, parseFlags, queueCommand, runHeadless,
} from '../../src/sim/index.ts';
import type { BattleState } from '../../src/sim/index.ts';

const BATTLE_PARAMS = ['player', 'enemy', 'ticks', 'scenario', 'map', 'battleIndex', 'flags', 'paused'];
export const RUN_SCENES = ['run', 'route', 'draft', 'summary'];

/** The scene the browser opens for this query (no `scene`: a battle if battle parameters are present, else the title). */
export function sceneOf(q: URLSearchParams): string {
  return q.get('scene') ?? (BATTLE_PARAMS.some((k) => q.has(k)) ? 'battle' : 'title');
}

function ticksOf(q: URLSearchParams): number | 'end' | null {
  const raw = q.get('scene') === 'report' ? 'end' : q.get('ticks');
  return raw === 'end' ? 'end' : raw === null ? null : Number(raw);
}

export function stateForParams(content: Content, q: URLSearchParams): BattleState {
  const seed = Number(q.get('seed') ?? 1);
  const player = q.get('player') ?? 'human';
  const enemy = q.get('enemy');
  const scenario = q.get('scenario');
  const ticks = ticksOf(q);
  const flagList = q.get('flags');
  const flags = flagList === null ? undefined : parseFlags(flagList).flags;
  let state: BattleState;
  if (scenario) {
    state = createFromScenario(content, scenario, {
      seed, ...(player !== 'human' ? { player } : {}), ...(enemy !== null ? { enemy } : {}), ...(flags ? { flags } : {}),
    });
  } else {
    state = createBattle(content, makeConfig(content, {
      seed, mapId: q.get('map') ?? 'bogwater-hollow', battleIndex: Number(q.get('battleIndex') ?? 1),
      player: parseController(player), enemy: parseController(enemy ?? 'general:scripted'), ...(flags ? { flags } : {}),
    }));
  }
  const human = state.config.player.controller.kind === 'human';
  if (state.phase === 'deploy' && (!human || ticks !== null)) queueCommand(state, { tick: 0, side: 'player', type: 'begin' });
  if (ticks !== null) runHeadless(state, { until: ticks });
  return state;
}

/** Run scenes: the run state, plus the battle on screen for `scene=draft`. */
export function runForParams(content: Content, q: URLSearchParams): { run: RunState; battle: BattleState | null } {
  const scene = sceneOf(q);
  const auto = q.get('autoplay');
  const am = auto?.match(/^battles:(\d+)$/);
  const run = runForScene(content, {
    scene, seed: Number(q.get('seed') ?? 1),
    player: q.get('player') ?? (scene === 'draft' ? 'bot:balanced' : 'human'),
    autoplay: auto === 'run' ? { battles: 'all' } : am ? { battles: Number(am[1]) } : null,
  });
  if (scene !== 'draft' || run.screen.kind !== 'battle') return { run, battle: null };
  const battle = createBattle(content, run.screen.config);
  const ticks = ticksOf(q);
  if (battle.phase === 'deploy' && (battle.config.player.controller.kind !== 'human' || ticks !== null)) {
    queueCommand(battle, { tick: 0, side: 'player', type: 'begin' });
  }
  if (ticks !== null) runHeadless(battle, { until: ticks });
  return { run, battle };
}
