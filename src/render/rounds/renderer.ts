// The canvas renderer for a battle in rounds (SPEC §13.6), from v1's `src/render/renderer.ts` without
// territory, capture, rally lines, turrets or spawn timers. It reads the sim's state and each step's events and
// never changes the sim. Layers, back to front: the terrain with both Heartcaps (baked); the colonies, each
// side's mycelium under its open plots with their faint 2×2 grid, and closed plots as dark, unlit soil with a
// small mark (plan Call 21, also baked); while a card is chosen, the free plots lit; the buildings, with their
// "New" sprout in planning and the merge-off knot; in planning the formation preview (`preview.ts`), and in a
// clash spore clouds and the units, sorted by y then id, through R4a's `drawUnitSprite` (an emplacement with its
// `emplacementSprite`), posed by the aftermath (`aftermath.ts`) once the clash is over; projectiles; sparks,
// puffs, merge pops and coin pops; the Sporestorm's haze; the aftermath's numbers; then the overlays: the lit
// plot and slot, the matchup marks, the ghost and F3's debug. It stands beside v1's renderer until R2b moves
// it to `src/render/`.
import type { Content } from '../../data/registry.ts';
import { formationBox } from '../../sim/formation.ts';
import { SIDES, formationOf } from '../../sim/rounds/index.ts';
import type { BattleState, PlotState, Side, SquadPlan, UnitState } from '../../sim/rounds/index.ts';
import type { Atlas, Faction } from '../atlas.ts';
import { Effects } from '../effects.ts';
import { BIG_HIT, TILE, factionOf, matTile } from '../renderer.ts';
import type { DamageNumbers } from '../renderer.ts';
import { INK_DEEP, drawUnitSprite, emplacementSprite } from '../unitSprite.ts';
import type { UnitSpriteOpts } from '../unitSprite.ts';
import { AftermathView } from './aftermath.ts';
import type { AftermathPose } from './aftermath.ts';
import { FormationPreview } from './preview.ts';

export { TILE } from '../renderer.ts';

/** The Heartcap strip's width in tiles at each end of the field, as v1's. */
export const STRIP = 2;

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
  /** The tile under the cursor, which lights a plot and its slot together (§10.2). */
  hover: { col: number; row: number } | null;
  /** The chosen card, whose hits the matchup marks show (§10.4). */
  placing: string | null;
  /** The colony's version (`RoundsView.colonyVersion`): the formation preview recomputes when it moves (§13.6). */
  colony: number;
  /** Time into the aftermath at the clash's speed, on the loop's clock (`phases/aftermath.ts`). */
  aftermathMs: number;
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
  /** Merge pops, damage numbers and coin pops, apart so a big fight's sparks never evict them. */
  readonly labels = new Effects(256);
  /** The formation preview, whose last drawing the bridge's `preview()` reports (T083). */
  readonly preview: FormationPreview;
  private aftermath: AftermathView;
  private pose: AftermathPose = { dx: 0, sink: 0, alpha: 1 };
  damageNumbers: DamageNumbers = 'off';
  /** Ambient motion holds still (`?test=1`, set by the view). */
  still = false;
  private sorted: UnitState[] = [];
  /** Each economy building's gold total at the last income, so a coin pop shows what it just paid (§13.6). */
  private goldSeen = new Map<string, number>();
  /** This step's formations, read as its `arrived` events come, one per squad in arrival order. */
  private arrivals: Record<Side, { plans: SquadPlan[]; n: number }> | null = null;
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
    this.preview = new FormationPreview(content, atlas);
    this.aftermath = new AftermathView(this.effects);
    for (const side of SIDES) for (const [id, gold] of Object.entries(state.stats[side].goldByBuilding)) this.goldSeen.set(`${side}:${id}`, gold);
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
  private toScreen = (x: number) => this.sx(x);
  private glowOf = (side: Side) => this.mat(side).glow;

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

  /** One step's events: sparks by effectiveness, death and arrival puffs, heals, bursts, merge pops and coin pops. */
  onTick(state: BattleState, now: number): void {
    this.arrivals = null;
    for (const e of state.events) {
      if (e.t === 'hit') {
        const eff = e.eff === 'strong' ? 1 : e.eff === 'weak' ? 3 : 2;
        this.effects.add(eff, e.x, e.y, now, e.splash ? 1 : 0);
        if (this.damageNumbers === 'all' || (this.damageNumbers === 'big' && e.amount >= BIG_HIT)) this.labels.add(9, e.x, e.y, now, eff, e.amount);
      } else if (e.t === 'merged') this.labels.add(8, e.x, e.y, now, e.tier, e.side === 'player' ? 0 : 1);
      else if (e.t === 'died') this.effects.add(e.side === 'player' ? 4 : 5, e.x, e.y, now, 0);
      else if (e.t === 'healed') this.effects.add(10, e.x, e.y, now, 0);
      else if (e.t === 'burst') this.effects.add(13, e.x, e.y, now, e.side === 'player' ? 0 : 1, e.radius);
      else if (e.t === 'arrived') this.arrivalPuffs(state, e.side, now);
      else if (e.t === 'income') this.coinPops(state, e.side, now);
    }
  }

  /**
   * A spore puff where each unit of the squad an `arrived` event names appears (§10.2, §10.4): Begin turns each
   * previewed squad into units in arrival order, one event a squad, at `formationOf`'s positions, so this reads
   * them there, before the muster's knits moved any.
   */
  private arrivalPuffs(state: BattleState, side: Side, now: number): void {
    this.arrivals ??= { player: { plans: formationOf(state, 'player'), n: 0 }, enemy: { plans: formationOf(state, 'enemy'), n: 0 } };
    const a = this.arrivals[side];
    const plan = a.plans[a.n++];
    if (plan) for (const at of plan.units) this.effects.add(7, at.x, at.y, now, 0);
  }

  /** A coin pop over each of a side's economy buildings that paid out at this income (§13.6); the general's dimmed. */
  private coinPops(state: BattleState, side: Side, now: number): void {
    const paid = state.stats[side].goldByBuilding;
    for (const b of state.buildings) {
      if (b.side !== side || !state.compiled[side].buildings[b.buildingId]?.economy) continue;
      const key = `${side}:${b.id}`;
      const total = paid[String(b.id)] ?? 0;
      const gain = total - (this.goldSeen.get(key) ?? 0);
      this.goldSeen.set(key, total);
      const p = state.sides[side].plots[b.plot]!;
      if (gain > 0) this.labels.add(11, p.col + 1, p.row + 0.3, now, side === 'player' ? 0 : 1, gain);
    }
  }

  draw(state: BattleState, alpha: number, view: RoundView): void {
    const g = this.ctx;
    const t = view.timeMs;
    const planning = state.phase === 'planning';
    g.drawImage(this.terrain, 0, 0);
    this.bakeColonies(state);
    g.drawImage(this.colonies, 0, 0);
    if (view.lit) this.drawLit(state.sides.player.plots, view.lit);

    for (const b of state.buildings) {
      const p = state.sides[b.side].plots[b.plot]!;
      const x = this.sx(p.col), y = p.row * TILE;
      this.drawSprite(g, this.content.buildings[b.buildingId]!.sprite, factionOf(b.side), this.still ? 0 : Math.floor(t / 600 + b.id) % 2, x, y);
      if (b.id === view.selected) {
        g.strokeStyle = '#ffe9a8';
        g.lineWidth = 1;
        g.strokeRect(x + 0.5, y + 0.5, 2 * TILE - 1, 2 * TILE - 1);
      }
      // the general's counters land as buildings with a "New" sprout, so you see them before you plan (§7.4, §10.4)
      if (planning && b.plantedRound === state.round) sprout(g, x + 2, y + 2);
      if (!b.mergeOn && state.compiled[b.side].buildings[b.buildingId]?.kind === 'spawner') knotOff(g, x + 2 * TILE - 9, y + 2 * TILE - 9, this.mat(b.side).glow);
    }

    const calm = this.calm();
    if (planning) {
      this.preview.update(state, view);
      this.preview.drawSquads(g, state, this.toScreen, this.glowOf, this.assist, calm, t);
    }
    if (state.clouds?.length) this.drawClouds(state, t);
    const over = state.phase === 'aftermath' || state.phase === 'ended';
    if (over) this.aftermath.begin(state, view.aftermathMs, this.still || state.phase === 'ended' ? 'final' : calm ? 'calm' : 'full', t);
    const us = this.sorted;
    us.length = 0;
    for (const u of state.units) us.push(u);
    us.sort((a, b) => a.y - b.y || a.id - b.id);
    for (const u of us) this.drawUnit(state, view, u, alpha, t, calm, over);

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

    this.effects.draw(g, t, this.toScreen, TILE);
    this.labels.draw(g, t, this.toScreen, TILE);
    if (state.sporestorm > 0) this.drawStorm(state.sporestorm, this.still ? 0 : t);
    if (over) this.aftermath.draw(g, state, this.toScreen, this.glowOf);
    if (planning) this.preview.drawOverlays(g, state, this.toScreen);
    if (view.ghost) this.drawGhost(state, view.ghost);
    if (view.debug) this.drawDebug(state);
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

  /** The Sporestorm's haze over the field, as v1's, thickening with each step of the storm (§6.4, §10.2). */
  private drawStorm(steps: number, t: number): void {
    const g = this.ctx;
    g.fillStyle = `rgba(201, 162, 255, ${0.025 * steps})`;
    g.fillRect(0, 0, this.width, this.height);
    g.fillStyle = 'rgba(251, 246, 255, 0.55)'; // spore-white: spores are the one particle
    const n = 14 * steps;
    for (let i = 0; i < n; i++) {
      const x = ((i * 97.3 + t * 0.012 * (1 + (i % 3))) % this.width + this.width) % this.width;
      const y = ((i * 53.7 + t * 0.006 * ((i % 2) ? 1 : -1)) % this.height + this.height) % this.height;
      g.fillRect(Math.round(x), Math.round(y), 1, 1);
    }
  }

  /** One unit, through R4a's drawer (`src/render/unitSprite.ts`), at its interpolated foot point, posed by the aftermath once the clash is over. */
  private drawUnit(state: BattleState, view: RoundView, u: UnitState, alpha: number, t: number, calm: boolean, over: boolean): void {
    let x = u.px + (u.x - u.px) * alpha;
    let y = (u.py + (u.y - u.py) * alpha) * TILE;
    const emplacement = !!state.compiled[u.side].units[u.unitId]?.emplacement;
    const o = this.unitOpts;
    o.alpha = 1;
    if (over) {
      const pose = this.aftermath.pose(state, u, emplacement, this.pose);
      if (pose.alpha <= 0) return;
      x += pose.dx;
      y += pose.sink;
      o.alpha = pose.alpha;
    }
    const moving = u.x !== u.px || u.y !== u.py;
    const attacking = state.tick - u.lastAttackTick < 6 && u.lastAttackTick >= 0;
    // an emplacement is one unit under its tower's id, drawn as R4a's emplacement (R4/T029)
    o.sprite = this.content.units[u.unitId]?.sprite ?? emplacementSprite(this.content, u.unitId);
    o.faction = factionOf(u.side);
    o.frame = attacking ? 2 : moving ? Math.floor(t / 250 + u.id) % 2 : 0;
    o.flip = u.side === 'enemy';
    o.x = this.sx(x);
    o.y = y;
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

  /** F3 (`?debug=1`, §10.3): every plot with its index, rank and file, the formation box and its slots, units' aggro radii and ids, buildings' ids. */
  private drawDebug(state: BattleState): void {
    const g = this.ctx;
    g.font = '7px ui-monospace, monospace';
    g.lineWidth = 1;
    const geom = { width: state.map.width, lanes: state.lanes, gapTiles: state.rules.formationGapTiles };
    for (const side of SIDES) {
      const plots = state.sides[side].plots;
      const tint = side === 'player' ? '#c9a2ff' : '#b8c4a8';
      g.fillStyle = tint;
      plots.forEach((p, i) => g.fillText(`${i} ${'FBT'[p.rank] ?? p.rank}${p.file}`, this.sx(p.col) + 1, p.row * TILE + 7));
      const box = formationBox(geom, side, plots.reduce((n, p) => Math.max(n, p.rank + 1), 1));
      g.strokeStyle = tint;
      g.globalAlpha = 0.5;
      for (const s of box) g.strokeRect(this.sx(s.col) + 0.5, s.row * TILE + 0.5, 2 * TILE - 1, 2 * TILE - 1);
      g.globalAlpha = 1;
      for (const s of box) g.fillText(`${'FBT'[s.rank] ?? s.rank}${s.file}`, this.sx(s.col) + 1, (s.row + 2) * TILE - 2);
      const cols = box.map((s) => s.col), rows = box.map((s) => s.row);
      const x0 = Math.min(...cols), y0 = Math.min(...rows);
      g.strokeRect(this.sx(x0) - 0.5, y0 * TILE - 0.5, (Math.max(...cols) + 2 - x0) * TILE + 1, (Math.max(...rows) + 2 - y0) * TILE + 1);
    }
    g.fillStyle = '#ffe9a8';
    for (const b of state.buildings) {
      const p = state.sides[b.side].plots[b.plot]!;
      g.fillText(`#${b.id}`, this.sx(p.col) + 1, (p.row + 2) * TILE - 2);
    }
    g.strokeStyle = '#ffe9a8';
    g.globalAlpha = 0.35;
    for (const u of state.units) {
      g.beginPath();
      g.arc(this.sx(u.x), u.y * TILE, state.compiled[u.side].units[u.unitId]!.aggroRange * TILE, 0, Math.PI * 2);
      g.stroke();
    }
    g.globalAlpha = 1;
    for (const u of state.units) g.fillText(String(u.id), this.sx(u.x) - 4, u.y * TILE + 9);
  }

  /** Ambient motion holds still: `?test=1` (set by the view) or reduced motion. */
  private calm(): boolean {
    return this.still || (typeof document !== 'undefined' && document.documentElement.classList.contains('reduce-motion'));
  }
}

/** The "New" status glyph (§10.4): a sprout on a building planted this planning phase, until the clash. */
function sprout(g: CanvasRenderingContext2D, x: number, y: number): void {
  g.fillStyle = INK_DEEP;
  g.fillRect(x - 1, y - 1, 7, 7);
  g.fillStyle = '#9fe0a0';
  for (const [px, py] of [[2, 2], [2, 3], [2, 4], [0, 1], [1, 1], [1, 2], [3, 0], [4, 0], [3, 1]] as const) g.fillRect(x + px, y + py, 1, 1);
}

/** The "merge off" status glyph (§10.4): a knot struck through, as v1's. */
function knotOff(g: CanvasRenderingContext2D, x: number, y: number, color: string): void {
  g.fillStyle = INK_DEEP;
  g.fillRect(x - 1, y - 1, 9, 9);
  g.fillStyle = color;
  for (const [px, py] of [[2, 0], [3, 0], [4, 0], [1, 1], [5, 1], [0, 2], [6, 2], [0, 3], [6, 3], [0, 4], [6, 4], [1, 5], [5, 5], [2, 6], [3, 6], [4, 6], [3, 2], [3, 3], [3, 4]] as const) g.fillRect(x + px, y + py, 1, 1);
  g.fillStyle = '#e0645a';
  for (let i = 0; i < 7; i++) g.fillRect(x + i, y + 6 - i, 1, 1);
}
