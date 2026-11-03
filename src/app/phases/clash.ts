// A clash's part of the loop (SPEC §13.5): 20 Hz with interpolation. Each frame adds the real time (at most
// 250 ms) times the speed to an accumulator, and steps while it holds 50 ms and the clash isn't paused, at most
// 12 steps a frame (past that, the accumulator resets). Pause and speed apply only here and in the aftermath,
// and a pause never carries into the next clash (the session drops it as the clash opens). Help and the
// settings screen hold it while they're open, as a pause does. Its chrome (§10.2, T095) is the speed control
// in Begin's place, which the view shows, and on Twin Roots a callout as a lane ends first, worded here. So is
// the commander power's (§6.6, §10.3, T109): its button's state, its tooltip's and the aim's words, and why
// Q or a click is refused. The power is once per clash, so nothing here speaks of a cooldown.
import type { PowerDef } from '../../data/schema.ts';
import { powerOf } from '../../sim/index.ts';
import type { BattleState, SimEvent } from '../../sim/index.ts';
import type { RoundSession } from '../session.ts';

export const STEP_MS = 50;
const MAX_STEPS = 12;

/** `powerProblem`'s reasons in the callout's words, after the power's name (§6.6, §10.3, R2-Q11). */
export const POWER_REFUSALS: Record<string, string> = {
  wrongPhase: 'only in a clash',
  powerUsed: 'used this clash',
  laneEnded: "this lane's clash is over",
  notInRoundsYet: 'not in a battle in rounds yet',
  needsTarget: 'aim at a point on the field',
  offField: 'aim at a point on the field',
  mergingOff: 'merging is off in this battle',
  pending: 'goes off on the next tick',
};

/** A refused Q or click: "Spore Burst: used this clash". */
export const powerRefusal = (name: string, reason: string): string => `${name}: ${POWER_REFUSALS[reason] ?? reason}`;

/** The power button's state (its `data-state`) and label (§10.2): lit only in a clash, from its first tick (§6.6). */
export function powerButton(state: BattleState, session: Pick<RoundSession, 'targeting' | 'powerPending'>): { state: 'ready' | 'aiming' | 'pending' | 'used' | 'idle'; label: string } {
  const kind = powerOf(state, 'player')?.kind;
  if (kind === 'tithe' || kind === 'surge') return { state: 'idle', label: 'Not in rounds yet' };
  if (state.phase !== 'clash') return { state: 'idle', label: 'Next clash' };
  if (session.powerPending()) return { state: 'pending', label: 'Next tick' };
  if (state.sides.player.powerUsed) return { state: 'used', label: 'Used this clash' };
  if (session.targeting) return { state: 'aiming', label: 'Aiming' };
  return { state: 'ready', label: 'Ready' };
}

/**
 * The power's rule in rounds, from its numbers (R2-Q8): the data's text is v1's, which hit buildings and paid
 * for columns, until R2b rewords it. Rhizome Tithe has no effect in rounds yet (plan Call 19).
 */
export function powerText(p: PowerDef): string {
  if (p.kind === 'burst') return `${p.damage} ${p.damageType} damage to every enemy unit within ${p.radius} tiles of a point, emplacements included. Buildings can't be hit.`;
  if (p.kind === 'bloom') return `Every trio of the same unit within ${p.radius} tiles of a point merges at once, even in combat.`;
  return `${p.name} isn't in a battle in rounds yet: R2b gives it a new effect.`;
}

/** How it's aimed and when it fires, for the tooltip. */
export const powerUse = (p: PowerDef): string =>
  `${p.target === 'point' ? `Q, then click a point: a ${'radius' in p ? p.radius : 0}-tile radius` : 'Q, then click the field'}. It fires once per clash, from the clash's first tick, the muster's included.`;

/** The aim callout's words after the power's name: what it would do at the cursor, then the click's result. */
export function aimText(p: PowerDef, preview: { valid: boolean; count: number; value: number; reason: string | null } | null): string {
  if (!preview) return 'move over the field';
  const what = p.kind === 'burst' ? `${preview.count} target${preview.count === 1 ? '' : 's'} · ${preview.value} damage`
    : `${preview.count} trio${preview.count === 1 ? '' : 's'} to merge`;
  return `${what} · ${preview.valid ? 'click to fire' : POWER_REFUSALS[preview.reason ?? ''] ?? preview.reason}`;
}

/** The callout as your power goes off: "Spore Burst hit 5 units", "Puppet Bloom merged 2 trios". */
export function powerNews(name: string, e: Extract<SimEvent, { t: 'power' }>, kind: PowerDef['kind'] | undefined): string {
  return kind === 'bloom' ? `${name} merged ${e.merges} trio${e.merges === 1 ? '' : 's'}` : `${name} hit ${e.hits} unit${e.hits === 1 ? '' : 's'}`;
}

export class ClashPhase {
  private acc = 0;

  /** As a clash opens. */
  reset(): void { this.acc = 0; }

  /** One frame of the clash; returns the alpha to render at, `accumulator / 50 ms`, or 1 when paused or over. */
  frame(session: RoundSession, dt: number, advance: () => void): number {
    if (session.paused || session.overlayOpen) return 1;
    this.acc += dt * session.speed;
    let n = 0;
    while (this.acc >= STEP_MS && session.state.phase === 'clash') {
      if (n++ === MAX_STEPS) { this.acc = 0; break; }
      advance();
      this.acc -= STEP_MS;
    }
    return session.state.phase === 'clash' ? Math.min(1, this.acc / STEP_MS) : 1;
  }
}

/**
 * A lane that ends while another fights on, on Twin Roots (§10.2): "Lane won · 9 supply left", "Lane lost" or
 * "Lane drawn", naming the lane. The last lane's end is the round's, which the result banner names instead.
 */
export function laneCallout(state: BattleState, e: Extract<SimEvent, { t: 'laneWon' }>): { text: string; tone: 'good' | 'bad' | '' } | null {
  if (state.lanes.length < 2 || state.phase !== 'clash') return null;
  const lane = `Lane ${e.lane + 1}`;
  if (e.winner === 'player') return { text: `${lane} won · ${e.survivors.player} supply left`, tone: 'good' };
  if (e.winner === 'enemy') return { text: `${lane} lost`, tone: 'bad' };
  return { text: `${lane} drawn`, tone: '' };
}
