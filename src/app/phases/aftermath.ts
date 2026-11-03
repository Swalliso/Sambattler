// The aftermath's part of the loop (SPEC §13.5, §10.2): render only, since the clash's last tick scored the
// round. No step runs until the aftermath is done or skipped, then one step opens the next round, or ends the
// battle after its last. Its clock runs at the clash's speed, which stays live here with no pause, and the
// session carries it to the view, which draws the aftermath from it (`src/render/aftermath.ts`). The
// view's `aftermathLength` says when it's done: about 3 s at 1×, and a second more on the fallen Heartcap at a
// battle's end. Under `?test=1` with a `phase=` hold it waits for Space, Enter or a click instead (plan Call 15).
// Help and the settings screen hold it while they're open, as they pause a clash (A078). Its chrome (§10.2,
// T095) is the round's result banner, pinned in the callout lane once the bars have drained, worded here.
import type { Content } from '../../data/registry.ts';
import { aftermathLength } from '../../render/aftermath.ts';
import type { BattleState } from '../../sim/rounds/index.ts';
import { roundOutcome } from '../../sim/rounds/systems/victory.ts';
import { resultOf } from '../../ui/hud/explain.ts';
import type { RoundSession } from '../session.ts';

export { AFTERMATH_MS } from '../../render/aftermath.ts';

export class AftermathPhase {
  private elapsed = 0;
  private skipped = false;

  /** @param waits under `?test=1` with a `phase=` hold, the aftermath waits for input (plan Call 15) */
  constructor(private waits: boolean) {}

  /** As the aftermath opens. */
  enter(): void {
    this.elapsed = 0;
    this.skipped = false;
  }

  /** Space, Enter or a click. */
  skip(): void { this.skipped = true; }

  /** One frame: true once the aftermath is skipped or its view has played out at the speed, when the loop steps once. */
  frame(session: RoundSession, dt: number): boolean {
    if (session.overlayOpen) return false;
    this.elapsed += dt * session.speed;
    session.aftermathMs = this.elapsed;
    return this.skipped || (!this.waits && this.elapsed >= aftermathLength(session.state));
  }
}

/**
 * The round's result banner (§10.2, A071): the round won, lost or drawn, split by lane on Twin Roots, the
 * Heartcap damage both ways, and your squad that dealt the most in its clash.
 */
export function resultBanner(content: Content, state: BattleState): { text: string; tone: 'good' | 'bad' | '' } {
  const r = state.rounds.at(-1)!;
  const result = resultOf(roundOutcome(r.damage).winner);
  const lanes = r.lanes.map((l) => resultOf(l.winner));
  const split = lanes.length > 1 && new Set(lanes).size > 1 ? ` · split: ${lanes.map((l, i) => `lane ${i + 1} ${l}`).join(', ')}` : '';
  const [top] = Object.entries(r.damageByBuilding.player).filter(([, d]) => d > 0).sort((a, b) => b[1] - a[1] || Number(a[0]) - Number(b[0]));
  const type = top ? state.stats.player.buildingTypes[top[0]] : undefined;
  const best = type ? ` · your ${content.buildings[type]?.name ?? type} dealt the most` : '';
  return {
    text: `Round ${r.round} ${result}${split} · you dealt ${r.damage.player}, took ${r.damage.enemy}${best}`,
    tone: result === 'won' ? 'good' : result === 'lost' ? 'bad' : '',
  };
}
