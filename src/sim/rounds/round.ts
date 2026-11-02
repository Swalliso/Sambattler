// A round's opening (SPEC §4.7 steps 5–11, §14.6's opening steps 1–7): `createBattle` opens round 1, and
// the aftermath's step every later one. Until T055 `openRound` is a stub: it clears the last clash, lets
// the general plan first and a bot or general on the player's side after it, and enters planning. T055
// adds the income, the round's Sporestorm with `roundStarted`, the `battleStart` and `roundStart`
// triggers, and R2a's empty draft step (plan Call 26). Begin's clash half fields both armies and resolves
// the muster (§4.7 steps 12–14), and the clash's end hands over to scoring (T051). It stands beside v1's
// code until R2b moves it to `src/sim/round.ts`.
import type { ModifierDef } from '../../data/schema.ts';
import { musterKnits } from '../formation.ts';
import type { MusterUnit } from '../formation.ts';
import { squadStats } from './compile.ts';
import { addUnit } from './create.ts';
import { collectRoundEffects, fireTriggers } from './effects.ts';
import { formationOf } from './formation.ts';
import type { MusterTrio, SquadPlan } from './formation.ts';
import { SIDES } from './state.ts';
import type { BattleState, ClashState, FieldedSquad, Side, SquadState } from './state.ts';
import { mergeTriosNow } from './systems/merging.ts';
import { findUnit, isEmplacement } from './world.ts';

/**
 * A side's surviving supply in a lane (§6.7): its living units' current supply there, a merged unit its own
 * and a siege unit once, an emplacement none. It's the lane tug's number (§10.2) and what the 45 s cap
 * compares, so it's 0 in planning. A lane that has ended is frozen, so this still equals its lock's survivors.
 */
export function survivingSupply(state: BattleState, side: Side, lane: number): number {
  let supply = 0;
  for (const u of state.units) if (u.side === side && u.lane === lane && u.hp > 0) supply += u.supply;
  return supply;
}

/** A clash starting now, with every lane still fighting: Begin's (T043), or a scenario's that places its units (T029). */
export function newClash(state: BattleState): ClashState {
  return {
    startTick: state.tick,
    lanes: state.lanes.map(() => ({
      ended: false, endTick: 0, winner: null, capped: false, survivors: { player: 0, enemy: 0 }, damageSupply: { player: 0, enemy: 0 }, margin: 0,
    })),
    fielded: { player: [], enemy: [] },
  };
}

/**
 * Begin's clash half (§4.7 steps 12–14, §14.6 planning step 3), once `beginClash`'s planning half lets it
 * through. Each side's gold is banked for interest, and every building is marked fielded. Every squad of
 * both sides arrives in its slot at `formationOf`'s positions, the player's first, each side in plot order
 * (lane, rank, file) and then j, so its units take their ids in that order (A024); a squad that a patch
 * reaches alone has its own stats (T046). Then each lane's mixed army is shielded (plan Call 30), the muster
 * knits to its fixed point at once (plan Call 4), and the fielded record is written from the units as they
 * then stand. `clashStarted` leads Begin's events, and `clashStart` triggers fire last. No tick runs: the
 * muster's 20 ticks are the clash's first (§5.6).
 */
export function startClash(state: BattleState): void {
  const begun = state.events.length;
  for (const s of SIDES) state.sides[s].bankedAtBegin = state.sides[s].gold;
  for (const b of state.buildings) b.fielded = true;
  state.phase = 'clash';
  const clash = (state.clash = newClash(state));
  const plans = { player: formationOf(state, 'player'), enemy: formationOf(state, 'enemy') };
  const fx = collectRoundEffects(state.config.modifiers);
  for (const s of SIDES) for (const p of plans[s]) state.squads.push(squadFor(state, s, p, fx[s].mods));
  state.squads.sort((a, b) => a.building - b.building);
  // each arrived unit as its squad's j, which the muster's trios name (plan Call 5)
  const partsOf = new Map<number, MusterTrio['parts']>();
  for (const s of SIDES) {
    const burrow = (unitId: string) => state.compiled[s].units[unitId]!.tags.includes('burrow');
    for (const p of plans[s]) {
      const ids = p.units.map((at, j) => {
        const u = addUnit(state, s, p.unitId, p.lane, at.x, at.y, p.building);
        u.mergeOn = p.mergeOn;
        if (burrow(p.unitId)) u.burrowed = true; // a tunneler arrives underground (§5.2)
        partsOf.set(u.id, [{ building: p.building, j }]);
        return u.id;
      });
      state.events.push({ t: 'arrived', side: s, ids });
    }
  }
  arrivalShields(state);
  if (state.config.flags.merging) for (const s of SIDES) muster(state, s, plans[s], partsOf);
  clash.fielded = { player: fieldedOf(state, 'player'), enemy: fieldedOf(state, 'enemy') };
  const supply = (s: Side) => state.lanes.reduce((n, _, lane) => n + survivingSupply(state, s, lane), 0);
  state.events.splice(begun, 0, { t: 'clashStarted', round: state.round, supply: { player: supply('player'), enemy: supply('enemy') } });
  for (const s of SIDES) fireTriggers(state, s, 'clashStart', { x: 0, y: 0, lane: -1, sourceBuildingId: 0 });
}

/** A squad as it arrives (§14.4), with its own stats where a patch reaches its plot (T046). An emplacement has its tower's. */
function squadFor(state: BattleState, side: Side, p: SquadPlan, mods: readonly ModifierDef[]): SquadState {
  const terrain = state.sides[side].plots[p.plot]!.terrain;
  const stats = p.emplacement ? undefined : squadStats(state.library, p.unitId, mods, { rank: p.rank, terrain });
  const base = (stats ?? state.compiled[side].units[p.unitId]!).tiers[0];
  return {
    building: p.building, side, lane: p.lane, unitId: p.unitId, rank: p.rank, file: p.file, slot: p.slot,
    units: p.units.length, supply: p.units.length * base.supply, combos: [], ...(stats ? { stats } : {}),
  };
}

/**
 * The arrival shield (§5.3, #8, plan Call 30), before the muster, as R1's `clashshield` gave it
 * (`tools/lib/clash.ts`): a side's army in a lane of `minTypes` or more unit types gives each of its units a
 * shield of `shieldFrac` × its max HP. Emplacements neither count as a type nor take a shield, and a knit
 * keeps its parts' shields in proportion (`mergeTriosNow`).
 */
function arrivalShields(state: BattleState): void {
  const { minTypes, shieldFrac } = state.rules.arrivalShield;
  for (const s of SIDES) {
    state.lanes.forEach((_, lane) => {
      const army = state.units.filter((u) => u.side === s && u.lane === lane && !isEmplacement(state, u));
      if (new Set(army.map((u) => u.unitId)).size < minTypes) return;
      for (const u of army) {
        const shield = Math.round(u.maxHp * shieldFrac);
        if (shield > 0) u.shield = shield;
      }
    });
  }
}

/**
 * The muster (§5.6, plan Call 4), inside Begin: R1's `musterKnits` on the side's arrived units, keyed by
 * their ids from `firstKey = state.nextId`, each pass applied at once with `mergeTriosNow` in its order. So
 * each merged unit's id is its key, Begin knits what `mergePreview` shows, and each trio pays its `merged`
 * event, `stats.merges` and merge triggers once, then emits its `musterKnit`.
 */
function muster(state: BattleState, side: Side, plans: SquadPlan[], partsOf: Map<number, MusterTrio['parts']>): void {
  const eligible = new Map(plans.map((p) => [p.building, p.eligible]));
  const units = state.units.filter((u) => u.side === side).map((u): MusterUnit => ({
    key: u.id, side, lane: u.lane, unitId: u.unitId, tier: u.tier, x: u.x, y: u.y, mergeOn: u.mergeOn,
    eligible: eligible.get(u.sourceBuildingId) === true, source: u.sourceBuildingId,
  }));
  const c = state.compiled[side];
  const { passes } = musterKnits(units, {
    firstKey: state.nextId, mergeRadius: c.mergeRadius, lanes: state.lanes.map((l) => ({ top: l.rowStart, bottom: l.rowEnd })),
    width: state.map.width, radiusOf: (unitId, tier) => c.units[unitId]!.tiers[tier - 1]!.radius,
  });
  for (const pass of passes) {
    const first = state.nextId;
    mergeTriosNow(state, pass.map((trio) => trio.map((id) => findUnit(state, id)!)));
    pass.forEach((trio, k) => {
      const m = findUnit(state, first + k)!;
      const parts = trio.flatMap((id) => partsOf.get(id)!);
      partsOf.set(m.id, parts);
      state.events.push({ t: 'musterKnit', side, id: m.id, parts, tier: m.tier as 2 | 3, x: m.x, y: m.y });
    });
  }
}

/** What a side fields as it stands after the muster (§14.4, A047): an entry a lane, unit type and tier, in that order, with its count. */
function fieldedOf(state: BattleState, side: Side): FieldedSquad[] {
  const out: FieldedSquad[] = [];
  for (const u of state.units) {
    if (u.side !== side) continue;
    const f = out.find((x) => x.lane === u.lane && x.unitId === u.unitId && x.tier === u.tier);
    if (f) f.count++;
    else out.push({ unitId: u.unitId, tier: u.tier, count: 1, augments: [], lane: u.lane });
  }
  return out.sort((a, b) => a.lane - b.lane || (a.unitId < b.unitId ? -1 : a.unitId > b.unitId ? 1 : 0) || a.tier - b.tier);
}

/**
 * The clash's end (§14.6 clash step 13), on the tick its last lane ends. S7 scores the round here from the
 * lanes' locks (T051), putting `clash.fielded` in its `RoundResult`, and checks the battle's end (T052).
 * Either way the battle enters the aftermath.
 */
export function endClash(state: BattleState): void {
  state.phase = 'aftermath';
}

export function openRound(state: BattleState): void {
  // 1. clear events, and the last clash's units, squads, hits and clouds; advance the round, unless this opens the battle
  state.events.length = 0;
  if (state.phase === 'aftermath') {
    state.round++;
    delete state.clash;
    state.squads.length = 0;
    state.units.length = 0;
    state.hits.length = 0;
    if (state.clouds) state.clouds.length = 0;
  }
  // 2–4. income from round 2, the Sporestorm and `roundStarted`, the `roundStart` triggers (T055)
  // 5. the general plans first (§7.2)
  if (state.sides.enemy.ai) generalTurn(state);
  // 6. the draft (R2b: none in R2a, plan Call 26)
  // 7. a bot or general on the player's side plans after it
  if (state.sides.player.ai) playerTurn(state);
  state.phase = 'planning';
}

/**
 * The general's turn (opening step 5, §7.2): T068 fills it with its doctrine or counter change, its buys
 * and its merge toggles, each run at once as a command. Until then it plants nothing. Either way the
 * round's plan goes in `ai.plans` (plan Call 12), and `generalPlanned` follows.
 */
function generalTurn(state: BattleState): void {
  const ss = state.sides.enemy;
  ss.ai!.plans.push({ round: state.round, planted: [], sold: [], income: 0, banked: ss.gold });
  state.events.push({ t: 'generalPlanned', side: 'enemy', planted: [], sold: [] });
}

/**
 * A bot or general on the player's side (opening step 7): T069 fills it with its plant, sell and toggle
 * commands, run at once, and its `beginClash`, left queued, which makes the planning checkpoint (plan
 * Call 14). Until then it plans nothing.
 */
function playerTurn(_state: BattleState): void {}
