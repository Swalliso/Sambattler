// Endings (SPEC §6.5): Rout when a Heartcap falls (simultaneous → the player loses), or a
// Decision at the time limit: more columns, then higher Heartcap HP fraction, else the general.
import type { BattleState, Side } from '../state.ts';
import { columnsOwned } from '../world.ts';

export function victorySystem(state: BattleState): void {
  const p = state.sides.player, e = state.sides.enemy;
  let winner: Side | undefined;
  let by: 'rout' | 'decision' = 'rout';
  if (p.heartcapHp <= 0 || e.heartcapHp <= 0) {
    winner = p.heartcapHp <= 0 ? 'enemy' : 'player';
  } else if (state.tick >= state.rules.timeLimitTicks) {
    by = 'decision';
    winner = decisionWinner(state);
  }
  if (!winner) return;
  state.outcome = { winner, by, tick: state.tick };
  state.phase = 'ended';
  // a draft that opened this tick is moot once the battle is over
  state.held = false;
  state.sides.player.draft = undefined;
  state.sides.enemy.draft = undefined;
  state.events.push({ t: 'ended', winner, by });
}

export function decisionWinner(state: BattleState): Side {
  const pc = columnsOwned(state, 'player'), ec = columnsOwned(state, 'enemy');
  if (pc !== ec) return pc > ec ? 'player' : 'enemy';
  const p = state.sides.player, e = state.sides.enemy;
  // compare HP fractions exactly: pHp / pMax vs eHp / eMax
  const lhs = p.heartcapHp * e.heartcapMaxHp, rhs = e.heartcapHp * p.heartcapMaxHp;
  if (lhs !== rhs) return lhs > rhs ? 'player' : 'enemy';
  return 'enemy';
}
