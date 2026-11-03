// Drafts (SPEC §8.3–8.4). An offer is a pure function of (pool, owned cards, battle index, options,
// `draft` stream), which the run layer's spoils drafts and a battle's drafts in planning use. Each card draws
// exactly three numbers (type, rarity, item), so the stream advances the same way whatever is left in the pool.
// A battle with drafts on opens one in the planning after each round in `draftRounds` (§4.7 step 10, R2b T065).
import type { Content } from '../data/registry.ts';
import type { BalanceDef } from '../data/schema.ts';
import { compileRoundSides, drafting } from './compile.ts';
import { nextFloat } from './rng.ts';
import type { AiState, BattleState, CardType, DraftCard, DraftPool, Loadout, Rarity, Rng4, Side } from './state.ts';

/** An upgrade track as an offer reads it (§11.6): each level's rarity, and `offered: false` on a level that does nothing in rounds (#27). */
export interface DraftTrack { rarity: readonly Rarity[]; levels: readonly { offered?: false }[] }

/** What an offer reads: the balance's draft constants, and the rarities of the buildings, upgrade tracks and relics it may offer. */
export interface DraftLibrary {
  balance: BalanceDef;
  buildings: Record<string, { rarity?: Rarity }>;
  upgrades: Record<string, DraftTrack>;
  relics: Record<string, { rarity: Rarity }>;
}

/** The draft library for these buildings (with their upgrade tracks) and relics. */
export function draftLibrary(content: Content, buildingIds: Iterable<string>, relicIds: Iterable<string>): DraftLibrary {
  const lib: DraftLibrary = { balance: content.balance, buildings: {}, upgrades: {}, relics: {} };
  for (const id of buildingIds) {
    const b = content.buildings[id];
    if (!b) throw new Error(`unknown building ${id}`);
    lib.buildings[id] = b;
    const track = content.upgrades[id];
    if (track) lib.upgrades[id] = track;
  }
  for (const id of relicIds) {
    const r = content.relics[id];
    if (!r) throw new Error(`unknown relic ${id}`);
    lib.relics[id] = r;
  }
  return lib;
}

/**
 * The level a track reaches with one more level from `level` (§11.6, #27): the next level that is offered,
 * past any `offered: false` level, so the levels after a dead one stay reachable (A105). Null once none is left.
 */
export function nextLevel(track: DraftTrack, level: number): number | null {
  for (let k = level; k < track.levels.length; k++) if (track.levels[k]!.offered !== false) return k + 1;
  return null;
}

/** How many offered levels a track has left past `level` (#27). */
export function levelsLeft(track: DraftTrack, level: number): number {
  let n = 0;
  for (let k = level; k < track.levels.length; k++) if (track.levels[k]!.offered !== false) n++;
  return n;
}

export const RARITIES: readonly Rarity[] = ['common', 'uncommon', 'rare'];
const TYPES: readonly CardType[] = ['blueprint', 'upgrade', 'relic'];
const PREFIX: Record<CardType, string> = { blueprint: 'bp', upgrade: 'up', relic: 'relic' };

export function cardId(type: CardType, id: string): string {
  return `${PREFIX[type]}:${id}`;
}

/** Splits a card id into its type and the building or relic id it names. */
export function parseCard(card: string): { type: CardType; id: string } | null {
  const m = card.match(/^(bp|up|relic):(.+)$/);
  if (!m) return null;
  const type = m[1] === 'bp' ? 'blueprint' : m[1] === 'up' ? 'upgrade' : 'relic';
  return { type, id: m[2]! };
}

export interface OfferOptions {
  cards: number;
  battleIndex: number;
  /** Points moved from common to rare on top of the per-battle shift (elite spoils, the Rout bias). */
  rareBonus?: number;
  /** Restrict the offer to these card types (the elite spoils pick is relics only). */
  types?: readonly CardType[];
}

/** Rarity weights for a battle: the base split with `rarityShiftPerBattle` points per battle (and any bonus) moved from common to rare. */
export function rarityWeights(lib: DraftLibrary, battleIndex: number, rareBonus = 0): [number, number, number] {
  const d = lib.balance.draft;
  const [c, u, r] = d.rarity;
  const shift = Math.min(c, d.rarityShiftPerBattle * Math.max(0, battleIndex - 1) + rareBonus);
  return [c - shift, u, r + shift];
}

/** Card type weights: the base weights, or a fixed blueprint share while the kit is small. */
export function typeWeights(lib: DraftLibrary, kitSize: number): Record<CardType, number> {
  const d = lib.balance.draft;
  const w = d.typeWeights;
  if (kitSize >= d.smallKit.below) return { ...w };
  const s = d.smallKit.blueprintShare;
  const rest = w.upgrade + w.relic;
  return {
    blueprint: s,
    upgrade: rest > 0 ? ((1 - s) * w.upgrade) / rest : 0,
    relic: rest > 0 ? ((1 - s) * w.relic) / rest : 0,
  };
}

interface Candidate { card: DraftCard; weight: number }

/** Cards of one type the owner could be offered, in pool order (excluding `taken`). */
export function candidates(lib: DraftLibrary, pool: DraftPool, owned: Loadout, type: CardType, taken: ReadonlySet<string> = new Set()): Candidate[] {
  const out: Candidate[] = [];
  const push = (id: string, rarity: Rarity, weight: number) => {
    const cid = cardId(type, id);
    if (!taken.has(cid)) out.push({ card: { id: cid, type, rarity }, weight });
  };
  if (type === 'blueprint') {
    const coreWeight = lib.balance.draft.coreWeight;
    for (const id of [...pool.core, ...pool.shared]) {
      const b = lib.buildings[id];
      if (!b || owned.kit.includes(id)) continue;
      push(id, b.rarity ?? 'common', pool.core.includes(id) ? coreWeight : 1);
    }
  } else if (type === 'upgrade') {
    // upgrades only for buildings in the kit, at the next level offered, and never past a track's last (#27)
    for (const id of owned.kit) {
      const t = lib.upgrades[id];
      const next = t ? nextLevel(t, owned.upgrades[id] ?? 0) : null;
      if (next !== null) push(id, t!.rarity[next - 1]!, 1);
    }
  } else {
    for (const id of pool.relics) {
      const r = lib.relics[id];
      if (!r || owned.relics.includes(id)) continue;
      push(id, r.rarity, 1);
    }
  }
  return out;
}

/** One weighted draw: always consumes exactly one number from the stream. */
function pickWeighted<T>(items: readonly T[], weight: (t: T) => number, rng: Rng4): T | undefined {
  let total = 0;
  for (const it of items) total += weight(it);
  let roll = nextFloat(rng) * total;
  for (const it of items) {
    const w = weight(it);
    roll -= w;
    if (roll < 0 && w > 0) return it;
  }
  for (let i = items.length - 1; i >= 0; i--) if (weight(items[i]!) > 0) return items[i];
  return undefined;
}

/**
 * Generates an offer (SPEC §8.3): per card, roll a type among those with candidates (empty types are
 * reweighted away), roll a rarity (falling back to lower, then higher rarities when the rolled one
 * has nothing left), then a weighted item (core blueprints ×coreWeight). No duplicates in an offer.
 */
export function generateOffer(lib: DraftLibrary, pool: DraftPool, owned: Loadout, opts: OfferOptions, rng: Rng4): DraftCard[] {
  const offer: DraftCard[] = [];
  const taken = new Set<string>();
  const tw = typeWeights(lib, owned.kit.length);
  const rw = rarityWeights(lib, opts.battleIndex, opts.rareBonus ?? 0);
  const types = opts.types ?? TYPES;
  for (let i = 0; i < opts.cards; i++) {
    const byType = new Map<CardType, Candidate[]>();
    for (const t of types) {
      const c = candidates(lib, pool, owned, t, taken);
      if (c.length && tw[t] > 0) byType.set(t, c);
    }
    if (!byType.size) break;
    const avail = TYPES.filter((t) => byType.has(t));
    const type = pickWeighted(avail, (t) => tw[t], rng)!;
    const rolled = pickWeighted([0, 1, 2], (k) => rw[k]!, rng) ?? 0;
    const list = byType.get(type)!;
    const order = [rolled];
    for (let k = rolled - 1; k >= 0; k--) order.push(k);
    for (let k = rolled + 1; k < RARITIES.length; k++) order.push(k);
    let pickFrom: Candidate[] = [];
    for (const k of order) {
      pickFrom = list.filter((c) => c.card.rarity === RARITIES[k]);
      if (pickFrom.length) break;
    }
    const chosen = pickWeighted(pickFrom, (c) => c.weight, rng)!;
    offer.push(chosen.card);
    taken.add(chosen.card.id);
  }
  return offer;
}

/** Adds a card to a loadout: a blueprint to the kit, an upgrade to its track's next level offered (#27), a relic to those owned. */
export function applyCard(lo: Loadout, cardIdText: string, tracks: Record<string, DraftTrack>): void {
  const c = parseCard(cardIdText);
  if (!c) throw new Error(`bad card id ${cardIdText}`);
  if (c.type === 'blueprint') { if (!lo.kit.includes(c.id)) lo.kit.push(c.id); }
  else if (c.type === 'upgrade') {
    const t = tracks[c.id];
    const next = t ? nextLevel(t, lo.upgrades[c.id] ?? 0) : null;
    if (next === null) throw new Error(`${c.id} has no upgrade level left to offer`);
    lo.upgrades[c.id] = next;
  } else if (!lo.relics.includes(c.id)) lo.relics.push(c.id);
}

// ---- drafts in planning (§4.7 step 10, §8.3) ----

/** A battle's draft library: its own buildings, upgrade tracks and relics, which hold the pool of every side that drafts. */
function battleLibrary(state: BattleState): DraftLibrary {
  const lib = state.library;
  return { balance: lib.balance, buildings: lib.buildings, upgrades: lib.upgrades ?? {}, relics: lib.relics ?? {} };
}

/** The side's kit, levels and relics as an offer reads them. */
function loadoutOf(state: BattleState, side: Side): Loadout {
  const ss = state.sides[side];
  return { kit: ss.kit.map((c) => c.building), upgrades: ss.upgrades, relics: ss.relics };
}

function offerFor(state: BattleState, side: Side): DraftCard[] {
  const opts = { cards: state.compiled[side].draft!.cards, battleIndex: state.config.battleIndex };
  return generateOffer(battleLibrary(state), state.config[side].draft!, loadoutOf(state, side), opts, state.rng.draft);
}

/**
 * Opens the side's draft at the round's opening (§4.7 step 10, §14.6 opening step 6), once the general has planned:
 * in the planning after each round in `draftRounds`, if the side drafts and anything is left to offer. The offer
 * draws from the battle's draft stream (A093). It returns whether a draft opened.
 */
export function openDraft(state: BattleState, side: Side): boolean {
  if (!drafting(state.config, side) || !state.library.balance.rounds.draftRounds.includes(state.round - 1)) return false;
  const offer = offerFor(state, side);
  if (!offer.length) return false;
  const ss = state.sides[side];
  ss.draftsOpened++;
  ss.draft = { offer, rerolls: 0, index: ss.draftsOpened };
  state.events.push({ t: 'draftOpen', side, index: ss.draftsOpened });
  return true;
}

/** Gold the next reroll of the side's open draft costs (§8.3): the base, plus the step per reroll already taken in it. */
export function rerollCost(state: BattleState, side: Side): number {
  const d = state.compiled[side].draft;
  return d ? d.rerollBase + d.rerollStep * (state.sides[side].draft?.rerolls ?? 0) : 0;
}

export type DraftCommand = { type: 'draftPick'; cardId: string } | { type: 'draftReroll' } | { type: 'draftSkip' };

/**
 * Runs a draft command (§8.3, §14.5), or returns why it's refused. A pick adds its card at once and recompiles the
 * side, so a blueprint plants in the same phase; a reroll pays its cost for a fresh offer from the draft stream; a
 * skip pays `skipGold` at once, so it counts in the gold banked at Begin (§6.2). A pick or a skip closes the draft.
 */
export function executeDraft(state: BattleState, side: Side, cmd: DraftCommand): string | null {
  const ss = state.sides[side];
  const d = ss.draft;
  if (!d) return 'noDraftOpen';
  if (cmd.type === 'draftReroll') {
    const cost = rerollCost(state, side);
    if (ss.gold < cost) return 'notEnoughGold';
    const offer = offerFor(state, side);
    if (!offer.length) return 'nothingToOffer';
    ss.gold -= cost;
    d.rerolls++;
    d.offer = offer;
    return null;
  }
  if (cmd.type === 'draftPick') {
    if (!d.offer.some((c) => c.id === cmd.cardId)) return 'notInOffer';
    const lo = loadoutOf(state, side);
    applyCard(lo, cmd.cardId, battleLibrary(state).upgrades);
    for (const id of lo.kit) {
      if (ss.kit.some((c) => c.building === id)) continue;
      ss.kit.push({ building: id });
      if (ss.ai) adoptWeight(ss.ai, id);
    }
    (ss.drafted ??= []).push(cmd.cardId);
    recompile(state);
  } else {
    const gold = state.compiled[side].draft!.skipGold;
    ss.gold += gold;
    const earned = state.stats[side].goldEarned;
    earned.drafts = (earned.drafts ?? 0) + gold;
  }
  delete ss.draft;
  state.events.push({ t: 'drafted', side, cardId: cmd.type === 'draftPick' ? cmd.cardId : null, skipped: cmd.type === 'draftSkip' });
  return null;
}

/** An AI side's drafted blueprint joins its buying weights, in id order, so it plants the card it took (§8.3). */
function adoptWeight(ai: AiState, building: string): void {
  const i = ai.pool?.findIndex((w) => w.building === building) ?? -1;
  if (i < 0) return;
  ai.weights.push(...ai.pool!.splice(i, 1));
  ai.weights.sort((a, b) => (a.building < b.building ? -1 : a.building > b.building ? 1 : 0));
  if (!ai.pool!.length) delete ai.pool;
}

/**
 * Recompiles both sides from the library after a pick changed a loadout (§8.3). In planning nothing stands on the
 * field, so no HP rescales: each squad is fielded fresh from the compiled side at Begin (§14.4).
 */
function recompile(state: BattleState): void {
  state.compiled = compileRoundSides(state.library, state.config, state.sides);
}

