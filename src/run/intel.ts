// The intel file (SPEC §7.6): after each battle the run builds the player's profile for it (the
// average of the four kind scores at 2:00, at 5:00 and at the end), then `intel = ½ intel + ½ profile`
// (the first battle sets it). Each new general opens against intel's top kind; the boss reads the
// unweighted average of every battle in the run. Pure functions of the battle's final state.
import { COUNTER_KINDS, analyzeMix, zeroProfile } from '../sim/index.ts';
import type { BattleState, IntelProfile } from '../sim/index.ts';

/**
 * The player's profile for a finished battle: the mean of the analyses at the regular analysis times
 * (2:00 and 5:00) and at the end, skipping samples where the player had no standing spawner. Null
 * when the enemy did not run the counter cycle or no sample could read anything.
 */
export function battleProfile(state: BattleState): IntelProfile | null {
  const c = state.sides.enemy.ai?.counter;
  if (!c) return null;
  const regular = new Set(state.rules.ai.counter.cycles.map((x) => x.analyzeTick));
  const samples = c.samples.filter((s) => regular.has(s.tick) && s.total > 0).map((s) => s.scores);
  const end = analyzeMix(state, 'player', c);
  if (end.total > 0) samples.push(end.scores);
  return averageProfile(samples);
}

/** The unweighted mean of profiles (null for none). */
export function averageProfile(list: readonly IntelProfile[]): IntelProfile | null {
  if (!list.length) return null;
  const out = zeroProfile();
  for (const p of list) for (const k of COUNTER_KINDS) out[k] += p[k] / list.length;
  return out;
}

/** The update rule: `intel = keep × intel + (1 − keep) × profile`; the first battle sets it. */
export function updateIntel(intel: IntelProfile | null | undefined, profile: IntelProfile, keep: number): IntelProfile {
  if (!intel) return { ...profile };
  const out = zeroProfile();
  for (const k of COUNTER_KINDS) out[k] = keep * intel[k] + (1 - keep) * profile[k];
  return out;
}

/** Burn the Notes: every kind scaled by `factor`. */
export function scaleProfile(p: IntelProfile, factor: number): IntelProfile {
  const out = zeroProfile();
  for (const k of COUNTER_KINDS) out[k] = p[k] * factor;
  return out;
}

/** Intel bars for the route map: 0–`dots` filled dots per kind (a score of 1 or more fills them all). */
export function intelDots(p: IntelProfile, dots = 4): IntelProfile {
  const out = zeroProfile();
  for (const k of COUNTER_KINDS) out[k] = Math.max(0, Math.min(dots, Math.round(p[k] * dots)));
  return out;
}
