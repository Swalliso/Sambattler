// The intel file (SPEC §7.6): after each battle the run builds the player's profile for it, the mean of the
// kind scores over what you fielded each round (§7.4's reading), then `intel = ½ intel + ½ profile` (the first
// battle sets it). Each new general opens against intel's top kind; the boss reads the unweighted average of
// every battle in the run. Pure functions of the battle's final state.
import { COUNTER_KINDS, analyzeFielded, planningView } from '../sim/index.ts';
import type { BattleState, CounterKind, IntelProfile } from '../sim/index.ts';

const zeroProfile = (): Record<CounterKind, number> => Object.fromEntries(COUNTER_KINDS.map((k) => [k, 0])) as Record<CounterKind, number>;

/**
 * The player's profile for a finished battle: the mean of each round's kind scores over what the player
 * fielded that round (`rounds[].fielded.player`, read as the general reads it), skipping rounds with nothing
 * fielded. Null when no round fielded anything.
 */
export function battleProfile(state: BattleState): IntelProfile | null {
  const view = planningView(state, 'enemy');
  const samples: IntelProfile[] = [];
  for (const r of state.rounds) {
    const a = analyzeFielded(view, r.round, r.round);
    if (a.total > 0) samples.push(a.scores);
  }
  return averageProfile(samples);
}

/** The unweighted mean of profiles (null for none). A kind a profile leaves out scores 0. */
export function averageProfile(list: readonly IntelProfile[]): IntelProfile | null {
  if (!list.length) return null;
  const out = zeroProfile();
  for (const p of list) for (const k of COUNTER_KINDS) out[k] += (p[k] ?? 0) / list.length;
  return out;
}

/** The update rule: `intel = keep × intel + (1 − keep) × profile`; the first battle sets it. */
export function updateIntel(intel: IntelProfile | null | undefined, profile: IntelProfile, keep: number): IntelProfile {
  if (!intel) return { ...profile };
  const out = zeroProfile();
  for (const k of COUNTER_KINDS) out[k] = keep * (intel[k] ?? 0) + (1 - keep) * (profile[k] ?? 0);
  return out;
}

/** Burn the Notes: every kind scaled by `factor`. */
export function scaleProfile(p: IntelProfile, factor: number): IntelProfile {
  const out = zeroProfile();
  for (const k of COUNTER_KINDS) out[k] = (p[k] ?? 0) * factor;
  return out;
}

/** Intel bars for the route map: 0–`dots` filled dots per kind (a score of 1 or more fills them all). */
export function intelDots(p: IntelProfile, dots = 4): Record<CounterKind, number> {
  const out = zeroProfile();
  for (const k of COUNTER_KINDS) out[k] = Math.max(0, Math.min(dots, Math.round((p[k] ?? 0) * dots)));
  return out;
}
