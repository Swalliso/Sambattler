// Headless run autoplay (SPEC §15.2 `--run --auto-route --auto-draft`, and `?autoplay=` in the
// browser). Bots play the battles in rounds; policies answer the route, spoils, Grove, events and prompts.
// Policy randomness has its own stream, kept outside the run state, so the run state stays a
// record of decisions and game randomness only.
import type { RunEffect } from '../data/schema.ts';
import { choosePick, seedStream, nextInt } from '../sim/index.ts';
import type { Content, PowerPolicy, Rng4 } from '../sim/index.ts';
import { createBattle, hashState, runHeadless } from '../sim/rounds/index.ts';
import type { BattleState } from '../sim/rounds/index.ts';
import {
  chooseNode, eventChoose, finishBattle, groveChoose, groveProblem, outcomeAvailable, promptAnswer, spoilsPick,
} from './flow.ts';
import { battleTicks, createRun, currentRow } from './runState.ts';
import type { BattleRecord, RunOptions, RunState } from './runState.ts';

export type RoutePolicy = 'first' | 'random' | 'battles';
export type DraftAutoPolicy = 'first' | 'random' | 'greedy';

export interface AutoPolicies {
  route: RoutePolicy;
  draft: DraftAutoPolicy;
  /** Player controller for battles, e.g. `bot:balanced`. */
  player: string;
  /** How the bot uses the commander power (default none). */
  power?: PowerPolicy;
}

export interface AutoContext {
  content: Content;
  policies: AutoPolicies;
  rng: Rng4;
  weightOf: (building: string) => number;
}

export function autoContext(content: Content, seed: number, policies: AutoPolicies, commander?: string): AutoContext {
  const bot = policies.player.startsWith('bot:') ? policies.player.slice(4) : '';
  const mono = bot.match(/^mono:(.+)$/);
  const weights: Record<string, number> = mono ? { [mono[1]!]: 1 } : { ...content.bots[bot]?.weights };
  // the commander's core buildings the profile never buys count at weight 1 (as in battle, flow.ts botCoreWeights)
  if (!mono && commander) for (const id of content.commanders[commander]?.core ?? []) if (!(weights[id]! > 0)) weights[id] = 1;
  return { content, policies, rng: seedStream(seed, 'meta', 999), weightOf: (b) => weights[b] ?? 0 };
}

/** Rough value of an event outcome for the greedy policy (higher is better). */
function outcomeValue(run: RunState, outcome: readonly RunEffect[]): number {
  const missing = run.lives.max - run.lives.left;
  let v = 0;
  for (const e of outcome) {
    if ('gainLife' in e) v += 40 * Math.min(e.gainLife, missing);
    else if ('maxHpPct' in e) v += 100 * e.maxHpPct;
    else if ('gainRelic' in e) v += 12 * (e.gainRelic.count ?? 1);
    else if ('upgrade' in e) v += 8 * e.upgrade.count;
    else if ('removeBlueprint' in e) v -= 6;
    else if ('sacrificeRelic' in e) v += 4 * e.sacrificeRelic.gain - 8;
    else if ('gainAmber' in e) v += 3;
    else if ('nextBattle' in e) v += (e.nextBattle.startingGold ?? 0) / 25 + 40 * (e.nextBattle.heartcapMaxHpPct ?? 0);
  }
  return v;
}

/** Makes one decision on the current non-battle screen. */
export function autoDecide(ctx: AutoContext, run: RunState): void {
  const { content, policies, rng } = ctx;
  const s = run.screen;
  if (s.kind === 'route') {
    const row = run.route[currentRow(run)]!;
    let i = 0;
    if (policies.route === 'random') i = nextInt(rng, row.length);
    else if (policies.route === 'battles') {
      const b = row.findIndex((n) => n.kind === 'battle' || n.kind === 'boss');
      i = b >= 0 ? b : 0;
    }
    chooseNode(content, run, i);
  } else if (s.kind === 'spoils') {
    const offer = s.picks[0]!.offer;
    const pick = choosePick(offer, policies.draft, ctx.weightOf, rng);
    spoilsPick(content, run, pick.id);
  } else if (s.kind === 'grove') {
    // a life if hurt, else graft, else leave (R2-Q21)
    const choice = (['life', 'graft', 'leave'] as const).find((c) => !groveProblem(content, run, c))!;
    groveChoose(content, run, choice);
  } else if (s.kind === 'event') {
    const ev = content.events[s.event]!;
    const avail = ev.choices.map((c, i) => ({ c, i })).filter(({ c }) => outcomeAvailable(content, run, c.outcome));
    let choice = avail[0]!.i;
    if (policies.draft === 'random') choice = avail[nextInt(rng, avail.length)]!.i;
    else if (policies.draft === 'greedy') {
      let best = -Infinity;
      for (const { c, i } of avail) {
        const v = outcomeValue(run, c.outcome);
        if (v > best) { best = v; choice = i; }
      }
    }
    eventChoose(content, run, choice);
  } else if (s.kind === 'prompt') {
    const p = s.prompt;
    let opt = p.options[0]!;
    if (policies.draft === 'random') opt = p.options[nextInt(rng, p.options.length)]!;
    else if (policies.draft === 'greedy') {
      // keep what the bot builds most; give up or sacrifice what it builds least
      const w = (id: string) => (p.optionKind === 'relic' ? 0 : ctx.weightOf(id));
      const sorted = [...p.options].sort((a, b) => (p.optionKind === 'upgrade' ? w(b) - w(a) : w(a) - w(b)));
      opt = sorted[0]!;
    }
    promptAnswer(content, run, opt);
  } else {
    throw new Error(`autoDecide: nothing to decide on the ${s.kind} screen`);
  }
}

export interface RunBattleResult { state: BattleState; record: BattleRecord; hashes: Record<string, string> }

/**
 * Plays the current battle node to the end with bots and applies it to the run. A player-side bot plans and
 * begins each round's clash itself (§14.6), so nothing is queued for it.
 */
export function autoBattle(content: Content, run: RunState, hashEvery?: number): RunBattleResult {
  if (run.screen.kind !== 'battle') throw new Error('no battle to play');
  const state = createBattle(content, run.screen.config);
  const res = runHeadless(state, { until: 'end', ...(hashEvery ? { hashEvery } : {}) });
  const record = finishBattle(content, run, state);
  return { state, record, hashes: { ...res.hashes, final: hashState(state) } };
}

export interface RunResult {
  seed: number;
  /** `incomplete` when `maxBattles` stopped the run early. */
  outcome: 'victory' | 'defeat' | 'incomplete';
  battles: BattleRecord[];
  battleCount: number;
  /** Clash ticks over every battle's rounds. */
  totalBattleTicks: number;
  reachedBoss: boolean;
  lives: { left: number; max: number };
  spores: number;
  amber: number;
  xp: number;
  cards: RunState['cards'];
  kit: string[];
  relics: string[];
  upgrades: Record<string, number>;
  /** Per battle: checkpoint hashes (each phase's, and every `hashEvery` ticks of each clash) and the final hash. */
  hashes: Record<string, string>[];
  run: RunState;
}

export interface SimulateOptions extends Partial<RunOptions> {
  hashEvery?: number;
  /** Stop after this many battles (the browser's `autoplay=battles:<n>`). */
  maxBattles?: number;
  onBattle?: (r: RunBattleResult) => void;
}

/** Plays a whole run (or its first `maxBattles` battles) with the given policies. */
export function simulateRun(content: Content, seed: number, policies: AutoPolicies, opts: SimulateOptions = {}): RunResult {
  const run = createRun(content, {
    seed, player: policies.player, autoDraft: policies.draft, ...(opts.commander ? { commander: opts.commander } : {}), ...(opts.flags ? { flags: opts.flags } : {}),
    ...(opts.bans ? { bans: opts.bans } : {}), ...(policies.power ? { powerPolicy: policies.power } : {}),
  });
  const ctx = autoContext(content, seed, policies, run.commander);
  const hashes: Record<string, string>[] = [];
  for (let guard = 0; !run.outcome && guard < 200; guard++) {
    if (run.screen.kind === 'battle') {
      if (opts.maxBattles !== undefined && run.battles.length >= opts.maxBattles) break;
      const r = autoBattle(content, run, opts.hashEvery);
      hashes.push(r.hashes);
      opts.onBattle?.(r);
    } else if (run.screen.kind === 'summary') {
      break;
    } else {
      if (run.screen.kind === 'route' && opts.maxBattles !== undefined && run.battles.length >= opts.maxBattles) break;
      autoDecide(ctx, run);
    }
  }
  return {
    seed, outcome: run.outcome ?? 'incomplete', battles: run.battles, battleCount: run.battles.length, totalBattleTicks: battleTicks(run),
    reachedBoss: run.battles.some((b) => b.kind === 'boss'), lives: { ...run.lives },
    spores: run.spores, amber: run.amber, xp: run.xp, cards: run.cards, kit: run.kit, relics: run.relics, upgrades: run.upgrades,
    hashes, run,
  };
}
