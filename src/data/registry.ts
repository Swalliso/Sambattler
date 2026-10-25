// Loads raw JSON (keyed by path relative to data/), validates it with zod, indexes it and checks
// cross-references (SPEC §14.1). Pure: the caller supplies the file contents.
import type { z } from 'zod';
import {
  BalanceSchema, BalanceTargetsSchema, BotSchema, BuildingSchema, FactionSchema, GeneralSchema,
  MapSchema, ScenarioSchema, SpriteSheetSchema, UnitSchema,
} from './schema.ts';
import type {
  BalanceDef, BalanceTargets, BotDef, BuildingDef, FactionDef, GeneralDef, MapDef, ScenarioDef,
  SpriteDef, UnitDef,
} from './schema.ts';

/** Raw data files keyed by their path relative to `data/`, e.g. `maps/bogwater-hollow.json`. */
export type RawContent = Record<string, unknown>;

export interface Content {
  balance: BalanceDef;
  targets: BalanceTargets;
  factions: Record<string, FactionDef>;
  buildings: Record<string, BuildingDef>;
  /** Building ids in data-file order (stable iteration for UI and AI). */
  buildingOrder: string[];
  units: Record<string, UnitDef>;
  maps: Record<string, MapDef>;
  sprites: Record<string, SpriteDef>;
  spriteOrder: string[];
  generals: Record<string, GeneralDef>;
  bots: Record<string, BotDef>;
  scenarios: Record<string, ScenarioDef>;
}

export class ContentError extends Error {
  constructor(public readonly problems: string[]) {
    super(`Invalid content (${problems.length} problem${problems.length === 1 ? '' : 's'}):\n- ${problems.join('\n- ')}`);
    this.name = 'ContentError';
  }
}

/** Sprites the renderer always needs, besides those referenced by units and buildings. */
export const REQUIRED_SPRITES = [
  't-soil', 't-soil2', 't-loam', 't-stump', 't-wall',
  'heartcap-cap', 'heartcap-stalk', 'heartcap-base', 'turret',
];

export function loadContent(raw: RawContent): Content {
  const problems: string[] = [];
  const paths = Object.keys(raw).sort();

  function parse<S extends z.ZodType>(schema: S, path: string): z.infer<S> | undefined {
    const res = schema.safeParse(raw[path]);
    if (!res.success) {
      for (const issue of res.error.issues) {
        problems.push(`${path}: ${issue.path.length ? issue.path.join('.') + ': ' : ''}${issue.message}`);
      }
      return undefined;
    }
    return res.data;
  }
  function need(path: string): boolean {
    if (!(path in raw)) { problems.push(`missing data file ${path}`); return false; }
    return true;
  }

  const balance = need('balance.json') ? parse(BalanceSchema, 'balance.json') : undefined;
  const targets = need('balance-targets.json') ? parse(BalanceTargetsSchema, 'balance-targets.json') : undefined;

  const factions: Record<string, FactionDef> = {};
  const buildings: Record<string, BuildingDef> = {};
  const buildingOrder: string[] = [];
  const units: Record<string, UnitDef> = {};
  const maps: Record<string, MapDef> = {};
  const sprites: Record<string, SpriteDef> = {};
  const spriteOrder: string[] = [];
  const generals: Record<string, GeneralDef> = {};
  const bots: Record<string, BotDef> = {};
  const scenarios: Record<string, ScenarioDef> = {};

  function addUnique<T extends { id: string }>(into: Record<string, T>, item: T, path: string, kind: string): boolean {
    if (item.id in into) { problems.push(`${path}: duplicate ${kind} id "${item.id}"`); return false; }
    into[item.id] = item;
    return true;
  }

  for (const path of paths) {
    let m: RegExpMatchArray | null;
    if ((m = path.match(/^factions\/([^/]+)\/faction\.json$/))) {
      const f = parse(FactionSchema, path);
      if (f) {
        if (f.id !== m[1]) problems.push(`${path}: faction id "${f.id}" does not match its folder`);
        addUnique(factions, f, path, 'faction');
      }
    } else if (/^factions\/[^/]+\/buildings\.json$/.test(path)) {
      const list = parse(BuildingSchema.array(), path);
      for (const b of list ?? []) if (addUnique(buildings, b, path, 'building')) buildingOrder.push(b.id);
    } else if (/^factions\/[^/]+\/units\.json$/.test(path)) {
      for (const u of parse(UnitSchema.array(), path) ?? []) addUnique(units, u, path, 'unit');
    } else if ((m = path.match(/^maps\/([^/]+)\.json$/))) {
      const map = parse(MapSchema, path);
      if (map) {
        if (map.id !== m[1]) problems.push(`${path}: map id "${map.id}" does not match its file name`);
        addUnique(maps, map, path, 'map');
      }
    } else if ((m = path.match(/^sprites\/([^/]+)\.json$/))) {
      const sheet = parse(SpriteSheetSchema, path);
      if (sheet) {
        if (sheet.sheet !== m[1]) problems.push(`${path}: sheet "${sheet.sheet}" does not match its file name`);
        for (const s of sheet.sprites) if (addUnique(sprites, s, path, 'sprite')) spriteOrder.push(s.id);
      }
    } else if ((m = path.match(/^scenarios\/([^/]+)\.json$/))) {
      const s = parse(ScenarioSchema, path);
      if (s) {
        if (s.id !== m[1]) problems.push(`${path}: scenario id "${s.id}" does not match its file name`);
        addUnique(scenarios, s, path, 'scenario');
      }
    } else if (path === 'generals.json') {
      for (const g of parse(GeneralSchema.array(), path) ?? []) addUnique(generals, g, path, 'general');
    } else if (path === 'bots.json') {
      for (const b of parse(BotSchema.array(), path) ?? []) addUnique(bots, b, path, 'bot');
    } else if (path === 'balance.json' || path === 'balance-targets.json') {
      // parsed above
    } else {
      problems.push(`${path}: unrecognised data file (no schema for this path)`);
    }
  }

  // ---- cross-references ----
  const spriteRef = (owner: string, id: string) => {
    if (!(id in sprites)) problems.push(`${owner}: sprite "${id}" does not exist`);
  };
  const buildingRef = (owner: string, id: string) => {
    if (!(id in buildings)) problems.push(`${owner}: building "${id}" does not exist`);
  };
  for (const id of REQUIRED_SPRITES) spriteRef('renderer', id);
  for (const u of Object.values(units)) spriteRef(`unit ${u.id}`, u.sprite);
  for (const b of Object.values(buildings)) {
    spriteRef(`building ${b.id}`, b.sprite);
    if (b.spawn && !(b.spawn.unit in units)) problems.push(`building ${b.id}: spawn unit "${b.spawn.unit}" does not exist`);
  }
  for (const f of Object.values(factions)) for (const id of f.buildings) buildingRef(`faction ${f.id}`, id);
  for (const s of Object.values(sprites)) {
    if (s.factionSwap && !Object.keys(s.palette).some((k) => Object.values(factions).some((f) => k in f.palette))) {
      problems.push(`sprite ${s.id}: factionSwap is set but no palette key is swappable`);
    }
  }
  const kitRefs = (owner: string, opener: string[], weights: Record<string, number>, limits: Record<string, unknown> | undefined) => {
    for (const id of opener) buildingRef(`${owner} opener`, id);
    for (const id of Object.keys(weights)) buildingRef(`${owner} weights`, id);
    for (const id of Object.keys(limits ?? {})) buildingRef(`${owner} limits`, id);
  };
  for (const g of Object.values(generals)) {
    if (!(g.faction in factions)) problems.push(`general ${g.id}: faction "${g.faction}" does not exist`);
    kitRefs(`general ${g.id}`, g.opener, g.weights, g.limits);
  }
  for (const b of Object.values(bots)) kitRefs(`bot ${b.id}`, b.opener, b.weights, b.limits);
  for (const map of Object.values(maps)) {
    const W = map.width, H = map.height;
    for (let r = 0; r < H; r++) {
      for (let c = 0; c < W; c++) {
        const a = map.tiles[r]?.[c];
        const b = map.tiles[H - 1 - r]?.[W - 1 - c];
        if (a !== b) { problems.push(`map ${map.id}: not point-symmetric at (${c}, ${r})`); r = H; break; }
      }
    }
  }
  for (const s of Object.values(scenarios)) {
    if (!(s.map in maps)) problems.push(`scenario ${s.id}: map "${s.map}" does not exist`);
    for (const side of [s.sides.player, s.sides.enemy]) {
      for (const b of side.buildings ?? []) buildingRef(`scenario ${s.id}`, b.building);
      for (const id of side.kit ?? []) buildingRef(`scenario ${s.id} kit`, id);
      for (const u of side.units ?? []) if (!(u.unit in units)) problems.push(`scenario ${s.id}: unit "${u.unit}" does not exist`);
    }
  }
  if (balance) {
    for (const map of Object.values(maps)) {
      if (map.lanes.length > 3) problems.push(`map ${map.id}: at most 3 lanes`);
    }
  }

  if (problems.length || !balance || !targets) throw new ContentError(problems.length ? problems : ['balance files failed to parse']);
  return { balance, targets, factions, buildings, buildingOrder, units, maps, sprites, spriteOrder, generals, bots, scenarios };
}
