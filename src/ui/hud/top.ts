// Top band (SPEC §10.2): gold and income, supply, wave and clock, Sporestorm, territory tug bar,
// and the General's Intent panel.
import type { Content } from '../../data/registry.ts';
import { formatClock, incomePerMinute } from '../../sim/index.ts';
import type { BattleState } from '../../sim/index.ts';
import { columnsOwned } from '../../sim/world.ts';
import type { Atlas } from '../../render/atlas.ts';
import { spriteToCanvas } from '../../render/atlas.ts';
import { h, setText, toggleClass } from '../h.ts';

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
  private doctrine = h('div', { class: 'doctrine' });

  constructor(content: Content, atlas: Atlas, state: BattleState) {
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
        h('div', { class: 'name' }, enemyName),
        this.doctrine,
      ),
    );
    setText(this.doctrine, general ? 'Scripted: no counters yet (Milestone 4)' : 'No doctrine');
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
  }
}
