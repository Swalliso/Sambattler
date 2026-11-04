// Creating a battle in rounds (SPEC §4.7 steps 1–4, §6.1, §14.6): from a config, into round 1's planning
// with the general's plan made, or from a round scenario (§15.2, plan Call 18); and the flags, controllers
// and draft pools that a battle's and a run's configs are made of.
import type { Content } from '../data/registry.ts';
import type { ModifierDef, ScenarioDef } from '../data/schema.ts';
import { seedStream } from './rng.ts';
import { resolveProfile } from './ai/profiles.ts';
import { basePlots, colonyPlots, openOrder } from './colony.ts';
import { buildRoundLibrary, compileRoundRules, compileRoundSides } from './compile.ts';
import { collectRoundEffects, resolveStat, roundModifiers } from './effects.ts';
import { featureReady, kitCards, kitOf } from './kit.ts';
import { newClash, openRound } from './round.ts';
import { emptyRoundStats, emptyStats } from './stats.ts';
import { SIDES, other } from './state.ts';
import type {
  BattleConfig, BattleModifier, BattleState, BuildingState, Controller, DraftPool, RoundResult, Side, SideConfig, SideState, Tier, UnitState,
} from './state.ts';
import { squadOf } from './world.ts';

export type Flags = BattleConfig['flags'];

/** The milestone this build implements. Feature flags default to what it ships (SPEC §15.2). */
export const MILESTONE = 5;
/** A battle in rounds' features unless its config sets them. A single battle drafts only with `--flags drafts` (§8.3). */
export const DEFAULT_FLAGS: Readonly<Flags> = { merging: true, drafts: false, adaptiveGeneral: true, powers: true };

/** Flag names as written in `--flags` and `?flags=`, and the milestone each one arrives in. */
const FLAG_NAMES: Record<string, { key: keyof Flags; milestone: number }> = {
  merging: { key: 'merging', milestone: 2 },
  drafts: { key: 'drafts', milestone: 3 },
  adaptive: { key: 'adaptiveGeneral', milestone: 4 },
  powers: { key: 'powers', milestone: 5 },
};

/**
 * Parses a comma-separated flag list into the exact flag set it names (`none` or an empty list turns
 * every feature off). Unknown flags and flags from later milestones are reported, not set.
 */
export function parseFlags(list: string): { flags: Flags; problems: string[] } {
  const flags: Flags = { merging: false, drafts: false, adaptiveGeneral: false, powers: false };
  const problems: string[] = [];
  for (const name of list.split(',').map((f) => f.trim()).filter((f) => f && f !== 'none')) {
    const f = FLAG_NAMES[name];
    if (!f) problems.push(`unknown flag "${name}" (expected ${Object.keys(FLAG_NAMES).join(', ')} or none)`);
    else if (f.milestone > MILESTONE) problems.push(`flag "${name}" is not available until Milestone ${f.milestone}`);
    else flags[f.key] = true;
  }
  return { flags, problems };
}

/** Parses a controller string: human | bot:<id> | general:<id> (e.g. general:mother-mold). */
export function parseController(text: string): Controller {
  if (text === 'human' || text === 'none' || text === 'idle') return { kind: 'human' };
  const m = text.match(/^(bot|general):(.+)$/);
  if (!m) throw new Error(`bad controller "${text}" (expected human, bot:<id> or general:<id>)`);
  return m[1] === 'bot' ? { kind: 'bot', id: m[2]! } : { kind: 'general', id: m[2]! };
}

/** The commander a run starts with unless one is chosen, and whose pool a commander-less single battle drafts from. */
export const DEFAULT_COMMANDER = 'vesper';
/** At most this many shared-pool buildings can be banned before a run (SPEC §8.1). */
export const MAX_BANS = 3;

/**
 * A commander's draft pool (SPEC §8.4): its core buildings, every other building of the faction
 * (the shared pool, minus bans; core buildings can't be banned) and every relic, each only once the
 * feature it requires is here (`featureReady`). Spoils and events draw from it too.
 */
export function draftPool(content: Content, faction: string, commanderId: string, flags: Flags, bans: string[] = []): DraftPool {
  const cmd = content.commanders[commanderId];
  if (!cmd) throw new Error(`unknown commander ${commanderId}`);
  const ready = (id: string) => featureReady(content.buildings[id]?.requires, flags);
  const roster = content.factions[faction]?.buildings ?? [];
  const core = cmd.core.filter((id) => roster.includes(id) && ready(id));
  const shared = roster.filter((id) => !cmd.core.includes(id) && !bans.includes(id) && ready(id));
  const relics = content.relicOrder.filter((id) => featureReady(content.relics[id]!.requires, flags));
  return { core, shared, relics };
}

export interface RoundBattleOptions {
  seed: number;
  /** Bogwater Hollow unless set. */
  mapId?: string;
  battleIndex?: number;
  /** A controller or its text (human | bot:<id> | general:<id>): a human player and `general:scripted` unless set. */
  player?: string | Controller;
  enemy?: string | Controller;
  flags?: Partial<Flags>;
  /** The player's commander (§11.10): its passive, and its power with `flags.powers`. */
  commander?: string;
  /** `v3` plays the v3 prototype's rules (`src/sim/v3.ts`); v2's unless set. */
  rules?: 'v2' | 'v3';
}

const perSide = <T>(f: (s: Side) => T): Record<Side, T> => ({ player: f('player'), enemy: f('enemy') });

/**
 * A single battle's config with the rules' defaults: each faction's roster as its kit (§18.1 D45), the
 * map's base plots (§4.6), this battle's Heartcaps (§4.5) and §6.1's starting gold, with the generals' and
 * the commanders' passives as battle modifiers (§7.7, §11.10).
 */
export function makeRoundConfig(content: Content, opts: RoundBattleOptions): BattleConfig {
  const bal = content.balance;
  // v3's block sets the Heartcaps once S8 tunes them (V3-Q9), and both kits (`kitOf`)
  const v3 = opts.rules === 'v3' ? bal.v3 : undefined;
  if (opts.rules === 'v3' && !v3) throw new Error("rules v3 needs data/balance.json's v3 block");
  const battleIndex = opts.battleIndex ?? 1;
  const mapId = opts.mapId ?? 'bogwater-hollow';
  const map = content.maps[mapId];
  if (!map) throw new Error(`unknown map ${mapId}`);
  const ctl = (c: string | Controller | undefined, dflt: string): Controller => (typeof c === 'object' ? c : parseController(c ?? dflt));
  const side = (s: Side, controller: Controller): SideConfig => {
    const faction = s === 'player' ? 'velvet-bloom' : 'gray-rot';
    return {
      // `kitOf` fills it once both sides stand
      faction, controller, kit: [], relics: [],
      // `createBattle` refuses a map without a colony block, with a message
      plots: map.colony ? basePlots(map) : 0,
      heartcapMaxHp: s === 'player'
        ? v3?.heartcapPlayerHp ?? bal.heartcapPlayerHp
        : v3?.heartcapEnemyHp ?? bal.heartcapEnemyHp.base + bal.heartcapEnemyHp.perBattle * (battleIndex - 1),
      startingGold: bal.startingGold + bal.startingGoldPerBattle * (battleIndex - 1),
    };
  };
  const config: BattleConfig = {
    seed: opts.seed >>> 0,
    battleIndex,
    mapId,
    player: side('player', ctl(opts.player, 'human')),
    enemy: side('enemy', ctl(opts.enemy, 'general:scripted')),
    flags: { ...DEFAULT_FLAGS, ...opts.flags },
    ...(v3 ? { rules: 'v3' as const } : {}),
  };
  for (const s of SIDES) config[s].kit = kitOf(content, s, config);
  if (opts.commander) setCommander(content, config.player, opts.commander);
  // a single battle with drafts on gives the player its commander's pool (Vesper's without one, §8.4)
  if (config.flags.drafts) config.player.draft = draftPool(content, config.player.faction, opts.commander ?? DEFAULT_COMMANDER, config.flags);
  setPassives(content, config);
  return config;
}

/** Puts a commander on a side: its id and its power's. Its passive joins the battle's modifiers. */
export function setCommander(content: Content, sc: SideConfig, commanderId: string): void {
  const cmd = content.commanders[commanderId];
  if (!cmd) throw new Error(`unknown commander ${commanderId} (expected ${Object.keys(content.commanders).join(', ')})`);
  sc.commander = cmd.id;
  sc.power = cmd.power.id;
}

/** Sets the battle's modifiers to both sides' passives: the generals' (§7.7), then the commanders' (§11.10), as v1 orders them. */
export function setPassives(content: Content, config: BattleConfig): void {
  const out: BattleModifier[] = [];
  for (const s of SIDES) {
    const ctl = config[s].controller;
    const g = ctl.kind === 'general' ? content.generals[ctl.id] : undefined;
    if (g?.passive) out.push({ side: s, source: `general:${g.id}`, effects: g.passive });
  }
  for (const s of SIDES) {
    const c = config[s].commander ? content.commanders[config[s].commander!] : undefined;
    if (c) out.push({ side: s, source: `commander:${c.id}`, effects: c.passive.effects });
  }
  if (out.length) config.modifiers = out;
  else delete config.modifiers;
}

/** A single battle in round 1's planning, the general's plan made (§4.7 steps 1–4, §14.6). */
export function createBattle(content: Content, config: BattleConfig): BattleState {
  const state = newBattle(content, config);
  openRound(state);
  return state;
}

/**
 * A battle before its first round opens (§4.7 steps 1–3): a fresh map, both colonies empty with their
 * plots open in `openOrder`, both Heartcaps full and each side's starting gold.
 */
function newBattle(content: Content, config: BattleConfig): BattleState {
  const map = content.maps[config.mapId];
  if (!map) throw new Error(`unknown map ${config.mapId}`);
  if (!map.colony) throw new Error(`${map.id} has no colony block, so it can't hold a battle in rounds (§4.6)`);
  const library = buildRoundLibrary(content, config);
  const rules = compileRoundRules(library, config);
  const compiled = compileRoundSides(library, config);
  const fx = collectRoundEffects(roundModifiers(library, config));
  const sideState = (s: Side): SideState => {
    const sc = config[s];
    // a modifier on side.heartcapMaxHp, side.startingGold or side.plots reaches the battle's creation (§4.5, §4.6, §6.1)
    const maxHp = Math.max(1, Math.round(resolveStat(sc.heartcapMaxHp, fx[s].mods, 'side.heartcapMaxHp')));
    const plots = plotCount(openOrder(map).length, sc.plots, fx[s].mods);
    const st: SideState = {
      gold: Math.max(0, Math.round(resolveStat(sc.startingGold, fx[s].mods, 'side.startingGold'))),
      heartcapHp: maxHp,
      heartcapMaxHp: maxHp,
      kit: sc.kit.map((c) => ({ ...c })),
      augments: Object.fromEntries(Object.entries(sc.augments ?? {}).map(([id, list]) => [id, [...list]])),
      upgrades: { ...sc.upgrades },
      relics: [...sc.relics],
      plots: colonyPlots(map, s, plots).map((p) => ({ ...p, building: 0 })),
      bankedAtBegin: 0,
      powerUsed: false,
      draftsOpened: 0,
    };
    if (sc.controller.kind !== 'human') st.ai = resolveProfile(content, sc.controller, sc, config.flags);
    return st;
  };
  const state: BattleState = {
    v: 2,
    config,
    phase: 'planning',
    round: 1,
    tick: 0,
    rounds: [],
    rng: {
      combat: seedStream(config.seed, 'combat', config.battleIndex),
      draft: seedStream(config.seed, 'draft', config.battleIndex),
      // an AI stream a side, so the general's plan never depends on a bot's draws (plan Call 10, A052)
      ai: { player: seedStream(config.seed, 'ai.player', config.battleIndex), enemy: seedStream(config.seed, 'ai.enemy', config.battleIndex) },
    },
    nextId: 1,
    nextSeq: { player: 0, enemy: 0 },
    nextHitSeq: 0,
    rules,
    library,
    // the colony block's tiles: R2's arena is plain soil (§11.9)
    map: { id: map.id, width: map.width, height: map.height, homeCols: map.colony.homeCols, tiles: [...map.colony.tiles], openOrder: openOrder(map) },
    sides: { player: sideState('player'), enemy: sideState('enemy') },
    lanes: map.lanes.map((l) => ({ rowStart: l.rowStart, rowEnd: l.rowEnd })),
    buildings: [],
    squads: [],
    units: [],
    hits: [],
    sporestorm: 0,
    queue: [],
    log: [],
    events: [],
    compiled,
    stats: { player: emptyStats(), enemy: emptyStats() },
  };
  if (rules.cloud || rules.burst) state.clouds = [];
  for (const s of SIDES) {
    if (library.powers?.[config[s].power ?? '']) Object.assign(state.stats[s], { powerUses: 0, powerDamage: 0, powerLifts: 0, powerGold: 0 });
  }
  return state;
}

/**
 * A side's plot count (§4.6): its config's, with its `side.plots` modifiers such as Mycelial Web's +1, and at
 * most the colony's `max`. A plot gained past the map's last closed plot is dropped (Call 4).
 */
function plotCount(max: number, base: number, mods: readonly ModifierDef[]): number {
  return Math.min(max, Math.max(0, Math.round(resolveStat(base, mods, 'side.plots'))));
}

/**
 * Opens a side's plots up to its count with `mods`, in the map's open order (§4.6, #19): a plot a draft's pick
 * gains mid-battle, such as Mycelial Web's, opens at once (§11.7). A plot never closes mid-battle.
 */
export function openPlots(state: BattleState, side: Side, mods: readonly ModifierDef[]): void {
  const order = state.map.openOrder, plots = state.sides[side].plots;
  for (const i of order.slice(0, plotCount(order.length, state.config[side].plots, mods))) plots[i]!.open = true;
}

export interface RoundScenarioOverrides {
  seed?: number;
  player?: string;
  enemy?: string;
  flags?: Partial<Flags>;
  rules?: 'v2' | 'v3';
}

/**
 * A battle in rounds from a round scenario (§15.2), by its id in `data/scenarios/` or given whole:
 * each side's planted colony, kit, gold and Heartcap, in the round it names. A later round also gets the
 * rounds before it, so the comeback gold, the Decision and the counter cycle read consistent state (plan
 * Call 18, A106). The round then opens as any round does: the general plans on its colony. With
 * `clash.units` it starts in a clash instead, with those units placed, for rule tests.
 */
export function createFromScenario(content: Content, scenario: string | ScenarioDef, over: RoundScenarioOverrides = {}): BattleState {
  const sc = typeof scenario === 'string' ? content.scenarios[scenario] : scenario;
  if (!sc) throw new Error(`unknown round scenario ${String(scenario)}`);
  const fail: (problem: string) => never = (problem) => { throw new Error(`round scenario ${sc.id}: ${problem}`); };
  const config = makeRoundConfig(content, {
    seed: over.seed ?? 1,
    mapId: sc.map,
    battleIndex: sc.battleIndex ?? 1,
    player: over.player ?? sc.controllers?.player ?? 'human',
    enemy: over.enemy ?? sc.controllers?.enemy ?? 'human',
    flags: over.flags ?? sc.flags ?? {},
    ...(over.rules ? { rules: over.rules } : {}),
  });
  config.scenario = sc.id;
  for (const s of SIDES) {
    const def = sc.sides[s], side = config[s];
    if (def.kit) side.kit = kitCards(content, side.controller, def.kit);
    if (def.plots !== undefined) side.plots = def.plots;
    if (def.heartcapMaxHp !== undefined) side.heartcapMaxHp = def.heartcapMaxHp;
    if (def.gold !== undefined) side.startingGold = def.gold;
    if (def.commander) setCommander(content, side, def.commander);
  }
  setPassives(content, config);
  const state = newBattle(content, config);
  state.round = sc.round ?? 1;
  for (const s of SIDES) {
    const def = sc.sides[s], ss = state.sides[s];
    if (def.heartcapHp !== undefined) {
      if (def.heartcapHp > ss.heartcapMaxHp) fail(`${s}'s Heartcap ${def.heartcapHp} is over its max HP ${ss.heartcapMaxHp}`);
      ss.heartcapHp = def.heartcapHp;
    }
    // a later round's gold is what the side banked at the last Begin, which interest reads (§6.2)
    if (state.round > 1) ss.bankedAtBegin = ss.gold;
    for (const c of def.colony ?? []) {
      const where = `${s}'s plot at lane ${c.lane}, rank ${c.rank}, file ${c.file}`;
      const plot = ss.plots.findIndex((p) => p.lane === c.lane && p.rank === c.rank && p.file === c.file);
      const p = ss.plots[plot];
      if (!p) fail(`${s} has no plot at lane ${c.lane}, rank ${c.rank}, file ${c.file}`);
      if (!p.open) fail(`${where} is closed`);
      if (p.terrain === 'stump') fail(`${where} is a stump plot`);
      if (p.building) fail(`${where} is taken`);
      const card = state.compiled[s].buildings[c.building];
      if (!card) fail(`${c.building} is not in ${s}'s kit`);
      const b = addBuilding(state, s, c.building, plot, card.cost);
      b.mergeOn = c.merge ?? true;
      // a colony from before a later round has stood in a clash (§4.4)
      if (state.round > 1) { b.plantedRound = state.round - 1; b.fielded = true; }
    }
  }
  state.rounds = roundsBefore(sc, state, fail);
  if (!sc.clash) {
    openRound(state);
    return state;
  }
  state.phase = 'clash';
  state.clash = newClash(state);
  for (const g of sc.clash.units) {
    if (!state.compiled[g.side].units[g.unit]) fail(`${g.side} fields no ${g.unit}: add its building to its kit`);
    const count = g.count ?? 1, rows = g.rows ?? 1, dx = g.dx ?? 0.6, dy = g.dy ?? 0.6;
    for (let i = 0; i < count; i++) {
      const x = g.x + Math.floor(i / rows) * dx, y = g.y + (i % rows) * dy;
      const lane = g.lane ?? state.lanes.findIndex((l) => Math.floor(y) >= l.rowStart && Math.floor(y) <= l.rowEnd);
      if (lane < 0 || lane >= state.lanes.length) fail(`a ${g.unit} at (${x}, ${y}) is in no lane`);
      addUnit(state, g.side, g.unit, lane, x, y, 0, g.tier ?? 1);
    }
  }
  return state;
}

type PastRound = NonNullable<ScenarioDef['rounds']>[number];

/**
 * The rounds before a scenario's (plan Call 18): its own `rounds`, or ones made from each side's `dealt`
 * and the `last` round's result. The last made round takes `last`'s lanes and damage (all of `dealt`
 * without it), the first the rest of `dealt`, and any between none. Each records the Heartcaps as that
 * damage left them, and the last as they stand. A made round fielded nothing and records no storm, cap,
 * survivors, lane damage or stats.
 */
function roundsBefore(sc: ScenarioDef, state: BattleState, fail: (problem: string) => never): RoundResult[] {
  const n = state.round - 1;
  const dealtGiven = SIDES.some((s) => sc.sides[s].dealt !== undefined);
  let past: PastRound[];
  if (sc.rounds) {
    if (dealtGiven || sc.last) fail('give a rounds history, or dealt and last, not both');
    if (sc.rounds.length !== n) fail(`its rounds history holds ${sc.rounds.length} rounds, not the ${n} before round ${state.round}`);
    past = sc.rounds;
  } else if (n === 0) {
    if (dealtGiven || sc.last) fail('round 1 has no rounds before it, so no dealt or last');
    past = [];
  } else {
    const dealt = perSide((s) => sc.sides[s].dealt ?? state.sides[other(s)].heartcapMaxHp - state.sides[other(s)].heartcapHp);
    const last = sc.last?.damage ?? dealt;
    const rest = perSide((s) => dealt[s] - last[s]);
    if (SIDES.some((s) => rest[s] < 0 || (n === 1 && rest[s] > 0))) fail(`its last round's damage must be ${n === 1 ? '' : 'at most '}what each side has dealt`);
    past = Array.from({ length: n }, (_, i) => ({
      damage: perSide((s) => (i === n - 1 ? last[s] : 0) + (i === 0 && n > 1 ? rest[s] : 0)),
      ...(i === n - 1 && sc.last?.lanes ? { lanes: sc.last.lanes } : {}),
    }));
  }
  const hp = perSide((s) => state.sides[s].heartcapMaxHp);
  return past.map((r, i): RoundResult => {
    if (r.lanes && r.lanes.length !== state.lanes.length) fail(`round ${i + 1} names ${r.lanes.length} lanes, not ${state.lanes.length}`);
    const damage = r.damage ?? { player: 0, enemy: 0 };
    for (const s of SIDES) hp[s] = Math.max(0, hp[s] - damage[other(s)]);
    return {
      round: i + 1,
      lanes: state.lanes.map((_, l) => ({ winner: r.lanes?.[l] ?? null, survivors: { player: 0, enemy: 0 }, capped: false, ticks: 0, damage: 0 })),
      damage: { ...damage },
      stormBp: 10000,
      capped: false,
      heartcaps: i === n - 1 ? perSide((s) => state.sides[s].heartcapHp) : { ...hp },
      fielded: perSide((s) => (r.fielded?.[s] ?? []).map((f) => ({ unitId: f.unit, tier: f.tier ?? 1, count: f.count, augments: [], lane: f.lane ?? 0 }))),
      damageByBuilding: { player: {}, enemy: {} },
      survivorsByBuilding: { player: {}, enemy: {} },
      stats: perSide(() => emptyRoundStats()),
    };
  });
}

/** Puts a building on one of its side's plots, as a plant or a scenario does. Ids rise, so `buildings` stays sorted by id. */
export function addBuilding(state: BattleState, side: Side, buildingId: string, plot: number, pricePaid: number): BuildingState {
  if (!state.compiled[side].buildings[buildingId]) throw new Error(`${buildingId} is not in ${side}'s kit`);
  const p = state.sides[side].plots[plot];
  if (!p) throw new Error(`${side} has no plot ${plot}`);
  const b: BuildingState = { id: state.nextId++, side, buildingId, plot, plantedRound: state.round, pricePaid, fielded: false, mergeOn: true };
  state.buildings.push(b);
  p.building = b.id;
  state.stats[side].buildingTypes[String(b.id)] = buildingId;
  return b;
}

/**
 * Puts a unit on the field at (x, y), at full HP: its squad's own stats if its building's squad has them
 * (T046), else its side's. Ids rise, so `units` stays sorted by id.
 */
export function addUnit(
  state: BattleState, side: Side, unitId: string, lane: number, x: number, y: number, sourceBuildingId: number, tier: Tier = 1,
): UnitState {
  const def = state.compiled[side].units[unitId];
  if (!def) throw new Error(`${side} fields no ${unitId}`);
  const t = (squadOf(state, sourceBuildingId)?.stats ?? def).tiers[tier - 1]!;
  const u: UnitState = {
    id: state.nextId++,
    arrival: state.clash ? state.clash.arrived[side]++ : 0,
    side, lane, unitId, tier,
    x, y, px: x, py: y, slotY: y,
    hp: t.hp, maxHp: t.hp, supply: t.supply,
    cooldown: 0, targetId: 0, lastCombatTick: -100000, lastAttackTick: -1,
    mergeOn: true, sourceBuildingId,
    knit: undefined, // declared up front so every unit keeps one object shape
  };
  state.units.push(u);
  return u;
}
