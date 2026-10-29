// Draft cards (SPEC §8.3): type, rarity, art and effect text, shared by the in-battle draft overlay
// and the run's spoils screen.
import type { Content } from '../data/registry.ts';
import type { Atlas } from '../render/atlas.ts';
import { spriteToCanvas } from '../render/atlas.ts';
import { parseCard } from '../sim/index.ts';
import type { DraftCard } from '../sim/index.ts';
import { h } from './h.ts';

const TYPE_LABEL = { blueprint: 'Blueprint', upgrade: 'Upgrade', relic: 'Relic' } as const;
const RARITY_LABEL = { common: 'Common', uncommon: 'Uncommon', rare: 'Rare' } as const;

/** One building's output in a few words (shared with the tray). */
export function buildingOutput(content: Content, id: string): string {
  const b = content.buildings[id]!;
  const unit = b.spawn ? content.units[b.spawn.unit] : undefined;
  if (b.spawn && unit) return `${b.spawn.count} × ${unit.name} / ${b.spawn.interval}s`;
  if (b.attack) return `${b.attack.damageType} ${b.attack.damage} / ${b.attack.interval}s · range ${b.attack.range}`;
  if (b.economy) return `+${b.economy.goldPerTick} gold per income tick`;
  return b.kind;
}

/** Name and effect text of a card; `level` is the upgrade level it would grant. */
export function cardText(content: Content, card: string, upgrades: Record<string, number> = {}): { name: string; text: string; level?: number } {
  const c = parseCard(card)!;
  if (c.type === 'relic') {
    const r = content.relics[c.id]!;
    return { name: r.name, text: r.text };
  }
  const b = content.buildings[c.id]!;
  if (c.type === 'blueprint') return { name: b.name, text: `${b.description} (${buildingOutput(content, c.id)}, ${b.cost} gold)` };
  const level = (upgrades[c.id] ?? 0) + 1;
  const t = content.upgrades[c.id]!;
  return { name: `${b.name} ${'I'.repeat(level)}`, text: t.levels[level - 1]?.text ?? '', level };
}

export function cardView(content: Content, atlas: Atlas, card: DraftCard, upgrades: Record<string, number>, onPick: () => void, key?: string): HTMLElement {
  const c = parseCard(card.id)!;
  const { name, text } = cardText(content, card.id, upgrades);
  const art = c.type === 'relic' ? spriteToCanvas(atlas, 'i-relic', 'velvet-bloom') : spriteToCanvas(atlas, content.buildings[c.id]!.sprite, 'velvet-bloom');
  const badge = c.type === 'upgrade' ? spriteToCanvas(atlas, 'i-upgrade', 'velvet-bloom') : null;
  return h('button', { class: `draft-card ${card.type} ${card.rarity}`, 'data-card': card.id, onclick: onPick },
    h('div', { class: 'draft-head' },
      h('span', { class: 'draft-type' }, TYPE_LABEL[card.type]),
      h('span', { class: `draft-rarity ${card.rarity}` }, RARITY_LABEL[card.rarity]),
    ),
    h('div', { class: 'draft-art' }, art, badge),
    h('div', { class: 'draft-name' }, name),
    h('div', { class: 'draft-text' }, text),
    key ? h('div', { class: 'draft-key' }, `[${key}]`) : null,
  );
}
