// One battle being played in the browser: the sim state plus UI-only state (speed, pause, selection,
// placement). Player input becomes ordinary tick-stamped commands (SPEC §13.5).
import type { Content } from '../data/registry.ts';
import {
  footprintOnLoam, nextCommandTick, placementProblem, priceAt, depthOf, queueCommand,
} from '../sim/index.ts';
import type { BattleState, Command, CommandBody } from '../sim/index.ts';
import { laneOfRow } from '../sim/world.ts';

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
  speed = 1;
  paused = false;
  placing: string | null = null;
  hover: { col: number; row: number } | null = null;
  selected: number | null = null;
  shift = false;

  constructor(public state: BattleState, public content: Content) {}

  issue(body: CommandBody): Command {
    return queueCommand(this.state, { ...body, tick: nextCommandTick(this.state), side: 'player' } as Parameters<typeof queueCommand>[1]);
  }

  /** Player commands queued but not yet executed (shown as pending while paused). */
  pending(): Command[] {
    return this.state.queue.filter((c) => c.side === 'player');
  }

  /** Gold left after pending placements execute. */
  available(): number {
    let g = this.state.sides.player.gold;
    for (const c of this.pending()) if (c.type === 'place') g -= priceAt(this.state, 'player', c.buildingId, c.col);
    return g;
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
