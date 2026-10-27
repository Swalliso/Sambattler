// Battle construction: from a config (deploy phase) or from a scenario file (live, pre-placed).
import type { Content } from '../data/registry.ts';
import { buildLibrary, compileRules, compileSides, configLoadout, creationStat, secToTicks } from './compile.ts';
import { seedStream } from './rng.ts';
import { adaptiveRoster, isAdaptive, resolveAiProfile } from './ai/profiles.ts';
import { placementProblem } from './placement.ts';
import { MAX_RADIUS } from './targets.ts';
import { clampToLane, laneOfRow, supplyCapOf, unitRadius } from './world.ts';
import { SIDES } from './state.ts';
import type {
  BattleConfig, BattleModifier, BattleState, BuildingState, Controller, DraftPool, LaneState, Loadout, Side, SideConfig, SideState, SideStats,
  Tier, UnitState,
} from './state.ts';

export type Flags = BattleConfig['flags'];

/** The milestone this build implements. Feature flags default to what it ships (SPEC §15.2). */
export const MILESTONE = 4;
export const DEFAULT_FLAGS: Readonly<Flags> = { merging: true, drafts: false, adaptiveGeneral: true, powers: false };

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

export function emptyStats(): SideStats {
  return {
    spawned: {},
    merges: { '2': 0, '3': 0 },
    damageDealt: 0,
    damageByBuilding: {},
    buildingTypes: {},
    damageBySource: {},
    heartcapDamageTaken: 0,
    goldEarned: { stipend: 0, economy: 0, comeback: 0, interest: 0, effects: 0, drafts: 0 },
    healingDone: 0,
    drafted: [],
    goldByBuilding: {},
    buildingsBuilt: 0,
    buildingsLost: 0,
    buildingsDestroyed: 0,
    buildingsSold: 0,
    unitsLost: 0,
    maxEldersAlive: 0,
    maxGoldBanked: 0,
    columnsLost: 0,
    rejectedCommands: 0,
  };
}

/** Parses a controller string: human | bot:<id> | general:<id> (e.g. general:mother-mold). */
export function parseController(text: string): Controller {
  if (text === 'human' || text === 'none' || text === 'idle') return { kind: 'human' };
  const m = text.match(/^(bot|general):(.+)$/);
  if (!m) throw new Error(`bad controller "${text}" (expected human, bot:<id> or general:<id>)`);
  return m[1] === 'bot' ? { kind: 'bot', id: m[2]! } : { kind: 'general', id: m[2]! };
}

export function controllerLabel(c: Controller): string {
  return c.kind === 'human' ? 'human' : `${c.kind}:${c.id}`;
}

export interface BattleOptions {
  seed: number;
  mapId?: string;
  battleIndex?: number;
  player?: string | Controller;
  enemy?: string | Controller;
  flags?: Partial<BattleConfig['flags']>;
  startingGold?: Partial<Record<Side, number>>;
  test?: BattleConfig['test'];
}

/** Builds a battle config with the rules' defaults and the milestone's feature flags. */
export function makeConfig(content: Content, opts: BattleOptions): BattleConfig {
  const bal = content.balance;
  const battleIndex = opts.battleIndex ?? 1;
  const gold = bal.startingGold + bal.startingGoldPerBattle * (battleIndex - 1);
  const asCtl = (c: string | Controller | undefined, dflt: string): Controller =>
    typeof c === 'object' ? c : parseController(c ?? dflt);
  const side = (s: Side, ctl: Controller): SideConfig => {
    const faction = s === 'player' ? 'velvet-bloom' : 'gray-rot';
    const kit = [...(content.factions[faction]?.buildings ?? [])];
    const hp = s === 'player' ? bal.heartcapPlayerHp : bal.heartcapEnemyHp.base + bal.heartcapEnemyHp.perBattle * (battleIndex - 1);
    return {
      faction, controller: ctl, kit, heartcapHp: hp, heartcapMaxHp: hp,
      startingGold: gold + (opts.startingGold?.[s] ?? 0),
    };
  };
  const config: BattleConfig = {
    seed: opts.seed >>> 0,
    battleIndex,
    mapId: opts.mapId ?? 'bogwater-hollow',
    player: side('player', asCtl(opts.player, 'human')),
    enemy: side('enemy', asCtl(opts.enemy, 'general:scripted')),
    flags: { ...DEFAULT_FLAGS, ...opts.flags },
  };
  // a single battle with drafts on gives the player the stand-in commander's pool (SPEC §8.4)
  if (config.flags.drafts) config.player.draft = draftPool(content, config.player.faction, STAND_IN_COMMANDER, config.flags);
  if (opts.test) config.test = opts.test;
  const passives = generalPassives(content, config);
  if (passives.length) config.modifiers = passives;
  return config;
}

/** Each general's personality passive (SPEC §7.7) as a battle modifier on its own side. */
export function generalPassives(content: Content, config: Pick<BattleConfig, 'player' | 'enemy'>): BattleModifier[] {
  const out: BattleModifier[] = [];
  for (const s of SIDES) {
    const ctl = config[s].controller;
    const g = ctl.kind === 'general' ? content.generals[ctl.id] : undefined;
    if (g?.passive) out.push({ side: s, source: `general:${g.id}`, effects: g.passive });
  }
  return out;
}

/** The commander every run uses until commanders arrive in M5 (the kickoff stand-in: Vesper's pools, no power). */
export const STAND_IN_COMMANDER = 'vesper';

/**
 * A commander's draft pool (SPEC §8.4): its core buildings, every other building of the faction
 * (the shared pool, minus bans) and every relic whose required feature is on.
 */
export function draftPool(content: Content, faction: string, commanderId: string, flags: Flags, bans: string[] = []): DraftPool {
  const cmd = content.commanders[commanderId];
  if (!cmd) throw new Error(`unknown commander ${commanderId}`);
  const roster = content.factions[faction]?.buildings ?? [];
  const core = cmd.core.filter((id) => roster.includes(id));
  const shared = roster.filter((id) => !core.includes(id) && !bans.includes(id));
  const relics = content.relicOrder.filter((id) => {
    const r = content.relics[id]!;
    return r.requires !== 'powers' || flags.powers;
  });
  return { core, shared, relics };
}

export function createBattle(content: Content, config: BattleConfig): BattleState {
  const map = content.maps[config.mapId];
  if (!map) throw new Error(`unknown map ${config.mapId}`);
  for (const s of SIDES) {
    for (const id of config[s].kit) if (!content.buildings[id]) throw new Error(`${s} kit: unknown building ${id}`);
  }
  const W = map.width;
  const lanes: LaneState[] = map.lanes.map((l) => {
    const owner: number[] = [];
    for (let c = 0; c < W; c++) owner.push(c < map.homeCols ? 1 : c >= W - map.homeCols ? 2 : 0);
    return {
      rowStart: l.rowStart, rowEnd: l.rowEnd, owner,
      pBorder: map.homeCols - 1, eBorder: W - map.homeCols,
      capture: { player: { column: map.homeCols, progress: 0 }, enemy: { column: W - map.homeCols - 1, progress: 0 } },
    };
  });
  const rules = compileRules(content.balance, config);
  const buildingIds = new Set<string>();
  const relicIds = new Set<string>();
  for (const s of SIDES) {
    const sc = config[s];
    for (const id of [...sc.kit, ...(sc.draft?.core ?? []), ...(sc.draft?.shared ?? [])]) buildingIds.add(id);
    for (const id of [...(sc.relics ?? []), ...(sc.draft?.relics ?? [])]) relicIds.add(id);
    // an adaptive general may draft a missing counter from its roster (SPEC §7.4)
    if (isAdaptive(content, sc.controller, config.flags)) for (const id of adaptiveRoster(content, sc)) buildingIds.add(id);
  }
  const library = buildLibrary(content, [...buildingIds].sort(), [...relicIds].sort());
  const loadouts: Record<Side, Loadout> = { player: configLoadout(config.player), enemy: configLoadout(config.enemy) };
  const compiled = compileSides(library, loadouts, config.modifiers);
  for (const s of SIDES) {
    for (const u of Object.values(compiled[s].units)) {
      for (const t of u.tiers) if (t.radius > MAX_RADIUS) throw new Error(`unit ${u.id}: radius ${t.radius} exceeds MAX_RADIUS ${MAX_RADIUS}`);
    }
  }
  const sideState = (s: Side): SideState => {
    const sc = config[s];
    const turrets = rules.test.turrets ? content.balance.turret.perLane * lanes.length : 0;
    // side.heartcapMaxHp (e.g. the Fortified elite) scales both the maximum and the current HP
    const maxHp = Math.max(1, Math.round(creationStat(library, loadouts, config.modifiers, s, 'side.heartcapMaxHp', sc.heartcapMaxHp)));
    const hp = maxHp === sc.heartcapMaxHp ? sc.heartcapHp : Math.max(1, Math.round((sc.heartcapHp * maxHp) / sc.heartcapMaxHp));
    const st: SideState = {
      gold: Math.max(0, Math.round(creationStat(library, loadouts, config.modifiers, s, 'side.startingGold', sc.startingGold))),
      supplyUsed: 0,
      supplyCap: compiled[s].supplyCap,
      heartcapHp: hp,
      heartcapMaxHp: maxHp,
      turretCooldowns: new Array<number>(turrets).fill(0),
      powerCooldown: 0,
      kit: [...loadouts[s].kit],
      upgrades: loadouts[s].upgrades,
      relics: loadouts[s].relics,
      draftsOpened: 0,
    };
    if (sc.controller.kind !== 'human') st.ai = resolveAiProfile(content, sc.controller, sc, rules, buildingIds, config.flags, library);
    return st;
  };
  const state: BattleState = {
    v: 1,
    config,
    tick: 0,
    phase: 'deploy',
    held: false,
    rng: {
      combat: seedStream(config.seed, 'combat', config.battleIndex),
      ai: seedStream(config.seed, 'ai', config.battleIndex),
      draft: seedStream(config.seed, 'draft', config.battleIndex),
    },
    nextId: 1,
    nextSeq: { player: 0, enemy: 0 },
    nextHitSeq: 0,
    rules,
    library,
    map: { id: map.id, name: map.name, width: map.width, height: map.height, homeCols: map.homeCols, tiles: [...map.tiles] },
    sides: { player: sideState('player'), enemy: sideState('enemy') },
    lanes,
    units: [],
    buildings: [],
    hits: [],
    sporestorm: 0,
    queue: [],
    log: [],
    events: [],
    compiled,
    stats: { player: emptyStats(), enemy: emptyStats() },
    frontLine: lanes.map((l) => [[0, l.pBorder, l.eBorder]]),
  };
  return state;
}

export interface ScenarioOverrides {
  seed?: number;
  player?: string;
  enemy?: string;
  flags?: Partial<BattleConfig['flags']>;
}

/** Builds a live battle from `data/scenarios/<id>.json` (pre-placed buildings, units, gold, clock). */
export function createFromScenario(content: Content, scenarioId: string, over: ScenarioOverrides = {}): BattleState {
  const sc = content.scenarios[scenarioId];
  if (!sc) throw new Error(`unknown scenario ${scenarioId}`);
  const config = makeConfig(content, {
    seed: over.seed ?? 1,
    mapId: sc.map,
    player: over.player ?? sc.controllers?.player ?? 'human',
    enemy: over.enemy ?? sc.controllers?.enemy ?? 'human',
    flags: over.flags ?? sc.flags ?? {},
  });
  config.scenario = sc.id;
  if (sc.test) config.test = { ...sc.test };
  for (const s of SIDES) {
    const def = sc.sides[s];
    if (def.kit) config[s].kit = [...def.kit];
    if (def.heartcapHp !== undefined) config[s].heartcapHp = def.heartcapHp;
    if (def.gold !== undefined) config[s].startingGold = def.gold;
  }
  const state = createBattle(content, config);
  state.phase = 'live';
  state.tick = secToTicks(sc.clockSeconds ?? 0, content.balance.tickRate);
  state.sporestorm = stormStacksAt(state, state.tick);
  const W = state.map.width;
  (sc.lanes ?? []).forEach((l, i) => {
    const lane = state.lanes[i];
    if (!lane) throw new Error(`scenario ${sc.id}: lane ${i} does not exist`);
    if (l.pBorder < state.map.homeCols - 1 || l.eBorder > W - state.map.homeCols || l.pBorder >= l.eBorder) {
      throw new Error(`scenario ${sc.id}: bad borders for lane ${i}`);
    }
    lane.pBorder = l.pBorder;
    lane.eBorder = l.eBorder;
    for (let c = 0; c < W; c++) lane.owner[c] = c <= l.pBorder ? 1 : c >= l.eBorder ? 2 : 0;
    lane.capture.player = { column: l.pBorder + 1, progress: 0 };
    lane.capture.enemy = { column: l.eBorder - 1, progress: 0 };
    state.frontLine[i] = [[state.tick, l.pBorder, l.eBorder]];
  });
  for (const s of SIDES) {
    const def = sc.sides[s];
    if (state.sides[s].ai) state.sides[s].ai.openerDone = true;
    for (const b of def.buildings ?? []) {
      const lane = laneOfRow(state, b.row);
      const problem = placementProblem(state, s, b.building, lane, b.col, b.row);
      if (problem) throw new Error(`scenario ${sc.id}: ${s} ${b.building} at (${b.col}, ${b.row}): ${problem}`);
      addBuilding(state, s, b.building, lane, b.col, b.row, 0);
    }
    for (const g of def.units ?? []) {
      const count = g.count ?? 1, rows = g.rows ?? 1, dx = g.dx ?? 0.6, dy = g.dy ?? 0.6;
      for (let i = 0; i < count; i++) {
        const col = Math.floor(i / rows), row = i % rows;
        const x = g.x + col * dx, y = g.y + row * dy;
        const lane = g.lane ?? laneOfRow(state, Math.floor(y));
        if (lane < 0) throw new Error(`scenario ${sc.id}: unit at y=${y} is not in a lane`);
        if (!state.compiled[s].units[g.unit]) throw new Error(`scenario ${sc.id}: ${s} has no compiled unit ${g.unit}; add its building to the scenario kit`);
        addUnit(state, s, g.unit, lane, x, y, 0, g.tier ?? 1);
      }
    }
  }
  return state;
}

export function stormStacksAt(state: BattleState, tick: number): number {
  const st = state.rules.storm;
  if (tick < st.startTick) return 0;
  return Math.min(st.maxStacks, Math.floor((tick - st.startTick) / st.everyTicks) + 1);
}

export function addBuilding(state: BattleState, side: Side, buildingId: string, lane: number, col: number, row: number, pricePaid: number): BuildingState {
  const def = state.compiled[side].buildings[buildingId];
  if (!def) throw new Error(`${side} cannot build ${buildingId}`);
  const b: BuildingState = {
    id: state.nextId++,
    side, buildingId, lane, col, row,
    hp: def.hp, maxHp: def.hp,
    timer: def.spawn ? def.spawn.firstHalfTicks : 0,
    cooldown: 0,
    targetId: 0,
    lastAttackTick: -1,
    lastDamagedTick: -100000,
    placedTick: state.tick,
    pricePaid,
    hasProduced: false,
    mergeOn: true,
    holding: false,
  };
  state.buildings.push(b);
  state.stats[side].buildingTypes[String(b.id)] = buildingId;
  if (def.utility) state.sides[side].supplyCap = supplyCapOf(state, side);
  return b;
}

export function addUnit(
  state: BattleState, side: Side, unitId: string, lane: number, x: number, y: number, sourceBuildingId: number, tier: Tier = 1,
): UnitState {
  const def = state.compiled[side].units[unitId];
  if (!def) throw new Error(`${side} cannot spawn ${unitId}`);
  const t = def.tiers[tier - 1]!;
  const u: UnitState = {
    id: state.nextId++,
    side, lane, unitId, tier,
    x, y, px: x, py: y, spawnY: y,
    hp: t.hp, maxHp: t.hp, supply: t.supply,
    cooldown: 0, targetId: 0, lastCombatTick: -100000, lastAttackTick: -1,
    mergeOn: true, sourceBuildingId,
    knit: undefined, // declared up front so every unit keeps one object shape
  };
  clampToLane(state, u, unitRadius(state, u));
  u.px = u.x; u.py = u.y; u.spawnY = u.y;
  state.units.push(u);
  state.sides[side].supplyUsed += u.supply;
  return u;
}
