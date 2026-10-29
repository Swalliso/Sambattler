// One battle being played in the browser: the sim state plus UI-only state (speed, pause, selection,
// placement). Player input becomes ordinary tick-stamped commands (SPEC §13.5).
import type { Content } from '../data/registry.ts';
import {
  footprintOnLoam, legalPlacements, nextCommandTick, placementProblem, priceAt, depthOf, queueCommand,
} from '../sim/index.ts';
import type { BattleState, Command, CommandBody } from '../sim/index.ts';
import { laneOfRow } from '../sim/world.ts';
import { loadSettings } from './settings.ts';

export interface GhostInfo {
  buildingId: string;
  col: number;
  row: number;
  lane: number;
  legal: boolean;
  reason: string | null;
  price: number;
  depth: number;
  loam: boolean;
}

export class Session {
  /** Starts at the player's default speed (the settings screen). */
  speed: number = loadSettings().defaultSpeed;
  paused = false;
  placing: string | null = null;
  hover: { col: number; row: number } | null = null;
  selected: number | null = null;
  shift = false;
  private legalKey = '';
  private legalMask: Uint8Array | null = null;

  constructor(public state: BattleState, public content: Content) {}

  issue(body: CommandBody): Command {
    return queueCommand(this.state, { ...body, tick: nextCommandTick(this.state), side: 'player' } as Parameters<typeof queueCommand>[1]);
  }

  /**
   * Begin (Enter, Space or the Begin button in deploy). The battle always starts running: a pause
   * from deploy (`?paused=1`, or a key pressed there) never carries into the live battle.
   */
  begin(): boolean {
    if (this.state.phase !== 'deploy' || this.state.queue.some((c) => c.type === 'begin')) return false;
    this.issue({ type: 'begin' });
    this.paused = false;
    return true;
  }

  /** Player commands queued but not yet executed (shown as pending while paused). */
  pending(): Command[] {
    return this.state.queue.filter((c) => c.side === 'player');
  }

  /** A building's merge toggle as it will be once pending commands run (so double presses while paused flip back). */
  mergeShown(id: number): boolean {
    let on = this.state.buildings.find((b) => b.id === id)?.mergeOn ?? true;
    for (const c of this.pending()) if (c.type === 'toggleMerge' && c.entityId === id) on = c.on;
    return on;
  }

  /** Flips the merge toggle on one of the player's spawners. */
  toggleMerge(id: number): boolean {
    const b = this.state.buildings.find((x) => x.id === id);
    if (!b || b.side !== 'player' || !this.state.compiled.player.buildings[b.buildingId]?.spawn || this.state.phase === 'ended') return false;
    this.issue({ type: 'toggleMerge', entityId: id, on: !this.mergeShown(id) });
    return true;
  }

  /** E1 Hold / Advance: whether a lane will be held once pending stance commands run. */
  stanceShown(lane: number): boolean {
    let hold = this.state.sides.player.stance?.[lane]?.hold ?? false;
    for (const c of this.pending()) if (c.type === 'stance' && c.lane === lane) hold = c.hold;
    return hold;
  }

  /** E1 Hold / Advance: true if the lane could hold right now (not on cooldown). */
  canHold(lane: number): boolean {
    const st = this.state.sides.player.stance?.[lane];
    return !!st && this.state.tick >= st.readyAt;
  }

  /** E1 Hold / Advance: flips one lane between Hold and Advance (a hold on cooldown is refused here, not in the log). */
  toggleStance(lane: number): boolean {
    if (!this.state.rules.stance || this.state.phase === 'ended') return false;
    const hold = !this.stanceShown(lane);
    if (hold && !this.canHold(lane)) return false;
    this.issue({ type: 'stance', lane, hold });
    return true;
  }

  /** E1 Hold / Advance: holds every lane that can hold, or, if every lane already holds, advances them all. */
  toggleAllStances(): void {
    const lanes = this.state.lanes.map((_, i) => i);
    const allHeld = lanes.every((i) => this.stanceShown(i));
    for (const i of lanes) if (this.stanceShown(i) === allHeld) this.toggleStance(i);
  }

  /** Gold left after pending placements execute. */
  available(): number {
    let g = this.state.sides.player.gold;
    for (const c of this.pending()) if (c.type === 'place') g -= priceAt(this.state, 'player', c.buildingId, c.col);
    return g;
  }

  /**
   * While placing: one byte per map tile (row-major), 1 where some legal spot for the building covers
   * it, ignoring gold (an illegal hover still says why). Recomputed only when the board changes.
   */
  legalTiles(): Uint8Array | null {
    const s = this.state;
    if (!this.placing || s.phase === 'ended') return null;
    const def = s.compiled.player.buildings[this.placing];
    if (!def) return null;
    const pending = this.pending().filter((c): c is Extract<Command, { type: 'place' }> => c.type === 'place');
    const key = `${this.placing}|${s.lanes.map((l) => `${l.pBorder},${l.eBorder}`).join(';')}|${pending.map((c) => `${c.col},${c.row}`).join(';')}|${s.buildings.map((b) => b.id).join(',')}`;
    if (key === this.legalKey) return this.legalMask;
    this.legalKey = key;
    const W = s.map.width;
    const mask = new Uint8Array(W * s.map.height);
    for (const p of legalPlacements(s, 'player', this.placing)) {
      const blocked = pending.some((c) => {
        const pd = s.compiled.player.buildings[c.buildingId]!;
        return c.col < p.col + def.w && p.col < c.col + pd.w && c.row < p.row + def.h && p.row < c.row + pd.h;
      });
      if (blocked) continue;
      for (let r = p.row; r < p.row + def.h; r++) for (let c = p.col; c < p.col + def.w; c++) mask[r * W + c] = 1;
    }
    this.legalMask = mask;
    return mask;
  }

  ghost(): GhostInfo | null {
    if (!this.placing || !this.hover || this.state.phase === 'ended') return null;
    const s = this.state;
    const def = s.compiled.player.buildings[this.placing];
    if (!def) return null;
    // the cursor sits on the footprint's centre, snapped to the grid
    const col = Math.min(Math.max(0, this.hover.col - Math.floor((def.w - 1) / 2)), s.map.width - def.w);
    const row = Math.min(Math.max(0, this.hover.row - Math.floor((def.h - 1) / 2)), s.map.height - def.h);
    const lane = laneOfRow(s, row);
    let reason = lane < 0 ? 'not inside a lane' : placementProblem(s, 'player', this.placing, lane, col, row);
    // also refuse overlaps with pending placements
    if (!reason) {
      for (const c of this.pending()) {
        if (c.type !== 'place') continue;
        const pd = s.compiled.player.buildings[c.buildingId]!;
        if (c.col < col + def.w && col < c.col + pd.w && c.row < row + def.h && row < c.row + pd.h) reason = 'occupied (pending)';
      }
    }
    const price = priceAt(s, 'player', this.placing, col);
    if (!reason && price > this.available()) reason = 'not enough gold';
    return {
      buildingId: this.placing, col, row, lane, legal: !reason, reason, price,
      depth: Math.max(0, depthOf(s, 'player', col, def.w)), loam: footprintOnLoam(s, col, row, def.w, def.h),
    };
  }

  placeAtGhost(): boolean {
    const g = this.ghost();
    if (!g || !g.legal) return false;
    this.issue({ type: 'place', buildingId: g.buildingId, lane: g.lane, col: g.col, row: g.row });
    if (!this.shift) this.placing = null;
    return true;
  }
}
