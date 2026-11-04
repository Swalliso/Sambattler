// The commander power in rounds (SPEC §6.6, §11.10, §14.5): once per clash instead of a cooldown, hitting units
// only. A power is an ordinary deterministic command, validated when it executes in a clash's step 2, so an
// illegal use becomes a `commandRejected` on replay too. It's ready from the clash's first tick, the muster
// included, and `powerUsed` resets at each arrival (`startClash`). It's refused at a lane whose clash has ended,
// and its effects skip frozen lanes (R2-Q11, A053). Spore Burst strikes a point; Puppet Bloom lifts the side's
// units at a point one tier (R2-Q7); Rhizome Tithe pays for the clash's kills so far, by clash gold's one path
// (R2-Q16, R2-Q20). The Sporestorm Sigil scales each one's effect (`powerNow`, §11.7). The previews here are
// what the auto policy scores and the reticle shows.
import { queueCommand } from './commands.ts';
import { powerEffectMult, runAction } from './effects.ts';
import { survivingSupply } from './round.ts';
import { SIDES, other } from './state.ts';
import type { BattleState, Command, LibraryPower, Side, UnitState } from './state.ts';
import { burstAt, damageFor } from './systems/combat.ts';
import { canMerge, liftNow } from './systems/merging.ts';
import { clashTick, frozen, isEmplacement, laneOfRow, tierDef, unitDef, unitRadius } from './world.ts';

type PowerCommand = Extract<Command, { type: 'power' }>;
type Aim = { x?: number; y?: number; lane?: number };
type Power<K extends LibraryPower['kind']> = Extract<LibraryPower, { kind: K }>;

/** The side's commander power, if it has one and powers are on in this battle. */
export function powerOf(state: BattleState, side: Side): LibraryPower | undefined {
  const id = state.config[side].power;
  if (!id || !state.config.flags.powers) return undefined;
  return state.library.powers?.[id];
}

/**
 * The side's power as it would act now (§6.6, §11.7, A054, A086): its effect × `side.powerEffectMult`, such as the
 * Sporestorm Sigil's 1.5 from the storm's first round. That's Spore Burst's damage, Puppet Bloom's radius and the
 * Tithe's gold a supply, so 135, 4.5 tiles and 3 under the Sigil. The power, its previews and the auto policy read it.
 */
export function powerNow(state: BattleState, side: Side): LibraryPower | undefined {
  const def = powerOf(state, side);
  if (!def) return undefined;
  const m = powerEffectMult(state, side);
  if (m === 1) return def;
  if (def.kind === 'burst') return { ...def, damage: def.damage * m };
  if (def.kind === 'bloom') return { ...def, radius: def.radius * m };
  return { ...def, goldPerSupply: def.goldPerSupply * m };
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
 * Could Puppet Bloom take `u`? Alive, below Elder, its merge toggle on, not knitting or underground, not an
 * emplacement or a Burster (they never merge, §6.7, §5.3), and in a lane still fighting. Unlike a knit on the
 * field, combat doesn't stop it.
 */
function bloomable(state: BattleState, u: UnitState): boolean {
  return u.hp > 0 && u.tier < 3 && u.mergeOn && !u.knit && !u.burrowed && !isEmplacement(state, u)
    && !(state.rules.burst && unitDef(state, u).tags.includes('burst')) && !frozen(state, u.lane);
}

/** The side's units Puppet Bloom would lift at a point (§11.10, R2-Q7): those within the radius that it could take, in id order. */
export function bloomLift(state: BattleState, side: Side, x: number, y: number, radius: number): UnitState[] {
  return state.units.filter((u) => u.side === side && bloomable(state, u) && inCircle(state, u, x, y, radius));
}

/** The supply a lift adds (an Elder's lift is worth twice a Bloomed one's, by §5.6's supply), which the auto policy scores. */
function liftValue(state: BattleState, units: readonly UnitState[]): number {
  let v = 0;
  for (const u of units) v += state.compiled[u.side].units[u.unitId]!.tiers[u.tier as 1 | 2].supply - u.supply;
  return v;
}

/**
 * The trios of one unit and tier at a point, three at a time in id order, with those that couldn't knit on their
 * own yet, in combat, as `blocked`. It was v1's Puppet Bloom; it stays as R1's clash-check readout of what is left
 * to merge after the muster (`tools/lib/clash.ts`, R2-Q7).
 */
export function bloomTrios(state: BattleState, side: Side, x: number, y: number, radius: number): { trios: UnitState[][]; blocked: number } {
  const groups = new Map<string, UnitState[]>();
  for (const u of bloomLift(state, side, x, y, radius)) {
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
 * (the auto policy's score; the reticle's count). The units it would strike go in `struck`, if given.
 */
export function burstPreview(state: BattleState, side: Side, def: Power<'burst'>, x: number, y: number, struck?: UnitState[]): { targets: number; value: number } {
  const enemy = other(side);
  let targets = 0, value = 0;
  for (const u of state.units) {
    if (u.side !== enemy || u.hp <= 0 || u.burrowed || frozen(state, u.lane) || !inCircle(state, u, x, y, def.radius)) continue;
    const dmg = damageFor(state.rules, def.damage, def.damageType, 1, 1, unitDef(state, u).armor, u.tier, tierDef(state, u).resist[def.damageType]);
    targets++;
    value += Math.min(dmg, u.hp + (u.shield ?? 0));
    struck?.push(u);
  }
  return { targets, value };
}

/** The enemy supply the side has killed so far in this clash (§11.10, R2-Q16), 0 outside one. */
export const killedSupply = (state: BattleState, side: Side): number => state.clash?.killedSupply?.[side] ?? 0;

/** What Rhizome Tithe would pay if fired now (§11.10, R2-Q16): its gold a supply for each enemy supply killed so far in this clash, rounded down. */
export const harvestGold = (state: BattleState, side: Side, def: Power<'harvest'>): number => Math.floor(killedSupply(state, side) * def.goldPerSupply);

/**
 * Why the side's power can't be used as commanded right now, or null if it can (§6.6, §14.5): only in a
 * clash, once in it, at a point on the field for a point power, and not at a lane whose clash is over.
 * Rhizome Tithe takes no aim, and may fire at 0 kills (R2-Q16).
 */
export function powerProblem(state: BattleState, side: Side, aim: Aim): string | null {
  const def = powerOf(state, side);
  if (!def) return 'noPower';
  if (state.phase !== 'clash') return 'wrongPhase';
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
  const def = powerNow(state, side)!;
  const st = state.stats[side];
  let hits = 0, lifts = 0, gold = 0;
  if (def.kind === 'burst') {
    const before = st.damageDealt;
    hits = burstAt(state, side, cmd.x!, cmd.y!, def.radius, def.damage, def.damageType, `power:${def.id}`);
    st.powerDamage = (st.powerDamage ?? 0) + st.damageDealt - before;
  } else if (def.kind === 'bloom') {
    const units = bloomLift(state, side, cmd.x!, cmd.y!, def.radius);
    liftNow(state, units);
    lifts = units.length;
    st.powerLifts = (st.powerLifts ?? 0) + lifts;
  } else {
    // credited at once, as gold earned in a clash: the next income's "from the clash" row (R2-Q20)
    gold = harvestGold(state, side, def);
    if (gold > 0) runAction(state, side, { gainGold: gold }, { x: 0, y: 0, lane: -1, sourceBuildingId: 0 });
    st.powerGold = (st.powerGold ?? 0) + gold;
  }
  st.powerUses = (st.powerUses ?? 0) + 1;
  state.sides[side].powerUsed = true;
  state.events.push({
    t: 'power', side, power: def.id, ...(def.target === 'point' ? { x: cmd.x!, y: cmd.y! } : {}), hits, lifts, ...(def.kind === 'harvest' ? { gold } : {}),
  });
}

// ---- the auto policy (SPEC §14.6 clash step 4, plan Call 9: `--power-policy auto`) ----

/** The auto policy thinks on the clash clock's ticks 1, 21, 41 … (plan Call 9). */
const THINK_EVERY = 20;
/** Spore Burst fires on a point worth at least this much damage (two full hits). */
const BURST_MIN_VALUE = 180;
/** Rhizome Tithe fires from this clash time on, or once a side in a lane still fighting is down to this share of what it fielded there (R2-Q16). */
const HARVEST_LATE_SECONDS = 40;
const HARVEST_LOW_SHARE = 0.25;

/**
 * The best point for Puppet Bloom now: the side's own units' positions in id order, scored by the supply the lift
 * there adds, with ties to the first, or null with nothing to lift (R2-Q7).
 */
export function bestBloom(state: BattleState, side: Side): { x: number; y: number; lifts: number; value: number } | null {
  const def = powerNow(state, side);
  if (def?.kind !== 'bloom') return null;
  let best = null as { x: number; y: number; lifts: number; value: number } | null;
  for (const u of state.units) {
    if (u.side !== side || !bloomable(state, u)) continue;
    const units = bloomLift(state, side, u.x, u.y, def.radius);
    const value = liftValue(state, units);
    if (value > (best?.value ?? 0)) best = { x: u.x, y: u.y, lifts: units.length, value };
  }
  return best;
}

/**
 * Is it time for Rhizome Tithe (§11.10, R2-Q16)? From a clash time of 40 s, or once either side's surviving supply in
 * a lane still fighting is at most 25% of the supply it fielded there, after the muster.
 */
function harvestDue(state: BattleState): boolean {
  if (clashTick(state) >= HARVEST_LATE_SECONDS * state.rules.tickRate) return true;
  const fielded = state.clash!.fielded;
  return state.lanes.some((_, lane) => !frozen(state, lane) && SIDES.some((s) => {
    let arrived = 0;
    for (const f of fielded[s]) if (f.lane === lane) arrived += f.count * state.compiled[s].units[f.unitId]!.tiers[f.tier - 1]!.supply;
    return arrived > 0 && survivingSupply(state, s, lane) <= HARVEST_LOW_SHARE * arrived;
  }));
}

/**
 * Where an auto-policy side would use its power now, or null to wait. Spore Burst takes the enemy unit's
 * position worth the most damage, emplacements included, once it's worth 180; Puppet Bloom the point where the
 * lift adds most; Rhizome Tithe fires with no aim once it's due (`harvestDue`). Candidates are scanned in id order
 * with ties to the first, and frozen lanes are skipped. Draws no randomness.
 */
export function autoPowerTarget(state: BattleState, side: Side): { x?: number; y?: number } | null {
  const def = powerNow(state, side);
  if (!def || state.phase !== 'clash' || state.sides[side].powerUsed) return null;
  if (def.kind === 'harvest') return harvestDue(state) ? {} : null;
  let best = null as { x: number; y: number } | null;
  if (def.kind === 'burst') {
    let bestValue = BURST_MIN_VALUE - 1;
    for (const u of state.units) {
      if (u.side === side || u.hp <= 0 || frozen(state, u.lane)) continue;
      const v = burstPreview(state, side, def, u.x, u.y).value;
      if (v > bestValue) { bestValue = v; best = { x: u.x, y: u.y }; }
    }
  } else if (state.config.flags.merging) best = bestBloom(state, side);
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
