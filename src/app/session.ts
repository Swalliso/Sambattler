// One battle in rounds being played in the browser (SPEC §10.2, §10.3, §13.5): the sim state plus the UI's own
// state, which never reaches the sim: speed, pause, the planning hold (plan Call 14), the chosen card and its
// ghost on plots, the selection, the sell confirm, the empty-lane warning, and aiming the commander power with
// its reticle (§6.6). Input becomes ordinary stamped commands (plan Call 7), run at the next planning step, or
// a power's on the clash's next tick.
import type { Content } from '../data/registry.ts';
import type { PowerDef } from '../data/schema.ts';
import {
  bloomTrios, burstPreview, commandStamp, formationOf, plantProblem, powerOf, powerProblem, priceOf, queueCommand, sellValue,
} from '../sim/index.ts';
import type { BattleState, Command, CommandBody, UnitState } from '../sim/index.ts';
import { trayOrder } from '../ui/buildingInfo.ts';
import { loadSettings } from './settings.ts';

/** The ghost of the chosen card, snapped to one of your plots (§10.2 "Placing"). */
export interface PlotGhost {
  buildingId: string;
  /** Its plot, an index into your colony's plots. */
  plot: number;
  legal: boolean;
  /** Why it can't go there, in words, or null. */
  reason: string | null;
  price: number;
}

/** `plantProblem`'s reasons in the ghost's words (plan Call 21: "this plot is closed"). */
const REASONS: Record<string, string> = {
  plotClosed: 'this plot is closed',
  stumpPlot: 'a stump fills this plot',
  plotTaken: 'this plot is taken',
  notInKit: 'not in your kit',
};

export class RoundSession {
  /** Starts at the player's default speed (the settings screen). */
  speed: number = loadSettings().defaultSpeed;
  /** In a clash only: a pause never carries into the next clash (§13.5). */
  paused = false;
  /** Help or the settings screen is open: it holds a clash and the aftermath, as a pause does (§10.2, A078). */
  overlayOpen = false;
  /** `phase=planning` or `paused=1` keeps planning's queued commands unrun until input (plan Call 14). */
  hold = false;
  /** When this round's planning opened (performance.now()), for Begin by key (R2-Q12). */
  planningSince = 0;
  /** Time into the aftermath at the clash's speed, which its view draws from (`phases/aftermath.ts`). */
  aftermathMs = 0;
  placing: string | null = null;
  /** The tile under the cursor. */
  hover: { col: number; row: number } | null = null;
  shift = false;
  /** A building, yours or the general's, or in a clash a unit: inspect shows it (§10.4). */
  selected: number | null = null;
  /** X's first press on this building showed its refund; a second press sells it (§10.3). */
  sellArmed: number | null = null;
  /** Aiming the commander power: `Q` or its button, then a click (§6.6, §10.3). */
  targeting = false;
  /** The cursor in world tiles, which the power's reticle follows; null off the field. */
  aim: { x: number; y: number } | null = null;
  /** The empty-lane warning is pinned: the next Begin begins (§10.2). */
  warned = false;
  /** The lanes it names, as Begin found them. */
  warnedLanes: number[] = [];

  constructor(public state: BattleState, public content: Content) {}

  issue(body: CommandBody): Command {
    return queueCommand(this.state, { ...commandStamp(this.state), side: 'player', ...body });
  }

  /** Your cards in tray order, which keys 1–9 choose from. */
  cards(): string[] {
    return trayOrder(this.content, this.state.sides.player.kit.map((k) => k.building));
  }

  /** The UI's state as each phase opens: planning clears the warning and confirms, a clash drops the card and any pause. */
  phaseOpened(now: number): void {
    const phase = this.state.phase;
    this.sellArmed = null;
    this.warned = false;
    this.aftermathMs = 0;
    if (phase === 'planning') this.planningSince = now;
    if (phase === 'clash') { this.paused = false; this.placing = null; }
    this.targeting = false;
  }

  /** The player's commander power in this battle, with its name and text from content (R2-Q8), or undefined. */
  power(): PowerDef | undefined {
    const def = powerOf(this.state, 'player');
    return def && Object.values(this.content.commanders).find((c) => c.power.id === def.id)?.power;
  }

  /** A power use queued but not run yet: while paused, or until the next tick. */
  powerPending(): boolean {
    return this.state.queue.some((c) => c.side === 'player' && c.type === 'power');
  }

  /** Why the power can't be aimed now (`powerProblem`'s reasons, or `pending`), or null. */
  aimProblem(): string | null {
    const problem = powerProblem(this.state, 'player', {});
    if (problem && problem !== 'needsTarget') return problem;
    return this.powerPending() ? 'pending' : null;
  }

  /** `Q` or the power button: starts or stops aiming, and returns false if it can't aim now. Choosing a card stops. */
  toggleTargeting(): boolean {
    if (this.targeting) { this.targeting = false; return true; }
    if (!this.power() || this.aimProblem()) return false;
    this.targeting = true;
    this.placing = null;
    return true;
  }

  /**
   * While aiming, what the power would do at the cursor now (§10.3): Spore Burst's targets and their damage, or
   * Puppet Bloom's trios, with the units it would reach, and why a click there would be refused.
   */
  powerPreview(): { valid: boolean; count: number; value: number; reach: UnitState[]; reason: string | null } | null {
    const def = powerOf(this.state, 'player');
    if (!def || !this.targeting || !this.aim) return null;
    const { x, y } = this.aim;
    const reason = powerProblem(this.state, 'player', { x, y });
    const reach: UnitState[] = [];
    let count = 0, value = 0;
    if (def.kind === 'burst') ({ targets: count, value } = burstPreview(this.state, 'player', def, x, y, reach));
    else if (def.kind === 'bloom') {
      const { trios } = bloomTrios(this.state, 'player', x, y, def.radius);
      count = trios.length;
      for (const t of trios) reach.push(...t);
    }
    return { valid: !reason, count, value, reach, reason };
  }

  /** A click while aiming: queues the power at the cursor for the next tick, or returns why it's refused. */
  firePower(): string | null {
    if (!this.targeting) return null;
    const at = this.aim ?? {};
    const reason = powerProblem(this.state, 'player', at);
    if (reason) return reason;
    this.issue({ type: 'power', ...at });
    this.targeting = false;
    return null;
  }

  pick(id: string): void {
    if (this.state.phase !== 'planning') return;
    this.placing = this.placing === id ? null : id;
    this.selected = null;
    this.sellArmed = null;
  }

  /** Esc or a right click: stops aiming first, then clears the warning, then the card, then the selection. */
  cancel(): void {
    if (this.targeting) this.targeting = false;
    else if (this.warned) this.warned = false;
    else if (this.placing) this.placing = null;
    else this.selected = null;
    this.sellArmed = null;
  }

  /** Player commands queued but not run yet: planning's run at the next step. */
  private pending(): Command[] {
    return this.state.queue.filter((c) => c.side === 'player');
  }

  /** Your gold once the queued plants have run. */
  available(): number {
    let g = this.state.sides.player.gold;
    for (const c of this.pending()) if (c.type === 'plant') g -= priceOf(this.state, 'player', c.buildingId);
    return g;
  }

  /**
   * Your plot under a tile, or null. A card is placed on its plot only, never by its squad's spot in the field
   * (T167, the user's call at R2a's playtest: "stick to just having the user place the buildings").
   */
  plotAt(col: number, row: number): number | null {
    const plot = this.state.sides.player.plots.findIndex((p) => col >= p.col && col < p.col + 2 && row >= p.row && row < p.row + 2);
    return plot >= 0 ? plot : null;
  }

  ghost(): PlotGhost | null {
    if (!this.placing || !this.hover || this.state.phase !== 'planning') return null;
    const plot = this.plotAt(this.hover.col, this.hover.row);
    if (plot === null) return null;
    const price = priceOf(this.state, 'player', this.placing);
    const queued = this.pending().some((c) => c.type === 'plant' && c.plot === plot);
    const problem = queued ? 'plotTaken' : plantProblem(this.state, 'player', this.placing, plot);
    let reason: string | null = null;
    if (problem === 'notEnoughGold' || (!problem && price > this.available())) reason = `need ${price} gold`;
    else if (problem) reason = REASONS[problem] ?? problem;
    return { buildingId: this.placing, plot, legal: !reason, reason, price };
  }

  /** While a card is chosen: every free plot it could go on, gold aside (§10.2 "Placing"). */
  lit(): number[] | null {
    if (!this.placing || this.state.phase !== 'planning') return null;
    const taken = new Set(this.pending().flatMap((c) => (c.type === 'plant' ? [c.plot] : [])));
    const out: number[] = [];
    this.state.sides.player.plots.forEach((p, i) => { if (p.open && p.terrain !== 'stump' && !p.building && !taken.has(i)) out.push(i); });
    return out;
  }

  /** Plants the card at its ghost; Shift keeps the card chosen. Planting clears the empty-lane warning (§10.2). */
  plant(): boolean {
    const g = this.ghost();
    if (!g || !g.legal) return false;
    this.issue({ type: 'plant', buildingId: g.buildingId, plot: g.plot });
    this.warned = false;
    if (!this.shift) this.placing = null;
    return true;
  }

  /** X or Delete on the selection: the first press shows the refund, the second sells (§10.3). The refund, or null. */
  sell(): { refund: number; sold: boolean } | null {
    const b = this.state.buildings.find((x) => x.id === this.selected);
    if (!b || b.side !== 'player' || this.state.phase !== 'planning') return null;
    const refund = sellValue(this.state, b.id);
    if (this.sellArmed !== b.id) { this.sellArmed = b.id; return { refund, sold: false }; }
    this.issue({ type: 'sell', entityId: b.id });
    this.sellArmed = null;
    this.selected = null;
    return { refund, sold: true };
  }

  /** A merge toggle as it will be once the queued toggles run, so a double press flips back. */
  mergeShown(id: number): boolean {
    let on = this.state.buildings.find((b) => b.id === id)?.mergeOn ?? true;
    for (const c of this.pending()) if (c.type === 'toggleMerge' && c.entityId === id) on = c.on;
    return on;
  }

  /** M on the selection: flips one of your spawners' merge toggle (§4.4). */
  toggleMerge(): boolean {
    const b = this.state.buildings.find((x) => x.id === this.selected);
    if (!b || b.side !== 'player' || this.state.phase !== 'planning') return false;
    if (this.state.compiled.player.buildings[b.buildingId]?.kind !== 'spawner') return false;
    this.issue({ type: 'toggleMerge', entityId: b.id, on: !this.mergeShown(b.id) });
    return true;
  }

  /** Tab: the next of your buildings. */
  cycle(): void {
    const mine = this.state.buildings.filter((b) => b.side === 'player');
    if (!mine.length) return;
    const i = mine.findIndex((b) => b.id === this.selected);
    this.selected = mine[(i + 1) % mine.length]!.id;
    this.placing = null;
    this.sellArmed = null;
  }

  /** A click in planning: the building on the plot under the tile, yours or the general's. */
  selectAt(col: number, row: number): void {
    const s = this.state;
    let id: number | null = null;
    for (const side of ['player', 'enemy'] as const) {
      const p = s.sides[side].plots.find((q) => col >= q.col && col < q.col + 2 && row >= q.row && row < q.row + 2);
      if (p?.building) id = p.building;
    }
    this.selected = id;
    this.sellArmed = null;
  }

  /**
   * A click in a clash or the aftermath (§10.3): the unit nearest the point within about a tile, else the
   * building on the plot under it, yours or the general's.
   */
  selectIn(x: number, y: number, col: number, row: number): void {
    let best: number | null = null, d2 = 0.9 * 0.9;
    for (const u of this.state.units) {
      const d = (u.x - x) ** 2 + (u.y - y) ** 2;
      if (d < d2) { d2 = d; best = u.id; }
    }
    if (best !== null) { this.selected = best; this.sellArmed = null; return; }
    this.selectAt(col, row);
  }

  /** The lanes where you'd field nothing and the general fields something (§10.2): on a one-lane map, your whole formation. */
  emptyLanes(): number[] {
    const s = this.state;
    const fields = (side: 'player' | 'enemy') => new Set(formationOf(s, side).map((q) => q.lane));
    const mine = fields('player'), theirs = fields('enemy');
    return s.lanes.flatMap((_, i) => (!mine.has(i) && theirs.has(i) ? [i] : []));
  }

  /**
   * Begin (§10.2): the first press over an empty lane pins the warning instead, and the next press begins. A
   * pause never carries into the clash. Returns what happened, or null when Begin can't run now.
   */
  begin(): 'warned' | 'begun' | null {
    const s = this.state;
    if (s.phase !== 'planning' || s.queue.some((c) => c.type === 'beginClash')) return null;
    if (!this.warned) {
      this.warnedLanes = this.emptyLanes();
      if (this.warnedLanes.length) { this.warned = true; return 'warned'; }
    }
    this.issue({ type: 'beginClash' });
    this.warned = false;
    this.hold = false;
    this.paused = false;
    return 'begun';
  }
}
