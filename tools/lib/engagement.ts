// Engagement numbers (docs/engagement-review.md): how a battle is paced rather than who wins it.
// The guardrails ask "is it degenerate?"; these ask when the front first moves, how many units are
// on the field, how fast a beaten Heartcap falls, how often a side issues a command, and how a run
// ends. Used by `npm run experiment -- --checks engagement,runs`.
import type { Content } from '../../src/data/registry.ts';
import { runHeadless } from '../../src/sim/index.ts';
import type { BattleState, Side } from '../../src/sim/index.ts';
import { simulateRun } from '../../src/run/index.ts';
import { buildState, median } from './run.ts';

/** Clock times (seconds) at which supply on the field is sampled. */
export const SUPPLY_AT = [60, 120, 180, 300];

export interface EngagementRow {
  player: string;
  enemy: string;
  map: string;
  battles: number;
  playerWins: number;
  decisions: number;
  medianSeconds: number;
  /** Median clock (seconds) of the first column flip in any lane; Infinity counts as never. */
  firstFlipSeconds: number;
  noFlipBy3: number;
  /** Median of both sides' supply on the field at each `SUPPLY_AT` mark. */
  supplyAt: Record<number, number>;
  /** Routs: median seconds from the loser's first Heartcap damage to its death, and from half HP. */
  fallSeconds: number;
  fallFromHalfSeconds: number;
  routs: number;
  winnerUntouched: number;
  /** Median commands the player side executed per battle, per minute, and stance commands alone. */
  playerCommands: number;
  playerCommandsPerMinute: number;
  stanceCommands: number;
  merges: number;
}

interface Tracker { firstFlip: number; firstHit: Record<Side, number>; half: Record<Side, number>; supply: Record<number, number> }

function track(state: BattleState, t: Tracker): void {
  const tick = state.tick;
  if (t.firstFlip === Infinity) {
    const w = state.map.width, home = state.map.homeCols;
    if (state.lanes.some((l) => l.pBorder !== home - 1 || l.eBorder !== w - home)) t.firstFlip = tick;
  }
  for (const side of ['player', 'enemy'] as const) {
    const sd = state.sides[side];
    if (sd.heartcapHp < sd.heartcapMaxHp && t.firstHit[side] === Infinity) t.firstHit[side] = tick;
    if (sd.heartcapHp <= sd.heartcapMaxHp / 2 && t.half[side] === Infinity) t.half[side] = tick;
  }
  const secs = tick / state.rules.tickRate;
  if (SUPPLY_AT.includes(secs)) t.supply[secs] = state.sides.player.supplyUsed + state.sides.enemy.supplyUsed;
}

const finite = (xs: number[]) => xs.filter(Number.isFinite);

export function engagement(content: Content, opts: { player: string; enemy: string; map?: string; seeds: number[] }): EngagementRow {
  const map = opts.map ?? 'bogwater-hollow';
  const flips: number[] = [], lengths: number[] = [], fall: number[] = [], fallHalf: number[] = [];
  const cmds: number[] = [], cpm: number[] = [], stance: number[] = [], merges: number[] = [];
  const supply: Record<number, number[]> = Object.fromEntries(SUPPLY_AT.map((s) => [s, []]));
  let wins = 0, decisions = 0, routs = 0, untouched = 0, noFlipBy3 = 0;
  for (const seed of opts.seeds) {
    const state = buildState(content, { seed, map, player: opts.player, enemy: opts.enemy });
    const t: Tracker = { firstFlip: Infinity, firstHit: { player: Infinity, enemy: Infinity }, half: { player: Infinity, enemy: Infinity }, supply: {} };
    runHeadless(state, { until: 'end', onTick: (s) => track(s, t) });
    const tr = state.rules.tickRate;
    const w = state.outcome?.winner;
    if (w === 'player') wins++;
    if (state.outcome?.by === 'decision') decisions++;
    lengths.push(state.tick / tr);
    flips.push(t.firstFlip / tr);
    if (t.firstFlip > 180 * tr) noFlipBy3++;
    for (const s of SUPPLY_AT) if (t.supply[s] !== undefined) supply[s]!.push(t.supply[s]!);
    if (w && state.outcome?.by === 'rout') {
      routs++;
      const loser: Side = w === 'player' ? 'enemy' : 'player';
      fall.push((state.tick - t.firstHit[loser]) / tr);
      fallHalf.push((state.tick - t.half[loser]) / tr);
    }
    if (w && state.sides[w].heartcapHp === state.sides[w].heartcapMaxHp) untouched++;
    const mine = state.log.filter((c) => c.side === 'player' && c.type !== 'begin');
    cmds.push(mine.length);
    cpm.push(mine.length / Math.max(1, state.tick / tr / 60));
    stance.push(mine.filter((c) => c.type === 'stance').length);
    merges.push(state.stats.player.merges['2'] + state.stats.player.merges['3'] + state.stats.enemy.merges['2'] + state.stats.enemy.merges['3']);
  }
  return {
    player: opts.player, enemy: opts.enemy, map, battles: opts.seeds.length, playerWins: wins, decisions,
    medianSeconds: median(lengths),
    firstFlipSeconds: finite(flips).length ? median(finite(flips)) : Infinity,
    noFlipBy3,
    supplyAt: Object.fromEntries(SUPPLY_AT.map((s) => [s, median(supply[s]!)])),
    fallSeconds: median(fall), fallFromHalfSeconds: median(fallHalf), routs, winnerUntouched: untouched,
    playerCommands: median(cmds), playerCommandsPerMinute: median(cpm), stanceCommands: median(stance), merges: median(merges),
  };
}

const clock = (s: number) => (Number.isFinite(s) ? `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, '0')}` : 'never');

export function engagementLines(r: EngagementRow): string[] {
  const n = r.battles;
  const pct = (x: number) => `${Math.round((100 * x) / Math.max(1, n))}%`;
  return [
    `${r.player} vs ${r.enemy} on ${r.map} (${n} seeds): player ${pct(r.playerWins)}, Decisions ${pct(r.decisions)}, median ${clock(r.medianSeconds)}`,
    `    first flip ${clock(r.firstFlipSeconds)} (none by 3:00 in ${pct(r.noFlipBy3)}); supply on field ${SUPPLY_AT.map((s) => `${clock(s)} ${r.supplyAt[s]}`).join(' · ')}`,
    `    routs ${r.routs}: Heartcap first hit → dead ${r.fallSeconds.toFixed(1)} s, half → dead ${r.fallFromHalfSeconds.toFixed(1)} s; winner untouched ${r.winnerUntouched}/${n}`,
    `    player commands ${r.playerCommands} per battle (${r.playerCommandsPerMinute.toFixed(1)}/min, stance ${r.stanceCommands}); merges ${r.merges}`,
  ];
}

export interface RunEnding { runs: number; reachedBoss: number; victories: number; endedInBattle: Record<number, number>; fullHeartcapVictories: number }

/** How runs end (`bot:balanced`, greedy drafts, random route). */
export function runEndings(content: Content, runs: number, player = 'bot:balanced'): RunEnding {
  const ended: Record<number, number> = {};
  let boss = 0, wins = 0, full = 0;
  for (let seed = 1; seed <= runs; seed++) {
    const r = simulateRun(content, seed, { player, draft: 'greedy', route: 'random' });
    if (r.reachedBoss) boss++;
    if (r.outcome === 'victory') { wins++; if (r.heartcap.hp === r.heartcap.max) full++; } else ended[r.battleCount] = (ended[r.battleCount] ?? 0) + 1;
  }
  return { runs, reachedBoss: boss, victories: wins, endedInBattle: ended, fullHeartcapVictories: full };
}
