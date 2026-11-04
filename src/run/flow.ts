// The run's state machine (SPEC §8): choosing route nodes, building each battle's config in rounds, applying
// a finished battle (lives, sprawl, rewards, spoils), the Grove, events and the prompts they raise. Every
// transition is a pure function of (run, content, decision); randomness comes only from the run's streams.
// Battles themselves run in the sim; the run only sees their final state.
import type { RunEffect } from '../data/schema.ts';
import {
  POWER_SOURCE_ID, RARITIES, answersTo, applyCard, basePlots, compileRoundUnit, draftLibrary, draftPool, featureReady, generateOffer, hashState,
  kitCards, levelsLeft, nextFloat, nextInt, nextLevel, openOrder, parseCard, parseController, seedStream, setCommander, setPassives, topKinds,
} from '../sim/index.ts';
import type {
  BattleConfig, BattleState, CompiledBuilding, CompiledUnit, Content, Controller, DraftLibrary, DraftPool, IntelProfile, Library, Loadout, Rarity,
  SideConfig,
} from '../sim/index.ts';
import { averageProfile, battleProfile, scaleProfile, updateIntel } from './intel.ts';
import { battleRewards } from './rewards.ts';
import type { SpoilsSpec } from './rewards.ts';
import { isBattle } from './route.ts';
import type { RouteNode } from './route.ts';
import { currentRow, freshNext } from './runState.ts';
import type { BattleRecord, CounterRecordBrief, Prompt, RunState, SpoilsPick } from './runState.ts';

// ---- pools and loadouts ----

export function runPool(content: Content, run: RunState): DraftPool {
  return draftPool(content, run.faction, run.commander, run.flags, run.bans);
}

/** A library covering the run's kit and everything its pool can offer (for spoils offers). */
export function runLibrary(content: Content, run: RunState): DraftLibrary {
  const pool = runPool(content, run);
  return draftLibrary(content, new Set([...run.kit, ...pool.core, ...pool.shared]), new Set([...run.relics, ...pool.relics]));
}

export const loadoutOf = (run: RunState): Loadout => ({ kit: run.kit, upgrades: run.upgrades, relics: run.relics });

/**
 * Kit buildings whose upgrade track has a level left to offer (`ownedOnly`: only tracks already started). A level
 * with `offered: false` is skipped, never taken, here as in drafts (#27).
 */
export function upgradeable(content: Content, run: RunState, ownedOnly = false): string[] {
  return run.kit.filter((id) => {
    const t = content.upgrades[id];
    const lvl = run.upgrades[id] ?? 0;
    return !!t && nextLevel(t, lvl) !== null && (!ownedOnly || lvl > 0);
  });
}

/** The run's level on a track after one more level, past any level that isn't offered (#27). */
const levelUp = (content: Content, run: RunState, id: string): number => nextLevel(content.upgrades[id]!, run.upgrades[id] ?? 0)!;

/** How many offered levels the run's tracks among `ids` have left (#27). */
const slotsLeft = (content: Content, run: RunState, ids: readonly string[]): number =>
  ids.reduce((n, id) => n + levelsLeft(content.upgrades[id]!, run.upgrades[id] ?? 0), 0);

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

/**
 * Your Heartcap's max in a battle (§4.5, §8.5, §8.7): the run-long change (Fallen Oak) and the one-battle change
 * (Quiet Clearing's Rest) multiply, and with the `bosslives` knob each life left adds to it at the boss (#16).
 */
export function playerHeartcapMax(content: Content, run: RunState, node: RouteNode): number {
  const bal = content.balance;
  const hp = Math.round(bal.heartcapPlayerHp * (1 + run.heartcapMaxPct) * (1 + run.next.heartcapMaxHpPct));
  const perLife = node.kind === 'boss' ? bal.livesAtBoss?.heartcapPerLife ?? 0 : 0;
  return Math.max(1, hp + perLife * run.lives.left);
}

/**
 * The battle in rounds a node starts (SPEC §4.5, §4.6, §6.1, §7.7–7.8, §8.3, §8.5): fixed when the node is entered.
 * Each battle has its own Heartcaps, which start full, and both colonies start empty (#20) on the map's plots
 * plus your sprawl (#21), past which a map has no plots. You draft from the run's pool in the planning after
 * each round in `draftRounds`; the general never drafts.
 */
export function battleConfig(content: Content, run: RunState, node: RouteNode): BattleConfig {
  const bal = content.balance;
  const index = run.battles.length + 1;
  const gold = bal.startingGold + bal.startingGoldPerBattle * (index - 1);
  const map = content.maps[node.map!];
  if (!map) throw new Error(`unknown map ${node.map}`);
  const plots = Math.min(basePlots(map) + run.plotsGained, openOrder(map).length);
  const { kit: enemyKit, upgrades: enemyUpgrades } = generalKit(content, run, node, index);
  const enemyHp = node.kind === 'boss' ? bal.heartcapEnemyHp.boss : bal.heartcapEnemyHp.base + bal.heartcapEnemyHp.perBattle * (index - 1);
  const playerCtl = parseController(run.player) as Controller;
  const player: SideConfig = {
    faction: run.faction,
    controller: playerCtl,
    kit: kitCards(content, playerCtl, run.kit),
    upgrades: { ...run.upgrades },
    relics: [...run.relics],
    plots,
    heartcapMaxHp: playerHeartcapMax(content, run, node),
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
  const enemyCtl: Controller = { kind: 'general', id: node.general ?? 'scripted' };
  const enemy: SideConfig = {
    faction: 'gray-rot', controller: enemyCtl, kit: kitCards(content, enemyCtl, enemyKit), relics: [], plots, heartcapMaxHp: enemyHp, startingGold: gold,
  };
  const intel = generalIntel(content, run, node);
  if (intel) enemy.intel = intel;
  // Run progression may introduce buildings the historical single-battle profile never bought.
  // Give only those kit entries a purchase path, leaving the base profile and its replays intact (R2-Q4).
  const generalWeights = content.generals[node.general ?? 'scripted']!.weights;
  const extraWeights = Object.fromEntries(enemyKit.filter((id) => !(generalWeights[id]! > 0)).map((id) => [id, 1]));
  if (Object.keys(extraWeights).length) enemy.aiWeights = extraWeights;
  if (Object.keys(enemyUpgrades).length) enemy.upgrades = enemyUpgrades;
  const config: BattleConfig = { seed: run.seed, battleIndex: index, mapId: map.id, player, enemy, flags: { ...run.flags } };
  setPassives(content, config);
  const modifiers = [...(config.modifiers ?? [])];
  const elite = node.elite ? content.elites[node.elite] : undefined;
  if (elite?.effects) modifiers.push({ side: 'enemy', source: `elite:${elite.id}`, effects: elite.effects });
  // Mold Bloom: `battle.sporestormStart` is a round in rounds (§6.4)
  if (run.next.sporestormShiftRounds) {
    modifiers.push({ side: 'both', source: 'event:next-battle', effects: { modifiers: [{ stat: 'battle.sporestormStart', op: 'add', value: run.next.sporestormShiftRounds }] } });
  }
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
 * A level lands only on a level that is offered, past any that isn't, up to each track's length in the
 * data (#27, A100). The random levels come from the `ai` stream, sub-seeded per battle index so they
 * don't depend on the path taken. A general without a preferred list fields its whole faction roster.
 * A building that waits for a feature the run lacks never joins it (`featureReady`, §8.4, A083).
 */
export function generalKit(content: Content, run: RunState, node: RouteNode, index: number): { kit: string[]; upgrades: Record<string, number> } {
  const rules = content.balance.enemyKit;
  const g = content.generals[node.general ?? 'scripted']!;
  const roster = (content.factions[g.faction]?.buildings ?? []).filter((id) => featureReady(content.buildings[id]?.requires, run.flags));
  const boss = node.kind === 'boss';
  let kit: string[];
  if (!g.preferred) kit = [...roster];
  else {
    kit = [...new Set(g.opener)].filter((id) => roster.includes(id));
    const size = boss ? rules.bossBuildings : kit.length + rules.blueprintsPerBattle * (index - 1);
    for (const id of [...bossCounters(content, run, node, roster, kit), ...g.preferred]) {
      if (kit.length >= size) break;
      if (!kit.includes(id) && roster.includes(id)) kit.push(id);
    }
  }
  const upgrades: Record<string, number> = {};
  const next = (id: string) => (content.upgrades[id] ? nextLevel(content.upgrades[id], upgrades[id] ?? 0) : null);
  const tracks = () => kit.filter((id) => content.buildings[id]!.squad && next(id) !== null);
  const levels = boss ? rules.bossUpgrades : rules.upgradesPerBattle * (index - 1) + (node.kind === 'elite' ? rules.eliteUpgrades : 0);
  const rng = seedStream(run.seed, 'ai.enemy', 1000 + index);
  for (let k = 0; k < levels; k++) {
    const t = tracks();
    if (!t.length) break;
    const id = t[nextInt(rng, t.length)]!;
    upgrades[id] = next(id)!;
  }
  const veteran = node.elite ? content.elites[node.elite]?.upgradeLevels ?? 0 : 0;
  for (const id of kit) {
    if (!content.buildings[id]!.squad) continue;
    for (let k = 0; k < veteran && next(id) !== null; k++) upgrades[id] = next(id)!;
  }
  return { kit, upgrades };
}

/**
 * The roster as the counter sets read it outside a battle (§7.4): its cards, and their squads' units compiled as a
 * battle compiles them with no modifier.
 */
function rosterView(content: Content, roster: readonly string[]): Parameters<typeof answersTo>[0] {
  const lib: Library = { balance: content.balance, buildings: content.buildings, units: content.units };
  const cards: Record<string, CompiledBuilding> = {}, units: Record<string, CompiledUnit> = {};
  for (const id of roster) {
    const b = content.buildings[id]!;
    cards[id] = { id, kind: b.kind, cost: b.cost, ...(b.squad ? { squad: { unit: b.squad.unit, count: b.squad.count } } : {}) };
    if (b.kind === 'spawner' && b.squad) units[b.squad.unit] ??= compileRoundUnit(lib, b.squad.unit);
  }
  return { cards, units, matrix: content.balance.matrix, kit: roster.map((building) => ({ building })) };
}

/**
 * The boss's first extra blueprints (§7.6, §7.8, A056): for each of the run's top two intel kinds, the cheapest
 * card of its round counter set not already in the kit whose unit beats the armor that kind reads, as a
 * counter's missing answer is chosen (R2a/T099), so its dual doctrine has real answers to lean on. Empty for
 * other generals or without intel.
 */
function bossCounters(content: Content, run: RunState, node: RouteNode, roster: readonly string[], kit: readonly string[]): string[] {
  const intel = node.kind === 'boss' ? generalIntel(content, run, node) : null;
  return intel ? answersTo(rosterView(content, roster), topKinds(intel, 2), kit) : [];
}

// ---- after a battle ----

export const rewardRules = (content: Content) => ({
  rarityBiasStep: content.balance.draft.rarityBiasStep,
  eliteRareBonus: content.balance.draft.eliteRareBonus,
});

/** The counters the general activated (§7.4), each with what it planted while that counter was in force. */
function countersOf(state: BattleState): CounterRecordBrief[] | undefined {
  const ai = state.sides.enemy.ai;
  if (!ai?.counter) return undefined;
  const history = ai.counter.history;
  return history.map((c, i) => {
    const until = history[i + 1]?.round ?? Infinity;
    const built: Record<string, number> = {};
    for (const p of ai.plans) if (p.round >= c.round && p.round < until) for (const b of p.planted) built[b.building] = (built[b.building] ?? 0) + 1;
    return { kind: c.kind, round: c.round, ...(c.added ? { drafted: c.added } : {}), sold: [...c.sold], built };
  });
}

/**
 * Applies a finished battle in rounds (§8.3, §8.5, §8.6, §4.6): the cards you drafted in it join the run's
 * loadout, win or lose, and its record lists them. A loss costs a life and pays nothing, and the run ends at 0
 * lives or on a boss loss (#16); a win pays Spores, Amber and spoils and grows the colony by a plot, up to
 * `plotGrowth.max` (#18), and a won battle pays each draft it ended before as an extra spoils pick (#17). The
 * next battle's one-shot effects reset, and intel reads every battle.
 */
export function finishBattle(content: Content, run: RunState, state: BattleState): BattleRecord {
  if (run.screen.kind !== 'battle') throw new Error('no battle in progress');
  if (!state.outcome) throw new Error('the battle has not ended');
  const row = currentRow(run) - 1;
  const node = nodeAt(run, row, run.path[row]!)!;
  const { winner, by } = state.outcome;
  const r = battleRewards(node.kind, winner, by, rewardRules(content));
  let amber = r.amber;
  if (r.amberChance > 0 && nextFloat(run.rng.meta) < r.amberChance) amber++;
  run.spores += r.spores;
  run.amber += amber;
  run.xp += r.spores + (winner === 'player' ? 25 : 0);
  run.next = freshNext();
  const lifeLost = winner !== 'player';
  const growth = content.balance.rounds.plotGrowth;
  if (lifeLost) run.lives.left = Math.max(0, run.lives.left - 1);
  else run.plotsGained = Math.min(growth.max, run.plotsGained + growth.perWin);
  const st = state.stats.player;
  const damage: Record<string, number> = {};
  for (const [id, dmg] of Object.entries(st.damageByBuilding)) {
    const type = id === String(POWER_SOURCE_ID) ? 'power' : st.buildingTypes[id] ?? 'unknown';
    damage[type] = (damage[type] ?? 0) + dmg;
  }
  const index = run.battles.length + 1;
  const drafted = [...(state.sides.player.drafted ?? [])];
  for (const card of drafted) {
    applyCard(loadoutOf(run), card, content.upgrades);
    run.cards.push({ card, source: `battle ${index}` });
  }
  const map = content.maps[state.config.mapId]!;
  const heartcap = (s: 'player' | 'enemy') => ({ max: state.sides[s].heartcapMaxHp, end: state.sides[s].heartcapHp });
  const record: BattleRecord = {
    index, row, kind: node.kind, map: map.id, mapName: map.name, lanes: map.lanes.length,
    general: node.general ?? 'scripted', winner, by, finalHash: hashState(state), rounds: structuredClone(state.rounds),
    heartcaps: { player: heartcap('player'), enemy: heartcap('enemy') }, lifeLost, damageByBuilding: damage, drafted, spores: r.spores, amber,
  };
  if (node.elite) record.elite = node.elite;
  const opening = state.sides.enemy.ai?.counter?.opening;
  if (opening) record.opening = { kinds: [...opening.kinds], dual: opening.dual };
  const counters = countersOf(state);
  if (counters) record.counters = counters;
  const profile = battleProfile(state);
  if (profile) {
    record.profile = profile;
    run.intel = updateIntel(run.intel, profile, content.balance.ai.counter.intelKeep);
    run.profiles = [...(run.profiles ?? []), profile];
  }
  run.battles.push(record);
  if (lifeLost && (run.lives.left <= 0 || node.kind === 'boss')) {
    endRun(run, 'defeat');
  } else if (node.kind === 'boss') {
    endRun(run, 'victory');
  } else if (r.spoils.length) {
    run.screen = { kind: 'spoils', picks: [] };
    for (const sp of [...r.spoils.slice(0, 1), ...skippedDrafts(content, state, node.kind), ...r.spoils.slice(1)]) {
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

/**
 * A spoils pick for each draft the battle ended before (§8.3, §8.6, #17, A207): one for each round in `draftRounds`
 * whose next planning it never reached, dealt as that draft would have been, 3 cards with no reroll, and with an
 * elite's +10 rare as every spoils draft after one.
 */
function skippedDrafts(content: Content, state: BattleState, kind: RouteNode['kind']): SpoilsSpec[] {
  if (!state.config.flags.drafts) return [];
  const skipped = content.balance.rounds.draftRounds.filter((r) => r >= state.outcome!.round).length;
  const rareBonus = kind === 'elite' ? content.balance.draft.eliteRareBonus : 0;
  return Array.from({ length: skipped }, () => ({ label: 'Spoils', cards: content.balance.draft.cards, rareBonus, freeRerolls: 0, relicsOnly: false }));
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
    applyCard(loadoutOf(run), card, content.upgrades);
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

export type GroveChoice = 'life' | 'graft' | 'leave';

/** Why a Grove choice isn't open, or null (§8.7, R2-Q21): Leave always is. */
export function groveProblem(content: Content, run: RunState, choice: GroveChoice): string | null {
  if (choice === 'life' && run.lives.left >= run.lives.max) return 'Your Regrowths are full.';
  if (choice === 'graft' && !upgradeable(content, run).length) return 'Every upgrade track is full.';
  return null;
}

/** The Grove (SPEC §8.7): regain a life up to the max, graft +1 level onto a track through a prompt, or leave. */
export function groveChoose(content: Content, run: RunState, choice: GroveChoice): void {
  if (run.screen.kind !== 'grove') throw new Error('not at a Grove');
  const problem = groveProblem(content, run, choice);
  if (problem) throw new Error(problem);
  if (choice === 'leave') {
    run.screen = { kind: 'route' };
    return;
  }
  run.pending = [choice === 'life' ? { gainLife: 1 } : { upgrade: { count: 1, pick: 'choose' } }];
  resolvePending(content, run, 'Grove');
}

const withoutBlueprint = (run: RunState, id: string): RunState => ({ ...run, kit: run.kit.filter((b) => b !== id) });
const withUpgrade = (content: Content, run: RunState, id: string): RunState => ({ ...run, upgrades: { ...run.upgrades, [id]: levelUp(content, run, id) } });
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
    if (slotsLeft(content, run, options) < e.upgrade.count) return [];
    return options.filter((id) => outcomeAvailable(content, withUpgrade(content, run, id), afterUpgrade(e, rest)));
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

/**
 * Recover legacy choices whose rewards are no longer feasible, preserving already-paid progress. A saved spoils
 * offer or upgrade prompt may name a track whose next level is no longer offered (#27): the offer is dealt again,
 * and the prompt offers the tracks that have a level left.
 */
export function recoverPendingChoice(content: Content, run: RunState): string | null {
  if (run.screen.kind === 'spoils') {
    const p = run.screen.picks[0];
    const stale = (card: string) => {
      const c = parseCard(card);
      return c?.type === 'upgrade' && !upgradeable(content, run).includes(c.id);
    };
    if (!p?.offer.some((c) => stale(c.id))) return null;
    p.offer = [];
    dealSpoils(content, run);
    return 'A saved spoils offer held an upgrade level that is no longer offered, so it has been dealt again.';
  }
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
  const slots = slotsLeft(content, run, upgradeable(content, run, e.upgrade.ownedOnly));
  if (slots >= e.upgrade.count) {
    const options = outcomeOptions(content, run, run.pending);
    if (!options.length || (options.length === prompt.options.length && options.every((id, i) => id === prompt.options[i]))) return null;
    run.screen = { kind: 'prompt', prompt: { ...prompt, options } };
    return 'Some saved upgrade options have no level left to offer. Choose an available track; nothing has been spent.';
  }
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
    run.upgrades[option] = levelUp(content, run, option);
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
    if ('gainLife' in e) run.lives.left = Math.min(run.lives.max, run.lives.left + e.gainLife);
    else if ('maxHpPct' in e) {
      // two run-long changes multiply, as v1's max did
      run.heartcapMaxPct = Math.round(((1 + run.heartcapMaxPct) * (1 + e.maxHpPct) - 1) * 10000) / 10000;
    } else if ('gainRelic' in e) {
      for (let i = 0; i < (e.gainRelic.count ?? 1); i++) gainRelic(content, run, e.gainRelic.rarity, title);
    } else if ('gainAmber' in e) run.amber += e.gainAmber;
    else if ('nextBattle' in e) {
      run.next.startingGold += e.nextBattle.startingGold ?? 0;
      run.next.sporestormShiftRounds += e.nextBattle.sporestormShiftRounds ?? 0;
      run.next.heartcapMaxHpPct += e.nextBattle.heartcapMaxHpPct ?? 0;
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
          run.upgrades[id] = levelUp(content, run, id);
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
