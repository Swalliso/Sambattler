// Per-lane battle traces (step A of docs/ideas/one-more-run-review.md): where each side builds,
// how much supply it fields in each lane, which lane breaks first and whether its other lanes keep
// producing. Used by `npm run experiment -- --checks lanes --maps twin-roots`.
import type { Content } from '../../src/data/registry.ts';
import { runHeadless } from '../../src/sim/index.ts';
import type { BattleState, Side } from '../../src/sim/index.ts';
import { HEARTCAP_ID } from '../../src/sim/state.ts';
import { buildState, median } from './run.ts';

/** Clock times (seconds) at which per-lane supply on the field is sampled. */
export const LANE_SUPPLY_AT = [60, 120, 180, 240, 300];

export interface LaneTrace {
  seed: number;
  /** The mono side's seat. */
  monoSide: Side;
  winner: Side | null;
  by: 'rout' | 'decision' | null;
  seconds: number;
  /** Per side, buildings placed in each lane (spawners only, and all kinds). */
  spawnersPlaced: Record<Side, number[]>;
  placed: Record<Side, number[]>;
  /** Per side, units spawned in each lane, before and after the loser's first Heartcap hit. */
  spawned: Record<Side, number[]>;
  /** Per side, buildings lost in each lane. */
  lost: Record<Side, number[]>;
  /** Per side and lane, supply on the field at each `LANE_SUPPLY_AT` mark (absent once the battle ended). */
  supplyAt: Record<Side, Record<number, number[]>>;
  /** The lane in which each side's Heartcap was first hit, and when (seconds); null if never. */
  firstHeartcapHit: Record<Side, { lane: number; seconds: number } | null>;
  /** Per side, units spawned in each lane in the 60 s before its Heartcap was first hit. */
  spawnedBeforeBreak: Record<Side, number[]>;
}

const zeros = (n: number) => Array.from({ length: n }, () => 0);

/** Plays one battle and records its per-lane trace. */
export function traceBattle(content: Content, opts: { seed: number; map: string; player: string; enemy: string; monoSide: Side }): LaneTrace {
  const state = buildState(content, { seed: opts.seed, map: opts.map, player: opts.player, enemy: opts.enemy });
  const L = state.lanes.length;
  const both = <T>(f: () => T): Record<Side, T> => ({ player: f(), enemy: f() });
  const t: LaneTrace = {
    seed: opts.seed, monoSide: opts.monoSide, winner: null, by: null, seconds: 0,
    spawnersPlaced: both(() => zeros(L)), placed: both(() => zeros(L)), spawned: both(() => zeros(L)), lost: both(() => zeros(L)),
    supplyAt: both(() => ({})), firstHeartcapHit: { player: null, enemy: null }, spawnedBeforeBreak: both(() => zeros(L)),
  };
  // spawn ticks per side and lane, to count production in the minute before a break
  const spawnTicks: Record<Side, number[][]> = both(() => Array.from({ length: L }, () => [] as number[]));
  const onTick = (s: BattleState) => {
    const tr = s.rules.tickRate;
    for (const e of s.events) {
      if (e.t === 'spawned') {
        const u = s.units.find((v) => v.id === e.id);
        if (u) { t.spawned[u.side][u.lane]!++; spawnTicks[u.side][u.lane]!.push(s.tick); }
      } else if (e.t === 'buildingPlaced') {
        const b = s.buildings.find((v) => v.id === e.id);
        if (b) {
          t.placed[b.side][b.lane]!++;
          if (s.compiled[b.side].buildings[b.buildingId]?.kind === 'spawner') t.spawnersPlaced[b.side][b.lane]!++;
        }
      } else if (e.t === 'buildingDestroyed') {
        const lane = laneOfRow(s, e.row);
        if (lane >= 0) t.lost[e.side][lane]!++;
      } else if (e.t === 'hit') {
        for (const side of ['player', 'enemy'] as const) {
          if (e.target !== HEARTCAP_ID[side] || t.firstHeartcapHit[side]) continue;
          const src = s.units.find((v) => v.id === e.src);
          const lane = src ? src.lane : laneOfRow(s, Math.floor(e.y));
          t.firstHeartcapHit[side] = { lane, seconds: s.tick / tr };
        }
      }
    }
    const secs = s.tick / tr;
    if (LANE_SUPPLY_AT.includes(secs)) {
      for (const side of ['player', 'enemy'] as const) {
        const per = zeros(L);
        for (const u of s.units) if (u.side === side) per[u.lane]! += u.supply;
        t.supplyAt[side][secs] = per;
      }
    }
  };
  runHeadless(state, { until: 'end', onTick });
  t.winner = state.outcome?.winner ?? null;
  t.by = state.outcome?.by ?? null;
  t.seconds = state.tick / state.rules.tickRate;
  for (const side of ['player', 'enemy'] as const) {
    const hit = t.firstHeartcapHit[side];
    if (!hit) continue;
    const at = hit.seconds * state.rules.tickRate, from = at - 60 * state.rules.tickRate;
    t.spawnedBeforeBreak[side] = spawnTicks[side].map((ticks) => ticks.filter((k) => k >= from && k < at).length);
  }
  return t;
}

function laneOfRow(state: BattleState, row: number): number {
  return state.lanes.findIndex((l) => row >= l.rowStart && row <= l.rowEnd);
}

export interface LaneSummary {
  map: string;
  mono: string;
  defender: string;
  games: number;
  monoWins: number;
  decisions: number;
  medianSeconds: number;
  /** How the mono side split its spawners: games with every spawner in one lane, and the mean share in its busier lane. */
  monoOneLane: number;
  monoBusyLaneShare: number;
  defenderBusyLaneShare: number;
  /** Mean supply on the field per side (mono, defender) at each mark: [busier lane, other lane] for the mono side's busier lane. */
  supplyAt: Record<number, { monoBusy: number; monoOther: number; defBusy: number; defOther: number; n: number }>;
  /** Where the defender's Heartcap first fell under fire: in the mono side's busier lane, or the other. */
  defenderBrokeInBusyLane: number;
  defenderBroke: number;
  /** Defender units spawned in the minute before its first Heartcap hit: in the broken lane, and in the other lanes. */
  defenderSpawnedBeforeBreak: { broken: number; other: number };
  /** Mono side's Heartcap hits, when the defender won or reached it. */
  monoBroke: number;
  traces: LaneTrace[];
}

/** Mono `building` against `defender` on `map`, both seats, with per-lane traces. */
export function laneSummary(content: Content, opts: { map: string; mono: string; defender: string; seeds: number }): LaneSummary {
  const traces: LaneTrace[] = [];
  const bot = `bot:mono:${opts.mono}`;
  for (let seed = 1; seed <= opts.seeds; seed++) {
    for (const monoSide of ['player', 'enemy'] as const) {
      traces.push(traceBattle(content, {
        seed, map: opts.map, monoSide, player: monoSide === 'player' ? bot : opts.defender, enemy: monoSide === 'player' ? opts.defender : bot,
      }));
    }
  }
  const s: LaneSummary = {
    map: opts.map, mono: opts.mono, defender: opts.defender, games: traces.length, monoWins: 0, decisions: 0,
    medianSeconds: median(traces.map((t) => t.seconds)), monoOneLane: 0, monoBusyLaneShare: 0, defenderBusyLaneShare: 0,
    supplyAt: {}, defenderBrokeInBusyLane: 0, defenderBroke: 0, defenderSpawnedBeforeBreak: { broken: 0, other: 0 }, monoBroke: 0, traces,
  };
  for (const t of traces) {
    const mono = t.monoSide, def: Side = mono === 'player' ? 'enemy' : 'player';
    if (t.winner === mono) s.monoWins++;
    if (t.by === 'decision') s.decisions++;
    const sp = t.spawnersPlaced[mono];
    const total = sp.reduce((a, b) => a + b, 0);
    const busy = sp.indexOf(Math.max(...sp));
    if (total > 0 && sp[busy] === total) s.monoOneLane++;
    s.monoBusyLaneShare += total ? sp[busy]! / total / traces.length : 0;
    const dsp = t.spawnersPlaced[def], dTotal = dsp.reduce((a, b) => a + b, 0);
    s.defenderBusyLaneShare += dTotal ? Math.max(...dsp) / dTotal / traces.length : 0;
    for (const [secs, per] of Object.entries(t.supplyAt[mono])) {
      const dPer = t.supplyAt[def][Number(secs)]!;
      const row = (s.supplyAt[Number(secs)] ??= { monoBusy: 0, monoOther: 0, defBusy: 0, defOther: 0, n: 0 });
      row.n++;
      row.monoBusy += per[busy]!;
      row.monoOther += per.reduce((a, b) => a + b, 0) - per[busy]!;
      row.defBusy += dPer[busy]!;
      row.defOther += dPer.reduce((a, b) => a + b, 0) - dPer[busy]!;
    }
    const hit = t.firstHeartcapHit[def];
    if (hit) {
      s.defenderBroke++;
      if (hit.lane === busy) s.defenderBrokeInBusyLane++;
      const before = t.spawnedBeforeBreak[def];
      s.defenderSpawnedBeforeBreak.broken += before[hit.lane] ?? 0;
      s.defenderSpawnedBeforeBreak.other += before.reduce((a, b) => a + b, 0) - (before[hit.lane] ?? 0);
    }
    if (t.firstHeartcapHit[mono]) s.monoBroke++;
  }
  for (const row of Object.values(s.supplyAt)) {
    row.monoBusy /= row.n; row.monoOther /= row.n; row.defBusy /= row.n; row.defOther /= row.n;
  }
  return s;
}

export function laneLines(s: LaneSummary): string[] {
  const pct = (x: number, n = s.games) => `${Math.round((100 * x) / Math.max(1, n))}%`;
  const clock = (x: number) => `${Math.floor(x / 60)}:${String(Math.round(x % 60)).padStart(2, '0')}`;
  const f = (x: number) => x.toFixed(1);
  return [
    `lanes: mono:${s.mono} vs ${s.defender} on ${s.map} (${s.games} games): mono wins ${pct(s.monoWins)}, Decisions ${pct(s.decisions)}, median ${clock(s.medianSeconds)}`,
    `    mono spawners all in one lane in ${pct(s.monoOneLane)} of games; busier-lane share: mono ${pct(s.monoBusyLaneShare, 1)}, defender ${pct(s.defenderBusyLaneShare, 1)}`,
    `    supply on field, mono busy/other lane vs defender in the same lanes: ${Object.entries(s.supplyAt).map(([t, r]) => `${clock(Number(t))} ${f(r.monoBusy)}/${f(r.monoOther)} vs ${f(r.defBusy)}/${f(r.defOther)} (n ${r.n})`).join(' · ')}`,
    `    defender Heartcap hit in ${s.defenderBroke} games, ${s.defenderBrokeInBusyLane} of them in the mono side's busier lane; mono Heartcap hit in ${s.monoBroke}`,
    `    defender units spawned in the minute before its Heartcap was first hit: ${s.defenderSpawnedBeforeBreak.broken} in the broken lane, ${s.defenderSpawnedBeforeBreak.other} in the other lanes`,
  ];
}
