// The canvas renderer for a battle in rounds (SPEC §13.6), a first cut from v1's `src/render/renderer.ts`
// without territory, capture, rally lines, turrets or spawn timers. It reads the sim's state and each step's
// events and never changes the sim. Layers, back to front: the terrain with both Heartcaps (baked); the
// colonies, each side's mycelium under its open plots with their faint 2×2 grid, and closed plots as dark,
// unlit soil with a small mark (plan Call 21, also baked); while a card is chosen, the free plots lit; the
// buildings; spore clouds; the units, sorted by y then id, through R4a's `drawUnitSprite` (an emplacement
// with its `emplacementSprite`); projectiles; sparks, puffs and merge pops; then the ghost. S12 adds the
// formation preview (T083), the aftermath (T085) and the field's details (T086). It stands beside v1's
// renderer until R2b moves it to `src/render/`.
import type { Content } from '../../data/registry.ts';
import type { BattleState, PlotState, Side, UnitState } from '../../sim/rounds/index.ts';
import type { Atlas, Faction } from '../atlas.ts';
import { Effects } from '../effects.ts';
import { BIG_HIT, TILE, factionOf, matTile } from '../renderer.ts';
import type { DamageNumbers } from '../renderer.ts';
import { drawUnitSprite, emplacementSprite } from '../unitSprite.ts';
import type { UnitSpriteOpts } from '../unitSprite.ts';

export { TILE } from '../renderer.ts';

/** The Heartcap strip's width in tiles at each end of the field, as v1's. */
export const STRIP = 2;
const SIDES: readonly Side[] = ['player', 'enemy'];

export interface RoundGhost {
  buildingId: string;
  plot: number;
  legal: boolean;
}

/** What the view adds to the state for a frame. */
export interface RoundView {
  ghost: RoundGhost | null;
  /** While a card is chosen: the free plots of yours it could go on, lit (§10.2 "Placing"). */
  lit: number[] | null;
  selected: number | null;
  debug: boolean;
  timeMs: number;
}

export class RoundRenderer {
  readonly canvas: HTMLCanvasElement;
  readonly width: number;
  readonly height: number;
  private ctx: CanvasRenderingContext2D;
  private terrain: HTMLCanvasElement;
  private colonies: HTMLCanvasElement;
  private coloniesKey = '';
  private assist = false;
  readonly effects = new Effects(512);
  /** Merge pops and damage numbers, apart so a big fight's sparks never evict them. */
  readonly labels = new Effects(256);
  damageNumbers: DamageNumbers = 'off';
  /** Ambient motion holds still (`?test=1`, set by the view). */
  still = false;
  private sorted: UnitState[] = [];
  /** The unit drawer's options, refilled for each unit so a frame allocates none. */
  private unitOpts: UnitSpriteOpts = {
    sprite: '', faction: 'velvet-bloom', frame: 0, flip: false, x: 0, y: 0, tier: 1, side: 'player', id: 0, hpFrac: 1, glow: '', time: 0,
  };

  constructor(canvas: HTMLCanvasElement, private content: Content, private atlas: Atlas, state: BattleState) {
    this.canvas = canvas;
    this.width = (state.map.width + STRIP * 2) * TILE;
    this.height = state.map.height * TILE;
    canvas.width = this.width;
    canvas.height = this.height;
    this.ctx = canvas.getContext('2d', { alpha: false })!;
    this.ctx.imageSmoothingEnabled = false;
    this.terrain = this.bakeTerrain(state);
    this.colonies = document.createElement('canvas');
    this.colonies.width = this.width;
    this.colonies.height = this.height;
  }

  /** Color-blind assist: team marks under units and bolder mats (the colonies rebake when it changes). */
  get colorAssist(): boolean { return this.assist; }
  set colorAssist(on: boolean) {
    if (on === this.assist) return;
    this.assist = on;
    this.coloniesKey = '';
  }

  /** Screen x (native px) of a world x. */
  sx(x: number): number { return (x + STRIP) * TILE; }

  private mat(side: Side) {
    return this.content.factions[factionOf(side)]!.mat;
  }

  private drawSprite(g: CanvasRenderingContext2D, id: string, faction: Faction, frame: number, x: number, y: number, flip = false): void {
    const r = this.atlas.get(id, faction, frame, flip);
    if (!r) return;
    g.drawImage(this.atlas.canvas as CanvasImageSource, r.x, r.y, r.w, r.h, Math.round(x), Math.round(y), r.w, r.h);
  }

  /** The colony block's tiles (plain soil, loam and stumps, §11.9) and both Heartcaps, mirrored for the general's. */
  private bakeTerrain(state: BattleState): HTMLCanvasElement {
    const c = document.createElement('canvas');
    c.width = this.width; c.height = this.height;
    const g = c.getContext('2d')!;
    g.imageSmoothingEnabled = false;
    const { width: W, height: H, tiles } = state.map;
    for (let r = 0; r < H; r++) {
      for (let col = -STRIP; col < W + STRIP; col++) {
        const t = col < 0 || col >= W ? '.' : tiles[r]![col]!;
        const id = t === '$' ? 't-loam' : t === 'o' ? 't-stump' : t === '#' ? 't-wall' : ((col * 7 + r * 13) & 3) === 0 ? 't-soil2' : 't-soil';
        this.drawSprite(g, id, 'velvet-bloom', 0, (col + STRIP) * TILE, r * TILE);
      }
    }
    for (const side of SIDES) {
      const f = factionOf(side);
      const x0 = side === 'player' ? 0 : (W + STRIP) * TILE;
      const parts: [string, number][] = [['heartcap-cap', 32]];
      let filled = 32;
      while (filled + 16 < H * TILE) { parts.push(['heartcap-stalk', 16]); filled += 16; }
      parts.push(['heartcap-base', 16]);
      let y = 0;
      for (const [id, h] of parts) {
        if (side === 'enemy') {
          g.save(); g.translate(x0 + 32, 0); g.scale(-1, 1);
          this.drawSprite(g, id, f, 0, 0, y);
          g.restore();
        } else {
          this.drawSprite(g, id, f, 0, x0, y);
        }
        y += h;
      }
    }
    return c;
  }

  /**
   * Both colonies (§10.2, §13.6 layer 2): an open plot carries its side's mycelium (lighter on loam, none on a
   * stump, so a formation's holes show) inside a faint 2×2 outline; a closed plot is dark, unlit soil with no
   * grid and a small mark (plan Call 21). Rebaked only when a plot opens or the assist changes.
   */
  private bakeColonies(state: BattleState): void {
    const key = `${this.assist}|${SIDES.map((s) => state.sides[s].plots.map((p) => (p.open ? 1 : 0)).join('')).join('|')}`;
    if (key === this.coloniesKey) return;
    this.coloniesKey = key;
    const g = this.colonies.getContext('2d')!;
    g.clearRect(0, 0, this.width, this.height);
    for (const side of SIDES) {
      const tile = matTile(this.mat(side), side, this.assist);
      for (const p of state.sides[side].plots) {
        const x = this.sx(p.col), y = p.row * TILE, w = 2 * TILE;
        if (!p.open) {
          g.fillStyle = 'rgba(10, 6, 14, 0.62)';
          g.fillRect(x, y, w, w);
          g.fillStyle = 'rgba(236, 228, 244, 0.28)';
          g.fillRect(x + TILE - 2, y + TILE - 1, 4, 1);
          g.fillRect(x + TILE - 1, y + TILE - 2, 1, 4);
          continue;
        }
        if (p.terrain !== 'stump') {
          g.globalAlpha = p.terrain === 'loam' ? 0.45 : 1;
          for (let dy = 0; dy < 2; dy++) for (let dx = 0; dx < 2; dx++) g.drawImage(tile, x + dx * TILE, y + dy * TILE);
          g.globalAlpha = 1;
        }
        g.strokeStyle = this.mat(side).glow;
        g.globalAlpha = 0.22;
        g.lineWidth = 1;
        g.strokeRect(x + 0.5, y + 0.5, w - 1, w - 1);
        g.globalAlpha = 1;
      }
    }
  }

  /** One step's events: sparks by effectiveness, death puffs, heals, bursts and merge pops. */
  onTick(state: BattleState, now: number): void {
    for (const e of state.events) {
      if (e.t === 'hit') {
        const eff = e.eff === 'strong' ? 1 : e.eff === 'weak' ? 3 : 2;
        this.effects.add(eff, e.x, e.y, now, e.splash ? 1 : 0);
        if (this.damageNumbers === 'all' || (this.damageNumbers === 'big' && e.amount >= BIG_HIT)) this.labels.add(9, e.x, e.y, now, eff, e.amount);
      } else if (e.t === 'merged') this.labels.add(8, e.x, e.y, now, e.tier, e.side === 'player' ? 0 : 1);
      else if (e.t === 'died') this.effects.add(e.side === 'player' ? 4 : 5, e.x, e.y, now, 0);
      else if (e.t === 'healed') this.effects.add(10, e.x, e.y, now, 0);
      else if (e.t === 'burst') this.effects.add(13, e.x, e.y, now, e.side === 'player' ? 0 : 1, e.radius);
    }
  }

  draw(state: BattleState, alpha: number, view: RoundView): void {
    const g = this.ctx;
    const t = view.timeMs;
    g.drawImage(this.terrain, 0, 0);
    this.bakeColonies(state);
    g.drawImage(this.colonies, 0, 0);
    if (view.lit) this.drawLit(state.sides.player.plots, view.lit);

    for (const b of state.buildings) {
      const p = state.sides[b.side].plots[b.plot]!;
      const x = this.sx(p.col), y = p.row * TILE;
      this.drawSprite(g, this.content.buildings[b.buildingId]!.sprite, factionOf(b.side), Math.floor(t / 600 + b.id) % 2, x, y);
      if (b.id === view.selected) {
        g.strokeStyle = '#ffe9a8';
        g.lineWidth = 1;
        g.strokeRect(x + 0.5, y + 0.5, 2 * TILE - 1, 2 * TILE - 1);
      }
    }

    if (state.clouds?.length) this.drawClouds(state, t);
    const us = this.sorted;
    us.length = 0;
    for (const u of state.units) us.push(u);
    us.sort((a, b) => a.y - b.y || a.id - b.id);
    const calm = this.calm();
    for (const u of us) this.drawUnit(state, view, u, alpha, t, calm);

    for (const h of state.hits) {
      if (!h.ranged) continue;
      const span = Math.max(1, h.tick - h.fireTick);
      const p = Math.min(1, Math.max(0, (state.tick - h.fireTick + alpha) / span));
      const x = h.fromX + (h.x - h.fromX) * p;
      let y = h.fromY + (h.y - h.fromY) * p;
      const lob = h.splashRadius > 0;
      if (lob) y -= Math.sin(p * Math.PI) * 1.2;
      g.fillStyle = lob ? '#c9a2ff' : '#f4ecd2';
      const s = lob ? 3 : 2;
      g.fillRect(Math.round(this.sx(x)) - 1, Math.round(y * TILE) - 1, s, s);
    }

    this.effects.draw(g, t, (x) => this.sx(x), TILE);
    this.labels.draw(g, t, (x) => this.sx(x), TILE);
    if (view.ghost) this.drawGhost(state, view.ghost);
  }

  /** The free plots a chosen card could go on: a soft lilac wash and outline. */
  private drawLit(plots: readonly PlotState[], lit: readonly number[]): void {
    const g = this.ctx;
    for (const i of lit) {
      const p = plots[i]!;
      const x = this.sx(p.col), y = p.row * TILE, w = 2 * TILE;
      g.fillStyle = '#c9a2ff';
      g.globalAlpha = 0.1;
      g.fillRect(x, y, w, w);
      g.globalAlpha = 0.5;
      g.strokeStyle = '#c9a2ff';
      g.strokeRect(x + 0.5, y + 0.5, w - 1, w - 1);
    }
    g.globalAlpha = 1;
  }

  /** The chosen card on its plot, dimmed, outlined by whether it can go there. */
  private drawGhost(state: BattleState, gh: RoundGhost): void {
    const g = this.ctx;
    const p = state.sides.player.plots[gh.plot];
    if (!p) return;
    const x = this.sx(p.col), y = p.row * TILE, w = 2 * TILE;
    g.globalAlpha = 0.6;
    this.drawSprite(g, this.content.buildings[gh.buildingId]!.sprite, 'velvet-bloom', 0, x, y);
    g.globalAlpha = 0.9;
    g.strokeStyle = gh.legal ? '#9fe0a0' : '#e0645a';
    g.lineWidth = 1;
    g.strokeRect(x + 0.5, y + 0.5, w - 1, w - 1);
    g.globalAlpha = 1;
  }

  /** Spore clouds: a soft haze in the owner's glow, clipped to its lane, thinning over its last quarter (§5.3). */
  private drawClouds(state: BattleState, t: number): void {
    const g = this.ctx;
    for (const cl of state.clouds!) {
      const L = state.lanes[cl.lane]!;
      const fade = Math.min(1, (4 * (cl.untilTick - state.tick)) / Math.max(1, cl.untilTick - cl.fromTick));
      const cx = this.sx(cl.x), cy = cl.y * TILE, r = cl.radius * TILE;
      g.save();
      g.beginPath();
      g.rect(0, L.rowStart * TILE, this.width, (L.rowEnd + 1 - L.rowStart) * TILE);
      g.clip();
      g.fillStyle = this.mat(cl.side).glow;
      g.globalAlpha = 0.14 * fade;
      g.beginPath(); g.arc(cx, cy, r, 0, Math.PI * 2); g.fill();
      g.globalAlpha = 0.22 * fade;
      g.beginPath(); g.arc(cx, cy, r * 0.62, 0, Math.PI * 2); g.fill();
      g.globalAlpha = 0.85 * fade;
      g.fillStyle = '#fbf6ff'; // spore-white: spores are the one particle
      for (let i = 0; i < 10; i++) {
        const a = i * 2.39996 + cl.id + t * 0.0007 * (i % 2 ? 1 : -1);
        const d = r * (0.2 + (0.75 * ((i * 37 + cl.id * 13) % 10)) / 10);
        g.fillRect(Math.round(cx + Math.cos(a) * d), Math.round(cy + Math.sin(a) * d * 0.8), 1, 1);
      }
      g.restore();
    }
  }

  /** One unit, through R4a's drawer (`src/render/unitSprite.ts`), at its interpolated foot point. */
  private drawUnit(state: BattleState, view: RoundView, u: UnitState, alpha: number, t: number, calm: boolean): void {
    const x = u.px + (u.x - u.px) * alpha;
    const y = u.py + (u.y - u.py) * alpha;
    const moving = u.x !== u.px || u.y !== u.py;
    const attacking = state.tick - u.lastAttackTick < 6 && u.lastAttackTick >= 0;
    const o = this.unitOpts;
    // an emplacement is one unit under its tower's id, drawn as R4a's emplacement (R4/T029)
    o.sprite = this.content.units[u.unitId]?.sprite ?? emplacementSprite(this.content, u.unitId);
    o.faction = factionOf(u.side);
    o.frame = attacking ? 2 : moving ? Math.floor(t / 250 + u.id) % 2 : 0;
    o.flip = u.side === 'enemy';
    o.x = this.sx(x);
    o.y = y * TILE;
    o.tier = u.tier;
    o.side = u.side;
    o.id = u.id;
    o.hpFrac = u.hp / u.maxHp;
    o.shieldFrac = u.shield ? u.shield / Math.max(1, u.maxHp * state.rules.arrivalShield.shieldFrac) : undefined;
    o.flying = u.flying;
    o.burrowed = u.burrowed;
    o.glow = this.mat(u.side).glow;
    o.assist = this.assist;
    o.selected = u.id === view.selected;
    o.time = t;
    o.calm = calm;
    drawUnitSprite(this.ctx, this.atlas, o);
  }

  /** Ambient motion holds still: `?test=1` (set by the view) or reduced motion. */
  private calm(): boolean {
    return this.still || (typeof document !== 'undefined' && document.documentElement.classList.contains('reduce-motion'));
  }
}
