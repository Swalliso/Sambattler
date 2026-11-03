// The top band of a battle in rounds (SPEC §10.2): your Heartcap at the left end and the general's at the
// right, so the win condition frames the band, with the stat chips between them: gold with what the next round
// pays if you Begin now (`incomePreview`), plots planted of open plots, the round of 9 with the clash clock
// against the 45 s cap, and the Sporestorm's multiplier on round damage. The round tally and the lane tug sit
// under the chips in their own mount (`tally.ts`), and the General's Intent panel closes the band in its own.
// The sim scores a round on its clash's last tick, so a Heartcap's number holds at the round's starting HP
// through the clash and drains in the aftermath. It stands beside v1's `src/ui/hud/top.ts`, whose Heartcap
// block, chips and tightening fit it copies onto rounds' state, in v1's styles.
import '../rounds.css';
import type { Content } from '../../../data/registry.ts';
import type { Atlas } from '../../../render/atlas.ts';
import { spriteToCanvas } from '../../../render/atlas.ts';
import { incomePreview, SIDES } from '../../../sim/rounds/index.ts';
import type { BattleState, Side } from '../../../sim/rounds/index.ts';
import { stormBpFor } from '../../../sim/rounds/systems/victory.ts';
import { h, setText, toggleClass } from '../../h.ts';
import { uiIcon } from '../../icons.ts';
import { reducedMotion } from '../../motion.ts';
import { AnchoredTip } from '../../tooltip.ts';
import { stormText } from './explain.ts';

/** A band or panel in its mount (T088–T091): drawn each frame, laid out afresh on a resize, removed with the view. */
export interface HudPart {
  update(state: BattleState, now: number): void;
  fit?(): void;
  dispose(): void;
}

/** About 3 s at 1× (§10.2), as the loop's aftermath (`src/app/rounds/phases/aftermath.ts`) times it. */
const AFTERMATH_MS = 3000;
/**
 * The aftermath's beats in the band, as shares of its time: the survivors surge, the loser's bar drains as they
 * burst on its Heartcap, then the result banner, when the tally takes the round's pip (§10.2).
 */
const DRAIN_FROM = 0.3, DRAIN_TO = 0.6;

/**
 * How far the aftermath's drain has run, render-side: it counts the aftermath's time at the speed, as the loop
 * does, from the frame the aftermath opens. Under `?test=1` it's done at once (plan Call 15), and under reduced
 * motion the bars change at once (§10.2).
 */
export class AftermathClock {
  private round = 0;
  private elapsed = 0;
  private last = 0;

  constructor(private speed: () => number, private still: boolean) {}

  /** 0 before the drain, 1 once it's done; 1 outside the aftermath, where the band shows the live state. */
  drained(state: BattleState, now: number): number {
    if (state.phase !== 'aftermath') { this.round = 0; return 1; }
    if (this.round !== state.round) { this.round = state.round; this.elapsed = 0; this.last = now; }
    this.elapsed += (now - this.last) * this.speed();
    this.last = now;
    if (this.still || reducedMotion()) return 1;
    return Math.min(1, Math.max(0, (this.elapsed / AFTERMATH_MS - DRAIN_FROM) / (DRAIN_TO - DRAIN_FROM)));
  }
}

/** What the band's parts share: content for names, the atlas for sprites, one tooltip and the aftermath's clock. */
export interface HudContext {
  content: Content;
  atlas: Atlas;
  /** The chips', the tally's, the tug's and the Intent panel's tooltips (src/ui/tooltip.ts): one tip, under whichever is hovered or focused. The top band owns it. */
  tip: AnchoredTip;
  aftermath: AftermathClock;
}

/** @param still motion holds still (`?test=1`), so the aftermath shows its final frame at once */
export function hudContext(content: Content, atlas: Atlas, speed: () => number, still: boolean): HudContext {
  return { content, atlas, tip: new AnchoredTip('hud-tip', 'below'), aftermath: new AftermathClock(speed, still) };
}

/** A clash's clock, m:ss. */
const clock = (ticks: number, rate: number): string => {
  const s = Math.floor(Math.max(0, ticks) / rate);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};

/** A Heartcap's block: its cap, the HP shown and a bar that drains toward the field's centre. */
class HeartBar {
  readonly el: HTMLElement;
  private hp = h('b');
  private max = h('small');
  private fill = h('i');
  private pct = -1;

  constructor(atlas: Atlas, side: Side, label: string, title: string) {
    const cap = spriteToCanvas(atlas, 'heartcap-cap', side === 'player' ? 'velvet-bloom' : 'gray-rot');
    cap.className = 'heart-cap';
    cap.setAttribute('aria-hidden', 'true');
    this.el = h('div', { class: `heart ${side}`, id: `hud-hp-${side}`, title },
      cap,
      h('div', { class: 'heart-label' }, label),
      h('div', { class: 'heart-hp' }, this.hp, this.max),
      h('div', { class: 'hpbar', role: 'meter', 'aria-label': label, 'aria-valuemin': 0, 'aria-valuemax': 100 }, this.fill),
    );
  }

  /** Shows `hp` of `maxHp`; under a third, the number turns danger red as well as the bar's length (§10.2). */
  show(hp: number, maxHp: number): void {
    setText(this.hp, String(hp));
    setText(this.max, `/${maxHp}`);
    toggleClass(this.el, 'low', 3 * hp < maxHp);
    const pct = Math.max(0, Math.round((1000 * hp) / maxHp) / 10);
    if (pct === this.pct) return;
    this.pct = pct;
    this.fill.style.width = `${pct}%`;
    this.fill.parentElement!.setAttribute('aria-valuenow', String(pct));
  }
}

/**
 * How tightly the chips sit when they don't fit between the Heartcaps (a narrow window, big late numbers):
 * closer together, then also without the words their icons and tips carry. Each step is a class on the row,
 * as v1's (`src/ui/styles.css`).
 */
const TIGHT = ['', 'snug', 'terse'] as const;

export class TopBand implements HudPart {
  private gold = h('b', { id: 'hud-gold' });
  private goldStat: HTMLElement;
  private income = h('small', { id: 'hud-income' });
  private plots = h('b', { id: 'hud-plots' });
  private round = h('b', { id: 'hud-round' });
  private roundStat: HTMLElement;
  private clock = h('small', { id: 'hud-clock' });
  private storm = h('b', { id: 'hud-storm' });
  private stormStat: HTMLElement;
  private chips: HTMLElement;
  /** The step of TIGHT the chips sit at, and their text's length when last measured (they're measured again only once it grows). */
  private tight = 0;
  private chipsLen = -1;
  private hearts: Record<Side, HeartBar>;
  /** Each Heartcap's HP before the aftermath, which its number holds until the aftermath drains it. */
  private held: Record<Side, number>;
  /** The round and phase last drawn, so the gold chip pulses once as income lands. */
  private seen: string;

  constructor(mount: HTMLElement, private hud: HudContext, state: BattleState) {
    const { atlas } = hud;
    this.hearts = {
      player: new HeartBar(atlas, 'player', 'Your Heartcap', 'Your Heartcap: if it falls, the battle is lost'),
      enemy: new HeartBar(atlas, 'enemy', 'Gray Rot Heartcap', "The Gray Rot's Heartcap: bring it down to win"),
    };
    this.held = { player: state.sides.player.heartcapHp, enemy: state.sides.enemy.heartcapHp };
    this.goldStat = h('span', { class: 'chip gold', id: 'chip-gold' }, uiIcon(atlas, 'i-gold'), this.gold, this.income);
    const plotsStat = h('span', { class: 'chip', id: 'chip-plots' }, uiIcon(atlas, 'i-supply'), this.plots, h('small', { class: 'word' }, 'plots'));
    this.roundStat = h('span', { class: 'chip round', id: 'chip-round' },
      uiIcon(atlas, 'i-wave'), h('small', { class: 'word' }, 'Round'), this.round, h('small', null, `of ${state.rules.maxRounds}`), this.clock);
    this.stormStat = h('span', { class: 'chip storm', id: 'chip-storm' }, uiIcon(atlas, 'i-storm'), h('small', { class: 'word' }, 'Storm'), this.storm);
    this.chips = h('div', { class: 'chips', 'data-native-tab': '' }, this.goldStat, plotsStat, this.roundStat, this.stormStat);
    mount.append(this.hearts.player.el, this.chips, this.hearts.enemy.el, hud.tip.el);
    this.seen = `${state.round}|${state.phase}`;
  }

  update(state: BattleState, now: number): void {
    const p = state.sides.player, r = state.rules;
    setText(this.gold, String(p.gold));
    // no round follows the last one, so nothing more comes in
    setText(this.income, state.round < r.maxRounds && !state.outcome ? `+${incomePreview(state, 'player').total}` : '');
    const open = p.plots.filter((x) => x.open && x.terrain !== 'stump');
    setText(this.plots, `${open.filter((x) => x.building).length}/${open.length}`);
    setText(this.round, String(state.round));
    const t = state.phase === 'clash' && state.clash ? state.tick - state.clash.startTick : -1;
    setText(this.clock, t < 0 ? '' : clock(t, r.tickRate));
    toggleClass(this.roundStat, 'soon', t >= r.clashCapTicks - 5 * r.tickRate);
    const bp = stormBpFor(r.storm, state.round);
    setText(this.storm, stormText(bp));
    toggleClass(this.stormStat, 'on', bp > 10000);
    const drained = this.hud.aftermath.drained(state, now);
    for (const s of SIDES) {
      const ss = state.sides[s];
      if (state.phase !== 'aftermath') this.held[s] = ss.heartcapHp;
      this.hearts[s].show(Math.round(this.held[s] + (ss.heartcapHp - this.held[s]) * drained), ss.heartcapMaxHp);
    }
    const seen = `${state.round}|${state.phase}`;
    if (seen !== this.seen) {
      // income lands as each planning phase from round 2 opens (§6.2)
      if (state.phase === 'planning' && state.round > 1) this.bump();
      this.seen = seen;
    }
    this.hud.tip.refresh();
    this.fitChips();
  }

  /** Pulses the gold chip as income lands. */
  private bump(): void {
    this.goldStat.classList.remove('bump');
    void this.goldStat.offsetWidth; // restart the animation
    this.goldStat.classList.add('bump');
  }

  /** Lays the chips out afresh (a resize, or the fonts arriving): as designed, and tighter only if they don't fit. */
  fit(): void {
    this.tight = 0;
    this.chips.classList.remove(...TIGHT.filter(Boolean));
    this.chipsLen = -1;
    this.fitChips();
  }

  /**
   * Tightens the chips a step at a time until the row fits between the Heartcaps. Their numbers grow during a
   * battle, so the row is measured whenever its text gets longer; it never loosens until the next fit(), so the
   * chips don't flicker as a count crosses a digit.
   */
  private fitChips(): void {
    if (this.tight === TIGHT.length - 1 || !this.chips.isConnected) return;
    const len = this.chips.textContent!.length;
    if (len <= this.chipsLen) return;
    this.chipsLen = len;
    while (this.tight < TIGHT.length - 1 && this.chips.scrollWidth > this.chips.clientWidth) {
      this.tight++;
      this.chips.classList.add(TIGHT[this.tight]!);
    }
  }

  /** Puts keyboard focus on the gold chip (its tip opens); Tab then moves along the band. */
  focusChips(): void { this.goldStat.focus(); }

  dispose(): void {
    this.hud.tip.dispose();
  }
}
