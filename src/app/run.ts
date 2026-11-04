// The run controller (SPEC §8): shows the current run screen, plays each battle in rounds on the battle
// scene (`openRoundBattle`), with the run's lives under your Heartcap, applies results through the pure run
// layer, and autosaves at every node boundary. A battle saves between rounds (§8.9, T096): at each planning
// phase, at Begin and when your power fires, and a reload resumes it there, or restarts it at round 1's
// planning with a notice when its save can't be rebuilt. Its end is the run's node boundary, saved before its
// report, so a reload on the report opens the next screen (R2-Q22, T097). One play clock times the run's
// battles for the summary (§8.2, T109).
import type { Atlas } from '../render/atlas.ts';
import type { DrawnPreview } from '../render/preview.ts';
import { runItBackSetup, setLastSetup, updateRecords } from '../meta/index.ts';
import {
  BATTLE_KEY, battleSave, chooseNode, clearBattle, clearRun, createRun, eventChoose, finishBattle, groveChoose, powerSave, promptAnswer,
  recoverPendingChoice, resumeBattle, saveBattle, saveRun, spoilsPick, spoilsReroll,
} from '../run/index.ts';
import type { RunState, Storage } from '../run/index.ts';
import type { RunEffect } from '../data/schema.ts';
import type { Content } from '../sim/index.ts';
import { createBattle } from '../sim/index.ts';
import type { BattleState, Side } from '../sim/index.ts';
import {
  eventResultScreen, eventScreen, groveScreen, promptScreen, routeScreen, runChanges, runSnapshot, spoilsScreen, summaryScreen,
} from '../ui/screens/run.ts';
import type { RunChange, RunSnapshot } from '../ui/screens/run.ts';
import { h } from '../ui/h.ts';
import { sporeWipe } from '../ui/motion.ts';
import { closeSettings, openSettings, settingsButton } from '../ui/settingsScreen.ts';
import { sporeLayer } from '../render/spores.ts';
import { storageKey } from './channel.ts';
import { openRoundBattle } from './loop.ts';
import type { RoundBattle } from './loop.ts';
import { PlayClock, readoutOf } from './playTime.ts';
import { resultNotice, runLinesOf } from '../ui/report.ts';
import type { PlayTimeReadout, RunLines } from '../ui/report.ts';
import { settingsStore } from './settings.ts';
import { soundPrefs, soundToggle } from './sound.ts';

/**
 * localStorage behind the run layer's Storage interface (failures, e.g. private mode, are ignored),
 * under this site's keys so the dev site and the main site keep separate saves. `space` keeps a
 * prototype run's keys apart (`protoSpace`); the real save has none.
 */
export class BrowserStorage implements Storage {
  constructor(private space = '') {}
  get(key: string): string | null { try { return localStorage.getItem(storageKey(this.space + key)); } catch { return null; } }
  set(key: string, value: string): void { try { localStorage.setItem(storageKey(this.space + key), value); } catch { /* storage full or blocked */ } }
  remove(key: string): void { try { localStorage.removeItem(storageKey(this.space + key)); } catch { /* blocked */ } }
}

export interface RunEnv {
  content: Content;
  atlas: Atlas;
  storage: Storage;
  /** False for seeded and test runs: nothing is written to storage. */
  persist: boolean;
  /** Where the profile is kept (SPEC §9.7): normal play only. Null for seeded, test and prototype runs, which write no records (RB-Q2). */
  records: Storage | null;
  debug: boolean;
  /** Ambient motion holds still (`?test=1`), so screenshots and browser tests are stable. */
  still: boolean;
  newSeed: () => number;
  /** Back to the title screen, when the run was opened from it. */
  toTitle?: () => void;
  /** Run setup (the Underroot) for a new run; without it, a new run starts with the default commander. */
  setup?: () => void;
  /**
   * The first battle's state at the checkpoint `scene=run` names (`round=`, `phase=`; T157), held there as a
   * single battle is: `hold` for `phase=planning` or `paused=1`, and `holdAftermath` under `?test=1`.
   */
  opening?: { state: BattleState; hold: boolean; holdAftermath: boolean };
}

/** Why a battle opened at round 1's planning though a save was found (§8.9, #32). */
export const RESTART_NOTICE = 'The saved battle could not be restored. This battle restarted from round 1\'s planning; your run progress is preserved.';

/** An outcome the run rolls for you: a random relic, a random upgrade track, or relics for a sacrifice. */
const isRandom = (e: RunEffect): boolean => 'gainRelic' in e || 'sacrificeRelic' in e || ('upgrade' in e && e.upgrade.pick === 'random');

/** An event in progress, from its choice through any prompts: the run before it, and whether chance had a say. */
interface EventTrail { before: RunSnapshot; event: string | null; title: string; choice: string | null; random: boolean }

export class RunController {
  private battle: RoundBattle | null = null;
  /** The battle on screen saves between rounds: in normal play, but not at a checkpoint's capture (`scene=run&round=`). */
  private saves = false;
  /** The battle as its clash's Begin left it, for the save when your power fires (R2-Q22). */
  private begun: BattleState | null = null;
  /** The battle just ended, as its end recorded it in the run, for its report (T098). */
  private ended: RunLines | null = null;
  /** The tab's visibility listener while a battle is on screen, removed with it. */
  private unwatch: (() => void) | null = null;
  private rewardRecoveryNotice: string | null = null;
  /** A reload on a battle's report: the battle's result, on the next screen (R2-Q22). */
  private reportNotice: string | null = null;
  /** A migrated save's notice (§8.9, #32), shown on the run's first screen. */
  private runNotice: string | null = null;
  private trail: EventTrail | null = null;
  /** What a random event outcome gave, shown before the route (UI only: the run is already saved at the route). */
  private result: { event: string | null; title: string; choice: string | null; changes: RunChange[] } | null = null;
  /**
   * The run's play clock (§8.2, RB-Q3, T109): each battle feeds it its phases, and the summary reads its planning,
   * clash and aftermath seconds. It's never saved, so a reload restarts the count until records-2 adds `restore`.
   */
  private clock = new PlayClock(() => performance.now());
  private opening: RunEnv['opening'] | null;
  onFrame: (() => void) | null = null;

  /** @param notice a migrated save's notice, shown on the first screen (§8.9) */
  constructor(private env: RunEnv, public run: RunState, notice?: string) {
    this.opening = env.opening ?? null;
    this.runNotice = notice ?? null;
    this.rewardRecoveryNotice = recoverPendingChoice(env.content, run);
    if (this.rewardRecoveryNotice) this.save();
    // the run moved on as the battle ended, so its next screen says how it went (§8.9, R2-Q22)
    if (run.reportOpen) {
      const last = run.battles.at(-1);
      this.reportNotice = last ? resultNotice(last, run) : null;
      delete run.reportOpen;
      this.save();
    }
  }

  /** The battle on screen, if any (for the debug bridge). */
  get battleState(): BattleState | null { return this.battle?.state ?? null; }
  /** What the battle's formation preview last drew, for the bridge (T083), as a single battle's. */
  get preview(): Record<Side, DrawnPreview> | null { return this.battle?.view.renderer.preview.drawn ?? null; }

  /** The run's play time so far, as the summary shows it (T109). */
  playTime(): PlayTimeReadout { return readoutOf(this.clock); }

  private save(): void { if (this.env.persist) saveRun(this.env.storage, this.run); }

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

  /** Leaves the run's screens (to the title or the Underroot): stops any battle. */
  stop(): void {
    this.stopBattle();
  }

  private stopBattle(): void {
    this.battle?.stop();
    this.battle = null;
    this.unwatch?.();
    this.unwatch = null;
    this.begun = null;
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
      case 'battle':
        this.startBattle();
        break;
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
        el = summaryScreen(content, atlas, run, {
          newRun: () => this.newRun(), runItBack: () => this.runItBack(), ...(this.env.toTitle ? { toTitle: this.env.toTitle } : {}),
        }, this.playTime());
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
      if (this.reportNotice) el.prepend(h('div', { class: 'hint', id: 'report-recovery', role: 'status' }, this.reportNotice));
      if (this.runNotice) el.prepend(h('div', { class: 'hint', id: 'run-notice', role: 'status' }, this.runNotice));
      this.runNotice = null;
      this.reportNotice = null;
      app.replaceChildren(el);
      // run screens have no game loop: report readiness on the next frame
      requestAnimationFrame(() => this.onFrame?.());
    }
  }

  /**
   * The battle on R2a's battle scene (§10.2), where its save left it, else from round 1's planning, or the first
   * battle at `scene=run`'s checkpoint (T157): the general has planned, and a bot player plans and begins on its
   * own. Your lives show under your Heartcap (§8.5, T106), and the battle feeds the run's play clock (T109). A
   * battle save that can't be rebuilt, of an older build's among them, is replaced as the battle restarts at
   * round 1's planning, with the notice (§8.9, A089). A checkpoint's battle is a capture, and saves nothing.
   */
  private startBattle(): void {
    if (this.run.screen.kind !== 'battle') return;
    const { content, atlas, storage, persist } = this.env;
    const config = this.run.screen.config;
    const opening = this.opening;
    this.opening = null;
    const saved = persist ? storage.get(BATTLE_KEY) : null;
    const resumed = saved !== null && !opening ? resumeBattle(content, saved, config) : null;
    const restarted = saved !== null && !resumed;
    if (restarted) clearBattle(storage);
    const state = opening?.state ?? resumed ?? createBattle(content, config);
    this.saves = persist && !opening;
    this.ended = null;
    // a battle resumed at its clash's first tick is as Begin left it, for the power's save
    this.begun = state.phase === 'clash' ? structuredClone(state) : null;
    this.battle = openRoundBattle(content, atlas, state, {
      actions: { continueRun: () => this.finish(), runLines: () => this.ended },
      still: this.env.still, debug: this.env.debug, onFrame: () => this.onFrame?.(),
      lives: { ...this.run.lives }, runClock: this.clock, holdAftermath: opening?.holdAftermath ?? false,
      onStep: (st, was) => this.stepped(st, was),
    });
    // as a single battle's: planning held until input, and a pause never carries into a clash (plan Call 14)
    if (opening?.hold) {
      if (state.phase === 'planning') this.battle.session.hold = true;
      else this.battle.session.paused = true;
    }
    if (this.saves) {
      // round 1's planning, once the general has planned (§8.9); a resumed battle's save stands
      if (!resumed) this.saveBattle(state);
      // a save requested as the tab hides: the planning so far, or nothing new in a clash or an aftermath
      const hidden = () => { if (document.visibilityState === 'hidden') this.saveBattle(state); };
      document.addEventListener('visibilitychange', hidden);
      this.unwatch = () => document.removeEventListener('visibilitychange', hidden);
    }
    if (restarted) this.battle.view.notice('save-recovery', RESTART_NOTICE);
    if (this.runNotice) this.battle.view.notice('run-notice', this.runNotice);
    this.runNotice = null;
  }

  /** The battle's save at a save point (§8.9): none later in a clash or in an aftermath, so the latest stands. */
  private saveBattle(state: BattleState): void {
    const save = battleSave(state);
    if (save) saveBattle(this.env.storage, save);
  }

  /**
   * After each step of the battle (§8.9, T096, T097): a round's opening and each planning command save the planning
   * so far, Begin saves the clash's first tick, and your power saves as it runs, at its tick. The battle's end is
   * the run's node boundary.
   */
  private stepped(state: BattleState, was: BattleState['phase']): void {
    if (state.phase === 'ended') { this.battleEnded(state); return; }
    if (!this.saves) return;
    if (state.phase === 'planning') this.saveBattle(state);
    else if (state.phase === 'clash' && was === 'planning') {
      this.begun = structuredClone(state);
      this.saveBattle(state);
    } else if (state.phase === 'clash' && this.begun) {
      // this tick's commands are the log's last
      for (let i = state.log.length - 1; i >= 0 && state.log[i]!.tick === state.tick; i--) {
        const c = state.log[i]!;
        if (c.side === 'player' && c.type === 'power') saveBattle(this.env.storage, powerSave(this.begun, c));
      }
    }
  }

  /**
   * The battle's end, before its report (§8.9, A081, R2-Q22): the life, the Spores, the Amber roll and the spoils
   * dealt (`finishBattle`), the run saved and the battle's save cleared. The report reads the new BattleRecord.
   */
  private battleEnded(state: BattleState): void {
    const run = this.run;
    if (run.screen.kind !== 'battle' || !state.outcome) return;
    const plots = run.plotsGained;
    const record = finishBattle(this.env.content, run, state);
    this.ended = runLinesOf(record, run, plots);
    run.reportOpen = true;
    this.save();
    if (this.env.persist) clearBattle(this.env.storage);
  }

  /** The report's Continue: the run's next screen, which the battle's end has saved (T097). */
  private finish(): void {
    if (!this.ended) return;
    this.ended = null;
    this.act(() => { delete this.run.reportOpen; });
  }

  private abandon(): void {
    if (!window.confirm('Abandon this run? It cannot be resumed.')) return;
    if (this.env.persist) clearRun(this.env.storage);
    this.newRun();
  }

  /**
   * Run it back (SPEC §16 M6): the ended run's commander and bans on a new seed, straight on the route. Normal
   * play remembers the setup for the Underroot.
   */
  runItBack(): void {
    const setup = runItBackSetup(this.env.content, this.run);
    const run = createRun(this.env.content, { seed: this.env.newSeed(), ...setup });
    if (this.env.records) updateRecords(this.env.records, (rec) => setLastSetup(rec, setup));
    this.start(run);
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
