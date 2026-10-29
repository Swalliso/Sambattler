// Building roles, the tray's order, the card's one-line summary and its hover tooltip (playtest
// 2026-10-28: a player never noticed the economy buildings, and the cards read as jargon). Stats come
// from the compiled side, so upgrades and relics show.
import type { Content } from '../data/registry.ts';
import type { Atlas } from '../render/atlas.ts';
import { formatClock } from '../sim/index.ts';
import type { BattleState, BuildingKind } from '../sim/index.ts';
import { h } from './h.ts';
import { priceEl } from './icons.ts';
import { strongVs, vulnerableTo, weakVs } from './matrixHints.ts';
import { perkText } from './mergeHints.ts';

export const ROLE_LABEL: Record<BuildingKind, string> = { economy: 'Economy', spawner: 'Army', tower: 'Defense', utility: 'Utility' };
const ROLE_ORDER: Record<BuildingKind, number> = { economy: 0, spawner: 1, tower: 2, utility: 3 };

/** The tray's order, which the 1–9 hotkeys follow: economy first, then army, defense and utility, each in kit order. */
export function trayOrder(content: Content, kit: readonly string[]): string[] {
  return [...kit].sort((a, b) => ROLE_ORDER[content.buildings[a]!.kind] - ROLE_ORDER[content.buildings[b]!.kind]);
}

const secs = (s: number) => `${Math.round(s * 10) / 10} s`;
const plural = (n: number, name: string) => (n === 1 ? name : `${name}s`);
const cap = (s: string) => s[0]!.toUpperCase() + s.slice(1);

/** What the building does, in a few words for the card face (90 px wide when the tray is full). */
export function cardLine(content: Content, state: BattleState, id: string): string {
  const cb = state.compiled.player.buildings[id]!;
  const tr = state.rules.tickRate;
  // the building's name already names its unit; the tooltip spells it out
  if (cb.spawn) return `${cb.spawn.count} every ${secs(cb.spawn.intervalHalfTicks / 2 / tr)}`;
  if (cb.attack) return `${cb.attack.splashRadius ? 'splash, ' : ''}range ${cb.attack.range}`;
  if (cb.economy) {
    const g = `+${cb.economy.goldPerTick} gold`;
    return cb.economy.interestCapAdd ? `${g} · interest +${cb.economy.interestCapAdd}` : `${g} / ${secs(content.balance.incomeTickSeconds)}`;
  }
  if (cb.utility) return `+${cb.utility.supplyCapAdd} supply cap`;
  return ROLE_LABEL[cb.kind];
}

/** The tooltip body for a tray card: role, description, what it makes or does, and the unit's matchups. */
export function buildingTip(content: Content, atlas: Atlas, state: BattleState, id: string, hotkey: string): HTMLElement[] {
  const b = content.buildings[id]!;
  const cb = state.compiled.player.buildings[id]!;
  const cs = state.compiled.player;
  const tr = state.rules.tickRate;
  const rows: [string, string][] = [];
  if (cb.spawn) {
    const unit = content.units[cb.spawn.unit]!;
    const cu = cs.units[cb.spawn.unit]!;
    const t = cu.tiers[0];
    rows.push(['Makes', `${cb.spawn.count} ${plural(cb.spawn.count, unit.name)} every ${secs(cb.spawn.intervalHalfTicks / 2 / tr)}${cb.spawn.positional ? ' (varies with where it stands)' : ''}`]);
    rows.push(['Each unit', `${t.hp} HP · ${t.supply} supply`]);
    if (t.healAmount > 0) {
      rows.push(['Heals', `${t.healAmount} HP every ${secs(t.healTicks / tr)} · range ${t.range}`]);
    } else {
      rows.push(['Attack', `${Math.round(t.damage * 10) / 10} ${cu.damageType} every ${secs(t.attackTicks / tr)} · ${cu.projectileSpeed > 0 ? `range ${t.range}` : 'melee'}`]);
      rows.push(['Strong vs', strongVs(state, cu.damageType)], ['Weak vs', weakVs(state, cu.damageType)]);
    }
    rows.push(['Armor', `${cap(cu.armor)} · hurt most by ${vulnerableTo(state, cu.armor)}`]);
    if (cu.siege) rows.push(['Siege', `×${t.siegeMult} vs buildings and Heartcaps`]);
    if (cu.slayer) rows.push(['Slayer', `×${t.slayerMult} vs Bloomed and Elder units`]);
    if (state.config.flags.merging) rows.push(['Bloomed', perkText(content, unit.id, 2)], ['Elder', perkText(content, unit.id, 3)]);
  }
  if (cb.attack) {
    const a = cb.attack;
    rows.push(['Attack', `${a.damage} ${a.damageType} every ${secs(a.intervalTicks / tr)}${a.splashRadius ? ` · splash ${a.splashRadius}` : ''}`]);
    rows.push(['Range', a.minRange ? `${a.minRange}–${a.range} (can't hit units hugging it)` : String(a.range)]);
    rows.push(['Strong vs', strongVs(state, a.damageType)]);
  }
  if (cb.economy) {
    const e = cb.economy;
    const every = content.balance.incomeTickSeconds;
    rows.push(['Income', e.positional ? 'varies with where it stands' : `+${e.goldPerTick} gold every ${secs(every)} (${Math.round((e.goldPerTick * 60) / every)}/min)`]);
    rows.push(['Rich Loam', `+${cs.loamBonusPct}% when built on it`]);
    if (e.interestCapAdd) rows.push(['Interest cap', `+${e.interestCapAdd}`]);
    else if (!e.positional && e.goldPerTick > 0) rows.push(['Pays for itself', `in about ${formatClock(Math.ceil((b.cost / e.goldPerTick) * every * tr), tr)}`]);
  }
  if (cb.utility) rows.push(['Supply cap', `+${cb.utility.supplyCapAdd} (at most ${cb.utility.maxCount} count)`]);
  rows.push(['Building HP', String(cb.hp)]);
  return [
    h('div', { class: 'tip-head' }, h('b', null, b.name), h('span', { class: `role ${cb.kind}` }, ROLE_LABEL[cb.kind]), priceEl(atlas, b.cost)),
    h('div', { class: 'tip-desc' }, b.description),
    ...rows.map(([k, v]) => h('div', { class: 'row' }, h('span', { class: 'muted' }, k), h('span', null, v))),
    h('div', { class: 'tip-foot' }, `${hotkey ? `Press ${hotkey} or click` : 'Click'}, then click the field. Building farther from home costs more.`),
  ];
}
