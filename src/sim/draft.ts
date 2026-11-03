// Drafts (SPEC §8.3–8.4). An offer is a pure function of (pool, owned cards, battle index, options,
// `draft` stream), which the run layer's spoils drafts use. Each card draws exactly three numbers (type,
// rarity, item), so the stream advances the same way whatever is left in the pool. Opening drafts in a
// battle's planning phases is R2b's T065.
import type { Content } from '../data/registry.ts';
import type { BalanceDef, BuildingDef, RelicDef, UpgradeTrackDef } from '../data/schema.ts';
import { nextFloat } from './rng.ts';
import type { CardType, DraftCard, DraftPool, Loadout, Rarity, Rng4 } from './state.ts';

/** What an offer reads: the balance's draft constants and the defs of the buildings, upgrade tracks and relics it may offer. */
export interface DraftLibrary {
  balance: BalanceDef;
  buildings: Record<string, BuildingDef>;
  upgrades: Record<string, UpgradeTrackDef>;
  relics: Record<string, RelicDef>;
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

/** Adds a card to a loadout (blueprint → kit, upgrade → +1 level, relic → owned). */
export function applyCard(lo: Loadout, cardIdText: string): void {
  const c = parseCard(cardIdText);
  if (!c) throw new Error(`bad card id ${cardIdText}`);
  if (c.type === 'blueprint') { if (!lo.kit.includes(c.id)) lo.kit.push(c.id); }
  else if (c.type === 'upgrade') lo.upgrades[c.id] = (lo.upgrades[c.id] ?? 0) + 1;
  else if (!lo.relics.includes(c.id)) lo.relics.push(c.id);
}
