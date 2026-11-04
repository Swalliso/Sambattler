// What a planner may read in rounds (SPEC §7.1, §7.2, §7.5): its own side as it stands, the round, and the
// record of the rounds before. The general never sees what the player plants or upgrades in the same phase, so its plan
// is a function of this view and its own AI stream (plan Call 10). A planner on the player's side also sees
// the general's colony and the formation it will field, as a player does: fixed-weight bots ignore it, and
// `bot:answer` reads it (T121).
import type { BalanceDef } from '../../data/schema.ts';
import { formationOf } from '../formation.ts';
import type { SquadPlan } from '../formation.ts';
import { other } from '../state.ts';
import { isHidden, isV3 } from '../v3.ts';
import type { AiState, BattleState, BuildingState, CompiledBuilding, CompiledUnit, KitCard, PlotState, Rng4, RoundResult, Side } from '../state.ts';

/** A colony as another side sees it: its plots and buildings, and the squads it will field (§7.5). */
export interface ColonyView {
  plots: PlotState[];
  buildings: BuildingState[];
  formation: SquadPlan[];
  /** Under v3 only: the side's gold at the start of its turn, which is in view while its plantings aren't (C3.1, Plan-Q2). */
  gold?: number;
}

/** Everything a planner reads (§7.1). Its own plots and buildings are copies, so planning changes the state only by commands. */
export interface PlanningView {
  side: Side;
  round: number;
  /** False when the battle doesn't merge at all (§5.6). */
  merging: boolean;
  /**
   * The planner's knobs (§7.2, §7.3): its economy by round, placement score and the Slayer share above which swarm
   * merging goes off, and the counter cycle's rounds, multipliers, noise and sells (§7.4, §7.6).
   */
  knobs: BalanceDef['ai'];
  /** The damage matrix (§5.3), which the counter cycle reads for what beats the dominant armor, and its classes' thresholds, which the answer bot reads. */
  matrix: BattleState['rules']['matrix'];
  strongAt: number;
  weakAt: number;
  gold: number;
  /** A gold upgrade's price in percent of its building's (§6.1). */
  upgradeCostPct: number;
  kit: KitCard[];
  /** Its colony, in plot order, each plot with its building's id or 0. */
  plots: PlotState[];
  /** Its buildings, in id order. */
  buildings: BuildingState[];
  /** Its cards and its units, as compiled for the battle. */
  cards: Record<string, CompiledBuilding>;
  units: Record<string, CompiledUnit>;
  ai?: AiState;
  /** The rounds before (§7.1), with what each side fielded: the general sees the player only here. */
  rounds: readonly RoundResult[];
  /** The other side's units, to read the record's supply and tags by. */
  theirUnits: Record<string, CompiledUnit>;
  /** Its own side's AI stream, the only one it draws on (plan Call 10). */
  rng: Rng4;
  /** A planner on the player's side sees the general's colony and formation as the player may (§7.5, `visibleColony`). */
  general?: ColonyView;
}

/** The side's planning view now. */
export function planningView(state: BattleState, side: Side): PlanningView {
  const ss = state.sides[side], bal = state.library.balance;
  const view: PlanningView = {
    side,
    round: state.round,
    merging: state.config.flags.merging,
    knobs: bal.ai,
    matrix: state.rules.matrix,
    strongAt: state.rules.strongAt,
    weakAt: state.rules.weakAt,
    gold: ss.gold,
    upgradeCostPct: bal.upgradeCostPct,
    kit: ss.kit.map((c) => ({ ...c })),
    ...colonyOf(state, side),
    cards: state.compiled[side].buildings,
    units: state.compiled[side].units,
    rounds: state.rounds,
    theirUnits: state.compiled[other(side)].units,
    rng: state.rng.ai[side],
  };
  if (ss.ai) view.ai = ss.ai;
  if (side === 'player') view.general = visibleColony(state, 'enemy');
  return view;
}

/**
 * A side's colony as the other side may see it (§7.5; C3.1, T010), which a planner after the general reads, as the
 * player does. Under v2 it's the colony as it stands. Under v3 its plantings from `hideFromRound` are held back until
 * Begin (`isHidden`): their plots show empty and their squads aren't in the formation. Its sales and merge toggles
 * show at once, and its gold is what it held at the start of its turn. It writes nothing.
 */
export function visibleColony(state: BattleState, side: Side): ColonyView {
  const colony = colonyOf(state, side), formation = formationOf(state, side);
  if (!isV3(state.config)) return { ...colony, formation };
  const hidden = new Set(state.buildings.filter((b) => b.side === side && isHidden(state, b)).map((b) => b.id));
  const plans = state.sides[side].ai?.plans ?? [];
  const plan = plans.length && plans[plans.length - 1]!.round === state.round ? plans[plans.length - 1] : undefined;
  return {
    plots: colony.plots.map((p) => (hidden.has(p.building) ? { ...p, building: 0 } : p)),
    buildings: colony.buildings.filter((b) => !hidden.has(b.id)),
    formation: formation.filter((p) => !hidden.has(p.building)),
    gold: plan?.goldAtStart ?? state.sides[side].gold,
  };
}

function colonyOf(state: BattleState, side: Side): Pick<ColonyView, 'plots' | 'buildings'> {
  return {
    plots: state.sides[side].plots.map((p) => ({ ...p })),
    buildings: state.buildings.filter((b) => b.side === side).map((b) => ({ ...b })),
  };
}
