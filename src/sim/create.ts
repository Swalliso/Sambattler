// Battle construction: from a config (deploy phase) or from a scenario file (live, pre-placed).
import type { Content } from '../data/registry.ts';
import { compileRules, compileSide, secToTicks } from './compile.ts';
import { seedStream } from './rng.ts';
import { resolveAiProfile } from './ai/profiles.ts';
import { placementProblem } from './placement.ts';
import { clampToLane, laneOfRow, unitRadius } from './world.ts';
import { SIDES } from './state.ts';
import type {
  BattleConfig, BattleState, BuildingState, Controller, LaneState, Side, SideConfig, SideState, SideStats, UnitState,
} from './state.ts';

export function emptyStats(): SideStats {
  return {
    spawned: {},
    merges: { '2': 0, '3': 0 },
    damageDealt: 0,
    damageByBuilding: {},
    damageBySource: {},
    heartcapDamageTaken: 0,
    goldEarned: { stipend: 0, economy: 0, comeback: 0, interest: 0 },
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

/** Parses a controller string: human | bot:<id> | general:<id> (general:scripted in M1). */
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

/** Builds a Milestone 1 battle config with the rules' defaults. */
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
    flags: { merging: false, drafts: false, adaptiveGeneral: false, powers: false, ...opts.flags },
  };
  if (opts.test) config.test = opts.test;
  return config;
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
  const rules = compileRules(content, config);
  const sideState = (s: Side): SideState => {
    const sc = config[s];
    const turrets = rules.test.turrets ? content.balance.turret.perLane * lanes.length : 0;
    const st: SideState = {
      gold: sc.startingGold,
      supplyUsed: 0,
      supplyCap: content.balance.supplyCap,
      heartcapHp: sc.heartcapHp,
      heartcapMaxHp: sc.heartcapMaxHp,
      turretCooldowns: new Array<number>(turrets).fill(0),
      powerCooldown: 0,
      kit: [...sc.kit],
    };
    if (sc.controller.kind !== 'human') st.ai = resolveAiProfile(content, sc.controller, sc, rules);
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
    compiled: { player: compileSide(content, config.player), enemy: compileSide(content, config.enemy) },
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
    flags: over.flags ?? {},
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
        addUnit(state, s, g.unit, lane, x, y, 0, true);
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
    mergeOn: true,
    holding: false,
  };
  state.buildings.push(b);
  return b;
}

export function addUnit(state: BattleState, side: Side, unitId: string, lane: number, x: number, y: number, sourceBuildingId: number, scenario = false): UnitState {
  const def = state.compiled[side].units[unitId];
  if (!def) {
    throw new Error(scenario ? `${side} has no compiled unit ${unitId}; add its building to the scenario kit` : `${side} cannot spawn ${unitId}`);
  }
  const u: UnitState = {
    id: state.nextId++,
    side, lane, unitId, tier: 1,
    x, y, px: x, py: y, spawnY: y,
    hp: def.hp, maxHp: def.hp, supply: def.supply,
    cooldown: 0, targetId: 0, lastCombatTick: -100000, lastAttackTick: -1,
    mergeOn: true, sourceBuildingId,
  };
  clampToLane(state, u, unitRadius(state, u));
  u.px = u.x; u.py = u.y; u.spawnY = u.y;
  state.units.push(u);
  state.sides[side].supplyUsed += u.supply;
  return u;
}
