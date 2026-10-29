// UI scale (docs/ui-ux-plan.md, D1): a window smaller than 1280×720 lays the page out at 1280×720 or
// more and scales the body down to fit, instead of clipping the bottom band. The settings screen can
// also fix a larger step for big screens (125% to 200%); a step never lays the page out below
// 1280×720, so a window too small for it gets the largest scale that fits. getBoundingClientRect and
// mouse events already report scaled (screen) pixels; a position written back into the page divides by
// uiScale() to get layout pixels.
export const DESIGN_W = 1280;
export const DESIGN_H = 720;

/** 1 is "auto": fit smaller windows, 100% otherwise. */
let preferred = 1;

/** The largest scale that keeps a 1280×720 layout inside the window. */
export function fitScale(): number {
  return Math.min(window.innerWidth / DESIGN_W, window.innerHeight / DESIGN_H);
}

export function uiScale(): number {
  return Math.min(preferred, fitScale());
}

function apply(): void {
  const s = uiScale();
  const root = document.documentElement.style;
  root.setProperty('--ui-scale', String(s));
  root.setProperty('--app-w', `${window.innerWidth / s}px`);
  root.setProperty('--app-h', `${window.innerHeight / s}px`);
}

/** Call once at boot, before any view adds its own resize listener (they read the layout this sets). */
export function installUiScale(pref: number | 'auto' = 'auto'): void {
  preferred = pref === 'auto' ? 1 : pref;
  apply();
  window.addEventListener('resize', apply);
}

/** A new step from the settings screen: the page re-lays out, and every view refits as on a resize. */
export function setUiScale(pref: number | 'auto'): void {
  preferred = pref === 'auto' ? 1 : pref;
  window.dispatchEvent(new Event('resize'));
}
