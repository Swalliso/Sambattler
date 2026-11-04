// The AI profiles in rounds (SPEC §7.1, §7.2, §7.9, §11.11): a controller (general:<id>, bot:<id> or
// bot:mono:<buildingId>) resolved from `data/generals.json` or `data/bots.json` into the profile a side's AI
// state keeps, so planning needs no content. A single battle's general and every bot buy only the cards their
// weights list (R2-Q4, A045), which is what `fixedWeights` asks of the counter check's test bots, so rounds
// needn't read it. Their data limits stay, read by round through `afterRound` (R2-Q6, A044). v1's `placement`
// knob means nothing under plots and is ignored: `bot:rush` and `bot:turtle` are weight profiles. An adaptive
// general, with `flags.adaptiveGeneral` on, also gets its counter cycle (§7.4, §7.6), and a bot with `policy:
// "answer"` leans toward the answer to the general's army (§12.2, X7). A side that drafts keeps its weights for
// its pool's buildings outside the kit, which its drafts read (§8.3). A general with several openers keeps those
// its kit holds whole, for its round-1 plan to draw one (§7.7, #69).
import type { Content } from '../../data/registry.ts';
import type { GeneralDef } from '../../data/schema.ts';
import type { AiState, AiWeight, BattleConfig, Controller, MergePolicy, SideConfig } from '../state.ts';
import { newCounterState } from './counter.ts';

type Limits = NonNullable<GeneralDef['limits']>;

/**
 * The AI state a side starts a battle with (§7.1): its profile, with no target and no plans yet. Given the
 * battle's `flags`, an adaptive general or bot runs the counter cycle when `adaptiveGeneral` is on.
 */
export function resolveProfile(content: Content, ctl: Controller, side: SideConfig, flags?: BattleConfig['flags']): AiState {
  if (ctl.kind === 'human') throw new Error('a human has no AI profile');
  let opener: string[], weights: Record<string, number>, mergePolicy: MergePolicy;
  let openers: string[][] = [];
  let limits: Limits = {};
  let aggressive = false, adaptive = false, boss = false, answer = false;
  const mono = ctl.kind === 'bot' ? /^mono:(.+)$/.exec(ctl.id) : null;
  if (ctl.kind === 'general') {
    const g = content.generals[ctl.id];
    if (!g) throw new Error(`unknown general ${ctl.id}`);
    ({ opener, weights } = g);
    openers = [g.opener, ...(g.moreOpeners ?? [])];
    limits = g.limits ?? {};
    mergePolicy = g.mergePolicy ?? 'auto';
    aggressive = g.laneStyle === 'aggressive';
    adaptive = !!g.adaptive;
    boss = !!g.boss;
  } else if (mono) {
    // it opens with as many as its gold buys, then refills each round
    const id = mono[1]!;
    const b = content.buildings[id];
    if (!b) throw new Error(`unknown building for bot:${ctl.id}`);
    opener = Array.from({ length: Math.floor(side.startingGold / b.cost) }, () => id);
    weights = { [id]: 1 };
    mergePolicy = 'on';
  } else {
    const bot = content.bots[ctl.id];
    if (!bot) throw new Error(`unknown bot ${ctl.id}`);
    ({ opener, weights, mergePolicy } = bot);
    limits = bot.limits ?? {};
    adaptive = !!bot.adaptive;
    answer = bot.policy === 'answer';
  }
  const kit = new Set(side.kit.map((c) => c.building));
  const pool = new Set(flags?.drafts && ctl.kind !== 'general' && side.draft ? [...side.draft.core, ...side.draft.shared] : []);
  // by building id, so the weighted pick's order never rests on the data's key order
  const all = Object.entries({ ...weights, ...side.aiWeights })
    .filter(([id, w]) => w > 0 && (kit.has(id) || pool.has(id)))
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([building, weight]): AiWeight => {
      const { maxOwned, afterRound } = limits[building] ?? {};
      return { building, weight, ...(maxOwned !== undefined ? { maxOwned } : {}), ...(afterRound !== undefined ? { afterRound } : {}) };
    });
  const list = all.filter((w) => kit.has(w.building)), drafts = all.filter((w) => !kit.has(w.building));
  // a general's openers whose cards its kit holds, one drawn in its round-1 plan (§7.7, #69)
  const fit = openers.filter((o) => o.every((id) => kit.has(id)));
  return {
    profileId: `${ctl.kind}:${ctl.id}`,
    opener: fit[0] ?? opener.filter((id) => kit.has(id)),
    ...(fit.length > 1 ? { openers: fit } : {}),
    weights: list,
    mergePolicy,
    ...(aggressive ? { laneStyle: 'aggressive' as const } : {}),
    ...(answer ? { policy: 'answer' as const } : {}),
    plans: [],
    ...(drafts.length ? { pool: drafts } : {}),
    ...(adaptive && flags?.adaptiveGeneral ? { counter: newCounterState(content.balance.ai.counter, boss, side.intel) } : {}),
  };
}
