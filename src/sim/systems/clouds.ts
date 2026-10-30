// Combat rework `sporeCloud` (balance `sporeCloud`, docs/ideas/combat-rework.md): a listed tower's
// shell leaves a spore cloud where it lands. Clouds live in `state.clouds` in the order they formed.
// On every pulse tick (a fixed cadence on the battle clock) each cloud deals its damage, ignoring
// armor, to every enemy unit whose body is inside it; then clouds that have run out are removed.
import { nearBuffer, queryNear } from '../spatial.ts';
import { MAX_RADIUS } from '../targets.ts';
import { other } from '../state.ts';
import type { BattleState, CloudState, Side } from '../state.ts';
import { unitRadius } from '../world.ts';

/** A cloud where a shell from `sourceBuildingId` landed (hit resolution calls this). */
export function addCloud(state: BattleState, side: Side, lane: number, x: number, y: number, sourceBuildingId: number): void {
  const c = state.rules.cloud!;
  state.clouds!.push({ id: state.nextId++, side, lane, x, y, untilTick: state.tick + c.ticks, sourceBuildingId });
}

/** Is a unit's body at (x, y) with radius `r` inside the cloud? */
export function inCloud(state: BattleState, cl: CloudState, x: number, y: number, r: number): boolean {
  const dx = x - cl.x, dy = y - cl.y, reach = state.rules.cloud!.radius + r;
  return dx * dx + dy * dy <= reach * reach;
}

export function cloudSystem(state: BattleState): void {
  const c = state.rules.cloud;
  const clouds = state.clouds;
  if (!c || !clouds || !clouds.length) return;
  const tick = state.tick;
  if (tick % c.pulseTicks === 0) {
    // a cloud pulses on the cadence ticks after the one it formed on, up to its last tick: seconds / pulse pulses
    for (const cl of clouds) if (tick > cl.untilTick - c.ticks) pulse(state, cl, c.radius, c.damage);
  }
  let w = 0;
  for (let i = 0; i < clouds.length; i++) if (clouds[i]!.untilTick > tick) clouds[w++] = clouds[i]!;
  clouds.length = w;
}

function pulse(state: BattleState, cl: CloudState, radius: number, damage: number): void {
  const enemy = other(cl.side);
  const st = state.stats[cl.side];
  const key = String(cl.sourceBuildingId);
  const n = queryNear(cl.x, cl.y, radius + MAX_RADIUS + 1);
  const near = nearBuffer();
  for (let k = 0; k < n; k++) {
    const v = state.units[near[k]!]!;
    if (v.side !== enemy || v.lane !== cl.lane || v.hp <= 0 || !inCloud(state, cl, v.x, v.y, unitRadius(state, v))) continue;
    const dealt = Math.min(damage, v.hp);
    v.hp -= damage;
    v.lastCombatTick = state.tick;
    if (v.knit) v.knit.hurt = true;
    st.damageDealt += dealt;
    st.damageByBuilding[key] = (st.damageByBuilding[key] ?? 0) + dealt;
    st.damageBySource.sporeCloud = (st.damageBySource.sporeCloud ?? 0) + dealt;
    state.events.push({ t: 'hit', target: v.id, src: cl.sourceBuildingId, amount: damage, eff: 'normal', x: v.x, y: v.y, splash: true });
  }
}
