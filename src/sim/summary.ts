// A JSON summary of a battle in the shape the headless CLI prints (SPEC §15.2). The browser bridge
// returns the same object, so Node and the browser can be compared field by field.
import { hashState } from './snapshot.ts';
import { SIDES } from './state.ts';
import type { BattleState, Side } from './state.ts';
import { columnsOwned } from './world.ts';

export function formatClock(ticks: number, tickRate = 20): string {
  const s = Math.floor(ticks / tickRate);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

export interface BattleSummary {
  seed: number;
  map: string;
  tick: number;
  phase: BattleState['phase'];
  winner: Side | null;
  by: 'rout' | 'decision' | null;
  durationTicks: number;
  duration: string;
  hash: string;
  gold: Record<Side, number>;
  supply: Record<Side, { used: number; cap: number; text: string }>;
  columns: Record<Side, number>;
  heartcap: Record<Side, number>;
  spawned: Record<Side, Record<string, number>>;
  merges: Record<Side, { '2': number; '3': number }>;
  goldEarned: Record<Side, BattleState['stats']['player']['goldEarned']>;
  buildings: Record<Side, number>;
  units: Record<Side, number>;
  sporestorm: number;
  lanes: { pBorder: number; eBorder: number; capture: BattleState['lanes'][number]['capture'] }[];
  rejectedCommands: number;
  stats: BattleState['stats'];
  /** Event counts so far (filled in by the headless runner). */
  events?: Record<string, number>;
}

export function summarize(state: BattleState): BattleSummary {
  const per = <T>(f: (s: Side) => T): Record<Side, T> => ({ player: f('player'), enemy: f('enemy') });
  return {
    seed: state.config.seed,
    map: state.map.id,
    tick: state.tick,
    phase: state.phase,
    winner: state.outcome?.winner ?? null,
    by: state.outcome?.by ?? null,
    durationTicks: state.tick,
    duration: formatClock(state.tick, state.rules.tickRate),
    hash: hashState(state),
    gold: per((s) => state.sides[s].gold),
    supply: per((s) => {
      const ss = state.sides[s];
      return { used: ss.supplyUsed, cap: ss.supplyCap, text: `${ss.supplyUsed}/${ss.supplyCap}` };
    }),
    columns: per((s) => columnsOwned(state, s)),
    heartcap: per((s) => state.sides[s].heartcapHp),
    spawned: per((s) => {
      const out: Record<string, number> = {};
      for (const id of Object.keys(state.compiled[s].units).sort()) out[id] = 0;
      return Object.assign(out, state.stats[s].spawned);
    }),
    merges: per((s) => ({ ...state.stats[s].merges })),
    goldEarned: per((s) => ({ ...state.stats[s].goldEarned })),
    buildings: per((s) => state.buildings.filter((b) => b.side === s).length),
    units: per((s) => state.units.filter((u) => u.side === s).length),
    sporestorm: state.sporestorm,
    lanes: state.lanes.map((l) => ({ pBorder: l.pBorder, eBorder: l.eBorder, capture: JSON.parse(JSON.stringify(l.capture)) })),
    rejectedCommands: SIDES.reduce((n, s) => n + state.stats[s].rejectedCommands, 0),
    stats: JSON.parse(JSON.stringify(state.stats)),
  };
}
