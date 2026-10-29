// Motion (docs/ui-ux-plan.md A6, the design system's Motion section): the spore-burst wipe between
// screens, roll-up counters for rewards and a restrained tilt on draft cards. Things grow in and wilt
// out, and nothing bounces more than once. Reduced motion (the player's setting, or the device's when it
// follows the system) is the `reduce-motion` class on <html>: no wipe, tilt or roll, and fades of 120 ms
// or less. `?test=1` adds `still`, which makes every change instant, so screenshots and tests are stable.
import { SporeVeil } from '../render/spores.ts';

/** Screen px per native px of the wipe's spores, as on the run screens' sky. */
const WIPE_SCALE = 3;
/** The veil covers the old screen, the swap happens, then it lifts off the new one: 360 ms in all. */
const COVER_MS = 150;
const REVEAL_MS = 210;
const BURST_MS = 400;
const ROLL_MS = 600;

const root = () => document.documentElement;
const reduceQuery = () => window.matchMedia('(prefers-reduced-motion: reduce)');
let unwatch: (() => void) | null = null;

/** The device asks for less motion. */
export function systemReducedMotion(): boolean {
  return reduceQuery().matches;
}

/** Applies the reduced-motion setting: 'system' follows the device (and keeps following it). */
export function applyMotion(pref: 'system' | 'on' | 'off'): void {
  unwatch?.();
  unwatch = null;
  const set = () => root().classList.toggle('reduce-motion', pref === 'on' || (pref === 'system' && systemReducedMotion()));
  set();
  if (pref === 'system') {
    const q = reduceQuery();
    q.addEventListener('change', set);
    unwatch = () => q.removeEventListener('change', set);
  }
}

export function reducedMotion(): boolean {
  return root().classList.contains('reduce-motion');
}

/** Nothing moves: reduced motion, or `?test=1`. */
export function calm(): boolean {
  return reducedMotion() || root().classList.contains('still');
}

let wipe: { canvas: HTMLCanvasElement; swap: (() => void) | null; raf: number; t0: number } | null = null;
/** Keys and clicks wait while a wipe runs, so a double press can't act on the screen being left. */
const swallow = (e: Event) => { e.stopPropagation(); e.preventDefault(); };

function endWipe(): void {
  if (!wipe) return;
  cancelAnimationFrame(wipe.raf);
  wipe.canvas.remove();
  window.removeEventListener('keydown', swallow, true);
  wipe = null;
}

/**
 * Changes the screen behind a spore-burst wipe: a veil of the void rises over the old screen on a band of
 * spores, `swap` runs once it covers, and the veil lifts off the new screen. The page's first screen (over
 * the boot text) and every change under `?test=1` happen at once; under reduced motion the change is
 * immediate and the new screen fades in over 120 ms. A wipe started while one is covering replaces its
 * swap (the newer screen wins).
 */
export function sporeWipe(swap: () => void): void {
  if (root().classList.contains('still') || document.querySelector('#app > .boot')) { endWipe(); swap(); return; }
  if (reducedMotion()) {
    endWipe();
    swap();
    const app = document.getElementById('app');
    if (app) {
      app.classList.remove('fade-in');
      void app.offsetWidth; // restart the fade
      app.classList.add('fade-in');
    }
    return;
  }
  if (wipe?.swap) { wipe.swap = swap; return; }
  endWipe();
  const veil = new SporeVeil(getComputedStyle(root()).getPropertyValue('--bg').trim() || '#141018');
  const canvas = veil.canvas;
  canvas.className = 'spore-wipe';
  canvas.setAttribute('aria-hidden', 'true');
  canvas.addEventListener('pointerdown', swallow);
  canvas.addEventListener('click', swallow);
  document.body.append(canvas);
  window.addEventListener('keydown', swallow, true);
  (document.activeElement as HTMLElement | null)?.blur?.();
  const w = { canvas, swap: swap as (() => void) | null, raf: 0, t0: performance.now() };
  wipe = w;
  const fit = () => veil.resize(Math.ceil(document.body.clientWidth / WIPE_SCALE), Math.ceil(document.body.clientHeight / WIPE_SCALE));
  const tick = (now: number) => {
    if (wipe !== w) return;
    fit();
    const t = Math.max(0, now - w.t0);
    if (t < COVER_MS) {
      const p = t / COVER_MS;
      veil.draw('cover', p * p); // wilts out: ease-in
    } else {
      if (w.swap) {
        const s = w.swap;
        w.swap = null;
        veil.draw('cover', 1);
        s();
      }
      const p = Math.min(1, (t - COVER_MS) / REVEAL_MS);
      veil.draw('reveal', 1 - (1 - p) * (1 - p)); // grows in: ease-out
      if (p >= 1) { endWipe(); return; }
    }
    w.raf = requestAnimationFrame(tick);
  };
  fit();
  veil.draw('cover', 0);
  w.raf = requestAnimationFrame(tick);
}

/** Spores bursting up across an overlay that opens over a screen that stays (the in-battle draft). */
export function sporeBurst(host: HTMLElement): void {
  if (calm()) return;
  const veil = new SporeVeil('transparent', 0xb0257);
  const canvas = veil.canvas;
  canvas.className = 'spore-burst';
  canvas.setAttribute('aria-hidden', 'true');
  host.prepend(canvas);
  const t0 = performance.now();
  const tick = (now: number) => {
    const p = Math.min(1, (now - t0) / BURST_MS);
    if (!canvas.isConnected || p >= 1) { canvas.remove(); return; }
    veil.resize(Math.ceil(host.clientWidth / WIPE_SCALE), Math.ceil(host.clientHeight / WIPE_SCALE));
    veil.draw('burst', 1 - (1 - p) * (1 - p));
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

/**
 * A number that rolls up from 0 to `to` after `delay` ms (ease-out, 600 ms), then bumps once. Under
 * reduced motion or `?test=1` it shows `to` at once.
 */
export function rollUp(el: HTMLElement, to: number, opts: { delay?: number; format?: (n: number) => string } = {}): HTMLElement {
  const format = opts.format ?? ((n: number) => n.toLocaleString('en-US'));
  el.classList.add('rolls');
  if (calm() || to === 0) { el.textContent = format(to); return el; }
  el.textContent = format(0);
  const start = performance.now() + (opts.delay ?? 0);
  const tick = (now: number) => {
    const p = Math.max(0, Math.min(1, (now - start) / ROLL_MS));
    if (!el.isConnected && p > 0) { el.textContent = format(to); return; }
    el.textContent = format(Math.round(to * (1 - (1 - p) * (1 - p) * (1 - p))));
    if (p < 1) { requestAnimationFrame(tick); return; }
    el.classList.add('bump');
  };
  requestAnimationFrame(tick);
  return el;
}

/** Tilt limits (degrees): a card leans toward the pointer, a little. */
const TILT_X = 3;
const TILT_Y = 4;

/** A restrained hover tilt toward the pointer; nothing under reduced motion or `?test=1`. */
export function hoverTilt(card: HTMLElement): void {
  card.addEventListener('pointermove', (e) => {
    if (calm()) return;
    const r = card.getBoundingClientRect();
    const nx = ((e.clientX - r.left) / r.width) * 2 - 1, ny = ((e.clientY - r.top) / r.height) * 2 - 1;
    card.style.setProperty('--ry', `${(nx * TILT_Y).toFixed(2)}deg`);
    card.style.setProperty('--rx', `${(-ny * TILT_X).toFixed(2)}deg`);
  });
  card.addEventListener('pointerleave', () => {
    card.style.removeProperty('--rx');
    card.style.removeProperty('--ry');
  });
}
