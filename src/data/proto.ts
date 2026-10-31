// Balance-backlog prototypes (docs/balance-backlog.md): named presets and `path:value` overrides
// applied to the raw balance.json before validation, so a prototype can be measured by the tools
// (`--proto`) or playtested in the browser (`?proto=`) without editing data. Every knob is absent
// from balance.json by default, so without a spec the rules are unchanged.
import type { RawContent } from './registry.ts';

type Json = Record<string, unknown>;

// ---- the combat rework's settings (docs/ideas/combat-rework.md, P1 to P1d); `rework` is P2's package ----

/** Pinned: a ranged unit with an enemy unit within 1 tile attacks at 0.35× its rate. */
const PINNED: Json = { pinned: { radius: 1, rateMult: 0.35 } };
/** Call for help: friendly units within 5 tiles of a unit or building that takes damage, and have no target, take the attacker. */
const CALL_FOR_HELP: Json = { callForHelp: { radius: 5 } };
/**
 * Spore clouds: the Puffball Mortar reaches 7 tiles, and each shell leaves a cloud (radius 1.5,
 * 6 s) that deals 10 damage a second, ignoring armor, to the enemy units inside it.
 */
const SPORE_CLOUD: Json = { sporeCloud: { buildings: ['puffballMortar'], range: 7, radius: 1.5, seconds: 6, damagePerSecond: 10, aiCover: 1 } };
/**
 * The Rhizomorph: a burrowing unit (the `burrow` tag) and its spawner, which exist only under this
 * preset. It joins both rosters (the Gray Rot mirrors the Velvet Bloom until M7), and every bot and
 * general that doesn't list it buys it at weight 1 (`aiWeight`; mono bots never do).
 */
const RHIZOMORPH: Json = {
  'unit.rhizomorph': {
    name: 'Rhizomorph', sprite: 'u-rhizomorph', milestone: 5,
    hp: 140, armor: 'medium', damage: 16, damageType: 'slash', attackInterval: 1.0,
    range: 0.5, projectileSpeed: 0, speed: 1.2, supply: 2, aggroRange: 4, radius: 0.3,
    tags: ['burrow'], mergePerks: { 2: { speedMult: 1.1 }, 3: { damageMult: 1.1 } },
  },
  'building.rhizomorphTunnel': {
    name: 'Rhizomorph Tunnel', sprite: 'b-rhizomorphTunnel', milestone: 5, rarity: 'uncommon',
    description: 'Rhizomorphs tunnel under the front line and surface beside the archers or spawners behind it.',
    kind: 'spawner', footprint: { w: 2, h: 2 }, cost: 160, hp: 450,
    spawn: { unit: 'rhizomorph', count: 1, interval: 18 }, aiWeight: 1,
  },
  'faction.velvet-bloom.buildings+': 'rhizomorphTunnel',
  'faction.gray-rot.buildings+': 'rhizomorphTunnel',
};

/**
 * Waves: spawns wait inside their building and both sides' waves set out on a 20 s beat, spawners
 * behind a lane's front one leaving early so the wave passes it together; a wave marches at its
 * slowest unit's pace with ranged units 1 tile behind their melee front. Hold keeps a lane's wave
 * home for one beat at a time, and the AI never holds.
 */
const WAVES: Json = { waves: { beatSeconds: 20, rangedGap: 1, matchPace: true } };
/**
 * Mixed waves (P1b, needs waves): a lane's wave of 2 or more unit types sets out with shields of 20% of
 * each unit's max HP. P1b started at 3 types; P1c measured 2 against 3 and kept 2, which helped
 * `bot:balanced` more in G3.
 */
const MIXED_WAVE: Json = { mixedWave: { minTypes: 2, shieldFrac: 0.2 } };

/**
 * Cleave (P1c): a Scythecap's swing hits every enemy unit within 1 tile of its target at full damage
 * (from 0.8 tiles at the global half). Its merge perks keep their steps, so 1.2 and 1.4 tiles.
 */
const CLEAVE: Json = {
  cleave: { units: ['scythecap'] },
  'unit.scythecap.splashRadius': 1,
  'unit.scythecap.mergePerks.2.splashRadius': 1.2,
  'unit.scythecap.mergePerks.3.splashRadius': 1.4,
};
/**
 * The Burster (P1c; a working name): a fast 1-supply unit with no attack. It rolls at the thickest
 * knot of enemy units in its aggro range and bursts on reaching it or on dying: 40 damage, ignoring
 * armor, to every enemy unit within 1.5 tiles, and a spore cloud there (1.5 tiles, 4 s, 10 a second).
 * Its Burster Pod costs 130 and makes one every 10 s. Bots and generals buy it at weight 1, as they
 * do the Rhizomorph Tunnel; mono bots and the counter check's test bots don't.
 */
const BURSTER: Json = {
  burst: { cloud: { radius: 1.5, seconds: 4, damagePerSecond: 10 } },
  'unit.burster': {
    name: 'Burster', sprite: 'u-burster', milestone: 5,
    hp: 50, armor: 'light', damage: 40, damageType: 'crush', attackInterval: 1.0,
    range: 0.3, projectileSpeed: 0, speed: 1.6, supply: 1, aggroRange: 5, radius: 0.3, splashRadius: 1.5,
    tags: ['burst'], mergePerks: { 2: { hpMult: 1.1 }, 3: { hpMult: 1.2 } },
  },
  'building.bursterPod': {
    name: 'Burster Pod', sprite: 'b-bursterPod', milestone: 5, rarity: 'uncommon',
    description: 'Bursters roll at the thickest knot of enemy units and burst: damage through any armor, and a spore cloud.',
    kind: 'spawner', footprint: { w: 2, h: 2 }, cost: 130, hp: 450,
    spawn: { unit: 'burster', count: 1, interval: 10 }, aiWeight: 1,
  },
  'faction.velvet-bloom.buildings+': 'bursterPod',
  'faction.gray-rot.buildings+': 'bursterPod',
};

/** The Elder Sporeling's splash perk, off under `rework` (P1d): under waves it is area damage the swarm brings in numbers. */
const NO_ELDER_SPLASH: Json = { 'unit.sporeling.mergePerks.3.splashRadius': null };
/**
 * A storm that grows waves (P1d, needs waves): each Sporestorm stack makes both sides' waves 20%
 * bigger, ×2 at five stacks (8:00), like Clash Royale's double elixir.
 */
const STORM_WAVES: Json = { stormWaves: { perStack: 0.2 } };

/** Presets: the settings each prototype was measured with (see the backlog's results tables). */
export const PROTO_PRESETS: Record<string, Json> = {
  /** B1: Sporelings sprint at enemy units they close on, then wait out a cooldown. */
  b1: { approachRush: { units: ['sporeling'], speedMult: 3, seconds: 1.5, cooldownSeconds: 8 } },
  /** A2: counter-set buildings get base weight ≥ 1 while their counter is active. */
  a2: { 'ai.counter.counterFloorWeight': 1 },
  /** A3: the first counter cycle analyses at 1:30 and activates at 3:30. */
  a3: { 'ai.counter.cycles': [{ analyzeSeconds: 90, activeSeconds: 210 }, { analyzeSeconds: 300, activeSeconds: 420 }] },
  /** B3: a ranged shot deals half damage behind two friendly ranged units in its line of fire. */
  b3: { firingCongestion: { freeRanks: 2, corridorHalfWidth: 0.6, blockedDamageMult: 0.5 } },
  /** B4: units wither 90 s after spawning (merged units start a fresh lifespan). */
  b4: { unitLifespan: { seconds: 90 } },
  /** Rules without E1 Hold / Advance (adopted 2026-10-28), for measuring against the old default. */
  nohold: { laneStance: null },
  /**
   * E1 (engagement review): per-lane Hold / Advance, the shipped default since 2026-10-28. Held units rally in the middle of the column
   * behind the border column, so their spacing never spills into the frontier; holds last up to
   * 30 s, then a 10 s cooldown. Every AI side musters: it holds until 12 supply stands in the lane,
   * then advances, and holds again below 4.
   */
  hold: {
    laneStance: { rallyBack: 1.5, maxHoldSeconds: 30, cooldownSeconds: 10, ai: { musterSupply: 12, spentSupply: 4 } },
  },
  /** T1: a new ranged spawner waits a full interval for its first unit (others keep half). */
  t1: { rangedFirstSpawnFraction: 1 },
  /** T2: melee units outnumbered near their target fall back toward home for up to 10 s. */
  t2: { fallBack: { radius: 5, ratio: 1, maxHoldSeconds: 10 } },
  /** Diver (step A): Veilstalkers prefer ranged units and see them from 2 tiles farther. */
  diver: { diveRanged: { units: ['veilstalker'], aggroAdd: 2 } },
  /** Diver with a burst: Veilstalkers also sprint at ×2.5 for 1.5 s onto a ranged target, every 8 s at most. */
  diverleap: { diveRanged: { units: ['veilstalker'], aggroAdd: 2, burst: { speedMult: 2.5, seconds: 1.5, cooldownSeconds: 8 } } },
  /** Hot start (step B): a free draft at deploy, and a general on ¾ income in battle 1 of a run. */
  hotstart: {
    hotStart: {
      deployDraft: {},
      battles: [{ enemy: { modifiers: [{ stat: 'side.stipend', op: 'mul', value: 0.75 }] } }],
    },
  },
  /**
   * Heartcap breach (step B): at ⅔ HP a breach (a defensive pulse in the lane, 10 s of half damage
   * taken, +150 gold); at ⅓ a last stand (another pulse, 20 s of quarter damage, the commander power
   * ready, +150 gold). The Sporestorm adds +10% Heartcap damage per stack instead of +20%.
   */
  breach: {
    sideTriggers: [
      {
        on: 'heartcapBreach', at: 0.67,
        do: [{ explode: { damage: 150, damageType: 'crush', radius: 4 } }, { shieldHeartcap: { seconds: 10, takenMult: 0.5 } }, { gainGold: 150 }],
      },
      {
        on: 'heartcapBreach', at: 0.33,
        do: [
          { explode: { damage: 150, damageType: 'crush', radius: 4 } }, { shieldHeartcap: { seconds: 20, takenMult: 0.25 } }, { readyPower: true },
          { gainGold: 150 },
        ],
      },
    ],
    'sporestorm.heartcapTakenPerStack': 0.1,
  },
  /** Bigger drafts (step B): drafts after waves 2 and 5 instead of 2, 4, 6 and 8; take 2 of 4 cards, +10 rare. */
  bigdrafts: { draftWaves: [2, 5], 'draft.cards': 4, bigDrafts: { picks: 2, rareBonus: 10 } },
  /** T3: home-column spawners shoot the nearest enemy unit within 6 tiles (12 Pierce per second). */
  t3: { spawnerDefense: { damage: 12, damageType: 'pierce', interval: 1, range: 6, projectileSpeed: 12, homeOnly: true } },
  // the combat rework (above)
  pinned: PINNED,
  callforhelp: CALL_FOR_HELP,
  sporecloud: SPORE_CLOUD,
  rhizomorph: RHIZOMORPH,
  waves: WAVES,
  /** Mixed waves on top of waves (mixedWave means nothing without them). */
  mixedwave: { ...WAVES, ...MIXED_WAVE },
  /** P1c's two area-damage counters to the swarm, measured on their own and with `rework`. */
  cleave: CLEAVE,
  burster: BURSTER,
  stormwaves: STORM_WAVES,
  /**
   * The combat rework's P2 package: P1d's base without the Mortar's clouds, plus the storm that grows
   * waves. Pinned, call for help, the Rhizomorph, waves on a 20 s beat with mixed waves at two types,
   * the Burster (whose bursts still leave clouds), the Elder Sporeling's splash off, and `stormwaves`.
   * The Mortar's clouds stay the `sporecloud` preset, and cleave its own.
   */
  rework: {
    ...PINNED, ...CALL_FOR_HELP, ...RHIZOMORPH, ...WAVES, ...MIXED_WAVE, ...BURSTER, ...NO_ELDER_SPLASH, ...STORM_WAVES,
    // both new spawners join both rosters (spreading the two presets keeps only the second's append)
    'faction.velvet-bloom.buildings+': ['rhizomorphTunnel', 'bursterPod'],
    'faction.gray-rot.buildings+': ['rhizomorphTunnel', 'bursterPod'],
  },
};

/**
 * Sets a dotted path; `null` removes the setting instead (`laneStance:null` turns Hold off). A
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

function parseValue(v: string): unknown {
  try { return JSON.parse(v); } catch { return v; }
}

/**
 * A spec's settings in order, as (path, value) pairs: each preset name (`b1`) expands to its paths,
 * and each `path:value` override parses its value as JSON when it can
 * (`approachRush.units:["sporeling","morelRunner"]`), else as a string. Unknown presets are reported.
 */
function specItems(spec: string, problems: string[]): [string, unknown][] {
  const out: [string, unknown][] = [];
  for (const raw of splitSpec(spec)) {
    const colon = raw.indexOf(':');
    if (colon >= 0) { out.push([raw.slice(0, colon), parseValue(raw.slice(colon + 1))]); continue; }
    const preset = PROTO_PRESETS[raw.toLowerCase()];
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
 * Applies a comma-separated prototype spec to a copy of `balance`: preset names (`b1`) and
 * `path:value` overrides (`besiegedBy:melee`, `approachRush.speedMult:3`), in order. Paths into
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
