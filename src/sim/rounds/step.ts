// step(state) by phase (SPEC §13.3 rule 1, §14.6): planning runs the queued commands and no tick, a clash
// advances exactly one tick, the aftermath opens the next round or ends the battle, and an ended battle
// does nothing. It stands beside v1's `src/sim/step.ts` until R2b moves it there.
import { executeCommands } from './commands.ts';
import { openRound } from './round.ts';
import type { BattleState } from './state.ts';

export function step(state: BattleState): void {
  switch (state.phase) {
    case 'ended':
      return;
    case 'planning':
      // 1. clear events; 2. run the queue, each command validated as it runs (Begin's half is T043's)
      state.events.length = 0;
      executeCommands(state);
      return;
    case 'clash':
      clashTick(state);
      return;
    case 'aftermath':
      // the last round has its aftermath like any other, then the battle ends (§4.7, §6.5)
      if (!state.outcome) { openRound(state); return; }
      state.events.length = 0;
      state.events.push({ t: 'battleEnded', ...state.outcome });
      state.phase = 'ended';
  }
}

/** One tick of a clash (§14.6's clash steps 1 and 2). T044 and T045 add steps 3–14, the clash's systems. */
function clashTick(state: BattleState): void {
  // 1. clear events; tick++; snapshot previous positions for render interpolation
  state.events.length = 0;
  state.tick++;
  for (const u of state.units) { u.px = u.x; u.py = u.y; }
  // 2. the commands due this tick (the power), the player's first
  executeCommands(state);
}
