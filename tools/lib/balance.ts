// Balance harness (SPEC §12): production and supply duels, bot tournaments and the guardrail
// evaluations G1–G6. Shared by `npm run balance` and the slow test suite.
import type { Content } from '../../src/data/registry.ts';
import { addBuilding, addUnit } from '../../src/sim/create.ts';
import { createBattle, makeConfig, runHeadless, summarize } from '../../src/sim/index.ts';
import type { BattleState, Side } from '../../src/sim/index.ts';
import { buildingDef } from '../../src/sim/world.ts';
import { median, runBattle } from './run.ts';

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
    seed, mapId: 'test-flat', player: 'human', enemy: 'human',
    test: { ...DUEL_TEST, timeLimitSeconds: seconds },
  });
  const state = createBattle(content, config);
  state.phase = 'live';
  return state;
}

export function spawnerIds(content: Content): string[] {
  return content.buildingOrder.filter((id) => content.buildings[id]!.kind === 'spawner' && content.buildings[id]!.milestone <= 1);
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

/** 12 supply of unit A against 12 supply of unit B, fought to the death. */
export function supplyDuel(content: Content, a: string, b: string, seed: number): DuelOutcome & { seconds: number } {
  const t = content.targets.G2;
  const state = duelState(content, seed, t.maxSeconds);
  const rand = toolRand(seed * 7919 + a.length * 31 + b.length);
  const put = (side: Side, unitId: string) => {
    const u = content.units[unitId]!;
    const n = Math.floor(t.supply / u.supply);
    // spread the army over the lane height (up to 7 rows) so frontage is not an artefact of the setup
    const rows = Math.min(n, 7);
    const span = state.map.height - 1.2;
    for (let i = 0; i < n; i++) {
      const col = Math.floor(i / rows), row = i % rows;
      const x0 = side === 'player' ? 10 - col * 0.9 : 22 + col * 0.9;
      const y = 0.6 + (rows > 1 ? (row * span) / (rows - 1) : span / 2) + (rand() - 0.5) * 0.4;
      const x = x0 + (rand() - 0.5) * 0.6;
      addUnit(state, side, unitId, 0, x, y, 0);
    }
  };
  // units without a building in the kit still need compiled defs: the default kit covers all M1 units
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
  const intended: [string, string][] = [
    ['capguard', 'sporeling'], ['gillArcher', 'capguard'], ['sporeling', 'gillArcher'],
    ['gillArcher', 'rootbreaker'], ['capguard', 'rootbreaker'], ['rootbreaker', 'sporeling'],
  ];
  for (const [a, b] of intended) {
    const w = edges[`${a}>${b}`] ?? 0;
    details.push(`${w >= t.minSeedsForEdge ? 'held' : 'MISS'} intended edge ${a} > ${b}: ${w}/${t.seeds} seeds (report only)`);
  }
  return { verdict: { id: 'G2', pass, summary: 'supply duels form a healthy counter graph (≥4/5 seeds per edge)', details }, outcomes, edges };
}

export interface MatchStats { games: number; winsA: number; decisions: number; lengths: number[]; rejected: number; wallMs: number[] }

/**
 * Plays `a` against `b` over seeds, in both seats when `symmetric` (A as player, then A as enemy),
 * and reports A's results. `goldA` gives A extra starting gold.
 */
export function matchup(content: Content, a: string, b: string, seeds: number, symmetric: boolean, goldA = 0, map = 'bogwater-hollow'): MatchStats {
  const st: MatchStats = { games: 0, winsA: 0, decisions: 0, lengths: [], rejected: 0, wallMs: [] };
  for (let seed = 1; seed <= seeds; seed++) {
    const seats: ['player' | 'enemy'][] = symmetric ? [['player'], ['enemy']] : [['player']];
    for (const [seatA] of seats) {
      const { result } = runBattle(content, {
        seed, map,
        player: seatA === 'player' ? a : b,
        enemy: seatA === 'player' ? b : a,
        startingGold: goldA ? { [seatA]: goldA } : {},
      });
      st.games++;
      if (result.winner === seatA) st.winsA++;
      if (result.by === 'decision') st.decisions++;
      st.lengths.push(result.durationTicks);
      st.rejected += result.rejectedCommands;
      st.wallMs.push(result.wallMs);
    }
  }
  return st;
}

export function evaluateG3(content: Content): Verdict {
  const t = content.targets.G3;
  const details: string[] = [];
  let pass = true;
  for (const id of content.buildingOrder.filter((b) => content.buildings[b]!.milestone <= 1)) {
    const m = matchup(content, `bot:mono:${id}`, 'bot:balanced', t.seeds, true);
    const rate = m.winsA / m.games;
    const ok = rate <= t.maxMonoWinRate;
    if (!ok) pass = false;
    details.push(`${ok ? 'ok  ' : 'FAIL'} mono:${id} vs balanced: ${(rate * 100).toFixed(0)}% over ${m.games} games`);
  }
  return { id: 'G3', pass, summary: `every mono bot wins ≤${pct(t.maxMonoWinRate)} vs balanced (both seats)`, details };
}

export function evaluateG4(content: Content): Verdict & { stats: MatchStats } {
  const t = content.targets.G4;
  const m = matchup(content, 'bot:balanced', 'general:scripted', t.seeds, false);
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
    summary: `balanced vs scripted on Bogwater Hollow, ${t.seeds} seeds`,
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

function pct(x: number): string {
  return `${Math.round(x * 100)}%`;
}

function fmt(sec: number): string {
  const s = Math.round(sec);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

export { summarize };
