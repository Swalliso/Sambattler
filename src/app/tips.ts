// First-time tips (playtest round 3: "too much to learn, and the game doesn't explain itself"). In the
// first two battles of a run, each tip shows once, ever: the frontier and territory a few seconds after
// Begin, Hold / Advance a little later, the first draft as it opens, the Sporestorm as it starts and
// interest the first time it pays. They go through the callout lane, one at a time and never over the
// field, and each names its key. The commander power's tip comes the first time it is ready. Which tips were shown is remembered (spore-sprawl/tips/v1, through
// storageKey()); the settings screen turns tips off or shows them all again. Battle 1's economy tip
// (playtest 2026-10-28) goes through the same queue, but it isn't remembered: it fires whenever battle 1
// reaches 0:30 without an economy building.
import { powerOf } from '../sim/index.ts';
import type { BattleState } from '../sim/index.ts';
import type { Callouts } from '../ui/callouts.ts';
import { h } from '../ui/h.ts';
import { loadSettings, markTipShown, onSettings, tipsShown } from './settings.ts';

/** First-time tips stay up longer than a passing callout: they are a sentence to read. */
const TIP_MS = 8000;
/** When the time-based tips come, in seconds after Begin; past their window (a resumed battle) they wait for another. */
const FRONTIER_AT = 6;
const HOLD_AT = 50;
const WINDOW = 30;
/** Tips show in a run's first two battles (and in single battles numbered 1 or 2). */
const LAST_BATTLE = 2;

export type TipId = 'frontier' | 'hold' | 'draft' | 'storm' | 'interest' | 'economy' | 'power';

interface Pending { id: TipId; parts: (string | Node)[]; remember: boolean; onShow?: (now: number) => void }

const kbd = (k: string) => h('kbd', null, k);
/** The lilac word that heads every tip. */
export const tipWord = (): HTMLElement => h('b', { class: 'tip-word' }, 'Tip');
const pct = (x: number) => `${Math.round(Math.abs(x) * 100)}%`;

export class TipCoach {
  private queue: Pending[] = [];
  /** Shown, queued or ruled out this battle. */
  private done = new Set<TipId>();
  private shown: Set<string>;
  private enabled: boolean;
  private unsubscribe: () => void;

  constructor(private callouts: Callouts) {
    this.shown = tipsShown();
    this.enabled = loadSettings().tips;
    this.unsubscribe = onSettings((next) => {
      this.enabled = next.tips;
      if (!next.tips) this.queue = [];
      // "Show tips again" clears the record; a tip already shown this battle still waits for the next
      this.shown = tipsShown();
    });
  }

  dispose(): void { this.unsubscribe(); }

  /** Would this tip show now (tips on, an early battle, never shown)? */
  private wants(state: BattleState, id: TipId, remember = true): boolean {
    if (!this.enabled || this.done.has(id) || state.config.battleIndex > LAST_BATTLE) return false;
    return !remember || !this.shown.has(id);
  }

  /**
   * Queues a tip; it shows when the lane has no other tip. A tip about what is happening right now (a
   * draft, the storm, interest) goes ahead of the ones that only wait for a time.
   */
  offer(state: BattleState, id: TipId, parts: (string | Node)[], opts: { remember?: boolean; now?: boolean; onShow?: (now: number) => void } = {}): boolean {
    const remember = opts.remember ?? true;
    if (!this.wants(state, id, remember)) return false;
    this.done.add(id);
    const tip = { id, parts, remember, ...(opts.onShow ? { onShow: opts.onShow } : {}) };
    if (opts.now) this.queue.unshift(tip);
    else this.queue.push(tip);
    return true;
  }

  /** Per sim step: the tips that time or an event brings. */
  onTick(state: BattleState): void {
    if (!this.enabled || state.phase !== 'live' || state.config.battleIndex > LAST_BATTLE) return;
    const r = state.rules, secs = state.tick / r.tickRate;
    // short enough to share the lane with a counter warning at 1280 px
    if (secs >= FRONTIER_AT && secs < FRONTIER_AT + WINDOW) {
      this.offer(state, 'frontier', [tipWord(), 'Units claim ground past the glowing frontier line. You build only on your own columns.']);
    }
    if (r.stance && secs >= HOLD_AT && secs < HOLD_AT + WINDOW) {
      this.offer(state, 'hold', [tipWord(), 'Press ', kbd('F'), ' to hold your units back for a bigger push; press it again to advance.']);
    }
    for (const e of state.events) {
      if (e.t === 'sporestorm' && e.stacks === 1) {
        const st = r.storm;
        this.offer(state, 'storm', [tipWord(), `The Sporestorm: each stack, units hit ${pct(st.unitDamage)} harder and Heartcaps take ${pct(st.heartcapTaken)} more.`], { now: true });
      } else if (e.t === 'interest' && e.side === 'player' && e.amount > 0) {
        this.offer(state, 'interest', [tipWord(), `Interest +${e.amount}: each wave pays 1 gold per ${r.interestPer} you hold, up to a cap. Hover your gold.`], { now: true });
      }
    }
    const power = powerOf(state, 'player');
    if (power && state.sides.player.powerCooldown === 0) {
      const aim = power.target === 'point' ? 'then click where it should land' : 'then click the field';
      this.offer(state, 'power', [tipWord(), `${power.name} is ready: press `, kbd('Q'), ` or its button, ${aim}. You can aim while paused.`], { now: true });
    }
    // last, so it goes first: the draft is on screen now (it opens on the same tick as a wave's interest)
    if (state.sides.player.draft) {
      this.offer(state, 'draft', [tipWord(), 'Pick with ', kbd('1'), '–', kbd('3'), ': blueprints add buildings, upgrades improve them, relics last the run.'], { now: true });
    }
  }

  /** Per frame: shows the next tip once the lane has no tip up. */
  frame(now: number): void {
    if (!this.queue.length || this.callouts.live('tip')) return;
    const next = this.queue.shift()!;
    // the "Tip" word, then the sentence as one run of text, so its keycaps sit inline
    const [word, ...rest] = next.parts;
    this.callouts.push('tip', [word!, h('span', null, ...rest)], '', now, TIP_MS);
    if (next.remember) {
      markTipShown(next.id);
      this.shown.add(next.id);
    }
    next.onShow?.(now);
  }
}
