// Top band (SPEC §10.2): your Heartcap at the left end and theirs at the right, so the win condition
// frames the band, with the territory tug between them (one bar per lane, a tick per column, a glowing
// frontier) under icon chips for gold and income, supply, wave and clock, and Sporestorm. The General's
// Intent panel (SPEC §7.5) closes the band: portrait, the active doctrine's icon and any pending warning
// with a pulsing countdown in waves. It names counter kinds, never units.
import type { Content } from '../../data/registry.ts';
import { formatClock, incomePerMinute } from '../../sim/index.ts';
import type { BattleState, Side } from '../../sim/index.ts';
import { columnsOwned } from '../../sim/world.ts';
import type { Atlas } from '../../render/atlas.ts';
import { spriteToCanvas } from '../../render/atlas.ts';
import { h, setText, toggleClass } from '../h.ts';
import { uiIcon } from '../icons.ts';
import { KIND_HINT, KIND_ICON, KIND_LABEL, intentOf, wavesText } from '../doctrine.ts';
import type { Intent } from '../doctrine.ts';
import { AnchoredTip } from '../tooltip.ts';
import { goldTip, stormTip, supplyTip, territoryTip, waveTip } from './explain.ts';
import { KitView } from './kit.ts';

/** A Heartcap's block: its cap, HP and a bar that drains toward the field's centre. */
class HeartBar {
  readonly el: HTMLElement;
  private hp = h('b');
  private max = h('small');
  private fill = h('i');
  private pct = -1;

  constructor(atlas: Atlas, private side: Side, label: string, title: string) {
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

  update(state: BattleState): void {
    const s = state.sides[this.side];
    setText(this.hp, String(s.heartcapHp));
    setText(this.max, `/${s.heartcapMaxHp}`);
    const pct = Math.max(0, Math.round((1000 * s.heartcapHp) / s.heartcapMaxHp) / 10);
    if (pct === this.pct) return;
    this.pct = pct;
    this.fill.style.width = `${pct}%`;
    this.fill.parentElement!.setAttribute('aria-valuenow', String(pct));
    // under a third, the number says it in danger red as well as the bar's length
    toggleClass(this.el, 'low', pct < 34);
  }
}

/** One lane's territory: your striped columns, the unclaimed ones, theirs, and the frontier between. */
class LaneTug {
  readonly el: HTMLElement;
  private p = h('div', { class: 'p' });
  private n = h('div', { class: 'n' });
  private e = h('div', { class: 'e' });
  private front = h('div', { class: 'front' });
  private key = '';

  constructor(private lane: number, columns: number) {
    this.el = h('div', { class: 'tugbar', style: `--cols:${columns}` }, this.p, this.n, this.e, this.front);
  }

  update(state: BattleState): void {
    const L = state.lanes[this.lane]!, W = state.map.width;
    const key = `${L.pBorder}|${L.eBorder}`;
    if (key === this.key) return;
    this.key = key;
    const pc = L.pBorder + 1, ec = W - L.eBorder;
    this.p.style.width = `${(100 * pc) / W}%`;
    this.n.style.width = `${(100 * (W - pc - ec)) / W}%`;
    this.e.style.width = `${(100 * ec) / W}%`;
    this.front.style.left = `${(100 * pc) / W}%`;
  }
}

export class TopBand {
  readonly el: HTMLElement;
  private gold = h('b', { id: 'hud-gold' });
  private goldStat: HTMLElement;
  private income = h('small', { id: 'hud-income' });
  private supply = h('b', { id: 'hud-supply' });
  private wave = h('b', { id: 'hud-wave' });
  private clock = h('small', { id: 'hud-clock' });
  private storm = h('b', { id: 'hud-storm' });
  private stormStat: HTMLElement;
  private colsP = h('span', { class: 'p' });
  private colsE = h('span', { class: 'e' });
  private hearts: HeartBar[];
  private lanes: LaneTug[];
  private doctrine = h('div', { class: 'doctrine', id: 'hud-doctrine' });
  private warning = h('div', { class: 'warning', id: 'hud-warning', hidden: true });
  private intentKey = '';
  private fallback: string;
  /** The chips' and the tug's tooltips (src/ui/hud/explain.ts): one tip, under whichever is hovered or focused. */
  readonly tip = new AnchoredTip('hud-tip', 'below');
  /** Your relics and upgrades: a chip and its popover. */
  readonly kit: KitView;

  constructor(content: Content, private atlas: Atlas, state: BattleState) {
    const ctl = state.config.enemy.controller;
    const general = ctl.kind === 'general' ? content.generals[ctl.id] : undefined;
    const portrait = spriteToCanvas(atlas, general?.sprite ?? 'g-scripted', 'gray-rot');
    portrait.className = 'portrait';
    portrait.setAttribute('aria-hidden', 'true');
    const enemyName = general ? general.name : ctl.kind === 'bot' ? `Bot: ${ctl.id}` : 'Gray Rot (idle)';
    this.hearts = [
      new HeartBar(atlas, 'player', 'Your Heartcap', 'Your Heartcap: if it falls, the battle is lost'),
      new HeartBar(atlas, 'enemy', 'Gray Rot Heartcap', "The Gray Rot's Heartcap: bring it down to win"),
    ];
    this.lanes = state.lanes.map((_, i) => new LaneTug(i, state.map.width));
    this.goldStat = h('span', { class: 'chip gold', id: 'chip-gold' }, uiIcon(atlas, 'i-gold'), this.gold, this.income);
    this.stormStat = h('span', { class: 'chip storm', id: 'chip-storm' }, uiIcon(atlas, 'i-storm'), h('small', null, 'Storm'), this.storm);
    const supplyStat = h('span', { class: 'chip', id: 'chip-supply' }, uiIcon(atlas, 'i-supply'), this.supply, h('small', null, 'supply'));
    const waveStat = h('span', { class: 'chip', id: 'chip-wave' }, uiIcon(atlas, 'i-wave'), h('small', null, 'Wave'), this.wave, this.clock);
    this.kit = new KitView(content, atlas, state);
    const lanes = state.lanes.length;
    const tug = h('div', { class: `tug lanes-${lanes}`, id: 'hud-tug', role: 'img', 'aria-label': 'Territory: columns owned' }, ...this.lanes.map((l) => l.el));
    this.tip.attach(this.goldStat, goldTip(content, atlas, state));
    this.tip.attach(supplyStat, supplyTip(content, atlas, state));
    this.tip.attach(waveStat, waveTip(content, atlas, state));
    this.tip.attach(this.stormStat, stormTip(content, atlas, state));
    this.tip.attach(tug, territoryTip(content, atlas, state));
    this.el = h('header', { class: 'top' },
      this.hearts[0]!.el,
      h('div', { class: 'mid' },
        h('div', { class: 'chips', 'data-native-tab': '' }, this.goldStat, supplyStat, waveStat, this.stormStat, this.kit.chip),
        tug,
        h('div', { class: 'tug-label', id: 'hud-columns' }, this.colsP, h('span', { class: 'muted' }, 'territory'), this.colsE),
      ),
      this.hearts[1]!.el,
      h('aside', { class: 'intent', id: 'hud-intent' },
        portrait,
        h('div', { class: 'title' }, "General's intent"),
        h('div', { class: 'name', id: 'hud-general' }, enemyName),
        this.doctrine,
        this.warning,
      ),
      this.tip.el,
      this.kit.el,
    );
    this.fallback = !general ? 'No doctrine' : general.adaptive ? 'Adaptation off' : 'Scripted: never adapts';
    this.renderIntent(intentOf(state));
  }

  /** Doctrine row and warning row; rebuilt only when the intent changes. */
  private renderIntent(i: Intent): void {
    const key = JSON.stringify(i);
    if (key === this.intentKey) return;
    this.intentKey = key;
    const icon = (kind: keyof typeof KIND_ICON) => {
      const c = spriteToCanvas(this.atlas, KIND_ICON[kind], 'velvet-bloom');
      c.className = 'kind-icon';
      c.title = KIND_HINT[kind];
      return c;
    };
    const kinds: HTMLElement[] = [];
    if (i.active) kinds.push(h('span', { class: 'kind', 'data-kind': i.active }, icon(i.active), `Countering ${KIND_LABEL[i.active]}`));
    if (i.opening.length) {
      kinds.push(h('span', { class: 'kind', 'data-kind': i.opening.join('+') }, ...i.opening.map(icon),
        `${i.dual ? 'Dual doctrine' : 'Remembers'}: ${i.opening.map((k) => KIND_LABEL[k]).join(' + ')}`));
    }
    if (!kinds.length) kinds.push(h('span', { class: 'kind none' }, i.adaptive ? 'Watching your army' : this.fallback));
    this.doctrine.replaceChildren(...kinds);
    this.warning.hidden = !i.pending;
    if (i.pending) {
      // one lit pip per wave left; the pips and the count pulse, and hold still under reduced motion
      const pips = h('span', { class: 'pips', 'aria-hidden': 'true' }, ...Array.from({ length: Math.min(i.pending.waves, 4) }, () => h('i')));
      this.warning.replaceChildren(icon(i.pending.kind), h('span', { class: 'what' }, 'Preparing to counter your ', h('b', null, KIND_LABEL[i.pending.kind])),
        h('span', { class: 'when' }, pips, h('span', { class: 'countdown', id: 'hud-countdown' }, wavesText(i.pending.waves))));
      this.warning.dataset.kind = i.pending.kind;
    }
  }

  /** Pulses the gold counter as income lands, matching the coin pops on the field. */
  bump(): void {
    this.goldStat.classList.remove('bump');
    void this.goldStat.offsetWidth; // restart the animation
    this.goldStat.classList.add('bump');
  }

  update(state: BattleState): void {
    const p = state.sides.player;
    setText(this.gold, String(p.gold));
    setText(this.income, `+${incomePerMinute(state, 'player')}/min`);
    setText(this.supply, `${p.supplyUsed}/${p.supplyCap}`);
    const wave = Math.floor(state.tick / state.rules.waveTicks) + 1;
    setText(this.wave, String(state.phase === 'deploy' ? 0 : wave));
    setText(this.clock, formatClock(state.tick, state.rules.tickRate));
    setText(this.storm, String(state.sporestorm));
    toggleClass(this.stormStat, 'on', state.sporestorm > 0);
    for (const b of this.hearts) b.update(state);
    for (const l of this.lanes) l.update(state);
    const pc = columnsOwned(state, 'player'), ec = columnsOwned(state, 'enemy');
    setText(this.colsP, `${pc} column${pc === 1 ? '' : 's'}`);
    setText(this.colsE, `${ec} column${ec === 1 ? '' : 's'}`);
    this.renderIntent(intentOf(state));
    this.tip.refresh();
    this.kit.update(state);
  }

  /** Puts keyboard focus on the gold chip (its tip opens); Tab then moves along the band's chips. */
  focusChips(): void { this.goldStat.focus(); }

  dispose(): void {
    this.tip.dispose();
    this.kit.dispose();
  }
}
