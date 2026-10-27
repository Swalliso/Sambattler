// Callout lane (SPEC §10.2): at most 3 banners at once, each for 2.5 s, in priority order:
// counter warnings > building lost > Heartcap under attack > column flipped > merges.
import { h } from './h.ts';

export type CalloutKind = 'counter' | 'buildingLost' | 'heartcap' | 'column' | 'merge' | 'info';
const PRIORITY: Record<CalloutKind, number> = { counter: 0, buildingLost: 1, heartcap: 2, column: 3, merge: 4, info: 5 };
const LIFE_MS = 2500;
const MAX = 3;

interface Item { kind: CalloutKind; text: string; tone: 'good' | 'bad' | ''; t0: number; el: HTMLElement }

export class Callouts {
  readonly el = h('div', { class: 'callouts', id: 'callouts', 'aria-live': 'polite' });
  private items: Item[] = [];
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
    this.items.push({ kind, text, tone, t0: now, el });
    this.render();
  }

  update(now: number): void {
    const before = this.items.length;
    this.items = this.items.filter((i) => now - i.t0 < LIFE_MS);
    if (this.items.length !== before) this.render();
  }

  private render(): void {
    const shown = [...this.items].sort((a, b) => PRIORITY[a.kind] - PRIORITY[b.kind] || b.t0 - a.t0).slice(0, MAX);
    this.el.replaceChildren(...shown.map((i) => i.el));
  }
}
