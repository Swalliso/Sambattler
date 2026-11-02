// The clash's own rules in rounds (SPEC §5.6, §6.7, §14.6 clash steps 3, 12 and 13): the muster's 20 still
// ticks, the clock against the 45 s cap, and each lane's end. A lane ends on the first tick one side has no
// units and no emplacements left in it, or at the cap on surviving supply. Its lock is written that tick and
// `laneWon` emitted, and the lane freezes: its hits in flight and clouds are dropped here, and the other
// systems skip its units (`frozen`, `world.ts`). Once every lane has ended, the step hands the clash to
// scoring (`endClash`, `round.ts`).
import { survivingSupply } from '../round.ts';
import type { BattleState, Side } from '../state.ts';
import { unitDef } from '../world.ts';

/**
 * Is this one of the muster's ticks, `startTick + 1` to `startTick + musterTicks`? The muster resolved inside
 * Begin, and its ticks skip targeting, movement, separation and attacks (§5.6, R2-Q11).
 */
export function inMuster(state: BattleState): boolean {
  return state.tick <= state.clash!.startTick + state.rules.musterTicks;
}

/** The tick the cap falls on: `startTick + clashCapTicks`, the muster's ticks counted (§6.7, #13). */
export const capTick = (state: BattleState): number => state.clash!.startTick + state.rules.clashCapTicks;

/** Has every lane's clash ended? Then the clash has (§4.7 step 17). */
export const clashOver = (state: BattleState): boolean => state.clash!.lanes.every((l) => l.ended);

/** A side's supply toward Heartcap damage in a lane: its surviving supply, with each siege unit counting `siegeHeartcapMult` times (§6.7). */
function damageSupply(state: BattleState, side: Side, lane: number): number {
  let supply = 0;
  for (const u of state.units) {
    if (u.side !== side || u.lane !== lane || u.hp <= 0) continue;
    supply += unitDef(state, u).siege ? u.supply * state.rules.siegeHeartcapMult : u.supply;
  }
  return supply;
}

/** Does a side still stand in a lane, with a unit or an emplacement (§6.7)? */
function standing(state: BattleState, side: Side, lane: number): boolean {
  for (const u of state.units) if (u.side === side && u.lane === lane && u.hp > 0) return true;
  return false;
}

/**
 * §14.6's clash step 12 (§6.7, A030). A lane still fighting ends when a side has nothing left in it: the side
 * left wins, with its whole damage supply as the margin, and with neither left it's drawn (E1, E2, E4, E6).
 * At the cap every lane still fighting ends on surviving supply, siege units counted once: more wins, with
 * the margin its damage supply less the loser's, never below 0 (#22), and a tie is drawn, emplacements only
 * on both sides among them (E3, E5). The lock keeps what scoring reads, and the lane freezes.
 */
export function laneEndSystem(state: BattleState): void {
  const clash = state.clash!;
  const atCap = state.tick >= capTick(state);
  let ended = 0;
  clash.lanes.forEach((lock, lane) => {
    if (lock.ended) return;
    const player = standing(state, 'player', lane), enemy = standing(state, 'enemy', lane);
    const capped = player && enemy;
    if (capped && !atCap) return;
    const survivors = { player: survivingSupply(state, 'player', lane), enemy: survivingSupply(state, 'enemy', lane) };
    const dmg = { player: damageSupply(state, 'player', lane), enemy: damageSupply(state, 'enemy', lane) };
    let winner: Side | null = null;
    if (!capped) winner = player ? 'player' : enemy ? 'enemy' : null;
    else if (survivors.player !== survivors.enemy) winner = survivors.player > survivors.enemy ? 'player' : 'enemy';
    const margin = winner ? Math.max(0, dmg[winner] - dmg[winner === 'player' ? 'enemy' : 'player']) : 0;
    Object.assign(lock, { ended: true, endTick: state.tick, winner, capped, survivors, damageSupply: dmg, margin });
    state.events.push({ t: 'laneWon', lane, winner, survivors: { ...survivors }, capped });
    ended |= 1 << lane;
  });
  if (ended) dropIn(state, ended);
}

/**
 * The lanes that just ended drop their hits in flight and their spore clouds (R2-Q11): nothing in a frozen
 * lane can fire or burst again, so this runs once, as each lane locks. `lanes` is a bit a lane.
 */
function dropIn(state: BattleState, lanes: number): void {
  const hits = state.hits;
  let w = 0;
  for (const h of hits) if (h.lane < 0 || !(lanes & (1 << h.lane))) hits[w++] = h;
  hits.length = w;
  const clouds = state.clouds;
  if (!clouds) return;
  w = 0;
  for (const c of clouds) if (!(lanes & (1 << c.lane))) clouds[w++] = c;
  clouds.length = w;
}
