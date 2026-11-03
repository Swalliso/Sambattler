// The aftermath (SPEC §10.2, §13.6; plan Call 15; A061, A078), drawn from the round's result in state and never
// simulated: in each lane the winner's survivors surge into the loser's Heartcap and burst into spores on it, the
// loser's survivors at the 45 s cap wilt where they stand, and so do a drawn lane's. The damage rises over each
// struck Heartcap, with the Sporestorm's multiplier and "capped" beside it when they apply. It runs about 3 s at
// 1× on the loop's clock, at the clash's speed (`src/app/phases/aftermath.ts`, which asks
// `aftermathLength` when it's done), and at a battle's end it holds about 1 s more on the fallen Heartcap, which
// wilts and sheds spores of its own faction's glow. Under reduced motion it's a fade of 120 ms or less with no
// surge; under `?test=1` it's its final frame throughout.
import { other } from '../sim/index.ts';
import type { BattleState, RoundResult, Side, UnitState } from '../sim/index.ts';
import type { Effects } from './effects.ts';
import { pixelText } from './pixelText.ts';
import { TILE } from './renderer.ts';
import { INK_DEEP } from './unitSprite.ts';

/** About 3 s at 1× (§10.2). */
export const AFTERMATH_MS = 3000;
/** The hold on the fallen Heartcap at a battle's end (§10.2). */
export const END_HOLD_MS = 1000;
/** Under reduced motion the aftermath is a fade of at most this (§10.2, §10.5). */
export const CALM_FADE_MS = 120;

// the timeline at 1×, in ms: the surge's start is staggered by unit, the wilt and the number's rise overlap it
const STAGGER_MS = 40;
const SURGE_MS = 1100;
const WILT = [150, 1150] as const;
const RISE = [900, 1700] as const;
const RISE_PX = 10;

/** How long the aftermath lasts at 1×: longer when the battle ends with it (§10.2). */
export function aftermathLength(state: BattleState): number {
  return AFTERMATH_MS + (state.outcome ? END_HOLD_MS : 0);
}

/** How the aftermath draws: in full, as reduced motion's short fade, or as its final frame (`?test=1`). */
export type AftermathMode = 'full' | 'calm' | 'final';

/** A unit's place in the aftermath: an offset from where the clash left it, in tiles and native px, and its opacity (0 hides it). */
export interface AftermathPose {
  dx: number;
  sink: number;
  alpha: number;
}

/** What one Heartcap took in the round, as its number shows it. */
interface Struck {
  side: Side;
  amount: number;
  capped: boolean;
}

const clamp01 = (k: number) => (k < 0 ? 0 : k > 1 ? 1 : k);
const span = (ms: number, [a, b]: readonly [number, number]) => clamp01((ms - a) / (b - a));

export class AftermathView {
  private ms = 0;
  private mode: AftermathMode = 'full';
  private result: RoundResult | null = null;
  private struck: Struck[] = [];
  /** The units that have burst on a Heartcap this aftermath, so each bursts once. */
  private burst = new Set<number>();
  private round = 0;
  private now = 0;

  constructor(private effects: Effects) {}

  /** The frame's clock and mode; a new round's aftermath starts afresh. */
  begin(state: BattleState, ms: number, mode: AftermathMode, now: number): void {
    const result = state.rounds[state.rounds.length - 1] ?? null;
    if (state.round !== this.round || ms < this.ms || result !== this.result) {
      this.round = state.round;
      this.burst.clear();
      this.result = result;
      this.struck = result ? struckBy(result) : [];
    }
    this.ms = ms;
    this.mode = mode;
    this.now = now;
  }

  /**
   * Where a unit stands this frame (§10.2): a lane's winner surges into the loser's Heartcap and bursts there,
   * and every other survivor wilts. An emplacement holds its slot, since it never moves.
   */
  pose(state: BattleState, u: UnitState, emplacement: boolean, out: AftermathPose): AftermathPose {
    out.dx = 0; out.sink = 0; out.alpha = 1;
    const lane = this.result?.lanes[u.lane];
    if (!lane || emplacement) return out;
    if (this.mode !== 'full') {
      out.alpha = this.mode === 'final' ? 0 : 1 - clamp01(this.ms / CALM_FADE_MS);
      return out;
    }
    if (lane.winner === u.side) {
      const to = u.side === 'player' ? state.map.width + 0.5 : -0.5;
      const k = clamp01((this.ms - (u.id % 8) * STAGGER_MS) / SURGE_MS);
      if (k >= 1) {
        out.alpha = 0;
        if (!this.burst.has(u.id)) {
          this.burst.add(u.id);
          this.effects.add(u.side === 'player' ? 4 : 5, to, u.y, this.now, 0);
        }
        return out;
      }
      out.dx = (to - u.x) * k * k;
      return out;
    }
    const k = span(this.ms, WILT);
    out.sink = Math.round(3 * k);
    out.alpha = 1 - k;
    return out;
  }

  /** The numbers over the struck Heartcaps, and at a battle's end the fallen one. */
  draw(g: CanvasRenderingContext2D, state: BattleState, sx: (x: number) => number, glowOf: (side: Side) => string): void {
    const H = state.map.height * TILE;
    if (state.phase === 'aftermath') {
      const rise = this.mode === 'full' ? span(this.ms, RISE) : 1;
      const shown = this.mode === 'calm' ? clamp01(this.ms / CALM_FADE_MS) : this.mode === 'final' ? 1 : span(this.ms, [RISE[0], RISE[0] + 160]);
      if (shown > 0) {
        g.globalAlpha = shown;
        for (const s of this.struck) this.number(g, state, s, sx, Math.round(H * 0.45 - RISE_PX * (1 - (1 - rise) ** 2)));
        g.globalAlpha = 1;
      }
    }
    if (!state.outcome) return;
    const k = state.phase === 'ended' || this.mode === 'final' ? 1
      : this.mode === 'calm' ? clamp01((this.ms - AFTERMATH_MS) / CALM_FADE_MS) : clamp01((this.ms - AFTERMATH_MS) / END_HOLD_MS);
    if (k > 0) this.fallen(g, state, other(state.outcome.winner), k, sx, glowOf);
  }

  /** "−350" over a Heartcap's strip, in the dealer's color, then the storm's multiplier and "capped" under it. */
  private number(g: CanvasRenderingContext2D, state: BattleState, s: Struck, sx: (x: number) => number, y: number): void {
    const cx = sx(s.side === 'player' ? -1 : state.map.width + 1);
    const text = `-${s.amount}`;
    const w = (text.length * 4 - 1) * 2;
    g.save();
    g.translate(Math.round(cx - w / 2), y);
    g.scale(2, 2);
    pixelText(g, text, 0, 0, s.side === 'player' ? '#e0645a' : '#c9a2ff');
    g.restore();
    const tags: string[] = [];
    const stormBp = this.result!.stormBp;
    if (stormBp > 10000) tags.push(`x${(stormBp / 10000).toFixed(1)}`);
    if (s.capped) tags.push('capped');
    tags.forEach((tag, i) => {
      const tw = tag.length * 4 - 1;
      tagText(g, tag, Math.round(cx - tw / 2), y + 13 + i * 7, '#ece4f4');
    });
  }

  /** A fallen Heartcap at a battle's end: its strip wilts toward the void and sheds spores of its glow (§10.2). */
  private fallen(g: CanvasRenderingContext2D, state: BattleState, side: Side, k: number, sx: (x: number) => number, glowOf: (side: Side) => string): void {
    const x0 = sx(side === 'player' ? -2 : state.map.width), H = state.map.height * TILE;
    g.globalAlpha = 0.55 * k;
    g.fillStyle = INK_DEEP;
    g.fillRect(x0, 0, 2 * TILE, H);
    g.globalAlpha = 1 - 0.6 * k;
    g.fillStyle = glowOf(side);
    for (let i = 0; i < 14; i++) {
      const x = x0 + 3 + ((i * 11) % (2 * TILE - 6));
      const y = Math.round(H * (0.15 + ((i * 37) % 60) / 100) - 18 * k * (1 + (i % 3)) / 3);
      g.fillRect(x, y, i % 4 === 0 ? 2 : 1, i % 4 === 0 ? 2 : 1);
    }
    g.globalAlpha = 1;
  }
}

/** Each Heartcap the round struck: what the other side dealt to it, and whether the round cap cut it (§6.7). */
function struckBy(r: RoundResult): Struck[] {
  const out: Struck[] = [];
  for (const side of ['player', 'enemy'] as const) {
    const dealer = other(side), amount = r.damage[dealer];
    if (amount <= 0) continue;
    const uncapped = r.lanes.reduce((n, l) => n + (l.winner === dealer ? l.damage : 0), 0);
    out.push({ side, amount, capped: uncapped > amount });
  }
  return out;
}

/** The few glyphs the aftermath's tags need beyond `pixelText`'s, on its 3×5 grid. */
const TAG_GLYPHS: Record<string, string> = {
  A: '010101111101101', C: '111100100100111', P: '110101110100100', X: '000101010101000', '.': '000000000000010',
};

/** A tag such as "×1.4" or "capped", in the pixel font, with `TAG_GLYPHS` for what it lacks. */
function tagText(g: CanvasRenderingContext2D, text: string, x: number, y: number, color: string): void {
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]!.toUpperCase(), bits = TAG_GLYPHS[ch];
    const cx = x + i * 4;
    if (!bits) { pixelText(g, ch, cx, y, color); continue; }
    for (const [dx, dy, c] of [[-1, 0, INK_DEEP], [1, 0, INK_DEEP], [0, -1, INK_DEEP], [0, 1, INK_DEEP], [0, 0, color]] as const) {
      g.fillStyle = c;
      for (let p = 0; p < 15; p++) if (bits[p] === '1') g.fillRect(cx + dx + (p % 3), y + dy + Math.floor(p / 3), 1, 1);
    }
  }
}
