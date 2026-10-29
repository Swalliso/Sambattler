// UI scale (docs/ui-ux-plan.md, D1): a window smaller than 1280×720 lays the page out at 1280×720 or
// more and scales the body down to fit, instead of clipping the bottom band. getBoundingClientRect and
// mouse events already report scaled (screen) pixels; a position written back into the page divides by
// uiScale() to get layout pixels.
export const DESIGN_W = 1280;
export const DESIGN_H = 720;

export function uiScale(): number {
  return Math.min(1, window.innerWidth / DESIGN_W, window.innerHeight / DESIGN_H);
}

function apply(): void {
  const s = uiScale();
  const root = document.documentElement.style;
  root.setProperty('--ui-scale', String(s));
  root.setProperty('--app-w', `${window.innerWidth / s}px`);
  root.setProperty('--app-h', `${window.innerHeight / s}px`);
}

/** Call once at boot, before any view adds its own resize listener (they read the layout this sets). */
export function installUiScale(): void {
  apply();
  window.addEventListener('resize', apply);
}
