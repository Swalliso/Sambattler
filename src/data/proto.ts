// Balance-backlog prototypes (docs/balance-backlog.md): named presets and `path:value` overrides
// applied to the raw balance.json before validation, so a prototype can be measured by the tools
// (`--proto`) or playtested in the browser (`?proto=`) without editing data. Every knob is absent
// from balance.json by default, so without a spec the rules are unchanged.
import type { RawContent } from './registry.ts';

type Json = Record<string, unknown>;

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
  /** T3: home-column spawners shoot the nearest enemy unit within 6 tiles (12 Pierce per second). */
  t3: { spawnerDefense: { damage: 12, damageType: 'pierce', interval: 1, range: 6, projectileSpeed: 12, homeOnly: true } },
};

/** Sets a dotted path; `null` removes the setting instead (`laneStance:null` turns Hold off). */
function setPath(obj: Json, path: string, value: unknown): void {
  const keys = path.split('.');
  let o = obj;
  for (const k of keys.slice(0, -1)) {
    if (typeof o[k] !== 'object' || o[k] === null) o[k] = {};
    o = o[k] as Json;
  }
  if (value === null) delete o[keys[keys.length - 1]!];
  else o[keys[keys.length - 1]!] = value;
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
 * Applies a comma-separated prototype spec to a copy of `balance`: preset names (`b1`) and
 * `path:value` overrides (`besiegedBy:melee`, `approachRush.speedMult:3`), in order. Values parse
 * as JSON when they can (`approachRush.units:["sporeling","morelRunner"]`), else as strings.
 * Unknown presets are reported, not applied.
 */
export function applyProtoToBalance(balance: unknown, spec: string): { balance: Json; problems: string[] } {
  const out = structuredClone(balance) as Json;
  const problems: string[] = [];
  for (const raw of splitSpec(spec)) {
    const colon = raw.indexOf(':');
    if (colon < 0) {
      const preset = PROTO_PRESETS[raw.toLowerCase()];
      if (!preset) { problems.push(`proto: unknown preset "${raw}" (known: ${Object.keys(PROTO_PRESETS).join(', ')})`); continue; }
      for (const [k, v] of Object.entries(preset)) setPath(out, k, structuredClone(v));
    } else {
      setPath(out, raw.slice(0, colon), parseValue(raw.slice(colon + 1)));
    }
  }
  return { balance: out, problems };
}

/** Content collections an override can reach by id: `building.<id>.…`, `unit.<id>.…`, `bot.<id>`. */
const ENTRY_FILES: Record<string, (path: string) => boolean> = {
  building: (f) => f.endsWith('buildings.json'),
  unit: (f) => f.endsWith('units.json'),
  bot: (f) => f === 'bots.json',
};

/**
 * The raw content with a prototype spec applied (validation happens in loadContent). Balance
 * presets and paths go to balance.json; `building.gillNest.spawn.interval:19` and
 * `unit.gillArcher.hp:100` patch an entry of a buildings or units file by id; `bot.<id>:{…}` adds
 * or replaces a bot (for one-off diagnostics; the reference bots are untouched unless named).
 */
export function applyProto(raw: RawContent, spec: string): { raw: RawContent; problems: string[] } {
  const out: RawContent = { ...raw };
  const balanceParts: string[] = [];
  const problems: string[] = [];
  for (const part of splitSpec(spec)) {
    const colon = part.indexOf(':');
    const key = colon < 0 ? part : part.slice(0, colon);
    const [kind, id, ...rest] = key.split('.');
    const match = colon >= 0 && kind && id ? ENTRY_FILES[kind] : undefined;
    if (!match) { balanceParts.push(part); continue; }
    const value = parseValue(part.slice(colon + 1));
    const files = Object.keys(out).filter((f) => match(f) && Array.isArray(out[f]));
    let done = false;
    for (const f of files) {
      const list = structuredClone(out[f]) as Json[];
      const i = list.findIndex((e) => e.id === id);
      if (i < 0) continue;
      if (rest.length) setPath(list[i]!, rest.join('.'), value);
      else list[i] = { ...(value as Json), id };
      out[f] = list;
      done = true;
      break;
    }
    if (!done && kind === 'bot' && !rest.length && files[0]) {
      out[files[0]] = [...(out[files[0]] as Json[]), { ...(value as Json), id }];
      done = true;
    }
    if (!done) problems.push(`proto: no ${kind} "${id}" for "${part}"`);
  }
  const { balance, problems: bp } = applyProtoToBalance(raw['balance.json'], balanceParts.join(','));
  out['balance.json'] = balance;
  return { raw: out, problems: [...problems, ...bp] };
}
