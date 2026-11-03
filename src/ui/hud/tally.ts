// The round tally and the lane tug (SPEC §10.2, §6.7), under the top band's chips. The tally has one pip per
// round up to round 9: violet for a round you won, ash for one the general won, a dash for a round nobody won
// and hollow for one to come, the current round's outlined and, on Twin Roots, one half per lane; under its
// ends sit the Heartcap damage you've dealt in the battle and the damage you've taken. In a clash the lane tug
// takes its place: each lane's surviving supply, yours striped violet from the left and the general's ash from
// the right, locking with the lane's result. The tug stays through the aftermath's drain, then the tally takes
// the round's pip. Each past pip and the tug have a tooltip (`explain.ts`). The tug's bar styles are v1's
// territory tug's (`src/ui/styles.css`).
import '../battle.css';
import { survivingSupply } from '../../sim/rounds/index.ts';
import type { BattleState, Side } from '../../sim/rounds/index.ts';
import { roundOutcome } from '../../sim/rounds/systems/victory.ts';
import { h, setText, toggleClass } from '../h.ts';
import { pipTip, resultOf, tugTip } from './explain.ts';
import type { HudContext, HudPart } from './top.ts';

const RESULTS = ['won', 'lost', 'drawn', 'future'] as const;
const total = (state: BattleState, s: Side) => state.rounds.reduce((n, r) => n + r.damage[s], 0);

/** One lane's surviving supply, with both numbers under its ends; it locks with the lane's result, and a drawn lane goes neutral. */
class LaneBar {
  readonly el: HTMLElement;
  private bar: HTMLElement;
  private p = h('div', { class: 'p' });
  private e = h('div', { class: 'e' });
  private pNum = h('span', { class: 'num p' });
  private eNum = h('span', { class: 'num e' });
  private word = h('span', { class: 'state' });
  private key = '';

  constructor(private lane: number, private lanes: number) {
    this.bar = h('div', { class: 'tugbar' }, this.p, this.e);
    this.el = h('div', { class: 'lane', 'data-lane': lane }, this.bar, h('div', { class: 'tug-label' }, this.pNum, this.word, this.eNum));
  }

  update(state: BattleState): void {
    const lock = state.clash?.lanes[this.lane];
    const p = survivingSupply(state, 'player', this.lane), e = survivingSupply(state, 'enemy', this.lane);
    const result = lock?.ended ? resultOf(lock.winner) : null;
    const key = `${p}|${e}|${result}`;
    if (key === this.key) return;
    this.key = key;
    setText(this.pNum, String(p));
    setText(this.eNum, String(e));
    const name = this.lanes > 1 ? `Lane ${this.lane + 1}` : '';
    setText(this.word, result ? `${name ? `${name} ` : ''}${result}${lock!.capped ? ' at 45 s' : ''}` : name || 'surviving supply');
    const sum = p + e;
    this.p.style.width = `${sum ? (100 * p) / sum : 50}%`;
    this.e.style.width = `${sum ? (100 * e) / sum : 50}%`;
    toggleClass(this.bar, 'locked', !!result);
    toggleClass(this.bar, 'neutral', result === 'drawn' || !sum);
  }
}

/** The lane tug: one bar per lane (§10.2). */
export class LaneTug {
  readonly el: HTMLElement;
  private bars: LaneBar[];

  constructor(hud: HudContext, state: BattleState) {
    const lanes = state.lanes.length;
    this.bars = state.lanes.map((_, i) => new LaneBar(i, lanes));
    this.el = h('div', { class: `tug lanes-${lanes}`, id: 'hud-tug', role: 'img', 'aria-label': 'Surviving supply by lane', 'data-native-tab': '', hidden: true },
      ...this.bars.map((b) => b.el));
    hud.tip.attach(this.el, tugTip(hud.content, hud.atlas, state));
  }

  update(state: BattleState): void {
    for (const b of this.bars) b.update(state);
  }
}

export class RoundTally implements HudPart {
  private tally: HTMLElement;
  private pips: HTMLElement[];
  private dealt = h('b');
  private taken = h('b');
  private tug: LaneTug;
  /** What the pips last showed, so they change only when a round is scored or opens. */
  private key = '';

  constructor(mount: HTMLElement, private hud: HudContext, state: BattleState) {
    this.pips = Array.from({ length: state.rules.maxRounds }, (_, i) => h('span', { class: 'pip future', role: 'img', 'data-round': i + 1 }));
    this.tally = h('div', { class: 'tally', id: 'hud-tally', 'data-native-tab': '' },
      h('div', { class: 'pips' }, ...this.pips),
      h('div', { class: 'tally-label' },
        h('span', { class: 'p', id: 'hud-dealt' }, 'dealt ', this.dealt),
        h('span', null, 'round tally'),
        h('span', { class: 'e', id: 'hud-taken' }, 'taken ', this.taken)));
    this.pips.forEach((pip, i) => hud.tip.attach(pip, pipTip(hud.content, hud.atlas, state, i + 1)));
    this.tug = new LaneTug(hud, state);
    mount.append(this.tally, this.tug.el);
  }

  update(state: BattleState, now: number): void {
    // the clash's lanes stay on the tug while the aftermath drains them into the Heartcaps
    const clashing = state.phase === 'clash' || (state.phase === 'aftermath' && this.hud.aftermath.drained(state, now) < 1);
    this.tally.hidden = clashing;
    this.tug.el.hidden = !clashing;
    if (clashing) this.tug.update(state);
    else this.pipsFor(state);
  }

  private pipsFor(state: BattleState): void {
    const current = state.phase === 'ended' ? 0 : state.round;
    const key = `${state.rounds.length}|${current}`;
    if (key === this.key) return;
    this.key = key;
    const halves = state.lanes.length > 1;
    this.pips.forEach((pip, i) => {
      const r = state.rounds[i];
      const result = r ? resultOf(roundOutcome(r.damage).winner) : 'future';
      pip.classList.remove(...RESULTS);
      pip.classList.add(result);
      toggleClass(pip, 'current', i + 1 === current);
      pip.replaceChildren(...(r && halves ? r.lanes.map((l) => h('i', { class: `half ${resultOf(l.winner)}` })) : []));
      pip.setAttribute('aria-label', `Round ${i + 1}: ${r ? result : 'to come'}`);
      // only played rounds take a tab stop; hovering one to come still opens its tip
      pip.tabIndex = r ? 0 : -1;
    });
    setText(this.dealt, String(total(state, 'player')));
    setText(this.taken, String(total(state, 'enemy')));
  }

  dispose(): void {}
}
