// Run state (SPEC §8): plain, JSON-serializable data, autosaved at every node boundary. A run is a
// small state machine over `screen`: route → (battle → spoils | event → prompts | grove) → route …
// → summary. Every random choice draws from the run's own streams (`route`, `events`, `draft`,
// `meta`, seeded with battle index 0); battles seed their streams from the same run seed with their
// battle index, so a run is reproducible from its seed and its decisions.
import type { RunEffect } from '../data/schema.ts';
import { hashValue, seedStream } from '../sim/index.ts';
import type { BattleConfig, Content, DraftCard, DraftPolicy, Flags, Rng4, Side } from '../sim/index.ts';
import { generateRoute } from './route.ts';
import type { RouteNode } from './route.ts';

export const RUN_VERSION = 1;

export interface BattleRecord {
  /** 1-based battle index within the run. */
  index: number;
  row: number;
  kind: RouteNode['kind'];
  map: string;
  mapName: string;
  lanes: number;
  general: string;
  elite?: string;
  winner: Side;
  by: 'rout' | 'decision';
  durationTicks: number;
  finalHash: string;
  heartcapBefore: number;
  heartcapAfter: number;
  /** Per lane: the front line (midpoint of the two borders) every 10 s, for the summary sparkline. */
  front: number[][];
  mapWidth: number;
  /** Damage dealt by the player's buildings and their units, by building type. */
  damageByBuilding: Record<string, number>;
  /** Cards picked in this battle's drafts. */
  drafted: string[];
  spores: number;
}

export interface CardRecord { card: string; source: string }

/** One spoils pick after a won battle (SPEC §8.6). */
export interface SpoilsPick {
  label: string;
  offer: DraftCard[];
  freeRerolls: number;
  cards: number;
  rareBonus: number;
  relicsOnly: boolean;
  battleIndex: number;
}

/** A choice an event or the Grove needs before its outcome can apply. */
export interface Prompt {
  title: string;
  text: string;
  /** Building ids (blueprints, upgrade tracks) or relic ids. */
  options: string[];
  optionKind: 'blueprint' | 'upgrade' | 'relic';
  /** Upgrade picks still to make in this effect (Spore Merchant asks twice). */
  remaining: number;
}

export type RunScreen =
  | { kind: 'route' }
  | { kind: 'battle'; config: BattleConfig }
  | { kind: 'spoils'; picks: SpoilsPick[] }
  | { kind: 'event'; event: string }
  | { kind: 'grove' }
  | { kind: 'prompt'; prompt: Prompt }
  | { kind: 'summary' };

export interface RunState {
  v: typeof RUN_VERSION;
  seed: number;
  commander: string;
  faction: string;
  /** Controller for the player's side in battles: `human` or `bot:<id>`. */
  player: string;
  /** In-battle draft policy when the player side is a bot (`none` leaves drafts to the UI). */
  autoDraft: DraftPolicy;
  flags: Flags;
  route: RouteNode[][];
  /** The node chosen in each row so far; its length is the current row. */
  path: number[];
  kit: string[];
  upgrades: Record<string, number>;
  relics: string[];
  heartcap: { hp: number; max: number };
  battles: BattleRecord[];
  cards: CardRecord[];
  spores: number;
  amber: number;
  xp: number;
  /** Times Burn the Notes halved the general's intel (intel itself arrives in M4). */
  intelHalvings: number;
  /** One-shot modifiers for the next battle (events). */
  next: { startingGold: number; sporestormShiftSeconds: number };
  /** Event outcomes still to resolve (some wait on a prompt). */
  pending: RunEffect[];
  rng: Record<'route' | 'events' | 'draft' | 'meta', Rng4>;
  screen: RunScreen;
  outcome?: 'victory' | 'defeat';
}

export interface RunOptions {
  seed: number;
  player?: string;
  autoDraft?: DraftPolicy;
  commander?: string;
}

export const RUN_FLAGS: Flags = { merging: true, drafts: true, adaptiveGeneral: true, powers: false };

export function createRun(content: Content, opts: RunOptions): RunState {
  const seed = opts.seed >>> 0;
  const commander = opts.commander ?? 'vesper';
  const cmd = content.commanders[commander];
  if (!cmd) throw new Error(`unknown commander ${commander}`);
  const rng = {
    route: seedStream(seed, 'route', 0),
    events: seedStream(seed, 'events', 0),
    draft: seedStream(seed, 'draft', 0),
    meta: seedStream(seed, 'meta', 0),
  };
  const hp = content.balance.heartcapPlayerHp;
  return {
    v: RUN_VERSION,
    seed,
    commander,
    faction: 'velvet-bloom',
    player: opts.player ?? 'human',
    autoDraft: opts.autoDraft ?? (opts.player && opts.player !== 'human' ? 'greedy' : 'none'),
    flags: { ...RUN_FLAGS },
    route: generateRoute(content, rng.route),
    path: [],
    kit: [...cmd.starter],
    upgrades: {},
    relics: [],
    heartcap: { hp, max: hp },
    battles: [],
    cards: [],
    spores: 0,
    amber: 0,
    xp: 0,
    intelHalvings: 0,
    next: { startingGold: 0, sporestormShiftSeconds: 0 },
    pending: [],
    rng,
    screen: { kind: 'route' },
  };
}

/** The row the player chooses from next (0-based). */
export const currentRow = (run: RunState): number => run.path.length;

export function hashRun(run: RunState): string {
  return hashValue(run);
}

/** Battles won so far. */
export const battlesWon = (run: RunState): number => run.battles.filter((b) => b.winner === 'player').length;

/** Did the run reach the boss battle? */
export const reachedBoss = (run: RunState): boolean => run.battles.some((b) => b.kind === 'boss');

/** Total simulated battle time so far, in ticks. */
export const battleTicks = (run: RunState): number => run.battles.reduce((n, b) => n + b.durationTicks, 0);
