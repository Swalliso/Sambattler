// What a planner may read in rounds (SPEC §7.1, §7.2, §7.5): its own side as it stands, the round, and the
// record of the rounds before. The general never sees what the player plants or upgrades in the same phase, so its plan
// is a function of this view and its own AI stream (plan Call 10). A planner on the player's side also sees
// the general's colony and the formation it will field, as a player does: fixed-weight bots ignore it, and
// `bot:answer` reads it (T121).
import type { BalanceDef } from '../../data/schema.ts';
import { formationOf } from '../formation.ts';
import type { SquadPlan } from '../formation.ts';
import { other } from '../state.ts';
import type { AiState, BattleState, BuildingState, CompiledBuilding, CompiledUnit, KitCard, PlotState, Rng4, RoundResult, Side } from '../state.ts';

/** A colony as another side sees it: its plots and buildings, and the squads it will field (§7.5). */
export interface ColonyView {
  plots: PlotState[];
  buildings: BuildingState[];
  formation: SquadPlan[];
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
  /** A planner on the player's side sees the general's colony and formation (§7.5). */
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
  if (side === 'player') view.general = { ...colonyOf(state, 'enemy'), formation: formationOf(state, 'enemy') };
  return view;
}

function colonyOf(state: BattleState, side: Side): Pick<ColonyView, 'plots' | 'buildings'> {
  return {
    plots: state.sides[side].plots.map((p) => ({ ...p })),
    buildings: state.buildings.filter((b) => b.side === side).map((b) => ({ ...b })),
  };
}
