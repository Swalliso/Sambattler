// Loads raw JSON (keyed by path relative to data/), validates it with zod, indexes it and checks
// cross-references (SPEC §14.1). Pure: the caller supplies the file contents.
import type { z } from 'zod';
import {
  BalanceSchema, BalanceTargetsSchema, BotSchema, BuildingSchema, CommanderSchema, EliteSchema, EventSchema,
  FactionSchema, GeneralSchema, MapSchema, RelicSchema, ScenarioSchema, SoundBankSchema, SpriteSheetSchema, UnitSchema, UpgradeTrackSchema,
} from './schema.ts';
import type {
  BalanceDef, BalanceTargets, BotDef, BuildingDef, CommanderDef, EffectBundle, EliteDef, EventDef, FactionDef,
  GeneralDef, MapDef, RelicDef, ScenarioDef, SoundBankDef, SoundDef, SpriteBands, SpriteDef, UnitDef, UpgradeTrackDef,
} from './schema.ts';
import { emplacementShapeProblems, shapeProblems, unitShapeProblems } from './shapes.ts';

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
  /** Each sprite's sheet, the name of its file under data/sprites/. */
  spriteSheet: Record<string, string>;
  /** Each sheet's body bands (SPEC §14.3), for the sheets that give them; display data the battle never reads. */
  bands: Record<string, SpriteBands>;
  generals: Record<string, GeneralDef>;
  bots: Record<string, BotDef>;
  scenarios: Record<string, ScenarioDef>;
  /** Upgrade tracks keyed by building id (SPEC §11.6). */
  upgrades: Record<string, UpgradeTrackDef>;
  relics: Record<string, RelicDef>;
  /** Relic ids in data-file order. */
  relicOrder: string[];
  events: Record<string, EventDef>;
  eventOrder: string[];
  elites: Record<string, EliteDef>;
  eliteOrder: string[];
  commanders: Record<string, CommanderDef>;
  /** The sound bank (data/sounds.json), read only by src/audio and src/app: it never enters sim state. */
  audio: SoundBankDef;
  sounds: Record<string, SoundDef>;
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
  'f-ceiling', 'f-bed', 'f-hyphae', 'f-hyphae-rot', 'f-earth', 'f-side', 'f-crown',
  'i-pip',
];

/**
 * Sounds the game plays by id (src/app/sound.ts, src/app/battleSound.ts), besides the ambient drips. The ids of
 * v1's retired events stay until R2b's T129 drops them (§13.9).
 */
export const REQUIRED_SOUNDS = [
  'place', 'sell', 'illegal', 'income', 'spawn', 'column-gained', 'column-lost', 'building-lost', 'building-razed',
  'knit', 'merge', 'merge-elder', 'heartcap-hit', 'counter-warn', 'counter-active', 'sporestorm', 'wave', 'begin',
  'draft-open', 'draft-pick', 'win', 'loss', 'ui-hover', 'ui-click', 'ui-node', 'ui-choice', 'ui-toggle',
  'arrive', 'plan', 'counter', 'power', 'lane-won', 'lane-lost',
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

  for (const f of ['upgrades.json', 'relics.json', 'events.json', 'elites.json', 'commanders.json']) need(f);
  const balance = need('balance.json') ? parse(BalanceSchema, 'balance.json') : undefined;
  const audio = need('sounds.json') ? parse(SoundBankSchema, 'sounds.json') : undefined;
  const targets = need('balance-targets.json') ? parse(BalanceTargetsSchema, 'balance-targets.json') : undefined;

  const factions: Record<string, FactionDef> = {};
  const buildings: Record<string, BuildingDef> = {};
  const buildingOrder: string[] = [];
  const units: Record<string, UnitDef> = {};
  const maps: Record<string, MapDef> = {};
  const sprites: Record<string, SpriteDef> = {};
  const spriteOrder: string[] = [];
  const spriteSheet: Record<string, string> = {};
  const bands: Record<string, SpriteBands> = {};
  const generals: Record<string, GeneralDef> = {};
  const bots: Record<string, BotDef> = {};
  const scenarios: Record<string, ScenarioDef> = {};
  const upgrades: Record<string, UpgradeTrackDef> = {};
  const relics: Record<string, RelicDef> = {};
  const relicOrder: string[] = [];
  const events: Record<string, EventDef> = {};
  const eventOrder: string[] = [];
  const elites: Record<string, EliteDef> = {};
  const eliteOrder: string[] = [];
  const commanders: Record<string, CommanderDef> = {};
  const sounds: Record<string, SoundDef> = {};

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
        if (sheet.bands) bands[sheet.sheet] = sheet.bands;
        for (const s of sheet.sprites) {
          if (!addUnique(sprites, s, path, 'sprite')) continue;
          spriteOrder.push(s.id);
          spriteSheet[s.id] = sheet.sheet;
        }
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
    } else if (path === 'upgrades.json') {
      for (const t of parse(UpgradeTrackSchema.array(), path) ?? []) {
        if (t.building in upgrades) problems.push(`${path}: building "${t.building}" has two upgrade tracks`);
        else upgrades[t.building] = t;
      }
    } else if (path === 'relics.json') {
      for (const r of parse(RelicSchema.array(), path) ?? []) if (addUnique(relics, r, path, 'relic')) relicOrder.push(r.id);
    } else if (path === 'events.json') {
      for (const e of parse(EventSchema.array(), path) ?? []) if (addUnique(events, e, path, 'event')) eventOrder.push(e.id);
    } else if (path === 'elites.json') {
      for (const e of parse(EliteSchema.array(), path) ?? []) if (addUnique(elites, e, path, 'elite modifier')) eliteOrder.push(e.id);
    } else if (path === 'commanders.json') {
      for (const c of parse(CommanderSchema.array(), path) ?? []) addUnique(commanders, c, path, 'commander');
    } else if (path === 'balance.json' || path === 'balance-targets.json' || path === 'sounds.json') {
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
    if (b.squad && !(b.squad.unit in units)) problems.push(`building ${b.id}: squad unit "${b.squad.unit}" does not exist`);
  }
  for (const f of Object.values(factions)) for (const id of f.buildings) buildingRef(`faction ${f.id}`, id);
  for (const s of Object.values(sprites)) {
    if (s.factionSwap && !Object.keys(s.palette).some((k) => Object.values(factions).some((f) => k in f.palette))) {
      problems.push(`sprite ${s.id}: factionSwap is set but no palette key is swappable`);
    }
  }
  // the shape language (SPEC §5.8, §14.3; R4a): every unit sprite (`u-`, or one a unit draws) declares a shape,
  // every shape block against its sheet's bands, and every unit drawn with the body its armor gives. Units carry
  // no weapon mark (§5.8, 2026-11-01).
  const drawn: Record<string, string[]> = {};
  for (const u of Object.values(units)) (drawn[u.sprite] ??= []).push(u.id);
  for (const s of Object.values(sprites)) {
    const who = drawn[s.id] ? `unit ${drawn[s.id]!.join(', ')}: ` : '';
    if (!s.shape) {
      if (s.id.startsWith('u-') || drawn[s.id]) problems.push(`${who}sprite ${s.id} declares no shape, and every unit sprite needs one`);
      continue;
    }
    for (const p of shapeProblems(s, bands[spriteSheet[s.id]!])) problems.push(who + p);
  }
  for (const u of Object.values(units)) {
    const s = sprites[u.sprite];
    if (s) problems.push(...unitShapeProblems(u, s));
  }
  // an emplacement (§5.8, R4-Q5; R4a call 4): every tower with an attack stands in its slot on `e-<id>`, a
  // structure body. v1's battle still draws the tower as its building.
  for (const b of Object.values(buildings)) {
    if (b.kind !== 'tower' || !b.attack) continue;
    const s = sprites[`e-${b.id}`];
    if (!s) problems.push(`building ${b.id}: emplacement sprite "e-${b.id}" does not exist`);
    else if (!s.shape) problems.push(`building ${b.id}: emplacement sprite ${s.id} declares no shape`);
    else problems.push(...emplacementShapeProblems(b, s));
  }
  const kitRefs = (owner: string, opener: string[], weights: Record<string, number>, limits: Record<string, unknown> | undefined) => {
    for (const id of opener) buildingRef(`${owner} opener`, id);
    for (const id of Object.keys(weights)) buildingRef(`${owner} weights`, id);
    for (const id of Object.keys(limits ?? {})) buildingRef(`${owner} limits`, id);
  };
  for (const g of Object.values(generals)) {
    if (!(g.faction in factions)) problems.push(`general ${g.id}: faction "${g.faction}" does not exist`);
    kitRefs(`general ${g.id}`, g.opener, g.weights, g.limits);
    for (const id of g.preferred ?? []) buildingRef(`general ${g.id} preferred`, id);
    spriteRef(`general ${g.id}`, g.sprite);
    const roster = factions[g.faction]?.buildings ?? [];
    for (const id of [...g.opener, ...(g.preferred ?? [])]) if (!roster.includes(id)) problems.push(`general ${g.id}: ${id} is not in the ${g.faction} roster`);
  }
  for (const b of Object.values(bots)) kitRefs(`bot ${b.id}`, b.opener, b.weights, b.limits);
  const effectRefs = (owner: string, fx: EffectBundle | undefined) => {
    const sels = [...(fx?.modifiers ?? []).map((m) => m.where), ...(fx?.triggers ?? []).map((t) => t.if)];
    for (const w of sels) {
      if (w?.unit !== undefined && !(w.unit in units)) problems.push(`${owner}: unit "${w.unit}" does not exist`);
      if (w?.building !== undefined) buildingRef(owner, w.building);
    }
  };
  for (const t of Object.values(upgrades)) {
    buildingRef(`upgrade track ${t.building}`, t.building);
    t.levels.forEach((l, i) => effectRefs(`upgrade track ${t.building} level ${i + 1}`, l.effects));
  }
  for (const r of Object.values(relics)) effectRefs(`relic ${r.id}`, r.effects);
  for (const e of Object.values(elites)) effectRefs(`elite modifier ${e.id}`, e.effects);
  for (const g of Object.values(generals)) effectRefs(`general ${g.id} passive`, g.passive);
  for (const c of Object.values(commanders)) {
    for (const id of c.core) buildingRef(`commander ${c.id} core`, id);
    if (new Set(c.core).size !== c.core.length) problems.push(`commander ${c.id}: duplicate core building`);
    effectRefs(`commander ${c.id} passive`, c.passive.effects);
    spriteRef(`commander ${c.id}`, c.sprite);
  }
  const powerIds = Object.values(commanders).map((c) => c.power.id);
  if (new Set(powerIds).size !== powerIds.length) problems.push('commanders: two powers share an id');
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
    const owner = `scenario ${s.id}`;
    if (!(s.map in maps)) problems.push(`${owner}: map "${s.map}" does not exist`);
    else if (!maps[s.map]!.colony) problems.push(`${owner}: map "${s.map}" has no colony block`);
    for (const side of [s.sides.player, s.sides.enemy]) {
      for (const b of side.colony ?? []) buildingRef(owner, b.building);
      for (const id of side.kit ?? []) buildingRef(`${owner} kit`, id);
      if (side.commander && !(side.commander in commanders)) problems.push(`${owner}: commander "${side.commander}" does not exist`);
    }
    const unitIds = [...(s.clash?.units ?? []), ...(s.rounds ?? []).flatMap((r) => [...(r.fielded?.player ?? []), ...(r.fielded?.enemy ?? [])])].map((u) => u.unit);
    for (const id of unitIds) if (!(id in units)) problems.push(`${owner}: unit "${id}" does not exist`);
  }
  if (audio) {
    for (const s of audio.sounds) addUnique(sounds, s, 'sounds.json', 'sound');
    for (const id of REQUIRED_SOUNDS) if (!(id in sounds)) problems.push(`sounds.json: the game plays "${id}" but it is not defined`);
    for (const id of audio.ambient.drips.sounds) {
      const s = sounds[id];
      if (!s) problems.push(`sounds.json ambient drips: sound "${id}" does not exist`);
      else if (s.bus !== 'ambient') problems.push(`sounds.json ambient drips: sound "${id}" is on the ${s.bus} bus, not ambient`);
    }
  }
  if (balance) {
    for (const map of Object.values(maps)) {
      if (map.lanes.length > 3) problems.push(`map ${map.id}: at most 3 lanes`);
    }
  }
  if (targets) {
    for (const edge of targets.G2.intendedEdges) {
      for (const ref of edge) {
        const id = ref.split('@')[0]!;
        if (!(id in units)) problems.push(`balance-targets.json G2: unit "${id}" does not exist`);
      }
    }
    if (!(targets.G8.general in generals)) problems.push(`balance-targets.json G8: general "${targets.G8.general}" does not exist`);
    for (const check of [targets.G7.mirror, targets.G7.slayers]) {
      for (const id of [check.mergeBot, check.noMergeBot]) {
        if (!(id in bots)) problems.push(`balance-targets.json G7: bot "${id}" does not exist`);
      }
    }
  }

  if (problems.length || !balance || !targets || !audio) throw new ContentError(problems.length ? problems : ['balance or sound files failed to parse']);
  return {
    balance, targets, factions, buildings, buildingOrder, units, maps, sprites, spriteOrder, spriteSheet, bands, generals, bots,
    scenarios, upgrades, relics, relicOrder, events, eventOrder, elites, eliteOrder, commanders, audio, sounds,
  };
}
