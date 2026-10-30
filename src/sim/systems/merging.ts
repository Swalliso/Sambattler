// Merging (SPEC §5.5–5.6): three identical units that are out of combat and within the merge radius
// knit for a second into one unit of the next tier. Active knits resolve every tick (a hit, a death
// or a merge toggle switched off cancels them; otherwise they complete on time); new trios are
// detected every `merge.every` ticks, per side, walking eligible units in id order.
import { noteMerged } from '../ai/counter.ts';
import { addUnit } from '../create.ts';
import { fireTriggers } from '../effects.ts';
import { SIDES } from '../state.ts';
import type { BattleState, Side, Tier, UnitState } from '../state.ts';

// Reused scratch (no allocation in the hot loop once warm). `eligible` may hold stale entries past
// the count in use; they are overwritten on the next pass.
const eligible: UnitState[] = [];
let reserved = new Uint8Array(256);
const knitting: UnitState[] = [];
const group: UnitState[] = [];
const removed: number[] = [];

export function mergingSystem(state: BattleState): void {
  if (!state.config.flags.merging) return;
  resolveKnits(state);
  if (state.tick % state.rules.merge.every === 0) for (const side of SIDES) detectTrios(state, side);
}

/** True if `u` may join a new trio now (SPEC §5.6 eligibility). */
export function canMerge(state: BattleState, u: UnitState): boolean {
  return u.tier < 3 && u.mergeOn && !u.knit && !u.burrowed && u.hp > 0 && state.tick - u.lastCombatTick >= state.rules.merge.cooldownTicks;
}

function resolveKnits(state: BattleState): void {
  knitting.length = 0;
  for (const u of state.units) if (u.knit) knitting.push(u);
  if (!knitting.length) return;
  removed.length = 0;
  let elders = false;
  // knitting is in id order, so each trio is met first through its lowest-id survivor
  for (let i = 0; i < knitting.length; i++) {
    const lead = knitting[i]!;
    if (!lead.knit || (i > 0 && isMember(knitting, i, lead.knit.group))) continue;
    const g = lead.knit.group;
    group.length = 0;
    for (let j = i; j < knitting.length; j++) if (knitting[j]!.knit?.group === g) group.push(knitting[j]!);
    let cancel = group.length < 3;
    for (const u of group) if (u.knit!.hurt || !u.mergeOn) cancel = true;
    if (cancel) {
      const ids: number[] = [];
      for (const u of group) { u.knit = undefined; ids.push(u.id); }
      state.events.push({ t: 'knitCancel', side: lead.side, ids });
    } else if (state.tick >= lead.knit.untilTick) {
      if (complete(state, group) === 3) elders = true;
    }
  }
  if (removed.length) {
    const units = state.units;
    let w = 0;
    for (let i = 0; i < units.length; i++) if (!removed.includes(units[i]!.id)) units[w++] = units[i]!;
    units.length = w;
  }
  if (elders) noteElders(state);
}

/**
 * Merges the given trios at once (Puppet Bloom, SPEC §11.10): each trio, in id order, becomes one unit
 * of the next tier at its centroid, as if its knit had just finished.
 */
export function mergeTriosNow(state: BattleState, trios: UnitState[][]): void {
  if (!trios.length) return;
  removed.length = 0;
  let elders = false;
  for (const trio of trios) if (complete(state, trio) === 3) elders = true;
  const units = state.units;
  let w = 0;
  for (let i = 0; i < units.length; i++) if (!removed.includes(units[i]!.id)) units[w++] = units[i]!;
  units.length = w;
  if (elders) noteElders(state);
}

/** Records the most Elders each side has had alive at once. */
function noteElders(state: BattleState): void {
  for (const side of SIDES) {
    let n = 0;
    for (const u of state.units) if (u.side === side && u.tier === 3) n++;
    const st = state.stats[side];
    if (n > st.maxEldersAlive) st.maxEldersAlive = n;
  }
}

/** True if an earlier knitting unit (index < i) already belongs to group `g`. */
function isMember(list: UnitState[], i: number, g: number): boolean {
  for (let j = 0; j < i; j++) if (list[j]!.knit?.group === g) return true;
  return false;
}

/** Replaces a finished trio (in id order) with one unit of the next tier at its centroid. */
function complete(state: BattleState, trio: UnitState[]): number {
  const lowest = trio[0]!;
  const side = lowest.side;
  const tier = (lowest.tier + 1) as Tier;
  let x = 0, y = 0, spawnY = 0, hp = 0, maxHp = 0, supply = 0, lastCombat = -Infinity;
  for (const u of trio) {
    x += u.x; y += u.y; spawnY += u.spawnY;
    hp += u.hp; maxHp += u.maxHp; supply += u.supply;
    if (u.lastCombatTick > lastCombat) lastCombat = u.lastCombatTick;
    if (u.tier === 1) noteMerged(state, side, u.id, u.sourceBuildingId);
    u.knit = undefined;
    removed.push(u.id);
  }
  state.sides[side].supplyUsed -= supply;
  // the new id is the largest so far, so pushing keeps `units` sorted; parents are compacted out after
  const m = addUnit(state, side, lowest.unitId, lowest.lane, x / 3, y / 3, lowest.sourceBuildingId, tier);
  m.hp = Math.max(1, Math.round((m.maxHp * hp) / maxHp));
  m.spawnY = spawnY / 3;
  m.mergeOn = lowest.mergeOn;
  m.lastCombatTick = lastCombat;
  state.stats[side].merges[tier === 2 ? '2' : '3']++;
  state.events.push({ t: 'merged', side, id: m.id, unitId: m.unitId, tier: tier as 2 | 3, x: m.x, y: m.y });
  const def = state.compiled[side].units[m.unitId]!;
  fireTriggers(state, side, 'merge', { x: m.x, y: m.y, lane: m.lane, unitId: m.unitId, tier, tags: def.tags, sourceBuildingId: m.sourceBuildingId });
  return tier;
}

function detectTrios(state: BattleState, side: Side): void {
  let n = 0;
  for (const u of state.units) if (u.side === side && canMerge(state, u)) eligible[n++] = u;
  if (n < 3) return;
  if (reserved.length < n) reserved = new Uint8Array(n * 2);
  reserved.fill(0, 0, n);
  const radius = state.compiled[side].mergeRadius;
  const r2 = radius * radius;
  for (let i = 0; i < n; i++) {
    if (reserved[i]) continue;
    const u = eligible[i]!;
    // the two nearest unreserved matches; scanning in id order with strict < sends ties to the lower id
    let a = -1, b = -1, da = Infinity, db = Infinity;
    for (let j = 0; j < n; j++) {
      if (j === i || reserved[j]) continue;
      const v = eligible[j]!;
      if (v.unitId !== u.unitId || v.tier !== u.tier || v.lane !== u.lane) continue;
      const dx = v.x - u.x, dy = v.y - u.y;
      const d = dx * dx + dy * dy;
      if (d > r2) continue;
      if (d < da) { b = a; db = da; a = j; da = d; }
      else if (d < db) { b = j; db = d; }
    }
    if (b < 0) continue;
    reserved[i] = 1; reserved[a] = 1; reserved[b] = 1;
    startKnit(state, u, eligible[a]!, eligible[b]!);
  }
}

function startKnit(state: BattleState, u: UnitState, v: UnitState, w: UnitState): void {
  const g = Math.min(u.id, v.id, w.id);
  const x = (u.x + v.x + w.x) / 3, y = (u.y + v.y + w.y) / 3;
  const until = state.tick + state.compiled[u.side].knitTicks;
  for (const m of [u, v, w]) {
    m.knit = { group: g, untilTick: until, x, y, hurt: false };
    m.targetId = 0;
  }
  const ids = [u.id, v.id, w.id].sort((p, q) => p - q);
  state.events.push({ t: 'knitStart', side: u.side, ids, x, y });
}
