// The commander power in rounds (SPEC §6.6, §11.10, §14.5): v1's `src/sim/powers.ts`, typed on rounds' state,
// once per clash instead of a cooldown, and without Rhizome Surge, the Tithe's columns and damage to buildings.
// A power is an ordinary deterministic command, validated when it executes in a clash's step 2, so an illegal
// use becomes a `commandRejected` on replay too. It's ready from the clash's first tick, the muster included,
// and `powerUsed` resets at each arrival (`startClash`). It's refused at a lane whose clash has ended, and its
// effects skip frozen lanes (R2-Q11, A053). Rhizome Tithe is refused with `notInRoundsYet` until R2b gives it
// v2's effect (plan Call 19). The previews here are what the auto policy scores and the reticle shows. It
// stands beside v1's file until R2b moves it to `src/sim/powers.ts`.
import { queueCommand } from './commands.ts';
import { SIDES, other } from './state.ts';
import type { BattleState, Command, LibraryPower, Side, UnitState } from './state.ts';
import { burstAt, damageFor } from './systems/combat.ts';
import { canMerge, mergeTriosNow } from './systems/merging.ts';
import { clashTick, frozen, isEmplacement, laneOfRow, tierDef, unitDef, unitRadius } from './world.ts';

type PowerCommand = Extract<Command, { type: 'power' }>;
type Aim = { x?: number; y?: number; lane?: number };

/** The side's commander power, if it has one and powers are on in this battle. */
export function powerOf(state: BattleState, side: Side): LibraryPower | undefined {
  const id = state.config[side].power;
  if (!id || !state.config.flags.powers) return undefined;
  return state.library.powers?.[id];
}

/** The lane a power is aimed at: a point's lane, or −1 for a point between lanes; a lane power's own (§6.6). */
export function aimedLane(state: BattleState, aim: Aim): number {
  if (typeof aim.lane === 'number') return aim.lane;
  return typeof aim.y === 'number' && Number.isFinite(aim.y) ? laneOfRow(state, Math.floor(aim.y)) : -1;
}

/** True if `u` lies inside a power's circle (its body touches it, as with splash). */
function inCircle(state: BattleState, u: UnitState, x: number, y: number, r: number): boolean {
  const dx = u.x - x, dy = u.y - y;
  return Math.sqrt(dx * dx + dy * dy) - unitRadius(state, u) <= r;
}

/**
 * Could Puppet Bloom take `u` into a trio? Alive, below Elder, its merge toggle on, not knitting or
 * underground, not an emplacement or a Burster (they never merge, §6.7, §5.3), and in a lane still fighting.
 * Unlike a knit on the field, the combat timer doesn't stop it.
 */
function bloomable(state: BattleState, u: UnitState): boolean {
  return u.hp > 0 && u.tier < 3 && u.mergeOn && !u.knit && !u.burrowed && !isEmplacement(state, u)
    && !(state.rules.burst && unitDef(state, u).tags.includes('burst')) && !frozen(state, u.lane);
}

/**
 * The trios Puppet Bloom would merge at a point: the side's units within the radius that it could take,
 * grouped by lane, unit and tier, three at a time in id order. `blocked` counts the trios that couldn't
 * knit on their own yet, in combat.
 */
export function bloomTrios(state: BattleState, side: Side, x: number, y: number, radius: number): { trios: UnitState[][]; blocked: number } {
  const groups = new Map<string, UnitState[]>();
  for (const u of state.units) {
    if (u.side !== side || !bloomable(state, u) || !inCircle(state, u, x, y, radius)) continue;
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
 * What Spore Burst would do at a point: the enemy units it reaches, emplacements included and frozen lanes
 * not, and the damage it would deal, each capped at what the target has left, its arrival shield included
 * (the auto policy's score; the reticle's count).
 */
export function burstPreview(state: BattleState, side: Side, def: Extract<LibraryPower, { kind: 'burst' }>, x: number, y: number): { targets: number; value: number } {
  const enemy = other(side);
  let targets = 0, value = 0;
  for (const u of state.units) {
    if (u.side !== enemy || u.hp <= 0 || u.burrowed || frozen(state, u.lane) || !inCircle(state, u, x, y, def.radius)) continue;
    const dmg = damageFor(state.rules, def.damage, def.damageType, 1, 1, unitDef(state, u).armor, u.tier, tierDef(state, u).resist[def.damageType]);
    targets++;
    value += Math.min(dmg, u.hp + (u.shield ?? 0));
  }
  return { targets, value };
}

/**
 * Why the side's power can't be used as commanded right now, or null if it can (§6.6, §14.5): only in a
 * clash, once in it, not the Tithe until R2b, at a point on the field, and not at a lane whose clash is over.
 */
export function powerProblem(state: BattleState, side: Side, aim: Aim): string | null {
  const def = powerOf(state, side);
  if (!def) return 'noPower';
  if (state.phase !== 'clash') return 'wrongPhase';
  if (def.kind === 'tithe' || def.kind === 'surge') return 'notInRoundsYet';
  if (state.sides[side].powerUsed) return 'powerUsed';
  if (def.target === 'point') {
    const { x, y } = aim;
    if (typeof x !== 'number' || typeof y !== 'number' || !Number.isFinite(x) || !Number.isFinite(y)) return 'needsTarget';
    if (x < 0 || y < 0 || x >= state.map.width || y >= state.map.height) return 'offField';
  }
  const lane = aimedLane(state, aim);
  if (lane >= 0 && frozen(state, lane)) return 'laneEnded';
  if (def.kind === 'bloom' && !state.config.flags.merging) return 'mergingOff';
  return null;
}

/** Runs a validated power command, and spends the side's power for this clash. */
export function usePower(state: BattleState, side: Side, cmd: PowerCommand): void {
  const def = powerOf(state, side)!;
  const st = state.stats[side];
  let hits = 0, merges = 0;
  if (def.kind === 'burst') {
    const before = st.damageDealt;
    hits = burstAt(state, side, cmd.x!, cmd.y!, def.radius, def.damage, def.damageType, `power:${def.id}`);
    st.powerDamage = (st.powerDamage ?? 0) + st.damageDealt - before;
  } else if (def.kind === 'bloom') {
    const { trios } = bloomTrios(state, side, cmd.x!, cmd.y!, def.radius);
    mergeTriosNow(state, trios);
    merges = trios.length;
    st.powerMerges = (st.powerMerges ?? 0) + merges;
  }
  st.powerUses = (st.powerUses ?? 0) + 1;
  state.sides[side].powerUsed = true;
  state.events.push({ t: 'power', side, power: def.id, ...(def.target === 'point' ? { x: cmd.x!, y: cmd.y! } : {}), hits, merges });
}

// ---- the auto policy (SPEC §14.6 clash step 4, plan Call 9: `--power-policy auto`) ----

/** The auto policy thinks on the clash clock's ticks 1, 21, 41 … (plan Call 9). */
const THINK_EVERY = 20;
/** Spore Burst fires on a point worth at least this much damage (two full hits). */
const BURST_MIN_VALUE = 180;
/** Puppet Bloom fires on at least this many trios, or one trio still in combat. */
const BLOOM_MIN_TRIOS = 2;

/**
 * The best point for Puppet Bloom now: scored 2 a trio and 1 a blocked one, over the side's own units'
 * positions in id order with ties to the first, or null with no trio anywhere. The auto policy and the
 * power readouts (`tools/lib/rounds/run.ts`) read it.
 */
export function bestBloom(state: BattleState, side: Side): { x: number; y: number; trios: number; blocked: number } | null {
  const def = powerOf(state, side);
  if (def?.kind !== 'bloom') return null;
  let best = null as { x: number; y: number; trios: number; blocked: number } | null;
  let bestScore = 0;
  for (const u of state.units) {
    if (u.side !== side || !bloomable(state, u)) continue;
    const { trios, blocked } = bloomTrios(state, side, u.x, u.y, def.radius);
    const score = trios.length * 2 + blocked;
    if (score > bestScore) { bestScore = score; best = { x: u.x, y: u.y, trios: trios.length, blocked }; }
  }
  return best;
}

/**
 * Where an auto-policy side would use its power now, or null to wait. Spore Burst takes the enemy unit's
 * position worth the most damage, emplacements included, once it's worth 180; Puppet Bloom the best point
 * with 2 trios, or one blocked. Candidates are scanned in id order with ties to the first, and frozen lanes
 * are skipped. Rhizome Tithe is skipped until R2b (plan Call 19). Draws no randomness.
 */
export function autoPowerTarget(state: BattleState, side: Side): { x: number; y: number } | null {
  const def = powerOf(state, side);
  if (!def || state.phase !== 'clash' || state.sides[side].powerUsed) return null;
  let best = null as { x: number; y: number } | null;
  if (def.kind === 'burst') {
    let bestValue = BURST_MIN_VALUE - 1;
    for (const u of state.units) {
      if (u.side === side || u.hp <= 0 || frozen(state, u.lane)) continue;
      const v = burstPreview(state, side, def, u.x, u.y).value;
      if (v > bestValue) { bestValue = v; best = { x: u.x, y: u.y }; }
    }
  } else if (def.kind === 'bloom' && state.config.flags.merging) {
    const b = bestBloom(state, side);
    if (b && (b.trios >= BLOOM_MIN_TRIOS || b.blocked > 0)) best = b;
  }
  if (!best) return null;
  // clamp into the field (a unit may stand a hair past the edge)
  return { x: Math.min(state.map.width - 0.01, Math.max(0, best.x)), y: Math.min(state.map.height - 0.01, Math.max(0, best.y)) };
}

/**
 * Clash step 4 (§14.6): on a think tick, each side with `powerPolicy: 'auto'` and its power unspent queues
 * it for the next tick at the policy's target. Nobody buys in a clash.
 */
export function powerThink(state: BattleState): void {
  if ((clashTick(state) - 1) % THINK_EVERY !== 0) return;
  for (const side of SIDES) {
    if (state.config[side].powerPolicy !== 'auto' || state.queue.some((c) => c.side === side && c.type === 'power')) continue;
    const target = autoPowerTarget(state, side);
    if (target) queueCommand(state, { round: state.round, tick: state.tick + 1, side, type: 'power', ...target });
  }
}
