// Inspect panel (SPEC §10.4): units show tier, HP, damage type and armor with matrix hints, live DPS
// over the last 5 s and kills; buildings show spawn timer, living units, damage dealt, gold
// produced and sell value. Selling takes two presses (the first shows the refund).
import type { Content } from '../data/registry.ts';
import { sellValue } from '../sim/index.ts';
import type { BattleState } from '../sim/index.ts';
import { findBuilding, findUnit, isBesieged } from '../sim/world.ts';
import { h } from './h.ts';
import { strongVs, vulnerableTo, weakVs } from './matrixHints.ts';

/** UI-side combat log fed from hit/died events: per-source damage history and kills. */
export class CombatLog {
  private hits = new Map<number, { tick: number; amount: number }[]>();
  private lastHitter = new Map<number, number>();
  readonly kills = new Map<number, number>();

  onTick(state: BattleState): void {
    for (const e of state.events) {
      if (e.t === 'hit') {
        let arr = this.hits.get(e.src);
        if (!arr) { arr = []; this.hits.set(e.src, arr); }
        arr.push({ tick: state.tick, amount: e.amount });
        if (arr.length > 64) arr.splice(0, arr.length - 64);
        this.lastHitter.set(e.target, e.src);
      } else if (e.t === 'died' || e.t === 'buildingDestroyed') {
        const k = this.lastHitter.get(e.id);
        if (k !== undefined) this.kills.set(k, (this.kills.get(k) ?? 0) + 1);
        this.lastHitter.delete(e.id);
      }
    }
  }

  dps(state: BattleState, id: number): number {
    const window = 5 * state.rules.tickRate;
    const arr = this.hits.get(id) ?? [];
    let sum = 0;
    for (const x of arr) if (state.tick - x.tick < window) sum += x.amount;
    return sum / 5;
  }
}

export class InspectPanel {
  readonly el = h('section', { class: 'inspect', id: 'inspect' });
  private key = '';
  private confirmSell = false;

  constructor(private content: Content, private log: CombatLog, private onSell: (id: number) => void) {
    this.el.append(h('h3', null, 'INSPECT'), h('div', { class: 'muted' }, 'Click a building or unit. Hotkeys: 1–6 build, Space pause, [ ] speed, Tab cycle, X sell.'));
  }

  /** First press shows the refund, the second confirms (SPEC §10.3). */
  requestSell(state: BattleState, id: number): void {
    if (!findBuilding(state, id)) return;
    if (this.confirmSell) { this.confirmSell = false; this.onSell(id); this.key = ''; }
    else { this.confirmSell = true; this.key = ''; }
  }

  resetConfirm(): void { this.confirmSell = false; }

  update(state: BattleState, selected: number | null): void {
    const u = selected ? findUnit(state, selected) : undefined;
    const b = selected && !u ? findBuilding(state, selected) : undefined;
    const key = `${selected}|${state.tick}|${this.confirmSell}`;
    if (key === this.key) return;
    this.key = key;
    if (u) this.renderUnit(state, u.id);
    else if (b) this.renderBuilding(state, b.id);
    else if (this.el.dataset.mode !== 'none') {
      this.el.dataset.mode = 'none';
      this.confirmSell = false;
      this.el.replaceChildren(h('h3', null, 'INSPECT'), h('div', { class: 'muted' }, 'Click a building or unit to inspect it. 1–6 build · Space pause · [ ] speed · Tab cycle · X sell.'));
    }
  }

  private rows(pairs: [string, string][]): HTMLElement[] {
    return pairs.map(([a, b]) => h('div', { class: 'row' }, h('span', { class: 'muted' }, a), h('span', null, b)));
  }

  private renderUnit(state: BattleState, id: number): void {
    const u = findUnit(state, id)!;
    const def = this.content.units[u.unitId]!;
    this.el.dataset.mode = 'unit';
    const tier = u.tier === 1 ? 'base' : u.tier === 2 ? 'Bloomed' : 'Elder';
    this.el.replaceChildren(
      h('h3', null, `${def.name} · ${u.side === 'player' ? 'Velvet Bloom' : 'Gray Rot'}`),
      ...this.rows([
        ['Tier', tier],
        ['HP', `${u.hp} / ${u.maxHp}`],
        ['Damage', `${def.damage} ${def.damageType} / ${def.attackInterval}s`],
        ['Hits hard', `strong vs ${strongVs(state, def.damageType)} · weak vs ${weakVs(state, def.damageType)}`],
        ['Armor', `${def.armor} (fears ${vulnerableTo(state, def.armor)})`],
        ['DPS (5 s)', this.log.dps(state, u.id).toFixed(1)],
        ['Kills', String(this.log.kills.get(u.id) ?? 0)],
      ]),
    );
  }

  private renderBuilding(state: BattleState, id: number): void {
    const b = findBuilding(state, id)!;
    const def = this.content.buildings[b.buildingId]!;
    const cb = state.compiled[b.side].buildings[b.buildingId]!;
    this.el.dataset.mode = 'building';
    const besieged = isBesieged(state, b);
    const pairs: [string, string][] = [['HP', `${b.hp} / ${b.maxHp}`]];
    if (cb.spawn) {
      const ticks = b.holding ? 0 : Math.ceil(b.timer / (besieged ? state.rules.besiegedHalfTicks : state.rules.normalHalfTicks));
      pairs.push(['Next spawn', b.holding ? 'waiting for supply ⬢!' : `${(ticks / state.rules.tickRate).toFixed(1)}s${besieged ? ' (½ speed)' : ''}`]);
      pairs.push(['Living units', String(state.units.filter((x) => x.sourceBuildingId === b.id).length)]);
    }
    if (cb.attack) pairs.push(['Attack', `${cb.attack.damageType} ${cb.attack.damage} · range ${cb.attack.minRange}–${cb.attack.range}`]);
    pairs.push(['Damage dealt', String(state.stats[b.side].damageByBuilding[String(b.id)] ?? 0)]);
    if (cb.economy) pairs.push(['Gold produced', String(state.stats[b.side].goldByBuilding[String(b.id)] ?? 0)]);
    if (besieged) pairs.push(['Status', 'besieged: ½ speed, cannot sell']);
    const children: HTMLElement[] = [h('h3', null, `${def.name} · ${b.side === 'player' ? 'yours' : 'Gray Rot'}`), ...this.rows(pairs)];
    if (b.side === 'player') {
      const refund = sellValue(state, b.id);
      const btn = h('button', {
        class: `btn ${this.confirmSell ? 'danger' : ''}`, id: 'sell-btn', disabled: besieged || state.phase === 'ended',
        onclick: () => this.requestSell(state, b.id),
      }, this.confirmSell ? `Confirm sell (+${refund}) [X]` : `Sell for ${refund} [X]`);
      children.push(btn);
    }
    this.el.replaceChildren(...children);
  }
}
