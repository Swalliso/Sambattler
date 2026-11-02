// Balance harness (SPEC §12): production and supply duels, bot tournaments, the guardrail
// evaluations G1–G8, the counter matrix (combat rework P0) and the commander tournament (SPEC §16 M5). Shared by `npm run balance`, `npm run experiment` and the slow test suite. Duels measure the base
// counter matrix, so they run with merging off; battles use the milestone's default flags. R1's clash
// bars (G3, G12 and G13 on clashes, SPEC §12.2) sit beside the counter matrix, on tools/lib/clash.ts.
import type { Content } from '../../src/data/registry.ts';
import type { BotDef } from '../../src/data/schema.ts';
import { addBuilding, addUnit } from '../../src/sim/create.ts';
import { COUNTER_KINDS, SIDES, buildLibrary, counterKindsOf, counterSets, createBattle, makeConfig, runHeadless, summarize } from '../../src/sim/index.ts';
import type { BattleConfig, BattleState, CounterKind, Side, Tier } from '../../src/sim/index.ts';
import { buildingDef } from '../../src/sim/world.ts';
import { mapPool, simulateRun } from '../../src/run/index.ts';
import { CLASH, MIRROR_SEED, armyFromBot, clashArmyIds, clashField, clashOpts, squadSize } from './clash.ts';
import type { Army, ArmyEntry, ArmyOpts, ClashField, ClashJob, ClashOpts, ClashRecord, FieldId, Reading, SquadOpts } from './clash.ts';
import { rosterIds } from './roster.ts';
import { median, runBattle } from './run.ts';

export { rosterIds };

const DUEL_TEST = { noTurrets: true, noTerritory: true, noHeartcapTargets: true };

/** Deterministic tool-side jitter (positions only; the sim keeps its own seeded streams). */
function toolRand(seed: number): () => number {
  let s = (seed * 2654435761) >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function duelState(content: Content, seed: number, seconds: number): BattleState {
  const config = makeConfig(content, {
    seed, mapId: 'test-flat', player: 'human', enemy: 'human', flags: { merging: false },
    test: { ...DUEL_TEST, timeLimitSeconds: seconds },
  });
  const state = createBattle(content, config);
  state.phase = 'live';
  return state;
}

/**
 * Spawners whose units fight. Support units (the Tender) heal instead of attacking, so they can't
 * win a duel by design and are left out of the G1/G2 duel matrices.
 */
export function spawnerIds(content: Content): string[] {
  return rosterIds(content).filter((id) => {
    const b = content.buildings[id]!;
    return b.kind === 'spawner' && !content.units[b.spawn!.unit]!.tags.includes('support');
  });
}

/** `capguard@2` → { unit: 'capguard', tier: 2 }. */
export function duelUnit(ref: string): { unit: string; tier: Tier } {
  const [unit, tier] = ref.split('@');
  return { unit: unit!, tier: (tier ? Number(tier) : 1) as Tier };
}

/** Gold value of one unit: its building's cost amortised over a minute of production. */
function unitValue(content: Content, unitId: string): number {
  for (const id of content.buildingOrder) {
    const b = content.buildings[id]!;
    if (b.spawn?.unit === unitId) return (b.cost * b.spawn.interval) / (b.spawn.count * 60);
  }
  return 0;
}

function remainingValue(content: Content, state: BattleState, side: Side): number {
  let v = 0;
  for (const u of state.units) if (u.side === side) v += (u.hp / u.maxHp) * unitValue(content, u.unitId);
  for (const b of state.buildings) if (b.side === side) v += (b.hp / b.maxHp) * buildingDef(state, b).cost;
  return v;
}

export interface DuelOutcome { a: string; b: string; seed: number; valueA: number; valueB: number; winner: 'a' | 'b' | 'draw' }

/** Equal gold spent on one building type per side, three minutes, no turrets/territory/Heartcaps. */
export function productionDuel(content: Content, a: string, b: string, seed: number): DuelOutcome {
  const t = content.targets.G1;
  const state = duelState(content, seed, t.seconds);
  const slots: [number, number][] = [[2, 0], [2, 2], [2, 4], [2, 6], [0, 0], [0, 2], [0, 4], [0, 6]];
  const W = state.map.width;
  const place = (side: Side, id: string) => {
    const n = Math.min(slots.length, Math.floor(t.goldBudget / content.buildings[id]!.cost));
    for (let i = 0; i < n; i++) {
      const [c, r] = slots[i]!;
      const col = side === 'player' ? c : W - 2 - c;
      const row = side === 'player' ? r : state.map.height - 2 - r;
      addBuilding(state, side, id, 0, col, row, content.buildings[id]!.cost);
    }
  };
  place('player', a);
  place('enemy', b);
  runHeadless(state, { until: 'end' });
  // normalise by gold actually spent: whole buildings rarely divide the budget exactly
  const spent = (id: string) => Math.min(slots.length, Math.floor(t.goldBudget / content.buildings[id]!.cost)) * content.buildings[id]!.cost;
  const valueA = (remainingValue(content, state, 'player') * t.goldBudget) / spent(a);
  const valueB = (remainingValue(content, state, 'enemy') * t.goldBudget) / spent(b);
  return { a, b, seed, valueA, valueB, winner: valueA > valueB ? 'a' : valueB > valueA ? 'b' : 'draw' };
}

/**
 * 12 supply of unit A against 12 supply of unit B, fought to the death. Units are `id` or `id@tier`
 * (a merged unit costs 2s or 4s supply, so fewer of them take the field).
 */
export function supplyDuel(content: Content, a: string, b: string, seed: number, supply = content.targets.G2.supply): DuelOutcome & { seconds: number } {
  const t = content.targets.G2;
  const state = duelState(content, seed, t.maxSeconds);
  const rand = toolRand(seed * 7919 + a.length * 31 + b.length);
  const put = (side: Side, ref: string) => {
    const { unit: unitId, tier } = duelUnit(ref);
    const per = state.compiled[side].units[unitId]!.tiers[tier - 1]!.supply;
    const n = Math.floor(supply / per);
    // spread the army over the lane height (up to 7 rows) so frontage is not an artefact of the setup
    const rows = Math.min(n, 7);
    const span = state.map.height - 1.2;
    for (let i = 0; i < n; i++) {
      const col = Math.floor(i / rows), row = i % rows;
      const x0 = side === 'player' ? 10 - col * 0.9 : 22 + col * 0.9;
      const y = 0.6 + (rows > 1 ? (row * span) / (rows - 1) : span / 2) + (rand() - 0.5) * 0.4;
      const x = x0 + (rand() - 0.5) * 0.6;
      addUnit(state, side, unitId, 0, x, y, 0, tier);
    }
  };
  // every roster unit has a compiled def: the default kit is the whole roster
  put('player', a);
  put('enemy', b);
  const maxTicks = t.maxSeconds * 20;
  runHeadless(state, {
    until: maxTicks,
    onTick: (s) => {
      const p = s.units.some((u) => u.side === 'player'), e = s.units.some((u) => u.side === 'enemy');
      if (!p || !e) s.phase = 'ended';
    },
  });
  const supplyValue = (side: Side) => state.units.filter((u) => u.side === side).reduce((v, u) => v + (u.hp / u.maxHp) * u.supply, 0);
  const valueA = supplyValue('player'), valueB = supplyValue('enemy');
  return { a, b, seed, valueA, valueB, winner: valueA > valueB ? 'a' : valueB > valueA ? 'b' : 'draw', seconds: state.tick / 20 };
}

// ---------------------------------------------------------------- guardrails

export interface Verdict { id: string; pass: boolean; summary: string; details: string[] }

export function evaluateG1(content: Content): { verdict: Verdict; outcomes: DuelOutcome[] } {
  const t = content.targets.G1;
  const ids = spawnerIds(content);
  const outcomes: DuelOutcome[] = [];
  for (const a of ids) for (const b of ids) {
    if (a === b) continue;
    for (let seed = 1; seed <= t.seeds; seed++) outcomes.push(productionDuel(content, a, b, seed));
  }
  // A pairing (a vs b) counts both orientations; a building "wins" it if it wins most of those games.
  const details: string[] = [];
  let pass = true;
  for (const a of ids) {
    let pairWins = 0, pairs = 0, clearLoss = false, anyWin = false;
    for (const b of ids) {
      if (a === b) continue;
      const games = outcomes.filter((o) => (o.a === a && o.b === b) || (o.a === b && o.b === a));
      let wins = 0, ratioSum = 0;
      for (const o of games) {
        const mine = o.a === a ? o.valueA : o.valueB, theirs = o.a === a ? o.valueB : o.valueA;
        if (mine > theirs) wins++;
        ratioSum += (theirs + 1) / (mine + 1);
      }
      pairs++;
      if (wins * 2 > games.length) { pairWins++; anyWin = true; }
      if (ratioSum / games.length >= t.clearLossRatio && wins * 2 < games.length) clearLoss = true;
    }
    const share = pairWins / pairs;
    const ok = share <= t.maxPairingWinShare && anyWin && clearLoss;
    if (!ok) pass = false;
    details.push(`${ok ? 'ok  ' : 'FAIL'} ${a}: wins ${pairWins}/${pairs} pairings${anyWin ? '' : ' (wins none)'}${clearLoss ? '' : ' (never loses clearly)'}`);
  }
  return { verdict: { id: 'G1', pass, summary: 'production duels: ≤80% pairing wins, ≥1 win and ≥1 clear loss each', details }, outcomes };
}

export function evaluateG2(content: Content): { verdict: Verdict; outcomes: DuelOutcome[]; edges: Record<string, number> } {
  const t = content.targets.G2;
  const units = spawnerIds(content).map((id) => content.buildings[id]!.spawn!.unit);
  const outcomes: DuelOutcome[] = [];
  const edges: Record<string, number> = {};
  for (let i = 0; i < units.length; i++) for (let j = 0; j < units.length; j++) {
    if (i === j) continue;
    const a = units[i]!, b = units[j]!;
    let wins = 0;
    for (let seed = 1; seed <= t.seeds; seed++) {
      const o = supplyDuel(content, a, b, seed);
      outcomes.push(o);
      if (o.winner === 'a') wins++;
    }
    edges[`${a}>${b}`] = wins;
  }
  const details: string[] = [];
  let pass = true;
  for (const a of units) {
    const beats = units.filter((b) => b !== a && (edges[`${a}>${b}`] ?? 0) >= t.minSeedsForEdge);
    const losesTo = units.filter((b) => b !== a && (edges[`${b}>${a}`] ?? 0) >= t.minSeedsForEdge);
    const ok = beats.length > 0 && losesTo.length > 0;
    if (!ok) pass = false;
    details.push(`${ok ? 'ok  ' : 'FAIL'} ${a}: beats [${beats.join(', ')}] · loses to [${losesTo.join(', ')}]`);
  }
  for (const [a, b] of t.intendedEdges) {
    if (edges[`${a}>${b}`] === undefined) {
      // an edge outside the base matrix (e.g. against a Bloomed unit): duel it now
      let wins = 0;
      for (let seed = 1; seed <= t.seeds; seed++) {
        const o = supplyDuel(content, a, b, seed);
        outcomes.push(o);
        if (o.winner === 'a') wins++;
      }
      edges[`${a}>${b}`] = wins;
    }
    const w = edges[`${a}>${b}`]!;
    const asserted = (t.assertedEdges ?? []).some(([x, y]) => x === a && y === b);
    if (asserted && w < t.minSeedsForEdge) pass = false;
    details.push(`${w >= t.minSeedsForEdge ? 'held' : 'MISS'} intended edge ${a} > ${b}: ${w}/${t.seeds} seeds${asserted ? ' (asserted)' : ' (report only)'}`);
  }
  return { verdict: { id: 'G2', pass, summary: 'supply duels form a healthy counter graph (≥4/5 seeds per edge) and the asserted intended edges hold', details }, outcomes, edges };
}

export interface MatchStats {
  games: number; winsA: number; decisions: number; lengths: number[]; rejected: number; wallMs: number[];
  /** Supply spawned per unit type, summed over games, for A and B. */
  spawnedSupply: { a: Record<string, number>; b: Record<string, number> };
  merges: { a: number; b: number };
}

/**
 * Plays `a` against `b` over seeds, in both seats when `symmetric` (A as player, then A as enemy),
 * and reports A's results. `goldA` gives A extra starting gold.
 */
export function matchup(
  content: Content, a: string, b: string, seeds: number, symmetric: boolean, goldA = 0, map = 'bogwater-hollow',
  flags?: Partial<BattleConfig['flags']>,
): MatchStats {
  const st: MatchStats = {
    games: 0, winsA: 0, decisions: 0, lengths: [], rejected: 0, wallMs: [],
    spawnedSupply: { a: {}, b: {} }, merges: { a: 0, b: 0 },
  };
  for (let seed = 1; seed <= seeds; seed++) {
    const seats: ['player' | 'enemy'][] = symmetric ? [['player'], ['enemy']] : [['player']];
    for (const [seatA] of seats) {
      const { result } = runBattle(content, {
        seed, map,
        player: seatA === 'player' ? a : b,
        enemy: seatA === 'player' ? b : a,
        startingGold: goldA ? { [seatA]: goldA } : {},
        ...(flags ? { flags } : {}),
      });
      st.games++;
      if (result.winner === seatA) st.winsA++;
      if (result.by === 'decision') st.decisions++;
      st.lengths.push(result.durationTicks);
      st.rejected += result.rejectedCommands;
      st.wallMs.push(result.wallMs);
      const seatB: Side = seatA === 'player' ? 'enemy' : 'player';
      for (const [who, side] of [['a', seatA], ['b', seatB]] as const) {
        for (const [unit, n] of Object.entries(result.spawned[side])) {
          st.spawnedSupply[who][unit] = (st.spawnedSupply[who][unit] ?? 0) + n * content.units[unit]!.supply;
        }
        st.merges[who] += result.merges[side]['2'] + result.merges[side]['3'];
      }
    }
  }
  return st;
}

/** Share of spawned supply that came from units with `tag`. */
export function tagShare(content: Content, spawnedSupply: Record<string, number>, tag: string): number {
  let all = 0, tagged = 0;
  for (const [unit, n] of Object.entries(spawnedSupply)) {
    all += n;
    if ((content.units[unit]!.tags as string[]).includes(tag)) tagged += n;
  }
  return all > 0 ? tagged / all : 0;
}

/** One G3 cell: `bot:mono:<id>` against the defender on one map, `seeds` per seat. Rates are the mono bot's. */
export interface G3Row {
  map: string; id: string;
  /** Mono wins and games over both seats. */
  wins: number; games: number;
  /** Win rate over both seats, then as player and as enemy. */
  rate: number; player: number; enemy: number;
  /** Median length in ticks, and the share of games that ended by Decision. */
  median: number; decisions: number;
  /** Diagnostics for the experiment tool: mono units spawned and lost, the defender's damage by source and in all. */
  monoSpawned: number; monoLost: number; defDamage: Record<string, number>; defDamageTotal: number;
}

/** Seeds `firstSeed` to `firstSeed + seeds - 1`, in both seats (the counter check confirms on fresh seeds). */
export function g3Row(content: Content, map: string, id: string, seeds: number, defender = 'bot:balanced', firstSeed = 1): G3Row {
  const seat = { player: 0, enemy: 0 };
  const lengths: number[] = [];
  let decisions = 0, monoSpawned = 0, monoLost = 0, defDamageTotal = 0;
  const defDamage: Record<string, number> = {};
  for (let seed = firstSeed; seed < firstSeed + seeds; seed++) {
    for (const side of ['player', 'enemy'] as const) {
      const { result } = runBattle(content, {
        seed, map, player: side === 'player' ? `bot:mono:${id}` : defender, enemy: side === 'player' ? defender : `bot:mono:${id}`,
      });
      if (result.winner === side) seat[side]++;
      if (result.by === 'decision') decisions++;
      lengths.push(result.durationTicks);
      const def: Side = side === 'player' ? 'enemy' : 'player';
      monoSpawned += Object.values(result.stats[side].spawned).reduce((a, b) => a + b, 0);
      monoLost += result.stats[side].unitsLost;
      for (const [src, n] of Object.entries(result.stats[def].damageBySource)) defDamage[src] = (defDamage[src] ?? 0) + n;
      defDamageTotal += result.stats[def].damageDealt;
    }
  }
  return {
    map, id, wins: seat.player + seat.enemy, games: 2 * seeds,
    rate: (seat.player + seat.enemy) / (2 * seeds), player: seat.player / seeds, enemy: seat.enemy / seeds,
    median: median(lengths), decisions: decisions / (2 * seeds), monoSpawned, monoLost, defDamage, defDamageTotal,
  };
}

export interface G3Options {
  /** Maps to play (default: the run's map pool). Maps outside the pool, like test maps, are leads: reported, not counted. */
  maps?: string[];
  /** Mono bots (default: the whole roster). */
  ids?: string[];
  /** Seeds per seat (default: the target's). */
  seeds?: number;
  /** The opponent (default `bot:balanced`, the guardrail's). */
  defender?: string;
}

/** A mono bot's G3 reading over the pool maps it played (NaN when it played none). */
export interface G3Bot { id: string; mean: number; worst: number; worstMap: string; pass: boolean }

/**
 * G3: every mono bot plays `bot:balanced` on every map in the run pool, in both seats. A bot passes
 * if its mean win rate over those maps is ≤ `maxMeanWinRate` and its worst map ≤ `maxMapWinRate`.
 */
export function evaluateG3(content: Content, opts: G3Options = {}): G3Verdict {
  const s = g3Setup(content, opts);
  return g3Verdict(content, s.maps.flatMap((map) => s.ids.map((id) => g3Row(content, map, id, s.seeds, s.defender))), s);
}

export type G3Verdict = Verdict & { rows: G3Row[]; bots: G3Bot[]; maps: string[]; seeds: number };

/** G3's maps, bots, seeds and defender, defaults filled in. */
export function g3Setup(content: Content, opts: G3Options = {}): Required<G3Options> {
  return {
    maps: opts.maps ?? mapPool(content), ids: opts.ids ?? rosterIds(content), seeds: opts.seeds ?? content.targets.G3.seeds, defender: opts.defender ?? 'bot:balanced',
  };
}

/** G3's verdict from its cells, however they were played (in process here, or through a RowRunner by the counter check). */
export function g3Verdict(content: Content, rows: G3Row[], { maps, ids, seeds, defender }: Required<G3Options>): G3Verdict {
  const t = content.targets.G3;
  const pool = mapPool(content);
  const counted = maps.filter((m) => pool.includes(m));
  const bots = ids.map((id): G3Bot => {
    const mine = counted.map((m) => rows.find((r) => r.map === m && r.id === id)!);
    const rates = mine.map((r) => r.rate);
    const worst = rates.length ? Math.max(...rates) : NaN;
    // every map plays the same games, so this is the mean of the rates, but exact: summed float rates can land a hair either side of the limit
    const mean = rates.length ? mine.reduce((a, r) => a + r.wins, 0) / mine.reduce((a, r) => a + r.games, 0) : NaN;
    const pass = !rates.length || (mean <= t.maxMeanWinRate && worst <= t.maxMapWinRate);
    return { id, mean, worst, worstMap: rates.length ? counted[rates.indexOf(worst)]! : '', pass };
  });
  // one row per mono bot: its win % on each map, then the mean and worst over the pool maps
  const cell = (x: number) => (Number.isFinite(x) ? String(Math.round(x * 100)) : '–');
  const col = (s: string, w: number) => s.padStart(Math.max(w, 5));
  const heads = maps.map((m) => (pool.includes(m) ? m : `${m}*`));
  const idWidth = Math.max(...ids.map((id) => id.length));
  const details = [
    `mono win % against ${defender}, ${2 * seeds} games per map (both seats). Limits: mean ≤${pct(t.maxMeanWinRate)}, worst map ≤${pct(t.maxMapWinRate)}`,
    `     ${''.padEnd(idWidth)}  ${heads.map((h) => col(h, 0)).join('  ')}  ${col('mean', 0)}  ${col('worst', 0)}`,
  ];
  for (const b of bots) {
    const cells = maps.map((m, i) => col(cell(rows.find((r) => r.map === m && r.id === b.id)!.rate), heads[i]!.length));
    const over = [b.mean > t.maxMeanWinRate ? 'mean' : '', b.worst > t.maxMapWinRate ? `worst (${b.worstMap})` : ''].filter(Boolean).join(', ');
    details.push(`${b.pass ? 'ok  ' : 'FAIL'} ${b.id.padEnd(idWidth)}  ${cells.join('  ')}  ${col(cell(b.mean), 0)}  ${col(cell(b.worst), 0)}${over ? `  over: ${over}` : ''}`);
  }
  if (heads.some((h) => h.endsWith('*'))) details.push('* not in the run pool (a test map): a lead, not counted');
  return {
    id: 'G3', pass: bots.every((b) => b.pass), rows, bots, maps, seeds,
    summary: `every mono bot vs balanced on the run's maps (both seats): mean ≤${pct(t.maxMeanWinRate)}, worst map ≤${pct(t.maxMapWinRate)}`,
    details,
  };
}

/**
 * G4 itself is Bogwater Hollow; `map` measures the same pairing elsewhere (`npm run experiment -- --checks g4 --maps …`),
 * and `seeds` plays more games than the target's (`--g4seeds`).
 */
export function evaluateG4(content: Content, map = 'bogwater-hollow', seeds = content.targets.G4.seeds): Verdict & { stats: MatchStats } {
  const t = content.targets.G4;
  const m = matchup(content, 'bot:balanced', 'general:scripted', seeds, false, 0, map);
  const med = median(m.lengths) / 20;
  const dec = m.decisions / m.games;
  const win = m.winsA / m.games;
  const checks = [
    [med >= t.medianMinSeconds && med <= t.medianMaxSeconds, `median length ${fmt(med)} (target ${fmt(t.medianMinSeconds)}–${fmt(t.medianMaxSeconds)})`],
    [dec <= t.maxDecisionShare, `decisions ${(dec * 100).toFixed(0)}% (target ≤${pct(t.maxDecisionShare)})`],
    [win >= t.botWinMin && win <= t.botWinMax, `bot win rate ${(win * 100).toFixed(0)}% (target ${pct(t.botWinMin)}–${pct(t.botWinMax)})`],
    [m.rejected === 0, `rejected commands ${m.rejected}`],
  ] as const;
  return {
    id: 'G4', pass: checks.every((c) => c[0]), stats: m,
    summary: `balanced vs scripted on ${content.maps[map]?.name ?? map}, ${seeds} seeds`,
    details: checks.map(([ok, s]) => `${ok ? 'ok  ' : 'FAIL'} ${s}`),
  };
}

export function evaluateG5(content: Content): Verdict {
  const t = content.targets.G5;
  const m = matchup(content, 'bot:balanced', 'bot:balanced', t.seeds, true, t.bonusGold);
  const rate = m.winsA / m.games;
  const ok = rate >= t.minWinRate && rate <= t.maxWinRate;
  return {
    id: 'G5', pass: ok, summary: `a side with +${t.bonusGold} starting gold wins ${pct(t.minWinRate)}–${pct(t.maxWinRate)}`,
    details: [`${ok ? 'ok  ' : 'FAIL'} +${t.bonusGold} gold side wins ${(rate * 100).toFixed(0)}% over ${m.games} games (both seats)`],
  };
}

export function evaluateG6(content: Content): Verdict {
  const t = content.targets.G6;
  let wins = 0;
  for (let seed = 1; seed <= t.seeds; seed++) {
    const { result } = runBattle(content, { seed, scenario: t.scenario });
    if (result.winner === 'player') wins++;
  }
  const rate = wins / t.seeds;
  const ok = rate >= t.minBehindWinRate;
  return {
    id: 'G6', pass: ok, summary: `comeback: behind by 6 columns at 3:00, still wins ≥${pct(t.minBehindWinRate)}`,
    details: [`${ok ? 'ok  ' : 'FAIL'} behind side wins ${(rate * 100).toFixed(0)}% over ${t.seeds} seeds (scenario ${t.scenario})`],
  };
}

/**
 * G7: merging is a real but honest edge. Each check plays a bot against its own merge-off twin (both
 * seats), so the merge toggle is the only difference: with the reference mix merging should win
 * 55–70%; when both armies field ~25% Slayers it should win at most 50%.
 */
export function evaluateG7(content: Content): Verdict {
  const t = content.targets.G7;
  const run = (c: { mergeBot: string; noMergeBot: string }) => matchup(content, `bot:${c.mergeBot}`, `bot:${c.noMergeBot}`, t.seeds, true);
  const mirror = run(t.mirror);
  const slayers = run(t.slayers);
  const mRate = mirror.winsA / mirror.games;
  const sRate = slayers.winsA / slayers.games;
  const share = (tagShare(content, slayers.spawnedSupply.a, 'slayer') + tagShare(content, slayers.spawnedSupply.b, 'slayer')) / 2;
  const mirrorOk = mRate >= t.mirror.minWinRate && mRate <= t.mirror.maxWinRate;
  const slayerOk = sRate <= t.slayers.maxWinRate;
  return {
    id: 'G7', pass: mirrorOk && slayerOk,
    summary: `merging: merge-on wins ${pct(t.mirror.minWinRate)}–${pct(t.mirror.maxWinRate)} of the mirror, ≤${pct(t.slayers.maxWinRate)} when both sides field ~${pct(t.slayers.share)} Slayers`,
    details: [
      `${mirrorOk ? 'ok  ' : 'FAIL'} bot:${t.mirror.mergeBot} vs its merge-off twin: ${(mRate * 100).toFixed(0)}% over ${mirror.games} games (both seats), ${(mirror.merges.a / mirror.games).toFixed(1)} merges per game`,
      `${slayerOk ? 'ok  ' : 'FAIL'} bot:${t.slayers.mergeBot} vs its merge-off twin: ${(sRate * 100).toFixed(0)}% over ${slayers.games} games; realised Slayer share ${(share * 100).toFixed(0)}% of spawned supply (target ~${pct(t.slayers.share)})`,
    ],
  };
}

export interface G8Row { bot: string; off: number; on: number; drop: number; asserted: boolean; ok: boolean }

/**
 * G8: adaptation matters. Each mono bot plays the G8 general with the counter cycle off and on (the
 * mono bot as the player, merging on); its win rate must drop by at least `minDrop`. A bot already
 * under `minBaseline` without adaptation cannot drop that far, so it is reported, not asserted.
 * `bot:balanced` must win `balancedMin`–`balancedMax` against the adaptive general at battle index 1.
 */
export function evaluateG8(content: Content): Verdict & { rows: G8Row[] } {
  const t = content.targets.G8;
  const general = `general:${t.general}`;
  const off = { merging: true, adaptiveGeneral: false };
  const on = { merging: true, adaptiveGeneral: true };
  const rows: G8Row[] = [];
  const details: string[] = [];
  let pass = true;
  for (const id of rosterIds(content)) {
    const a = matchup(content, `bot:mono:${id}`, general, t.seeds, false, 0, 'bogwater-hollow', off);
    const b = matchup(content, `bot:mono:${id}`, general, t.seeds, false, 0, 'bogwater-hollow', on);
    const rOff = a.winsA / a.games, rOn = b.winsA / b.games;
    const asserted = rOff >= t.minBaseline;
    const ok = !asserted || rOff - rOn >= t.minDrop;
    if (!ok) pass = false;
    rows.push({ bot: id, off: rOff, on: rOn, drop: rOff - rOn, asserted, ok });
    details.push(`${!asserted ? 'n/a ' : ok ? 'ok  ' : 'FAIL'} mono:${id} vs ${t.general}: ${(rOff * 100).toFixed(0)}% → ${(rOn * 100).toFixed(0)}% with adaptation (drop ${((rOff - rOn) * 100).toFixed(0)} points${asserted ? '' : `; below the ${pct(t.minBaseline)} baseline, report only`})`);
  }
  const bal = matchup(content, 'bot:balanced', general, t.seeds, false, 0, 'bogwater-hollow', on);
  const rate = bal.winsA / bal.games;
  const balOk = rate >= t.balancedMin && rate <= t.balancedMax;
  if (!balOk) pass = false;
  details.push(`${balOk ? 'ok  ' : 'FAIL'} bot:balanced vs adaptive ${t.general} at battle index 1: ${(rate * 100).toFixed(0)}% (target ${pct(t.balancedMin)}–${pct(t.balancedMax)})`);
  return {
    id: 'G8', pass, rows,
    summary: `adaptation: every mono bot drops ≥${Math.round(t.minDrop * 100)} points against adaptive ${t.general}; balanced wins ${pct(t.balancedMin)}–${pct(t.balancedMax)}`,
    details,
  };
}

// ---------------------------------------------------------------- the counter matrix

/**
 * The counter check (docs/archive/v1/ideas/combat-rework.md): a strong mono build is a strategy if something beats
 * it, and the bug if nothing does. Defaults, and the proposed pass rule: some answer wins ≥ 60%.
 */
export const COUNTERS = { screenSeeds: 10, confirmSeeds: 50, top: 3, minBuildMean: 0.4, minAnswerRate: 0.6 };

/** One G3 cell to play: `bot:mono:<id>` against `defender` on `map`, `seeds` per seat from `firstSeed` (default 1). */
export interface G3Job { map: string; id: string; seeds: number; defender: string; firstSeed?: number }

/** Plays G3 cells and returns their rows in job order. */
export type RowRunner = (jobs: G3Job[]) => Promise<G3Row[]>;

/** Plays the cells in this thread (tools/lib/pool.ts plays the same jobs in worker threads). */
export function inProcessRows(content: Content): RowRunner {
  return (jobs) => Promise.resolve(jobs.map((j) => g3Row(content, j.map, j.id, j.seeds, j.defender, j.firstSeed)));
}

/** The buildings that fight: spawners of fighting units (spawnerIds) and towers. The check pairs these. */
export function armyIds(content: Content): string[] {
  const spawners = spawnerIds(content);
  return rosterIds(content).filter((id) => spawners.includes(id) || content.buildings[id]!.kind === 'tower');
}

/** A pair bot's opener: a, b, a, … while the starting gold covers it, as a mono bot spends its starting gold on its building. */
function pairOpener(content: Content, a: string, b: string): string[] {
  const opener: string[] = [];
  for (let spent = 0, i = 0; ; i++) {
    const id = i % 2 ? b : a;
    spent += content.buildings[id]!.cost;
    if (spent > content.balance.startingGold) return opener;
    opener.push(id);
  }
}

/**
 * The answer bots the check adds to the content: one bot per pair of army buildings, weighted evenly
 * (`pair-<a>-<b>`), and hand-written counter bots in the style of round 2's D1 defenders. D1's own
 * specs weren't recorded, so `d1-*` are rebuilt from the backlog's descriptions; with `nohold` they
 * reproduce D1's table, Amanita-heavy within 2 games of 40.
 */
export function counterBots(content: Content): Record<string, Omit<BotDef, 'id'>> {
  const bots: Record<string, Omit<BotDef, 'id'>> = {};
  const army = armyIds(content);
  for (let i = 0; i < army.length; i++) for (let j = i + 1; j < army.length; j++) {
    const a = army[i]!, b = army[j]!;
    bots[`pair-${a}-${b}`] = { description: `${content.buildings[a]!.name} and ${content.buildings[b]!.name}, weighted evenly`, opener: pairOpener(content, a, b), weights: { [a]: 1, [b]: 1 }, mergePolicy: 'on' };
  }
  const { id: _id, description: _desc, ...balanced } = content.bots.balanced!;
  const cellar = { truffleCellar: { maxOwned: 2 } };
  Object.assign(bots, {
    'd1-burrows': { ...balanced, description: 'D1: bot:balanced with a two-Burrow opener (no Cellar)', opener: ['sporelingBurrow', 'sporelingBurrow'] },
    'd1-sporeling': {
      description: 'D1: Sporeling-heavy (two Burrows; weight 5 Burrow, 1 Capguard, Cellar, Scythecap)', opener: ['sporelingBurrow', 'sporelingBurrow'],
      weights: { sporelingBurrow: 5, capguardHall: 1, truffleCellar: 1, scythecapGrove: 1 }, limits: { truffleCellar: { maxOwned: 3 } }, mergePolicy: 'on',
    },
    'd1-amanita': { description: 'D1: Amanita-heavy (Lodge opener; weight 4 Lodge, 2 Burrow)', opener: ['amanitaLodge'], weights: { amanitaLodge: 4, sporelingBurrow: 2 }, mergePolicy: 'on' },
    'd1-adaptive': { ...balanced, description: 'D1: bot:balanced running the adaptive counter cycle', adaptive: true },
    diverdef: {
      ...balanced, description: "Step A's defender: bot:balanced with a Veilstalker opener and weight 5 Hollow (no diver rule)", opener: ['sporelingBurrow', 'veilstalkerHollow'],
      weights: { ...balanced.weights, veilstalkerHollow: 5 },
    },
    'counter-archers': {
      description: 'vs archers: Amanita Knights soak arrows (Pierce ×0.75 on heavy) while Sporelings and Veilstalkers close in', opener: ['sporelingBurrow', 'sporelingBurrow'],
      weights: { amanitaLodge: 3, sporelingBurrow: 3, veilstalkerHollow: 2, truffleCellar: 1 }, limits: cellar, mergePolicy: 'on',
    },
    'counter-rush': {
      description: 'vs archers: Sporelings and Veilstalkers placed forward, to strike before the mass stands', opener: ['sporelingBurrow', 'sporelingBurrow'],
      weights: { sporelingBurrow: 4, veilstalkerHollow: 3, amanitaLodge: 1 }, placement: { spawnerDepthWeight: 3 }, mergePolicy: 'on',
    },
    'counter-swarm': {
      description: 'vs swarms: Capguards and Scythecaps (Slash ×1.5 on light) behind Mortar splash', opener: ['capguardHall', 'capguardHall'],
      weights: { capguardHall: 4, scythecapGrove: 3, puffballMortar: 2, truffleCellar: 1 }, limits: { ...cellar, puffballMortar: { maxOwned: 3 } }, mergePolicy: 'on',
    },
    'counter-tenders': {
      description: 'vs swarms: Capguards and Scythecaps healed by Tenders', opener: ['capguardHall', 'capguardHall'],
      weights: { capguardHall: 4, scythecapGrove: 2, tendersRing: 2, truffleCellar: 1 }, limits: cellar, mergePolicy: 'on',
    },
    'counter-knights': {
      description: 'vs Amanita Knights: Hammercaps and Rootbreakers (Crush ×1.5 on heavy), Veilstalkers for merged Knights (Slayer ×3 on elites)', opener: ['hammercapForge'],
      weights: { hammercapForge: 4, rootbreakerDen: 2, veilstalkerHollow: 2, truffleCellar: 1 }, limits: cellar, mergePolicy: 'on',
    },
    'counter-runners': {
      description: 'vs Morel Runners: archers and Veilstalkers (Pierce ×1.5 on medium) behind Capguards, with Mortar splash', opener: ['gillNest', 'capguardHall'],
      weights: { gillNest: 3, veilstalkerHollow: 2, capguardHall: 2, puffballMortar: 1, truffleCellar: 1 }, limits: cellar, mergePolicy: 'on',
    },
  } satisfies Record<string, Omit<BotDef, 'id'>>);
  // each answer stays what it's named: a prototype building's `aiWeight` (the combat rework's Rhizomorph) skips them
  for (const def of Object.values(bots)) def.fixedWeights = true;
  return bots;
}

/** §11.2's five core spawners (★); the sixth archetype is open, between the Burster Pod and the Puffball Mortar (§18.2 #36). */
export const CORE_SPAWNERS = ['sporelingBurrow', 'capguardHall', 'gillNest', 'amanitaLodge', 'hammercapForge'] as const;

/**
 * The core-six check's reference, `bot:core6` (R1-Q6), as a spec item the check appends: the five core
 * spawners and the candidate at weight 1 each, the Burrow as its opener, merging on and its weights fixed.
 */
export function core6Spec(candidate: string): string {
  const weights = Object.fromEntries([...CORE_SPAWNERS, candidate].map((id) => [id, 1]));
  return `bot.core6:${JSON.stringify({ description: 'core six, even', opener: ['sporelingBurrow'], weights, mergePolicy: 'on', fixedWeights: true })}`;
}

/** The proto spec that adds `counterBots` (`bot.<id>:{…}` entries): build the check's content with `protoContent`. */
export function counterBotSpec(content: Content): string {
  return Object.entries(counterBots(content)).map(([id, def]) => `bot.${id}:${JSON.stringify(def)}`).join(',');
}

/** The data bots that are strategies of their own (the G7 merge-off twins are left out). */
const OTHER_BOTS = ['bot:rush', 'bot:turtle', 'bot:greedy', 'bot:slayer'];

export type AnswerKind = 'mono' | 'pair' | 'reference' | 'counter' | 'bot';

/** Every answer the check tries: each other mono bot, every even pair, `bot:balanced`, the counter bots and the other data bots. */
export function counterAnswers(content: Content, build: string): string[] {
  const added = Object.keys(counterBots(content));
  return [
    ...rosterIds(content).filter((id) => id !== build).map((id) => `bot:mono:${id}`),
    ...added.filter((id) => id.startsWith('pair-')).map((id) => `bot:${id}`),
    'bot:balanced',
    ...added.filter((id) => !id.startsWith('pair-')).map((id) => `bot:${id}`),
    ...OTHER_BOTS.filter((c) => content.bots[c.slice(4)]),
  ];
}

export function answerKind(controller: string): AnswerKind {
  if (controller.startsWith('bot:mono:')) return 'mono';
  if (controller.startsWith('bot:pair-')) return 'pair';
  if (controller === 'bot:balanced') return 'reference';
  return OTHER_BOTS.includes(controller) ? 'bot' : 'counter';
}

/** An answer's results against one build: its wins per map and its mean over the counted maps. */
export interface CounterResult {
  answer: string; kind: AnswerKind;
  /** Per map: the answer's wins, and the share of games that ended by Decision. */
  maps: { map: string; wins: number; games: number; rate: number; decisions: number }[];
  wins: number; games: number; mean: number;
  /** A mono answer that fails G3 itself. */
  failsG3: boolean;
}

export interface CounterBuild {
  build: string; g3Mean: number;
  /** Every answer's screen result, best first. */
  screen: CounterResult[];
  /** The top answers, confirmed on fresh seeds, best first. */
  top: CounterResult[];
  /** The proposed pass rule: the best confirmed answer wins ≥ `minAnswerRate`. */
  pass: boolean;
}

export interface CounterOptions {
  /** Maps (default: the run pool). Maps outside the pool are leads, as in G3. */
  maps?: string[];
  /** Mono builds to answer (default: every mono bot whose G3 mean is above `minBuildMean`). */
  builds?: string[];
  /** Answers to try against every build (default: counterAnswers). */
  answers?: string[];
  /** G3, if the caller has already played it on these maps; otherwise it's played here. */
  g3?: G3Verdict;
  /** Seeds per seat for that G3 run (default the target's). */
  g3Seeds?: number;
  screenSeeds?: number;
  confirmSeeds?: number;
  top?: number;
  /** Plays the cells (default: in process). */
  rows?: RowRunner;
}

export type CounterVerdict = Verdict & {
  builds: CounterBuild[]; g3: G3Verdict; maps: string[]; screenSeeds: number; confirmSeeds: number; answers: Record<string, string[]>;
};

/**
 * The counter matrix: each strong mono build (G3 mean above 40%) against every answer on every map, in
 * both seats. A screen at `screenSeeds` per seat finds each build's `top` answers, and a confirmation
 * on the next `confirmSeeds` seeds measures them, so the screen's luck doesn't flatter them. Passes if
 * every build has an answer that wins ≥ 60% on the mean over the pool maps. Content must hold the
 * bots from `counterBotSpec`. A mono answer that fails G3 itself is flagged.
 */
export async function evaluateCounters(content: Content, opts: CounterOptions = {}): Promise<CounterVerdict> {
  const c = COUNTERS;
  const pool = mapPool(content);
  const maps = opts.maps ?? pool;
  const counted = maps.some((m) => pool.includes(m)) ? maps.filter((m) => pool.includes(m)) : maps;
  const screenSeeds = opts.screenSeeds ?? c.screenSeeds, confirmSeeds = opts.confirmSeeds ?? c.confirmSeeds, top = opts.top ?? c.top;
  const rows = opts.rows ?? inProcessRows(content);
  let g3 = opts.g3;
  if (!g3) {
    const s = g3Setup(content, { maps, ...(opts.g3Seeds ? { seeds: opts.g3Seeds } : {}) });
    g3 = g3Verdict(content, await rows(s.maps.flatMap((map) => s.ids.map((id) => ({ map, id, seeds: s.seeds, defender: s.defender })))), s);
  }
  const g3Bots = g3.bots;
  const builds = opts.builds ?? g3Bots.filter((b) => b.mean > c.minBuildMean).map((b) => b.id);
  const answers = Object.fromEntries(builds.map((b) => [b, (opts.answers ?? counterAnswers(content, b)).filter((a) => a !== `bot:mono:${b}`)]));
  for (const a of new Set(Object.values(answers).flat())) {
    const m = a.match(/^bot:(.+)$/);
    if (m && !m[1]!.startsWith('mono:') && !content.bots[m[1]!]) throw new Error(`counter answer ${a} isn't in the content (build it with counterBotSpec)`);
  }
  const failsG3 = (a: string) => g3Bots.some((b) => `bot:mono:${b.id}` === a && !b.pass);
  // the build's rows are the mono side's; an answer wins every game the build loses (there are no draws)
  const result = (answer: string, cells: G3Row[]): CounterResult => {
    const mine = cells.map((r) => ({ map: r.map, wins: r.games - r.wins, games: r.games, rate: (r.games - r.wins) / r.games, decisions: r.decisions }));
    const inMean = mine.filter((m) => counted.includes(m.map));
    const wins = inMean.reduce((s, m) => s + m.wins, 0), games = inMean.reduce((s, m) => s + m.games, 0);
    return { answer, kind: answerKind(answer), maps: mine, wins, games, mean: wins / games, failsG3: failsG3(answer) };
  };
  const play = async (pairs: [string, string][], seeds: number, firstSeed: number) => {
    const jobs = pairs.flatMap(([build, answer]) => maps.map((map): G3Job => ({ map, id: build, seeds, defender: answer, firstSeed })));
    const out = await rows(jobs);
    return pairs.map(([, answer], i) => result(answer, out.slice(i * maps.length, (i + 1) * maps.length)));
  };
  // sort is stable, so ties keep the answers' order
  const best = (rs: CounterResult[]) => [...rs].sort((x, y) => y.mean - x.mean);
  const screenPairs = builds.flatMap((b) => answers[b]!.map((a): [string, string] => [b, a]));
  const screened = await play(screenPairs, screenSeeds, 1);
  const screens = builds.map((b) => best(screened.filter((_, i) => screenPairs[i]![0] === b)));
  const confirmPairs = builds.flatMap((b, i) => screens[i]!.slice(0, top).map((r): [string, string] => [b, r.answer]));
  const confirmed = await play(confirmPairs, confirmSeeds, screenSeeds + 1);
  const results = builds.map((build, i): CounterBuild => {
    const tops = best(confirmed.filter((_, k) => confirmPairs[k]![0] === build));
    return { build, g3Mean: g3Bots.find((b) => b.id === build)?.mean ?? NaN, screen: screens[i]!, top: tops, pass: (tops[0]?.mean ?? 0) >= c.minAnswerRate };
  });

  const cell = (x: number) => (Number.isFinite(x) ? String(Math.round(x * 100)) : '–');
  const heads = maps.map((m) => (pool.includes(m) ? m : `${m}*`));
  const ansWidth = Math.max(...results.flatMap((r) => r.top.map((t) => t.answer.length)), 6);
  const details = [
    `answer win % against each mono build, both seats. Screen: ${2 * screenSeeds} games per map (seeds 1–${screenSeeds}); top ${top} confirmed on ${2 * confirmSeeds} per map (seeds ${screenSeeds + 1}–${screenSeeds + confirmSeeds}). Pass: an answer wins ≥${pct(c.minAnswerRate)} on the mean`,
  ];
  for (const r of results) {
    const b = r.top[0], clean = r.top.find((t) => !t.failsG3);
    const alsoClean = b?.failsG3 && clean ? `; best that passes G3: ${clean.answer} ${cell(clean.mean)}%` : '';
    details.push(`${r.pass ? 'ok  ' : 'FAIL'} mono:${r.build} (G3 mean ${cell(r.g3Mean)}%, ${r.screen.length} answers): best ${b ? `${b.answer} ${cell(b.mean)}%${b.failsG3 ? ' (fails G3 itself)' : ''}${alsoClean}` : 'none'}`);
    details.push(`       ${'answer'.padEnd(ansWidth)}  ${heads.join('  ')}   mean`);
    for (const t of r.top) {
      const cells = maps.map((m, i) => cell(t.maps.find((x) => x.map === m)!.rate).padStart(heads[i]!.length));
      details.push(`       ${t.answer.padEnd(ansWidth)}  ${cells.join('  ')}  ${cell(t.mean).padStart(5)}${t.failsG3 ? '  ⚑ fails G3' : ''}`);
    }
    details.push(`       screen, next best: ${r.screen.slice(top, top + 5).map((s) => `${s.answer} ${cell(s.mean)}`).join(', ')}`);
    const onMap = (m: string) => (s: CounterResult) => s.maps.find((x) => x.map === m)!.rate;
    details.push(`       screen, best on each map: ${maps.map((m) => {
      const s = [...r.screen].sort((x, y) => onMap(m)(y) - onMap(m)(x))[0]!;
      return `${m} ${s.answer} ${cell(onMap(m)(s))}`;
    }).join(', ')}`);
  }
  if (heads.some((h) => h.endsWith('*'))) details.push('* not in the run pool (a test map): a lead, not in the mean');
  return {
    id: 'counters', pass: results.every((r) => r.pass), builds: results, g3, maps, screenSeeds, confirmSeeds, answers,
    summary: `counter matrix: every mono build with a G3 mean above ${pct(c.minBuildMean)} has an answer that wins ≥${pct(c.minAnswerRate)} on the mean over the run's maps (proposed)`,
    details,
  };
}

// ---------------------------------------------------------------- R1's clash bars

// G3, G12 and G13 on clashes (SPEC §12.2, §12.3, §16 R1), beside `evaluateCounters`, which stays v1's
// (A001). A cell is one game a bar needs: two armies at a budget on a field, a seed and a seat. Its winner
// is R1-Q3's: more lanes won, then more uncapped Heartcap damage, else a draw worth half a win.

/**
 * The clash check's defaults (§12.2, §16 R1): budgets of 300 to 1,500 gold, about rounds 1, 3, 5, 7 and
 * 9; the one-lane field and Twin Roots; the counter matrix's seeds, 20 a seat for a screen; and the
 * answers the clash matrix lists per budget. The pass rules are `COUNTERS`'s and G3's targets.
 */
export const CLASH_CHECK: typeof COUNTERS & {
  budgets: readonly number[]; fields: readonly FieldId[]; matrixAnswers: number; extraPlotsFrom: number; mirrorSeeds: number;
} = {
  ...COUNTERS, screenSeeds: 20, budgets: [300, 600, 900, 1200, 1500], fields: ['one', 'twin'], matrixAnswers: 3,
  // R1-Q4's late-run reading: the extra plots at 1,200 and 1,500 gold
  extraPlotsFrom: 1200,
  // the merge mirror's seeds per seat (T030)
  mirrorSeeds: 20,
};

/** Plays clashes and returns their records in job order (tools/lib/pool.ts plays them in worker threads). */
export type ClashRunner = (jobs: ClashJob[]) => Promise<ClashRecord[]>;

/** One game a bar needs: `a`'s army against `b`'s with `budget` gold on a field and a seed, `a` in seat `seat`. */
export interface Cell {
  a: string;
  b: string;
  field: FieldId;
  budget: number;
  seed: number;
  seat: Side;
  /** `b`'s army is `a`'s own, built on the same seed, with merging off: the merge mirror's twin (T030). */
  twin?: true;
}

/** The controller name a merge-off twin plays under in the records. */
export const twinName = (controller: string): string => `${controller} (merging off)`;

/**
 * A cell's record as the bars read it: where and when it played, who played it, and its two readings. A
 * ClashRecord is one. The counter matrix keeps only this much of each cell, since it plays the most.
 */
export type CellRecord = Pick<ClashRecord, 'field' | 'budget' | 'seed' | 'seat' | 'jitter' | 'cap' | 'capAfterMuster'> & {
  armies: Record<Side, { controller: string }>;
};

export interface ClashCacheOptions {
  /** Up to ± this many tiles per unit per axis after the muster (default 0, which draws nothing). */
  jitter?: number;
  /** The clashes' options, the same for every clash but the extra plots (A017). */
  opts?: ClashOpts;
  /** The least budget `opts.extraPlots` applies at; below it a side has the base plots (default 0, every budget; R1-Q4). */
  extraPlotsFrom?: number;
  /** The armies' squads and copies, the same for every army (§16 R1's variants). */
  army?: ArmyOpts;
  /** Keep every record played, for the report (`--records`). */
  keep?: boolean;
}

export interface ClashCache {
  /** Each cell's record: its clash's, with the cell's own budget, seed and controllers. */
  full(cells: readonly Cell[]): Promise<ClashRecord[]>;
  /** Each cell's record as the bars read it. */
  slim(cells: readonly Cell[]): Promise<CellRecord[]>;
  /** The army `controller` builds with `budget` gold on a field from a seed's stream, built once. */
  army(controller: string, budget: number, seed: number, field: FieldId): Army;
  /** The cells asked for, and the clashes played for them. */
  stats(): { cells: number; played: number };
  /** Every clash played, in order, if the cache keeps them. */
  records(): ClashRecord[];
}

/** Clashes a runner takes at a time, so a long check never holds every record at once. */
const CLASH_BATCH = 2048;

const prints = new WeakMap<Army, string>();

/** An army's fingerprint: its entries in build-list order, each building with its squad size and merge toggle. */
function armyPrint(army: Army): string {
  let p = prints.get(army);
  if (p === undefined) prints.set(army, (p = army.entries.map((e) => `${e.buildingId}×${e.count}${e.mergeOn ? '' : ' off'}`).join(',')));
  return p;
}

/** The controller a cell's army on `side` comes from. */
const controllerOn = (c: Cell, side: Side): string => (side === c.seat ? c.a : c.twin ? twinName(c.b) : c.b);

/**
 * The check's clashes, each distinct one played once (A007). Every army is built in this thread. A clash
 * is its field, its extra plots, its seat and the two armies' fingerprints, and its seed when the jitter
 * is on. With no jitter a clash draws no random number (the sim's draws are the AI's and the spawners',
 * and a clash has neither; `playClash` checks it), so a fixed pair of armies plays the same clash on every
 * seed and budget. A mirror's second army is built on seed 1,000 + s, as `playPair` builds it, and a twin
 * cell's is the first army with merging off. The extra plots vary by budget (`extraPlotsFrom`), and they
 * can move squads even for the same army, so both the army key and the clash key hold them (T031).
 */
export function clashCache(content: Content, runner: ClashRunner, o: ClashCacheOptions = {}): ClashCache {
  const jitter = o.jitter ?? 0;
  const opts = clashOpts(o.opts);
  const extraAt = (budget: number): number => (budget >= (o.extraPlotsFrom ?? 0) ? opts.extraPlots : 0);
  const fields = new Map<string, ClashField>();
  const armies = new Map<string, Army>();
  const twins = new WeakMap<Army, Army>();
  // each distinct fingerprint as a small number, so a long check's keys stay short
  const printIds = new Map<string, number>();
  const done = new Map<string, Pick<ClashRecord, 'cap' | 'capAfterMuster'> & { record?: ClashRecord }>();
  const kept: ClashRecord[] = [];
  let asked = 0, played = 0;

  const army = (controller: string, budget: number, seed: number, id: FieldId): Army => {
    const extra = extraAt(budget);
    const key = `${controller}|${budget}|${seed}|${id}|${extra}`;
    let a = armies.get(key);
    if (!a) {
      let field = fields.get(`${id}|${extra}`);
      if (!field) fields.set(`${id}|${extra}`, (field = clashField(content, id, { extraPlots: extra })));
      armies.set(key, (a = armyFromBot(content, controller, budget, seed, field.plots, o.army)));
    }
    return a;
  };
  const twinOf = (a: Army): Army => {
    let t = twins.get(a);
    if (!t) twins.set(a, (t = { ...a, controller: twinName(a.controller), entries: a.entries.map((e) => (e.kind === 'squad' ? { ...e, mergeOn: false } : e)) }));
    return t;
  };
  const jobOf = (c: Cell): ClashJob => ({
    field: c.field, seed: c.seed, seat: c.seat, jitter, opts: { ...opts, extraPlots: extraAt(c.budget) },
    armies: [
      army(c.a, c.budget, c.seed, c.field),
      c.twin ? twinOf(army(c.b, c.budget, c.seed, c.field)) : army(c.b, c.budget, c.a === c.b ? MIRROR_SEED + c.seed : c.seed, c.field),
    ],
  });
  const printId = (a: Army): number => {
    const p = armyPrint(a);
    let n = printIds.get(p);
    if (n === undefined) printIds.set(p, (n = printIds.size));
    return n;
  };
  const keyOf = (j: ClashJob): string => `${j.field}|${j.opts!.extraPlots}|${j.seat}|${printId(j.armies[0])}|${printId(j.armies[1])}|${jitter > 0 ? j.seed : ''}`;

  /** Each cell's clash, playing the ones not played yet (or, for a full record, not kept yet). */
  async function play(cells: readonly Cell[], full: boolean) {
    asked += cells.length;
    const jobs = cells.map(jobOf);
    const keys = jobs.map(keyOf);
    const todo: number[] = [];
    const queued = new Set<string>();
    keys.forEach((k, i) => {
      const d = done.get(k);
      if ((d && (d.record || !full)) || queued.has(k)) return;
      queued.add(k);
      todo.push(i);
    });
    for (let s = 0; s < todo.length; s += CLASH_BATCH) {
      const batch = todo.slice(s, s + CLASH_BATCH);
      const records = await runner(batch.map((i) => jobs[i]!));
      played += records.length;
      records.forEach((r, n) => {
        done.set(keys[batch[n]!]!, { cap: r.cap, capAfterMuster: r.capAfterMuster, ...(full ? { record: r } : {}) });
        if (o.keep) kept.push(r);
      });
    }
    return keys.map((k) => done.get(k)!);
  }

  return {
    full: async (cells) => (await play(cells, true)).map((d, i) => {
      const r = d.record!, c = cells[i]!;
      if (r.budget === c.budget && r.seed === c.seed && SIDES.every((s) => r.armies[s].controller === controllerOn(c, s))) return r;
      return {
        ...r, budget: c.budget, seed: c.seed,
        armies: { player: { ...r.armies.player, controller: controllerOn(c, 'player') }, enemy: { ...r.armies.enemy, controller: controllerOn(c, 'enemy') } },
      };
    }),
    slim: async (cells) => (await play(cells, false)).map((d, i) => {
      const c = cells[i]!;
      return {
        field: c.field, budget: c.budget, seed: c.seed, seat: c.seat, jitter,
        armies: { player: { controller: controllerOn(c, 'player') }, enemy: { controller: controllerOn(c, 'enemy') } },
        cap: d.cap, capAfterMuster: d.capAfterMuster,
      };
    }),
    army,
    stats: () => ({ cells: asked, played }),
    records: () => kept,
  };
}

/** One side's results over some clashes, in the `cap` reading: a draw is worth half a win (R1-Q3). */
export interface ClashScore {
  wins: number;
  draws: number;
  losses: number;
  games: number;
  /** (wins + draws / 2) / games. */
  rate: number;
}

const scored = (wins: number, draws: number, losses: number): ClashScore => {
  const games = wins + draws + losses;
  return { wins, draws, losses, games, rate: (2 * wins + draws) / (2 * games) };
};

/** The score over these cells of each cell's army `a`, or of its army `b`. */
function scoreOf(cells: readonly CellRecord[], army: 'a' | 'b'): ClashScore {
  let wins = 0, draws = 0, losses = 0;
  for (const r of cells) {
    if (r.cap.winner === 'draw') draws++;
    else if ((r.cap.winner === r.seat) === (army === 'a')) wins++;
    else losses++;
  }
  return scored(wins, draws, losses);
}

const sumScores = (ss: readonly ClashScore[]): ClashScore =>
  scored(ss.reduce((n, s) => n + s.wins, 0), ss.reduce((n, s) => n + s.draws, 0), ss.reduce((n, s) => n + s.losses, 0));

/** Scores per field, in the fields' order. */
type FieldScores = Partial<Record<FieldId, ClashScore>>;

/** The fields a mean reads: the one-lane field and Twin Roots. A three-lane field is a lead, unless it's all there is. */
function countedFields(fields: readonly FieldId[]): FieldId[] {
  const counted = fields.filter((f) => f !== 'three');
  return counted.length ? counted : [...fields];
}

/**
 * The mean over the counted fields, with the one-lane field counted twice (it stands for Bogwater Hollow
 * and Stumpfield), and the worst field: the highest rate for a G3 build, the lowest for an answer.
 */
function overFields(scores: FieldScores, counted: readonly FieldId[], worst: 'highest' | 'lowest'): { mean: number; worst: number; worstField: FieldId } {
  let num = 0, den = 0, w = NaN, worstField = counted[0]!;
  for (const f of counted) {
    const s = scores[f]!;
    const weight = f === 'one' ? 2 : 1;
    // one division of whole numbers, so a mean of exactly 55% compares as 55%
    num += weight * (2 * s.wins + s.draws);
    den += weight * 2 * s.games;
    if (Number.isNaN(w) || (worst === 'highest' ? s.rate > w : s.rate < w)) { w = s.rate; worstField = f; }
  }
  return { mean: num / den, worst: w, worstField };
}

/** Per budget: the scores on each field over these cells, their mean and the worst field. */
function byBudget(cells: readonly CellRecord[], army: 'a' | 'b', budgets: readonly number[], fields: readonly FieldId[], worst: 'highest' | 'lowest') {
  const counted = countedFields(fields);
  return budgets.map((budget) => {
    const scores: FieldScores = {};
    for (const f of fields) scores[f] = scoreOf(cells.filter((r) => r.field === f && r.budget === budget), army);
    return { budget, fields: scores, ...overFields(scores, counted, worst) };
  });
}

/** Per field, pooled over the budgets, each budget weighing the same (each plays the same games). */
function pooled(at: readonly { fields: FieldScores }[], fields: readonly FieldId[]): FieldScores {
  const out: FieldScores = {};
  for (const f of fields) out[f] = sumScores(at.map((b) => b.fields[f]!));
  return out;
}

/** A whole percentage, or – when there's nothing to read. */
const whole = (x: number): string => (Number.isFinite(x) ? String(Math.round(x * 100)) : '–');

/** A mono army's clash G3 reading: per budget, per field pooled over the budgets, and the bar. */
export interface ClashG3Bot {
  id: string;
  /** Per budget: the score on each field, their mean and the worst field; `over` when either is over the bar. */
  budgets: { budget: number; fields: FieldScores; mean: number; worst: number; worstField: FieldId; over: boolean }[];
  /** Per field, pooled over the budgets. */
  fields: FieldScores;
  mean: number;
  worst: number;
  worstField: FieldId;
  pass: boolean;
}

/** What a controller's armies come to on a field at a budget, for the report. */
export interface ClashArmies {
  controller: string;
  field: FieldId;
  budget: number;
  /** The army on seed 1. A mono's is the same on every seed. */
  entries: ArmyEntry[];
  spent: number;
  supply: number;
  units: number;
  /** Over the seeds played: the mean spent, supply and units, and how many distinct armies. */
  seeds: { spent: number; supply: number; units: number; distinct: number };
}

export interface ClashG3Options {
  cache: ClashCache;
  /** Mono builds (default every army card's, `clashArmyIds`). */
  ids?: string[];
  /** Budgets (default 300 to 1,500). */
  budgets?: readonly number[];
  /** Fields (default the one-lane field and Twin Roots). A three-lane field is a lead, outside the mean and the worst. */
  fields?: readonly FieldId[];
  /** Seeds per seat (default G3's). */
  seeds?: number;
  /** The reference army (default `bot:balanced`; the core-six check's is `bot:core6`, R1-Q6). */
  defender?: string;
}

export type ClashG3Verdict = Verdict & {
  bots: ClashG3Bot[];
  budgets: number[];
  fields: FieldId[];
  seeds: number;
  /** The reference army the monos play. */
  defender: string;
  /** `bot:balanced` with `fixedWeights` set (A023): the spawners a spec appends don't join it. */
  reference?: 'data weights';
  /** The builds whose card a spec appended (its building carries `aiWeight`), listed apart on a fixed reference. */
  appended: string[];
  /** Each mono's armies and `bot:balanced`'s, per field and budget. */
  armies: ClashArmies[];
  /** Every cell's record, by build, field, budget, seed, then seat. */
  records: ClashRecord[];
};

/** G3's opponent, in clashes as in battles. */
const G3_DEFENDER = 'bot:balanced';

/**
 * G3 on clashes (§12.3, §16 R1): each mono army against `bot:balanced`'s with the same gold, on each field,
 * in both seats, seeds 1 to n. A build passes if its rate, pooled over the budgets, has a mean over the
 * fields of at most `maxMeanWinRate` (55%), with the one-lane field counted twice, and a worst field of at
 * most `maxMapWinRate` (60%). A budget over either while the pool passes is flagged, so a build that
 * dominates only early or only late shows. On a fixed reference (`bot.balanced.fixedWeights:true`, A023)
 * the report says so and lists the monos of the spawners a spec appended apart.
 */
export async function evaluateClashG3(content: Content, o: ClashG3Options): Promise<ClashG3Verdict> {
  const t = content.targets.G3;
  const ids = o.ids ?? clashArmyIds(content);
  const defender = o.defender ?? G3_DEFENDER;
  const fixed = defender === G3_DEFENDER && !!content.bots.balanced?.fixedWeights;
  const appended = ids.filter((id) => content.buildings[id]?.aiWeight !== undefined);
  const budgets = [...(o.budgets ?? CLASH_CHECK.budgets)], fields = [...(o.fields ?? CLASH_CHECK.fields)], seeds = o.seeds ?? t.seeds;
  const counted = countedFields(fields);
  const cells: Cell[] = [];
  for (const id of ids) for (const field of fields) for (const budget of budgets) {
    for (let seed = 1; seed <= seeds; seed++) for (const seat of SIDES) cells.push({ a: `bot:mono:${id}`, b: defender, field, budget, seed, seat });
  }
  const records = await o.cache.full(cells);
  const per = fields.length * budgets.length * seeds * 2;
  const bots = ids.map((id, i): ClashG3Bot => {
    const at = byBudget(records.slice(i * per, (i + 1) * per), 'a', budgets, fields, 'highest')
      .map((b) => ({ ...b, over: b.mean > t.maxMeanWinRate || b.worst > t.maxMapWinRate }));
    const all = pooled(at, fields);
    const read = overFields(all, counted, 'highest');
    return { id, budgets: at, fields: all, ...read, pass: read.mean <= t.maxMeanWinRate && read.worst <= t.maxMapWinRate };
  });

  const armies = [...ids.map((id) => `bot:mono:${id}`), defender].flatMap((controller) => fields.flatMap((field) => budgets.map((budget): ClashArmies => {
    const all = Array.from({ length: seeds }, (_, s) => o.cache.army(controller, budget, s + 1, field));
    const first = all[0]!;
    const mean = (f: (a: Army) => number) => all.reduce((n, a) => n + f(a), 0) / all.length;
    return {
      controller, field, budget, entries: first.entries, spent: first.spent, supply: first.supply, units: first.units,
      seeds: { spent: mean((a) => a.spent), supply: mean((a) => a.supply), units: mean((a) => a.units), distinct: new Set(all.map(armyPrint)).size },
    };
  })));

  // a row per field and a mean row per build, each budget then the pool
  const idWidth = Math.max(5, ...ids.map((id) => id.length));
  const col = (xs: number[]) => xs.map((x) => whole(x).padStart(7)).join('');
  const fieldName = (f: string) => (counted.includes(f as FieldId) ? f : `${f}*`).padEnd(5);
  const details = [
    `mono win % against ${defender}'s army with the same gold (a draw half), ${2 * seeds} games per field and budget (both seats). Limits: mean ≤${pct(t.maxMeanWinRate)} (the one-lane field twice), worst field ≤${pct(t.maxMapWinRate)}, pooled over the budgets`,
    ...(fixed ? [`     the reference on its data weights (bot.balanced.fixedWeights, A023): the spawners the spec appends don't join it`] : []),
    `     ${'build'.padEnd(idWidth)}  field${[...budgets.map(String), 'pooled'].map((h) => h.padStart(7)).join('')}`,
  ];
  const apart = fixed ? bots.filter((b) => appended.includes(b.id)) : [];
  for (const b of [...bots.filter((x) => !apart.includes(x)), ...apart]) {
    if (b === apart[0]) details.push(`     the monos of the spawners the spec appended, against the reference on its data weights (A023):`);
    fields.forEach((f, k) => {
      const lead = k === 0 ? `${b.pass ? 'ok  ' : 'FAIL'} ${b.id.padEnd(idWidth)}` : `     ${''.padEnd(idWidth)}`;
      details.push(`${lead}  ${fieldName(f)}${col([...b.budgets.map((x) => x.fields[f]!.rate), b.fields[f]!.rate])}`);
    });
    const over = [b.mean > t.maxMeanWinRate ? 'mean' : '', b.worst > t.maxMapWinRate ? `worst (${b.worstField})` : ''].filter(Boolean).join(', ');
    const flags = b.pass ? b.budgets.filter((x) => x.over).map((x) => `${x.budget} (mean ${whole(x.mean)}, worst ${x.worstField} ${whole(x.worst)})`) : [];
    details.push(`     ${''.padEnd(idWidth)}  ${'mean'.padEnd(5)}${col([...b.budgets.map((x) => x.mean), b.mean])}  worst ${b.worstField} ${whole(b.worst)}`
      + `${over ? `  over: ${over}` : ''}${flags.length ? `  flag: ${flags.join(', ')}` : ''}`);
  }
  if (fields.some((f) => !counted.includes(f))) details.push('* a lead (the three-lane screen): outside the mean and the worst field');
  return {
    id: 'clash G3', pass: bots.every((b) => b.pass), bots, budgets, fields, seeds, defender, ...(fixed ? { reference: 'data weights' as const } : {}), appended, armies, records,
    summary: `every mono army against ${defender}'s with the same gold, in clashes (both seats): mean ≤${pct(t.maxMeanWinRate)} over the fields, the one-lane field twice, and worst field ≤${pct(t.maxMapWinRate)}, pooled over the budgets`,
    details,
  };
}

/** An answer's results against one build, from the answer's side. */
export interface ClashAnswer {
  answer: string;
  kind: AnswerKind;
  /** Per budget: the score on each field, their mean and the worst field. */
  budgets: { budget: number; fields: FieldScores; mean: number; worst: number; worstField: FieldId }[];
  /** Per field, pooled over the budgets. */
  fields: FieldScores;
  mean: number;
  worst: number;
  worstField: FieldId;
  /** A mono answer that fails clash G3 itself: it's flagged, and it doesn't count. */
  failsG3: boolean;
}

/** One budget of the clash matrix (#14, #15): how §7.4 reads the build there, and the screen's best answers. */
export interface ClashMatrixRow {
  budget: number;
  /** §7.4's top kind for the build's army after the muster, plain and with the swarm read, on the first field. */
  read?: { plain: CounterKind; swarmRead: CounterKind };
  answers: {
    answer: string;
    worst: number;
    worstField: FieldId;
    mean: number;
    failsG3: boolean;
    /** The army cards its armies fielded at this budget, and the counter kinds §7.4 puts them in. */
    cards: string[];
    kinds: CounterKind[];
    /** It fields only `swarm` spawners (the Burrow, the Morel Warren). */
    swarm: boolean;
  }[];
  /**
   * The answers that count which share the best result here, by the worst field then the mean, and those
   * of them that field only `swarm` spawners (#15), each best first. Undefined when no answer counts.
   */
  best?: { worst: number; mean: number; answers: string[]; swarm: string[] };
}

export interface ClashCounterBuild {
  build: string;
  g3Mean: number;
  /** Every answer's screen result, best first: by the worst field, then the mean. */
  screen: ClashAnswer[];
  /** The best answers that count, confirmed on fresh seeds, best first. */
  top: ClashAnswer[];
  /** G12: the best confirmed answer wins ≥ `minAnswerRate` on its worst field. */
  pass: boolean;
  matrix: ClashMatrixRow[];
}

export interface ClashCounterOptions {
  cache: ClashCache;
  /** Clash G3 from the same run: its budgets and fields, the builds, and which mono answers fail it. */
  g3: ClashG3Verdict;
  /** `all`: every mono G3 played is a build, whatever its mean. */
  matrix?: 'all';
  /** The mono builds, whatever their mean (`--mono`), in place of the ones G3 picks. Each must be a mono G3 played. */
  builds?: string[];
  /** Answers to try against every build (default `counterAnswers` without the economy and utility monos). */
  answers?: string[];
  screenSeeds?: number;
  confirmSeeds?: number;
  top?: number;
}

export type ClashCounterVerdict = Verdict & {
  builds: ClashCounterBuild[];
  screenSeeds: number;
  confirmSeeds: number;
  top: number;
  answers: Record<string, string[]>;
  /** §7.4's counter sets over the army cards. */
  sets: Record<CounterKind, string[]>;
  /** The clash matrix, as the report prints it (#14, #15). */
  matrixLines: string[];
  /** Every cell the screens and confirmations played. */
  records: CellRecord[];
};

/**
 * The strict counter bar on clashes (G12, §12.3) and the clash matrix (#14, #15). The builds are the monos
 * with a clash G3 mean above `minBuildMean` (40%), every mono G3 played with `matrix: 'all'`, or `builds`.
 * Each plays every answer, in both seats, on G3's fields and budgets. A screen at `screenSeeds` per seat
 * ranks the answers by their worst field pooled over the budgets, then their mean. The best `top` answers
 * that count are confirmed on the next `confirmSeeds` seeds. Clash G3 must have played every mono answer
 * (T054): one that fails it is flagged and doesn't count, and every other answer counts, as in
 * `evaluateCounters`. A build passes if its best confirmed answer wins at least `minAnswerRate` (60%) on
 * its worst field. Content must hold the bots from `counterBotSpec`.
 */
export async function evaluateClashCounters(content: Content, o: ClashCounterOptions): Promise<ClashCounterVerdict> {
  const c = CLASH_CHECK;
  const { budgets, fields } = o.g3;
  const counted = countedFields(fields);
  const screenSeeds = o.screenSeeds ?? c.screenSeeds, confirmSeeds = o.confirmSeeds ?? c.confirmSeeds, top = o.top ?? c.top;
  const played = new Set(o.g3.bots.map((b) => b.id));
  const builds = o.builds ?? o.g3.bots.filter((b) => o.matrix === 'all' || b.mean > c.minBuildMean).map((b) => b.id);
  for (const b of builds) if (!played.has(b)) throw new Error(`clash G12: build ${b} isn't a mono clash G3 played`);
  const cards = clashArmyIds(content);
  const answers = Object.fromEntries(builds.map((b) => [b, (o.answers ?? counterAnswers(content, b).filter((a) => !a.startsWith('bot:mono:') || cards.includes(a.slice(9))))
    .filter((a) => a !== `bot:mono:${b}`)]));
  for (const a of new Set(Object.values(answers).flat())) {
    const id = a.match(/^bot:(.+)$/)?.[1];
    if (id === undefined) continue;
    if (!id.startsWith('mono:')) {
      if (!content.bots[id]) throw new Error(`clash answer ${a} isn't in the content (build it with counterBotSpec)`);
    } else if (!played.has(id.slice(5))) {
      // an untested mono could be a build's only answer, unflagged (T054)
      throw new Error(`clash G12: answer ${a} is a mono clash G3 didn't play, so G12 can't count it (play G3 on every mono of clashArmyIds)`);
    }
  }
  const g3Of = (controller: string) => o.g3.bots.find((b) => `bot:mono:${b.id}` === controller);
  const records: CellRecord[] = [];
  const result = (answer: string, cells: readonly CellRecord[]): ClashAnswer => {
    const at = byBudget(cells, 'b', budgets, fields, 'lowest');
    const all = pooled(at, fields);
    const g = g3Of(answer);
    return { answer, kind: answerKind(answer), budgets: at, fields: all, ...overFields(all, counted, 'lowest'), failsG3: !!g && !g.pass };
  };
  const play = async (pairs: [string, string][], seeds: number, first: number): Promise<ClashAnswer[]> => {
    const cells: Cell[] = [];
    for (const [build, answer] of pairs) for (const field of fields) for (const budget of budgets) {
      for (let seed = first; seed < first + seeds; seed++) for (const seat of SIDES) cells.push({ a: `bot:mono:${build}`, b: answer, field, budget, seed, seat });
    }
    const out = await o.cache.slim(cells);
    for (const r of out) records.push(r);
    const per = fields.length * budgets.length * seeds * 2;
    return pairs.map(([, answer], i) => result(answer, out.slice(i * per, (i + 1) * per)));
  };
  // sort is stable, so ties keep the answers' order
  const rank = <T extends { worst: number; mean: number }>(rs: readonly T[]): T[] => [...rs].sort((x, y) => y.worst - x.worst || y.mean - x.mean);
  const screenPairs = builds.flatMap((b) => answers[b]!.map((a): [string, string] => [b, a]));
  const screened = await play(screenPairs, screenSeeds, 1);
  const screens = builds.map((b) => rank(screened.filter((_, i) => screenPairs[i]![0] === b)));
  const confirmPairs = builds.flatMap((b, i) => screens[i]!.filter((r) => !r.failsG3).slice(0, top).map((r): [string, string] => [b, r.answer]));
  const confirmed = await play(confirmPairs, confirmSeeds, screenSeeds + 1);

  const lib = buildLibrary(content, cards, []);
  const sets = counterSets(lib, cards);
  const swarmSpawners = cards.filter((id) => {
    const sp = content.buildings[id]!.spawn;
    return !!sp && content.units[sp.unit]!.tags.includes('swarm');
  });
  /** The army cards an answer's armies fielded at a budget, over the screen's fields and seeds. */
  const fieldedBy = (answer: string, budget: number): string[] => {
    const fielded = new Set<string>();
    for (const f of fields) for (let s = 1; s <= screenSeeds; s++) for (const e of o.cache.army(answer, budget, s, f).entries) fielded.add(e.buildingId);
    return cards.filter((id) => fielded.has(id));
  };
  const swarmOnly = (used: readonly string[]) => used.length > 0 && used.every((id) => swarmSpawners.includes(id));
  const matrixOf = (build: string, screen: readonly ClashAnswer[]): ClashMatrixRow[] => budgets.map((budget, k) => {
    const r = o.g3.records.find((x) => x.budget === budget && x.field === counted[0] && x.armies[x.seat].controller === `bot:mono:${build}`);
    const kinds = r?.armies[r.seat].kinds;
    const ranked = rank(screen.map((a) => ({ a, worst: a.budgets[k]!.worst, mean: a.budgets[k]!.mean })));
    // #15 asks what tops the answers, so a tie for the best is counted, among the answers that count (T054)
    const counting = ranked.filter((x) => !x.a.failsG3);
    const first = counting[0];
    const tied = first ? counting.filter((x) => x.worst === first.worst && x.mean === first.mean).map((x) => x.a.answer) : [];
    return {
      budget, ...(kinds ? { read: { plain: kinds.plain.top, swarmRead: kinds.swarmRead.top } } : {}),
      answers: ranked.slice(0, c.matrixAnswers).map(({ a }) => {
        const used = fieldedBy(a.answer, budget);
        return {
          answer: a.answer, worst: a.budgets[k]!.worst, worstField: a.budgets[k]!.worstField, mean: a.budgets[k]!.mean, failsG3: a.failsG3,
          cards: used, kinds: COUNTER_KINDS.filter((kind) => used.some((id) => counterKindsOf(lib, id).includes(kind))), swarm: swarmOnly(used),
        };
      }),
      ...(first ? { best: { worst: first.worst, mean: first.mean, answers: tied, swarm: tied.filter((a) => swarmOnly(fieldedBy(a, budget))) } } : {}),
    };
  });
  const results = builds.map((build, i): ClashCounterBuild => {
    const tops = rank(confirmed.filter((_, k) => confirmPairs[k]![0] === build));
    return { build, g3Mean: g3Of(`bot:mono:${build}`)?.mean ?? NaN, screen: screens[i]!, top: tops, pass: (tops[0]?.worst ?? 0) >= c.minAnswerRate, matrix: matrixOf(build, screens[i]!) };
  });

  const heads = fields.map((f) => (counted.includes(f) ? f : `${f}*`));
  const ansWidth = Math.max(6, ...results.flatMap((r) => r.top.map((t) => t.answer.length)));
  const details = [
    `answer win % against each mono build with the same gold (a draw half), both seats. Screen: ${2 * screenSeeds} games per field and budget (seeds 1–${screenSeeds});`
    + ` the best ${top} answers that count confirmed on ${2 * confirmSeeds} more (seeds ${screenSeeds + 1}–${screenSeeds + confirmSeeds}).`
    + ` Pass: the best confirmed answer wins ≥${pct(c.minAnswerRate)} on its worst field, pooled over the budgets; a mono answer that fails clash G3 doesn't count`,
  ];
  for (const r of results) {
    const b = r.top[0];
    details.push(`${r.pass ? 'ok  ' : 'FAIL'} mono:${r.build} (clash G3 mean ${whole(r.g3Mean)}%, ${r.screen.length} answers): best ${b ? `${b.answer}, worst field ${b.worstField} ${whole(b.worst)}%` : 'none that counts'}`);
    details.push(`       ${'answer'.padEnd(ansWidth)}  ${heads.map((h) => h.padStart(5)).join(' ')}  worst   mean   per budget, worst field`);
    for (const t of r.top) {
      details.push(`       ${t.answer.padEnd(ansWidth)}  ${fields.map((f, i) => whole(t.fields[f]!.rate).padStart(Math.max(5, heads[i]!.length))).join(' ')}  ${whole(t.worst).padStart(5)}  ${whole(t.mean).padStart(5)}`
        + `   ${t.budgets.map((x) => `${x.budget} ${whole(x.worst)}`).join(' · ')}`);
    }
    const next = r.screen.filter((s) => !s.failsG3).slice(top, top + 5);
    details.push(`       screen, next best: ${next.map((s) => `${s.answer} ${whole(s.worst)}`).join(', ') || 'none'}`);
    const flagged = r.screen.filter((s) => s.failsG3);
    if (flagged.length) details.push(`       fail clash G3, so not counted: ${flagged.slice(0, 5).map((s) => `${s.answer} ${whole(s.worst)}`).join(', ')}`);
  }
  if (heads.some((h) => h.endsWith('*'))) details.push('* a lead (the three-lane screen): outside the worst field and the mean');

  const name = (id: string) => content.buildings[id]?.name ?? id;
  const matrixLines = [
    `clash matrix (#14, #15): each mono build's best ${c.matrixAnswers} answers at each budget in the screen, by the worst field (answer win %), with the counter kinds §7.4 puts their buildings in. ⚑ fails clash G3`,
    `    §7.4's counter sets: ${COUNTER_KINDS.map((k) => `${k} [${sets[k].join(', ')}]`).join(' · ')}`,
  ];
  for (const r of results) {
    matrixLines.push(`    mono:${r.build}`);
    for (const row of r.matrix) {
      const read = row.read ? `§7.4 reads ${row.read.plain}, ${row.read.swarmRead} with the swarm read` : '§7.4 reads –';
      matrixLines.push(`      ${String(row.budget).padStart(4)} (${read}): ${row.answers.map((a) => `${a.answer} ${whole(a.worst)}${a.failsG3 ? ' ⚑' : ''} [${a.kinds.join(', ') || '–'}]`).join(' · ')}`);
    }
  }
  const gill = results.find((r) => r.build === 'gillNest');
  const swarm = swarmSpawners.map(name).join(' and ');
  const names = (xs: readonly string[]) => `${xs.slice(0, 3).join(', ')}${xs.length > 3 ? ', …' : ''}`;
  const best = ({ budget, best: b }: ClashMatrixRow) => {
    if (!b) return `${budget}: no answer counts`;
    const at = `${b.swarm.length} of ${b.answers.length}${b.answers.length > 1 ? ' tied' : ''} at ${whole(b.worst)}%`;
    return `${budget}: ${at} (${b.swarm.length ? names(b.swarm) : `best ${names(b.answers)}`})`;
  };
  matrixLines.push(gill
    ? `    swarm spawners (${swarm}) among the best answers to mono Gill Nest that count (⚑ left out): at each budget, how many of the answers tied for the best field only them · ${gill.matrix.map(best).join(' · ')}`
    : `    mono Gill Nest isn't a build in this run, so the matrix doesn't say whether swarm spawners (${swarm}) answer it`);

  return {
    id: 'G12', pass: results.every((r) => r.pass), builds: results, screenSeeds, confirmSeeds, top, answers, sets, matrixLines, records,
    summary: `the strict counter bar on clashes: every mono build with a clash G3 mean above ${pct(c.minBuildMean)} has an answer that wins ≥${pct(c.minAnswerRate)} on its worst field, among answers that pass clash G3`,
    details,
  };
}

// ---------------------------------------------------------------- R1's variants on the bars (T030)

/**
 * §11.4's intended counter graph for the core six, each archetype's row by its building: what it beats and
 * what it loses to. The Puffball Mortar has no row, so the core-six check reports what it measures for it.
 */
export const CORE6_GRAPH: Record<string, { beats: string[]; losesTo: string[] }> = {
  sporelingBurrow: { beats: ['gillNest', 'hammercapForge'], losesTo: ['capguardHall', 'amanitaLodge', 'bursterPod'] },
  capguardHall: { beats: ['sporelingBurrow'], losesTo: ['gillNest', 'amanitaLodge'] },
  gillNest: { beats: ['capguardHall', 'hammercapForge'], losesTo: ['sporelingBurrow', 'amanitaLodge'] },
  amanitaLodge: { beats: ['sporelingBurrow', 'capguardHall', 'gillNest'], losesTo: ['hammercapForge'] },
  hammercapForge: { beats: ['amanitaLodge'], losesTo: ['sporelingBurrow', 'gillNest'] },
  bursterPod: { beats: ['sporelingBurrow'], losesTo: ['gillNest'] },
};

/** The six a core-six check plays: the five core spawners and the candidate (R1-Q6). */
export const core6Ids = (candidate: string): string[] => [...CORE_SPAWNERS, candidate];

/**
 * The core-six check's answers (R1-Q6): the six's monos, their 15 even pairs (the counter check's pair
 * bots) and `bot:core6`. Content must hold the bots from `counterBotSpec` and `core6Spec`.
 */
export function core6Answers(content: Content, candidate: string): string[] {
  const six = core6Ids(candidate);
  const pairs: string[] = [];
  for (let i = 0; i < six.length; i++) for (let j = i + 1; j < six.length; j++) {
    const id = [`pair-${six[i]}-${six[j]}`, `pair-${six[j]}-${six[i]}`].find((p) => content.bots[p]);
    if (!id) throw new Error(`core six: no pair bot for ${six[i]} and ${six[j]} (build the content with counterBotSpec)`);
    pairs.push(`bot:${id}`);
  }
  if (!content.bots.core6) throw new Error('core six: bot:core6 is missing (append core6Spec)');
  return [...six.map((id) => `bot:mono:${id}`), ...pairs, 'bot:core6'];
}

/** One directed edge between two of the six: the winner's mono's clash win rate against the loser's (a draw half). */
export interface GraphEdge {
  winner: string;
  loser: string;
  /** In §11.4's graph, or only measured (an edge of the Mortar's row, at 60% or more). */
  intended: boolean;
  /** Per budget: the mean over the fields, the one-lane field twice. */
  budgets: { budget: number; rate: number }[];
  /** Pooled over the budgets. */
  rate: number;
}

export interface Core6GraphOptions {
  cache: ClashCache;
  candidate: string;
  budgets?: readonly number[];
  fields?: readonly FieldId[];
  /** Seeds per seat (default the screen's 20, so the screen's cells are shared). */
  seeds?: number;
}

/**
 * §11.4's intended graph on clashes (R1-Q6, A011): every two of the six's monos play, in both seats, and
 * each of the graph's edges reads as its winner's rate per budget. A candidate with no row (the Mortar)
 * gets its measured one instead: what it beats, and what beats it, at 60% or more. Report only.
 */
export async function evaluateCore6Graph(content: Content, o: Core6GraphOptions): Promise<{ edges: GraphEdge[]; records: CellRecord[]; lines: string[] }> {
  const budgets = [...(o.budgets ?? CLASH_CHECK.budgets)], fields = [...(o.fields ?? CLASH_CHECK.fields)], seeds = o.seeds ?? CLASH_CHECK.screenSeeds;
  const counted = countedFields(fields);
  const six = core6Ids(o.candidate);
  const pairs: [string, string][] = [];
  for (let i = 0; i < six.length; i++) for (let j = i + 1; j < six.length; j++) pairs.push([six[i]!, six[j]!]);
  const cells: Cell[] = [];
  for (const [a, b] of pairs) for (const field of fields) for (const budget of budgets) {
    for (let seed = 1; seed <= seeds; seed++) for (const seat of SIDES) cells.push({ a: `bot:mono:${a}`, b: `bot:mono:${b}`, field, budget, seed, seat });
  }
  const records = await o.cache.slim(cells);
  const per = fields.length * budgets.length * seeds * 2;
  // a pair's cells read from either side: the second mono's results are the first's complement
  const read = new Map<string, ReturnType<typeof byBudget>>();
  pairs.forEach(([a, b], i) => {
    const mine = records.slice(i * per, (i + 1) * per);
    read.set(`${a}>${b}`, byBudget(mine, 'a', budgets, fields, 'lowest'));
    read.set(`${b}>${a}`, byBudget(mine, 'b', budgets, fields, 'lowest'));
  });
  const edge = (winner: string, loser: string, intended: boolean): GraphEdge => {
    const at = read.get(`${winner}>${loser}`)!;
    return { winner, loser, intended, budgets: at.map((x) => ({ budget: x.budget, rate: x.mean })), rate: overFields(pooled(at, fields), counted, 'lowest').mean };
  };
  const edges: GraphEdge[] = [];
  const have = (w: string, l: string) => edges.some((e) => e.winner === w && e.loser === l);
  for (const id of six) {
    const row = CORE6_GRAPH[id];
    for (const x of row?.beats ?? []) if (six.includes(x) && !have(id, x)) edges.push(edge(id, x, true));
    for (const x of row?.losesTo ?? []) if (six.includes(x) && !have(x, id)) edges.push(edge(x, id, true));
  }
  if (!CORE6_GRAPH[o.candidate]) {
    for (const x of six) {
      if (x === o.candidate) continue;
      for (const [w, l] of [[o.candidate, x], [x, o.candidate]] as const) {
        const e = edge(w, l, false);
        if (e.rate >= CLASH_CHECK.minAnswerRate) edges.push(e);
      }
    }
  }
  const name = (id: string) => content.buildings[id]?.name ?? id;
  const mark = (r: number) => (r >= CLASH_CHECK.minAnswerRate ? ' ✓' : r < 0.5 ? ' ✗' : '');
  const show = (e: GraphEdge, other: string) => `${name(other)} ${whole(e.rate)}${mark(e.rate)} (${e.budgets.map((b) => `${b.budget} ${whole(b.rate)}`).join(' · ')})`;
  const lines = [
    `core six with ${name(o.candidate)} (R1-Q6): §11.4's intended graph on clashes, each edge as its winner's win % against the loser's mono (a draw half), pooled and per budget; ✓ at ≥${pct(CLASH_CHECK.minAnswerRate)}, ✗ under 50%`,
  ];
  for (const id of six) {
    const beats = edges.filter((e) => e.winner === id), loses = edges.filter((e) => e.loser === id);
    const head = CORE6_GRAPH[id] ? name(id) : `${name(id)} (no row in §11.4, measured at ≥${pct(CLASH_CHECK.minAnswerRate)})`;
    lines.push(`    ${head}: beats ${beats.map((e) => show(e, e.loser)).join(', ') || '–'}; loses to ${loses.map((e) => show(e, e.winner)).join(', ') || '–'}`);
  }
  return { edges, records, lines };
}

/** A controller's merge mirror: its army, merging on, against its own twin with merging off. */
export interface MirrorRow {
  controller: string;
  /** The merge-on side's results per budget: the score on each field, their mean and the worst field. */
  budgets: { budget: number; fields: FieldScores; mean: number; worst: number; worstField: FieldId }[];
  fields: FieldScores;
  mean: number;
  /** Inside G7's band for the merge-on side (55–70%), report only. */
  inBand: boolean;
}

/**
 * The merge mirror (§12.3 G7 in round form, for #9; A015): every G3 build and the reference against its
 * own army with merging off, built on the same seed, on G3's budgets and fields, both seats. Report only:
 * each merge-on side's rate beside G7's band.
 */
export async function evaluateMergeMirror(content: Content, o: { cache: ClashCache; g3: ClashG3Verdict; seeds?: number }): Promise<{ rows: MirrorRow[]; records: CellRecord[]; lines: string[] }> {
  const band = content.targets.G7.mirror;
  const { budgets, fields } = o.g3;
  const counted = countedFields(fields);
  const seeds = o.seeds ?? CLASH_CHECK.mirrorSeeds;
  const controllers = [...o.g3.bots.map((b) => `bot:mono:${b.id}`), o.g3.defender];
  const cells: Cell[] = [];
  for (const c of controllers) for (const field of fields) for (const budget of budgets) {
    for (let seed = 1; seed <= seeds; seed++) for (const seat of SIDES) cells.push({ a: c, b: c, field, budget, seed, seat, twin: true });
  }
  const records = await o.cache.slim(cells);
  const per = fields.length * budgets.length * seeds * 2;
  const rows = controllers.map((controller, i): MirrorRow => {
    const at = byBudget(records.slice(i * per, (i + 1) * per), 'a', budgets, fields, 'lowest');
    const all = pooled(at, fields);
    const { mean } = overFields(all, counted, 'lowest');
    return { controller, budgets: at, fields: all, mean, inBand: mean >= band.minWinRate && mean <= band.maxWinRate };
  });
  const width = Math.max(10, ...controllers.map((c) => c.length));
  const lines = [
    `merge mirror (G7's round form, #9): each army, merging on, against its own twin with merging off, ${2 * seeds} games per field and budget; the merge-on side's win % (a draw half), its mean over the fields (the one-lane field twice), against G7's ${pct(band.minWinRate)}–${pct(band.maxWinRate)} (report only)`,
    `    ${'army'.padEnd(width)}${[...budgets.map(String), 'pooled'].map((h) => h.padStart(7)).join('')}`,
    ...rows.map((r) => `    ${r.controller.padEnd(width)}${[...r.budgets.map((b) => b.mean), r.mean].map((x) => whole(x).padStart(7)).join('')}${r.inBand ? '' : `  outside ${pct(band.minWinRate)}–${pct(band.maxWinRate)}`}`),
  ];
  return { rows, records, lines };
}

/** A spawner's squad and §11.4's value for it, under some squad options. */
export interface SquadRow {
  buildingId: string;
  squad: number;
  /** §11.4's role factor; undefined where the heuristic can't value the unit (the Burster, the Tender). */
  roleFactor?: number;
  perGold?: number;
  perPlot?: number;
}

/**
 * The squad table (§11.4, A010): each army card's spawner, its squad under these options and its value,
 * `squad × sqrt(HP × DPS) × roleFactor` per plot and that over the cost per gold, at tier 1. §11.4's role
 * factors: ranged 1.6, splash and cleave 1.4, siege 1.3, slayer 1.2, other 1.0.
 */
export function squadTable(content: Content, opts: SquadOpts = {}): SquadRow[] {
  return clashArmyIds(content).filter((id) => content.buildings[id]!.spawn).map((id): SquadRow => {
    const b = content.buildings[id]!, u = content.units[b.spawn!.unit]!;
    const squad = squadSize(content, id, opts);
    // what the heuristic can't value (§11.4): the Burster's one burst, the Tender's heals
    if (u.tags.includes('burst') || u.tags.includes('support')) return { buildingId: id, squad };
    const roleFactor = u.tags.includes('ranged') ? 1.6 : (u.splashRadius ?? 0) > 0 ? 1.4 : u.tags.includes('siege') ? 1.3 : u.tags.includes('slayer') ? 1.2 : 1;
    const perPlot = squad * Math.sqrt(u.hp * (u.damage / u.attackInterval)) * roleFactor;
    return { buildingId: id, squad, roleFactor, perGold: perPlot / b.cost, perPlot };
  });
}

/** The squad table as the clash report prints it. */
export function squadLines(content: Content, opts: SquadOpts = {}): string[] {
  const rows = squadTable(content, opts);
  const width = Math.max(8, ...rows.map((r) => r.buildingId.length));
  return [
    "squads and §11.4's value under this run's squad options: squad × sqrt(HP × DPS) × role factor, per plot and per gold (target 1.45 ± 0.15 per gold)",
    ...rows.map((r) => `    ${r.buildingId.padEnd(width)} ${String(r.squad).padStart(3)}   ${r.roleFactor === undefined ? '  –' : `×${r.roleFactor.toFixed(1)}`}`
      + `   ${r.perGold === undefined ? '–' : `${r.perGold.toFixed(2)} a gold, ${Math.round(r.perPlot!)} a plot`}`),
  ];
}

/** A set of clashes read one way: how many, how many reached the cap and that share, and the median length. */
export interface StallRead {
  clashes: number;
  capped: number;
  share: number;
  medianSeconds: number;
}

export type ClashG13Verdict = Verdict & {
  /** Every clash on the counted fields: the `cap` reading (the bar) and the cap after the muster (#13). */
  all: Record<Reading, StallRead>;
  /** G3's clashes alone, on the counted fields. */
  g3: Record<Reading, StallRead>;
  /** The three-lane screen's clashes, a lead outside the bar (R1-Q9), when they were played beside the counted fields. */
  three?: Record<Reading, StallRead>;
  /** Per budget and field, budgets ascending. */
  cells: ({ budget: number; field: FieldId } & Record<Reading, StallRead>)[];
};

const FIELD_ORDER: readonly FieldId[] = ['one', 'twin', 'three'];

/**
 * G13 on clashes (§12.3, §16 R1, plan call 15): the share of clashes that reached the 45 s cap, against
 * `CLASH.g13StallShare` (15%), in the `cap` reading (the muster counted, the first guess). Pass every cell
 * the check played, each once. The bar counts the fields G3 and G12 count (T054): the three-lane screen is
 * a lead beside it, unless it's all there is. The cap after the muster (#13), G3's clashes alone, the
 * median length against 20–40 s (report only) and each budget and field are reported beside it.
 */
export function clashG13(records: readonly CellRecord[], g3: readonly CellRecord[] = []): ClashG13Verdict {
  const read = (rs: readonly CellRecord[], reading: Reading): StallRead => {
    let capped = 0;
    const lengths: number[] = [];
    for (const r of rs) {
      if (r[reading].capped) capped++;
      lengths.push(r[reading].ticks);
    }
    return { clashes: rs.length, capped, share: capped / rs.length, medianSeconds: median(lengths) / 20 };
  };
  const both = (rs: readonly CellRecord[]): Record<Reading, StallRead> => ({ cap: read(rs, 'cap'), capAfterMuster: read(rs, 'capAfterMuster') });
  const groups = new Map<string, CellRecord[]>();
  for (const r of records) {
    const k = `${r.budget}|${r.field}`;
    const g = groups.get(k);
    if (g) g.push(r); else groups.set(k, [r]);
  }
  const cells = [...groups.values()].map((rs) => ({ budget: rs[0]!.budget, field: rs[0]!.field, ...both(rs) }))
    .sort((p, q) => p.budget - q.budget || FIELD_ORDER.indexOf(p.field) - FIELD_ORDER.indexOf(q.field));
  const counted = countedFields(FIELD_ORDER.filter((f) => records.some((r) => r.field === f)));
  const inBar = (rs: readonly CellRecord[]) => rs.filter((r) => counted.includes(r.field));
  const leads = records.filter((r) => !counted.includes(r.field));
  const all = both(inBar(records)), mine = both(inBar(g3)), three = leads.length ? both(leads) : undefined;
  const pass = !(all.cap.share > CLASH.g13StallShare);

  const share = (x: StallRead) => (Number.isFinite(x.share) ? `${(100 * x.share).toFixed(1)}%` : '–');
  const sec = (x: StallRead) => (Number.isFinite(x.medianSeconds) ? `${x.medianSeconds.toFixed(1)} s` : '–');
  const [lo, hi] = CLASH.g13MedianSeconds;
  const band = (x: StallRead) => (x.medianSeconds < lo ? 'under' : x.medianSeconds > hi ? 'over' : 'inside');
  const details = [
    `${pass ? 'ok  ' : 'FAIL'} the cap reading (the muster counted): ${share(all.cap)} of ${all.cap.clashes} clashes reached the cap; median length ${sec(all.cap)}, ${band(all.cap)} the ${lo}–${hi} s target (report only)`,
    `     the cap after the muster (#13): ${share(all.capAfterMuster)} reached it; median ${sec(all.capAfterMuster)}`,
    `     G3's clashes: ${share(mine.cap)} of ${mine.cap.clashes} reached the cap (after the muster ${share(mine.capAfterMuster)}); median ${sec(mine.cap)}`,
    ...(three ? [`     the three-lane screen, a lead outside the bar: ${share(three.cap)} of ${three.cap.clashes} reached the cap (after the muster ${share(three.capAfterMuster)}); median ${sec(three.cap)}`] : []),
    `     per budget and field, the share capped and the median, then after the muster${three ? ' (* a lead)' : ''}:`,
  ];
  for (const budget of [...new Set(cells.map((x) => x.budget))]) {
    details.push(`     ${String(budget).padStart(6)}: ${cells.filter((x) => x.budget === budget)
      .map((x) => `${counted.includes(x.field) ? x.field : `${x.field}*`} ${share(x.cap)} ${sec(x.cap)} (${share(x.capAfterMuster)} ${sec(x.capAfterMuster)})`).join(' · ')}`);
  }
  return {
    id: 'G13', pass, all, g3: mine, ...(three ? { three } : {}), cells,
    summary: `clash stalls: ≤${pct(CLASH.g13StallShare)} of clashes reach the 45 s cap (the muster counted), over every clash the check played`,
    details,
  };
}

/**
 * Every cell in these lists once, in the order first seen, for G13: a cell is its two controllers, its
 * field, budget, seed and seat. So a counter-matrix cell that is also G3's (`bot:balanced` answering a
 * mono on G3's seeds) counts once.
 */
export function uniqueCells(...lists: readonly (readonly CellRecord[])[]): CellRecord[] {
  const seen = new Set<string>();
  const out: CellRecord[] = [];
  for (const list of lists) {
    for (const r of list) {
      const k = `${r.armies.player.controller}|${r.armies.enemy.controller}|${r.field}|${r.budget}|${r.seed}|${r.seat}`;
      if (seen.has(k)) continue;
      seen.add(k);
      out.push(r);
    }
  }
  return out;
}

function pct(x: number): string {
  return `${Math.round(x * 100)}%`;
}

function fmt(sec: number): string {
  const s = Math.round(sec);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

export { summarize };

// ---- the commander tournament (SPEC §16 Milestone 5, verification 3) ----

/** No commander's run win rate may be more than this many points above another's. */
export const COMMANDER_SPREAD = 15;

export interface CommanderRow {
  commander: string;
  runs: number;
  victories: number;
  reachedBoss: number;
  battlesWon: number;
  battles: number;
  powerUses: number;
  powerDamage: number;
  powerCaptures: number;
  powerMerges: number;
  powerGold: number;
}

/**
 * Whole runs per commander: `bot:balanced` with greedy drafts, a random route and the auto power policy,
 * on seeds 1..n with the run's default flags (powers on). Each commander plays the same seeds.
 */
export function commanderTournament(content: Content, commanders: string[], seeds: number): { rows: CommanderRow[]; verdict: Verdict } {
  const rows: CommanderRow[] = [];
  for (const commander of commanders) {
    const row: CommanderRow = {
      commander, runs: 0, victories: 0, reachedBoss: 0, battlesWon: 0, battles: 0, powerUses: 0, powerDamage: 0, powerCaptures: 0, powerMerges: 0, powerGold: 0,
    };
    for (let seed = 1; seed <= seeds; seed++) {
      const r = simulateRun(content, seed, { route: 'random', draft: 'greedy', player: 'bot:balanced', power: 'auto' }, {
        commander,
        onBattle: ({ state }) => {
          const st = state.stats.player;
          row.powerUses += st.powerUses ?? 0;
          row.powerDamage += st.powerDamage ?? 0;
          row.powerCaptures += st.powerCaptures ?? 0;
          row.powerMerges += st.powerMerges ?? 0;
          row.powerGold += st.powerGold ?? 0;
        },
      });
      row.runs++;
      if (r.outcome === 'victory') row.victories++;
      if (r.reachedBoss) row.reachedBoss++;
      row.battles += r.battleCount;
      row.battlesWon += r.battles.filter((b) => b.winner === 'player').length;
    }
    rows.push(row);
  }
  const rate = (r: CommanderRow) => (100 * r.victories) / Math.max(1, r.runs);
  const rates = rows.map(rate);
  const spread = Math.max(...rates) - Math.min(...rates);
  const pass = spread <= COMMANDER_SPREAD;
  return {
    rows,
    verdict: {
      id: 'M5', pass,
      summary: `commander run win rates within ${COMMANDER_SPREAD} points (${seeds} seeds each): spread ${spread.toFixed(0)} points`,
      details: rows.map((r) => `${r.commander}: ${rate(r).toFixed(0)}% runs won (${r.victories}/${r.runs}) · boss reached ${r.reachedBoss}/${r.runs} · ` +
        `battles won ${r.battlesWon}/${r.battles} · power used ${r.powerUses}× (damage ${r.powerDamage}, columns ${r.powerCaptures}, trios ${r.powerMerges}, gold ${r.powerGold})`),
    },
  };
}
