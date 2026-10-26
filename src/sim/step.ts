// step(state): advances exactly one tick in the fixed system order of SPEC §14.6.
import { executeCommands } from './commands.ts';
import { aiOpener, aiThink } from './ai/controller.ts';
import { attackSystem, deathSystem, resolveHitsSystem } from './systems/combat.ts';
import { clockSystem, incomeSystem } from './systems/economy.ts';
import { mergingSystem } from './systems/merging.ts';
import { movementSystem } from './systems/movement.ts';
import { spawningSystem } from './systems/spawning.ts';
import { targetingSystem } from './systems/targeting.ts';
import { territorySystem } from './systems/territory.ts';
import { victorySystem } from './systems/victory.ts';
import { statsSystem } from './stats.ts';
import { SIDES } from './state.ts';
import type { BattleState } from './state.ts';

export function step(state: BattleState): void {
  if (state.phase === 'ended' || state.held) return;
  state.events.length = 0;

  if (state.phase === 'deploy') {
    // The clock is stopped: only commands run. `begin` ends deploy; the AI sides place their
    // openers at that moment (executing on the first live tick, like any AI command).
    if (executeCommands(state, 0)) {
      state.events.push({ t: 'begin' }, { t: 'wave', n: 1 });
      for (const side of SIDES) aiOpener(state, side);
    }
    return;
  }

  // 1. clear events (above); snapshot previous positions for render interpolation
  state.tick++;
  for (const u of state.units) { u.px = u.x; u.py = u.y; }
  // 2. commands
  executeCommands(state, state.tick);
  // 3. clock, waves, Sporestorm
  clockSystem(state);
  // 4. income and interest
  incomeSystem(state);
  // 5. building timers and spawns
  spawningSystem(state);
  // 6. AI think
  if (state.tick % state.rules.ai.thinkEvery === 0) {
    for (const side of SIDES) if (state.sides[side].ai) aiThink(state, side);
  }
  // 7. targeting
  targetingSystem(state);
  // 8. movement and separation
  movementSystem(state);
  // 9. attacks
  attackSystem(state);
  // 10. resolve hits due this tick
  resolveHitsSystem(state);
  // 11. healing (M3) — no healers yet
  // 12. deaths and removals
  deathSystem(state);
  // 13. merging (every tick for active knits, every merge.every ticks for new trios)
  mergingSystem(state);
  // 14. territory
  territorySystem(state);
  // 15. victory
  victorySystem(state);
  // 16. stats sampling
  statsSystem(state);
}
