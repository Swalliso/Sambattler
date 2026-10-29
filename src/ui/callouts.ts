// Callout lane (SPEC §10.2): at most 3 banners at once, each for 2.5 s (tips 6 s), in priority order:
// counter warnings > building lost > Heartcap under attack > tips > column flipped > merges. Pinned
// callouts (the deploy hint, "Paused", a save-recovery notice) stay until unpinned and come first, so the
// field itself stays clear.
import { h } from './h.ts';

export type CalloutKind = 'counter' | 'buildingLost' | 'heartcap' | 'tip' | 'column' | 'merge' | 'info';
const PRIORITY: Record<CalloutKind, number> = { counter: 0, buildingLost: 1, heartcap: 2, tip: 3, column: 4, merge: 5, info: 6 };
const LIFE_MS = 2500;
const TIP_MS = 6000;
const MAX = 3;

interface Item { kind: CalloutKind; text: string; tone: 'good' | 'bad' | ''; t0: number; life: number; el: HTMLElement }

export class Callouts {
  readonly el = h('div', { class: 'callouts', id: 'callouts', 'aria-live': 'polite' });
  private items: Item[] = [];
  private pinned = new Map<string, HTMLElement>();
  private lastHeartcap = -1e9;

  push(kind: CalloutKind, text: string, tone: 'good' | 'bad' | '', now: number): void {
    if (kind === 'heartcap') {
      if (now - this.lastHeartcap < 8000) return;
      this.lastHeartcap = now;
    }
    // replace an identical live callout instead of stacking duplicates
    const dup = this.items.find((i) => i.text === text);
    if (dup) { dup.t0 = now; return; }
    const el = h('div', { class: `callout ${tone} ${kind}` }, text);
    this.items.push({ kind, text, tone, t0: now, life: kind === 'tip' ? TIP_MS : LIFE_MS, el });
    this.render();
  }

  /** Shows `el` (a `.callout`) until unpin(key); pinning the same key again is a no-op. */
  pin(key: string, el: HTMLElement): void {
    if (this.pinned.has(key)) return;
    this.pinned.set(key, el);
    this.render();
  }

  unpin(key: string): void {
    if (this.pinned.delete(key)) this.render();
  }

  update(now: number): void {
    const before = this.items.length;
    this.items = this.items.filter((i) => now - i.t0 < i.life);
    if (this.items.length !== before) this.render();
  }

  /**
   * Shows the pinned callouts, then the timed ones by priority. A callout pops in once: re-inserting it
   * would replay its animation, so a settled callout keeps still when the lane reorders.
   */
  private render(): void {
    const timed = [...this.items].sort((a, b) => PRIORITY[a.kind] - PRIORITY[b.kind] || b.t0 - a.t0).map((i) => i.el);
    const shown = [...this.pinned.values(), ...timed].slice(0, MAX);
    if (shown.length === this.el.children.length && shown.every((el, i) => this.el.children[i] === el)) return;
    for (const el of shown) if (!el.isConnected && !el.classList.contains('settled')) el.addEventListener('animationend', () => el.classList.add('settled'), { once: true });
    this.el.replaceChildren(...shown);
  }
}
