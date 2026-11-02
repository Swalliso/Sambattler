// step(state) by phase (SPEC §13.3 rule 1, §14.6): planning runs the queued commands and no tick, a clash
// advances exactly one tick through the kept systems in §14.6's order, the aftermath opens the next round or
// ends the battle, and an ended battle does nothing. It stands beside v1's `src/sim/step.ts` until R2b moves
// it there.
import { executeCommands } from './commands.ts';
import { endClash, openRound } from './round.ts';
import type { BattleState } from './state.ts';
import { clashOver, inMuster, laneEndSystem } from './systems/clash.ts';
import { cloudSystem } from './systems/clouds.ts';
import { attackSystem, deathSystem, resolveHitsSystem } from './systems/combat.ts';
import { healingSystem } from './systems/healing.ts';
import { mergingSystem } from './systems/merging.ts';
import { movementSystem } from './systems/movement.ts';
import { targetingSystem } from './systems/targeting.ts';

export function step(state: BattleState): void {
  switch (state.phase) {
    case 'ended':
      return;
    case 'planning':
      // 1. clear events; 2. run the queue, each command validated as it runs; 3. Begin fields both armies
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

/** One tick of a clash, §14.6's clash steps 1–14. An ended lane's units hold still in every system (§6.7). */
function clashTick(state: BattleState): void {
  // 1. clear events; tick++; snapshot previous positions for render interpolation
  state.events.length = 0;
  state.tick++;
  for (const u of state.units) { u.px = u.x; u.py = u.y; }
  // 2. the commands due this tick (the power), the player's first
  executeCommands(state);
  // 3. the clash clock runs against the cap, which lane ends read (12); 4. the AI thinks only of the power (S16)
  // 5–7. targeting, movement and separation, and attacks, none on the muster's ticks (§5.6, R2-Q11)
  if (!inMuster(state)) {
    targetingSystem(state);
    movementSystem(state);
    attackSystem(state);
  }
  // 8. hits due this tick, then the spore clouds' pulses
  resolveHitsSystem(state);
  if (state.clouds) cloudSystem(state);
  // 9. healing; 10. deaths, with `unitDeath` triggers; 11. merging on the field
  healingSystem(state);
  deathSystem(state);
  mergingSystem(state);
  // 12. lane ends: each lane's lock, and its freeze
  laneEndSystem(state);
  // 13. once every lane has ended, the round is scored, the battle's end checked, and the battle enters the aftermath
  if (clashOver(state)) endClash(state);
  // 14. stats sampling (T057)
}
