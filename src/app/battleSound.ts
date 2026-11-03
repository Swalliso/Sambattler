// Battle sounds (SPEC §13.9): each step's sim events become sounds, render-side only, the way callouts and coin
// pops are, so the sim and its hashes never see them. The player's side plays louder than the enemy's, and
// sounds pan with where they happen on the field. By phase: in planning a building planted, sold or refused,
// the player's income as the phase opens, the general's plan landing (with the counter's own sound when it
// brings one), the Sporestorm's escalation and the draft; in a clash Begin, the armies' arrival, knits, merges,
// the commander power and each lane won or lost; in the aftermath each damaged Heartcap's hit, timed to the
// band's drain rather than to the sim's event, then the battle's win or loss.
import type { PlayOptions } from '../audio/engine.ts';
import { AFTERMATH_MS } from '../render/aftermath.ts';
import type { BattleState, Side } from '../sim/rounds/index.ts';
import { DRAIN_FROM } from '../ui/hud/top.ts';

/** How far left or right a sound can sit (1 would be hard left or right). */
const PAN_WIDTH = 0.6;
/** When the aftermath's drain starts in the top band, into the aftermath at the clash's speed: the Heartcap hits land then. */
export const HIT_AT_MS = DRAIN_FROM * AFTERMATH_MS;

export class BattleSound {
  /** The Heartcaps the last clash damaged, heard once the aftermath's drain begins. */
  private hits: Side[] = [];

  constructor(private enemyGain: number, private play: (id: string, opts?: PlayOptions) => void) {}

  /** Pan for a world x (tile columns; the Heartcap strips sit at −2 and width + 2). */
  private pan(state: BattleState, x: number): number {
    const w = state.map.width;
    return Math.max(-1, Math.min(1, ((x + 2) / (w + 4)) * 2 - 1)) * PAN_WIDTH;
  }

  private side(id: string, side: Side, pan: number): void {
    this.play(id, side === 'player' ? { pan } : { pan, gain: this.enemyGain });
  }

  onTick(state: BattleState): void {
    for (const e of state.events) {
      switch (e.t) {
        case 'buildingPlanted': {
          const b = state.buildings.find((x) => x.id === e.id);
          const plot = b && state.sides[b.side].plots[b.plot];
          if (b && plot) this.side('place', b.side, this.pan(state, plot.col + 1));
          break;
        }
        case 'buildingSold':
          this.side('sell', e.side, 0);
          break;
        case 'commandRejected':
          if (e.side === 'player') this.play('illegal');
          break;
        case 'income':
          if (e.side === 'player') this.play('income');
          break;
        case 'generalPlanned':
          this.play(e.counter ? 'counter' : 'plan', { gain: this.enemyGain });
          break;
        case 'roundStarted':
          // the round escalation, from the storm's first round (§6.4)
          if (e.stormBp > 10000) this.play('sporestorm');
          break;
        case 'draftOpen':
          if (e.side === 'player' && humanDrafts(state)) this.play('draft-open');
          break;
        case 'drafted':
          if (e.side === 'player' && humanDrafts(state)) this.play(e.skipped ? 'ui-click' : 'draft-pick');
          break;
        case 'clashStarted':
          this.play('begin');
          break;
        case 'arrived': {
          // a frequent sound: two whole armies arriving make one swell (its cooldown), not a puff a squad
          const u = state.units.find((x) => x.id === e.ids[0]);
          this.side('arrive', e.side, u ? this.pan(state, u.x) : 0);
          break;
        }
        case 'knitStart':
          this.side('knit', e.side, this.pan(state, e.x));
          break;
        case 'merged':
          this.side(e.tier === 3 ? 'merge-elder' : 'merge', e.side, this.pan(state, e.x));
          break;
        case 'power':
          // the commander power: an Elder bloom for Puppet Bloom's knits, a crash for Spore Burst
          this.side(e.merges ? 'merge-elder' : 'power', e.side, e.x === undefined ? 0 : this.pan(state, e.x));
          break;
        case 'laneWon':
          if (e.winner) this.play(e.winner === 'player' ? 'lane-won' : 'lane-lost');
          break;
        case 'heartcapDamaged':
          if (e.amount > 0) this.hits.push(e.side);
          break;
        case 'battleEnded':
          this.play(e.winner === 'player' ? 'win' : 'loss');
          break;
      }
    }
  }

  /**
   * Per frame, with the time into the aftermath at the clash's speed: each damaged Heartcap's hit as the drain
   * begins, at most once every 1.5 s per Heartcap (its sound's cooldown, keyed by side).
   */
  frame(state: BattleState, aftermathMs: number): void {
    if (state.phase !== 'aftermath' || aftermathMs < HIT_AT_MS || !this.hits.length) return;
    for (const side of this.hits) {
      if (side === 'player') this.play('heartcap-hit', { key: 'heartcap-hit:player', pan: -PAN_WIDTH });
      else this.play('heartcap-hit', { key: 'heartcap-hit:enemy', pan: PAN_WIDTH, gain: this.enemyGain });
    }
    this.hits = [];
  }
}

/** The draft overlay shows for the player (see DraftOverlay.update). */
function humanDrafts(state: BattleState): boolean {
  return state.config.player.controller.kind === 'human' || state.config.player.autoDraft === 'none';
}
