// The run's state machine (SPEC §8): choosing route nodes, building each battle's config, applying a
// finished battle (Heartcap carryover, rewards, spoils), the Grove, events and the prompts they
// raise. Every transition is a pure function of (run, content, decision); randomness comes only from
// the run's streams. Battles themselves run in the sim; the run only sees their final state.
import type { RunEffect } from '../data/schema.ts';
import {
  RARITIES, applyCard, buildLibrary, draftPool, generateOffer, hashState, nextFloat, nextInt, parseCard, parseController,
} from '../sim/index.ts';
import type {
  BattleConfig, BattleModifier, BattleState, Content, DraftPool, Library, Loadout, Rarity, SideConfig,
} from '../sim/index.ts';
import { battleRewards } from './rewards.ts';
import { isBattle } from './route.ts';
import type { RouteNode } from './route.ts';
import { currentRow } from './runState.ts';
import type { BattleRecord, Prompt, RunState, SpoilsPick } from './runState.ts';

// ---- pools and loadouts ----

export function runPool(content: Content, run: RunState): DraftPool {
  return draftPool(content, run.faction, run.commander, run.flags);
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
  const enemyKit = [...(content.factions[enemyFaction]?.buildings ?? [])];
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
  const enemy: SideConfig = {
    faction: enemyFaction,
    controller: { kind: 'general', id: node.general ?? 'scripted' },
    kit: enemyKit,
    heartcapHp: enemyHp,
    heartcapMaxHp: enemyHp,
    startingGold: gold,
  };
  const modifiers: BattleModifier[] = [];
  const elite = node.elite ? content.elites[node.elite] : undefined;
  if (elite?.effects) modifiers.push({ side: 'enemy', source: `elite:${elite.id}`, effects: elite.effects });
  if (elite?.upgradeLevels) {
    // Veteran: +N upgrade levels on every unit track in the general's kit
    const ups: Record<string, number> = {};
    for (const id of enemyKit) if (content.buildings[id]?.spawn && content.upgrades[id]) ups[id] = elite.upgradeLevels;
    enemy.upgrades = ups;
  }
  if (run.next.sporestormShiftSeconds) {
    modifiers.push({ side: 'both', source: 'event:next-battle', effects: { modifiers: [{ stat: 'battle.sporestormStart', op: 'add', value: run.next.sporestormShiftSeconds }] } });
  }
  const config: BattleConfig = {
    seed: run.seed, battleIndex: index, mapId: node.map!, player, enemy, flags: { ...run.flags },
  };
  if (modifiers.length) config.modifiers = modifiers;
  return config;
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
    const type = id === '0' ? 'turret' : state.stats.player.buildingTypes[id] ?? 'unknown';
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

/** Can this outcome apply right now? (A choice is offered only if every part of it can.) */
export function outcomeAvailable(content: Content, run: RunState, outcome: readonly RunEffect[]): boolean {
  for (const e of outcome) {
    if ('removeBlueprint' in e && !nonStarter(content, run).length) return false;
    if ('upgrade' in e && !upgradeable(content, run, e.upgrade.ownedOnly).length) return false;
    if ('sacrificeRelic' in e && !run.relics.length) return false;
  }
  return true;
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

/** Answers the open prompt with one of its options. */
export function promptAnswer(content: Content, run: RunState, option: string): void {
  if (run.screen.kind !== 'prompt') throw new Error('no prompt open');
  const p = run.screen.prompt;
  if (!p.options.includes(option)) throw new Error(`${option} is not an option`);
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
    const rarity = content.relics[option]!.rarity;
    run.relics = run.relics.filter((id) => id !== option);
    const target = RARITIES[Math.max(0, RARITIES.indexOf(rarity) + e.sacrificeRelic.rarityShift)]!;
    for (let i = 0; i < e.sacrificeRelic.gain; i++) gainRelic(content, run, target, p.title);
    run.pending.shift();
  }
  resolvePending(content, run, p.title);
}

/** A random unowned relic from the pool at `rarity` (falling back to lower, then higher rarities). */
function gainRelic(content: Content, run: RunState, rarity: Rarity | undefined, source: string): void {
  const pool = runPool(content, run).relics.filter((id) => !run.relics.includes(id));
  const order = rarity ? [rarity, ...RARITIES.slice(0, RARITIES.indexOf(rarity)).reverse(), ...RARITIES.slice(RARITIES.indexOf(rarity) + 1)] : [...RARITIES];
  for (const r of order) {
    const list = rarity ? pool.filter((id) => content.relics[id]!.rarity === r) : pool;
    if (!list.length) continue;
    const id = list[nextInt(run.rng.events, list.length)]!;
    run.relics.push(id);
    run.cards.push({ card: `relic:${id}`, source });
    return;
  }
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
    } else if ('halveIntel' in e) run.intelHalvings++;
    else if ('upgrade' in e) {
      const options = upgradeable(content, run, e.upgrade.ownedOnly);
      if (!options.length) { /* nothing left to upgrade */ }
      else if (e.upgrade.pick === 'random') {
        for (let i = 0; i < e.upgrade.count; i++) {
          const opts = upgradeable(content, run, e.upgrade.ownedOnly);
          if (!opts.length) break;
          const id = opts[nextInt(run.rng.events, opts.length)]!;
          run.upgrades[id] = (run.upgrades[id] ?? 0) + 1;
          run.cards.push({ card: `up:${id}`, source: title });
        }
      } else {
        prompt = { title, text: 'Choose an upgrade track for +1 level.', options, optionKind: 'upgrade', remaining: e.upgrade.count };
      }
    } else if ('removeBlueprint' in e) {
      const options = nonStarter(content, run);
      if (options.length) prompt = { title, text: 'Choose a blueprint to give up.', options, optionKind: 'blueprint', remaining: 1 };
    } else if ('sacrificeRelic' in e) {
      if (run.relics.length) prompt = { title, text: 'Choose a relic to sacrifice.', options: [...run.relics], optionKind: 'relic', remaining: 1 };
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
