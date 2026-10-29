// Anchored tooltips (playtest round 3): real tooltips in place of native `title` text, styled like the
// card tooltips. One tip element serves a group of anchors. It opens on hover and on keyboard focus,
// closes when the pointer leaves, focus moves on or Esc is pressed, and while open it rebuilds only when
// its content's key changes, so a live readout stays current without a rebuild every frame. It stays DOM,
// so Playwright can read it.
import { h } from './h.ts';
import { uiScale } from './scale.ts';

/** What a tip shows: `key` is a cheap string that changes whenever `build` would. */
export interface TipSource {
  key(): string;
  build(): Node[];
}

/** The tip's gap from its anchor, and its margin inside the window (layout px). */
const GAP = 6;
const MARGIN = 8;

export class AnchoredTip {
  readonly el: HTMLElement;
  private anchor: HTMLElement | null = null;
  private src: TipSource | null = null;
  private key = '';
  /** Esc closed the tip over this anchor: it stays shut until the pointer or focus leaves. */
  private dismissed: HTMLElement | null = null;
  private onKey = (e: KeyboardEvent) => {
    if (e.key !== 'Escape' || !this.anchor) return;
    const focused = document.activeElement === this.anchor;
    this.dismissed = this.anchor;
    this.close();
    // a focused anchor keeps Esc to itself and lets go of focus (keys go back to the game); a hover tip
    // closes and lets Esc cancel placing too
    if (focused) { e.preventDefault(); e.stopPropagation(); (document.activeElement as HTMLElement).blur(); }
  };

  /** @param place where the tip opens: under its anchor (the top band) or above it (the bottom band) */
  constructor(id: string, private place: 'below' | 'above' = 'below', cls = '') {
    this.el = h('div', { class: `hud-tip ${cls}`.trim(), id, role: 'tooltip', hidden: true });
    window.addEventListener('keydown', this.onKey, true);
  }

  /** Makes `anchor` focusable and gives it this tip. */
  attach(anchor: HTMLElement, src: TipSource): void {
    if (anchor.tabIndex < 0) anchor.tabIndex = 0;
    anchor.setAttribute('aria-describedby', this.el.id);
    anchor.removeAttribute('title');
    anchor.addEventListener('mouseenter', () => { if (this.dismissed !== anchor) this.open(anchor, src); });
    anchor.addEventListener('mouseleave', () => {
      if (this.dismissed === anchor && document.activeElement !== anchor) this.dismissed = null;
      if (this.anchor === anchor && !anchor.matches(':focus-visible')) this.close();
    });
    // keyboard focus only: a click also focuses the anchor, and the tip shouldn't linger after it
    anchor.addEventListener('focus', () => { if (anchor.matches(':focus-visible') && this.dismissed !== anchor) this.open(anchor, src); });
    anchor.addEventListener('blur', () => {
      if (this.dismissed === anchor) this.dismissed = null;
      if (this.anchor === anchor && !anchor.matches(':hover')) this.close();
    });
  }

  get openOn(): HTMLElement | null { return this.anchor; }

  open(anchor: HTMLElement, src: TipSource): void {
    this.anchor = anchor;
    this.src = src;
    this.key = '';
    anchor.classList.add('tip-open');
    this.el.hidden = false;
    this.refresh();
  }

  close(): void {
    this.anchor?.classList.remove('tip-open');
    this.anchor = null;
    this.src = null;
    this.el.hidden = true;
  }

  /** Rebuilds the open tip if its content changed (call it every frame; it is cheap when nothing did). */
  refresh(): void {
    if (!this.anchor || !this.src) return;
    if (!this.anchor.isConnected) { this.close(); return; }
    const key = this.src.key();
    if (key === this.key) return;
    this.key = key;
    this.el.replaceChildren(...this.src.build());
    this.position();
  }

  /** Centred on its anchor, kept inside the window, in layout pixels (src/ui/scale.ts). */
  private position(): void {
    const r = this.anchor!.getBoundingClientRect(), s = uiScale();
    const w = this.el.offsetWidth, hgt = this.el.offsetHeight;
    const vw = window.innerWidth / s, vh = window.innerHeight / s;
    const x = Math.max(MARGIN, Math.min((r.left + r.width / 2) / s - w / 2, vw - w - MARGIN));
    const y = this.place === 'below' ? Math.min(r.bottom / s + GAP, vh - hgt - MARGIN) : Math.max(MARGIN, r.top / s - GAP - hgt);
    this.el.style.left = `${x}px`;
    this.el.style.top = `${y}px`;
  }

  dispose(): void {
    window.removeEventListener('keydown', this.onKey, true);
    this.close();
  }
}
