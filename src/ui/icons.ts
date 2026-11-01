// HUD icons: the 16×16 `i-*` sprites in data/sprites/ui.json, and the 5×5 tier pip, drawn from the atlas
// at 1× in place of Unicode glyphs. Each sits beside a word or a number (or inside a labelled control), so
// it is hidden from screen readers.
import type { Atlas, Faction } from '../render/atlas.ts';
import { spriteToCanvas } from '../render/atlas.ts';
import type { Tier } from '../sim/index.ts';
import { h } from './h.ts';

export function uiIcon(atlas: Atlas, id: string, faction: Faction = 'velvet-bloom'): HTMLCanvasElement {
  const c = spriteToCanvas(atlas, id, faction);
  c.className = 'ico';
  c.setAttribute('aria-hidden', 'true');
  return c;
}

/** A unit's tier as `i-pip` sprites, as the field shows it: one for Bloomed, two for Elder, none for base (SPEC §10.4). */
export function tierPips(atlas: Atlas, tier: Tier): HTMLElement {
  const el = h('span', { class: 'pips', 'aria-hidden': 'true' });
  for (let i = 1; i < tier; i++) {
    const c = spriteToCanvas(atlas, 'i-pip', 'velvet-bloom');
    c.className = 'pip';
    el.append(c);
  }
  return el;
}

/** A price: the gold icon and the number. */
export function priceEl(atlas: Atlas, cost: number): HTMLElement {
  return h('span', { class: 'price' }, uiIcon(atlas, 'i-gold'), String(cost));
}
