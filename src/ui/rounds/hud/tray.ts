// The kit tray of a battle in rounds (SPEC §10.2, §4.4): your kit's cards in tray order (economy first, then
// army, defense and utility, each in kit order), which the 1–9 hotkeys follow. A card shows its role's cap band,
// its hotkey, its price as a gold chip, the building at 2×, its name and its role word; an army card shows its
// squad (the unit's sprite and "×N"), and an economy card what it earns a round. The price is `priceOf`, since a
// building costs the same on every plot (§6.3). A card you can't afford is unlit, with a bar filling toward the
// price and "need N". In a clash the tray takes no clicks, since planting is a planning action, but its
// tooltips still open: the squad and its unit's stats, strong vs, weak vs and armor, merge perks, and an
// economy card's rounds to pay for itself. R2a's single battles have no copies to show (D45). Each card
// carries `data-building` for tests and captures. It stands beside v1's `src/ui/hud/tray.ts`, whose card
// styles and compact fit it reuses.
import '../rounds.css';
import type { Content } from '../../../data/registry.ts';
import type { Atlas } from '../../../render/atlas.ts';
import { spriteToCanvas } from '../../../render/atlas.ts';
import { matchupClass, priceOf, SIDES } from '../../../sim/rounds/index.ts';
import type { Armor, BattleState, CompiledBuilding, CompiledUnit, DamageType, Side } from '../../../sim/rounds/index.ts';
import { ROLE_LABEL, trayOrder } from '../../buildingInfo.ts';
import { h, setText, toggleClass } from '../../h.ts';
import { priceEl } from '../../icons.ts';
import { perkText } from '../../mergeHints.ts';
import { AnchoredTip } from '../../tooltip.ts';
import type { TipSource } from '../../tooltip.ts';
import type { HudContext, HudPart } from './top.ts';

/** Full-size cards: the narrowest a card gets in one row (`.tray`'s grid minimum in styles.css), and the gap between cards (layout px). */
const CARD_MIN = 88;
const GAP = 6;

/** What the tray reads from the session: the gold left once queued plants run, the chosen card, and choosing one. */
export interface TrayHooks {
  available(): number;
  placing(): string | null;
  pick(id: string): void;
}

const ARMORS: Armor[] = ['light', 'medium', 'heavy'];
const TYPES: DamageType[] = ['slash', 'pierce', 'crush'];
const cap = (s: string) => s[0]!.toUpperCase() + s.slice(1);
const secs = (ticks: number, rate: number) => `${Math.round((ticks / rate) * 10) / 10} s`;
const plural = (n: number, name: string) => (n === 1 ? name : `${name}s`);

type Ref = { side: Side; id: string };

/** One unit of each armor, and one attacker of each damage type, among the battle's units, emplacements aside: what the matchup words classify against. */
function representatives(state: BattleState): { byArmor: Map<Armor, Ref>; byType: Map<DamageType, Ref> } {
  const byArmor = new Map<Armor, Ref>(), byType = new Map<DamageType, Ref>();
  for (const side of SIDES) {
    for (const u of Object.values(state.compiled[side].units)) {
      if (u.emplacement) continue;
      if (!byArmor.has(u.armor)) byArmor.set(u.armor, { side, id: u.id });
      if (!u.support && !byType.has(u.damageType)) byType.set(u.damageType, { side, id: u.id });
    }
  }
  return { byArmor, byType };
}

/**
 * A unit's matchups in the matrix's words (§5.3, §10.4): the armors its base-tier hits are strong and weak
 * against, and the damage types strong against it, each class from `matchupClass`, so no rule is copied here.
 */
export function matchupWords(state: BattleState, side: Side, unitId: string): { strong: string; weak: string; fears: string } {
  const { byArmor, byType } = representatives(state);
  const vs = (cls: 'strong' | 'weak') => ARMORS.filter((a) => {
    const t = byArmor.get(a);
    return t && matchupClass(state, side, unitId, 1, t.side, t.id, 1) === cls;
  }).map(cap).join(' & ') || '—';
  const fears = TYPES.filter((d) => {
    const by = byType.get(d);
    return by && matchupClass(state, by.side, by.id, 1, side, unitId, 1) === 'strong';
  }).map(cap).join(' & ') || '—';
  return { strong: vs('strong'), weak: vs('weak'), fears };
}

/** The card's line under its name: an army card's squad, a tower's emplacement, an economy card's gold a round. */
function cardLine(content: Content, atlas: Atlas, cb: CompiledBuilding): (string | Node)[] {
  if (cb.kind === 'spawner' && cb.squad) {
    const unit = content.units[cb.squad.unit];
    const art = spriteToCanvas(atlas, unit?.sprite ?? '', 'velvet-bloom');
    art.className = 'squad-art';
    art.setAttribute('aria-hidden', 'true');
    return [h('span', { class: 'squad' }, art, `×${cb.squad.count}`)];
  }
  if (cb.kind === 'tower') return ['1 emplacement'];
  if (cb.economy) return [`+${cb.economy.goldPerRound}\u00a0gold a\u00a0round`];
  return ['does nothing yet'];
}

/** A unit's rows in a tooltip: its stats at base tier, its matchups in words and its merge perks (§10.2, §10.4). */
export function unitRows(content: Content, state: BattleState, side: Side, cu: CompiledUnit): [string, string][] {
  const t = cu.tiers[0], rate = state.rules.tickRate;
  const words = matchupWords(state, side, cu.id);
  const rows: [string, string][] = [['Each unit', `${t.hp} HP · ${t.supply} supply`]];
  if (t.healAmount > 0) rows.push(['Heals', `${t.healAmount} HP every ${secs(t.healTicks, rate)} · range ${t.range}`]);
  else {
    rows.push(['Attack', `${Math.round(t.damage * 10) / 10} ${cu.damageType} every ${secs(t.attackTicks, rate)} · ${cu.projectileSpeed > 0 || cu.emplacement ? `range ${cu.emplacement?.minRange ? `${cu.emplacement.minRange}–` : ''}${t.range}` : 'melee'}`]);
    rows.push(['Strong vs', words.strong], ['Weak vs', words.weak]);
  }
  rows.push(['Armor', cu.armor === 'structure' ? 'Structure' : `${cap(cu.armor)} · hurt most by ${words.fears}`]);
  if (cu.siege) rows.push(['Siege', `×${t.siegeMult} vs structures, and counts twice toward Heartcap damage`]);
  if (cu.slayer) rows.push(['Slayer', `×${t.slayerMult} vs Bloomed and Elder units`]);
  if (state.config.flags.merging && !cu.emplacement && content.units[cu.id]) {
    rows.push(['Bloomed', perkText(content, cu.id, 2) || 'no perk'], ['Elder', perkText(content, cu.id, 3) || 'no perk']);
  }
  return rows;
}

/** A card's tooltip: role, price, what it fields or earns, and its unit's stats and matchups. */
function cardTip(content: Content, atlas: Atlas, state: BattleState, id: string, hotkey: string): TipSource {
  return {
    key: () => `${id}|${state.phase}`,
    build: () => {
      const b = content.buildings[id]!, cb = state.compiled.player.buildings[id]!;
      const price = priceOf(state, 'player', id);
      const rows: [string, string][] = [];
      const unit = cb.squad ? state.compiled.player.units[cb.squad.unit] : undefined;
      if (cb.kind === 'spawner' && cb.squad) {
        const name = content.units[cb.squad.unit]?.name ?? cb.squad.unit;
        rows.push(['Squad', `${cb.squad.count} ${plural(cb.squad.count, name)}, fielded fresh each round`]);
      } else if (cb.kind === 'tower') rows.push(['Fields', 'one emplacement at its slot: it never moves or merges, and counts no supply']);
      if (unit) rows.push(...unitRows(content, state, 'player', unit));
      if (cb.economy) {
        const e = cb.economy, c = state.compiled.player;
        rows.push(['Income', `+${e.goldPerRound} gold a round, +${Math.floor((e.goldPerRound * c.loamBonusPct) / 100)} more on loam`]);
        if (e.interestCapAdd) rows.push(['Interest cap', `+${e.interestCapAdd} while it stands`]);
        if (e.goldPerRound > 0) {
          const n = Math.ceil(price / e.goldPerRound);
          rows.push(['Pays for itself', `in ${n} ${plural(n, 'round')}`]);
        }
      }
      if (cb.kind === 'utility') rows.push(['In rounds', 'it plants, but does nothing yet']);
      return [
        h('div', { class: 'tip-head' }, h('b', null, b.name), h('span', { class: `role ${cb.kind}` }, ROLE_LABEL[cb.kind]), priceEl(atlas, price)),
        ...rows.map(([k, v]) => h('div', { class: 'row' }, h('span', { class: 'muted' }, k), h('span', null, v))),
        h('div', { class: 'tip-foot' }, state.phase === 'planning'
          ? `${hotkey ? `Press ${hotkey} or click` : 'Click'}, then click a plot. It costs the same on every plot.`
          : 'Planting is for planning: the tray opens again after the aftermath.'),
      ];
    },
  };
}

interface Card {
  id: string; name: string; el: HTMLElement; nameEl: HTMLElement; price: number; fill: HTMLElement; need: HTMLElement;
  poor: boolean | null; short: number;
}

export class RoundTray implements HudPart {
  readonly el = h('div', { class: 'tray rounds-tray', id: 'tray' });
  private tip: AnchoredTip;
  private cards: Card[] = [];
  /** The state last drawn, so a click knows the phase. */
  private state: BattleState;

  constructor(mount: HTMLElement, hud: HudContext, state: BattleState, private hooks: TrayHooks) {
    const { content, atlas } = hud;
    this.state = state;
    this.tip = new AnchoredTip('card-tip', 'above', 'card-tip');
    trayOrder(content, state.sides.player.kit.map((k) => k.building)).forEach((id, i) => {
      const b = content.buildings[id]!, cb = state.compiled.player.buildings[id]!;
      const key = i < 9 ? `[${i + 1}]` : '';
      const sprite = spriteToCanvas(atlas, b.sprite, 'velvet-bloom');
      sprite.className = 'art';
      sprite.setAttribute('aria-hidden', 'true');
      const fill = h('i');
      const need = h('span', { class: 'need-label' });
      const nameEl = h('div', { class: 'name' }, b.name);
      const price = priceOf(state, 'player', id);
      const el: HTMLElement = h('button', {
        class: `card ${cb.kind}`, 'data-building': id,
        onclick: () => { if (this.state.phase === 'planning') hooks.pick(id); },
      },
        h('div', { class: 'head' }, h('span', { class: 'key' }, i < 9 ? String(i + 1) : ''), priceEl(atlas, price)),
        sprite,
        nameEl,
        h('div', { class: `role ${cb.kind}` }, ROLE_LABEL[cb.kind]),
        h('div', { class: 'out' }, ...cardLine(content, atlas, cb)),
        h('div', { class: 'need' }, h('span', { class: 'needbar', 'aria-hidden': 'true' }, fill), need),
      );
      this.tip.attach(el, cardTip(content, atlas, state, id, key));
      this.cards.push({ id, name: b.name, el, nameEl, price, fill, need, poor: null, short: -1 });
      this.el.append(el);
    });
    this.el.style.setProperty('--n', String(this.cards.length));
    this.el.style.setProperty('--cols', String(Math.ceil(this.cards.length / 2)));
    mount.append(this.el, this.tip.el);
  }

  /**
   * Full-size cards in one row if they fit the tray's width, else the compact two-row tray. A compact name that
   * still overflows is squeezed a little, then set a size smaller, rather than cut (v1's fit).
   */
  fit(): void {
    const n = this.cards.length;
    const compact = n * CARD_MIN + (n - 1) * GAP > this.el.clientWidth;
    toggleClass(this.el, 'compact', compact);
    for (const c of this.cards) {
      c.nameEl.classList.remove('squeeze', 'squeeze-more');
      if (!compact || c.nameEl.scrollWidth <= c.nameEl.clientWidth) continue;
      c.nameEl.classList.add('squeeze');
      if (c.nameEl.scrollWidth > c.nameEl.clientWidth) c.nameEl.classList.add('squeeze-more');
    }
  }

  update(state: BattleState): void {
    this.state = state;
    const planning = state.phase === 'planning';
    toggleClass(this.el, 'locked', !planning);
    const available = this.hooks.available(), gold = Math.max(0, available), placing = planning ? this.hooks.placing() : null;
    for (const c of this.cards) {
      const poor = available < c.price;
      if (poor !== c.poor) {
        c.poor = poor;
        toggleClass(c.el, 'poor', poor);
        c.el.setAttribute('aria-label', `${c.name}, ${c.price} gold${poor ? ', not enough gold' : ''}`);
      }
      if (poor) {
        const short = c.price - gold;
        if (short !== c.short) {
          c.short = short;
          setText(c.need, `need ${short}`);
          c.fill.style.width = `${Math.round((100 * gold) / c.price)}%`;
        }
      }
      toggleClass(c.el, 'sel', c.id === placing);
      c.el.setAttribute('aria-disabled', String(!planning));
    }
    this.tip.refresh();
  }

  dispose(): void {
    this.tip.dispose();
  }
}
