// Commander powers (SPEC §6.6, §11.10). A power is an ordinary deterministic command: validated when it
// executes, so an illegal use becomes a `commandRejected` event on replay too. The cooldown counts live
// ticks (it waits while the battle is held for a draft), starting at the power's first-ready time.
// The previews here are what the auto policy scores and what the targeting reticle shows.
import type { PowerDef } from '../data/schema.ts';
import { secToTicks } from './compile.ts';
import { burstAt, damageFor } from './systems/combat.ts';
import { canMerge, mergeTriosNow } from './systems/merging.ts';
import { captureFrontier, frontier, frontierBlocked, frontierValid, lanePresence } from './systems/territory.ts';
import { other } from './state.ts';
import type { BattleState, Command, Side, UnitState } from './state.ts';
import { buildingDef, rectDistance, unitDef, unitRadius } from './world.ts';

type PowerCommand = Extract<Command, { type: 'power' }>;

/** The side's commander power, if it has one and powers are on in this battle. */
export function powerOf(state: BattleState, side: Side): PowerDef | undefined {
  const id = state.config[side].power;
  if (!id || !state.config.flags.powers) return undefined;
  return state.library.powers?.[id];
}

/** The power's cooldown in ticks after a use (with `side.powerCooldown` modifiers, e.g. the Sporestorm Sigil). */
export function powerCooldownTicks(state: BattleState, side: Side, def: PowerDef): number {
  return Math.max(1, secToTicks(def.cooldown * (state.compiled[side].powerCooldownMult ?? 1), state.rules.tickRate));
}

/** Ticks of live play before the power is first ready (the battle clock starts at 0). */
export function powerFirstReadyTicks(state: BattleState, def: PowerDef): number {
  return secToTicks(def.firstReady, state.rules.tickRate);
}

/** The lanes where Rhizome Surge would capture the side's frontier column now. */
export function surgeLanes(state: BattleState, side: Side): number[] {
  const out: number[] = [];
  if (!state.rules.test.territory) return out;
  for (let li = 0; li < state.lanes.length; li++) {
    if (frontierValid(state, side, frontier(state, li, side)) && !frontierBlocked(state, li, side)) out.push(li);
  }
  return out;
}

/** True if `u` lies inside a power's circle (its body touches it, as with splash). */
function inCircle(state: BattleState, u: UnitState, x: number, y: number, r: number): boolean {
  const dx = u.x - x, dy = u.y - y;
  return Math.sqrt(dx * dx + dy * dy) - unitRadius(state, u) <= r;
}

/**
 * The trios Puppet Bloom would merge at a point: the side's units within the radius that could merge but
 * for the combat timer (alive, below Elder, merge toggle on, not already knitting), grouped by lane, unit
 * and tier, taken three at a time in id order. `blocked` counts trios that couldn't merge on their own yet.
 */
export function bloomTrios(state: BattleState, side: Side, x: number, y: number, radius: number): { trios: UnitState[][]; blocked: number } {
  const groups = new Map<string, UnitState[]>();
  for (const u of state.units) {
    if (u.side !== side || u.hp <= 0 || u.tier >= 3 || !u.mergeOn || u.knit || !inCircle(state, u, x, y, radius)) continue;
    const key = `${u.lane}|${u.unitId}|${u.tier}`;
    const g = groups.get(key);
    if (g) g.push(u); else groups.set(key, [u]);
  }
  const trios: UnitState[][] = [];
  let blocked = 0;
  // groups keep first-seen order and units are in id order, so the trios are deterministic
  for (const g of groups.values()) {
    for (let i = 0; i + 3 <= g.length; i += 3) {
      const trio = g.slice(i, i + 3);
      trios.push(trio);
      if (!trio.every((u) => canMerge(state, u))) blocked++;
    }
  }
  return { trios, blocked };
}

/**
 * What Spore Burst would do at a point: the targets it reaches and the damage it would deal, capped at
 * each target's HP (the auto policy's score; the reticle's count).
 */
export function burstPreview(state: BattleState, side: Side, def: Extract<PowerDef, { kind: 'burst' }>, x: number, y: number): { targets: number; value: number } {
  const enemy = other(side);
  let targets = 0, value = 0;
  for (const u of state.units) {
    if (u.side !== enemy || u.hp <= 0 || !inCircle(state, u, x, y, def.radius)) continue;
    const t = unitDef(state, u);
    const resist = t.tiers[u.tier - 1]!.resist[def.damageType];
    targets++;
    value += Math.min(u.hp, damageFor(state.rules, def.damage, def.damageType, 1, 1, t.armor, u.tier, resist));
  }
  for (const b of state.buildings) {
    if (b.side !== enemy || b.hp <= 0) continue;
    const bd = buildingDef(state, b);
    if (rectDistance(x, y, b.col, b.row, bd.w, bd.h) > def.radius) continue;
    targets++;
    value += Math.min(b.hp, damageFor(state.rules, def.damage, def.damageType, 1, 1, 'structure', 1, 1));
  }
  return { targets, value };
}

/** Why the power can't be used as commanded right now, or null if it can. */
export function powerProblem(state: BattleState, side: Side, cmd: { x?: number; y?: number }): string | null {
  const def = powerOf(state, side);
  if (!def) return 'no commander power';
  if (state.phase !== 'live') return 'powers work once the battle is live';
  const cd = state.sides[side].powerCooldown;
  if (cd > 0) return `power ready in ${Math.ceil(cd / state.rules.tickRate)} s`;
  if (def.target === 'point') {
    const { x, y } = cmd;
    if (typeof x !== 'number' || typeof y !== 'number' || !Number.isFinite(x) || !Number.isFinite(y)) return 'the power needs a target point';
    if (x < 0 || y < 0 || x >= state.map.width || y >= state.map.height) return 'target is off the field';
  }
  if (def.kind === 'surge' && !surgeLanes(state, side).length) return 'no frontier column can be captured';
  if (def.kind === 'bloom' && !state.config.flags.merging) return 'merging is off in this battle';
  return null;
}

/** Runs a validated power command and starts its cooldown. */
export function usePower(state: BattleState, side: Side, cmd: PowerCommand): void {
  const def = powerOf(state, side)!;
  const st = state.stats[side];
  let hits = 0, merges = 0;
  let lanes: number[] = [];
  if (def.kind === 'burst') {
    const before = st.damageDealt;
    hits = burstAt(state, side, cmd.x!, cmd.y!, def.radius, def.damage, def.damageType, `power:${def.id}`);
    st.powerDamage = (st.powerDamage ?? 0) + st.damageDealt - before;
  } else if (def.kind === 'surge') {
    lanes = surgeLanes(state, side);
    for (const li of lanes) captureFrontier(state, li, side);
    st.powerCaptures = (st.powerCaptures ?? 0) + lanes.length;
  } else {
    const { trios } = bloomTrios(state, side, cmd.x!, cmd.y!, def.radius);
    mergeTriosNow(state, trios);
    merges = trios.length;
    st.powerMerges = (st.powerMerges ?? 0) + merges;
  }
  st.powerUses = (st.powerUses ?? 0) + 1;
  state.sides[side].powerCooldown = powerCooldownTicks(state, side, def);
  state.events.push({
    t: 'power', side, power: def.id, ...(def.target === 'point' ? { x: cmd.x!, y: cmd.y! } : {}), hits, lanes, merges,
  });
}

/** Counts every side's power cooldown down by one live tick. */
export function powerClock(state: BattleState): void {
  for (const s of ['player', 'enemy'] as const) {
    const ss = state.sides[s];
    if (ss.powerCooldown > 0) ss.powerCooldown--;
  }
}

// ---- the auto policy (SPEC §16 M5: `--power-policy auto`) ----

/** Spore Burst fires on a point worth at least this much damage (two full hits). */
const BURST_MIN_VALUE = 180;
/** Puppet Bloom fires on at least this many trios, or one trio still in combat. */
const BLOOM_MIN_TRIOS = 2;

/**
 * Where an auto-policy side would use its ready power now, or null to wait. Candidate points are the
 * targets' own positions (enemy units and building centres for Spore Burst, the side's units for Puppet
 * Bloom), scanned in id order with ties to the first; Rhizome Surge waits until at least half the
 * lanes (rounded up) can be captured where the side's units are already pushing (at the frontier or
 * just behind it, at least matching the enemy there). Draws no randomness.
 */
export function autoPowerTarget(state: BattleState, side: Side): { x?: number; y?: number } | null {
  const def = powerOf(state, side);
  if (!def || state.sides[side].powerCooldown > 0 || state.phase !== 'live') return null;
  if (def.kind === 'surge') {
    // only lanes the side is already pushing in: its units at the frontier, at least matching the enemy's
    const pushing = surgeLanes(state, side).filter((li) => {
      const F = frontier(state, li, side);
      const pres = lanePresence(state, li);
      const back = side === 'player' ? F - 1 : F + 1;
      const mine = pres[side][F]! + (pres[side][back] ?? 0);
      return mine > 0 && mine >= pres[other(side)][F]!;
    });
    return pushing.length >= Math.ceil(state.lanes.length / 2) ? {} : null;
  }
  let best = null as { x: number; y: number } | null;
  if (def.kind === 'burst') {
    const enemy = other(side);
    let bestValue = BURST_MIN_VALUE - 1;
    const consider = (x: number, y: number) => {
      const v = burstPreview(state, side, def, x, y).value;
      if (v > bestValue) { bestValue = v; best = { x, y }; }
    };
    for (const u of state.units) if (u.side === enemy && u.hp > 0) consider(u.x, u.y);
    for (const b of state.buildings) {
      if (b.side !== enemy || b.hp <= 0) continue;
      const bd = buildingDef(state, b);
      consider(b.col + bd.w / 2, b.row + bd.h / 2);
    }
  } else {
    let bestScore = 0;
    for (const u of state.units) {
      if (u.side !== side || u.hp <= 0 || u.tier >= 3 || u.knit) continue;
      const { trios, blocked } = bloomTrios(state, side, u.x, u.y, def.radius);
      if (trios.length < BLOOM_MIN_TRIOS && blocked === 0) continue;
      const score = trios.length * 2 + blocked;
      if (score > bestScore) { bestScore = score; best = { x: u.x, y: u.y }; }
    }
  }
  if (!best) return null;
  // clamp into the field (a unit may stand a hair past the edge)
  return { x: Math.min(state.map.width - 0.01, Math.max(0, best.x)), y: Math.min(state.map.height - 0.01, Math.max(0, best.y)) };
}
