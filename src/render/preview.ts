// The formation preview (SPEC §10.2, §13.6 layer 4; plan Calls 5, 6 and 22; A060, A069). In planning both armies
// stand in the arena where the clash's arrival puts them, at the sim's `formationOf` positions: each squad's
// units dimmed inside a faint outline of its slot, with its merge preview from `mergePreview`, pips for the
// Bloomed and Elder units it fields after the muster, then the count of base units left. A plot and its slot
// light together while either is hovered, and the ghost's squad stands in its slot through `formationOf(…,
// change)`, unboxed: while a card is chosen only the plot under the cursor lights, since you place on plots
// (S21b/T161), and your slots light nothing (T167). While a card is chosen or one of your squads is hovered, the
// general's squads carry the marks of your hits on them from `matchupClass`: on their base-tier units, plus a
// pips mark when their merged units take a different class (Call 22). The reverse direction and the cards'
// marks are R4b's. Under `reveal=last` the general's colony and squads stand as it fielded them last round,
// from round 2 (§7.5, R2-Q1, T127): a view rule, so the sim never sees it. The squads and merge previews are
// cached by the colony's version and the ghost (§13.6), and what it drew is kept for the bridge's `preview()`
// (T079).
import type { Content } from '../data/registry.ts';
import { formationBox } from '../sim/formation.ts';
import type { Slot } from '../sim/formation.ts';
import { SIDES, formationOf, matchupClass, mergePreview } from '../sim/index.ts';
import type { BattleState, BuildingState, Effectiveness, MergePreview, PlanChange, Side, SquadPlan, TierCounts } from '../sim/index.ts';
import type { Atlas } from './atlas.ts';
import { pixelText, textWidth } from './pixelText.ts';
import { TILE, factionOf } from './renderer.ts';
import { INK_DEEP, PIP_SIZE, drawPips, drawUnitSprite } from './unitSprite.ts';
import type { UnitSpriteOpts } from './unitSprite.ts';
import { unitLook } from './unitLook.ts';
import type { UnitLook } from './unitLook.ts';

/** A matchup mark's class: a normal matchup has no mark (§10.4). */
export type MarkClass = Exclude<Effectiveness, 'normal'>;

/** Call 22's two marks over one of the general's squads: your hits on its base-tier units, and on its merged units where they take another class. */
export interface SquadMarks {
  base: MarkClass | null;
  merged: MarkClass | null;
}

/** One squad as the preview drew it. */
export interface DrawnSquad {
  /** Its building's entity id; for the ghost's squad, the id its plant would take. */
  building: number;
  unitId: string;
  /** Its plot, an index into its side's colony. */
  plot: number;
  /** Its units where it drew them, dimmed: `formationOf`'s positions, where they arrive (§4.6). */
  units: { x: number; y: number }[];
  /** Its merge preview: what it fields after the muster (§5.6). */
  fields: TierCounts;
  /** The marks over one of the general's squads while marks show (T084), else null. */
  marks: SquadMarks | null;
  /** The chosen card's squad at the ghost's plot, not yet planted. */
  ghost?: true;
}

/** One of a side's buildings as the colony layer drew it. */
export interface DrawnBuilding {
  /** Its entity id; below 0 for one the general sold this round, standing again under `reveal=last`. */
  building: number;
  buildingId: string;
  plot: number;
  /** Its "New" sprout (§10.4). */
  sprout: boolean;
}

/** One side's preview as it was last drawn, which the bridge's `preview()` returns (T079). */
export interface DrawnPreview {
  squads: DrawnSquad[];
  /** Where each merged unit its merge previews show will stand after the muster, with its tier (§5.6). */
  knits: { x: number; y: number; tier: 2 | 3 }[];
  /** The plot lit with its slot, by hovering either, or null. */
  hover: number | null;
  /** Its colony's buildings as drawn, each with its "New" sprout: under `reveal=last`, the general's as it fielded last round. */
  colony: DrawnBuilding[];
}

/** How the general shows from round 2 (§7.5, R2-Q1): its whole current plan, or as it fielded last round (`reveal=last`, T127). */
export type Reveal = 'full' | 'last';

/** Whether the general's changes this round wait for Begin: under `reveal=last`, in planning from round 2 (T127). */
export const heldUntilBegin = (reveal: Reveal, state: BattleState): boolean => reveal === 'last' && state.round > 1 && state.phase === 'planning';

/** The general's colony as it fielded last round (`reveal=last`): what stands again, and what's hidden until Begin. */
export interface LastFielded {
  /** The battle with that colony, for `formationOf` and `mergePreview`; everything else is the battle's own. */
  state: BattleState;
  /** This round's plantings, hidden until Begin, by entity id. */
  hidden: ReadonlySet<number>;
  /** This round's sales, standing again, with ids below 0, which the sim never gives out. */
  restored: readonly BuildingState[];
}

/**
 * The general's colony as it fielded last round, for `reveal=last` (§7.5, T127): from round 2, its colony as it
 * stands minus this round's plantings and upgrades, plus this round's sales, read from its plan for the round (plan
 * Call 12), so it holds after a `round=` fast-forward. A building planted and sold again this round never
 * fielded, so it stays out. The plan doesn't record the merge toggles, so they're as they stand, and a sale
 * stands again with its toggle on. Null when the general shows as it stands: in round 1, or with no change in
 * its plan. It writes nothing.
 */
export function lastFielded(state: BattleState): LastFielded | null {
  const plan = state.round > 1 ? state.sides.enemy.ai?.plans.find((p) => p.round === state.round) : undefined;
  if (!plan || (!plan.planted.length && !plan.sold.length && !plan.upgraded?.length)) return null;
  const plots = state.sides.enemy.plots.map((p) => ({ ...p }));
  const hidden = new Set<number>();
  const sold = [...plan.sold];
  for (const x of plan.planted) {
    const b = state.buildings.find((y) => y.id === plots[x.plot]!.building);
    if (b && b.buildingId === x.building && b.plantedRound === state.round) {
      hidden.add(b.id);
      plots[x.plot]!.building = 0;
    } else {
      const i = sold.findIndex((y) => y.building === x.building && y.plot === x.plot);
      if (i >= 0) sold.splice(i, 1);
    }
  }
  const restored: BuildingState[] = [];
  for (const x of sold) {
    if (plots[x.plot]!.building) continue;
    const id = -1 - restored.length;
    restored.push({
      id, side: 'enemy', buildingId: x.building, plot: x.plot, plantedRound: state.round - 1, pricePaid: 0, fielded: true, mergeOn: true,
      ...(x.upgraded ? { upgrade: { paid: 0, fielded: true } } : {}),
    });
    plots[x.plot]!.building = id;
  }
  // this round's upgrades haven't fielded yet, so they wait for Begin too (§6.1)
  const lastRound = (b: BuildingState): BuildingState => {
    if (b.side !== 'enemy' || !b.upgrade || b.upgrade.fielded) return b;
    const { upgrade: _new, ...before } = b;
    return before;
  };
  const buildings = [...restored, ...state.buildings.filter((b) => !hidden.has(b.id)).map(lastRound)];
  return { state: { ...state, sides: { ...state.sides, enemy: { ...state.sides.enemy, plots } }, buildings }, hidden, restored };
}

/** What the view passes for a frame. */
export interface PreviewView {
  /** The colony's version (`RoundsView.colonyVersion`): the squads and merge previews are recomputed when it moves. */
  colony: number;
  ghost: { buildingId: string; plot: number; legal: boolean } | null;
  /** The chosen card. */
  placing: string | null;
  /** The tile under the cursor. */
  hover: { col: number; row: number } | null;
}

/** A side's squads and merge preview for one colony, with what drawing them needs. */
interface SideCache {
  squads: SquadPlan[];
  merge: MergePreview;
  /** Each plot's slot, by plot index. */
  slots: Slot[];
  /** Every squad's units in draw order, by y and then index: [squad index, unit index]. */
  order: [number, number][];
  /** The ghost's squad's building id, or 0. */
  ghost: number;
  knits: DrawnPreview['knits'];
}

const DIM = 0.55;
const GHOST_DIM = 0.45;
const SLOT_ALPHA = 0.28;
const HOVER = '#fbf6ff';

export class FormationPreview {
  /** What it drew last, per side, or null before its first draw. */
  drawn: Record<Side, DrawnPreview> | null = null;
  /** How the general shows from round 2, from the page's `reveal=` (T127). */
  reveal: Reveal = 'full';
  /** Under `reveal=last`, the general as it fielded last round, for this planning phase; null while it shows as it stands. */
  private fielded: LastFielded | null = null;
  /** What the cache was computed for: the colony's version, the ghost's card and plot, and the colonies' sizes. */
  private seen = { colony: -1, card: '', plot: -1, plots: -1 };
  /** The record is rebuilt when the cache, the lit plots or the marks' attacker change. */
  private stale = true;
  private cache: Record<Side, SideCache> | null = null;
  private hovered: Record<Side, number | null> = { player: null, enemy: null };
  /** A card is chosen, so your hovered plot lights without its slot (T161). */
  private placing = false;
  /** Whose hits the marks show: the chosen card's unit, or your hovered squad's; null hides them. */
  private attacker: string | null = null;
  private look: UnitLook = { sprite: '', frame: 0, flip: false };
  private opts: UnitSpriteOpts = {
    sprite: '', faction: 'velvet-bloom', frame: 0, flip: false, x: 0, y: 0, tier: 1, side: 'player', id: 0, hpFrac: 1, glow: '', time: 0,
  };

  constructor(private content: Content, private atlas: Atlas) {}

  /** Each plot's slot for a side, as the clash's formation box lays them out (§4.6); empty before the first draw. */
  slotsOf(side: Side): readonly Slot[] { return this.cache?.[side].slots ?? []; }

  /** Recomputes the squads and merge previews when the colony or the ghost changed, and what the cursor lights. */
  update(state: BattleState, v: PreviewView): void {
    const ghost = v.ghost?.legal ? v.ghost : null;
    const s = this.seen, card = ghost?.buildingId ?? '', plot = ghost?.plot ?? -1;
    const plots = state.sides.player.plots.length * 1000 + state.sides.enemy.plots.length;
    if (v.colony !== s.colony || card !== s.card || plot !== s.plot || plots !== s.plots) {
      s.colony = v.colony; s.card = card; s.plot = plot; s.plots = plots;
      this.fielded = this.reveal === 'last' ? lastFielded(state) : null;
      this.cache = { player: this.sideCache(state, 'player', ghost), enemy: this.sideCache(this.fielded?.state ?? state, 'enemy', null) };
      this.stale = true;
    }
    this.placing = v.placing !== null;
    for (const side of SIDES) {
      const i = this.plotUnder(state, side, v.hover);
      if (i !== this.hovered[side]) { this.hovered[side] = i; this.stale = true; }
    }
    const attacker = this.attackerOf(state, v.placing);
    if (attacker !== this.attacker) { this.attacker = attacker; this.stale = true; }
    if (this.stale) {
      this.stale = false;
      this.drawn = { player: this.record(state, 'player'), enemy: this.record(state, 'enemy') };
    }
  }

  /**
   * The buildings the colony layer draws (§10.2): the battle's, except that under `reveal=last` in planning from
   * round 2 the general's stand as it fielded last round (T127). Planning reads it after `update`.
   */
  buildingsShown(state: BattleState): readonly BuildingState[] {
    const f = heldUntilBegin(this.reveal, state) ? this.fielded : null;
    return f ? [...f.restored, ...state.buildings.filter((b) => !f.hidden.has(b.id))] : state.buildings;
  }

  /**
   * Whether a building carries the "New" sprout (§10.4): one planted this round, through planning. Under
   * `reveal=last` the general's plantings from round 2 appear at Begin, so theirs carry it through the clash and
   * the aftermath instead (§7.5, T127).
   */
  sproutOn(state: BattleState, b: BuildingState): boolean {
    if (b.plantedRound !== state.round) return false;
    if (this.reveal === 'last' && b.side === 'enemy' && state.round > 1) return state.phase === 'clash' || state.phase === 'aftermath';
    return state.phase === 'planning';
  }

  private sideCache(state: BattleState, side: Side, ghost: PreviewView['ghost']): SideCache {
    const change: PlanChange | undefined = ghost ? { plant: { buildingId: ghost.buildingId, plot: ghost.plot } } : undefined;
    const squads = formationOf(state, side, change);
    const merge = mergePreview(state, side, change);
    const plots = state.sides[side].plots;
    const geom = { width: state.map.width, lanes: state.lanes, gapTiles: state.rules.formationGapTiles };
    const box = formationBox(geom, side, plots.reduce((n, p) => Math.max(n, p.rank + 1), 1));
    const slots = plots.map((p) => box.find((s) => s.lane === p.lane && s.rank === p.rank && s.file === p.file)!);
    const order: [number, number][] = [];
    squads.forEach((q, i) => q.units.forEach((_, j) => order.push([i, j])));
    order.sort(([i, j], [k, l]) => squads[i]!.units[j]!.y - squads[k]!.units[l]!.y || i - k || j - l);
    // the muster's merged units are the trios no later trio takes in: each part's last trio
    const owner = new Map<string, number>();
    merge.trios.forEach((t, n) => { for (const p of t.parts) owner.set(`${p.building}:${p.j}`, n); });
    const knits = merge.trios.filter((t, n) => owner.get(`${t.parts[0]!.building}:${t.parts[0]!.j}`) === n).map((t) => ({ x: t.x, y: t.y, tier: t.tier }));
    return { squads, merge, slots, order, ghost: change ? state.nextId : 0, knits };
  }

  /**
   * The open plot of a side under the tile, or the one whose slot covers it: hovering either lights both (§10.2).
   * While a card is chosen your slots light nothing, since you place on plots only (T167).
   */
  private plotUnder(state: BattleState, side: Side, tile: PreviewView['hover']): number | null {
    if (!tile || !this.cache) return null;
    const inSquare = (c: number, r: number) => tile.col >= c && tile.col < c + 2 && tile.row >= r && tile.row < r + 2;
    const plots = state.sides[side].plots, slots = this.cache[side].slots;
    const bySlot = side === 'enemy' || !this.placing;
    for (let i = 0; i < plots.length; i++) {
      const p = plots[i]!, s = slots[i]!;
      if (p.open && (inSquare(p.col, p.row) || (bySlot && inSquare(s.col, s.row)))) return i;
    }
    return null;
  }

  /** The unit whose hits the marks show (§10.2): the chosen card's, else the one your hovered squad fields. */
  private attackerOf(state: BattleState, placing: string | null): string | null {
    if (placing) return state.compiled.player.buildings[placing]?.squad?.unit ?? null;
    const plot = this.hovered.player;
    if (plot === null || !this.cache) return null;
    return this.cache.player.squads.find((q) => q.plot === plot && q.building !== this.cache!.player.ghost)?.unitId ?? null;
  }

  /** Call 22's marks of the attacker's hits on one of the general's squads, by what it fields after the muster. */
  private marksOn(state: BattleState, q: SquadPlan, fields: TierCounts): SquadMarks {
    const cls = (tier: 1 | 2 | 3) => matchupClass(state, 'player', this.attacker!, 1, 'enemy', q.unitId, tier);
    const base = cls(1);
    const mergedTier = fields.bloomed ? 2 : fields.elders ? 3 : 0;
    const merged = mergedTier ? cls(mergedTier) : base;
    return { base: base === 'normal' ? null : base, merged: merged !== base && merged !== 'normal' ? merged : null };
  }

  private record(state: BattleState, side: Side): DrawnPreview {
    const c = this.cache![side];
    const marks = side === 'enemy' && this.attacker !== null;
    return {
      squads: c.squads.map((q) => {
        const fields = { ...c.merge.byBuilding[q.building]! };
        return {
          building: q.building, unitId: q.unitId, plot: q.plot, units: q.units.map((u) => ({ x: u.x, y: u.y })), fields,
          marks: marks ? this.marksOn(state, q, fields) : null, ...(q.building === c.ghost ? { ghost: true as const } : {}),
        };
      }),
      knits: c.knits,
      hover: this.hovered[side],
      colony: this.buildingsShown(state).filter((b) => b.side === side)
        .map((b) => ({ building: b.id, buildingId: b.buildingId, plot: b.plot, sprout: this.sproutOn(state, b) })),
    };
  }

  /** Layer 4: both formations' slots and dimmed squads, the ghost's included, with their merge previews. */
  drawSquads(g: CanvasRenderingContext2D, state: BattleState, sx: (x: number) => number, glowOf: (side: Side) => string, assist: boolean, t: number): void {
    if (!this.cache) return;
    for (const side of SIDES) {
      const c = this.cache[side];
      g.lineWidth = 1;
      g.globalAlpha = SLOT_ALPHA;
      g.strokeStyle = glowOf(side);
      for (const q of c.squads) {
        if (q.building === c.ghost) continue; // the plot carries the placing highlight (T161)
        g.strokeRect(sx(q.slot.col) + 0.5, q.slot.row * TILE + 0.5, 2 * TILE - 1, 2 * TILE - 1);
      }
      g.globalAlpha = 1;
      const o = this.opts;
      o.faction = factionOf(side);
      o.side = side;
      o.glow = glowOf(side);
      o.assist = assist;
      o.time = t;
      for (const [i, j] of c.order) {
        const q = c.squads[i]!, at = q.units[j]!;
        const look = unitLook(this.content, q.unitId, !!state.compiled[side].units[q.unitId]?.emplacement, side, 'still', 0, this.look);
        o.sprite = look.sprite;
        o.frame = look.frame;
        o.flip = look.flip;
        o.x = sx(at.x);
        o.y = at.y * TILE;
        o.id = q.building * 16 + j;
        // an upgraded squad arrives Bloomed (§6.1)
        o.tier = q.tier;
        o.burrowed = state.compiled[side].units[q.unitId]?.tags.includes('burrow');
        o.alpha = q.building === c.ghost ? GHOST_DIM : DIM;
        drawUnitSprite(g, this.atlas, o);
      }
      for (const q of c.squads) this.drawMergePreview(g, q, c.merge.byBuilding[q.building]!, side, sx);
    }
  }

  /**
   * A squad's merge preview (§5.6, §10.2) along its slot's foot, on the side of its own colony: a pip group
   * for each Elder and Bloomed it fields after the muster, then "+N" for the base units left. A squad that
   * knits nothing shows none, since its units already show its size.
   */
  private drawMergePreview(g: CanvasRenderingContext2D, q: SquadPlan, f: TierCounts, side: Side, sx: (x: number) => number): void {
    if (!f.elders && !f.bloomed) return;
    const tiers: (2 | 3)[] = [...Array<3>(f.elders).fill(3), ...Array<2>(f.bloomed).fill(2)];
    const pipW = (tier: 2 | 3) => (tier === 3 ? 2 * PIP_SIZE.w + 1 : PIP_SIZE.w);
    const left = f.base ? `+${f.base}` : '';
    let w = -2;
    for (const tier of tiers) w += pipW(tier) + 2;
    if (left) w += 2 + textWidth(left);
    const x0 = side === 'player' ? sx(q.slot.col) + 2 : sx(q.slot.col) + 2 * TILE - 2 - w;
    const y0 = (q.slot.row + 2) * TILE - 2 - PIP_SIZE.h;
    g.globalAlpha = 0.82;
    g.fillStyle = INK_DEEP;
    g.fillRect(x0 - 1, y0 - 1, w + 2, PIP_SIZE.h + 2);
    g.globalAlpha = 1;
    let x = x0;
    for (const tier of tiers) {
      drawPips(g, this.atlas, x + pipW(tier) / 2, y0, tier);
      x += pipW(tier) + 2;
    }
    if (left) pixelText(g, left, x + 1, y0, '#ece4f4');
  }

  /** Layer 7: the hovered plots and slots, lit together (your plot alone while placing), and the marks over the general's squads. */
  drawOverlays(g: CanvasRenderingContext2D, state: BattleState, sx: (x: number) => number): void {
    if (!this.cache || !this.drawn) return;
    g.lineWidth = 1;
    for (const side of SIDES) {
      const i = this.hovered[side];
      if (i === null) continue;
      const p = state.sides[side].plots[i]!, s = this.cache[side].slots[i]!;
      g.globalAlpha = 0.9;
      g.strokeStyle = HOVER;
      g.strokeRect(sx(p.col) + 0.5, p.row * TILE + 0.5, 2 * TILE - 1, 2 * TILE - 1);
      if (side === 'enemy' || !this.placing) g.strokeRect(sx(s.col) + 0.5, s.row * TILE + 0.5, 2 * TILE - 1, 2 * TILE - 1);
      g.globalAlpha = 1;
    }
    const squads = this.cache.enemy.squads;
    this.drawn.enemy.squads.forEach((d, n) => {
      if (!d.marks) return;
      const slot = squads[n]!.slot;
      // along the slot's top, from its front, which faces your formation; its merge preview runs along its foot
      const cx = sx(slot.col) + 6, cy = slot.row * TILE + 6;
      if (d.marks.base) markGlyph(g, cx, cy, d.marks.base);
      if (d.marks.merged) {
        drawPips(g, this.atlas, cx + 12, cy - 2, 2);
        markGlyph(g, cx + 20, cy, d.marks.merged);
      }
    });
  }
}

/**
 * A basic matchup mark, drawn like its class's hit spark (§10.4) with a dark outline: strong is the large bright
 * gold cross, weak the small dull gray square, so size and outline tell the class as well as the tint.
 */
function markGlyph(g: CanvasRenderingContext2D, cx: number, cy: number, cls: MarkClass): void {
  const x = Math.round(cx), y = Math.round(cy);
  g.fillStyle = INK_DEEP;
  if (cls === 'strong') {
    g.fillRect(x - 3, y - 3, 7, 7);
    g.fillRect(x - 5, y - 1, 11, 3);
    g.fillRect(x - 1, y - 5, 3, 11);
    g.fillStyle = '#f0c85a';
    g.fillRect(x - 4, y, 9, 1);
    g.fillRect(x, y - 4, 1, 9);
    g.fillStyle = '#fff3b0';
    g.fillRect(x - 2, y - 2, 5, 5);
  } else {
    g.fillRect(x - 2, y - 2, 5, 5);
    g.fillStyle = '#8d8794';
    g.fillRect(x - 1, y - 1, 3, 3);
  }
}
