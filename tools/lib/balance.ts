// Balance harness (SPEC §12): production and supply duels, bot tournaments and the guardrail
// evaluations G1–G7. Shared by `npm run balance` and the slow test suite. Duels measure the base
// counter matrix, so they run with merging off; battles use the milestone's default flags.
import type { Content } from '../../src/data/registry.ts';
import { addBuilding, addUnit } from '../../src/sim/create.ts';
import { createBattle, makeConfig, runHeadless, summarize } from '../../src/sim/index.ts';
import type { BattleState, Side, Tier } from '../../src/sim/index.ts';
import { buildingDef } from '../../src/sim/world.ts';
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

export function spawnerIds(content: Content): string[] {
  return rosterIds(content).filter((id) => content.buildings[id]!.kind === 'spawner');
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
    details.push(`${w >= t.minSeedsForEdge ? 'held' : 'MISS'} intended edge ${a} > ${b}: ${w}/${t.seeds} seeds (report only)`);
  }
  return { verdict: { id: 'G2', pass, summary: 'supply duels form a healthy counter graph (≥4/5 seeds per edge)', details }, outcomes, edges };
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
export function matchup(content: Content, a: string, b: string, seeds: number, symmetric: boolean, goldA = 0, map = 'bogwater-hollow'): MatchStats {
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

export function evaluateG3(content: Content): Verdict {
  const t = content.targets.G3;
  const details: string[] = [];
  let pass = true;
  for (const id of rosterIds(content)) {
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

function pct(x: number): string {
  return `${Math.round(x * 100)}%`;
}

function fmt(sec: number): string {
  const s = Math.round(sec);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

export { summarize };
