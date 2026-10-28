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
};

function setPath(obj: Json, path: string, value: unknown): void {
  const keys = path.split('.');
  let o = obj;
  for (const k of keys.slice(0, -1)) {
    if (typeof o[k] !== 'object' || o[k] === null) o[k] = {};
    o = o[k] as Json;
  }
  o[keys[keys.length - 1]!] = value;
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

/** The raw content with a prototype spec applied to balance.json (validation happens in loadContent). */
export function applyProto(raw: RawContent, spec: string): { raw: RawContent; problems: string[] } {
  const { balance, problems } = applyProtoToBalance(raw['balance.json'], spec);
  return { raw: { ...raw, 'balance.json': balance }, problems };
}
