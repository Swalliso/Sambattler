// The AI profiles in rounds (SPEC §7.1, §7.2, §7.9, §11.11): a controller (general:<id>, bot:<id> or
// bot:mono:<buildingId>) resolved from `data/generals.json` or `data/bots.json` into the profile a side's AI
// state keeps, so planning needs no content. A single battle's general and every bot buy only the cards
// their weights list (R2-Q4, A045), which is what `fixedWeights` asks of the counter check's test bots, so
// rounds needn't read it. Their data limits stay, read by round through `afterRound` (R2-Q6, A044). v1's
// `placement` knob means nothing under plots and is ignored: `bot:rush` and `bot:turtle` are weight
// profiles. An adaptive general, with `flags.adaptiveGeneral` on, also gets its counter cycle (§7.4, §7.6). It
// stands beside v1's `src/sim/ai/profiles.ts` until R2b moves it there.
import type { Content } from '../../../data/registry.ts';
import type { GeneralDef } from '../../../data/schema.ts';
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
  let limits: Limits = {};
  let aggressive = false, adaptive = false, boss = false;
  const mono = ctl.kind === 'bot' ? /^mono:(.+)$/.exec(ctl.id) : null;
  if (ctl.kind === 'general') {
    const g = content.generals[ctl.id];
    if (!g) throw new Error(`unknown general ${ctl.id}`);
    ({ opener, weights } = g);
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
  }
  const kit = new Set(side.kit.map((c) => c.building));
  // by building id, so the weighted pick's order never rests on the data's key order
  const list = Object.entries({ ...weights, ...side.aiWeights })
    .filter(([id, w]) => w > 0 && kit.has(id))
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([building, weight]): AiWeight => {
      const { maxOwned, afterRound } = limits[building] ?? {};
      return { building, weight, ...(maxOwned !== undefined ? { maxOwned } : {}), ...(afterRound !== undefined ? { afterRound } : {}) };
    });
  return {
    profileId: `${ctl.kind}:${ctl.id}`,
    opener: opener.filter((id) => kit.has(id)),
    weights: list,
    mergePolicy,
    ...(aggressive ? { laneStyle: 'aggressive' as const } : {}),
    plans: [],
    ...(adaptive && flags?.adaptiveGeneral ? { counter: newCounterState(content.balance.rounds.ai.counter, boss, side.intel) } : {}),
  };
}
