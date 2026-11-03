// Stats per round and per battle (SPEC §5.7, §14.4, A064, A175). The systems count into `state.stats`, the
// battle's figures, as they run. When a round closes, each side's record for it is what the round added to
// each counter, with its own most and least, and it goes in the round's `RoundResult`. A battle's figure is
// then the sum of its rounds' (`foldRounds`), their most for the maxima, and their least for the Heartcap's
// fraction. M6-Q1's feat stats are kept now, so M6 adds no stat and moves no golden (§9.2). Ids and numbers
// only (R2-Q8).
import { SIDES } from './state.ts';
import type { BattleState, RoundStats, Side, SideStats } from './state.ts';

const BP = 10000;

/** A record's figures that take the most over rounds, and the one that takes the least. Every other number is a counter. */
const MOST = ['maxEldersAlive', 'maxGoldBanked', 'maxEconomyOnLoam'] as const;
const LEAST = 'lowestHeartcapBp';
/** A record's maps by id or tag, which keep no zero entries. */
const MAPS = ['damageByBuilding', 'damageBySource', 'damageByTag', 'goldByBuilding'] as const;

/** A round's record with nothing in it: every counter 0, and the Heartcap whole. */
export function emptyRoundStats(): RoundStats {
  return {
    merges: { '2': 0, '3': 0 },
    damageDealt: 0,
    damageByBuilding: {},
    damageBySource: {},
    damageByTag: {},
    heartcapDamageDealt: 0,
    heartcapDamageTaken: 0,
    goldEarned: { stipend: 0, economy: 0, comeback: 0, interest: 0, pending: 0, effects: 0 },
    goldByBuilding: {},
    healingDone: 0,
    buildingsPlanted: 0,
    buildingsSold: 0,
    economyPlanted: 0,
    soldAfterFielding: 0,
    unitsLost: 0,
    rejectedCommands: 0,
    maxEldersAlive: 0,
    maxGoldBanked: 0,
    maxEconomyOnLoam: 0,
    lowestHeartcapBp: BP,
  };
}

/** A side's battle figures before anything has happened. */
export function emptyStats(): SideStats {
  return { ...emptyRoundStats(), buildingTypes: {}, routRoundDamageByTag: {} };
}

/** A record as a tree of numbers, which the counters' walk reads. */
type Tree = { [k: string]: number | Tree | undefined };
const tree = (r: RoundStats): Tree => r as unknown as Tree;
const isMostOrLeast = (k: string): boolean => k === LEAST || (MOST as readonly string[]).includes(k);

/** Adds `sign` × each counter of `from` into `into`, key by key and nested records included, leaving the most and least alone. */
function addCounters(into: Tree, from: Tree, sign: 1 | -1): void {
  for (const [k, v] of Object.entries(from)) {
    if (v === undefined || isMostOrLeast(k)) continue;
    if (typeof v === 'number') into[k] = ((into[k] as number | undefined) ?? 0) + sign * v;
    else addCounters((into[k] ??= {}) as Tree, v, sign);
  }
}

/** A battle's figures from its rounds' records (§5.7): each counter their sum, the maxima their most, and the Heartcap's fraction their least. */
export function foldRounds(rounds: readonly RoundStats[]): RoundStats {
  const out = emptyRoundStats();
  for (const r of rounds) {
    addCounters(tree(out), tree(r), 1);
    for (const k of MOST) out[k] = Math.max(out[k], r[k]);
    out[LEAST] = Math.min(out[LEAST], r[LEAST]);
  }
  return out;
}

/**
 * Closes the round's record for each side (§5.7), once the round is scored and its `roundWon` triggers
 * have fired: what the round added to each of the battle's counters, its damage by unit tag, and its own
 * most and least, from the Elders in its clash, the gold banked and the economy buildings on loam at its
 * Begin, and the Heartcap as the round left it. The battle's damage by tag, maxima and lowest fraction take
 * the record in, and in the round a Heartcap fell, so does the Rout round's damage by tag.
 */
export function closeRound(state: BattleState): void {
  const result = state.rounds.at(-1)!;
  const fell = SIDES.some((s) => state.sides[s].heartcapHp <= 0);
  for (const s of SIDES) {
    const battle = state.stats[s], ss = state.sides[s];
    const { buildingTypes: _types, routRoundDamageByTag: _rout, ...counted } = battle;
    const rec = emptyRoundStats();
    addCounters(tree(rec), tree(counted), 1);
    addCounters(tree(rec), tree(foldRounds(state.rounds.slice(0, -1).map((r) => r.stats[s]))), -1);
    for (const m of MAPS) for (const [k, v] of Object.entries(rec[m])) if (v === 0) delete rec[m][k];
    rec.damageByTag = damageByTag(state, s, rec.damageByBuilding);
    rec.maxEldersAlive = state.clash?.maxElders[s] ?? 0;
    rec.maxGoldBanked = ss.bankedAtBegin;
    rec.maxEconomyOnLoam = economyOnLoam(state, s);
    rec.lowestHeartcapBp = Math.floor((ss.heartcapHp * BP) / ss.heartcapMaxHp);
    for (const [tag, d] of Object.entries(rec.damageByTag)) battle.damageByTag[tag] = (battle.damageByTag[tag] ?? 0) + d;
    battle.maxGoldBanked = Math.max(battle.maxGoldBanked, rec.maxGoldBanked);
    battle.maxEconomyOnLoam = Math.max(battle.maxEconomyOnLoam, rec.maxEconomyOnLoam);
    battle.lowestHeartcapBp = Math.min(battle.lowestHeartcapBp, rec.lowestHeartcapBp);
    if (fell) battle.routRoundDamageByTag = { ...rec.damageByTag };
    result.stats[s] = rec;
  }
}

/** Damage by unit tag (M6-Q1): each building's damage under each tag of its squad's unit, tags in order. A tower's emplacement has none. */
function damageByTag(state: BattleState, side: Side, byBuilding: Record<string, number>): Record<string, number> {
  const c = state.compiled[side], types = state.stats[side].buildingTypes;
  const out: Record<string, number> = {};
  for (const [id, damage] of Object.entries(byBuilding)) {
    const unit = c.buildings[types[id] ?? '']?.squad?.unit;
    for (const tag of (unit ? c.units[unit]?.tags : undefined) ?? []) out[tag] = (out[tag] ?? 0) + damage;
  }
  return Object.fromEntries(Object.entries(out).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)));
}

/** The side's economy buildings on loam plots now. Between Begin and the next opening that's the colony Begin fielded. */
function economyOnLoam(state: BattleState, side: Side): number {
  let n = 0;
  for (const b of state.buildings) {
    if (b.side === side && state.compiled[side].buildings[b.buildingId]?.kind === 'economy' && state.sides[side].plots[b.plot]!.terrain === 'loam') n++;
  }
  return n;
}
