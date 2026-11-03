// Prototype knobs (`?proto=`, `--proto`): named presets and `path:value` overrides applied to the raw content
// before validation, so a knob can be measured by the tools (`--proto`) or playtested in the browser (`?proto=`)
// without editing data. Every knob here is absent from balance.json by default, so without a spec the rules are
// unchanged. Since R2b's S4 the presets are the agreed list (SPEC §16 R2, A109): A2 and B3, which tune systems
// that stay, the flyers, for the later flyer (§1.3 #11), and lives at the boss, for R2b's playtest (#16). R1's
// chosen set and the arrival shield are default data since R2a, and the presets of retired systems are gone
// (Appendix A); a spec that names one reports it as unknown (A117). Log new knobs in docs/balance-backlog.md.
import type { RawContent } from './registry.ts';

type Json = Record<string, unknown>;

/**
 * Flyers (docs/archive/v1/ideas/flyers.md; working names): the Driftling floats over ground units. Every unit
 * can hit it, melee at ×0.5, but the Mortar's lobbed shell and the Burster's burst never can: the design's
 * rule C (§5.3), which the user took for the playtest on 2026-10-31 after mono Drift Stalk took over G3 under
 * the design's first pick, reach (only ranged units, other flyers, clouds, commander powers and melee types of
 * 2 or more supply): `flying.reachSupply:2,flying.meleeMult:1` brings reach back. The round sim has no flyer
 * rules yet, so in a battle Driftlings fight as ground units. The Drift Stalk is in squad form (§11.2): it costs
 * 160 and fields a squad of 6 Driftlings a round. Every data bot and every general buys it at weight 1, as the
 * Tunnel and the Pod (R2-Q5); mono bots and the counter check's test bots don't.
 */
const FLYERS: Json = {
  flying: { reachSupply: 1, meleeMult: 0.5, mergedReach: false, cloudsReach: true },
  'unit.driftling': {
    name: 'Driftling', sprite: 'u-driftling', milestone: 5,
    hp: 70, armor: 'light', damage: 8, damageType: 'slash', attackInterval: 1.0,
    range: 1.0, projectileSpeed: 0, speed: 1.4, supply: 1, aggroRange: 5, radius: 0.25,
    tags: ['flying'], mergePerks: { 2: { speedMult: 1.1 }, 3: { damageMult: 1.1 } },
  },
  'building.driftStalk': {
    name: 'Drift Stalk', sprite: 'b-driftStalk', milestone: 5, rarity: 'uncommon',
    description: "Driftlings float over the front. Melee hits them for half damage, and lobbed shells and bursts can't hit them.",
    kind: 'spawner', footprint: { w: 2, h: 2 }, cost: 160, squad: { unit: 'driftling', count: 6 },
  },
  'faction.velvet-bloom.buildings+': 'driftStalk',
  'faction.gray-rot.buildings+': 'driftStalk',
  ...Object.fromEntries([
    ...['balanced', 'balanced-nomerge', 'answer', 'slayer', 'slayer-nomerge', 'slayer-rounds', 'slayer-rounds-nomerge', 'rush', 'turtle', 'greedy'].map((id) => `bot.${id}.weights.driftStalk`),
    ...['scripted', 'mother-mold', 'lichen-baron', 'blightwright', 'pale-sovereign'].map((id) => `general.${id}.weights.driftStalk`),
  ].map((path) => [path, 1])),
};

/** Presets: the settings each knob is measured with (see the backlog's results tables). */
export const PROTO_PRESETS: Record<string, Json> = {
  /** A2: counter-set buildings get base weight ≥ 1 while their counter is active. No battle in rounds reads it yet. */
  a2: { 'ai.counter.counterFloorWeight': 1 },
  /** B3: a ranged shot deals half damage behind two friendly ranged units in its line of fire. No battle in rounds reads it yet. */
  b3: { firingCongestion: { freeRanks: 2, corridorHalfWidth: 0.6, blockedDamageMult: 0.5 } },
  /** Flyers (above), for the later flyer (§1.3 #11). */
  flyers: FLYERS,
  /** Lives left count at the boss (§8.5, #16): +250 to your boss battle's Heartcap for each life left. For R2b's playtest. */
  bosslives: { livesAtBoss: { heartcapPerLife: 250 } },
};

/**
 * Sets a dotted path; `null` removes the setting instead (`cleave:null` turns cleave off). A
 * trailing `+` adds to the list at the path instead (a list value adds each item), skipping items
 * already there: `faction.velvet-bloom.buildings+:"rhizomorphTunnel"`.
 */
function setPath(obj: Json, path: string, value: unknown): void {
  const keys = path.split('.');
  let o = obj;
  for (const k of keys.slice(0, -1)) {
    if (typeof o[k] !== 'object' || o[k] === null) o[k] = {};
    o = o[k] as Json;
  }
  const last = keys[keys.length - 1]!;
  if (last.endsWith('+')) {
    const k = last.slice(0, -1);
    if (!Array.isArray(o[k])) o[k] = [];
    const list = o[k] as unknown[];
    for (const v of Array.isArray(value) ? value : [value]) {
      if (!list.some((x) => JSON.stringify(x) === JSON.stringify(v))) list.push(v);
    }
  } else if (value === null) delete o[last];
  else o[last] = value;
}

/** Splits on commas outside brackets and braces, so JSON values can hold lists. */
function splitSpec(spec: string): string[] {
  const out: string[] = [];
  let depth = 0, start = 0;
  for (let i = 0; i < spec.length; i++) {
    const c = spec[i];
    if (c === '[' || c === '{') depth++;
    else if (c === ']' || c === '}') depth--;
    else if (c === ',' && depth === 0) { out.push(spec.slice(start, i)); start = i + 1; }
  }
  out.push(spec.slice(start));
  return out.map((s) => s.trim()).filter(Boolean);
}

/** The presets a spec names, lowercased, in order: its items that aren't `path:value` overrides. */
export function specPresets(spec: string): string[] {
  return splitSpec(spec).filter((item) => !item.includes(':')).map((item) => item.toLowerCase());
}

/** The preset by name (any case), or undefined: only {@link PROTO_PRESETS}' own entries count. */
const presetNamed = (name: string): Json | undefined => {
  const key = name.toLowerCase();
  return Object.hasOwn(PROTO_PRESETS, key) ? PROTO_PRESETS[key] : undefined;
};

/**
 * The presets a spec names that don't exist, lowercased: a typo, or a preset that's gone, such as a retired
 * system's (A117). The game shows them and saves such a run nowhere (`protoSpace`, src/app/channel.ts).
 */
export function unknownPresets(spec: string): string[] {
  return specPresets(spec).filter((name) => !presetNamed(name));
}

function parseValue(v: string): unknown {
  try { return JSON.parse(v); } catch { return v; }
}

/**
 * A spec's settings in order, as (path, value) pairs: each preset name (`b3`) expands to its paths,
 * and each `path:value` override parses its value as JSON when it can
 * (`cleave.units:["scythecap","hammercap"]`), else as a string. Unknown presets are reported.
 */
function specItems(spec: string, problems: string[]): [string, unknown][] {
  const out: [string, unknown][] = [];
  for (const raw of splitSpec(spec)) {
    const colon = raw.indexOf(':');
    if (colon >= 0) { out.push([raw.slice(0, colon), parseValue(raw.slice(colon + 1))]); continue; }
    const preset = presetNamed(raw);
    if (!preset) { problems.push(`proto: unknown preset "${raw}" (known: ${Object.keys(PROTO_PRESETS).join(', ')})`); continue; }
    for (const [k, v] of Object.entries(preset)) out.push([k, structuredClone(v)]);
  }
  return out;
}

/**
 * Content collections an override can reach by id: `building.<id>.…`, `unit.<id>.…`, `bot.<id>…`,
 * `general.<id>…` and `faction.<id>…` (a faction file is one entry).
 */
const ENTRY_FILES: Record<string, (path: string) => boolean> = {
  building: (f) => f.endsWith('buildings.json'),
  unit: (f) => f.endsWith('units.json'),
  bot: (f) => f === 'bots.json',
  general: (f) => f === 'generals.json',
  faction: (f) => /^factions\/[^/]+\/faction\.json$/.test(f),
};

/** The entry kind a path reaches (`unit.rhizomorph.hp` → unit), or undefined for a balance path. */
function entryKind(path: string): string | undefined {
  const [kind, id] = path.split('.');
  return kind && id && ENTRY_FILES[kind] ? kind : undefined;
}

/**
 * Applies a comma-separated prototype spec to a copy of `balance`: preset names (`b3`) and
 * `path:value` overrides (`firingCongestion.freeRanks:3`, `livesAtBoss.heartcapPerLife:300`), in order. Paths into
 * content entries (`unit.…`, `building.…`) need {@link applyProto}; here they are reported, not applied.
 */
export function applyProtoToBalance(balance: unknown, spec: string): { balance: Json; problems: string[] } {
  const out = structuredClone(balance) as Json;
  const problems: string[] = [];
  for (const [path, value] of specItems(spec, problems)) {
    if (entryKind(path)) problems.push(`proto: "${path}" patches content; apply the spec with applyProto`);
    else setPath(out, path, value);
  }
  return { balance: out, problems };
}

/**
 * The raw content with a prototype spec applied (validation happens in loadContent). Balance
 * presets and paths go to balance.json, and a preset may also carry content paths. Content paths
 * patch an entry by id: `building.gillNest.spawn.interval:19`, `unit.gillArcher.hp:100`,
 * `faction.gray-rot.buildings+:"rhizomorphTunnel"`. `<kind>.<id>:{…}` replaces an entry, or adds it
 * when no entry has that id (a new building, unit, bot or general goes to the first file of its kind;
 * the reference bots are untouched unless named).
 */
export function applyProto(raw: RawContent, spec: string): { raw: RawContent; problems: string[] } {
  const out: RawContent = { ...raw };
  const problems: string[] = [];
  const balanceItems: [string, unknown][] = [];
  for (const [path, value] of specItems(spec, problems)) {
    const kind = entryKind(path);
    if (!kind) { balanceItems.push([path, value]); continue; }
    const [, id, ...rest] = path.split('.');
    const files = Object.keys(out).filter(ENTRY_FILES[kind]!).sort();
    let done = false;
    for (const f of files) {
      if (Array.isArray(out[f])) {
        const list = structuredClone(out[f]) as Json[];
        const i = list.findIndex((e) => e.id === id);
        if (i < 0) continue;
        if (rest.length) setPath(list[i]!, rest.join('.'), value);
        else list[i] = { ...(value as Json), id };
        out[f] = list;
      } else {
        if ((out[f] as Json | undefined)?.id !== id) continue;
        const entry = structuredClone(out[f]) as Json;
        if (rest.length) setPath(entry, rest.join('.'), value);
        out[f] = rest.length ? entry : { ...(value as Json), id };
      }
      done = true;
      break;
    }
    const first = files.find((f) => Array.isArray(out[f]));
    if (!done && kind !== 'faction' && !rest.length && first) {
      out[first] = [...(out[first] as Json[]), { ...(value as Json), id }];
      done = true;
    }
    if (!done) problems.push(`proto: no ${kind} "${id}" for "${path}"`);
  }
  const balance = structuredClone(raw['balance.json']) as Json;
  for (const [path, value] of balanceItems) setPath(balance, path, value);
  out['balance.json'] = balance;
  return { raw: out, problems };
}
