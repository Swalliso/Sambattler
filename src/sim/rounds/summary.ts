// A JSON summary of a battle in rounds (SPEC §5.7, §14.4, §15.2): the round and phase, both Heartcaps, the
// damage each side has dealt, the round log, gold, plots planted of owned, and the stats, the battle's with
// each round's record. The bridge and the headless runner return it, so Node and the browser can be compared
// field by field. Ids and numbers only (R2-Q8). It stands beside v1's `src/sim/summary.ts` until R2b moves
// it there.
import { hashState } from './snapshot.ts';
import { SIDES } from './state.ts';
import type { BattleState, LaneResult, RoundStats, Side, SideStats } from './state.ts';

/** One round in the log (§15.2): its storm as a multiplier, the Heartcap damage each side took, and each lane's result. */
export interface RoundLogEntry {
  round: number;
  storm: number;
  taken: Record<Side, number>;
  lanes: Pick<LaneResult, 'winner' | 'ticks' | 'capped' | 'survivors'>[];
}

export interface RoundSummary {
  seed: number;
  map: string;
  round: number;
  phase: BattleState['phase'];
  /** Clash ticks so far this battle. */
  tick: number;
  winner: Side | null;
  by: 'rout' | 'decision' | null;
  hash: string;
  heartcap: Record<Side, number>;
  heartcapMax: Record<Side, number>;
  /** The Heartcap damage each side has dealt in the battle, as its rounds recorded it, which a Decision reads (§6.5). */
  dealt: Record<Side, number>;
  roundLog: RoundLogEntry[];
  gold: Record<Side, number>;
  /** Plots with a building, of the open plots a building can take: a stump plot takes none (§4.6). */
  plots: Record<Side, { planted: number; owned: number }>;
  rejectedCommands: number;
  /** The battle's figures, with each round's record (§5.7, §15.2). */
  stats: Record<Side, SideStats & { rounds: RoundStats[] }>;
}

const per = <T>(f: (s: Side) => T): Record<Side, T> => ({ player: f('player'), enemy: f('enemy') });
const copy = <T>(x: T): T => JSON.parse(JSON.stringify(x)) as T;

export function summarize(state: BattleState): RoundSummary {
  return {
    seed: state.config.seed,
    map: state.map.id,
    round: state.round,
    phase: state.phase,
    tick: state.tick,
    winner: state.outcome?.winner ?? null,
    by: state.outcome?.by ?? null,
    hash: hashState(state),
    heartcap: per((s) => state.sides[s].heartcapHp),
    heartcapMax: per((s) => state.sides[s].heartcapMaxHp),
    dealt: per((s) => state.rounds.reduce((n, r) => n + r.damage[s], 0)),
    roundLog: state.rounds.map((r) => ({
      round: r.round,
      storm: r.stormBp / 10000,
      taken: { player: r.damage.enemy, enemy: r.damage.player },
      lanes: r.lanes.map((l) => ({ winner: l.winner, ticks: l.ticks, capped: l.capped, survivors: { ...l.survivors } })),
    })),
    gold: per((s) => state.sides[s].gold),
    plots: per((s) => {
      const usable = state.sides[s].plots.filter((p) => p.open && p.terrain !== 'stump');
      return { planted: usable.filter((p) => p.building).length, owned: usable.length };
    }),
    rejectedCommands: SIDES.reduce((n, s) => n + state.stats[s].rejectedCommands, 0),
    stats: per((s) => ({ ...copy(state.stats[s]), rounds: state.rounds.map((r) => copy(r.stats[s])) })),
  };
}
