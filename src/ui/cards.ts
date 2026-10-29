// Draft cards (SPEC §8.3, docs/ui-ux-plan.md C3), shared by the in-battle draft overlay and the run's
// spoils screen. Each rarity has a frame (common bark, uncommon teal-lit, rare amber-lit with a spore
// sparkle) and keeps its word; the type's icon heads the card; a blueprint shows stat chips (its price,
// what it makes or does, its role) instead of prose. Cards deal in left to right, and lift and lean a
// little toward the pointer on hover (src/ui/motion.ts).
import type { Content } from '../data/registry.ts';
import type { Atlas } from '../render/atlas.ts';
import { spriteToCanvas } from '../render/atlas.ts';
import { parseCard } from '../sim/index.ts';
import type { DraftCard } from '../sim/index.ts';
import { ROLE_LABEL } from './buildingInfo.ts';
import { h } from './h.ts';
import { priceEl, uiIcon } from './icons.ts';
import { hoverTilt } from './motion.ts';

const TYPE_LABEL = { blueprint: 'Blueprint', upgrade: 'Upgrade', relic: 'Relic' } as const;
const TYPE_ICON = { blueprint: 'i-blueprint', upgrade: 'i-upgrade', relic: 'i-relic' } as const;
const RARITY_LABEL = { common: 'Common', uncommon: 'Uncommon', rare: 'Rare' } as const;
const nb = (s: string) => s.replaceAll(' ', ' ');

/** One building's output in a few words, from its data (the tray's line reads the compiled side instead). */
export function buildingOutput(content: Content, id: string): string {
  const b = content.buildings[id]!;
  const unit = b.spawn ? content.units[b.spawn.unit] : undefined;
  if (b.spawn && unit) return `${b.spawn.count} ${unit.name}${b.spawn.count > 1 ? 's' : ''} / ${nb(`${b.spawn.interval} s`)}`;
  if (b.attack) return `${b.attack.splashRadius ? 'splash · ' : ''}${nb(`range ${b.attack.range}`)}`;
  if (b.economy?.interestCapAdd) return `${nb('interest cap')} +${b.economy.interestCapAdd}`;
  if (b.economy) return `${nb(`+${b.economy.goldPerTick} gold`)} / ${nb(`${content.balance.incomeTickSeconds} s`)}`;
  if (b.utility) return `+${b.utility.supplyCapAdd} ${nb('supply cap')}`;
  return ROLE_LABEL[b.kind];
}

/** Name and effect text of a card; `level` is the upgrade level it would grant. */
export function cardText(content: Content, card: string, upgrades: Record<string, number> = {}): { name: string; text: string; level?: number } {
  const c = parseCard(card)!;
  if (c.type === 'relic') {
    const r = content.relics[c.id]!;
    return { name: r.name, text: r.text };
  }
  const b = content.buildings[c.id]!;
  if (c.type === 'blueprint') return { name: b.name, text: b.description };
  const level = (upgrades[c.id] ?? 0) + 1;
  const t = content.upgrades[c.id]!;
  return { name: `${b.name} ${'I'.repeat(level)}`, text: t.levels[level - 1]?.text ?? '', level };
}

/** The four corners of a rarity frame, mirrored from one sprite, and a rare card's sparkles. */
function frame(atlas: Atlas, rarity: DraftCard['rarity']): HTMLElement[] {
  const corners = ['tl', 'tr', 'bl', 'br'].map((at) => {
    const c = spriteToCanvas(atlas, `fr-${rarity}`, 'velvet-bloom');
    c.className = `fr ${at}`;
    c.setAttribute('aria-hidden', 'true');
    return c;
  });
  if (rarity !== 'rare') return corners;
  const sparkles = ['s1', 's2'].map((at) => {
    const c = spriteToCanvas(atlas, 'fr-sparkle', 'velvet-bloom');
    c.className = `sparkle ${at}`;
    c.setAttribute('aria-hidden', 'true');
    return c;
  });
  return [...corners, ...sparkles];
}

/**
 * One offer. `key` is its 1–3 hotkey (shown as a keycap); `index` staggers the deal-in.
 */
export function cardView(content: Content, atlas: Atlas, card: DraftCard, upgrades: Record<string, number>, onPick: () => void, key?: string, index = 0): HTMLElement {
  const c = parseCard(card.id)!;
  const { name, text, level } = cardText(content, card.id, upgrades);
  let art: HTMLCanvasElement;
  let chips: HTMLElement | null = null;
  if (c.type === 'relic') {
    art = spriteToCanvas(atlas, `r-${content.relics[c.id]!.rarity}`, 'velvet-bloom');
  } else {
    const b = content.buildings[c.id]!;
    art = spriteToCanvas(atlas, b.sprite, 'velvet-bloom');
    chips = c.type === 'blueprint'
      ? h('div', { class: 'draft-chips' }, h('span', { class: 'chip-sm gold' }, priceEl(atlas, b.cost)),
        h('span', { class: 'chip-sm' }, buildingOutput(content, c.id)), h('span', { class: `role ${b.kind}` }, ROLE_LABEL[b.kind]))
      : h('div', { class: 'draft-chips' }, h('span', { class: 'chip-sm' }, `Level ${level} of ${content.upgrades[c.id]!.levels.length}`));
  }
  art.className = 'draft-sprite';
  const badge = c.type === 'upgrade' ? uiIcon(atlas, 'i-upgrade') : null;
  if (badge) badge.className = 'draft-badge';
  const el = h('button', { class: `draft-card ${card.type} ${card.rarity}`, 'data-card': card.id, style: `--i:${index}`, onclick: onPick },
    ...frame(atlas, card.rarity),
    h('div', { class: 'draft-head' },
      h('span', { class: 'draft-type' }, uiIcon(atlas, TYPE_ICON[card.type]), TYPE_LABEL[card.type]),
      h('span', { class: `draft-rarity rarity ${card.rarity}` }, RARITY_LABEL[card.rarity]),
    ),
    h('div', { class: 'draft-art' }, art, badge),
    h('div', { class: 'draft-name' }, name),
    h('div', { class: 'draft-text' }, text),
    chips,
    key ? h('kbd', { class: 'draft-key', 'aria-label': `Key ${key}` }, key) : null,
  );
  hoverTilt(el);
  return el;
}
