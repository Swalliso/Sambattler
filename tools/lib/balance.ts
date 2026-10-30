// Balance harness (SPEC §12): production and supply duels, bot tournaments, the guardrail
// evaluations G1–G8, the counter matrix (combat rework P0) and the commander tournament (SPEC §16 M5). Shared by `npm run balance`, `npm run experiment` and the slow test suite. Duels measure the base
// counter matrix, so they run with merging off; battles use the milestone's default flags.
import type { Content } from '../../src/data/registry.ts';
import type { BotDef } from '../../src/data/schema.ts';
import { addBuilding, addUnit } from '../../src/sim/create.ts';
import { createBattle, makeConfig, runHeadless, summarize } from '../../src/sim/index.ts';
import type { BattleConfig, BattleState, Side, Tier } from '../../src/sim/index.ts';
import { buildingDef } from '../../src/sim/world.ts';
import { mapPool, simulateRun } from '../../src/run/index.ts';
import { median, runBattle } from './run.ts';

const DUEL_TEST = { noTurrets: true, noTerritory: true, noHeartcapTargets: true };
const ROSTER = 'velvet-bloom';

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

/** The player roster's buildings (the faction list; the Gray Rot mirrors it until M7). */
export function rosterIds(content: Content): string[] {
  return [...content.factions[ROSTER]!.buildings];
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

/** G4 itself is Bogwater Hollow; `map` measures the same pairing elsewhere (`npm run experiment -- --checks g4 --maps …`). */
export function evaluateG4(content: Content, map = 'bogwater-hollow'): Verdict & { stats: MatchStats } {
  const t = content.targets.G4;
  const m = matchup(content, 'bot:balanced', 'general:scripted', t.seeds, false, 0, map);
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
    summary: `balanced vs scripted on ${content.maps[map]?.name ?? map}, ${t.seeds} seeds`,
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
 * The counter check (docs/ideas/combat-rework.md): a strong mono build is a strategy if something beats
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
  return bots;
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
  maps: { map: string; wins: number; games: number; rate: number }[];
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
    const mine = cells.map((r) => ({ map: r.map, wins: r.games - r.wins, games: r.games, rate: (r.games - r.wins) / r.games }));
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
