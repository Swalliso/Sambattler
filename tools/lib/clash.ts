// R1's clash check (SPEC §16 R1, §12.2): whole armies at equal gold meet at once, in formation, on
// v1's sim. This part builds the armies: each spawner's squad (§11.2), the army cards, and an army
// from a bot spec and a gold budget (R1-Q2, R1-Q4). R2a's `playRoundClash` builds on `armyFromBot`
// (R2a/T116). v2's numbers that aren't in the data yet are named here (plan call 19); R2a moves
// them into balance.json (§11.1).
import type { Content } from '../../src/data/registry.ts';
import { createBattle, hash32, makeConfig, nextFloat, seedStream } from '../../src/sim/index.ts';
import { rosterIds } from './balance.ts';

/** v2's clash numbers, until R2a puts them in the data (§4.6, §5.6, §6.7, §12.3). */
export const CLASH = {
  /** Tiles between the two front ranks (§4.6). */
  gapTiles: 6,
  /** The muster: 1 s in which squads knit and nobody moves or attacks (§5.6). */
  musterTicks: 20,
  /** A clash ends at 45 s, the muster counted (§6.7, §18.2 #13). */
  capTicks: 900,
  /** Heartcap damage per point of a lane's margin (§6.7). */
  damagePerSupply: 25,
  /** Siege units count double toward Heartcap damage (§5.4, §6.7). */
  siegeDamageMult: 2,
  /** The most Heartcap damage one round deals (§6.7). */
  damageCap: 500,
  /** G13: at most this share of clashes reach the cap (§12.3). */
  g13StallShare: 0.15,
} as const;

/** One building of an army: a spawner's squad, or a tower fielded as an emplacement. */
export interface ArmyEntry {
  buildingId: string;
  kind: 'squad' | 'emplacement';
  /** The squad's unit; an emplacement has none. */
  unitId?: string;
  /** The squad's units; 1 for an emplacement. */
  count: number;
  /** Whether the squad's units merge; an emplacement never does. */
  mergeOn: boolean;
}

/** An army built from a bot spec at a gold budget, in build-list order. */
export interface Army {
  controller: string;
  budget: number;
  spent: number;
  entries: ArmyEntry[];
  /** The squads' supply at tier 1; an emplacement counts 0 (§6.7's first guess). */
  supply: number;
  /** The units the squads field. */
  units: number;
}

/**
 * A spawner's squad (§11.2): what it made in `seconds` under v1's timers, in whole batches with
 * halves rounded up, `count × round(seconds / interval)`.
 */
export function squadSize(content: Content, buildingId: string, seconds = 60): number {
  const b = content.buildings[buildingId];
  if (!b) throw new Error(`squadSize: unknown building ${buildingId}`);
  if (!b.spawn) throw new Error(`squadSize: ${buildingId} spawns nothing`);
  return b.spawn.count * Math.round(seconds / b.spawn.interval);
}

/**
 * The army cards (§16 R1, A016): the roster's spawners, the Tender's Ring included, and its towers.
 * The economy and utility cards (the Truffle Cellar, the Spore Exchange and the Rhizome Vault) field
 * nothing in a clash, and one clash can't value them.
 */
export function clashArmyIds(content: Content): string[] {
  return rosterIds(content).filter((id) => {
    const kind = content.buildings[id]!.kind;
    return kind === 'spawner' || kind === 'tower';
  });
}

/** What an army takes from its bot: the opener and the weights, army cards only, and its merge policy. */
interface BuildList {
  opener: string[];
  weights: { building: string; weight: number; maxOwned: number }[];
  mergeOn: boolean;
}

const buildLists = new WeakMap<Content, Map<string, BuildList>>();

/**
 * The opener, the weights and `maxOwned` of the AI state `createBattle` resolves for `controller`
 * (§7.1), on a battle that's then dropped, with the economy and utility cards filtered out (R1-Q2).
 * `afterSeconds` is ignored, and "auto" merging reads as on. Neither the seed nor the budget changes
 * them, so each content's lists are kept.
 */
function buildList(content: Content, controller: string): BuildList {
  let lists = buildLists.get(content);
  if (!lists) buildLists.set(content, (lists = new Map()));
  const known = lists.get(controller);
  if (known) return known;
  const ai = createBattle(content, makeConfig(content, { seed: 1, mapId: 'test-flat', player: controller, enemy: 'human' })).sides.player.ai;
  if (!ai) throw new Error(`armyFromBot: ${controller} has no build list`);
  const cards = new Set(clashArmyIds(content));
  const list: BuildList = {
    opener: ai.opener.filter((id) => cards.has(id)),
    weights: ai.weights.filter((w) => cards.has(w.building)).map(({ building, weight, maxOwned }) => ({ building, weight, maxOwned })),
    mergeOn: ai.mergePolicy !== 'off',
  };
  lists.set(controller, list);
  return list;
}

/**
 * The army `controller` builds with `budget` gold of army and `plots` plots (§16 R1, R1-Q2, R1-Q4):
 * its opener first, skipping what doesn't fit, then weighted picks from the army's own stream. A
 * pick that doesn't fit the gold left is skipped and drawing goes on, until no pickable card fits or
 * the plots are full. `maxOwned` holds. The stream is keyed by the seed and the bot alone, so an
 * army is the same in both seats and against every opponent.
 */
export function armyFromBot(content: Content, controller: string, budget: number, seed: number, plots: number): Army {
  const list = buildList(content, controller);
  const rng = seedStream(hash32(seed, controller, 0), 'ai', 0);
  const cost = (id: string): number => content.buildings[id]!.cost;
  const maxOf = new Map(list.weights.map((w) => [w.building, w.maxOwned]));
  const owned = new Map<string, number>();
  const built: string[] = [];
  let gold = budget;
  const room = (id: string): boolean => {
    const max = maxOf.get(id) ?? -1;
    return max < 0 || (owned.get(id) ?? 0) < max;
  };
  const buy = (id: string): void => {
    gold -= cost(id);
    owned.set(id, (owned.get(id) ?? 0) + 1);
    built.push(id);
  };
  for (const id of list.opener) {
    if (built.length >= plots) break;
    if (cost(id) <= gold && room(id)) buy(id);
  }
  const eff: number[] = [];
  while (built.length < plots) {
    eff.length = 0;
    let total = 0, fits = false;
    for (const w of list.weights) {
      const x = room(w.building) ? w.weight : 0;
      eff.push(x);
      total += x;
      if (x > 0 && cost(w.building) <= gold) fits = true;
    }
    if (!fits) break;
    // the AI's weighted pick (src/sim/ai/controller.ts)
    let roll = nextFloat(rng) * total;
    let pick = -1;
    for (let i = 0; i < eff.length && pick < 0; i++) {
      roll -= eff[i]!;
      if (roll < 0 && eff[i]! > 0) pick = i;
    }
    for (let i = eff.length - 1; i >= 0 && pick < 0; i--) if (eff[i]! > 0) pick = i;
    const id = list.weights[pick]!.building;
    if (cost(id) <= gold) buy(id);
  }
  const entries = built.map((id): ArmyEntry => {
    const spawn = content.buildings[id]!.spawn;
    if (!spawn) return { buildingId: id, kind: 'emplacement', count: 1, mergeOn: false };
    return { buildingId: id, kind: 'squad', unitId: spawn.unit, count: squadSize(content, id), mergeOn: list.mergeOn };
  });
  let supply = 0, units = 0;
  for (const e of entries) {
    if (e.kind !== 'squad') continue;
    units += e.count;
    supply += e.count * content.units[e.unitId!]!.supply;
  }
  return { controller, budget, spent: budget - gold, entries, supply, units };
}
