// The run controller (SPEC §8): shows the current run screen, plays each battle in a BattleView,
// applies results through the pure run layer, and autosaves at every node boundary. Battles in
// progress are saved at each wave boundary and when the tab is hidden, then resumed by replaying
// their command log (SPEC §8.9).
import type { Atlas } from '../render/atlas.ts';
import {
  chooseNode, clearBattle, clearRun, createRun, eventChoose, finishBattle, groveChoose, loadBattle, promptAnswer, recoverPendingChoice, resumeBattle,
  saveBattle, saveRun, spoilsPick, spoilsReroll,
} from '../run/index.ts';
import type { RunState, Storage } from '../run/index.ts';
import { createBattle, queueCommand, runHeadless } from '../sim/index.ts';
import type { BattleState, Content } from '../sim/index.ts';
import { eventScreen, groveScreen, promptScreen, routeScreen, spoilsScreen, summaryScreen } from '../ui/screens/run.ts';
import { h } from '../ui/h.ts';
import { BattleView } from './battleView.ts';
import { storageKey } from './channel.ts';
import { bindInput } from './input.ts';
import { GameLoop } from './loop.ts';
import { Session } from './session.ts';

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
  newSeed: () => number;
}

interface LiveBattle { state: BattleState; view: BattleView; loop: GameLoop; unbind: () => void }

export class RunController {
  private battle: LiveBattle | null = null;
  private rewardRecoveryNotice: string | null = null;
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

  private stopBattle(): void {
    if (!this.battle) return;
    this.battle.loop.stop();
    this.battle.unbind();
    this.battle.view.dispose();
    this.battle = null;
  }

  show(): void {
    this.stopBattle();
    document.querySelectorAll('.overlay').forEach((o) => o.remove());
    const { content, atlas } = this.env;
    const run = this.run;
    const app = document.getElementById('app')!;
    const s = run.screen;
    let el: HTMLElement | null = null;
    switch (s.kind) {
      case 'route':
        el = routeScreen(content, atlas, run, { choose: (i) => this.act(() => chooseNode(content, run, i)), abandon: () => this.abandon() });
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
      case 'event':
        el = eventScreen(content, atlas, run, { choose: (i) => this.act(() => eventChoose(content, run, i)) });
        break;
      case 'grove':
        el = groveScreen(content, atlas, run, { choose: (c) => this.act(() => groveChoose(content, run, c)) });
        break;
      case 'prompt':
        el = promptScreen(content, atlas, run, { answer: (o) => this.act(() => promptAnswer(content, run, o)) });
        break;
      case 'summary':
        el = summaryScreen(content, atlas, run, { newRun: () => this.newRun() });
        break;
    }
    if (el) {
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
    const begin = () => { if (state.phase === 'deploy' && !state.queue.some((c) => c.type === 'begin')) session.issue({ type: 'begin' }); };
    const view = new BattleView(session, content, atlas, { begin, again: () => {}, rematch: () => {}, continueRun: () => this.finish() }, this.env.debug);
    if (recoveryNotice) {
      view.root.querySelector('#begin-box')!.prepend(h('div', { class: 'hint', id: 'save-recovery', role: 'status' },
        'The saved battle could not be restored. This battle restarted from deployment; your run progress is preserved.'));
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

  /** The report's Continue: applies the battle to the run. */
  private finish(): void {
    const state = this.battle?.state;
    if (!state?.outcome) return;
    if (this.env.persist) clearBattle(this.env.storage);
    this.act(() => finishBattle(this.env.content, this.run, state));
  }

  private abandon(): void {
    if (!window.confirm('Abandon this run? It cannot be resumed.')) return;
    this.newRun();
  }

  newRun(): void {
    if (this.env.persist) clearRun(this.env.storage);
    this.run = createRun(this.env.content, { seed: this.env.newSeed() });
    this.save();
    this.show();
  }
}
