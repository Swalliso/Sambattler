// HUD icons: the 16×16 `i-*` sprites in data/sprites/ui.json, drawn from the atlas at 1× in place of
// Unicode glyphs. Each sits beside a word or a number (or inside a labelled control), so it is hidden
// from screen readers.
import type { Atlas, Faction } from '../render/atlas.ts';
import { spriteToCanvas } from '../render/atlas.ts';
import { h } from './h.ts';

export function uiIcon(atlas: Atlas, id: string, faction: Faction = 'velvet-bloom'): HTMLCanvasElement {
  const c = spriteToCanvas(atlas, id, faction);
  c.className = 'ico';
  c.setAttribute('aria-hidden', 'true');
  return c;
}

/** A price: the gold icon and the number. */
export function priceEl(atlas: Atlas, cost: number): HTMLElement {
  return h('span', { class: 'price' }, uiIcon(atlas, 'i-gold'), String(cost));
}
