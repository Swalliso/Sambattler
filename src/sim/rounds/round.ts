// A round's opening (SPEC §4.7 steps 5–11, §14.6's opening steps 1–7): `createBattle` opens round 1, and
// the aftermath's step every later one. Until T055 `openRound` is a stub: it clears the last clash, lets
// the general plan first and a bot or general on the player's side after it, and enters planning. T055
// adds the income, the round's Sporestorm with `roundStarted`, the `battleStart` and `roundStart`
// triggers, and R2a's empty draft step (plan Call 26). It stands beside v1's code until R2b moves it to
// `src/sim/round.ts`.
import type { BattleState, ClashState, Side } from './state.ts';

/**
 * A side's surviving supply in a lane (§6.7): its living units' current supply there, a merged unit its own
 * and a siege unit once, an emplacement none. It's the lane tug's number (§10.2) and what the 45 s cap
 * compares, so it's 0 in planning. A lane that has ended is frozen, so this still equals its lock's survivors.
 */
export function survivingSupply(state: BattleState, side: Side, lane: number): number {
  let supply = 0;
  for (const u of state.units) if (u.side === side && u.lane === lane && u.hp > 0) supply += u.supply;
  return supply;
}

/** A clash starting now, with every lane still fighting: Begin's (T043), or a scenario's that places its units (T029). */
export function newClash(state: BattleState): ClashState {
  return {
    startTick: state.tick,
    lanes: state.lanes.map(() => ({ ended: false, endTick: 0, winner: null, survivors: { player: 0, enemy: 0 }, damageSupply: { player: 0, enemy: 0 }, margin: 0 })),
  };
}

export function openRound(state: BattleState): void {
  // 1. clear events, and the last clash's units, squads, hits and clouds; advance the round, unless this opens the battle
  state.events.length = 0;
  if (state.phase === 'aftermath') {
    state.round++;
    delete state.clash;
    state.squads.length = 0;
    state.units.length = 0;
    state.hits.length = 0;
    if (state.clouds) state.clouds.length = 0;
  }
  // 2–4. income from round 2, the Sporestorm and `roundStarted`, the `roundStart` triggers (T055)
  // 5. the general plans first (§7.2)
  if (state.sides.enemy.ai) generalTurn(state);
  // 6. the draft (R2b: none in R2a, plan Call 26)
  // 7. a bot or general on the player's side plans after it
  if (state.sides.player.ai) playerTurn(state);
  state.phase = 'planning';
}

/**
 * The general's turn (opening step 5, §7.2): T068 fills it with its doctrine or counter change, its buys
 * and its merge toggles, each run at once as a command. Until then it plants nothing. Either way the
 * round's plan goes in `ai.plans` (plan Call 12), and `generalPlanned` follows.
 */
function generalTurn(state: BattleState): void {
  const ss = state.sides.enemy;
  ss.ai!.plans.push({ round: state.round, planted: [], sold: [], income: 0, banked: ss.gold });
  state.events.push({ t: 'generalPlanned', side: 'enemy', planted: [], sold: [] });
}

/**
 * A bot or general on the player's side (opening step 7): T069 fills it with its plant, sell and toggle
 * commands, run at once, and its `beginClash`, left queued, which makes the planning checkpoint (plan
 * Call 14). Until then it plans nothing.
 */
function playerTurn(_state: BattleState): void {}
