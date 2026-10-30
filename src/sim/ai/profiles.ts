// Resolves a controller (general:<id>, bot:<id>, bot:mono:<buildingId>) into the AI state the sim
// keeps per side (SPEC §7.1). Profiles are copied into state so `step` needs no content lookups. An
// adaptive general with `flags.adaptiveGeneral` on also gets its counter cycle, counter sets and the
// opening doctrine its intel gives (SPEC §7.4, §7.6).
import type { Content } from '../../data/registry.ts';
import type { AiState, AiWeight, BattleConfig, Controller, Library, MergePolicy, Rules, SideConfig } from '../state.ts';
import { counterSets, newCounterState, openingDoctrine } from './counter.ts';

/** Does this controller run the counter cycle in a battle with these flags? */
export function isAdaptive(content: Content, ctl: Controller, flags: BattleConfig['flags']): boolean {
  if (!flags.adaptiveGeneral || ctl.kind === 'human') return false;
  return ctl.kind === 'general' ? !!content.generals[ctl.id]?.adaptive : !!content.bots[ctl.id]?.adaptive;
}

/** The roster an adaptive side drafts missing counters from (its faction's buildings). */
export function adaptiveRoster(content: Content, side: SideConfig): string[] {
  const g = side.controller.kind === 'general' ? content.generals[side.controller.id] : undefined;
  return [...(content.factions[g?.faction ?? side.faction]?.buildings ?? [])];
}

/**
 * `available` is every building the side could own this battle (its kit plus its draft pool): the
 * weights keep those, and the AI only buys what is in its kit at the time.
 */
export function resolveAiProfile(
  content: Content, ctl: Controller, side: SideConfig, rules: Rules, available: ReadonlySet<string>,
  flags: BattleConfig['flags'], lib: Library,
): AiState {
  if (ctl.kind === 'human') throw new Error('humans have no AI profile');
  let opener: string[];
  let weights: Record<string, number>;
  let limits: Record<string, { maxOwned?: number; afterSeconds?: number }> = {};
  let spawnerDepthWeight = rules.ai.score.spawnerDepth;
  let mergePolicy: MergePolicy = 'on';
  const mono = ctl.kind === 'bot' ? ctl.id.match(/^mono:(.+)$/) : null;
  if (ctl.kind === 'general') {
    const g = content.generals[ctl.id];
    if (!g) throw new Error(`unknown general ${ctl.id}`);
    opener = g.opener; weights = g.weights; limits = g.limits ?? {};
    mergePolicy = g.mergePolicy ?? 'auto';
  } else if (mono) {
    const id = mono[1]!;
    const b = content.buildings[id];
    if (!b) throw new Error(`unknown building for ${ctl.id}`);
    opener = [];
    for (let spent = b.cost; spent <= side.startingGold; spent += b.cost) opener.push(id);
    weights = { [id]: 1 };
  } else {
    const bot = content.bots[ctl.id];
    if (!bot) throw new Error(`unknown bot ${ctl.id}`);
    opener = bot.opener; weights = bot.weights; limits = bot.limits ?? {};
    mergePolicy = bot.mergePolicy;
    if (bot.placement?.spawnerDepthWeight !== undefined) spawnerDepthWeight = bot.placement.spawnerDepthWeight;
  }
  if (side.aiWeights) weights = { ...weights, ...side.aiWeights };
  // prototype content (the combat rework's Rhizomorph): a building with an `aiWeight` joins every
  // profile that doesn't list it, except a mono bot's
  if (!mono) {
    for (const id of content.buildingOrder) {
      const w = content.buildings[id]!.aiWeight;
      if (w !== undefined && weights[id] === undefined) weights = { ...weights, [id]: w };
    }
  }
  const list: AiWeight[] = [];
  for (const id of content.buildingOrder) {
    const w = weights[id];
    if (w === undefined || w <= 0 || !available.has(id)) continue;
    const lim = limits[id] ?? {};
    list.push({
      building: id,
      weight: w,
      maxOwned: lim.maxOwned ?? -1,
      afterTick: Math.round((lim.afterSeconds ?? 0) * rules.tickRate),
    });
  }
  // a bot playing a run's kit (a commander's starter, SPEC §11.10) skips opener buildings it doesn't own;
  // a general's opener must fit its kit
  if (ctl.kind === 'bot') opener = opener.filter((id) => side.kit.includes(id));
  for (const id of opener) if (!side.kit.includes(id)) throw new Error(`${ctl.kind}:${ctl.id} opener uses ${id}, which is not in its kit`);
  const ai: AiState = {
    profileId: `${ctl.kind}:${ctl.id}`,
    mergePolicy,
    opener: [...opener],
    weights: list,
    spawnerDepthWeight,
    openerDone: false,
    target: null,
    targetSince: 0,
    draftPolicy: side.autoDraft ?? 'greedy',
  };
  const general = ctl.kind === 'general' ? content.generals[ctl.id] : undefined;
  if (general?.laneStyle === 'aggressive') ai.laneStyle = 'aggressive';
  if (isAdaptive(content, ctl, flags)) {
    const boss = !!general?.boss;
    const roster = adaptiveRoster(content, side);
    ai.roster = roster;
    ai.counterSets = counterSets(lib, roster);
    ai.counter = newCounterState(rules, boss);
    if (boss) ai.boss = true;
    const opening = openingDoctrine(rules, side.intel, boss);
    if (opening) ai.opening = opening;
  }
  return ai;
}
