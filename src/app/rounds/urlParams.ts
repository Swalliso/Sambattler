// The preview's URL parameters (SPEC §15.6, R2a's `scene=rounds`) and the state they open: earlier rounds
// played headlessly with the controllers, stopping at the planning checkpoint (plan Call 14), the clash at
// a tick counted from its start (Call 16), the aftermath or the battle's end. The defaults are Call 28's,
// kept here only. The page and `tools/lib/rounds/params.ts` both open the state through `previewState`, so
// a capture's hash matches Node's at the same round, phase and tick. It imports no DOM, so Node runs it.
import { parseFlags } from '../../sim/create.ts';
import {
  commandStamp, createBattle, createFromScenario, makeRoundConfig, queueCommand, step,
} from '../../sim/rounds/index.ts';
import type { BattleState, Content, Flags, RoundScenarioOverrides } from '../../sim/rounds/index.ts';

export type RoundPhase = BattleState['phase'];
const PHASES: readonly RoundPhase[] = ['planning', 'clash', 'aftermath', 'ended'];

/** The preview's defaults (plan Call 28): what the title's button opens. The seed is random, and the page writes it into the URL. */
export const PREVIEW_DEFAULTS = {
  map: 'bogwater-hollow', battleIndex: 1, player: 'human', enemy: 'general:mother-mold', flags: 'merging,adaptive,powers', commander: 'vesper',
} as const;

export interface RoundParams {
  map: string;
  seed: number | null;
  battleIndex: number;
  player: string;
  enemy: string;
  commander: string;
  scenario: string | null;
  /** The round to open: round 1, or a scenario's own round, unless set. */
  round: number | null;
  /** The phase to open, which also holds the page there (plan Calls 14 and 15); null opens the round's planning with no hold. */
  phase: RoundPhase | null;
  /** A tick of the clash, counted from its start (plan Call 16). */
  ticks: number | null;
  paused: boolean;
  /** The exact flag set from `?flags=`, or null for the defaults. */
  flags: Flags | null;
  /** Set by the query, as against a default: a scenario keeps its own controllers, flags and commander unless the query names them. */
  given: Set<string>;
  test: boolean;
  debug: boolean;
  /** `targeting=1` opens power targeting in a clash (T109). */
  targeting: boolean;
  /** `measure=frames` records frame times into the bridge (T115). */
  measure: 'frames' | null;
  /** `reveal=last` draws the general's colony and squads as it fielded last round, from round 2 (§7.5, T127); `full`, the default, is null. */
  reveal: 'last' | null;
  /** Values the preview can't open, each refused with a message. */
  problems: string[];
}

export function parseRoundParams(search: string | URLSearchParams): RoundParams {
  const q = typeof search === 'string' ? new URLSearchParams(search) : search;
  const problems: string[] = [];
  const int = (k: string, min: number): number | null => {
    const v = q.get(k);
    if (v === null || v === '') return null;
    const n = Number(v);
    if (!Number.isInteger(n) || n < min) { problems.push(`${k}=${v} isn't a whole number from ${min}`); return null; }
    return n;
  };
  const phase = q.get('phase');
  if (phase !== null && !PHASES.includes(phase as RoundPhase)) problems.push(`phase=${phase} isn't one of ${PHASES.join(', ')}`);
  // a mistyped A/B would show the full reveal unnoticed (R2-Q1)
  const reveal = q.get('reveal');
  if (reveal !== null && reveal !== 'last' && reveal !== 'full') problems.push(`reveal=${reveal} isn't last or full`);
  const flagList = q.get('flags');
  const parsed = parseFlags(flagList ?? PREVIEW_DEFAULTS.flags);
  problems.push(...parsed.problems);
  return {
    map: q.get('map') ?? PREVIEW_DEFAULTS.map,
    seed: int('seed', 0),
    battleIndex: int('battleIndex', 1) ?? PREVIEW_DEFAULTS.battleIndex,
    player: q.get('player') ?? PREVIEW_DEFAULTS.player,
    enemy: q.get('enemy') ?? PREVIEW_DEFAULTS.enemy,
    commander: q.get('commander') ?? PREVIEW_DEFAULTS.commander,
    scenario: q.get('scenario') || null,
    round: int('round', 1),
    phase: phase !== null && PHASES.includes(phase as RoundPhase) ? phase as RoundPhase : null,
    ticks: int('ticks', 0),
    paused: q.get('paused') === '1',
    flags: flagList === null ? null : parsed.flags,
    given: new Set([...q.keys()]),
    test: q.get('test') === '1',
    debug: q.get('debug') === '1',
    targeting: q.get('targeting') === '1',
    measure: q.get('measure') === 'frames' ? 'frames' : null,
    reveal: reveal === 'last' ? 'last' : null,
    problems,
  };
}

/** Why the preview can't open what the parameters ask for (§15.6): the page shows it, and a capture fails with it. */
export class PreviewRefusal extends Error {}

const refuse = (message: string): never => { throw new PreviewRefusal(message); };

/** The battle the parameters set up, before any fast-forward: a single battle with Call 28's defaults, or a round scenario. */
function setUp(content: Content, p: RoundParams, seed: number): BattleState {
  if (p.scenario) {
    if (!content.roundScenarios[p.scenario]) refuse(`there's no round scenario ${p.scenario}`);
    if (p.given.has('commander')) refuse('commander= does not apply to a scenario');
    const over: RoundScenarioOverrides = { seed };
    if (p.given.has('player')) over.player = p.player;
    if (p.given.has('enemy')) over.enemy = p.enemy;
    if (p.flags) over.flags = p.flags;
    return createFromScenario(content, p.scenario, over);
  }
  return createBattle(content, makeRoundConfig(content, {
    seed, mapId: p.map, battleIndex: p.battleIndex, player: p.player, enemy: p.enemy,
    flags: p.flags ?? parseFlags(PREVIEW_DEFAULTS.flags).flags, commander: p.commander,
  }));
}

/**
 * The state the preview opens (§15.6): the battle the parameters set up, played headlessly with its
 * controllers to round n's planning checkpoint, its clash at a tick from the clash's start, its aftermath, or
 * the battle's end. A human's planning can't be played headlessly, so a human player can open round 1's
 * planning only, unless a scenario sets their colony: the human then begins each round with it as it stands.
 * Throws a `PreviewRefusal` with the reason when the parameters can't be opened.
 */
export function previewState(content: Content, p: RoundParams, seed: number): BattleState {
  if (p.problems.length) refuse(p.problems.join('; '));
  if (p.ticks !== null && p.phase !== null && p.phase !== 'clash') refuse(`ticks=${p.ticks} counts within a clash, so it needs phase=clash`);
  const phase: RoundPhase = p.phase ?? (p.ticks !== null ? 'clash' : 'planning');
  let state: BattleState;
  try {
    state = setUp(content, p, seed);
  } catch (e) {
    if (e instanceof PreviewRefusal) throw e;
    return refuse((e as Error).message);
  }
  const round = p.round ?? state.round;
  const human = state.config.player.controller.kind === 'human';
  if (human && !p.scenario && (round > 1 || phase !== 'planning')) {
    refuse(`with player=human, ${round > 1 ? `round=${round}` : `phase=${phase}`} needs a scenario: a human's planning can't be played headlessly`);
  }
  if (round < state.round) refuse(`scenario ${p.scenario} starts in round ${state.round}, after round ${round}`);
  playTo(state, phase, round, p.ticks ?? 0);
  return state;
}

/** Where a phase falls in its round. */
const order = (phase: RoundPhase): number => PHASES.indexOf(phase);

/** Steps the battle to the target, a human beginning with its colony as it stands (plan Call 14's checkpoint is never stepped past). */
function playTo(state: BattleState, phase: RoundPhase, round: number, ticks: number): void {
  const reached = (): boolean => {
    if (phase === 'ended') return state.phase === 'ended';
    if (state.round !== round || state.phase !== phase) return false;
    return phase !== 'clash' || state.tick - state.clash!.startTick === ticks;
  };
  while (!reached()) {
    if (state.phase === 'ended') {
      const o = state.outcome!;
      refuse(`the battle ended in round ${o.round} (${o.by === 'rout' ? 'a rout' : 'a Decision'}), before round ${round}'s ${phase}`);
    }
    if (phase === 'clash' && state.round === round && state.phase === 'aftermath') {
      refuse(`round ${round}'s clash ended at tick ${state.tick - state.clash!.startTick}, before ticks=${ticks}`);
    }
    if (phase !== 'ended' && (state.round > round || (state.round === round && order(state.phase) > order(phase)))) {
      refuse(`round ${round}'s ${phase} has passed`);
    }
    if (state.phase === 'planning' && !state.queue.some((c) => c.type === 'beginClash')) {
      queueCommand(state, { ...commandStamp(state), side: 'player', type: 'beginClash' });
    }
    step(state);
  }
}
