// Drafts (SPEC §8.3–8.4). An offer is a pure function of (pool, owned cards, battle index, options,
// `draft` stream), shared by the in-battle drafts here and the run layer's spoils drafts. Each card
// draws exactly three numbers (type, rarity, item), so the stream advances the same way whatever is
// left in the pool. In battle, a draft opens at the end of the configured waves and holds the sim
// until the side picks, rerolls or skips; a pick recompiles both sides.
import { compileSides } from './compile.ts';
import { nextFloat } from './rng.ts';
import { SIDES } from './state.ts';
import { supplyCapOf } from './world.ts';
import type {
  BattleState, CardType, CompiledSide, DraftCard, DraftPool, Library, Loadout, Rarity, Rng4, Side,
} from './state.ts';

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
export function rarityWeights(lib: Library, battleIndex: number, rareBonus = 0): [number, number, number] {
  const d = lib.balance.draft;
  const [c, u, r] = d.rarity;
  const shift = Math.min(c, d.rarityShiftPerBattle * Math.max(0, battleIndex - 1) + rareBonus);
  return [c - shift, u, r + shift];
}

/** Card type weights: the base weights, or a fixed blueprint share while the kit is small. */
export function typeWeights(lib: Library, kitSize: number): Record<CardType, number> {
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
export function candidates(lib: Library, pool: DraftPool, owned: Loadout, type: CardType, taken: ReadonlySet<string> = new Set()): Candidate[] {
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
    // upgrades only for buildings in the kit, and never past a track's last level
    for (const id of owned.kit) {
      const t = lib.upgrades[id];
      const level = owned.upgrades[id] ?? 0;
      if (!t || level >= t.levels.length) continue;
      push(id, t.rarity[level]!, 1);
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
export function generateOffer(lib: Library, pool: DraftPool, owned: Loadout, opts: OfferOptions, rng: Rng4): DraftCard[] {
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

/** Adds a card to a loadout (blueprint → kit, upgrade → +1 level, relic → owned). */
export function applyCard(lo: Loadout, cardIdText: string): void {
  const c = parseCard(cardIdText);
  if (!c) throw new Error(`bad card id ${cardIdText}`);
  if (c.type === 'blueprint') { if (!lo.kit.includes(c.id)) lo.kit.push(c.id); }
  else if (c.type === 'upgrade') lo.upgrades[c.id] = (lo.upgrades[c.id] ?? 0) + 1;
  else if (!lo.relics.includes(c.id)) lo.relics.push(c.id);
}

// ---- in-battle drafts ----

/** Opens a draft for `side` if it drafts this battle and anything is left to offer. Holds the sim. */
export function openDraft(state: BattleState, side: Side): boolean {
  const pool = state.config[side].draft;
  const ss = state.sides[side];
  if (!pool || ss.draft) return false;
  ss.draftsOpened++;
  const offer = generateOffer(state.library, pool, ss, { cards: state.compiled[side].draftCards, battleIndex: state.config.battleIndex }, state.rng.draft);
  if (!offer.length) return false;
  ss.draft = { offer, rerolls: 0, index: ss.draftsOpened };
  state.held = true;
  state.events.push({ t: 'draftOpen', side, index: ss.draftsOpened });
  return true;
}

/** Gold the next reroll of the open draft costs. */
export function rerollCost(state: BattleState, side: Side): number {
  const cs = state.compiled[side];
  return cs.rerollBase + cs.rerollStep * (state.sides[side].draft?.rerolls ?? 0);
}

function closeDraft(state: BattleState, side: Side, cardIdText: string | null): void {
  state.sides[side].draft = undefined;
  state.held = SIDES.some((s) => state.sides[s].draft !== undefined);
  state.events.push({ t: 'drafted', side, cardId: cardIdText, skipped: cardIdText === null });
}

/** Executes a draft command; returns a rejection reason or null. */
export function executeDraftCommand(state: BattleState, side: Side, cmd: { type: 'draftPick'; cardId: string } | { type: 'draftReroll' } | { type: 'draftSkip' }): string | null {
  const ss = state.sides[side];
  const d = ss.draft;
  if (!d) return 'no draft is open';
  if (cmd.type === 'draftPick') {
    if (!d.offer.some((c) => c.id === cmd.cardId)) return 'that card is not in the offer';
    applyCard(ss, cmd.cardId);
    state.stats[side].drafted.push(cmd.cardId);
    closeDraft(state, side, cmd.cardId);
    recompile(state);
    return null;
  }
  if (cmd.type === 'draftReroll') {
    const cost = rerollCost(state, side);
    if (ss.gold < cost) return 'not enough gold to reroll';
    const offer = generateOffer(state.library, state.config[side].draft!, ss, { cards: state.compiled[side].draftCards, battleIndex: state.config.battleIndex }, state.rng.draft);
    if (!offer.length) return 'nothing left to offer';
    ss.gold -= cost;
    d.rerolls++;
    d.offer = offer;
    return null;
  }
  const gold = state.compiled[side].skipGold;
  ss.gold += gold;
  state.stats[side].goldEarned.drafts += gold;
  closeDraft(state, side, null);
  return null;
}

/**
 * Recompiles both sides from the library after a loadout change. Standing units and buildings keep
 * their HP fraction against their new maximum; everything else reads the compiled set live.
 */
export function recompile(state: BattleState): void {
  const loadouts: Record<Side, Loadout> = {
    player: { kit: state.sides.player.kit, upgrades: state.sides.player.upgrades, relics: state.sides.player.relics },
    enemy: { kit: state.sides.enemy.kit, upgrades: state.sides.enemy.upgrades, relics: state.sides.enemy.relics },
  };
  const next: Record<Side, CompiledSide> = compileSides(state.library, loadouts, state.config.modifiers);
  for (const side of SIDES) {
    state.compiled[side] = next[side];
  }
  for (const side of SIDES) state.sides[side].supplyCap = supplyCapOf(state, side);
  for (const b of state.buildings) {
    const max = state.compiled[b.side].buildings[b.buildingId]?.hp ?? b.maxHp;
    if (max !== b.maxHp) { b.hp = Math.max(1, Math.round((b.hp * max) / b.maxHp)); b.maxHp = max; }
  }
  for (const u of state.units) {
    const max = state.compiled[u.side].units[u.unitId]?.tiers[u.tier - 1]!.hp ?? u.maxHp;
    if (max !== u.maxHp) { u.hp = Math.max(1, Math.round((u.hp * max) / u.maxHp)); u.maxHp = max; }
  }
}
