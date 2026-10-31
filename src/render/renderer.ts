// Canvas renderer (SPEC §13.6). Reads sim state and per-tick events; never mutates the sim.
// Layers, back to front: terrain → territory tint and capture progress → buildings → merge tethers
// and knit glow → units (by y, then id; merged units larger, with tier pips) → projectiles and
// sparks → labels (merge pops, damage numbers, coin pops) → overlays (placement ghost, ranges, debug).
// Color-blind assist (the settings screen) adds a team mark under every unit, a light ring for the
// Velvet Bloom and a dark dashed bar for the Gray Rot, and bolder mat textures: brighter wandering
// strands for the Bloom, dark ash tufts for the Rot, so the sides differ in shape and lightness.
// Spawn timers (playtest round 3, F7; a setting, on by default): a thin bar along the foot of each of
// your spawners fills toward its next spawn, and rests full and dim while it waits for supply.
import type { Content } from '../data/registry.ts';
import {
  canMerge, frontierBlocked, holdsLane, isSuppressed, lanePresence, rallyX, turretPos,
} from '../sim/index.ts';
import type { BattleState, BuildingState, Command, CompiledBuilding, Side, UnitState } from '../sim/index.ts';
import { positionalValue } from '../sim/effects.ts';
import type { Atlas, Faction } from './atlas.ts';
import { Effects } from './effects.ts';

export const TILE = 16;
const STRIP = 2; // Heartcap strip width in tiles on each side
/** Sprite scale per merge tier (SPEC §10.4: "a slightly larger sprite"). */
const TIER_SCALE = [1, 1.25, 1.5];
/** Combat rework `flyers`: how far a flyer's sprite floats above its shadow, in pixels (half a tile). */
const FLY_LIFT = 8;
/** "Big hits only" shows damage numbers from this amount up. */
export const BIG_HIT = 30;
export type DamageNumbers = 'off' | 'big' | 'all';

export interface Ghost { buildingId: string; col: number; row: number; legal: boolean }
/** The commander power's aim while targeting: a point and radius, or the lanes a global power would take. */
export interface Reticle { x: number; y: number; radius: number; valid: boolean }
export interface PowerAim { reticle: Reticle | null; lanes: number[] | null; pending: { x: number; y: number; radius: number }[] }
export interface View {
  ghost: Ghost | null;
  /** While placing: 1 per map tile (row-major) where the building could go, drawn as a soft lilac grid. */
  placeable?: Uint8Array | null;
  selected: number | null;
  pending: Command[];
  debug: boolean;
  timeMs: number;
  /** The power's reticle or lane highlights while targeting, and power uses queued but not yet run. */
  power?: PowerAim | null;
}

export const factionOf = (side: Side): Faction => (side === 'player' ? 'velvet-bloom' : 'gray-rot');
/** A faction's mycelial mat colors (data/factions/<id>/faction.json). */
export interface FactionMat { base: string; strand: string; glow: string }
const INK_DEEP = '#120a16';
/** Color-blind assist: where the Gray Rot's ash tufts sit in a mat tile (each is a dark stroke with a pale tip). */
const TUFTS: readonly [number, number][] = [[2, 2], [9, 1], [13, 6], [5, 8], [11, 12], [1, 12], [7, 14]];

/**
 * A 16×16 tile of hyphae strands in the faction's strand colour over a translucent base. Under the
 * color-blind assist the Bloom's strands are lighter and the Rot's are dark ash tufts.
 */
export function matTile(m: FactionMat, side: Side, assist: boolean): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = TILE; c.height = TILE;
  const g = c.getContext('2d')!;
  g.globalAlpha = assist ? 0.5 : 0.42;
  g.fillStyle = m.base;
  g.fillRect(0, 0, TILE, TILE);
  g.globalAlpha = 1;
  if (assist && side === 'enemy') {
    // ash tufts: short dark strokes with pale tips, nothing like the Bloom's light wandering strands
    for (const [x, y] of TUFTS) {
      g.fillStyle = INK_DEEP;
      g.fillRect(x, y, 1, 3);
      g.fillRect(x + 1, y + 1, 1, 2);
      g.fillStyle = m.glow;
      g.fillRect(x, y, 1, 1);
    }
    return c;
  }
  // a few wandering strands, deterministic per side; under the assist the Bloom's are lighter
  g.fillStyle = assist ? m.glow : m.strand;
  g.globalAlpha = assist ? 0.5 : 1;
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
  g.globalAlpha = 1;
  g.fillStyle = m.glow;
  g.fillRect(Math.floor(rnd() * TILE), Math.floor(rnd() * TILE), 1, 1);
  return c;
}

/**
 * Color-blind assist: a mark under a unit's feet that peeks out either side of the sprite. The Velvet
 * Bloom's is a light lilac ring; the Gray Rot's is a dark bar with pale dashes along its foot.
 */
export function teamMark(g: CanvasRenderingContext2D, cx: number, footY: number, w: number, side: Side): void {
  const half = Math.max(5, Math.round(w / 2) + 1);
  const x0 = cx - half, x1 = cx + half - 1;
  if (side === 'player') {
    g.fillStyle = INK_DEEP;
    g.fillRect(x0, footY + 2, x1 - x0 + 1, 1);
    g.fillStyle = '#c9a2ff';
    g.fillRect(x0, footY - 1, 1, 2);
    g.fillRect(x1, footY - 1, 1, 2);
    g.fillRect(x0 + 1, footY + 1, x1 - x0 - 1, 1);
  } else {
    g.fillStyle = INK_DEEP;
    g.fillRect(x0, footY, x1 - x0 + 1, 3);
    g.fillStyle = '#b8c4a8';
    for (let x = x0 + 1; x < x1; x += 3) g.fillRect(x, footY + 2, 1, 1);
  }
}

export class Renderer {
  readonly canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private terrain: HTMLCanvasElement;
  private territory: HTMLCanvasElement;
  private territoryKey = '';
  private matTile: Record<Side, HTMLCanvasElement>;
  readonly effects = new Effects(512);
  /** Merge pops, damage numbers and coin pops, kept apart so a big fight's sparks never evict them. */
  readonly labels = new Effects(256);
  /** Each economy building's gold total at the last income tick, so a coin pop shows what it just paid. */
  private goldSeen = new Map<string, number>();
  damageNumbers: DamageNumbers = 'off';
  /** A bar under each of your spawners, filling toward its next spawn (the settings screen). */
  spawnTimers = true;
  /** Ambient motion holds still (`?test=1`, set by the battle view): flyers don't bob. */
  still = false;
  private assist = false;
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
    // a resumed battle starts from the totals so far, not with one giant pop
    for (const side of ['player', 'enemy'] as Side[]) {
      for (const [id, gold] of Object.entries(state.stats[side].goldByBuilding)) this.goldSeen.set(`${side}:${id}`, gold);
    }
  }

  /** Color-blind assist: team marks under units and bolder mat textures (the mats rebake when it changes). */
  get colorAssist(): boolean { return this.assist; }
  set colorAssist(on: boolean) {
    if (on === this.assist) return;
    this.assist = on;
    this.matTile = { player: this.makeMatTile('player'), enemy: this.makeMatTile('enemy') };
    this.territoryKey = '';
  }

  /** Screen x (native px) of a world x. */
  sx(x: number): number { return (x + STRIP) * TILE; }

  private mat(side: Side) {
    return this.content.factions[factionOf(side)]!.mat;
  }

  private makeMatTile(side: Side): HTMLCanvasElement {
    return matTile(this.mat(side), side, this.assist);
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

  /** Feed one tick's events (spark, puff and flash effects, merge pops, damage numbers, coin pops). */
  onTick(state: BattleState, now: number): void {
    for (const e of state.events) {
      if (e.t === 'hit') {
        const eff = e.eff === 'strong' ? 1 : e.eff === 'weak' ? 3 : 2;
        this.effects.add(eff, e.x, e.y, now, e.splash ? 1 : 0);
        if (this.damageNumbers === 'all' || (this.damageNumbers === 'big' && e.amount >= BIG_HIT)) this.labels.add(9, e.x, e.y, now, eff, e.amount);
      } else if (e.t === 'merged') this.labels.add(8, e.x, e.y, now, e.tier, e.side === 'player' ? 0 : 1);
      else if (e.t === 'died') this.effects.add(e.side === 'player' ? 4 : 5, e.x, e.y, now, 0);
      else if (e.t === 'healed') this.effects.add(10, e.x, e.y, now, 0);
      else if (e.t === 'buildingDestroyed') this.effects.add(6, e.col + 1, e.row + 1, now, 0);
      else if (e.t === 'income') this.coinPops(state, e.side, now);
      else if (e.t === 'power' && e.x !== undefined && e.y !== undefined) {
        const def = state.library.powers?.[e.power];
        this.effects.add(12, e.x, e.y, now, e.side === 'player' ? 0 : 1, def && def.target === 'point' ? def.radius : 2);
      } else if (e.t === 'heartcapBreach') {
        // Heartcap breach prototype: a ring the size of the breach's pulse, when it has one
        const pulse = state.compiled[e.side].triggers.find((t) => t.on === 'heartcapBreach' && t.at === e.at)?.do.find((a) => 'explode' in a);
        if (pulse && 'explode' in pulse) this.effects.add(12, e.x, e.y, now, e.side === 'player' ? 0 : 1, pulse.explode.radius);
      }
      else if (e.t === 'burst') this.effects.add(13, e.x, e.y, now, e.side === 'player' ? 0 : 1, e.radius); // combat rework Burster
      else if (e.t === 'spawned') {
        const u = state.units.find((x) => x.id === e.id);
        if (u) this.effects.add(7, u.x, u.y, now, 0);
      }
    }
  }

  /** A coin pop over each of a side's economy buildings that paid out this income tick. */
  private coinPops(state: BattleState, side: Side, now: number): void {
    const paid = state.stats[side].goldByBuilding;
    for (const b of state.buildings) {
      if (b.side !== side) continue;
      const def = state.compiled[side].buildings[b.buildingId]!;
      if (!def.economy) continue;
      const key = `${side}:${b.id}`;
      const total = paid[String(b.id)] ?? 0;
      const gain = total - (this.goldSeen.get(key) ?? 0);
      this.goldSeen.set(key, total);
      if (gain > 0) this.labels.add(11, b.col + def.w / 2, b.row + 0.3, now, side === 'player' ? 0 : 1, gain);
    }
  }

  draw(state: BattleState, alpha: number, view: View): void {
    const g = this.ctx;
    const t = view.timeMs;
    g.drawImage(this.terrain, 0, 0);
    this.bakeTerritory(state);
    g.drawImage(this.territory, 0, 0);
    this.drawCapture(state);
    if (view.placeable) this.drawPlaceable(view.placeable, state.map.width);
    if (state.rules.stance) this.drawRally(state, t);

    // buildings
    for (const b of state.buildings) {
      const def = state.compiled[b.side].buildings[b.buildingId]!;
      const sprite = this.content.buildings[b.buildingId]!.sprite;
      const besieged = isSuppressed(state, b);
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
      // combat rework `waves`: the units waiting inside for the next wave
      if (b.stored) this.glyph(`+${b.stored}`, x + 2, y + def.h * TILE - 3, this.mat(b.side).glow);
      if (def.spawn && !b.mergeOn) this.knotOff(x + def.w * TILE - 9, y + def.h * TILE - 9, this.mat(b.side).glow);
      if (this.spawnTimers && def.spawn && b.side === 'player') this.spawnTimer(state, b, def, x, y);
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

    if (state.clouds?.length) this.drawClouds(state, t);
    this.drawMergeLinks(state, alpha, t);

    // units, sorted by y then id; merged units are drawn larger, with tier pips; flyers (combat rework
    // `flyers`) go last, over every ground unit, raised above their shadows
    const us = this.sorted;
    us.length = 0;
    for (const u of state.units) us.push(u);
    us.sort((a, b) => a.y - b.y || a.id - b.id);
    let flyers = false;
    for (const u of us) {
      if (u.flying) flyers = true;
      else this.drawUnit(state, view, u, alpha, t);
    }
    if (flyers) for (const u of us) if (u.flying) this.drawUnit(state, view, u, alpha, t);
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
      g.fillStyle = 'rgba(251, 246, 255, 0.55)'; // spore-white: spores are the one particle
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
    if (view.power) this.drawPowerAim(view.power, state, t);
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
   * Combat rework `sporeCloud`: each cloud is a soft spore haze in its owner's glow, clipped to its
   * lane, with spores drifting in it; it thins over its last quarter.
   */
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

  /**
   * One unit: its sprite at its foot point (merged units larger, with tier pips), shield ring, HP bar
   * and selection box. A tunnelling Rhizomorph is a mound; a flyer floats `FLY_LIFT` px above a shadow
   * on the ground, bobbing a pixel unless ambient motion holds still.
   */
  private drawUnit(state: BattleState, view: View, u: UnitState, alpha: number, t: number): void {
    const g = this.ctx;
    const x = u.px + (u.x - u.px) * alpha;
    const y = u.py + (u.y - u.py) * alpha;
    if (u.burrowed) { this.mound(this.sx(x), y * TILE, u, t, view.selected === u.id); return; }
    const sprite = this.content.units[u.unitId]!.sprite;
    const moving = u.x !== u.px || u.y !== u.py;
    const attacking = state.tick - u.lastAttackTick < 6 && u.lastAttackTick >= 0;
    const frame = attacking ? 2 : moving ? Math.floor(t / 250 + u.id) % 2 : 0;
    const flip = u.side === 'enemy';
    const r = this.atlas.get(sprite, factionOf(u.side), frame, flip);
    if (!r) return;
    const scale = TIER_SCALE[u.tier - 1]!;
    const w = Math.round(r.w * scale), hgt = Math.round(r.h * scale);
    const lift = u.flying ? FLY_LIFT + (this.calm() ? 0 : Math.floor(t / 320 + u.id) % 2) : 0;
    const dx = Math.round(this.sx(x) - r.ax * scale), dy = Math.round(y * TILE - r.ay * scale) - lift;
    if (this.assist) teamMark(g, Math.round(this.sx(x)), Math.round(y * TILE), w, u.side);
    if (u.flying) this.flyerShadow(this.sx(x), y * TILE, w);
    if (u.tier === 3) this.elderAura(this.sx(x), y * TILE - lift, w, this.mat(u.side).glow, t + u.id * 37);
    g.drawImage(this.atlas.canvas as CanvasImageSource, r.x, r.y, r.w, r.h, dx, dy, w, hgt);
    if (u.shield) this.shieldRing(this.sx(x), dy + hgt / 2, w, hgt, u.shield / Math.max(1, u.maxHp * (state.rules.mixed?.shieldFrac ?? 1)));
    if (u.id === view.selected) {
      g.strokeStyle = '#ffe9a8';
      g.strokeRect(dx - 0.5, dy - 0.5, w + 1, hgt + 1);
    }
    if (u.tier > 1) this.pips(Math.round(this.sx(x)), dy - (u.hp < u.maxHp ? 7 : 4), u.tier - 1);
    if (u.hp < u.maxHp) this.bar(dx + 1, dy - 3, w - 2, u.hp / u.maxHp, u.side);
  }

  /** Ambient motion holds still: `?test=1` (set by the battle view) or reduced motion. */
  private calm(): boolean {
    return this.still || (typeof document !== 'undefined' && document.documentElement.classList.contains('reduce-motion'));
  }

  /** Combat rework `flyers`: a soft dark oval on the ground under a flyer, where it really stands. */
  private flyerShadow(cx: number, footY: number, w: number): void {
    const g = this.ctx;
    const x = Math.round(cx), y = Math.round(footY);
    const half = Math.max(3, Math.round(w * 0.3));
    g.fillStyle = 'rgba(18, 10, 22, 0.4)';
    g.fillRect(x - half, y - 1, half * 2, 2);
    g.fillRect(x - half + 2, y - 2, half * 2 - 4, 1);
    g.fillRect(x - half + 2, y + 1, half * 2 - 4, 1);
  }

  /** Combat rework (the Rhizomorph): a tunnelling unit is a mound of earth on the move, kicking up crumbs behind it. */
  private mound(cx: number, footY: number, u: UnitState, t: number, selected: boolean): void {
    const g = this.ctx;
    const x = Math.round(cx), y = Math.round(footY);
    // a dark outline, the earth, a lit crest and a glowing seam where the hyphae break the surface
    g.fillStyle = INK_DEEP;
    g.fillRect(x - 8, y - 3, 16, 4);
    g.fillRect(x - 6, y - 5, 12, 2);
    g.fillRect(x - 3, y - 6, 6, 1);
    g.fillStyle = '#5c4330';
    g.fillRect(x - 7, y - 3, 14, 3);
    g.fillRect(x - 5, y - 5, 10, 2);
    g.fillStyle = '#7a5236';
    g.fillRect(x - 4, y - 5, 6, 1);
    g.fillRect(x - 2, y - 6, 3, 1);
    g.fillStyle = this.mat(u.side).glow;
    g.fillRect(x - 3, y - 2, 1, 1);
    g.fillRect(x + 1, y - 3, 1, 1);
    g.fillRect(x + 4, y - 2, 1, 1);
    // crumbs thrown up behind it as it goes
    const back = u.side === 'player' ? -1 : 1;
    g.fillStyle = '#7a5236';
    for (let i = 0; i < 4; i++) {
      const k = (Math.floor(t / 110) + u.id + i) % 5;
      g.fillRect(x + back * (8 + 2 * k), y - 2 - (k % 3), 1, 1);
    }
    if (selected) {
      g.strokeStyle = '#ffe9a8';
      g.strokeRect(x - 9.5, y - 7.5, 19, 10);
    }
  }

  /**
   * Prototype E1: a marching dashed rally line, topped by a pennant, in every lane a side holds. Under
   * the combat rework's waves a hold keeps the wave in its buildings, so only the pennant shows.
   */
  private drawRally(state: BattleState, t: number): void {
    const g = this.ctx;
    const waves = !!state.rules.waves;
    for (const side of ['player', 'enemy'] as Side[]) {
      for (let li = 0; li < state.lanes.length; li++) {
        if (!holdsLane(state, side, li)) continue;
        const L = state.lanes[li]!;
        const top = L.rowStart * TILE, bottom = (L.rowEnd + 1) * TILE;
        const x = Math.round(this.sx(rallyX(state, side, li)));
        const glow = this.mat(side).glow;
        const shift = Math.floor(t / 120) % 6;
        g.globalAlpha = 0.55;
        g.fillStyle = '#120a16'; // a dark backing stripe keeps the line readable on the side's own mat
        g.fillRect(x - 1, top, 3, waves ? 7 : bottom - top);
        g.globalAlpha = 0.95;
        g.fillStyle = glow;
        if (!waves) for (let y = top + 6 + shift; y < bottom; y += 6) g.fillRect(x, y, 1, 3);
        g.fillRect(x, top, 1, 6);
        const dir = side === 'player' ? -1 : 1; // the pennant flies back toward home
        for (let i = 0; i < 4; i++) g.fillRect(dir < 0 ? x - 1 - i : x + 1, top + i / 2, i + 1, 4 - i);
        g.globalAlpha = 1;
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
      g.arc(x, y, 7 + 2 * this.knitProgress(state, u.side, u.knit.untilTick, alpha), 0, Math.PI * 2);
      g.fill();
    }
    g.globalAlpha = 1;
    if (!state.config.flags.merging) return;
    const radius = { player: state.compiled.player.mergeRadius, enemy: state.compiled.enemy.mergeRadius };
    const el = this.eligible;
    el.length = 0;
    for (const u of state.units) if (canMerge(state, u)) el.push(u);
    if (this.links.length < el.length) this.links = new Int32Array(el.length * 2);
    const counts = this.links;
    counts.fill(0, 0, el.length);
    const near = (a: UnitState, b: UnitState) => {
      if (a.side !== b.side || a.unitId !== b.unitId || a.tier !== b.tier || a.lane !== b.lane) return false;
      const dx = a.x - b.x, dy = a.y - b.y;
      return dx * dx + dy * dy <= radius[a.side] * radius[a.side];
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
      const prog = this.knitProgress(state, lead.side, k.untilTick, alpha);
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
  private knitProgress(state: BattleState, side: Side, untilTick: number, alpha: number): number {
    const knitTicks = Math.max(1, state.compiled[side].knitTicks);
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

  /**
   * Combat rework `mixedWave`: a pale bubble round a shielded unit, fading as the shield wears down
   * (`frac`: what is left of the shield it set out with).
   */
  private shieldRing(cx: number, cy: number, w: number, h: number, frac: number): void {
    const g = this.ctx;
    const k = Math.max(0, Math.min(1, frac));
    g.globalAlpha = 0.2 + 0.5 * k;
    g.strokeStyle = '#cfe8ff';
    g.lineWidth = 1;
    g.beginPath();
    g.ellipse(Math.round(cx) + 0.5, Math.round(cy) + 0.5, w * 0.62 + 1, h * 0.58 + 1, 0, 0, Math.PI * 2);
    g.stroke();
    g.globalAlpha = 0.08 + 0.1 * k;
    g.fillStyle = '#cfe8ff';
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

  /**
   * How far a spawner is toward its next spawn, as a 1 px bar along the foot of its footprint (render only:
   * the sim's own countdown, against the interval it will reset to). Full and dim while waiting for supply.
   */
  private spawnTimer(state: BattleState, b: BuildingState, def: CompiledBuilding, x: number, y: number): void {
    const sp = def.spawn!;
    const full = sp.positional ? Math.round(positionalValue(state, b, sp.positional, 'building.spawnInterval') * state.rules.tickRate) * 2 : sp.intervalHalfTicks;
    const frac = b.holding ? 1 : 1 - b.timer / Math.max(1, full);
    const g = this.ctx;
    const w = def.w * TILE - 6, by = y + def.h * TILE - 2;
    g.fillStyle = 'rgba(13, 10, 16, 0.75)';
    g.fillRect(x + 3, by, w, 1);
    g.fillStyle = b.holding ? '#7b6c90' : '#c9a2ff';
    g.fillRect(x + 3, by, Math.round(w * Math.max(0, Math.min(1, frac))), 1);
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

  /** Your legal tiles while placing: a faint lilac wash with a grid line on every tile edge. */
  private drawPlaceable(mask: Uint8Array, W: number): void {
    const g = this.ctx;
    const H = mask.length / W;
    const on = (c: number, r: number) => c >= 0 && c < W && r >= 0 && r < H && mask[r * W + c] === 1;
    g.fillStyle = '#c9a2ff';
    g.globalAlpha = 0.08;
    for (let r = 0; r < H; r++) for (let c = 0; c < W; c++) if (on(c, r)) g.fillRect(this.sx(c), r * TILE, TILE, TILE);
    // each edge once: every legal tile draws its left and top edges, and its right and bottom ones at the border
    g.globalAlpha = 0.34;
    for (let r = 0; r < H; r++) {
      for (let c = 0; c < W; c++) {
        if (!on(c, r)) continue;
        const x = this.sx(c), y = r * TILE;
        g.fillRect(x, y, 1, TILE);
        g.fillRect(x + 1, y, TILE - 1, 1);
        if (!on(c + 1, r)) g.fillRect(x + TILE - 1, y + 1, 1, TILE - 1);
        if (!on(c, r + 1)) g.fillRect(x + 1, y + TILE - 1, TILE - 2, 1);
      }
    }
    g.globalAlpha = 1;
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

  /**
   * The commander power while aiming (SPEC §10.3): a reticle (crosshair and the radius ring, pulsing
   * lilac, red where it can't fire) at the cursor, or for a global power a wash over each frontier column
   * it would take; and a dashed ring on each use queued while paused.
   */
  private drawPowerAim(aim: PowerAim, state: BattleState, t: number): void {
    const g = this.ctx;
    if (aim.lanes) {
      g.fillStyle = '#c9a2ff';
      for (const li of aim.lanes) {
        const L = state.lanes[li]!;
        const top = L.rowStart * TILE, h = (L.rowEnd + 1 - L.rowStart) * TILE;
        const x = this.sx(L.pBorder + 1);
        g.globalAlpha = 0.18 + 0.1 * Math.sin(t / 160);
        g.fillRect(x, top, TILE, h);
        g.globalAlpha = 0.9;
        g.fillRect(x, top, 1, h);
        g.fillRect(x + TILE - 1, top, 1, h);
      }
      g.globalAlpha = 1;
    }
    const r = aim.reticle;
    if (r) {
      const color = r.valid ? '#c9a2ff' : '#e0645a';
      const cx = Math.round(this.sx(r.x)), cy = Math.round(r.y * TILE), rad = r.radius * TILE;
      // a soft wash that breathes, inside a steady 2 px ring with a dark edge so it reads on any ground
      g.fillStyle = color;
      g.globalAlpha = 0.1 + 0.05 * Math.sin(t / 140);
      g.beginPath();
      g.arc(cx, cy, rad, 0, Math.PI * 2);
      g.fill();
      g.globalAlpha = 0.7;
      g.strokeStyle = '#120a16';
      g.lineWidth = 4;
      g.beginPath();
      g.arc(cx, cy, rad, 0, Math.PI * 2);
      g.stroke();
      g.globalAlpha = 1;
      g.strokeStyle = color;
      g.lineWidth = 2;
      g.stroke();
      g.lineWidth = 1;
      // the crosshair: four ticks around a centre dot
      g.fillRect(cx, cy, 1, 1);
      g.fillRect(cx - 6, cy, 4, 1);
      g.fillRect(cx + 3, cy, 4, 1);
      g.fillRect(cx, cy - 6, 1, 4);
      g.fillRect(cx, cy + 3, 1, 4);
    }
    g.strokeStyle = '#c9a2ff';
    g.setLineDash([3, 3]);
    for (const p of aim.pending) {
      g.beginPath();
      g.arc(Math.round(this.sx(p.x)) + 0.5, Math.round(p.y * TILE) + 0.5, p.radius * TILE, 0, Math.PI * 2);
      g.stroke();
    }
    g.setLineDash([]);
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
