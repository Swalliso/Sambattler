// Attacks, projectiles, damage and deaths in a clash (SPEC §5.3, §6.7, §13.4): v1's `systems/combat.ts`, typed
// on rounds' state, without Heartcap turrets, damage to buildings and the Heartcap, `spawnerDefense`, the
// storm's unit and tower multiplier or `releaseStored`. Siege's ×2 stays, against Structure armor, which only
// an emplacement has (§11.1). An emplacement fires as a tower did, from its centre within its firing band, and
// it pins nothing.
import { fireTriggers } from '../effects.ts';
import { insertHit } from '../hits.ts';
import { addCloud, burstUnit } from './clouds.ts';
import { POWER_SOURCE_ID, other } from '../state.ts';
import type { Armor, BattleState, DamageType, Effectiveness, PendingHit, Rules, Side, UnitState } from '../state.ts';
import { nearBuffer, queryNear } from '../spatial.ts';
import { MAX_RADIUS, edgeDistance, tp } from '../targets.ts';
import { clashTick, findUnit, frozen, isEmplacement, placeOf, soakShield, tierDef, unitDef, unitRadius } from '../world.ts';

const EPS = 1e-6;

function fire(
  state: BattleState, side: Side, sourceId: number, fromX: number, fromY: number, lane: number, targetId: number,
  distance: number, damage: number, damageType: DamageType, projectileSpeed: number, splashRadius: number,
  siegeMult: number, slayerMult: number, sourceBuildingId: number, sourceType: string,
): void {
  const ranged = projectileSpeed > 0;
  const delay = ranged ? Math.ceil((distance / projectileSpeed) * state.rules.tickRate) : 0;
  insertHit(state, {
    tick: state.tick + delay, sourceId, seq: state.nextHitSeq++, side, targetId,
    x: tp.x, y: tp.y, fromX, fromY, fireTick: state.tick, lane,
    damage, damageType, splashRadius, siegeMult, slayerMult, sourceBuildingId, sourceType, ranged,
  });
}

/** Pinning (SPEC §5.3): does an enemy unit stand within `radius` tiles (edge distance) of `u`? An emplacement pins nothing (§6.7). */
export function isPinned(state: BattleState, u: UnitState, radius: number): boolean {
  const r = unitRadius(state, u);
  const n = queryNear(u.x, u.y, radius + r + MAX_RADIUS + 1);
  const near = nearBuffer();
  for (let k = 0; k < n; k++) {
    const v = state.units[near[k]!]!;
    if (v.side === u.side || v.lane !== u.lane || v.hp <= 0 || v.burrowed || isEmplacement(state, v)) continue;
    const dx = v.x - u.x, dy = v.y - u.y;
    const reach = radius + r + unitRadius(state, v);
    if (dx * dx + dy * dy <= reach * reach) return true;
  }
  return false;
}

/**
 * Pinning (`rules.pin`): a pinned ranged unit's attack cooldown runs on only `permille` ticks in 1000,
 * spread evenly (on the clash's clock, phased by the unit's arrival, T149), so it attacks at that share of
 * its rate. True on the ticks its cooldown skips.
 */
function pinSkips(state: BattleState, u: UnitState, pin: NonNullable<Rules['pin']>): boolean {
  if (((clashTick(state) + u.arrival) * pin.permille) % 1000 < pin.permille) return false;
  return unitDef(state, u).tags.includes('ranged') && isPinned(state, u, pin.radius);
}

export function attackSystem(state: BattleState): void {
  const tick = state.tick;
  const pin = state.rules.pin;
  const bursts = !!state.rules.burst;
  for (const u of state.units) {
    if (bursts && u.hp <= 0) continue; // struck down by a burst earlier this tick
    if (frozen(state, u.lane)) continue; // an ended lane holds still (§6.7)
    if (u.cooldown > 0 && !(pin && pinSkips(state, u, pin))) u.cooldown--;
    if (u.cooldown > 0 || u.targetId === 0) continue;
    const def = unitDef(state, u);
    if (def.support) continue; // healers hold at range and never attack
    const t = tierDef(state, u);
    // an emplacement measures from its centre, within its firing band (§6.7)
    const em = def.emplacement;
    const d = edgeDistance(state, u.x, u.y, em ? 0 : t.radius, u.targetId, other(u.side), u.lane);
    if (d < 0 || d > t.range + EPS || (em && d < em.minRange - EPS)) continue;
    // a burst unit that reaches its target bursts on it instead of attacking (§5.3)
    if (bursts && def.tags.includes('burst')) { burstUnit(state, u, tp.x, tp.y); continue; }
    u.cooldown = t.attackTicks;
    u.lastAttackTick = tick;
    fire(state, u.side, u.id, u.x, u.y, u.lane, u.targetId, d, t.damage,
      def.damageType, def.projectileSpeed, t.splashRadius, t.siegeMult, t.slayerMult, u.sourceBuildingId, u.unitId);
  }
}

let effMult = 1;

/** The tag multiplier (SPEC §5.3): the attacker's siege multiplier vs structure, times its slayer multiplier vs tier ≥ 2. */
export function tagMult(siegeMult: number, slayerMult: number, armor: Armor, tier: number): number {
  let tag = 1;
  if (siegeMult !== 1 && armor === 'structure') tag *= siegeMult;
  if (slayerMult !== 1 && tier >= 2) tag *= slayerMult;
  return tag;
}

/**
 * The damage formula (SPEC §5.3): attacker-side damage (base × tier × upgrades) times the matrix, tag
 * multipliers (the attacker's siege multiplier vs structure, its slayer multiplier vs tier ≥ 2) and the
 * target's merge-perk resistances, rounded, minimum 1. Also records the combined matrix × tag multiplier
 * for the effectiveness class.
 */
export function damageFor(
  r: Rules, attackerDamage: number, type: DamageType, siegeMult: number, slayerMult: number,
  armor: Armor, tier: number, targetMult: number,
): number {
  const tag = tagMult(siegeMult, slayerMult, armor, tier);
  const matrix = r.matrix[type][armor];
  effMult = matrix * tag;
  const dmg = Math.round(attackerDamage * matrix * tag * targetMult);
  return dmg < 1 ? 1 : dmg;
}

function classify(state: BattleState, m: number): Effectiveness {
  return m >= state.rules.strongAt ? 'strong' : m <= state.rules.weakAt ? 'weak' : 'normal';
}

/** Applies one hit (or its splash share) to a target unit. */
function applyDamage(state: BattleState, h: PendingHit, targetId: number, falloff: number, ix: number, iy: number): void {
  const u = targetId > 0 ? findUnit(state, targetId) : undefined;
  if (!u) return;
  const dmg = damageFor(state.rules, h.damage * falloff, h.damageType, h.siegeMult, h.slayerMult, unitDef(state, u).armor, u.tier,
    tierDef(state, u).resist[h.damageType]);
  const combined = effMult;
  const toHp = soakShield(u, dmg); // the arrival shield takes the blow first (§5.3)
  const dealt = dmg - toHp + Math.min(toHp, u.hp);
  u.hp -= toHp;
  u.lastCombatTick = state.tick;
  if (u.knit) u.knit.hurt = true;
  const attacker = h.sourceId > 0 ? findUnit(state, h.sourceId) : undefined;
  if (attacker) attacker.lastCombatTick = state.tick;
  const st = state.stats[h.side];
  st.damageDealt += dealt;
  const key = String(h.sourceBuildingId);
  st.damageByBuilding[key] = (st.damageByBuilding[key] ?? 0) + dealt;
  st.damageBySource[h.sourceType] = (st.damageBySource[h.sourceType] ?? 0) + dealt;
  state.events.push({ t: 'hit', target: targetId, src: h.sourceId, amount: dmg, eff: classify(state, combined), x: ix, y: iy, splash: falloff !== 1 });
}

export function resolveHitsSystem(state: BattleState): void {
  const hits = state.hits;
  let n = 0;
  while (n < hits.length && hits[n]!.tick <= state.tick) n++;
  if (n === 0) return;
  const falloff = state.rules.splashFalloff;
  const cloud = state.rules.cloud;
  const cleave = state.rules.cleave;
  for (let i = 0; i < n; i++) {
    const h = hits[i]!;
    const enemy = other(h.side);
    let ix = h.x, iy = h.y;
    const u = h.targetId > 0 ? findUnit(state, h.targetId) : undefined;
    if (u && u.hp > 0) {
      ix = u.x; iy = u.y;
      applyDamage(state, h, h.targetId, 1, ix, iy);
    }
    if (cloud && cloud.buildings.includes(h.sourceType)) addCloud(state, h.side, h.lane, ix, iy, h.sourceBuildingId, cloud);
    if (h.splashRadius > 0) {
      const s = h.splashRadius;
      // splash falls off around a struck target; a ground burst (no target) hits everything at full damage
      const share = h.targetId === 0 ? 1 : falloff;
      // cleave: a listed unit's swing hits the units around its target at full damage (§5.3)
      const unitShare = cleave && cleave.units.includes(h.sourceType) ? 1 : share;
      const cnt = queryNear(ix, iy, s + MAX_RADIUS + 1);
      const near = nearBuffer();
      for (let k = 0; k < cnt; k++) {
        const v = state.units[near[k]!]!;
        if (v.side !== enemy || v.lane !== h.lane || v.hp <= 0 || v.id === h.targetId || v.burrowed) continue;
        const dx = v.x - ix, dy = v.y - iy;
        if (Math.sqrt(dx * dx + dy * dy) - unitRadius(state, v) <= s) applyDamage(state, h, v.id, unitShare, v.x, v.y);
      }
    }
  }
  hits.splice(0, n);
}

/**
 * A burst at a point that strikes at once (Spore Burst, SPEC §11.10): full damage, through the matrix, to
 * every enemy unit whose body is within `radius`, emplacements included (§6.7), in any lane still fighting:
 * an ended lane holds still (R2-Q11, A053). Returns the number of units struck.
 */
export function burstAt(state: BattleState, side: Side, x: number, y: number, radius: number, damage: number, damageType: DamageType, sourceType: string): number {
  const enemy = other(side);
  const h: PendingHit = {
    tick: state.tick, sourceId: 0, seq: 0, side, targetId: 0, x, y, fromX: x, fromY: y, fireTick: state.tick, lane: -1,
    damage, damageType, splashRadius: 0, siegeMult: 1, slayerMult: 1, sourceBuildingId: POWER_SOURCE_ID, sourceType, ranged: false,
  };
  let n = 0;
  for (const u of state.units) {
    if (u.side !== enemy || u.hp <= 0 || u.burrowed || frozen(state, u.lane)) continue;
    const dx = u.x - x, dy = u.y - y;
    if (Math.sqrt(dx * dx + dy * dy) - unitRadius(state, u) > radius) continue;
    applyDamage(state, h, u.id, 1, u.x, u.y);
    n++;
  }
  return n;
}

/**
 * Each `burst` unit that fell this tick without bursting bursts where it fell (§5.3). A burst can fell
 * another, which bursts in turn, so this repeats until none is left (in id order).
 */
function burstFallen(state: BattleState): void {
  for (let again = true; again;) {
    again = false;
    for (const u of state.units) {
      if (u.hp > 0 || u.burst || !unitDef(state, u).tags.includes('burst')) continue;
      burstUnit(state, u, u.x, u.y);
      again = true;
    }
  }
}

/**
 * Removes dead units after all hits resolve (SPEC §5.3), then fires `unitDeath` triggers for each, and the other
 * side's `enemyUnitKilled` (Rot-Eater). A squad is its units by source building after the muster (A099): when
 * its last unit dies, its side's `squadWiped` triggers fire once, where that unit fell (Martyr's Bloom). A
 * squad the muster absorbed whole has no units left to die, and one that has died out can't again.
 */
export function deathSystem(state: BattleState): void {
  const units = state.units;
  if (state.rules.burst) burstFallen(state);
  const fallen: UnitState[] = [];
  let w = 0;
  for (let i = 0; i < units.length; i++) {
    const u = units[i]!;
    if (u.hp > 0) { units[w++] = u; continue; }
    state.stats[u.side].unitsLost++;
    state.events.push({ t: 'died', id: u.id, side: u.side, unitId: u.unitId, x: u.x, y: u.y });
    for (const h of state.hits) if (h.targetId === u.id) { h.x = u.x; h.y = u.y; }
    const def = unitDef(state, u);
    const ctx = {
      x: u.x, y: u.y, lane: u.lane, unitId: u.unitId, tier: u.tier, tags: def.tags, sourceBuildingId: u.sourceBuildingId, place: placeOf(state, u),
    };
    fireTriggers(state, u.side, 'unitDeath', ctx);
    fireTriggers(state, other(u.side), 'enemyUnitKilled', ctx);
    fallen.push(u);
  }
  units.length = w;
  wipedSquads(state, fallen);
}

/** Fires `squadWiped` for each squad whose last unit fell this tick, at that unit, in the order they fell. */
function wipedSquads(state: BattleState, fallen: readonly UnitState[]): void {
  for (let i = 0; i < fallen.length; i++) {
    const u = fallen[i]!;
    if (!state.compiled[u.side].triggers.some((t) => t.on === 'squadWiped')) continue;
    // its last unit is the latest of its squad to fall, and none of the squad still stands
    if (fallen.some((v, j) => j > i && v.side === u.side && v.sourceBuildingId === u.sourceBuildingId)) continue;
    if (state.units.some((v) => v.side === u.side && v.sourceBuildingId === u.sourceBuildingId)) continue;
    fireTriggers(state, u.side, 'squadWiped', {
      x: u.x, y: u.y, lane: u.lane, unitId: u.unitId, tier: u.tier, tags: unitDef(state, u).tags, sourceBuildingId: u.sourceBuildingId, place: placeOf(state, u),
    });
  }
}
