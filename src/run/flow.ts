// The run's state machine (SPEC §8): choosing route nodes, building each battle's config, applying a
// finished battle (Heartcap carryover, rewards, spoils), the Grove, events and the prompts they
// raise. Every transition is a pure function of (run, content, decision); randomness comes only from
// the run's streams. Battles themselves run in the sim; the run only sees their final state.
import type { RunEffect } from '../data/schema.ts';
import {
  POWER_SOURCE_ID, RARITIES, applyCard, buildLibrary, counterSets, draftPool, generateOffer, hashState, nextFloat, nextInt, parseCard,
  parseController, seedStream, setCommander, sideModifiers, topKinds,
} from '../sim/index.ts';
import type {
  BattleConfig, BattleModifier, BattleState, Content, DraftPool, IntelProfile, Library, Loadout, Rarity, SideConfig,
} from '../sim/index.ts';
import { averageProfile, battleProfile, scaleProfile, updateIntel } from './intel.ts';
import { battleRewards } from './rewards.ts';
import { isBattle } from './route.ts';
import type { RouteNode } from './route.ts';
import { currentRow } from './runState.ts';
import type { BattleRecord, Prompt, RunState, SpoilsPick } from './runState.ts';

// ---- pools and loadouts ----

export function runPool(content: Content, run: RunState): DraftPool {
  return draftPool(content, run.faction, run.commander, run.flags, run.bans);
}

/** A library covering the run's kit and everything its pool can offer (for spoils offers). */
export function runLibrary(content: Content, run: RunState): Library {
  const pool = runPool(content, run);
  return buildLibrary(content, new Set([...run.kit, ...pool.core, ...pool.shared]), new Set([...run.relics, ...pool.relics]));
}

export const loadoutOf = (run: RunState): Loadout => ({ kit: run.kit, upgrades: run.upgrades, relics: run.relics });

/** Kit buildings whose upgrade track has a level left (`ownedOnly`: only tracks already started). */
export function upgradeable(content: Content, run: RunState, ownedOnly = false): string[] {
  return run.kit.filter((id) => {
    const t = content.upgrades[id];
    const lvl = run.upgrades[id] ?? 0;
    return !!t && lvl < t.levels.length && (!ownedOnly || lvl > 0);
  });
}

/** Blueprints the player may give up: anything outside the commander's starter kit. */
export function nonStarter(content: Content, run: RunState): string[] {
  const starter = content.commanders[run.commander]!.starter;
  return run.kit.filter((id) => !starter.includes(id));
}

// ---- route ----

export function nodeAt(run: RunState, row: number, index: number): RouteNode | undefined {
  return run.route[row]?.[index];
}

/** Picks a node in the current row (SPEC §8.2) and moves to its screen. */
export function chooseNode(content: Content, run: RunState, index: number): void {
  if (run.screen.kind !== 'route' || run.outcome) throw new Error('not on the route map');
  const row = currentRow(run);
  const node = nodeAt(run, row, index);
  if (!node) throw new Error(`row ${row + 1} has no node ${index}`);
  run.path.push(index);
  if (isBattle(node)) run.screen = { kind: 'battle', config: battleConfig(content, run, node) };
  else if (node.kind === 'event') run.screen = { kind: 'event', event: node.event! };
  else run.screen = { kind: 'grove' };
}

/** The battle a node starts (SPEC §6.1, §7.7–7.8, §8.5): fixed when the node is entered. */
export function battleConfig(content: Content, run: RunState, node: RouteNode): BattleConfig {
  const bal = content.balance;
  const index = run.battles.length + 1;
  const gold = bal.startingGold + bal.startingGoldPerBattle * (index - 1);
  const enemyFaction = 'gray-rot';
  const { kit: enemyKit, upgrades: enemyUpgrades } = generalKit(content, run, node, index);
  const enemyHp = node.kind === 'boss' ? bal.heartcapEnemyHp.boss : bal.heartcapEnemyHp.base + bal.heartcapEnemyHp.perBattle * (index - 1);
  const player: SideConfig = {
    faction: run.faction,
    controller: parseController(run.player),
    kit: [...run.kit],
    upgrades: { ...run.upgrades },
    relics: [...run.relics],
    heartcapHp: run.heartcap.hp,
    heartcapMaxHp: run.heartcap.max,
    startingGold: Math.max(0, gold + run.next.startingGold),
    draft: runPool(content, run),
  };
  if (run.player !== 'human') player.autoDraft = run.autoDraft;
  setCommander(content, player, run.commander);
  if (run.player !== 'human') {
    if (run.powerPolicy) player.powerPolicy = run.powerPolicy;
    const extra = botCoreWeights(content, run);
    if (Object.keys(extra).length) player.aiWeights = extra;
  }
  const enemy: SideConfig = {
    faction: enemyFaction,
    controller: { kind: 'general', id: node.general ?? 'scripted' },
    kit: enemyKit,
    heartcapHp: enemyHp,
    heartcapMaxHp: enemyHp,
    startingGold: gold,
  };
  const intel = generalIntel(content, run, node);
  if (intel) enemy.intel = intel;
  // Run progression may introduce buildings the historical single-battle profile never bought.
  // Give only those kit entries a purchase path, leaving the base profile and its replays intact.
  const generalWeights = content.generals[node.general ?? 'scripted']!.weights;
  const extraWeights = Object.fromEntries(enemyKit.filter((id) => !(generalWeights[id]! > 0)).map((id) => [id, 1]));
  if (Object.keys(extraWeights).length) enemy.aiWeights = extraWeights;
  if (Object.keys(enemyUpgrades).length) enemy.upgrades = enemyUpgrades;
  const modifiers: BattleModifier[] = sideModifiers(content, { player, enemy });
  const elite = node.elite ? content.elites[node.elite] : undefined;
  if (elite?.effects) modifiers.push({ side: 'enemy', source: `elite:${elite.id}`, effects: elite.effects });
  // hot-start prototype (absent by default): effects for the run's first battles, such as a gentler battle 1
  const hot = bal.hotStart?.battles?.[index - 1];
  if (hot?.player) modifiers.push({ side: 'player', source: 'proto:hotStart', effects: hot.player });
  if (hot?.enemy) modifiers.push({ side: 'enemy', source: 'proto:hotStart', effects: hot.enemy });
  if (run.next.sporestormShiftSeconds) {
    modifiers.push({ side: 'both', source: 'event:next-battle', effects: { modifiers: [{ stat: 'battle.sporestormStart', op: 'add', value: run.next.sporestormShiftSeconds }] } });
  }
  const config: BattleConfig = {
    seed: run.seed, battleIndex: index, mapId: node.map!, player, enemy, flags: { ...run.flags },
  };
  if (modifiers.length) config.modifiers = modifiers;
  return config;
}

/**
 * A bot player's purchase weights for its commander's core buildings that its profile never buys
 * (weight 1), so it drafts and builds them as a general does its run-only kit entries. Empty for a
 * human player.
 */
export function botCoreWeights(content: Content, run: RunState): Record<string, number> {
  const bot = run.player.startsWith('bot:') ? run.player.slice(4) : '';
  if (!bot || bot.startsWith('mono:')) return {};
  const weights = content.bots[bot]?.weights ?? {};
  return Object.fromEntries(content.commanders[run.commander]!.core.filter((id) => !(weights[id]! > 0)).map((id) => [id, 1]));
}

/**
 * What the general knows going into a battle (SPEC §7.6): the run's intel file, or for the boss the
 * unweighted average of every battle's profile. None without the adaptive flag or an adaptive general.
 */
export function generalIntel(content: Content, run: RunState, node: RouteNode): IntelProfile | null {
  const g = content.generals[node.general ?? 'scripted'];
  if (!run.flags.adaptiveGeneral || !g?.adaptive) return null;
  return g.boss ? averageProfile(run.profiles ?? []) : run.intel ?? null;
}

/**
 * The general's kit for a battle (SPEC §7.8): its opener buildings plus (i − 1) blueprints from its
 * preferred list and (i − 1) random upgrade levels on units in its kit; an elite adds a level, the
 * boss fields 7 buildings and 4 levels, and the Veteran modifier adds a level on every unit track.
 * The random levels come from the `ai` stream, sub-seeded per battle index so they don't depend on
 * the path taken. A general without a preferred list fields its whole faction roster.
 */
export function generalKit(content: Content, run: RunState, node: RouteNode, index: number): { kit: string[]; upgrades: Record<string, number> } {
  const rules = content.balance.enemyKit;
  const g = content.generals[node.general ?? 'scripted']!;
  const roster = content.factions[g.faction]?.buildings ?? [];
  const boss = node.kind === 'boss';
  let kit: string[];
  if (!g.preferred) kit = [...roster];
  else {
    kit = [...new Set(g.opener)];
    const size = boss ? rules.bossBuildings : kit.length + rules.blueprintsPerBattle * (index - 1);
    for (const id of [...bossCounters(content, run, node, roster), ...g.preferred]) {
      if (kit.length >= size) break;
      if (!kit.includes(id) && roster.includes(id)) kit.push(id);
    }
  }
  const upgrades: Record<string, number> = {};
  const tracks = () => kit.filter((id) => content.buildings[id]!.spawn && content.upgrades[id] && (upgrades[id] ?? 0) < 3);
  const levels = boss ? rules.bossUpgrades : rules.upgradesPerBattle * (index - 1) + (node.kind === 'elite' ? rules.eliteUpgrades : 0);
  const rng = seedStream(run.seed, 'ai', 1000 + index);
  for (let k = 0; k < levels; k++) {
    const t = tracks();
    if (!t.length) break;
    const id = t[nextInt(rng, t.length)]!;
    upgrades[id] = (upgrades[id] ?? 0) + 1;
  }
  const veteran = node.elite ? content.elites[node.elite]?.upgradeLevels ?? 0 : 0;
  if (veteran) for (const id of kit) if (content.buildings[id]!.spawn && content.upgrades[id]) upgrades[id] = Math.min(3, (upgrades[id] ?? 0) + veteran);
  return { kit, upgrades };
}

/**
 * The boss's first extra blueprints: the cheapest counters to the run's top two intel kinds, so its
 * dual doctrine has buildings to lean on (empty for other generals or without intel).
 */
function bossCounters(content: Content, run: RunState, node: RouteNode, roster: readonly string[]): string[] {
  const intel = node.kind === 'boss' ? generalIntel(content, run, node) : null;
  if (!intel) return [];
  const lib = buildLibrary(content, roster, []);
  const sets = counterSets(lib, roster);
  const out: string[] = [];
  for (const k of topKinds(intel, 2)) {
    const cheapest = [...sets[k]].sort((a, b) => content.buildings[a]!.cost - content.buildings[b]!.cost)[0];
    if (cheapest && !out.includes(cheapest)) out.push(cheapest);
  }
  return out;
}

// ---- after a battle ----

const rewardRules = (content: Content) => ({
  routRepair: content.balance.routRepair,
  decisionLossDamage: content.balance.decisionLossDamage,
  rarityBiasStep: content.balance.draft.rarityBiasStep,
  eliteRareBonus: content.balance.draft.eliteRareBonus,
});

/** Per lane, the front-line midpoint every 10 s (the summary sparkline). */
function frontSamples(state: BattleState): number[][] {
  return state.frontLine.map((series) => series
    .filter(([t], i) => i === series.length - 1 || t % (state.rules.tickRate * 10) === 0)
    .map(([, p, e]) => (p + e) / 2));
}

/**
 * Applies a finished battle: the loadout it ended with (in-battle drafts), Heartcap carryover and
 * the §6.5 adjustment, Spores, Amber and XP, then spoils, the next route row or the summary.
 */
export function finishBattle(content: Content, run: RunState, state: BattleState): BattleRecord {
  if (run.screen.kind !== 'battle') throw new Error('no battle in progress');
  if (!state.outcome) throw new Error('the battle has not ended');
  const row = currentRow(run) - 1;
  const node = nodeAt(run, row, run.path[row]!)!;
  const { winner, by } = state.outcome;
  const ps = state.sides.player;
  run.kit = [...ps.kit];
  run.upgrades = { ...ps.upgrades };
  run.relics = [...ps.relics];
  for (const card of state.stats.player.drafted) run.cards.push({ card, source: `battle ${run.battles.length + 1}` });
  const before = run.heartcap.hp;
  const r = battleRewards(node.kind, winner, by, rewardRules(content));
  let hp = Math.max(0, Math.min(run.heartcap.max, ps.heartcapHp));
  if (r.heartcapZero) hp = 0;
  else if (r.heartcapPct) hp = Math.max(0, Math.min(run.heartcap.max, hp + Math.round(run.heartcap.max * r.heartcapPct)));
  run.heartcap.hp = hp;
  let amber = r.amber;
  if (r.amberChance > 0 && nextFloat(run.rng.meta) < r.amberChance) amber++;
  run.spores += r.spores;
  run.amber += amber;
  run.xp += r.spores + (winner === 'player' ? 25 : 0);
  run.next = { startingGold: 0, sporestormShiftSeconds: 0 };
  const damage: Record<string, number> = {};
  for (const [id, dmg] of Object.entries(state.stats.player.damageByBuilding)) {
    const type = id === '0' ? 'turret' : id === String(POWER_SOURCE_ID) ? 'power' : state.stats.player.buildingTypes[id] ?? 'unknown';
    damage[type] = (damage[type] ?? 0) + dmg;
  }
  const map = content.maps[state.config.mapId]!;
  const record: BattleRecord = {
    index: run.battles.length + 1, row, kind: node.kind, map: map.id, mapName: map.name, lanes: map.lanes.length,
    general: node.general ?? 'scripted', winner, by, durationTicks: state.tick, finalHash: hashState(state),
    heartcapBefore: before, heartcapAfter: hp, front: frontSamples(state), mapWidth: map.width,
    damageByBuilding: damage, drafted: [...state.stats.player.drafted], spores: r.spores,
  };
  if (node.elite) record.elite = node.elite;
  const ai = state.sides.enemy.ai;
  if (ai?.opening) record.opening = { kinds: [...ai.opening.kinds], dual: ai.opening.dual };
  if (ai?.counter) {
    record.counters = ai.counter.history.map((c) => ({
      kind: c.kind, warnedAt: c.warnedAt, activeAt: c.activeAt, active: c.active, ...(c.drafted ? { drafted: c.drafted } : {}),
      sold: [...c.sold], built: { ...c.built },
    }));
  }
  const profile = battleProfile(state);
  if (profile) {
    record.profile = profile;
    run.intel = updateIntel(run.intel, profile, content.balance.ai.counter.intelKeep);
    run.profiles = [...(run.profiles ?? []), profile];
  }
  run.battles.push(record);
  if (winner !== 'player' && (hp <= 0 || node.kind === 'boss')) {
    endRun(run, 'defeat');
  } else if (node.kind === 'boss') {
    endRun(run, 'victory');
  } else if (r.spoils.length) {
    run.screen = { kind: 'spoils', picks: [] };
    for (const sp of r.spoils) {
      run.screen.picks.push({
        label: sp.label, offer: [], freeRerolls: sp.freeRerolls, cards: sp.cards, rareBonus: sp.rareBonus,
        relicsOnly: sp.relicsOnly, battleIndex: record.index,
      });
    }
    dealSpoils(content, run);
  } else {
    run.screen = { kind: 'route' };
  }
  return record;
}

function endRun(run: RunState, outcome: 'victory' | 'defeat'): void {
  run.outcome = outcome;
  run.screen = { kind: 'summary' };
}

// ---- spoils ----

function offerFor(content: Content, run: RunState, p: SpoilsPick) {
  const opts = { cards: p.cards, battleIndex: p.battleIndex, rareBonus: p.rareBonus, ...(p.relicsOnly ? { types: ['relic'] as const } : {}) };
  return generateOffer(runLibrary(content, run), runPool(content, run), loadoutOf(run), opts, run.rng.draft);
}

/** Deals the current spoils pick's offer; skips picks with nothing to offer. */
function dealSpoils(content: Content, run: RunState): void {
  while (run.screen.kind === 'spoils') {
    const p = run.screen.picks[0];
    if (!p) { run.screen = { kind: 'route' }; return; }
    if (!p.offer.length) p.offer = offerFor(content, run, p);
    if (p.offer.length) return;
    run.screen.picks.shift();
  }
}

/** Takes a card from the current spoils offer (or skips it with null). */
export function spoilsPick(content: Content, run: RunState, card: string | null): void {
  if (run.screen.kind !== 'spoils') throw new Error('no spoils to pick');
  const p = run.screen.picks[0]!;
  if (card !== null) {
    if (!p.offer.some((c) => c.id === card)) throw new Error(`${card} is not in the offer`);
    applyCard(loadoutOf(run), card);
    run.cards.push({ card, source: p.label === 'Spoils' ? `spoils ${p.battleIndex}` : `elite ${p.battleIndex}` });
  }
  run.screen.picks.shift();
  dealSpoils(content, run);
}

/** Spends a free reroll on the current spoils offer. */
export function spoilsReroll(content: Content, run: RunState): void {
  if (run.screen.kind !== 'spoils') throw new Error('no spoils to reroll');
  const p = run.screen.picks[0]!;
  if (p.freeRerolls <= 0) throw new Error('no rerolls left');
  p.freeRerolls--;
  const next = offerFor(content, run, p);
  if (next.length) p.offer = next;
}

// ---- Grove and events ----

/** The Grove (SPEC §8.7): repair 30% of max HP, or graft +1 level onto a track you own. */
export function groveChoose(content: Content, run: RunState, choice: 'repair' | 'graft'): void {
  if (run.screen.kind !== 'grove') throw new Error('not at a Grove');
  if (choice === 'repair') {
    repair(run, content.balance.groveRepair);
    run.screen = { kind: 'route' };
    return;
  }
  if (!upgradeable(content, run).length) throw new Error('nothing to graft');
  run.pending = [{ upgrade: { count: 1, pick: 'choose' } }];
  resolvePending(content, run, 'Grove');
}

function repair(run: RunState, pct: number): void {
  run.heartcap.hp = Math.min(run.heartcap.max, run.heartcap.hp + Math.round(run.heartcap.max * pct));
}

const withoutBlueprint = (run: RunState, id: string): RunState => ({ ...run, kit: run.kit.filter((b) => b !== id) });
const withUpgrade = (run: RunState, id: string): RunState => ({ ...run, upgrades: { ...run.upgrades, [id]: (run.upgrades[id] ?? 0) + 1 } });
const withoutRelic = (run: RunState, id: string): RunState => ({ ...run, relics: run.relics.filter((r) => r !== id) });

function sacrificeRarity(content: Content, id: string, shift: number): Rarity {
  return RARITIES[Math.max(0, RARITIES.indexOf(content.relics[id]!.rarity) + shift)]!;
}

/** Remaining effects after one chosen upgrade level. */
function afterUpgrade(e: Extract<RunEffect, { upgrade: unknown }>, rest: readonly RunEffect[]): readonly RunEffect[] {
  return e.upgrade.count > 1 ? [{ upgrade: { ...e.upgrade, count: e.upgrade.count - 1 } }, ...rest] : rest;
}

/** A resource-only preview. Choosing a representative relic never advances an RNG stream. */
function previewRelics(content: Content, run: RunState, count: number, rarity?: Rarity): RunState | null {
  let preview = run;
  for (let i = 0; i < count; i++) {
    const id = relicCandidates(content, preview, rarity)[0];
    if (!id) return null;
    preview = { ...preview, relics: [...preview.relics, id] };
  }
  return preview;
}

/** Prompt options that leave enough resources to pay the entire remaining outcome. */
function outcomeOptions(content: Content, run: RunState, outcome: readonly RunEffect[]): string[] {
  const [e, ...rest] = outcome;
  if (!e) return [];
  if ('removeBlueprint' in e) {
    return nonStarter(content, run).filter((id) => outcomeAvailable(content, withoutBlueprint(run, id), rest));
  }
  if ('upgrade' in e) {
    const options = upgradeable(content, run, e.upgrade.ownedOnly);
    const slots = options.reduce((n, id) => n + content.upgrades[id]!.levels.length - (run.upgrades[id] ?? 0), 0);
    if (slots < e.upgrade.count) return [];
    return options.filter((id) => outcomeAvailable(content, withUpgrade(run, id), afterUpgrade(e, rest)));
  }
  if ('sacrificeRelic' in e) {
    return run.relics.filter((id) => {
      const preview = previewRelics(content, withoutRelic(run, id), e.sacrificeRelic.gain, sacrificeRarity(content, id, e.sacrificeRelic.rarityShift));
      return preview !== null && outcomeAvailable(content, preview, rest);
    });
  }
  return [];
}

/** Can every promised effect resolve, including the rewards after a blueprint or relic is removed? */
export function outcomeAvailable(content: Content, run: RunState, outcome: readonly RunEffect[]): boolean {
  const [e, ...rest] = outcome;
  if (!e) return true;
  if ('removeBlueprint' in e || 'upgrade' in e || 'sacrificeRelic' in e) return outcomeOptions(content, run, outcome).length > 0;
  if ('gainRelic' in e) {
    const preview = previewRelics(content, run, e.gainRelic.count ?? 1, e.gainRelic.rarity);
    return preview !== null && outcomeAvailable(content, preview, rest);
  }
  return outcomeAvailable(content, run, rest);
}

export function eventChoose(content: Content, run: RunState, choice: number): void {
  if (run.screen.kind !== 'event') throw new Error('not at an event');
  const ev = content.events[run.screen.event]!;
  const c = ev.choices[choice];
  if (!c) throw new Error(`event ${ev.id} has no choice ${choice}`);
  if (!outcomeAvailable(content, run, c.outcome)) throw new Error(`"${c.label}" is not available`);
  run.pending = [...c.outcome];
  resolvePending(content, run, ev.title);
}

/** Recover legacy choices whose rewards are no longer feasible, preserving already-paid progress. */
export function recoverPendingChoice(content: Content, run: RunState): string | null {
  if (run.screen.kind !== 'prompt') return null;
  const prompt = run.screen.prompt;
  const e = run.pending[0];
  if (e && ('removeBlueprint' in e || 'sacrificeRelic' in e)) {
    const options = outcomeOptions(content, run, run.pending);
    if (options.length) {
      if (options.length === prompt.options.length && options.every((id, i) => id === prompt.options[i])) return null;
      run.screen = { kind: 'prompt', prompt: { ...prompt, options } };
      return 'Some saved trade options can no longer deliver their full reward. Choose an available option; no items have been spent.';
    }
    // In the current events the blueprint/relic prompt precedes its cost. Returning to the event
    // lets the player decline an impossible trade without discarding their run or charging them.
    const row = currentRow(run) - 1;
    const node = nodeAt(run, row, run.path[row]!);
    const event = node?.kind === 'event' && content.events[node.event!] ? node.event
      : content.eventOrder.find((id) => content.events[id]!.title === prompt.title);
    run.pending = [];
    run.screen = event ? { kind: 'event', event } : { kind: 'route' };
    return event
      ? 'This saved trade can no longer deliver its full reward. No items were spent; choose another event option to continue.'
      : 'This saved trade can no longer deliver its full reward. No items were spent; your run progress is preserved and you can continue along the route.';
  }
  if (prompt.optionKind !== 'upgrade') return null;
  if (!e || !('upgrade' in e) || e.upgrade.pick !== 'choose') return null;
  const slots = upgradeable(content, run, e.upgrade.ownedOnly)
    .reduce((n, id) => n + content.upgrades[id]!.levels.length - (run.upgrades[id] ?? 0), 0);
  if (slots >= e.upgrade.count) return null;
  const promised = e.upgrade.count;
  const title = prompt.title;
  if (slots > 0) run.pending[0] = { upgrade: { ...e.upgrade, count: slots } };
  else run.pending.shift();
  resolvePending(content, run, title);
  return slots > 0
    ? `This saved upgrade choice has room for only ${slots} of its ${promised} remaining levels. Take the available upgrade${slots === 1 ? '' : 's'} and continue without paying again.`
    : `This saved upgrade choice could not restore its ${promised} remaining level${promised === 1 ? '' : 's'} because every eligible track is full. Your run progress is preserved; you can continue without paying again.`;
}

/** Answers the open prompt with one of its options. */
export function promptAnswer(content: Content, run: RunState, option: string): void {
  if (run.screen.kind !== 'prompt') throw new Error('no prompt open');
  const p = run.screen.prompt;
  if (!p.options.includes(option) || !outcomeOptions(content, run, run.pending).includes(option)) throw new Error(`${option} is not an available option`);
  const e = run.pending[0]!;
  if ('removeBlueprint' in e) {
    run.kit = run.kit.filter((id) => id !== option);
    run.pending.shift();
  } else if ('upgrade' in e) {
    run.upgrades[option] = (run.upgrades[option] ?? 0) + 1;
    run.cards.push({ card: `up:${option}`, source: p.title });
    if (p.remaining > 1) run.pending[0] = { upgrade: { ...e.upgrade, count: p.remaining - 1 } };
    else run.pending.shift();
  } else if ('sacrificeRelic' in e) {
    run.relics = run.relics.filter((id) => id !== option);
    const target = sacrificeRarity(content, option, e.sacrificeRelic.rarityShift);
    for (let i = 0; i < e.sacrificeRelic.gain; i++) gainRelic(content, run, target, p.title);
    run.pending.shift();
  }
  resolvePending(content, run, p.title);
}

/** Unowned relics at the requested rarity, falling back to lower, then higher rarities. */
function relicCandidates(content: Content, run: RunState, rarity?: Rarity): string[] {
  const pool = runPool(content, run).relics.filter((id) => !run.relics.includes(id));
  const order = rarity ? [rarity, ...RARITIES.slice(0, RARITIES.indexOf(rarity)).reverse(), ...RARITIES.slice(RARITIES.indexOf(rarity) + 1)] : [...RARITIES];
  for (const r of order) {
    const list = rarity ? pool.filter((id) => content.relics[id]!.rarity === r) : pool;
    if (list.length) return list;
  }
  return [];
}

/** A random unowned relic from the pool at `rarity` (falling back to lower, then higher rarities). */
function gainRelic(content: Content, run: RunState, rarity: Rarity | undefined, source: string): void {
  const list = relicCandidates(content, run, rarity);
  if (!list.length) throw new Error('no relics left to gain');
  const id = list[nextInt(run.rng.events, list.length)]!;
  run.relics.push(id);
  run.cards.push({ card: `relic:${id}`, source });
}

/** Applies pending outcomes in order, stopping at the first that needs a choice. */
function resolvePending(content: Content, run: RunState, title: string): void {
  while (run.pending.length) {
    const e = run.pending[0]!;
    let prompt: Prompt | null = null;
    if ('repairPct' in e) repair(run, e.repairPct);
    else if ('maxHpPct' in e) {
      run.heartcap.max = Math.max(1, Math.round(run.heartcap.max * (1 + e.maxHpPct)));
      run.heartcap.hp = Math.min(run.heartcap.hp, run.heartcap.max);
    } else if ('gainRelic' in e) {
      for (let i = 0; i < (e.gainRelic.count ?? 1); i++) gainRelic(content, run, e.gainRelic.rarity, title);
    } else if ('gainAmber' in e) run.amber += e.gainAmber;
    else if ('nextBattle' in e) {
      run.next.startingGold += e.nextBattle.startingGold ?? 0;
      run.next.sporestormShiftSeconds += e.nextBattle.sporestormShiftSeconds ?? 0;
    } else if ('halveIntel' in e) {
      run.intelHalvings++;
      if (run.intel) run.intel = scaleProfile(run.intel, 0.5);
      if (run.profiles) run.profiles = run.profiles.map((p) => scaleProfile(p, 0.5));
    }
    else if ('upgrade' in e) {
      const options = outcomeOptions(content, run, run.pending);
      if (!options.length) throw new Error('the remaining upgrades are not available');
      if (e.upgrade.pick === 'random') {
        for (let i = 0; i < e.upgrade.count; i++) {
          const remaining = [{ upgrade: { ...e.upgrade, count: e.upgrade.count - i } }, ...run.pending.slice(1)];
          const opts = outcomeOptions(content, run, remaining);
          const id = opts[nextInt(run.rng.events, opts.length)]!;
          run.upgrades[id] = (run.upgrades[id] ?? 0) + 1;
          run.cards.push({ card: `up:${id}`, source: title });
        }
      } else {
        prompt = { title, text: 'Choose an upgrade track for +1 level.', options, optionKind: 'upgrade', remaining: e.upgrade.count };
      }
    } else if ('removeBlueprint' in e) {
      const options = outcomeOptions(content, run, run.pending);
      if (!options.length) throw new Error('no blueprint can be traded for the remaining rewards');
      prompt = { title, text: 'Choose a blueprint to give up.', options, optionKind: 'blueprint', remaining: 1 };
    } else if ('sacrificeRelic' in e) {
      const options = outcomeOptions(content, run, run.pending);
      if (!options.length) throw new Error('no relic can be sacrificed for the remaining rewards');
      prompt = { title, text: 'Choose a relic to sacrifice.', options, optionKind: 'relic', remaining: 1 };
    }
    if (prompt) { run.screen = { kind: 'prompt', prompt }; return; }
    run.pending.shift();
  }
  run.screen = { kind: 'route' };
}

/** Card text for the UI and logs. */
export function cardLabel(content: Content, card: string): string {
  const c = parseCard(card);
  if (!c) return card;
  if (c.type === 'relic') return content.relics[c.id]?.name ?? c.id;
  const b = content.buildings[c.id]?.name ?? c.id;
  return c.type === 'blueprint' ? `${b} blueprint` : `${b} upgrade`;
}
