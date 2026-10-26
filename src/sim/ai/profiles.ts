// Resolves a controller (general:<id>, bot:<id>, bot:mono:<buildingId>) into the AI state the sim
// keeps per side (SPEC §7.1). Profiles are copied into state so `step` needs no content lookups.
import type { Content } from '../../data/registry.ts';
import type { AiState, AiWeight, Controller, MergePolicy, Rules, SideConfig } from '../state.ts';

export function resolveAiProfile(content: Content, ctl: Controller, side: SideConfig, rules: Rules): AiState {
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
  const list: AiWeight[] = [];
  for (const id of content.buildingOrder) {
    const w = weights[id];
    if (w === undefined || w <= 0 || !side.kit.includes(id)) continue;
    const lim = limits[id] ?? {};
    list.push({
      building: id,
      weight: w,
      maxOwned: lim.maxOwned ?? -1,
      afterTick: Math.round((lim.afterSeconds ?? 0) * rules.tickRate),
    });
  }
  for (const id of opener) if (!side.kit.includes(id)) throw new Error(`${ctl.kind}:${ctl.id} opener uses ${id}, which is not in its kit`);
  return {
    profileId: `${ctl.kind}:${ctl.id}`,
    mergePolicy,
    opener: [...opener],
    weights: list,
    spawnerDepthWeight,
    openerDone: false,
    target: null,
    targetSince: 0,
  };
}
