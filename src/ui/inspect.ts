// Inspect for a battle in rounds (SPEC §10.4, §10.2): empty, it shows a short tip. A building, yours or the
// general's, shows its squad and its merge preview in words ("fields as 2 Bloomed + 2", `mergePreview`), its
// plot (rank, file, loam), its squad's damage and survivors in the current or last clash (the rounds'
// per-building records, A064), the gold it has produced, and for yours the merge toggle, the gold upgrade once
// the colony is full (§6.1), and its sell value (`sellValue`), where selling takes two presses. A unit shows its tier, HP, armor and damage type with hints,
// its damage a second over the last 5 s and its kills, from a log the view feeds each step's events. Its
// buttons stay mounted, so a re-render never loses a click or focus.
import { mergePreview, sellValue } from '../sim/index.ts';
import type { BattleState, BuildingState, MergePreview, Side, UnitState } from '../sim/index.ts';
import { findUnit, tierDef, unitDef } from '../sim/world.ts';
import { h, setText, toggleClass } from './h.ts';
import { tierPips } from './icons.ts';
import { TIER_NAME, perkText } from './mergeHints.ts';
import { matchupWords } from './hud/tray.ts';
import type { HudContext, HudPart } from './hud/top.ts';

/** What the panel reads from the session and asks of it: the selection, the sell confirm, and the X and M presses. */
export interface InspectHooks {
  selected(): number | null;
  sellArmed(): number | null;
  /** The merge toggle as it will be once the queued toggles run. */
  mergeShown(id: number): boolean;
  sell(): void;
  toggleMerge(): void;
  /** U: the gold upgrade (§6.1), why it can't be bought now in words (null when it can), and its price. */
  upgrade(): void;
  upgradeBlock(id: number): string | null;
  upgradeCost(id: number): number;
}

/** The damage each source dealt over the last few seconds, and its kills, from the clash's `hit` and `died` events. */
export class RoundCombatLog {
  private hits = new Map<number, { tick: number; amount: number }[]>();
  private lastHitter = new Map<number, number>();
  readonly kills = new Map<number, number>();

  onTick(state: BattleState): void {
    for (const e of state.events) {
      if (e.t === 'clashStarted') { this.hits.clear(); this.lastHitter.clear(); this.kills.clear(); }
      else if (e.t === 'hit') {
        let arr = this.hits.get(e.src);
        if (!arr) { arr = []; this.hits.set(e.src, arr); }
        arr.push({ tick: state.tick, amount: e.amount });
        if (arr.length > 64) arr.splice(0, arr.length - 64);
        this.lastHitter.set(e.target, e.src);
      } else if (e.t === 'died') {
        const k = this.lastHitter.get(e.id);
        if (k !== undefined) this.kills.set(k, (this.kills.get(k) ?? 0) + 1);
        this.lastHitter.delete(e.id);
      }
    }
  }

  /** Damage a second over the last 5 s of clash time. */
  dps(state: BattleState, id: number): number {
    const span = 5 * state.rules.tickRate;
    let sum = 0;
    for (const x of this.hits.get(id) ?? []) if (state.tick - x.tick < span) sum += x.amount;
    return sum / 5;
  }
}

const RANK = ['front', 'second', 'third'];
const sideWord = (side: Side) => (side === 'player' ? 'yours' : 'the Gray Rot');

/** A squad's merge preview in words (§10.2): it fields as "2 Bloomed + 2", or as "8 base" with nothing to knit. */
export function fieldsAs(m: MergePreview['byBuilding'][number] | undefined): string {
  if (!m) return 'nothing';
  if (!m.elders && !m.bloomed) return `${m.base} base`;
  return [m.elders ? `${m.elders} Elder${m.elders > 1 ? 's' : ''}` : '', m.bloomed ? `${m.bloomed} Bloomed` : '', m.base ? String(m.base) : ''].filter(Boolean).join(' + ');
}

/** The empty panel: a short tip, not a hotkey list (those live in Help). */
const emptyTip = () => [
  h('div', null, 'Click a building or a unit to see it here.'),
  h('div', { class: 'muted' }, 'Your buildings can be sold or set to merge from this panel.'),
];

export class RoundInspect implements HudPart {
  readonly el = h('section', { class: 'inspect', id: 'inspect' });
  private title = h('h3', { id: 'inspect-title' }, 'INSPECT');
  private details = h('div', { class: 'details' });
  private buttons: HTMLElement;
  private mergeBtn: HTMLButtonElement;
  private upgradeBtn: HTMLButtonElement;
  private sellBtn: HTMLButtonElement;
  private key = '';
  /** Each side's merge preview, worked out again only when the colony changes. */
  private merge: Partial<Record<Side, { key: string; preview: MergePreview }>> = {};

  constructor(mount: HTMLElement, private hud: HudContext, private log: RoundCombatLog, private hooks: InspectHooks) {
    this.mergeBtn = h('button', {
      class: 'btn', id: 'merge-btn', title: 'Merge toggle: its squad knits trios at the muster (three base units make a Bloomed, three Bloomed an Elder)',
      onclick: () => hooks.toggleMerge(),
    });
    this.upgradeBtn = h('button', { class: 'btn', id: 'upgrade-btn', onclick: () => hooks.upgrade() });
    this.sellBtn = h('button', { class: 'btn', id: 'sell-btn', onclick: () => hooks.sell() });
    this.buttons = h('div', { class: 'buttons', hidden: true }, this.mergeBtn, this.upgradeBtn, this.sellBtn);
    this.details.append(...emptyTip());
    this.el.append(this.title, this.details, this.buttons);
    mount.append(this.el);
  }

  update(state: BattleState): void {
    const id = this.hooks.selected();
    const u = id ? findUnit(state, id) : undefined;
    const b = id && !u ? state.buildings.find((x) => x.id === id) : undefined;
    // a planning command runs before the frame draws, so the toggle it flipped is in the key too
    const key = `${id}|${state.round}|${state.phase}|${state.tick}|${state.queue.length}|${state.buildings.length}|${b?.mergeOn}|${!!b?.upgrade}|${state.sides.player.gold}|${this.hooks.sellArmed()}`;
    if (key === this.key) return;
    this.key = key;
    if (u) this.renderUnit(state, u);
    else if (b) this.renderBuilding(state, b);
    else if (this.el.dataset.mode !== 'none') {
      this.el.dataset.mode = 'none';
      this.buttons.hidden = true;
      setText(this.title, 'INSPECT');
      this.details.replaceChildren(...emptyTip());
    }
  }

  private rows(pairs: [string, string | Node][]): HTMLElement[] {
    return pairs.map(([a, v]) => h('div', { class: 'row' }, h('span', { class: 'muted' }, a), h('span', null, v)));
  }

  private previewOf(state: BattleState, side: Side): MergePreview {
    const key = `${state.round}|${state.buildings.filter((x) => x.side === side).map((x) => `${x.id}@${x.plot}:${x.mergeOn}${x.upgrade ? '+' : ''}`).join(',')}`;
    const c = this.merge[side];
    if (c?.key === key) return c.preview;
    const preview = mergePreview(state, side);
    this.merge[side] = { key, preview };
    return preview;
  }

  private renderBuilding(state: BattleState, b: BuildingState): void {
    const { content } = this.hud;
    const cb = state.compiled[b.side].buildings[b.buildingId]!;
    const plot = state.sides[b.side].plots[b.plot]!;
    this.el.dataset.mode = 'building';
    const pairs: [string, string][] = [];
    if (cb.kind === 'spawner' && cb.squad) {
      const unit = content.units[cb.squad.unit]?.name ?? cb.squad.unit;
      pairs.push(['Squad', `${cb.squad.count} ${cb.squad.count === 1 ? unit : `${unit}s`}${b.upgrade ? ', arriving Bloomed' : ''}`]);
      if (state.config.flags.merging) pairs.push(['Fields as', `${fieldsAs(this.previewOf(state, b.side).byBuilding[b.id])}${b.mergeOn ? '' : ' (merge off)'}`]);
    } else if (cb.kind === 'tower') pairs.push(['Fields', 'one emplacement']);
    else if (cb.economy) pairs.push(['Earns', `${cb.economy.goldPerRound} gold a round${plot.terrain === 'loam' ? `, +${state.compiled[b.side].loamBonusPct}% on this loam` : ''}`]);
    pairs.push(['Plot', `${state.lanes.length > 1 ? `lane ${plot.lane + 1}, ` : ''}${RANK[plot.rank] ?? `rank ${plot.rank + 1}`} rank, file ${plot.file}${plot.terrain === 'loam' ? ', loam' : ''}`]);
    if (cb.squad) pairs.push(...this.clashRows(state, b));
    if (cb.economy) pairs.push(['Gold produced', String(state.stats[b.side].goldByBuilding[String(b.id)] ?? 0)]);
    setText(this.title, `${content.buildings[b.buildingId]?.name ?? b.buildingId} · ${sideWord(b.side)}`);
    this.details.replaceChildren(...this.rows(pairs));
    const mine = b.side === 'player';
    this.buttons.hidden = !mine;
    if (!mine) return;
    const planning = state.phase === 'planning';
    const merging = state.config.flags.merging && cb.kind === 'spawner';
    this.mergeBtn.hidden = !merging;
    if (merging) {
      const on = this.hooks.mergeShown(b.id);
      toggleClass(this.mergeBtn, 'on', on);
      this.mergeBtn.disabled = !planning;
      setText(this.mergeBtn, `Merge ${on ? 'ON' : 'OFF'} [M]`);
    }
    // the gold upgrade (§6.1): once every plot is built on, its squad arrives Bloomed for the rest of the battle
    this.upgradeBtn.hidden = cb.kind !== 'spawner';
    if (cb.kind === 'spawner') {
      const block = b.upgrade ? 'upgraded' : this.hooks.upgradeBlock(b.id);
      this.upgradeBtn.disabled = !planning || block !== null;
      this.upgradeBtn.title = b.upgrade ? 'Upgraded: its squad arrives Bloomed for the rest of the battle'
        : `Upgrade: its squad arrives Bloomed for the rest of the battle${block ? ` (${block})` : ''}`;
      setText(this.upgradeBtn, b.upgrade ? 'Upgraded' : `Upgrade for ${this.hooks.upgradeCost(b.id)} [U]`);
    }
    const refund = sellValue(state, b.id);
    const armed = this.hooks.sellArmed() === b.id;
    toggleClass(this.sellBtn, 'danger', armed);
    this.sellBtn.disabled = !planning;
    setText(this.sellBtn, armed ? `Confirm sell (+${refund}) [X]` : `Sell for ${refund} [X]`);
  }

  /**
   * Its squad's damage and survivors in the clash now running, or in the last one (§10.4, A064): a running clash
   * counts its live units and the damage since its Begin; otherwise the last round's record.
   */
  private clashRows(state: BattleState, b: BuildingState): [string, string][] {
    const s = b.side, key = String(b.id);
    if (state.phase === 'clash') {
      const squad = state.squads.find((q) => q.building === b.id);
      if (!squad) return [['This clash', 'planted after Begin: fields next round']];
      const before = state.rounds.reduce((n, r) => n + (r.damageByBuilding[s][b.id] ?? 0), 0);
      // a merged unit counts once, so the muster's knits leave fewer units than arrived
      const standing = state.units.filter((u) => u.sourceBuildingId === b.id).length;
      return [['This clash', `${(state.stats[s].damageByBuilding[key] ?? 0) - before} damage · ${standing} unit${standing === 1 ? '' : 's'} standing`]];
    }
    const last = state.rounds.at(-1);
    if (!last || b.plantedRound > last.round) return [['Last clash', 'not fielded yet']];
    const label = state.phase === 'planning' ? 'Last clash' : 'This clash';
    const left = last.survivorsByBuilding[s][b.id] ?? 0;
    return [[label, `${last.damageByBuilding[s][b.id] ?? 0} damage · ${left} unit${left === 1 ? '' : 's'} left standing`]];
  }

  private renderUnit(state: BattleState, u: UnitState): void {
    const { content, atlas } = this.hud;
    const def = unitDef(state, u), t = tierDef(state, u), rate = state.rules.tickRate;
    const words = matchupWords(state, u.side, u.unitId);
    this.el.dataset.mode = 'unit';
    const pairs: [string, string | Node][] = [
      ['Tier', h('span', null, TIER_NAME[u.tier - 1], tierPips(atlas, u.tier))],
      ['HP', `${u.hp} / ${u.maxHp}${u.shield ? ` + ${u.shield} shield` : ''}`],
    ];
    if (t.healAmount > 0) pairs.push(['Heals', `${t.healAmount} HP every ${t.healTicks / rate} s · range ${t.range}`]);
    else {
      pairs.push(['Damage', `${Math.round(t.damage * 10) / 10} ${def.damageType} every ${t.attackTicks / rate} s`]);
      pairs.push(['Hits hard', `strong vs ${words.strong} · weak vs ${words.weak}`]);
    }
    pairs.push(['Armor', def.armor === 'structure' ? 'structure' : `${def.armor} (fears ${words.fears})`]);
    if (t.slayerMult !== 1) pairs.push(['Slayer', `×${t.slayerMult} vs Bloomed & Elder`]);
    if (u.tier > 1) pairs.push(['Perk', perkText(content, u.unitId, u.tier)]);
    pairs.push(['Damage / s', this.log.dps(state, u.id).toFixed(1)], ['Kills', String(this.log.kills.get(u.id) ?? 0)]);
    this.buttons.hidden = true;
    setText(this.title, `${content.units[u.unitId]?.name ?? content.buildings[u.unitId]?.name ?? u.unitId} · ${sideWord(u.side)}`);
    this.details.replaceChildren(...this.rows(pairs));
  }

  dispose(): void {}
}
