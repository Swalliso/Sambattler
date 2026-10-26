// Canvas renderer (SPEC §13.6). Reads sim state and per-tick events; never mutates the sim.
// Layers, back to front: terrain → territory tint and capture progress → buildings → merge tethers
// and knit glow → units (by y, then id; merged units larger, with tier pips) → projectiles and
// sparks → labels (merge pops, damage numbers) → overlays (placement ghost, ranges, debug).
import type { Content } from '../data/registry.ts';
import {
  canMerge, frontierBlocked, lanePresence, turretPos,
} from '../sim/index.ts';
import type { BattleState, Command, Side, UnitState } from '../sim/index.ts';
import type { Atlas, Faction } from './atlas.ts';
import { Effects } from './effects.ts';

export const TILE = 16;
const STRIP = 2; // Heartcap strip width in tiles on each side
/** Sprite scale per merge tier (SPEC §10.4: "a slightly larger sprite"). */
const TIER_SCALE = [1, 1.25, 1.5];
/** "Big hits only" shows damage numbers from this amount up. */
export const BIG_HIT = 30;
export type DamageNumbers = 'off' | 'big' | 'all';

export interface Ghost { buildingId: string; col: number; row: number; legal: boolean }
export interface View {
  ghost: Ghost | null;
  selected: number | null;
  pending: Command[];
  debug: boolean;
  timeMs: number;
}

const factionOf = (side: Side): Faction => (side === 'player' ? 'velvet-bloom' : 'gray-rot');

export class Renderer {
  readonly canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private terrain: HTMLCanvasElement;
  private territory: HTMLCanvasElement;
  private territoryKey = '';
  private matTile: Record<Side, HTMLCanvasElement>;
  readonly effects = new Effects(512);
  /** Merge pops and damage numbers, kept apart so a big fight's sparks never evict them. */
  readonly labels = new Effects(256);
  damageNumbers: DamageNumbers = 'off';
  private sorted: UnitState[] = [];
  private eligible: UnitState[] = [];
  private trio: UnitState[] = [];
  private links = new Int32Array(64);
  readonly width: number;
  readonly height: number;

  constructor(canvas: HTMLCanvasElement, private content: Content, private atlas: Atlas, state: BattleState) {
    this.canvas = canvas;
    this.width = (state.map.width + STRIP * 2) * TILE;
    this.height = state.map.height * TILE;
    canvas.width = this.width;
    canvas.height = this.height;
    this.ctx = canvas.getContext('2d', { alpha: false })!;
    this.ctx.imageSmoothingEnabled = false;
    this.matTile = { player: this.makeMatTile('player'), enemy: this.makeMatTile('enemy') };
    this.terrain = this.bakeTerrain(state);
    this.territory = document.createElement('canvas');
    this.territory.width = this.width;
    this.territory.height = this.height;
  }

  /** Screen x (native px) of a world x. */
  sx(x: number): number { return (x + STRIP) * TILE; }

  private mat(side: Side) {
    return this.content.factions[factionOf(side)]!.mat;
  }

  /** A 16×16 tile of hyphae strands in the faction's strand colour over a translucent base. */
  private makeMatTile(side: Side): HTMLCanvasElement {
    const c = document.createElement('canvas');
    c.width = TILE; c.height = TILE;
    const g = c.getContext('2d')!;
    const m = this.mat(side);
    g.globalAlpha = 0.42;
    g.fillStyle = m.base;
    g.fillRect(0, 0, TILE, TILE);
    g.globalAlpha = 1;
    g.fillStyle = m.strand;
    // a few wandering strands, deterministic per side
    let seed = side === 'player' ? 7 : 13;
    const rnd = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };
    for (let s = 0; s < 3; s++) {
      let x = Math.floor(rnd() * TILE), y = Math.floor(rnd() * TILE);
      for (let i = 0; i < 14; i++) {
        g.fillRect(x, y, 1, 1);
        x = (x + (rnd() < 0.6 ? 1 : 0) + TILE) % TILE;
        y = (y + (rnd() < 0.5 ? 1 : -1) + TILE) % TILE;
      }
    }
    g.fillStyle = m.glow;
    g.fillRect(Math.floor(rnd() * TILE), Math.floor(rnd() * TILE), 1, 1);
    return c;
  }

  private drawSprite(g: CanvasRenderingContext2D, id: string, faction: Faction, frame: number, x: number, y: number, flip = false): void {
    const r = this.atlas.get(id, faction, frame, flip);
    if (!r) return;
    g.drawImage(this.atlas.canvas as CanvasImageSource, r.x, r.y, r.w, r.h, Math.round(x), Math.round(y), r.w, r.h);
  }

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
    // Heartcaps: cap, tiled stalk and base, mirrored for the enemy
    for (const side of ['player', 'enemy'] as Side[]) {
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

  private bakeTerritory(state: BattleState): void {
    const key = state.lanes.map((l) => `${l.pBorder},${l.eBorder}`).join('|');
    if (key === this.territoryKey) return;
    this.territoryKey = key;
    const g = this.territory.getContext('2d')!;
    g.clearRect(0, 0, this.width, this.height);
    for (const L of state.lanes) {
      for (let c = 0; c < state.map.width; c++) {
        const o = L.owner[c];
        if (!o) continue;
        const tile = this.matTile[o === 1 ? 'player' : 'enemy'];
        for (let r = L.rowStart; r <= L.rowEnd; r++) g.drawImage(tile, this.sx(c), r * TILE);
      }
    }
  }

  /** Feed one tick's events (spark, puff and flash effects, merge pops, damage numbers). */
  onTick(state: BattleState, now: number): void {
    for (const e of state.events) {
      if (e.t === 'hit') {
        const eff = e.eff === 'strong' ? 1 : e.eff === 'weak' ? 3 : 2;
        this.effects.add(eff, e.x, e.y, now, e.splash ? 1 : 0);
        if (this.damageNumbers === 'all' || (this.damageNumbers === 'big' && e.amount >= BIG_HIT)) this.labels.add(9, e.x, e.y, now, eff, e.amount);
      } else if (e.t === 'merged') this.labels.add(8, e.x, e.y, now, e.tier, e.side === 'player' ? 0 : 1);
      else if (e.t === 'died') this.effects.add(e.side === 'player' ? 4 : 5, e.x, e.y, now, 0);
      else if (e.t === 'buildingDestroyed') this.effects.add(6, e.col + 1, e.row + 1, now, 0);
      else if (e.t === 'spawned') {
        const u = state.units.find((x) => x.id === e.id);
        if (u) this.effects.add(7, u.x, u.y, now, 0);
      }
    }
  }

  draw(state: BattleState, alpha: number, view: View): void {
    const g = this.ctx;
    const t = view.timeMs;
    g.drawImage(this.terrain, 0, 0);
    this.bakeTerritory(state);
    g.drawImage(this.territory, 0, 0);
    this.drawCapture(state);

    // buildings
    for (const b of state.buildings) {
      const def = state.compiled[b.side].buildings[b.buildingId]!;
      const sprite = this.content.buildings[b.buildingId]!.sprite;
      const besieged = state.tick - b.lastDamagedTick < state.rules.besiegedTicks;
      const frame = Math.floor(t / 600 + b.id) % 2;
      const x = this.sx(b.col), y = b.row * TILE;
      if (besieged && Math.floor(t / 120) % 2 === 0) g.globalAlpha = 0.72;
      this.drawSprite(g, sprite, factionOf(b.side), frame, x, y);
      g.globalAlpha = 1;
      if (b.id === view.selected) {
        g.strokeStyle = '#ffe9a8';
        g.lineWidth = 1;
        g.strokeRect(x + 0.5, y + 0.5, def.w * TILE - 1, def.h * TILE - 1);
      }
      if (b.hp < b.maxHp) this.bar(x + 2, y + 1, def.w * TILE - 4, b.hp / b.maxHp, b.side);
      if (besieged) this.glyph('½', x + def.w * TILE - 7, y + 10, '#ffb4a8');
      if (b.holding) this.glyph('⬢!', x + 2, y + 10, '#f0c85a');
      if (def.spawn && !b.mergeOn) this.knotOff(x + def.w * TILE - 9, y + def.h * TILE - 9, this.mat(b.side).glow);
    }
    // pending placements (queued while paused)
    for (const c of view.pending) {
      if (c.type !== 'place') continue;
      g.globalAlpha = 0.45;
      this.drawSprite(g, this.content.buildings[c.buildingId]!.sprite, 'velvet-bloom', 0, this.sx(c.col), c.row * TILE);
      g.globalAlpha = 1;
      this.glyph('…', this.sx(c.col) + 12, c.row * TILE + 18, '#ece4f4');
    }

    // Heartcap turrets
    for (const side of ['player', 'enemy'] as Side[]) {
      const n = state.sides[side].turretCooldowns.length;
      const pos = { x: 0, y: 0, lane: 0 };
      for (let i = 0; i < n; i++) {
        turretPos(state, side, i, pos);
        this.drawSprite(g, 'turret', factionOf(side), 0, this.sx(pos.x) - (side === 'player' ? 10 : 0), pos.y * TILE - 5, side === 'enemy');
      }
    }

    this.drawMergeLinks(state, alpha, t);

    // units, sorted by y then id; merged units are drawn larger, with tier pips
    const us = this.sorted;
    us.length = 0;
    for (const u of state.units) us.push(u);
    us.sort((a, b) => a.y - b.y || a.id - b.id);
    for (const u of us) {
      const x = u.px + (u.x - u.px) * alpha;
      const y = u.py + (u.y - u.py) * alpha;
      const sprite = this.content.units[u.unitId]!.sprite;
      const moving = u.x !== u.px || u.y !== u.py;
      const attacking = state.tick - u.lastAttackTick < 6 && u.lastAttackTick >= 0;
      const frame = attacking ? 2 : moving ? Math.floor(t / 250 + u.id) % 2 : 0;
      const flip = u.side === 'enemy';
      const r = this.atlas.get(sprite, factionOf(u.side), frame, flip);
      if (!r) continue;
      const scale = TIER_SCALE[u.tier - 1]!;
      const w = Math.round(r.w * scale), hgt = Math.round(r.h * scale);
      const dx = Math.round(this.sx(x) - r.ax * scale), dy = Math.round(y * TILE - r.ay * scale);
      if (u.tier === 3) this.elderAura(this.sx(x), y * TILE, w, this.mat(u.side).glow, t + u.id * 37);
      g.drawImage(this.atlas.canvas as CanvasImageSource, r.x, r.y, r.w, r.h, dx, dy, w, hgt);
      if (u.id === view.selected) {
        g.strokeStyle = '#ffe9a8';
        g.strokeRect(dx - 0.5, dy - 0.5, w + 1, hgt + 1);
      }
      if (u.tier > 1) this.pips(Math.round(this.sx(x)), dy - (u.hp < u.maxHp ? 7 : 4), u.tier - 1);
      if (u.hp < u.maxHp) this.bar(dx + 1, dy - 3, w - 2, u.hp / u.maxHp, u.side);
    }
    this.drawKnits(state, alpha, t);

    // projectiles
    for (const h of state.hits) {
      if (!h.ranged) continue;
      const span = Math.max(1, h.tick - h.fireTick);
      const p = Math.min(1, Math.max(0, (state.tick - h.fireTick + alpha) / span));
      const x = h.fromX + (h.x - h.fromX) * p;
      let y = h.fromY + (h.y - h.fromY) * p;
      const lob = h.splashRadius > 0;
      if (lob) y -= Math.sin(p * Math.PI) * 1.2;
      g.fillStyle = h.sourceType === 'turret' ? '#f0c85a' : lob ? '#c9a2ff' : '#f4ecd2';
      const s = lob ? 3 : 2;
      g.fillRect(Math.round(this.sx(x)) - 1, Math.round(y * TILE) - 1, s, s);
    }

    this.effects.draw(g, t, (x) => this.sx(x), TILE);
    this.labels.draw(g, t, (x) => this.sx(x), TILE);

    // Sporestorm haze, thickening per stack
    if (state.sporestorm > 0) {
      g.fillStyle = `rgba(201, 162, 255, ${0.025 * state.sporestorm})`;
      g.fillRect(0, 0, this.width, this.height);
      g.fillStyle = 'rgba(232, 217, 181, 0.55)';
      const n = 14 * state.sporestorm;
      for (let i = 0; i < n; i++) {
        const sx = ((i * 97.3 + t * 0.012 * (1 + (i % 3))) % this.width + this.width) % this.width;
        const sy = ((i * 53.7 + t * 0.006 * ((i % 2) ? 1 : -1)) % this.height + this.height) % this.height;
        g.fillRect(Math.round(sx), Math.round(sy), 1, 1);
      }
    }

    // Heartcap HP bars (always shown)
    for (const side of ['player', 'enemy'] as Side[]) {
      const ss = state.sides[side];
      const x = side === 'player' ? 2 : (state.map.width + STRIP) * TILE + 2;
      this.bar(x, 2, STRIP * TILE - 4, ss.heartcapHp / ss.heartcapMaxHp, side, 3);
    }

    if (view.ghost) this.drawGhost(view.ghost, state);
    if (view.debug) this.drawDebug(state, view);
  }

  private drawCapture(state: BattleState): void {
    const g = this.ctx;
    for (let li = 0; li < state.lanes.length; li++) {
      const L = state.lanes[li]!;
      const top = L.rowStart * TILE, h = (L.rowEnd + 1 - L.rowStart) * TILE;
      for (const side of ['player', 'enemy'] as Side[]) {
        const cap = L.capture[side];
        const F = side === 'player' ? L.pBorder + 1 : L.eBorder - 1;
        if (F < 0 || F >= state.map.width) continue;
        const p = Math.min(1, cap.progress / state.rules.captureThreshold);
        const m = this.mat(side);
        if (p > 0 && cap.column === F) {
          // creeping hyphae fill the frontier from the attacker's border, with a bright leading edge
          const w = Math.max(1, Math.round(p * TILE));
          const x = side === 'player' ? this.sx(F) : this.sx(F) + TILE - w;
          g.globalAlpha = 0.9;
          for (let r = 0; r < h / TILE; r++) g.drawImage(this.matTile[side], 0, 0, w, TILE, x, top + r * TILE, w, TILE);
          g.globalAlpha = 0.25;
          g.fillStyle = m.glow;
          g.fillRect(x, top, w, h);
          g.globalAlpha = 1;
          const edge = side === 'player' ? x + w - 1 : x;
          for (let y = top; y < top + h; y += 4) g.fillRect(edge, y, 1, 2);
          // progress bar along the top of the lane
          g.fillStyle = '#120a16';
          g.fillRect(this.sx(F), top, TILE, 3);
          g.fillStyle = m.glow;
          g.fillRect(side === 'player' ? this.sx(F) : this.sx(F) + TILE - w, top, w, 3);
        }
        if (frontierBlocked(state, li, side) && F >= state.map.homeCols && F < state.map.width - state.map.homeCols) {
          this.shield(this.sx(F) + 5, top + 3, m.glow);
        }
      }
    }
  }

  /**
   * Under the units: a pulsing glow behind each knitting unit, and faint dotted tethers at foot level
   * between idle same-kind units that could form a trio.
   */
  private drawMergeLinks(state: BattleState, alpha: number, t: number): void {
    const g = this.ctx;
    for (const u of state.units) {
      if (!u.knit) continue;
      const x = this.sx(u.px + (u.x - u.px) * alpha), y = (u.py + (u.y - u.py) * alpha) * TILE - 5;
      g.globalAlpha = 0.3 + 0.18 * Math.sin(t / 80 + u.id);
      g.fillStyle = this.mat(u.side).glow;
      g.beginPath();
      g.arc(x, y, 7 + 2 * this.knitProgress(state, u.knit.untilTick, alpha), 0, Math.PI * 2);
      g.fill();
    }
    g.globalAlpha = 1;
    if (!state.config.flags.merging) return;
    const r2 = state.rules.merge.radius * state.rules.merge.radius;
    const el = this.eligible;
    el.length = 0;
    for (const u of state.units) if (canMerge(state, u)) el.push(u);
    if (this.links.length < el.length) this.links = new Int32Array(el.length * 2);
    const counts = this.links;
    counts.fill(0, 0, el.length);
    const near = (a: UnitState, b: UnitState) => {
      if (a.side !== b.side || a.unitId !== b.unitId || a.tier !== b.tier || a.lane !== b.lane) return false;
      const dx = a.x - b.x, dy = a.y - b.y;
      return dx * dx + dy * dy <= r2;
    };
    for (let i = 0; i < el.length; i++) for (let j = i + 1; j < el.length; j++) if (near(el[i]!, el[j]!)) { counts[i]!++; counts[j]!++; }
    g.globalAlpha = 0.6;
    for (let i = 0; i < el.length; i++) {
      for (let j = i + 1; j < el.length; j++) {
        if ((counts[i]! < 2 && counts[j]! < 2) || !near(el[i]!, el[j]!)) continue;
        const a = el[i]!, b = el[j]!;
        this.pixelLine(this.sx(a.px + (a.x - a.px) * alpha), (a.py + (a.y - a.py) * alpha) * TILE,
          this.sx(b.px + (b.x - b.px) * alpha), (b.py + (b.y - b.py) * alpha) * TILE, this.mat(a.side).glow, 2);
      }
    }
    g.globalAlpha = 1;
  }

  /**
   * Over the units: each knitting trio is stitched together at head height (a thread around the
   * three, with a spark running along it) and a ring over the centroid closes as the knit completes.
   */
  private drawKnits(state: BattleState, alpha: number, t: number): void {
    const g = this.ctx;
    const trio = this.trio;
    for (const lead of state.units) {
      const k = lead.knit;
      if (!k || k.group !== lead.id) continue;
      trio.length = 0;
      for (const u of state.units) if (u.knit?.group === k.group) trio.push(u);
      const glow = this.mat(lead.side).glow;
      const prog = this.knitProgress(state, k.untilTick, alpha);
      const head = (u: UnitState): [number, number] => [
        Math.round(this.sx(u.px + (u.x - u.px) * alpha)),
        Math.round((u.py + (u.y - u.py) * alpha) * TILE - 11 * TIER_SCALE[u.tier - 1]!),
      ];
      for (let i = 0; i < trio.length; i++) {
        const [x0, y0] = head(trio[i]!);
        const [x1, y1] = head(trio[(i + 1) % trio.length]!);
        g.globalAlpha = 0.95;
        this.pixelLine(x0, y0, x1, y1, glow, 1);
        const f = (t / 260 + i / 3) % 1;
        g.fillStyle = '#fff3b0';
        g.fillRect(Math.round(x0 + (x1 - x0) * f) - 1, Math.round(y0 + (y1 - y0) * f) - 1, 2, 2);
      }
      const cx = this.sx(k.x), cy = k.y * TILE - 14;
      g.globalAlpha = 0.45 + 0.55 * prog;
      g.strokeStyle = '#fff3b0';
      g.lineWidth = 1;
      g.beginPath();
      g.arc(cx, cy, 2 + 8 * (1 - prog), 0, Math.PI * 2);
      g.stroke();
    }
    g.globalAlpha = 1;
  }

  /** 0 → 1 over a knit (interpolated between ticks). */
  private knitProgress(state: BattleState, untilTick: number, alpha: number): number {
    const knitTicks = Math.max(1, state.rules.merge.knitTicks);
    return Math.min(1, Math.max(0, 1 - (untilTick - state.tick - alpha) / knitTicks));
  }

  /** A one-pixel Bresenham line in native pixels; `every` > 1 draws a dotted line. */
  private pixelLine(x0: number, y0: number, x1: number, y1: number, color: string, every: number): void {
    const g = this.ctx;
    g.fillStyle = color;
    x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1);
    const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
    let err = dx + dy, n = 0;
    for (;;) {
      if (n++ % every === 0) g.fillRect(x0, y0, 1, 1);
      if (x0 === x1 && y0 === y1) break;
      const e2 = 2 * err;
      if (e2 >= dy) { err += dy; x0 += sx; }
      if (e2 <= dx) { err += dx; y0 += sy; }
    }
  }

  /** Tier insignia: one pip for Bloomed, two for Elder, centred above the sprite. */
  private pips(cx: number, y: number, n: number): void {
    const g = this.ctx;
    const w = n * 4 - 1;
    const x0 = cx - Math.floor(w / 2);
    g.fillStyle = '#120a16';
    g.fillRect(x0 - 1, y - 1, w + 2, 4);
    g.fillStyle = '#f0c85a';
    for (let i = 0; i < n; i++) g.fillRect(x0 + i * 4, y, 3, 2);
  }

  /** A slow pulsing halo under an Elder's feet. */
  private elderAura(cx: number, footY: number, w: number, color: string, t: number): void {
    const g = this.ctx;
    g.globalAlpha = 0.22 + 0.08 * Math.sin(t / 300);
    g.fillStyle = color;
    g.beginPath();
    g.ellipse(cx, footY - 1, w * 0.55, 3.5, 0, 0, Math.PI * 2);
    g.fill();
    g.globalAlpha = 1;
  }

  /** "Merge off" status glyph: a knot struck through. */
  private knotOff(x: number, y: number, color: string): void {
    const g = this.ctx;
    g.fillStyle = '#120a16';
    g.fillRect(x - 1, y - 1, 9, 9);
    g.fillStyle = color;
    for (const [px, py] of [[2, 0], [3, 0], [4, 0], [1, 1], [5, 1], [0, 2], [6, 2], [0, 3], [6, 3], [0, 4], [6, 4], [1, 5], [5, 5], [2, 6], [3, 6], [4, 6], [3, 2], [3, 3], [3, 4]] as const) g.fillRect(x + px, y + py, 1, 1);
    g.fillStyle = '#e0645a';
    for (let i = 0; i < 7; i++) g.fillRect(x + i, y + 6 - i, 1, 1);
  }

  private shield(x: number, y: number, color: string): void {
    const g = this.ctx;
    g.fillStyle = '#1a1020';
    g.fillRect(x - 1, y - 1, 8, 9);
    g.fillStyle = color;
    g.fillRect(x, y, 6, 4);
    g.fillRect(x + 1, y + 4, 4, 2);
    g.fillRect(x + 2, y + 6, 2, 1);
  }

  private bar(x: number, y: number, w: number, frac: number, side: Side, h = 2): void {
    const g = this.ctx;
    g.fillStyle = '#120a16';
    g.fillRect(x - 1, y - 1, w + 2, h + 2);
    g.fillStyle = side === 'player' ? '#c9a2ff' : '#b8c4a8';
    g.fillRect(x, y, Math.max(0, Math.round(w * Math.max(0, Math.min(1, frac)))), h);
  }

  private glyph(text: string, x: number, y: number, color: string): void {
    const g = this.ctx;
    g.font = '9px ui-monospace, monospace';
    g.fillStyle = '#120a16';
    g.fillText(text, x + 1, y + 1);
    g.fillStyle = color;
    g.fillText(text, x, y);
  }

  private drawGhost(gh: Ghost, state: BattleState): void {
    const g = this.ctx;
    const def = state.compiled.player.buildings[gh.buildingId];
    if (!def) return;
    const x = this.sx(gh.col), y = gh.row * TILE;
    g.globalAlpha = 0.6;
    this.drawSprite(g, this.content.buildings[gh.buildingId]!.sprite, 'velvet-bloom', 0, x, y);
    g.globalAlpha = 0.28;
    g.fillStyle = gh.legal ? '#7fcf8a' : '#e0645a';
    g.fillRect(x, y, def.w * TILE, def.h * TILE);
    g.globalAlpha = 1;
    g.strokeStyle = gh.legal ? '#7fcf8a' : '#e0645a';
    g.strokeRect(x + 0.5, y + 0.5, def.w * TILE - 1, def.h * TILE - 1);
    const a = def.attack;
    if (a) this.ring(gh.col + def.w / 2, gh.row + def.h / 2, a.range, '#c9a2ff');
  }

  ring(cx: number, cy: number, r: number, color: string): void {
    const g = this.ctx;
    g.strokeStyle = color;
    g.globalAlpha = 0.6;
    g.beginPath();
    g.arc(this.sx(cx), cy * TILE, r * TILE, 0, Math.PI * 2);
    g.stroke();
    g.globalAlpha = 1;
  }

  private drawDebug(state: BattleState, view: View): void {
    const g = this.ctx;
    g.font = '8px ui-monospace, monospace';
    for (let li = 0; li < state.lanes.length; li++) {
      const L = state.lanes[li]!;
      const pres = lanePresence(state, li);
      for (let c = 0; c < state.map.width; c++) {
        const p = pres.player[c]!, e = pres.enemy[c]!;
        if (!p && !e) continue;
        g.fillStyle = '#c9a2ff';
        if (p) g.fillText(String(p), this.sx(c) + 1, (L.rowEnd + 1) * TILE - 9);
        g.fillStyle = '#b8c4a8';
        if (e) g.fillText(String(e), this.sx(c) + 1, (L.rowEnd + 1) * TILE - 1);
      }
      for (const side of ['player', 'enemy'] as Side[]) {
        const cap = L.capture[side];
        g.fillStyle = side === 'player' ? '#c9a2ff' : '#b8c4a8';
        g.fillText(`${cap.progress}`, this.sx(cap.column) + 1, L.rowStart * TILE + 12 + (side === 'enemy' ? 8 : 0));
      }
    }
    g.fillStyle = '#ffe9a8';
    for (const u of state.units) {
      g.fillText(String(u.id), this.sx(u.x) - 4, u.y * TILE + 9);
      if (u.id === view.selected) this.ring(u.x, u.y, state.compiled[u.side].units[u.unitId]!.aggroRange, '#ffe9a8');
    }
  }
}
