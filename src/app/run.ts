// The run controller (SPEC §8): shows the current run screen, plays each battle in a BattleView,
// applies results through the pure run layer, and autosaves at every node boundary. Battles in
// progress are saved at each wave boundary and when the tab is hidden, then resumed by replaying
// their command log (SPEC §8.9).
import type { Atlas } from '../render/atlas.ts';
import {
  battleRewards, chooseNode, clearBattle, clearRun, createRun, currentRow, eventChoose, finishBattle, groveChoose, loadBattle, promptAnswer,
  recoverPendingChoice, resumeBattle, saveBattle, saveRun, spoilsPick, spoilsReroll,
} from '../run/index.ts';
import type { RunState, Storage } from '../run/index.ts';
import type { RunEffect } from '../data/schema.ts';
import { createBattle, queueCommand, runHeadless } from '../sim/index.ts';
import type { BattleState, Content } from '../sim/index.ts';
import {
  eventResultScreen, eventScreen, groveScreen, promptScreen, routeScreen, runChanges, runSnapshot, spoilsScreen, summaryScreen,
} from '../ui/screens/run.ts';
import type { RunChange, RunSnapshot } from '../ui/screens/run.ts';
import { h } from '../ui/h.ts';
import { sporeWipe } from '../ui/motion.ts';
import { closeSettings, openSettings, settingsButton } from '../ui/settingsScreen.ts';
import { sporeLayer } from '../render/spores.ts';
import type { ReportRewards } from '../ui/report.ts';
import { BattleView } from './battleView.ts';
import { storageKey } from './channel.ts';
import { bindInput } from './input.ts';
import { GameLoop } from './loop.ts';
import { Session } from './session.ts';
import { settingsStore } from './settings.ts';
import { soundPrefs, soundToggle } from './sound.ts';

/**
 * localStorage behind the run layer's Storage interface (failures, e.g. private mode, are ignored),
 * under this site's keys so the dev site and the main site keep separate saves.
 */
export class BrowserStorage implements Storage {
  get(key: string): string | null { try { return localStorage.getItem(storageKey(key)); } catch { return null; } }
  set(key: string, value: string): void { try { localStorage.setItem(storageKey(key), value); } catch { /* storage full or blocked */ } }
  remove(key: string): void { try { localStorage.removeItem(storageKey(key)); } catch { /* blocked */ } }
}

export interface RunEnv {
  content: Content;
  atlas: Atlas;
  storage: Storage;
  /** False for seeded and test runs: nothing is written to storage. */
  persist: boolean;
  debug: boolean;
  /** Ambient motion holds still (`?test=1`), so screenshots and browser tests are stable. */
  still: boolean;
  newSeed: () => number;
  /** Back to the title screen, when the run was opened from it. */
  toTitle?: () => void;
  /** Run setup (the Underroot) for a new run; without it, a new run starts with the default commander. */
  setup?: () => void;
}

interface LiveBattle { state: BattleState; view: BattleView; loop: GameLoop; unbind: () => void }

/** An outcome the run rolls for you: a random relic, a random upgrade track, or relics for a sacrifice. */
const isRandom = (e: RunEffect): boolean => 'gainRelic' in e || 'sacrificeRelic' in e || ('upgrade' in e && e.upgrade.pick === 'random');

/** An event in progress, from its choice through any prompts: the run before it, and whether chance had a say. */
interface EventTrail { before: RunSnapshot; event: string | null; title: string; choice: string | null; random: boolean }

export class RunController {
  private battle: LiveBattle | null = null;
  private rewardRecoveryNotice: string | null = null;
  private trail: EventTrail | null = null;
  /** What a random event outcome gave, shown before the route (UI only: the run is already saved at the route). */
  private result: { event: string | null; title: string; choice: string | null; changes: RunChange[] } | null = null;
  /** `?ticks=` fast-forwards the first battle this page starts (screenshots, testing), then is spent. */
  pendingTicks: number | 'end' | null = null;
  private onHidden = () => { if (document.hidden && this.battle) this.saveBattle(this.battle.state); };
  onFrame: (() => void) | null = null;

  constructor(private env: RunEnv, public run: RunState) {
    this.rewardRecoveryNotice = recoverPendingChoice(env.content, run);
    if (this.rewardRecoveryNotice) this.save();
    document.addEventListener('visibilitychange', this.onHidden);
  }

  /** The battle on screen, if any (for the debug bridge). */
  get battleState(): BattleState | null { return this.battle?.state ?? null; }

  private save(): void { if (this.env.persist) saveRun(this.env.storage, this.run); }
  private saveBattle(state: BattleState): void { if (this.env.persist && state.phase === 'live') saveBattle(this.env.storage, state); }

  /** Applies one decision, autosaves and redraws. */
  private act(f: () => void): void {
    f();
    this.rewardRecoveryNotice = null;
    this.save();
    this.show();
  }

  /**
   * An event choice or prompt answer. The run is compared before and after (UI only, src/run is untouched);
   * once the event settles and chance had a say, the result screen says what you got (playtest round 3).
   */
  private actEvent(f: () => void, trail: EventTrail): void {
    const run = this.run;
    this.act(() => {
      // a prompt's answer may be the random part (a sacrifice), or lead to one still pending
      trail.random ||= run.pending.some(isRandom);
      f();
      trail.random ||= run.pending.some(isRandom);
      this.trail = trail;
      if (run.screen.kind === 'event' || run.screen.kind === 'prompt') return;
      this.trail = null;
      if (trail.random) this.result = { event: trail.event, title: trail.title, choice: trail.choice, changes: runChanges(this.env.content, trail.before, runSnapshot(run)) };
    });
  }

  /** Leaves the run's screens (to the title or the Underroot): stops any battle and the hidden-tab save. */
  stop(): void {
    this.stopBattle();
    document.removeEventListener('visibilitychange', this.onHidden);
  }

  private stopBattle(): void {
    if (!this.battle) return;
    this.battle.loop.stop();
    this.battle.unbind();
    this.battle.view.dispose();
    this.battle = null;
  }

  /** Shows the run's current screen behind a spore wipe (src/ui/motion.ts). */
  show(): void {
    sporeWipe(() => this.render());
  }

  private render(): void {
    this.stopBattle();
    closeSettings();
    document.querySelectorAll('.overlay').forEach((o) => o.remove());
    const { content, atlas } = this.env;
    const run = this.run;
    const app = document.getElementById('app')!;
    const s = run.screen;
    let el: HTMLElement | null = null;
    switch (this.result && s.kind === 'route' ? 'result' : s.kind) {
      case 'result':
        el = eventResultScreen(content, atlas, run, this.result!, () => { this.result = null; this.show(); });
        break;
      case 'route':
        el = routeScreen(content, atlas, run, {
          choose: (i) => this.act(() => chooseNode(content, run, i)), abandon: () => this.abandon(),
          ...(this.env.toTitle ? { toTitle: this.env.toTitle } : {}),
        });
        break;
      case 'battle': {
        const ticks = this.pendingTicks;
        this.pendingTicks = null;
        this.startBattle(ticks);
        break;
      }
      case 'spoils':
        el = spoilsScreen(content, atlas, run, {
          pick: (card) => this.act(() => spoilsPick(content, run, card)),
          reroll: () => this.act(() => spoilsReroll(content, run)),
        });
        break;
      case 'event': {
        const ev = content.events[(s as Extract<typeof s, { kind: 'event' }>).event]!;
        el = eventScreen(content, atlas, run, {
          // a choice that rolls for you (Forage, Pry it loose) is random from the start
          choose: (i) => this.actEvent(() => eventChoose(content, run, i),
            { before: runSnapshot(run), event: ev.id, title: ev.title, choice: ev.choices[i]?.label ?? null, random: !!ev.choices[i]?.outcome.some(isRandom) }),
        });
        break;
      }
      case 'grove':
        el = groveScreen(content, atlas, run, { choose: (c) => this.act(() => groveChoose(content, run, c)) });
        break;
      case 'prompt':
        el = promptScreen(content, atlas, run, {
          // a prompt continues the event that opened it (or starts a trail after a reload mid-event)
          answer: (o) => this.actEvent(() => promptAnswer(content, run, o),
            this.trail ?? (() => {
              const title = (s as Extract<typeof s, { kind: 'prompt' }>).prompt.title;
              return { before: runSnapshot(run), event: content.eventOrder.find((id) => content.events[id]!.title === title) ?? null, title, choice: null, random: false };
            })()),
        });
        break;
      case 'summary':
        el = summaryScreen(content, atlas, run, { newRun: () => this.newRun(), ...(this.env.toTitle ? { toTitle: this.env.toTitle } : {}) });
        break;
    }
    if (el) {
      el.querySelector('.runbar')?.append(h('div', { class: 'rb-tools' }, soundToggle(atlas, 'down'),
        settingsButton(atlas, () => openSettings(content, atlas, settingsStore, soundPrefs, { onClose: () => {} }))));
      // spores drift behind every run screen, as on the title
      const sky = h('div', { class: 'run-sky', 'aria-hidden': 'true' });
      el.prepend(sky);
      requestAnimationFrame(() => sporeLayer(sky, { scale: 3, density: 1.2, still: this.env.still }));
      if (this.rewardRecoveryNotice) el.prepend(h('div', { class: 'hint', id: 'reward-recovery', role: 'status' }, this.rewardRecoveryNotice));
      app.replaceChildren(el);
      // run screens have no game loop: report readiness on the next frame
      requestAnimationFrame(() => this.onFrame?.());
    }
  }

  private startBattle(ticks: number | 'end' | null): void {
    if (this.run.screen.kind !== 'battle') return;
    const { content, atlas } = this.env;
    const config = this.run.screen.config;
    let resumed: BattleState | null = null;
    let recoveryNotice = false;
    const saved = this.env.persist ? loadBattle(this.env.storage) : null;
    if (saved && JSON.stringify(saved.config) === JSON.stringify(config)) {
      try { resumed = resumeBattle(content, saved); } catch (e) {
        console.warn(`could not resume the saved battle: ${(e as Error).message}`);
        clearBattle(this.env.storage);
        recoveryNotice = true;
      }
    }
    const state = resumed ?? createBattle(content, config);
    const session = new Session(state, content);
    const begin = () => { session.begin(); };
    const view = new BattleView(session, content, atlas, {
      begin, again: () => {}, rematch: () => {}, continueRun: () => this.finish(), rewards: (st) => this.rewardsOf(st),
    }, this.env.debug, this.env.still);
    if (recoveryNotice) {
      view.notice('save-recovery', 'The saved battle could not be restored. This battle restarted from deployment; your run progress is preserved.');
    }
    document.getElementById('app')!.replaceChildren(view.root);
    if (state.phase === 'deploy' && (config.player.controller.kind !== 'human' || ticks !== null)) {
      queueCommand(state, { tick: 0, side: 'player', type: 'begin' });
    }
    if (ticks !== null) runHeadless(state, { until: ticks, onTick: (st) => view.log.onTick(st) });
    view.fit();
    const loop = new GameLoop(session, view);
    loop.onStep = (st) => { if (st.events.some((e) => e.t === 'wave')) this.saveBattle(st); };
    loop.onFrame = () => this.onFrame?.();
    loop.debugOverlay = this.env.debug;
    const unbind = bindInput(session, view, { begin, toggleDebug: () => { if (this.env.debug) loop.debugOverlay = !loop.debugOverlay; } });
    this.battle = { state, view, loop, unbind };
    loop.start();
  }

  /** What the battle on screen earns the run beyond gold, for its report (the rewards table, SPEC §8.6). */
  private rewardsOf(state: BattleState): ReportRewards {
    const run = this.run;
    const row = currentRow(run) - 1;
    const node = run.route[row]?.[run.path[row]!];
    if (!node || !state.outcome) return { spores: 0, amber: 0, amberChance: 0 };
    const b = this.env.content.balance;
    const r = battleRewards(node.kind, state.outcome.winner, state.outcome.by, {
      routRepair: b.routRepair, decisionLossDamage: b.decisionLossDamage, rarityBiasStep: b.draft.rarityBiasStep, eliteRareBonus: b.draft.eliteRareBonus,
    });
    return { spores: r.spores, amber: r.amber, amberChance: r.amberChance };
  }

  /** The report's Continue: applies the battle to the run. */
  private finish(): void {
    const state = this.battle?.state;
    if (!state?.outcome) return;
    if (this.env.persist) clearBattle(this.env.storage);
    this.act(() => finishBattle(this.env.content, this.run, state));
  }

  private abandon(): void {
    if (!window.confirm('Abandon this run? It cannot be resumed.')) return;
    if (this.env.persist) clearRun(this.env.storage);
    this.newRun();
  }

  /** A new run: through the Underroot when there is one, else at once with the default commander. */
  newRun(): void {
    if (this.env.setup) { this.env.setup(); return; }
    this.start(createRun(this.env.content, { seed: this.env.newSeed() }));
  }

  /** Replaces any saved run with `run` (just set up in the Underroot), saves it and shows it. */
  start(run: RunState): void {
    if (this.env.persist) clearRun(this.env.storage);
    this.run = run;
    this.save();
    this.show();
  }
}
