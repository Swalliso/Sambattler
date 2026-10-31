// Attacks, projectiles, damage and deaths (SPEC §5.3, §4.5 turrets).
import { fireBreaches, fireTriggers, runAction } from '../effects.ts';
import { insertHit } from '../hits.ts';
import { addCloud } from './clouds.ts';
import { releaseStored } from './spawning.ts';
import { HEARTCAP_ID, POWER_SOURCE_ID, SIDES, other } from '../state.ts';
import type { Armor, BattleState, DamageType, Effectiveness, PendingHit, Side, UnitState } from '../state.ts';
import { nearBuffer, queryNear } from '../spatial.ts';
import { MAX_RADIUS, edgeDistance, tp } from '../targets.ts';
import { buildingDef, findBuilding, findUnit, heartcapEdgeX, rectDistance, soakShield, supplyCapOf, tierDef, unitDef, unitRadius } from '../world.ts';

const EPS = 1e-6;

/** Source id used in hits fired by Heartcap turrets. */
export function turretSourceId(side: Side, index: number): number {
  return side === 'player' ? -(100 + index) : -(200 + index);
}

/** Turret position for turret `index` (lane-major). */
export function turretPos(state: BattleState, side: Side, index: number, out: { x: number; y: number; lane: number }): void {
  const per = state.compiled[side].turret.perLane;
  const lane = Math.floor(index / per);
  const j = index % per;
  const L = state.lanes[lane]!;
  const h = L.rowEnd + 1 - L.rowStart;
  out.x = heartcapEdgeX(state, side);
  out.y = L.rowStart + (h * (j + 1)) / (per + 1);
  out.lane = lane;
}

function stormMult(state: BattleState): number {
  return 1 + state.rules.storm.unitDamage * state.sporestorm;
}

function fire(
  state: BattleState, side: Side, sourceId: number, fromX: number, fromY: number, lane: number, targetId: number,
  distance: number, damage: number, damageType: DamageType, projectileSpeed: number, splashRadius: number,
  siegeMult: number, slayerMult: number, sourceBuildingId: number, sourceType: string,
): void {
  const ranged = projectileSpeed > 0;
  const delay = ranged ? Math.ceil((distance / projectileSpeed) * state.rules.tickRate) : 0;
  insertHit(state, {
    tick: state.tick + delay, sourceId, seq: state.nextHitSeq++, side, targetId,
    x: tp.cx, y: tp.cy, fromX, fromY, fireTick: state.tick, lane,
    damage, damageType, splashRadius, siegeMult, slayerMult, sourceBuildingId, sourceType, ranged,
  });
}

/**
 * Prototype B3 (balance `firingCongestion`): a ranged shot loses damage when at least `freeRanks`
 * friendly ranged units stand between the shooter and its target, within the corridor's half-width
 * of the line of fire.
 */
function congestionMult(state: BattleState, u: UnitState, tx: number, ty: number): number {
  const c = state.rules.congestion!;
  const lx = tx - u.x, ly = ty - u.y;
  const len2 = lx * lx + ly * ly;
  if (len2 < 1e-9) return 1;
  const len = Math.sqrt(len2);
  let blockers = 0;
  const n = queryNear((u.x + tx) / 2, (u.y + ty) / 2, len / 2 + c.halfWidth + MAX_RADIUS);
  const near = nearBuffer();
  for (let k = 0; k < n; k++) {
    const v = state.units[near[k]!]!;
    if (v === u || v.side !== u.side || v.lane !== u.lane || v.hp <= 0) continue;
    if (unitDef(state, v).projectileSpeed <= 0) continue;
    const along = ((v.x - u.x) * lx + (v.y - u.y) * ly) / len;
    if (along <= 0 || along >= len) continue;
    const across = Math.abs((v.x - u.x) * ly - (v.y - u.y) * lx) / len;
    if (across <= c.halfWidth && ++blockers >= c.freeRanks) return c.mult;
  }
  return 1;
}

/**
 * Prototype T3 (balance `spawnerDefense`): spawners (only those wholly in their side's home columns
 * with `homeOnly`) shoot the nearest enemy unit within range of their footprint. They use the
 * building's tower cooldown, which spawners otherwise leave at 0.
 */
function spawnerDefense(state: BattleState, storm: number): void {
  const sd = state.rules.spawnerDefense!;
  const W = state.map.width, home = state.map.homeCols;
  for (const b of state.buildings) {
    const def = buildingDef(state, b);
    if (!def.spawn || def.attack) continue;
    if (sd.homeOnly && (b.side === 'player' ? b.col + def.w > home : b.col < W - home)) continue;
    if (b.cooldown > 0) b.cooldown--;
    if (b.cooldown > 0) continue;
    const enemy = other(b.side);
    const cx = b.col + def.w / 2, cy = b.row + def.h / 2;
    let best = 0, bestD = Infinity;
    const n = queryNear(cx, cy, sd.range + def.w + def.h + MAX_RADIUS);
    const near = nearBuffer();
    for (let k = 0; k < n; k++) {
      const v = state.units[near[k]!]!;
      if (v.side !== enemy || v.lane !== b.lane || v.hp <= 0 || v.burrowed) continue;
      let d = rectDistance(v.x, v.y, b.col, b.row, def.w, def.h) - unitRadius(state, v);
      if (d < 0) d = 0;
      if (d <= sd.range && (d < bestD || (d === bestD && v.id < best))) { best = v.id; bestD = d; }
    }
    if (best === 0) continue;
    const dist = edgeDistance(state, cx, cy, 0, best, enemy, b.lane);
    b.cooldown = sd.intervalTicks;
    b.lastAttackTick = state.tick;
    fire(state, b.side, b.id, cx, cy, b.lane, best, dist, sd.damage * storm, sd.damageType, sd.projectileSpeed, 0, 1, 1, b.id, 'spawnerDefense');
  }
}

/** Combat rework `pinned`: does an enemy unit stand within `radius` tiles (edge distance) of `u`? */
export function isPinned(state: BattleState, u: UnitState, radius: number): boolean {
  const r = unitRadius(state, u);
  const n = queryNear(u.x, u.y, radius + r + MAX_RADIUS + 1);
  const near = nearBuffer();
  for (let k = 0; k < n; k++) {
    const v = state.units[near[k]!]!;
    if (v.side === u.side || v.lane !== u.lane || v.hp <= 0 || v.burrowed) continue;
    const dx = v.x - u.x, dy = v.y - u.y;
    const reach = radius + r + unitRadius(state, v);
    if (dx * dx + dy * dy <= reach * reach) return true;
  }
  return false;
}

/**
 * Combat rework `pinned` (balance `pinned`): a pinned ranged unit's attack cooldown runs on only
 * `permille` ticks in 1000, spread evenly (phased by unit id), so it attacks at that share of its
 * rate. True on the ticks its cooldown skips.
 */
function pinSkips(state: BattleState, u: UnitState, pin: NonNullable<BattleState['rules']['pin']>): boolean {
  if (((state.tick + u.id) * pin.permille) % 1000 < pin.permille) return false;
  return unitDef(state, u).tags.includes('ranged') && isPinned(state, u, pin.radius);
}

const turretScratch = { x: 0, y: 0, lane: 0 };

export function attackSystem(state: BattleState): void {
  const tick = state.tick;
  const storm = stormMult(state);
  const pin = state.rules.pin;
  for (const u of state.units) {
    if (u.cooldown > 0 && !(pin && pinSkips(state, u, pin))) u.cooldown--;
    if (u.cooldown > 0 || u.targetId === 0) continue;
    const def = unitDef(state, u);
    if (def.support) continue; // healers hold at range and never attack
    const t = def.tiers[u.tier - 1]!;
    const d = edgeDistance(state, u.x, u.y, t.radius, u.targetId, other(u.side), u.lane);
    if (d < 0 || d > t.range + EPS) continue;
    u.cooldown = t.attackTicks;
    u.lastAttackTick = tick;
    const crowd = state.rules.congestion && def.projectileSpeed > 0 ? congestionMult(state, u, tp.cx, tp.cy) : 1;
    fire(state, u.side, u.id, u.x, u.y, u.lane, u.targetId, d, t.damage * storm * crowd,
      def.damageType, def.projectileSpeed, t.splashRadius, t.siegeMult, t.slayerMult, u.sourceBuildingId, u.unitId);
  }
  for (const b of state.buildings) {
    const def = buildingDef(state, b);
    const a = def.attack;
    if (!a) continue;
    if (b.cooldown > 0) b.cooldown--;
    if (b.cooldown > 0 || b.targetId === 0) continue;
    const cx = b.col + def.w / 2, cy = b.row + def.h / 2;
    const d = edgeDistance(state, cx, cy, 0, b.targetId, other(b.side), b.lane);
    if (d < 0 || d < a.minRange - EPS || d > a.range + EPS) continue;
    b.cooldown = a.intervalTicks;
    b.lastAttackTick = tick;
    b.hasProduced = true;
    fire(state, b.side, b.id, cx, cy, b.lane, b.targetId, d, a.damage * storm, a.damageType, a.projectileSpeed,
      a.splashRadius, 1, 1, b.id, b.buildingId);
  }
  if (state.rules.spawnerDefense) spawnerDefense(state, storm);
  if (!state.rules.test.turrets) return;
  for (const side of SIDES) {
    const ss = state.sides[side];
    const t = state.compiled[side].turret;
    const enemy = other(side);
    const mult = Math.max(0, 1 + state.rules.storm.turretDamage * state.sporestorm);
    for (let i = 0; i < ss.turretCooldowns.length; i++) {
      if (ss.turretCooldowns[i]! > 0) ss.turretCooldowns[i]!--;
      if (ss.turretCooldowns[i]! > 0) continue;
      turretPos(state, side, i, turretScratch);
      const { x, y, lane } = turretScratch;
      // nearest enemy unit in range, else nearest enemy building
      let best = 0, bestD = Infinity;
      const n = queryNear(x, y, t.range + MAX_RADIUS);
      const near = nearBuffer();
      for (let k = 0; k < n; k++) {
        const v = state.units[near[k]!]!;
        if (v.side !== enemy || v.lane !== lane || v.hp <= 0 || v.burrowed) continue;
        const dx = v.x - x, dy = v.y - y;
        let d = Math.sqrt(dx * dx + dy * dy) - unitRadius(state, v);
        if (d < 0) d = 0;
        if (d <= t.range && (d < bestD || (d === bestD && v.id < best))) { best = v.id; bestD = d; }
      }
      if (best === 0) {
        for (const o of state.buildings) {
          if (o.side !== enemy || o.lane !== lane || o.hp <= 0) continue;
          const od = buildingDef(state, o);
          const d = rectDistance(x, y, o.col, o.row, od.w, od.h);
          if (d <= t.range && (d < bestD || (d === bestD && o.id < best))) { best = o.id; bestD = d; }
        }
      }
      if (best === 0) continue;
      edgeDistance(state, x, y, 0, best, enemy, lane);
      ss.turretCooldowns[i] = t.intervalTicks;
      fire(state, side, turretSourceId(side, i), x, y, lane, best, bestD, t.damage * mult, t.damageType,
        t.projectileSpeed, 0, 1, 1, 0, 'turret');
    }
  }
}

let effMult = 1;

/**
 * The damage formula (SPEC §5.3): attacker-side damage (base × tier × upgrades × storm) times the
 * matrix, tag multipliers (the attacker's siege multiplier vs structure, its slayer multiplier vs
 * tier ≥ 2) and target-side multipliers (merge-perk resistances, Heartcap storm vulnerability),
 * rounded, minimum 1. Also records the combined matrix × tag multiplier for the effectiveness class.
 */
export function damageFor(
  r: BattleState['rules'], attackerDamage: number, type: DamageType, siegeMult: number, slayerMult: number,
  armor: Armor, tier: number, targetMult: number,
): number {
  let tag = 1;
  if (siegeMult !== 1 && armor === 'structure') tag *= siegeMult;
  if (slayerMult !== 1 && tier >= 2) tag *= slayerMult;
  const matrix = r.matrix[type][armor];
  effMult = matrix * tag;
  const dmg = Math.round(attackerDamage * matrix * tag * targetMult);
  return dmg < 1 ? 1 : dmg;
}

function classify(state: BattleState, m: number): Effectiveness {
  return m >= state.rules.strongAt ? 'strong' : m <= state.rules.weakAt ? 'weak' : 'normal';
}

/** Applies one hit (or its splash share) to a target. */
function applyDamage(state: BattleState, h: PendingHit, targetId: number, falloff: number, ix: number, iy: number): void {
  const r = state.rules;
  let armor: Armor;
  let tier = 1;
  let taken = 1;
  let resist = 1;
  const u = targetId > 0 ? findUnit(state, targetId) : undefined;
  const b = targetId > 0 && !u ? findBuilding(state, targetId) : undefined;
  const heart: Side | undefined = targetId === HEARTCAP_ID.player ? 'player' : targetId === HEARTCAP_ID.enemy ? 'enemy' : undefined;
  if (u) {
    armor = unitDef(state, u).armor; tier = u.tier; resist = tierDef(state, u).resist[h.damageType];
  } else if (b) {
    armor = 'structure';
  } else if (heart) {
    armor = 'structure';
    taken = 1 + r.storm.heartcapTaken * state.sporestorm;
    const shield = state.sides[heart].heartcapShield;
    if (shield && state.tick < shield.untilTick) taken *= shield.takenMult;
  } else {
    return;
  }
  const dmg = damageFor(r, h.damage * falloff, h.damageType, h.siegeMult, h.slayerMult, armor, tier, resist * taken);
  const combined = effMult;
  let dealt = dmg;
  if (r.help && h.sourceId > 0 && (u || b)) noteCall(h.sourceId, targetId);
  if (u) {
    const toHp = soakShield(u, dmg); // combat rework `mixedWave`: a shield takes the blow first
    dealt = dmg - toHp + Math.min(toHp, u.hp);
    u.hp -= toHp;
    u.lastCombatTick = state.tick;
    if (u.knit) u.knit.hurt = true;
  } else if (b) {
    if (dealt > b.hp) dealt = b.hp;
    b.hp -= dmg;
    b.lastDamagedTick = state.tick;
    if (r.suppressBy === 'melee' && !h.ranged) b.lastMeleeDamagedTick = state.tick;
  } else if (heart) {
    const hs = state.sides[heart];
    if (dealt > hs.heartcapHp) dealt = hs.heartcapHp;
    const before = hs.heartcapHp;
    hs.heartcapHp = Math.max(0, hs.heartcapHp - dmg);
    state.stats[heart].heartcapDamageTaken += dealt;
    if (state.compiled[heart].triggers.length) fireBreaches(state, heart, before, { x: ix, y: iy, lane: h.lane, sourceBuildingId: 0 });
  }
  const attacker = h.sourceId > 0 ? findUnit(state, h.sourceId) : undefined;
  if (attacker) attacker.lastCombatTick = state.tick;
  const st = state.stats[h.side];
  st.damageDealt += dealt;
  const key = String(h.sourceBuildingId);
  st.damageByBuilding[key] = (st.damageByBuilding[key] ?? 0) + dealt;
  st.damageBySource[h.sourceType] = (st.damageBySource[h.sourceType] ?? 0) + dealt;
  state.events.push({ t: 'hit', target: targetId, src: h.sourceId, amount: dmg, eff: classify(state, combined), x: ix, y: iy, splash: falloff !== 1 });
}

// Combat rework `callForHelp`: (attacker, victim) pairs from this tick's hits, answered once every
// hit has resolved (splash walks the shared spatial buffer, so the call can't query it mid-loop).
const callAttackers: number[] = [];
const callVictims: number[] = [];

function noteCall(attacker: number, victim: number): void {
  const n = callAttackers.length;
  if (n && callAttackers[n - 1] === attacker && callVictims[n - 1] === victim) return;
  callAttackers.push(attacker);
  callVictims.push(victim);
}

/**
 * Combat rework `callForHelp` (balance `callForHelp`): for each unit or building an enemy unit or
 * tower damaged this tick, every friendly unit in its lane within the radius of it (edge distance)
 * that has no target, can attack and isn't knitting takes the attacker as its target, provided it
 * is a target that unit could have (alive, in the lane). Pairs are answered in the order they were hit.
 */
function answerCalls(state: BattleState): void {
  const radius = state.rules.help!.radius;
  for (let i = 0; i < callAttackers.length; i++) {
    const attacker = callAttackers[i]!, id = callVictims[i]!;
    const vu = findUnit(state, id);
    const vb = vu ? undefined : findBuilding(state, id);
    if (!vu && !vb) continue;
    const side = vu ? vu.side : vb!.side, lane = vu ? vu.lane : vb!.lane;
    const bd = vb ? buildingDef(state, vb) : undefined;
    const ext = vu ? unitRadius(state, vu) : (bd!.w + bd!.h) / 2;
    const cx = vu ? vu.x : vb!.col + bd!.w / 2, cy = vu ? vu.y : vb!.row + bd!.h / 2;
    const n = queryNear(cx, cy, radius + ext + MAX_RADIUS + 1);
    const near = nearBuffer();
    for (let k = 0; k < n; k++) {
      const v = state.units[near[k]!]!;
      if (v.side !== side || v.lane !== lane || v.hp <= 0 || v.targetId !== 0 || v.knit || v.burrowed) continue;
      const rv = unitRadius(state, v);
      let d: number;
      if (vu) { const dx = v.x - vu.x, dy = v.y - vu.y; d = Math.sqrt(dx * dx + dy * dy) - rv - ext; }
      else d = rectDistance(v.x, v.y, vb!.col, vb!.row, bd!.w, bd!.h) - rv;
      if (d > radius || unitDef(state, v).support) continue;
      if (edgeDistance(state, v.x, v.y, rv, attacker, other(side), lane) < 0) continue;
      v.targetId = attacker;
    }
  }
  callAttackers.length = 0;
  callVictims.length = 0;
}

export function resolveHitsSystem(state: BattleState): void {
  const hits = state.hits;
  let n = 0;
  while (n < hits.length && hits[n]!.tick <= state.tick) n++;
  if (n === 0) return;
  const falloff = state.rules.splashFalloff;
  const cloud = state.rules.cloud;
  for (let i = 0; i < n; i++) {
    const h = hits[i]!;
    const enemy = other(h.side);
    let ix = h.x, iy = h.y;
    let alive = false;
    if (h.targetId > 0) {
      const u = findUnit(state, h.targetId);
      if (u) { if (u.hp > 0) { alive = true; ix = u.x; iy = u.y; } }
      else {
        const b = findBuilding(state, h.targetId);
        if (b && b.hp > 0) { alive = true; const bd = buildingDef(state, b); ix = b.col + bd.w / 2; iy = b.row + bd.h / 2; }
      }
    } else if (h.targetId === HEARTCAP_ID[enemy]) {
      alive = state.sides[enemy].heartcapHp > 0;
    }
    if (alive) applyDamage(state, h, h.targetId, 1, ix, iy);
    if (cloud && cloud.buildings.includes(h.sourceType)) addCloud(state, h.side, h.lane, ix, iy, h.sourceBuildingId);
    if (h.splashRadius > 0) {
      const s = h.splashRadius;
      // splash falls off around a struck target; a ground burst (no target) hits everything at full damage
      const share = h.targetId === 0 ? 1 : falloff;
      const cnt = queryNear(ix, iy, s + MAX_RADIUS + 1);
      const near = nearBuffer();
      for (let k = 0; k < cnt; k++) {
        const v = state.units[near[k]!]!;
        if (v.side !== enemy || v.lane !== h.lane || v.hp <= 0 || v.id === h.targetId || v.burrowed) continue;
        const dx = v.x - ix, dy = v.y - iy;
        if (Math.sqrt(dx * dx + dy * dy) - unitRadius(state, v) <= s) applyDamage(state, h, v.id, share, v.x, v.y);
      }
      for (const b of state.buildings) {
        if (b.side !== enemy || b.lane !== h.lane || b.hp <= 0 || b.id === h.targetId) continue;
        const bd = buildingDef(state, b);
        if (rectDistance(ix, iy, b.col, b.row, bd.w, bd.h) <= s) applyDamage(state, h, b.id, share, b.col + bd.w / 2, b.row + bd.h / 2);
      }
    }
  }
  hits.splice(0, n);
  if (callAttackers.length) answerCalls(state);
}

/**
 * A burst at a point that strikes at once (Spore Burst, SPEC §11.10): full damage, through the matrix,
 * to every enemy unit whose body is within `radius` and every enemy building whose footprint is, in
 * any lane. Never the Heartcap. Returns the number of targets struck.
 */
export function burstAt(state: BattleState, side: Side, x: number, y: number, radius: number, damage: number, damageType: DamageType, sourceType: string): number {
  const enemy = other(side);
  const h: PendingHit = {
    tick: state.tick, sourceId: 0, seq: 0, side, targetId: 0, x, y, fromX: x, fromY: y, fireTick: state.tick, lane: -1,
    damage, damageType, splashRadius: 0, siegeMult: 1, slayerMult: 1, sourceBuildingId: POWER_SOURCE_ID, sourceType, ranged: false,
  };
  let n = 0;
  for (const u of state.units) {
    if (u.side !== enemy || u.hp <= 0 || u.burrowed) continue;
    const dx = u.x - x, dy = u.y - y;
    if (Math.sqrt(dx * dx + dy * dy) - unitRadius(state, u) > radius) continue;
    applyDamage(state, h, u.id, 1, u.x, u.y);
    n++;
  }
  for (const b of state.buildings) {
    if (b.side !== enemy || b.hp <= 0) continue;
    const bd = buildingDef(state, b);
    if (rectDistance(x, y, b.col, b.row, bd.w, bd.h) > radius) continue;
    applyDamage(state, h, b.id, 1, b.col + bd.w / 2, b.row + bd.h / 2);
    n++;
  }
  return n;
}

/**
 * Removes dead units and buildings after all hits resolve (SPEC §5.3), then fires `unitDeath`,
 * `enemyUnitKilled` and `buildingDestroyed` triggers and units' own `onDeath` actions (explosions
 * from these land next tick, so chains resolve tick by tick). With prototype B4, units past their
 * lifespan wither here too.
 */
export function deathSystem(state: BattleState): void {
  const units = state.units;
  if (state.rules.lifespan) for (const u of units) if (u.expiresTick !== undefined && u.expiresTick <= state.tick) u.hp = 0; // prototype B4: withering
  let w = 0;
  for (let i = 0; i < units.length; i++) {
    const u = units[i]!;
    if (u.hp > 0) { units[w++] = u; continue; }
    state.sides[u.side].supplyUsed -= u.supply;
    state.stats[u.side].unitsLost++;
    state.events.push({ t: 'died', id: u.id, side: u.side, unitId: u.unitId, x: u.x, y: u.y });
    for (const h of state.hits) if (h.targetId === u.id) { h.x = u.x; h.y = u.y; }
    const def = unitDef(state, u);
    const ctx = { x: u.x, y: u.y, lane: u.lane, unitId: u.unitId, tier: u.tier, tags: def.tags, sourceBuildingId: u.sourceBuildingId };
    fireTriggers(state, u.side, 'unitDeath', ctx);
    fireTriggers(state, other(u.side), 'enemyUnitKilled', ctx);
    const own = state.library.units[u.unitId]?.onDeath;
    if (own) for (const a of own) runAction(state, u.side, a, ctx);
  }
  units.length = w;
  const bs = state.buildings;
  w = 0;
  let utilityLost = false;
  for (let i = 0; i < bs.length; i++) {
    const b = bs[i]!;
    if (b.hp > 0) { bs[w++] = b; continue; }
    if (b.stored) releaseStored(state, b); // combat rework `waves`: the units waiting inside come out
    state.stats[b.side].buildingsLost++;
    state.stats[other(b.side)].buildingsDestroyed++;
    state.events.push({ t: 'buildingDestroyed', id: b.id, side: b.side, buildingId: b.buildingId, col: b.col, row: b.row });
    const bd = buildingDef(state, b);
    if (bd.utility) utilityLost = true;
    fireTriggers(state, b.side, 'buildingDestroyed', {
      x: b.col + bd.w / 2, y: b.row + bd.h / 2, lane: b.lane, buildingId: b.buildingId, sourceBuildingId: b.id,
    });
  }
  bs.length = w;
  if (utilityLost) for (const s of SIDES) state.sides[s].supplyCap = supplyCapOf(state, s);
}
