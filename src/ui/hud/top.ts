// Top band (SPEC §10.2): gold and income, supply, wave and clock, Sporestorm, territory tug bar,
// and the General's Intent panel (SPEC §7.5): portrait, the active doctrine's icon and any pending
// warning with its countdown in waves. It names counter kinds, never units.
import type { Content } from '../../data/registry.ts';
import { formatClock, incomePerMinute } from '../../sim/index.ts';
import type { BattleState } from '../../sim/index.ts';
import { columnsOwned } from '../../sim/world.ts';
import type { Atlas } from '../../render/atlas.ts';
import { spriteToCanvas } from '../../render/atlas.ts';
import { h, setText, toggleClass } from '../h.ts';
import { KIND_HINT, KIND_ICON, KIND_LABEL, intentOf, wavesText } from '../doctrine.ts';
import type { Intent } from '../doctrine.ts';

export class TopBand {
  readonly el: HTMLElement;
  private gold = h('b', { id: 'hud-gold' });
  private income = h('span', { class: 'sub', id: 'hud-income' });
  private supply = h('b', { id: 'hud-supply' });
  private wave = h('b', { id: 'hud-wave' });
  private clock = h('span', { class: 'sub', id: 'hud-clock' });
  private storm = h('b', { id: 'hud-storm' });
  private columns = h('span', { id: 'hud-columns' });
  private tugP = h('div', { class: 'p' });
  private tugN = h('div', { class: 'n' });
  private tugE = h('div', { class: 'e' });
  private doctrine = h('div', { class: 'doctrine', id: 'hud-doctrine' });
  private warning = h('div', { class: 'warning', id: 'hud-warning', hidden: true });
  private intentKey = '';
  private fallback: string;

  constructor(content: Content, private atlas: Atlas, state: BattleState) {
    const ctl = state.config.enemy.controller;
    const general = ctl.kind === 'general' ? content.generals[ctl.id] : undefined;
    const portrait = spriteToCanvas(atlas, general?.sprite ?? 'g-scripted', 'gray-rot');
    const enemyName = general ? general.name : ctl.kind === 'bot' ? `Bot: ${ctl.id}` : 'Gray Rot (idle)';
    this.el = h('header', { class: 'top' },
      h('div', { class: 'stats' },
        h('div', { class: 'statrow' },
          h('span', { class: 'stat', title: 'Gold (and projected income per minute)' }, h('span', { class: 'icon' }, '◆'), this.gold, this.income),
          h('span', { class: 'stat', title: 'Supply used / cap' }, h('span', { class: 'icon' }, '⬢'), this.supply),
          h('span', { class: 'stat', title: 'Wave and battle clock' }, h('span', { class: 'icon' }, '⧗'), h('span', null, 'Wave '), this.wave, this.clock),
          h('span', { class: 'stat', title: 'Sporestorm stacks: units +10% damage, turrets −10%, Heartcaps take +10% each' }, h('span', { class: 'icon' }, '☁'), h('span', null, 'Storm '), this.storm),
        ),
        h('div', { class: 'tug', title: 'Territory: columns owned' }, h('span', { class: 'hint' }, 'territory'), h('div', { class: 'tugbar', id: 'hud-tug' }, this.tugP, this.tugN, this.tugE), this.columns),
      ),
      h('aside', { class: 'intent', id: 'hud-intent' },
        portrait,
        h('div', { class: 'title' }, "GENERAL'S INTENT"),
        h('div', { class: 'name', id: 'hud-general' }, enemyName),
        this.doctrine,
        this.warning,
      ),
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
      this.warning.replaceChildren(icon(i.pending.kind), h('span', null, 'Preparing to counter your ', h('b', null, KIND_LABEL[i.pending.kind])),
        h('span', { class: 'countdown', id: 'hud-countdown' }, wavesText(i.pending.waves)));
      this.warning.dataset.kind = i.pending.kind;
    }
  }

  update(state: BattleState): void {
    const p = state.sides.player;
    setText(this.gold, String(p.gold));
    setText(this.income, `(+${incomePerMinute(state, 'player')}/min)`);
    setText(this.supply, `${p.supplyUsed}/${p.supplyCap}`);
    const wave = Math.floor(state.tick / state.rules.waveTicks) + 1;
    setText(this.wave, String(state.phase === 'deploy' ? 0 : wave));
    setText(this.clock, `· ${formatClock(state.tick, state.rules.tickRate)}`);
    setText(this.storm, String(state.sporestorm));
    toggleClass(this.storm, 'storm-on', state.sporestorm > 0);
    const pc = columnsOwned(state, 'player'), ec = columnsOwned(state, 'enemy');
    const total = state.map.width * state.lanes.length;
    this.tugP.style.width = `${(100 * pc) / total}%`;
    this.tugN.style.width = `${(100 * (total - pc - ec)) / total}%`;
    this.tugE.style.width = `${(100 * ec) / total}%`;
    setText(this.columns, `${pc} : ${ec} columns`);
    this.renderIntent(intentOf(state));
  }
}
