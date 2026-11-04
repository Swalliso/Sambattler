// First-time tips in a battle in rounds (SPEC §10.2, R2b/T118; playtest round 3: "too much to learn, and the game
// doesn't explain itself"). In a run's first two battles (and single battles numbered 1 or 2), each tip shows once,
// ever, through the callout lane, one at a time, for 8 s: reading the general's army as round 1's planning opens,
// the formation at your first planting, the clash and the power at the first Begin, the aftermath at the first one,
// the first draft as it opens, the round escalation as the storm's first planning opens, and interest the first time
// it pays. The coach watches phase changes and planning events, never ticks. A tip counts as shown only once the lane
// has it on screen (A067): one that pinned callouts slice off isn't remembered. Which tips were shown is remembered
// (spore-sprawl/tips/v1, through storageKey()); the settings screen turns tips off or shows them all again. Tips whose
// meaning changed in rounds have new ids, so v1's (frontier, hold, storm, interest, power) stay in old records and are
// ignored. Battle 1's economy tip (#33's first guess, which R2b's playtest judges) goes through the same queue but isn't
// remembered: if round 2's planning opens with no economy building planted, it names the first economy card and its
// hotkey, and the economy cards pulse for 12 s, or until one is chosen or planted. R4b rewords them all (§16).
import type { Content } from '../data/registry.ts';
import { powerOf } from '../sim/index.ts';
import type { BattleState } from '../sim/index.ts';
import { stormBpFor } from '../sim/systems/victory.ts';
import { trayOrder } from '../ui/buildingInfo.ts';
import { h } from '../ui/h.ts';
import { stormText } from '../ui/hud/explain.ts';
import { loadSettings, markTipShown, onSettings, tipsShown } from './settings.ts';

/** First-time tips stay up longer than a passing callout: they are a sentence to read. */
const TIP_MS = 8000;
/** How long battle 1's economy cards pulse once its tip shows (§10.2). */
export const PULSE_MS = 12000;
/** Tips show in a run's first two battles (and in single battles numbered 1 or 2). */
const LAST_BATTLE = 2;

export type TipId = 'army' | 'formation' | 'clash' | 'aftermath' | 'draft' | 'escalation' | 'roundInterest' | 'economy';

/** The callout lane, as the coach uses it: whether a tip is up, a tip to show, and whether a callout is on screen. */
export interface TipLane {
  live(kind: 'tip'): boolean;
  push(kind: 'tip', content: (string | Node)[], tone: '', now: number, life?: number): HTMLElement;
  showing(el: HTMLElement): boolean;
}

interface Pending { id: TipId; parts: (string | Node)[]; remember: boolean; onShow?: (now: number) => void }

const kbd = (k: string) => h('kbd', null, k);
/** The lilac word that heads every tip. */
export const tipWord = (): HTMLElement => h('b', { class: 'tip-word' }, 'Tip');

export class TipCoach {
  private queue: Pending[] = [];
  /** Shown, queued or ruled out this battle. */
  private done = new Set<TipId>();
  private shown: Set<string>;
  private enabled: boolean;
  private unsubscribe: () => void;
  /** The tip pushed into the lane, until it's on screen or its time is up. */
  private up: { tip: Pending; el: HTMLElement } | null = null;
  /** The round and phase last watched, so each phase's tips come as it opens. */
  private at = '';
  /** Battle 1's economy cards pulse until then (on the frame clock), or until one is chosen or planted. */
  private pulseUntil = 0;

  constructor(private lane: TipLane, private content: Content) {
    this.shown = tipsShown();
    this.enabled = loadSettings().tips;
    this.unsubscribe = onSettings((next) => {
      this.enabled = next.tips;
      if (!next.tips) this.queue = [];
      // "Show tips again" clears the record; a tip already shown this battle still waits for the next
      this.shown = tipsShown();
    });
  }

  dispose(): void { this.unsubscribe(); }

  /** Would this tip show now (tips on, an early battle, never shown)? */
  private wants(state: BattleState, id: TipId, remember = true): boolean {
    if (!this.enabled || this.done.has(id) || state.config.battleIndex > LAST_BATTLE) return false;
    return !remember || !this.shown.has(id);
  }

  /**
   * Queues a tip; it shows when the lane has no other tip. A tip about what is happening right now (a draft, a
   * phase that just opened, interest) goes ahead of the others.
   */
  offer(state: BattleState, id: TipId, parts: (string | Node)[], opts: { remember?: boolean; now?: boolean; onShow?: (now: number) => void } = {}): boolean {
    const remember = opts.remember ?? true;
    if (!this.wants(state, id, remember)) return false;
    this.done.add(id);
    const tip = { id, parts, remember, ...(opts.onShow ? { onShow: opts.onShow } : {}) };
    if (opts.now) this.queue.unshift(tip);
    else this.queue.push(tip);
    return true;
  }

  /** A phase opened, or the battle came on screen: the tips that come with it (§10.2). */
  watch(state: BattleState): void {
    const at = `${state.round}|${state.phase}`;
    if (at === this.at) return;
    this.at = at;
    const r = state.rules;
    if (state.phase === 'planning') {
      if (state.round === 1) this.offer(state, 'army', [tipWord(), 'The general has planned: its whole army stands on the right. Plan against what you see.']);
      const bp = stormBpFor(r.storm, state.round);
      if (bp > 10000) this.offer(state, 'escalation', [tipWord(), `The Sporestorm: a round now deals ${stormText(bp)} Heartcap damage, and more each round, up to ${stormText(r.storm.maxBp)}.`], { now: true });
      this.economy(state);
      // last, so it goes first: a draft opens with its round's planning, and it's on screen now
      const draft = state.sides.player.draft;
      if (draft) {
        // a key for each card on offer (a bigger draft, `draft.cards`, deals more)
        const last = Math.min(9, draft.offer.length);
        this.offer(state, 'draft', [tipWord(), 'Pick with ', kbd('1'), ...(last > 1 ? ['–', kbd(String(last))] : []), ': blueprints add buildings, upgrades improve them, relics last the run.'], { now: true });
      }
    } else if (state.phase === 'clash') {
      const power = powerOf(state, 'player');
      const name = power && Object.values(this.content.commanders).find((c) => c.power.id === power.id)?.power.name;
      this.offer(state, 'clash', [tipWord(), 'The clash: both armies fight. ', kbd('Space'), ' pauses', ...(name ? ['; ', kbd('Q'), ` aims ${name}, once a clash`] : []), '.'], { now: true });
    } else if (state.phase === 'aftermath') {
      this.offer(state, 'aftermath', [tipWord(), `The aftermath: a lane's winner deals ${r.heartcapDamagePerSupply} Heartcap damage per supply it has left.`], { now: true });
    }
  }

  /** Per sim step: the planning events' tips, then the tips of a phase the step opened, which go first. */
  onTick(state: BattleState): void {
    for (const e of state.events) {
      if (e.t === 'interest' && e.side === 'player' && e.amount > 0) {
        this.offer(state, 'roundInterest', [tipWord(), `Interest +${e.amount}: each round pays 1 gold per ${state.rules.interestPer} you held at Begin, up to a cap. Hover your gold.`], { now: true });
      } else if (e.t === 'buildingPlanted' && state.buildings.find((b) => b.id === e.id)?.side === 'player') {
        this.offer(state, 'formation', [tipWord(), 'Your squads stand in the rank and file of their plots: rank 1 is the front line.']);
      }
    }
    this.watch(state);
  }

  /**
   * Battle 1's economy tip (#33's first guess, §10.2): round 2's planning opens with no economy building planted.
   * It names the first economy card in the tray with its hotkey, and isn't remembered.
   */
  private economy(state: BattleState): void {
    if (state.config.battleIndex !== 1 || state.round !== 2) return;
    const cs = state.compiled.player;
    const eco = (id: string) => cs.buildings[id]?.kind === 'economy';
    if (state.buildings.some((b) => b.side === 'player' && eco(b.buildingId))) return;
    const order = trayOrder(this.content, state.sides.player.kit.map((k) => k.building));
    const i = order.findIndex(eco);
    if (i < 0) return;
    const id = order[i]!;
    this.offer(state, 'economy', [tipWord(), `A ${this.content.buildings[id]!.name} `, ...(i < 9 ? [kbd(String(i + 1)), ' '] : []), `earns +${cs.buildings[id]!.economy?.goldPerRound ?? 0} gold every round, all battle. Plant one early!`],
      { remember: false, onShow: (now) => { this.pulseUntil = now + PULSE_MS; } });
  }

  /** Whether battle 1's economy cards pulse now (§10.2): for 12 s after the economy tip shows, until one is chosen or planted. */
  pulsing(state: BattleState, placing: string | null, now: number): boolean {
    if (now >= this.pulseUntil) return false;
    const eco = (id: string | null) => id !== null && state.compiled.player.buildings[id]?.kind === 'economy';
    if (eco(placing) || state.buildings.some((b) => b.side === 'player' && eco(b.buildingId))) this.pulseUntil = 0;
    return now < this.pulseUntil;
  }

  /** Per frame: shows the next tip once the lane has no tip up, and remembers a tip once it's on screen (A067). */
  frame(now: number): void {
    const up = this.up;
    if (up) {
      if (this.lane.showing(up.el)) {
        this.up = null;
        this.seen(up.tip, now);
      } else if (!this.lane.live('tip')) this.up = null; // its time ran out off screen: not remembered
      else return;
    }
    if (!this.queue.length || this.lane.live('tip')) return;
    const next = this.queue.shift()!;
    // the "Tip" word, then the sentence as one run of text, so its keycaps sit inline
    const [word, ...rest] = next.parts;
    const el = this.lane.push('tip', [word!, h('span', null, ...rest)], '', now, TIP_MS);
    if (this.lane.showing(el)) this.seen(next, now);
    else this.up = { tip: next, el };
  }

  private seen(tip: Pending, now: number): void {
    if (tip.remember) {
      markTipShown(tip.id);
      this.shown.add(tip.id);
    }
    tip.onShow?.(now);
  }
}
