// A round's opening (SPEC §4.7 steps 5–11, §14.6's opening steps 1–7): `createBattle` opens round 1, and
// the aftermath's step every later one. It clears the last clash, pays the income from round 2, sets the
// round's Sporestorm with `roundStarted`, fires the `battleStart` and `roundStart` triggers, lets the
// general plan first and a bot or general on the player's side after it (`planTurn`), and enters planning.
// The draft step is empty in R2a (plan Call 26). Begin's clash half fields both armies and resolves the
// muster (§4.7 steps 12–14), and the clash's end scores the round and checks the battle's end (§4.7 step
// 17, §6.5). It stands beside v1's code until R2b moves it to `src/sim/round.ts`.
import type { ModifierDef } from '../../data/schema.ts';
import { musterKnits } from '../formation.ts';
import type { MusterUnit } from '../formation.ts';
import { planTurn } from './ai/controller.ts';
import { squadStats } from './compile.ts';
import { addUnit } from './create.ts';
import { collectRoundEffects, fireTriggers, roundModifiers } from './effects.ts';
import { formationOf } from './formation.ts';
import type { MusterTrio, SquadPlan } from './formation.ts';
import { closeRound, emptyRoundStats } from './stats.ts';
import { SIDES, other } from './state.ts';
import type { BattleState, ClashState, FieldedSquad, LaneResult, RoundResult, Side, SquadState } from './state.ts';
import { payIncome } from './systems/economy.ts';
import { mergeTriosNow } from './systems/merging.ts';
import { capFor, decisionWinner, laneDamage, roundOutcome, stormBpFor, stormStep, stormed, takenMods } from './systems/victory.ts';
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
    maxElders: { player: 0, enemy: 0 },
    arrived: { player: 0, enemy: 0 },
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
  // the power is ready again from this clash's first tick (§6.6)
  for (const s of SIDES) { state.sides[s].bankedAtBegin = state.sides[s].gold; state.sides[s].powerUsed = false; }
  for (const b of state.buildings) b.fielded = true;
  state.phase = 'clash';
  const clash = (state.clash = newClash(state));
  const plans = { player: formationOf(state, 'player'), enemy: formationOf(state, 'enemy') };
  const fx = collectRoundEffects(roundModifiers(state.library, state.config));
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
 * The clash's end (§4.7 step 17, §14.6 clash step 13), on the tick its last lane ends: the round is scored
 * from the lanes' locks, the round's winner fires its `roundWon` triggers (none after a drawn round), the
 * round's stats close (§5.7), and the battle's end is checked, which sets `outcome`. Either way the battle
 * enters the aftermath, whose step ends the battle or opens the next round.
 */
export function endClash(state: BattleState): void {
  const { winner } = roundOutcome(scoreRound(state).damage);
  if (winner) fireTriggers(state, winner, 'roundWon', { x: 0, y: 0, lane: -1, sourceBuildingId: 0 });
  closeRound(state);
  const outcome = battleOutcome(state);
  if (outcome) state.outcome = outcome;
  state.phase = 'aftermath';
}

/**
 * Scores the round from the lanes' locks in §6.7's integer order (§13.3 rule 5, §14.6 clash step 13). Each
 * lane's winner deals 25 × its margin to the loser's Heartcap, × the round's storm, × the loser's
 * damage-taken modifiers; each Heartcap's sum over the lanes it lost is then capped and applied, down to 0,
 * with `heartcapDamaged`. The round's `RoundResult` records each side's damage capped, before the HP floor
 * (R2-Q11), and each lane's before the cap (A068). The clash's fielded record moves into it, with this
 * round's damage and survivors by building (plan Call 13, A064). Its stats close in `endClash`, once its
 * `roundWon` triggers have fired (`closeRound`).
 */
export function scoreRound(state: BattleState): RoundResult {
  const clash = state.clash!, rules = state.rules;
  const stormBp = stormBpFor(rules.storm, state.round);
  // what each Heartcap takes, summed over the lanes it lost, before the cap
  const taken: Record<Side, number> = { player: 0, enemy: 0 };
  const lanes = clash.lanes.map((lock): LaneResult => {
    let damage = 0;
    if (lock.winner) {
      const loser = other(lock.winner);
      damage = takenMods(stormed(laneDamage(lock.margin, rules.heartcapDamagePerSupply), stormBp), damageTakenBp(state, loser));
      taken[loser] += damage;
    }
    return { winner: lock.winner, survivors: { ...lock.survivors }, capped: lock.capped, ticks: lock.endTick - clash.startTick, damage };
  });
  const damage: Record<Side, number> = { player: 0, enemy: 0 };
  let capped = false;
  for (const s of SIDES) {
    const ss = state.sides[s];
    const amount = Math.min(taken[s], capFor(rules.roundDamageCap, ss.heartcapMaxHp, stormBp));
    const cut = amount < taken[s];
    if (cut) capped = true;
    damage[other(s)] = amount;
    if (amount === 0) continue;
    ss.heartcapHp = Math.max(0, ss.heartcapHp - amount);
    state.stats[s].heartcapDamageTaken += amount;
    state.stats[other(s)].heartcapDamageDealt += amount;
    state.events.push({ t: 'heartcapDamaged', side: s, amount, stormBp, capped: cut });
  }
  const result: RoundResult = {
    round: state.round, lanes, damage, stormBp, capped,
    heartcaps: { player: state.sides.player.heartcapHp, enemy: state.sides.enemy.heartcapHp },
    fielded: clash.fielded,
    damageByBuilding: { player: roundDamageByBuilding(state, 'player'), enemy: roundDamageByBuilding(state, 'enemy') },
    survivorsByBuilding: { player: survivorsByBuilding(state, 'player'), enemy: survivorsByBuilding(state, 'enemy') },
    stats: { player: emptyRoundStats(), enemy: emptyRoundStats() },
  };
  clash.fielded = { player: [], enemy: [] };
  state.rounds.push(result);
  return result;
}

/**
 * A side's damage-taken modifiers in basis points, applied in turn (§6.7 step 3), such as Rot Ward's 8500.
 * None reaches a battle in R2a: relics aren't in its single battles, and `side.heartcapDamageTaken` comes
 * with content's v2 effects in R2b (plan Call 19).
 */
function damageTakenBp(_state: BattleState, _side: Side): number[] {
  return [];
}

/** A side's damage by building this round (A064): its battle's counters (§5.7) less what the rounds before recorded. */
function roundDamageByBuilding(state: BattleState, side: Side): Record<number, number> {
  const out: Record<number, number> = {};
  for (const [key, total] of Object.entries(state.stats[side].damageByBuilding)) {
    const id = Number(key);
    const before = state.rounds.reduce((n, r) => n + (r.damageByBuilding[side][id] ?? 0), 0);
    if (total > before) out[id] = total - before;
  }
  return out;
}

/** A side's units standing at the clash's end by building (A064), an emplacement under its tower's id. */
function survivorsByBuilding(state: BattleState, side: Side): Record<number, number> {
  const out: Record<number, number> = {};
  for (const u of state.units) if (u.side === side && u.hp > 0) out[u.sourceBuildingId] = (out[u.sourceBuildingId] ?? 0) + 1;
  return out;
}

/**
 * The battle's end, checked once a round is scored (§6.5, §14.6 clash step 13). A Heartcap at 0 is a Rout
 * for the other side, and with both at 0 the player loses (E8). After `maxRounds` with both standing it's a
 * Decision on the Heartcap damage each side dealt in the battle, as each round recorded it (`decisionWinner`).
 */
export function battleOutcome(state: BattleState): BattleState['outcome'] {
  const { player, enemy } = state.sides, round = state.round;
  if (player.heartcapHp <= 0) return { winner: 'enemy', by: 'rout', round };
  if (enemy.heartcapHp <= 0) return { winner: 'player', by: 'rout', round };
  if (round < state.rules.maxRounds) return undefined;
  const side = (s: Side) => ({
    dealt: state.rounds.reduce((n, r) => n + r.damage[s], 0), hp: state.sides[s].heartcapHp, maxHp: state.sides[s].heartcapMaxHp,
  });
  return { winner: decisionWinner(state.rules.decisionBy, { player: side('player'), enemy: side('enemy') }), by: 'decision', round };
}

/** What a trigger fired at a round's opening sees: no place, lane or building. */
const OPENING = { x: 0, y: 0, lane: -1, sourceBuildingId: 0 };

/**
 * Opens the round (§14.6's opening steps 1–7), from `createBattle` for round 1, a round scenario for its
 * round, or the aftermath's step for each later round. Only the colony and gold carry into it: the last
 * clash's units, squads, hits and clouds go, and every squad is fielded fresh at Begin (§14.4).
 */
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
  // 2. income for both sides from round 2, with any pending gold (§6.2); round 1 has its starting gold
  const income = state.round > 1 ? payIncome(state) : undefined;
  // 3. the round's Sporestorm (§6.4), then `roundStarted`
  const stormBp = stormBpFor(state.rules.storm, state.round);
  state.sporestorm = stormStep(state.rules.storm, state.round);
  state.events.push({ t: 'roundStarted', round: state.round, stormBp });
  // 4. `battleStart` in round 1, then `roundStart`, the player's first
  if (state.round === 1) for (const s of SIDES) fireTriggers(state, s, 'battleStart', OPENING);
  for (const s of SIDES) fireTriggers(state, s, 'roundStart', OPENING);
  // 5. the general plans first (§7.2): its commands run at once, then `generalPlanned`, and its plan goes in `ai.plans`
  if (state.sides.enemy.ai) planTurn(state, 'enemy', income?.enemy.total ?? 0);
  // 6. the draft (R2b: none in R2a, plan Call 26)
  // 7. a bot or general on the player's side plans after it and queues `beginClash`: the planning checkpoint (plan Call 14)
  if (state.sides.player.ai) planTurn(state, 'player', income?.player.total ?? 0);
  state.phase = 'planning';
}

