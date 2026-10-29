// The title screen (SPEC §10.5, docs/ui-ux-plan.md A4): the wordmark over the Heartcap's silhouette, lit
// from below, with spores drifting through the dark. Continue (only with a saved run), New run, How to
// play (Help) and Settings (sound and damage numbers, until the settings screen arrives).
import type { Atlas } from '../../render/atlas.ts';
import { spriteToCanvas } from '../../render/atlas.ts';
import { sporeLayer } from '../../render/spores.ts';
import { h } from '../h.ts';

const CAP_W = 112;
const CAP_H = 84;

export interface TitleActions {
  /** Present when a saved run exists. */
  continueRun?: () => void;
  /** One line on the saved run, under Continue ("Row 3 of 6 · Heartcap 2400/3000"). */
  saved?: string;
  newRun(): void;
  help(): void;
  /** The settings control (src/ui/settingsControl.ts) with its Settings label. */
  settings: HTMLElement;
}

export function titleScreen(atlas: Atlas, actions: TitleActions, still: boolean, foot: string): HTMLElement {
  const cap = spriteToCanvas(atlas, 't-heartcap', 'velvet-bloom');
  cap.className = 'title-cap';
  cap.setAttribute('aria-hidden', 'true');
  const art = h('div', { class: 'title-art', 'aria-hidden': 'true' }, h('div', { class: 'title-pool' }), cap);
  // the silhouette at the largest integer scale that fits its box
  new ResizeObserver(() => {
    const s = Math.max(2, Math.min(6, Math.floor(Math.min(art.clientWidth / CAP_W, art.clientHeight / CAP_H))));
    cap.style.width = `${CAP_W * s}px`;
    cap.style.height = `${CAP_H * s}px`;
  }).observe(art);
  const primary = actions.continueRun
    ? h('button', { class: 'btn primary', id: 'title-continue', onclick: actions.continueRun },
      h('span', null, 'Continue'), actions.saved ? h('small', null, actions.saved) : null)
    : h('button', { class: 'btn primary', id: 'title-new', onclick: actions.newRun }, 'New run');
  const menu = h('nav', { class: 'title-menu', 'aria-label': 'Main menu' },
    primary,
    actions.continueRun ? h('button', { class: 'btn', id: 'title-new', onclick: actions.newRun }, 'New run') : null,
    h('button', { class: 'btn', id: 'title-help', onclick: actions.help }, 'How to play'),
    actions.settings,
  );
  const sky = h('div', { class: 'title-sky', 'aria-hidden': 'true' });
  const el = h('div', { class: 'runscreen titlescreen', id: 'title' },
    sky,
    h('div', { class: 'title-stage' },
      h('div', { class: 'title-text' },
        h('div', { class: 'eyebrow' }, 'The Velvet Bloom against the Gray Rot'),
        h('h1', { class: 'wordmark' }, 'Spore ', h('span', { class: 'amp' }, '&'), ' Sprawl'),
        h('p', { class: 'title-blurb' }, 'Grow a fungal colony under the roots, push the front line across the lanes, and outlast the Gray Rot’s generals over a run of battles.'),
        menu,
      ),
      art,
    ),
    h('footer', { class: 'title-foot' }, foot),
  );
  // spores drift through the whole screen, three screen px to a native px
  requestAnimationFrame(() => sporeLayer(sky, { scale: 3, density: 2.4, rate: 1, still }));
  return el;
}
