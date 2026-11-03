// Run state (SPEC §8, §14.4): plain, JSON-serializable data, autosaved at every node boundary. A run is a
// small state machine over `screen`: route → (battle → spoils | event → prompts | grove) → route …
// → summary. Every random choice draws from the run's own streams (`route`, `events`, `draft`,
// `meta`, seeded with battle index 0); battles seed their streams from the same run seed with their
// battle index, so a run is reproducible from its seed and its decisions. Since R2 each battle is a battle
// in rounds with its own Heartcaps, and the run carries lives (§8.5); `migrateRun` reads v1's saves.
import type { RunEffect } from '../data/schema.ts';
import { DEFAULT_COMMANDER, MAX_BANS, hashValue, seedStream } from '../sim/index.ts';
import type { Content, DraftCard, DraftPolicy, PowerPolicy, Rng4 } from '../sim/index.ts';
import type { BattleConfig, CounterKind, Flags, IntelProfile, RoundResult, Side } from '../sim/rounds/index.ts';
import { generateRoute } from './route.ts';
import type { RouteNode } from './route.ts';

/** 2 since R2 (§14.4): the key stays `spore-sprawl.run.v1` (§13.8), and `migrateRun` reads a v1 record. */
export const RUN_VERSION = 2;

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
  finalHash: string;
  /** The battle's rounds, with what each side fielded (§10.4, §7.6); empty on a battle migrated from v1. */
  rounds: RoundResult[];
  /** Each Heartcap's max and its HP at the end (§4.5); missing on a battle migrated from v1, whose Heartcap was the run's. */
  heartcaps?: Record<Side, { max: number; end: number }>;
  /** A lost battle costs a life (§8.5). */
  lifeLost: boolean;
  /** Damage dealt by the player's buildings and their units, by building type. */
  damageByBuilding: Record<string, number>;
  /** Cards picked in this battle's drafts. */
  drafted: string[];
  spores: number;
  /** The general's opening doctrine from intel (the boss's is dual). */
  opening?: { kinds: CounterKind[]; dual: boolean };
  /** The counters the general activated, by round (SPEC §7.4). */
  counters?: CounterRecordBrief[];
  /** The player's profile for this battle (SPEC §7.6); missing if the general did not adapt. */
  profile?: IntelProfile;
}

export interface CounterRecordBrief {
  kind: CounterKind;
  /** The round it activated in. */
  round: number;
  /** The answer it added to its plan. */
  drafted?: string;
  sold: string[];
  /** What the general planted while it was in force, by building id. */
  built: Record<string, number>;
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
  /** A battle in rounds' config (§14.4), fixed when the node is entered. */
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
  /** Shared-pool buildings banned for this run (SPEC §8.1): never offered in drafts, spoils or events. */
  bans: string[];
  faction: string;
  /** Controller for the player's side in battles: `human` or `bot:<id>`. */
  player: string;
  /** In-battle draft policy when the player side is a bot (`none` leaves drafts to the UI). */
  autoDraft: DraftPolicy;
  /** Power policy when the player side is a bot (absent: the bot never uses the power). */
  powerPolicy?: PowerPolicy;
  flags: Flags;
  route: RouteNode[][];
  /** The node chosen in each row so far; its length is the current row. */
  path: number[];
  kit: string[];
  upgrades: Record<string, number>;
  relics: string[];
  /** The plots sprawl has gained, 0–4 (§4.6, #18): relic, trait and commander plots aren't stored. */
  plotsGained: number;
  /** 3 at the start (§8.5); a lost battle costs one, and the run ends at 0. */
  lives: { left: number; max: number };
  /** A run-long change to your battle Heartcap's max (Fallen Oak's −0.15, §8.7). */
  heartcapMaxPct: number;
  battles: BattleRecord[];
  cards: CardRecord[];
  spores: number;
  amber: number;
  xp: number;
  /** Times Burn the Notes halved the general's intel. */
  intelHalvings: number;
  /** The Gray Rot's intel file on the player (SPEC §7.6); missing until a battle has been read. */
  intel?: IntelProfile;
  /** Every battle's profile so far, for the boss's unweighted average. */
  profiles?: IntelProfile[];
  /** One-shot modifiers for the next battle (events, §8.7): reset when it ends. */
  next: NextBattle;
  /** Event outcomes still to resolve (some wait on a prompt). */
  pending: RunEffect[];
  rng: Record<'route' | 'events' | 'draft' | 'meta', Rng4>;
  screen: RunScreen;
  outcome?: 'victory' | 'defeat';
}

export interface NextBattle { startingGold: number; sporestormShiftRounds: number; heartcapMaxHpPct: number }

export const freshNext = (): NextBattle => ({ startingGold: 0, sporestormShiftRounds: 0, heartcapMaxHpPct: 0 });

export interface RunOptions {
  seed: number;
  player?: string;
  autoDraft?: DraftPolicy;
  commander?: string;
  /** Up to 3 shared-pool buildings to ban (SPEC §8.1). */
  bans?: string[];
  powerPolicy?: PowerPolicy;
  /** Feature flags for the run's battles (drafts stay on: they are part of the run loop). */
  flags?: Partial<Flags>;
}

export const RUN_FLAGS: Flags = { merging: true, drafts: true, adaptiveGeneral: true, powers: true };

/**
 * Why a ban list isn't allowed for a commander, or null: at most 3 distinct buildings, each in the
 * faction's roster and outside the commander's core pool (SPEC §8.1).
 */
export function banProblem(content: Content, commander: string, faction: string, bans: readonly string[]): string | null {
  const cmd = content.commanders[commander];
  if (!cmd) return `unknown commander ${commander}`;
  if (bans.length > MAX_BANS) return `at most ${MAX_BANS} bans`;
  if (new Set(bans).size !== bans.length) return 'a building is banned twice';
  const roster = content.factions[faction]?.buildings ?? [];
  for (const id of bans) {
    if (!roster.includes(id)) return `${id} is not in the shared pool`;
    if (cmd.core.includes(id)) return `${content.buildings[id]?.name ?? id} is in ${cmd.name}'s core pool and can't be banned`;
  }
  return null;
}

export function createRun(content: Content, opts: RunOptions): RunState {
  const seed = opts.seed >>> 0;
  const commander = opts.commander ?? DEFAULT_COMMANDER;
  const cmd = content.commanders[commander];
  if (!cmd) throw new Error(`unknown commander ${commander}`);
  const faction = 'velvet-bloom';
  const bans = [...(opts.bans ?? [])];
  const problem = banProblem(content, commander, faction, bans);
  if (problem) throw new Error(`bans: ${problem}`);
  const rng = {
    route: seedStream(seed, 'route', 0),
    events: seedStream(seed, 'events', 0),
    draft: seedStream(seed, 'draft', 0),
    meta: seedStream(seed, 'meta', 0),
  };
  const lives = content.balance.rounds.lives;
  return {
    v: RUN_VERSION,
    seed,
    commander,
    bans,
    faction,
    player: opts.player ?? 'human',
    autoDraft: opts.autoDraft ?? (opts.player && opts.player !== 'human' ? 'greedy' : 'none'),
    ...(opts.powerPolicy && opts.powerPolicy !== 'none' ? { powerPolicy: opts.powerPolicy } : {}),
    flags: { ...RUN_FLAGS, ...opts.flags, drafts: true },
    route: generateRoute(content, rng.route),
    path: [],
    kit: [...cmd.starter],
    upgrades: {},
    relics: [],
    plotsGained: 0,
    lives: { left: lives, max: lives },
    heartcapMaxPct: 0,
    battles: [],
    cards: [],
    spores: 0,
    amber: 0,
    xp: 0,
    intelHalvings: 0,
    next: freshNext(),
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

/** Clash ticks so far, summed over every battle's rounds (§15.2): planning takes no ticks. */
export const battleTicks = (run: RunState): number => run.battles.reduce((n, b) => n + b.rounds.reduce((t, r) => t + clashTicks(r), 0), 0);

/** A round's clash ticks: its longest lane's (§4.7). */
export const clashTicks = (r: RoundResult): number => r.lanes.reduce((t, l) => Math.max(t, l.ticks), 0);
