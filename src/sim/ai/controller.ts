// The shared AI framework for the generals and the strategy bots (SPEC §7.2–7.3, §7.9). It acts
// only by queueing ordinary commands for the next tick (placements, merge toggles, the commander power
// under the auto policy and, during a doctrine change, sales), and draws randomness only from the `ai`
// stream. The counter cycle lives in counter.ts; here its doctrine scales the purchase weights.
import { counterFloor, doctrineMult } from './counter.ts';
import { queueCommand } from '../commands.ts';
import { legalPlacements } from '../placement.ts';
import { autoPowerTarget } from '../powers.ts';
import { nextFloat, nextSigned } from '../rng.ts';
import { other } from '../state.ts';
import type { AiState, BattleState, Side } from '../state.ts';
import { buildingDef, isBesieged } from '../world.ts';

interface Plan { col: number; row: number; w: number; h: number }
interface Pressure { pressured: boolean[]; anyPressured: boolean; mostLane: number }

export function aiOpener(state: BattleState, side: Side): void {
  const ai = state.sides[side].ai;
  if (!ai || ai.openerDone) return;
  ai.openerDone = true;
  const pressure = assessPressure(state, side);
  let gold = state.sides[side].gold;
  const planned: Plan[] = [];
  for (const id of ai.opener) {
    const choice = choosePlacement(state, side, id, planned, pressure);
    if (!choice || choice.price > gold) continue;
    gold -= choice.price;
    const def = state.compiled[side].buildings[id]!;
    planned.push({ col: choice.col, row: choice.row, w: def.w, h: def.h });
    queueCommand(state, { tick: state.tick + 1, side, type: 'place', buildingId: id, lane: choice.lane, col: choice.col, row: choice.row });
  }
}

export function aiThink(state: BattleState, side: Side): void {
  const ss = state.sides[side];
  const ai = ss.ai;
  if (!ai) return;
  applyMergePolicy(state, side, ai);
  applyStancePolicy(state, side, ai);
  applyPowerPolicy(state, side);
  const pressure = assessPressure(state, side);
  if (ai.target && state.tick - ai.targetSince >= state.rules.ai.stickyTicks) ai.target = null;
  if (!ai.target) {
    ai.target = pickTarget(state, side, ai, pressure);
    ai.targetSince = state.tick;
  }
  if (!ai.target) return;
  const def = state.compiled[side].buildings[ai.target]!;
  if (ss.gold < def.cost) return; // price is never below cost; wait without consuming noise
  const choice = choosePlacement(state, side, ai.target, [], pressure);
  if (!choice) { ai.target = null; return; }
  if (choice.price > ss.gold) return;
  queueCommand(state, { tick: state.tick + 1, side, type: 'place', buildingId: ai.target, lane: choice.lane, col: choice.col, row: choice.row });
  ai.target = null;
}

/**
 * Share of a side's spawn supply rate (count × supply / interval over its standing spawners) that
 * comes from `slayer` units (SPEC §7.2 step 5, §7.4).
 */
export function slayerSpawnShare(state: BattleState, side: Side): number {
  let all = 0, slayer = 0;
  for (const b of state.buildings) {
    if (b.side !== side) continue;
    const sp = buildingDef(state, b).spawn;
    if (!sp) continue;
    const u = state.compiled[side].units[sp.unit]!;
    const rate = (sp.count * u.tiers[0].supply) / sp.intervalHalfTicks;
    all += rate;
    if (u.slayer) slayer += rate;
  }
  return all > 0 ? slayer / all : 0;
}

/** With `powerPolicy: auto`, uses a ready commander power on the best target it sees (src/sim/powers.ts). */
function applyPowerPolicy(state: BattleState, side: Side): void {
  if (state.config[side].powerPolicy !== 'auto') return;
  if (state.queue.some((c) => c.side === side && c.type === 'power')) return;
  const target = autoPowerTarget(state, side);
  if (target) queueCommand(state, { tick: state.tick + 1, side, type: 'power', ...target });
}

/** Sets each spawner's merge toggle per the side's policy, through ordinary toggleMerge commands. */
function applyMergePolicy(state: BattleState, side: Side, ai: AiState): void {
  if (!state.config.flags.merging) return;
  const swarmOff = ai.mergePolicy === 'auto' && slayerSpawnShare(state, other(side)) > state.rules.ai.mergeOffSlayerShare;
  for (const b of state.buildings) {
    if (b.side !== side) continue;
    const sp = buildingDef(state, b).spawn;
    if (!sp) continue;
    const want = ai.mergePolicy === 'on' ? true : ai.mergePolicy === 'off' ? false
      : !(swarmOff && state.compiled[side].units[sp.unit]!.tags.includes('swarm'));
    if (b.mergeOn === want) continue;
    if (state.queue.some((c) => c.side === side && c.type === 'toggleMerge' && c.entityId === b.id)) continue;
    queueCommand(state, { tick: state.tick + 1, side, type: 'toggleMerge', entityId: b.id, on: want });
  }
}

/**
 * Prototype E1's muster policy (balance `laneStance.ai`), through ordinary stance commands: hold a
 * lane until `musterSupply` of the side's units stand in it, advance, and hold again once fewer than
 * `spentSupply` remain (the wave is spent) and the cooldown allows. With `advanceWhenBesieged` it
 * never holds a lane while one of its buildings there is besieged.
 */
function applyStancePolicy(state: BattleState, side: Side, ai: AiState): void {
  const policy = state.rules.stance?.ai;
  const lanes = state.sides[side].stance;
  if (!policy || !lanes) return;
  if (policy.profiles && !policy.profiles.some((p) => ai.profileId.startsWith(p))) return;
  for (let li = 0; li < lanes.length; li++) {
    const st = lanes[li]!;
    if (state.queue.some((c) => c.side === side && c.type === 'stance' && c.lane === li)) continue;
    let supply = 0;
    for (const u of state.units) if (u.side === side && u.lane === li) supply += u.supply;
    const besieged = !!policy.advanceWhenBesieged && state.buildings.some((b) => b.side === side && b.lane === li && isBesieged(state, b));
    const hold = !besieged && (st.hold ? supply < policy.musterSupply : supply < policy.spentSupply && state.tick >= st.readyAt);
    if (hold !== st.hold) queueCommand(state, { tick: state.tick + 1, side, type: 'stance', lane: li, hold });
  }
}

/** Per lane: is the enemy out-massing us within the window around our border? */
export function assessPressure(state: BattleState, side: Side): Pressure {
  const win = state.rules.ai.pressureWindow;
  const pressured: boolean[] = [];
  let anyPressured = false, mostLane = 0, mostScore = -Infinity;
  for (let li = 0; li < state.lanes.length; li++) {
    const L = state.lanes[li]!;
    const border = side === 'player' ? L.pBorder : L.eBorder;
    let own = 0, enemy = 0;
    for (const u of state.units) {
      if (u.lane !== li) continue;
      const c = Math.floor(u.x);
      if (c < border - win || c > border + win) continue;
      if (u.side === side) own += u.supply; else enemy += u.supply;
    }
    const p = enemy > own && enemy >= state.rules.ai.pressureMin;
    pressured.push(p);
    if (p) anyPressured = true;
    if (enemy - own > mostScore) { mostScore = enemy - own; mostLane = li; }
  }
  return { pressured, anyPressured, mostLane };
}

function ownedCount(state: BattleState, side: Side, buildingId: string): number {
  let n = 0;
  for (const b of state.buildings) if (b.side === side && b.buildingId === buildingId) n++;
  return n;
}

function pickTarget(state: BattleState, side: Side, ai: AiState, pressure: Pressure): string | null {
  const clock = state.tick;
  const r = state.rules;
  let total = 0;
  const eff: number[] = [];
  const kit = state.sides[side].kit;
  for (const w of ai.weights) {
    // weights cover the draft pool too; only buildings in the kit can be bought (a zero keeps the roll unchanged)
    if (!kit.includes(w.building)) { eff.push(0); continue; }
    let x = w.weight;
    if (ai.counterSets && r.ai.counter.floorWeight) x = Math.max(x, counterFloor(state, ai, w.building));
    const kind = state.compiled[side].buildings[w.building]!.kind;
    if (w.maxOwned >= 0 && ownedCount(state, side, w.building) >= w.maxOwned) x = 0;
    if (clock < w.afterTick) x = 0;
    if (kind === 'economy') {
      if (clock < r.ai.economyEarlyTick) x *= r.ai.economyEarlyMult;
      else if (clock > r.ai.economyLateTick) x *= r.ai.economyLateMult;
    }
    if (kind === 'tower' && pressure.anyPressured) x *= r.ai.towerPressureMult;
    if (ai.counterSets) x *= doctrineMult(state, ai, w.building);
    eff.push(x);
    total += x;
  }
  if (total <= 0) return null;
  let roll = nextFloat(state.rng.ai) * total;
  for (let i = 0; i < eff.length; i++) {
    roll -= eff[i]!;
    if (roll < 0 && eff[i]! > 0) return ai.weights[i]!.building;
  }
  for (let i = eff.length - 1; i >= 0; i--) if (eff[i]! > 0) return ai.weights[i]!.building;
  return null;
}

/** The lane where the opponent holds the fewest columns (ties to the lower lane): aggressive lane choice (SPEC §7.3). */
export function weakestOpponentLane(state: BattleState, side: Side): number {
  let best = 0, bestCols = Infinity;
  state.lanes.forEach((L, i) => {
    const cols = side === 'enemy' ? L.pBorder + 1 : state.map.width - L.eBorder;
    if (cols < bestCols) { bestCols = cols; best = i; }
  });
  return best;
}

/** Best-scoring legal position (SPEC §7.3), or null if none. */
export function choosePlacement(
  state: BattleState, side: Side, buildingId: string, planned: Plan[], pressure: Pressure,
): { lane: number; col: number; row: number; price: number } | null {
  const def = state.compiled[side].buildings[buildingId];
  if (!def) return null;
  const r = state.rules;
  const ai = state.sides[side].ai;
  const enemy = other(side);
  const threatR2 = r.ai.threatRadius * r.ai.threatRadius;
  let candidates = legalPlacements(state, side, buildingId);
  if (ai?.laneStyle === 'aggressive' && def.kind === 'spawner' && state.lanes.length > 1) {
    const lane = weakestOpponentLane(state, side);
    const inLane = candidates.filter((p) => p.lane === lane);
    if (inLane.length) candidates = inLane; // a full lane falls back to the others
  }
  let best: { lane: number; col: number; row: number; price: number } | null = null;
  let bestScore = -Infinity;
  for (const p of candidates) {
    if (planned.some((q) => q.col < p.col + def.w && p.col < q.col + q.w && q.row < p.row + def.h && p.row < q.row + q.h)) continue;
    const L = state.lanes[p.lane]!;
    // never plan into our border column while the opponent is about to flip it
    const border = side === 'player' ? L.pBorder : L.eBorder;
    const touchesBorder = border >= p.col && border < p.col + def.w;
    if (touchesBorder && L.capture[enemy].column === border && L.capture[enemy].progress >= r.captureThreshold - 2 * r.captureStep) continue;
    const cx = p.col + def.w / 2, cy = p.row + def.h / 2;
    let threat = 0;
    for (const u of state.units) {
      if (u.side !== enemy || u.lane !== p.lane) continue;
      const dx = u.x - cx, dy = u.y - cy;
      if (dx * dx + dy * dy <= threatR2) threat += u.supply;
    }
    for (const b of state.buildings) {
      if (b.side !== enemy || b.lane !== p.lane) continue;
      const bd = buildingDef(state, b);
      if (!bd.attack) continue;
      const dx = b.col + bd.w / 2 - cx, dy = b.row + bd.h / 2 - cy;
      if (dx * dx + dy * dy <= bd.attack.range * bd.attack.range) { threat += r.ai.towerRangeThreat; break; }
    }
    const sc = r.ai.score;
    let score: number;
    if (def.kind === 'spawner') {
      score = (ai?.spawnerDepthWeight ?? sc.spawnerDepth) * p.depth - sc.spawnerThreat * threat - sc.spawnerSurcharge * (p.price - def.cost);
    } else if (def.kind === 'economy') {
      score = (p.loam ? sc.economyLoam : 0) - sc.economyDepth * p.depth - sc.economyThreat * threat;
    } else if (def.kind === 'tower') {
      const front = p.lane === pressure.mostLane &&
        (side === 'player' ? p.col + def.w - 1 >= L.pBorder - 1 : p.col <= L.eBorder + 1);
      score = (front ? sc.towerFront : 0) - sc.towerThreat * threat;
    } else {
      score = -sc.economyDepth * p.depth - sc.towerThreat * threat;
    }
    score += nextSigned(state.rng.ai) * r.ai.noise;
    if (score > bestScore) { bestScore = score; best = { lane: p.lane, col: p.col, row: p.row, price: p.price }; }
  }
  return best;
}
