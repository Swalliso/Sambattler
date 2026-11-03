// Planning's part of the loop (SPEC §13.5): no ticks. Commands from input run as soon as they're queued, with
// one step, unless the hold keeps them (`phase=planning` or `paused=1`, plan Call 14), so a bot player's
// queued Begin waits for input. The frame renders at alpha 1. Its chrome (§10.2, T095) is Begin, which the
// view shows, the planning hint pinned in the callout lane, and the general's news as the phase opens, both worded here.
import type { Content } from '../../data/registry.ts';
import type { BattleState, Side } from '../../sim/rounds/index.ts';
import { decisionWinner } from '../../sim/rounds/systems/victory.ts';
import { intentOf, KIND_LABEL } from '../../ui/doctrine.ts';
import type { RoundSession } from '../session.ts';

/** One frame of planning: a step when the queue isn't empty and nothing holds it. Returns the alpha to render at. */
export function planningFrame(session: RoundSession, advance: () => void): number {
  if (!session.hold && session.state.queue.length) advance();
  return 1;
}

/**
 * The planning hint (§10.2): the round, your gold and "plan, then press Begin", or "place your opener" in round
 * 1. In the last round it says so, and who leads on the Decision as it stands, by the battle's `decisionBy`
 * (§6.5, X5), from the sim's `decisionWinner`.
 */
export function planningHint(state: BattleState): string {
  const r = state.rules, gold = state.sides.player.gold;
  if (state.round === 1) return `Round 1 · ${gold} gold · place your opener, then press Begin`;
  if (state.round < r.maxRounds) return `Round ${state.round} · ${gold} gold · plan, then press Begin`;
  const side = (s: Side) => ({
    dealt: state.rounds.reduce((n, x) => n + x.damage[s], 0), hp: state.sides[s].heartcapHp, maxHp: state.sides[s].heartcapMaxHp,
  });
  const p = side('player'), e = side('enemy');
  const lead = decisionWinner(r.decisionBy, { player: p, enemy: e }) === 'player' ? 'you lead' : 'the general leads';
  const pct = (x: number, max: number) => `${Math.round((100 * x) / max)}%`;
  const by = r.decisionBy === 'damage' ? `${p.dealt} to ${e.dealt} dealt` : `${pct(p.dealt, e.maxHp)} to ${pct(e.dealt, p.maxHp)} of max HP dealt`;
  return `Round ${state.round}, the last round · ${gold} gold · ${lead} on the Decision, ${by} · press Begin`;
}

/**
 * The general's news as a planning phase opens, for the callout lane (§7.4, §7.5, §7.6, §10.2): in the round a
 * counter activates, "Mother Mold now counters your SWARM"; in round 1 with an intel file, "The Gray Rot remembers
 * your SWARM." Null in any other round, so a counter is called out once, in its activation round.
 */
export function generalNews(content: Content, state: BattleState): string | null {
  const ai = state.sides.enemy.ai;
  const counter = ai?.plans.find((p) => p.round === state.round)?.counter;
  if (counter) return `${intentOf(content, state).name} now counters your ${KIND_LABEL[counter]}`;
  const opening = ai?.counter?.opening;
  if (state.round !== 1 || !opening) return null;
  const faction = content.factions[state.config.enemy.faction]?.name ?? 'the general';
  return `${faction[0]!.toUpperCase()}${faction.slice(1)} remembers your ${opening.kinds.map((k) => KIND_LABEL[k]).join(' and ')}.`;
}
