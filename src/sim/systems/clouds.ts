// Combat rework `sporeCloud` (balance `sporeCloud`, docs/ideas/combat-rework.md): a listed tower's
// shell leaves a spore cloud where it lands, and with `burster` (balance `burst`) so does a Burster's
// burst. Clouds live in `state.clouds` in the order they formed. On every pulse tick (a fixed cadence
// on the battle clock) each cloud deals its damage, ignoring armor, to every enemy unit whose body is
// inside it; then clouds that have run out are removed.
import { nearBuffer, queryNear } from '../spatial.ts';
import { MAX_RADIUS } from '../targets.ts';
import { other } from '../state.ts';
import type { BattleState, CloudSpec, CloudState, Side, UnitState } from '../state.ts';
import { soakShield, tierDef, unitRadius } from '../world.ts';

/** A cloud of `spec` at (x, y), credited to `sourceBuildingId` (hit resolution and bursts call this). */
export function addCloud(state: BattleState, side: Side, lane: number, x: number, y: number, sourceBuildingId: number, spec: CloudSpec): void {
  state.clouds!.push({
    id: state.nextId++, side, lane, x, y, radius: spec.radius, damage: spec.damage, pulseTicks: spec.pulseTicks,
    fromTick: state.tick, untilTick: state.tick + spec.ticks, sourceBuildingId,
  });
}

/** Is a unit's body at (x, y) with radius `r` inside the cloud? */
export function inCloud(cl: CloudState, x: number, y: number, r: number): boolean {
  const dx = x - cl.x, dy = y - cl.y, reach = cl.radius + r;
  return dx * dx + dy * dy <= reach * reach;
}

export function cloudSystem(state: BattleState): void {
  const clouds = state.clouds;
  if (!clouds || !clouds.length) return;
  const tick = state.tick;
  // a cloud pulses on the cadence ticks after the one it formed on, up to its last tick: seconds / pulse pulses
  for (const cl of clouds) if (tick > cl.fromTick && tick % cl.pulseTicks === 0) pulse(state, cl);
  let w = 0;
  for (let i = 0; i < clouds.length; i++) if (clouds[i]!.untilTick > tick) clouds[w++] = clouds[i]!;
  clouds.length = w;
}

function pulse(state: BattleState, cl: CloudState): void {
  const enemy = other(cl.side);
  const n = queryNear(cl.x, cl.y, cl.radius + MAX_RADIUS + 1);
  const near = nearBuffer();
  for (let k = 0; k < n; k++) {
    const v = state.units[near[k]!]!;
    if (v.side !== enemy || v.lane !== cl.lane || v.hp <= 0 || v.burrowed || !inCloud(cl, v.x, v.y, unitRadius(state, v))) continue;
    if (v.flying && !state.rules.flying!.cloudsReach) continue; // combat rework `flyers`
    strike(state, cl.side, v, cl.damage, cl.sourceBuildingId, 'sporeCloud', cl.sourceBuildingId);
  }
}

/** Armor-ignoring damage to `v` (a shield soaks it first), with its stats and hit event. */
function strike(state: BattleState, side: Side, v: UnitState, damage: number, sourceBuildingId: number, source: string, src: number): void {
  const st = state.stats[side];
  const key = String(sourceBuildingId);
  const toHp = soakShield(v, damage);
  const dealt = damage - toHp + Math.min(toHp, v.hp);
  v.hp -= toHp;
  v.lastCombatTick = state.tick;
  if (v.knit) v.knit.hurt = true;
  st.damageDealt += dealt;
  st.damageByBuilding[key] = (st.damageByBuilding[key] ?? 0) + dealt;
  st.damageBySource[source] = (st.damageBySource[source] ?? 0) + dealt;
  state.events.push({ t: 'hit', target: v.id, src, amount: damage, eff: 'normal', x: v.x, y: v.y, splash: true });
}

/**
 * Combat rework `burster`: `burst` unit `u` bursts at (x, y) and is spent. Its tier damage, ignoring
 * armor, goes to every enemy unit of its lane whose body is within its splash radius of the point, and
 * a spore cloud forms there. Never buildings or friends.
 */
export function burstUnit(state: BattleState, u: UnitState, x: number, y: number): void {
  const t = tierDef(state, u);
  const damage = Math.max(1, Math.round(t.damage));
  const enemy = other(u.side);
  u.burst = true;
  if (u.hp > 0) u.hp = 0;
  for (const v of state.units) {
    if (v.side !== enemy || v.lane !== u.lane || v.hp <= 0 || v.burrowed || v.flying) continue; // a burst can't reach a flyer
    const dx = v.x - x, dy = v.y - y;
    if (Math.sqrt(dx * dx + dy * dy) - unitRadius(state, v) > t.splashRadius) continue;
    strike(state, u.side, v, damage, u.sourceBuildingId, u.unitId, u.id);
  }
  addCloud(state, u.side, u.lane, x, y, u.sourceBuildingId, state.rules.burst!.cloud);
  state.events.push({ t: 'burst', side: u.side, id: u.id, x, y, radius: t.splashRadius });
}
