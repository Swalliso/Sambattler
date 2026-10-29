// Spores, the one particle (docs/ui-ux-plan.md, "lit from below"): motes 1–2 native pixels across that drift
// slowly upward with a little sway, on a canvas of their own. The battle's frame draws them behind the
// field (src/render/frame.ts); the title and the battle report reuse the same drift. One seeded pool, no
// allocations per frame, and no redraw when nothing moved. They hold still under reduced motion and
// `?test=1`. A negative rate makes them fall (ash on a lost battle).

export const SPORE_WHITE = '#fbf6ff';
const SPORE_POOL = 320;
/** Three brightness steps, so a frame sets the fill alpha three times, not once per spore. */
const SPORE_ALPHA = [0.3, 0.5, 0.75] as const;

export class SporeDrift {
  readonly canvas: HTMLCanvasElement;
  private g: CanvasRenderingContext2D;
  private reduced: MediaQueryList;
  private w = 0;
  private h = 0;
  // the pool, seeded once: home position (0..1 of the canvas), rise speed (native px/s), sway
  private sx = new Float32Array(SPORE_POOL);
  private sy = new Float32Array(SPORE_POOL);
  private rise = new Float32Array(SPORE_POOL);
  private sway = new Float32Array(SPORE_POOL);
  private swayHz = new Float32Array(SPORE_POOL);
  private phase = new Float32Array(SPORE_POOL);
  private size = new Uint8Array(SPORE_POOL);
  private step = new Uint8Array(SPORE_POOL);
  /** Seconds of drift so far; it runs at the caller's rate and stops when the rate is 0. */
  private clock = 0;
  private last = 0;
  private drawnClock = -1;
  private drawnCount = -1;

  /**
   * @param still hold still (`?test=1`), so screenshots and browser tests are stable
   * @param color the spores' color (spore-white; lilac for a win's bloom, ash for a loss)
   */
  constructor(private still = false, private color = SPORE_WHITE, seed = 0x5eed) {
    this.canvas = document.createElement('canvas');
    this.g = this.canvas.getContext('2d')!;
    this.reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
    const rnd = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };
    for (let i = 0; i < SPORE_POOL; i++) {
      this.sx[i] = rnd();
      this.sy[i] = rnd();
      this.rise[i] = 1.5 + rnd() * 3.5;
      this.sway[i] = 0.5 + rnd() * 2.5;
      this.swayHz[i] = 0.3 + rnd() * 0.9;
      this.phase[i] = rnd() * Math.PI * 2;
      this.size[i] = rnd() < 0.25 ? 2 : 1;
      this.step[i] = Math.floor(rnd() * SPORE_ALPHA.length);
    }
  }

  /** Sizes the canvas in native px (the caller scales it up with CSS); the next frame redraws. */
  resize(w: number, h: number): void {
    if (w === this.w && h === this.h) return;
    this.w = this.canvas.width = w;
    this.h = this.canvas.height = h;
    this.drawnCount = -1;
  }

  /**
   * Drifts and draws. `density` is spores per 10 000 native px²; `rate` scales the drift (0 holds it,
   * negative makes it fall). Nothing is drawn when nothing moved.
   */
  frame(density: number, now: number, rate: number): void {
    const dt = this.last ? Math.min(now - this.last, 250) : 0;
    this.last = now;
    if (!this.still && !this.reduced.matches) this.clock += (dt / 1000) * rate;
    if (!this.w) return;
    const n = Math.min(SPORE_POOL, Math.round((this.w * this.h * density) / 10000));
    if (this.clock === this.drawnClock && n === this.drawnCount) return;
    this.drawnClock = this.clock;
    this.drawnCount = n;
    const g = this.g, W = this.w, H = this.h, t = this.clock;
    g.clearRect(0, 0, W, H);
    g.fillStyle = this.color;
    for (let b = 0; b < SPORE_ALPHA.length; b++) {
      g.globalAlpha = SPORE_ALPHA[b]!;
      for (let i = 0; i < n; i++) {
        if (this.step[i] !== b) continue;
        const x = (((this.sx[i]! * W + this.sway[i]! * Math.sin(this.swayHz[i]! * t + this.phase[i]!)) % W) + W) % W;
        const y = (((this.sy[i]! * H - this.rise[i]! * t) % H) + H) % H;
        g.fillRect(Math.floor(x), Math.floor(y), this.size[i]!, this.size[i]!);
      }
    }
    g.globalAlpha = 1;
  }
}

/**
 * Spores drifting over a DOM box, `scale` screen px per native px: a canvas that fills `host` and
 * animates itself until `stop()`. For screens without a game loop (the title, the report's banner).
 */
export function sporeLayer(host: HTMLElement, opts: { scale: number; density: number; rate?: number; still: boolean; color?: string; seed?: number }): { stop(): void } {
  const drift = new SporeDrift(opts.still, opts.color, opts.seed);
  drift.canvas.className = 'spore-layer';
  drift.canvas.setAttribute('aria-hidden', 'true');
  host.append(drift.canvas);
  let raf = 0;
  const fit = () => drift.resize(Math.max(1, Math.ceil(host.clientWidth / opts.scale)), Math.max(1, Math.ceil(host.clientHeight / opts.scale)));
  const ro = new ResizeObserver(fit);
  ro.observe(host);
  const tick = (now: number) => {
    if (!host.isConnected) { stop(); return; }
    fit();
    drift.frame(opts.density, now, opts.rate ?? 1);
    raf = requestAnimationFrame(tick);
  };
  const stop = () => { cancelAnimationFrame(raf); ro.disconnect(); };
  raf = requestAnimationFrame(tick);
  return { stop };
}
