// Battle sounds (SPEC §13.9): each tick's sim events become sounds, render-side only, the way
// callouts and coin pops are, so the sim and its hashes never see them. The player's side plays
// louder than the enemy's, and sounds pan with where they happen on the field.
import { HEARTCAP_ID } from '../sim/index.ts';
import type { BattleState, Side } from '../sim/index.ts';
import type { PlayOptions } from '../audio/engine.ts';

/** How far left or right a sound can sit (1 would be hard left or right). */
const PAN_WIDTH = 0.6;

export class BattleSound {
  private sold: number;

  constructor(state: BattleState, private enemyGain: number, private play: (id: string, opts?: PlayOptions) => void) {
    this.sold = state.stats.player.buildingsSold;
  }

  /** Pan for a world x (tile columns; the Heartcap strips sit at −2 and width + 2). */
  private pan(state: BattleState, x: number): number {
    const w = state.map.width;
    return Math.max(-1, Math.min(1, ((x + 2) / (w + 4)) * 2 - 1)) * PAN_WIDTH;
  }

  private side(id: string, side: Side, pan: number): void {
    this.play(id, side === 'player' ? { pan } : { pan, gain: this.enemyGain });
  }

  onTick(state: BattleState): void {
    // a sale's event doesn't say whose it was; the player's sold count does
    let playerSales = state.stats.player.buildingsSold - this.sold;
    this.sold = state.stats.player.buildingsSold;
    for (const e of state.events) {
      switch (e.t) {
        case 'buildingPlaced': {
          const b = state.buildings.find((x) => x.id === e.id);
          if (b) this.side('place', b.side, this.pan(state, b.col + 1));
          break;
        }
        case 'buildingSold':
          this.side('sell', playerSales-- > 0 ? 'player' : 'enemy', 0);
          break;
        case 'commandRejected':
          if (e.side === 'player') this.play('illegal');
          break;
        case 'spawned': {
          const u = state.units.find((x) => x.id === e.id);
          if (u) this.side('spawn', u.side, this.pan(state, u.x));
          break;
        }
        case 'income':
          if (e.side === 'player') this.play('income');
          break;
        case 'columnFlipped':
          this.play(e.to === 'player' ? 'column-gained' : 'column-lost', { pan: this.pan(state, e.column + 0.5) });
          break;
        case 'buildingDestroyed':
          this.play(e.side === 'player' ? 'building-lost' : 'building-razed', { pan: this.pan(state, e.col + 1) });
          break;
        case 'knitStart':
          this.side('knit', e.side, this.pan(state, e.x));
          break;
        case 'merged':
          this.side(e.tier === 3 ? 'merge-elder' : 'merge', e.side, this.pan(state, e.x));
          break;
        case 'hit':
          // only Heartcaps make hit sounds, each at most every 1.5 s
          if (e.target === HEARTCAP_ID.player) this.play('heartcap-hit', { key: 'heartcap-hit:player', pan: -PAN_WIDTH });
          else if (e.target === HEARTCAP_ID.enemy) this.play('heartcap-hit', { key: 'heartcap-hit:enemy', pan: PAN_WIDTH, gain: this.enemyGain });
          break;
        case 'counterWarned':
          if (e.side === 'enemy') this.play('counter-warn');
          break;
        case 'counterActive':
          if (e.side === 'enemy') this.play('counter-active');
          break;
        case 'sporestorm':
          this.play('sporestorm');
          break;
        case 'wave':
          if (e.n > 1) this.play('wave'); // wave 1 arrives with Begin
          break;
        case 'draftOpen':
          if (e.side === 'player' && humanDrafts(state)) this.play('draft-open');
          break;
        case 'drafted':
          if (e.side === 'player' && humanDrafts(state)) this.play(e.skipped ? 'ui-click' : 'draft-pick');
          break;
        case 'begin':
          this.play('begin');
          break;
        case 'ended':
          this.play(e.winner === 'player' ? 'win' : 'loss');
          break;
      }
    }
  }
}

/** The draft overlay shows for the player (see DraftOverlay.update). */
function humanDrafts(state: BattleState): boolean {
  return state.config.player.controller.kind === 'human' || state.config.player.autoDraft === 'none';
}
