// The run controller (SPEC §8): shows the current run screen, plays each battle in rounds on the battle
// scene (`openRoundBattle`), applies results through the pure run layer, and autosaves at every node
// boundary. Until R2b's S8 saves a battle between rounds (T095, T096), a battle in progress isn't saved: a
// reload restarts it at round 1's planning, with a notice when an older battle save was found (SPEC §8.9).
import type { Atlas } from '../render/atlas.ts';
import { runItBackSetup, setLastSetup, updateRecords } from '../meta/index.ts';
import {
  BATTLE_KEY, battleRewards, chooseNode, clearBattle, clearRun, createRun, currentRow, eventChoose, finishBattle, groveChoose, promptAnswer,
  recoverPendingChoice, rewardRules, saveRun, spoilsPick, spoilsReroll,
} from '../run/index.ts';
import type { RunState, Storage } from '../run/index.ts';
import type { RunEffect } from '../data/schema.ts';
import type { Content } from '../sim/index.ts';
import { createBattle } from '../sim/rounds/index.ts';
import type { BattleState } from '../sim/rounds/index.ts';
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
}

/** Why a battle opened at round 1's planning though a save was found (§8.9, #32). */
export const RESTART_NOTICE = 'The saved battle could not be restored. This battle restarted from round 1\'s planning; your run progress is preserved.';

/** An outcome the run rolls for you: a random relic, a random upgrade track, or relics for a sacrifice. */
const isRandom = (e: RunEffect): boolean => 'gainRelic' in e || 'sacrificeRelic' in e || ('upgrade' in e && e.upgrade.pick === 'random');

/** An event in progress, from its choice through any prompts: the run before it, and whether chance had a say. */
interface EventTrail { before: RunSnapshot; event: string | null; title: string; choice: string | null; random: boolean }

export class RunController {
  private battle: RoundBattle | null = null;
  private rewardRecoveryNotice: string | null = null;
  /** A migrated save's notice (§8.9, #32), shown on the run's first screen. */
  private runNotice: string | null = null;
  private trail: EventTrail | null = null;
  /** What a random event outcome gave, shown before the route (UI only: the run is already saved at the route). */
  private result: { event: string | null; title: string; choice: string | null; changes: RunChange[] } | null = null;
  onFrame: (() => void) | null = null;

  /** @param notice a migrated save's notice, shown on the first screen (§8.9) */
  constructor(private env: RunEnv, public run: RunState, notice?: string) {
    this.runNotice = notice ?? null;
    this.rewardRecoveryNotice = recoverPendingChoice(env.content, run);
    if (this.rewardRecoveryNotice) this.save();
  }

  /** The battle on screen, if any (for the debug bridge). */
  get battleState(): BattleState | null { return this.battle?.state ?? null; }

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
        });
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
      if (this.runNotice) el.prepend(h('div', { class: 'hint', id: 'run-notice', role: 'status' }, this.runNotice));
      this.runNotice = null;
      app.replaceChildren(el);
      // run screens have no game loop: report readiness on the next frame
      requestAnimationFrame(() => this.onFrame?.());
    }
  }

  /**
   * The battle on R2a's battle scene (§10.2), from round 1's planning: the general has planned, and a bot player
   * plans and begins on its own. A battle save found here can't be restored (R2b saves none until S8), so it's
   * cleared and the battle restarts with the notice (§8.9).
   */
  private startBattle(): void {
    if (this.run.screen.kind !== 'battle') return;
    const { content, atlas } = this.env;
    const restarted = this.env.persist && this.env.storage.get(BATTLE_KEY) !== null;
    if (restarted) clearBattle(this.env.storage);
    const state = createBattle(content, this.run.screen.config);
    this.battle = openRoundBattle(content, atlas, state, {
      actions: { continueRun: () => this.finish(), runNote: (st) => this.runNoteOf(st) },
      still: this.env.still, debug: this.env.debug, onFrame: () => this.onFrame?.(),
    });
    if (restarted) this.battle.view.notice('save-recovery', RESTART_NOTICE);
    if (this.runNotice) this.battle.view.notice('run-notice', this.runNotice);
    this.runNotice = null;
  }

  /** What the battle on screen means for the run, for its report (the rewards table, SPEC §8.5, §8.6). */
  private runNoteOf(state: BattleState): string {
    const run = this.run;
    const row = currentRow(run) - 1;
    const node = run.route[row]?.[run.path[row]!];
    if (!node || !state.outcome) return '';
    const r = battleRewards(node.kind, state.outcome.winner, state.outcome.by, rewardRules(this.env.content));
    if (state.outcome.winner !== 'player') {
      const left = run.lives.left - 1;
      const end = left <= 0 || node.kind === 'boss' ? ' The run ends.' : '';
      return `You lose a Regrowth: ${Math.max(0, left)} of ${run.lives.max} left.${end}`;
    }
    const amber = r.amber ? ` · +${r.amber} Amber` : r.amberChance ? ` · ${Math.round(r.amberChance * 100)}% chance of +1 Amber` : '';
    const plot = node.kind !== 'boss' && run.plotsGained < this.env.content.balance.rounds.plotGrowth.max ? ' · your colony gains a plot' : '';
    return `+${r.spores} Spores${amber}${plot}.`;
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
