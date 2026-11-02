// The modifier DSL in rounds (SPEC §14.2, §14.6): v1's stat resolution over the stats, selectors, triggers
// and actions a battle in rounds reads. Modifiers resolve in v1's order: sum every `add`, multiply every
// `mul`, then the last `set` wins (§14.1). Content on a stat rounds retire, or on a trigger or action they
// don't run, compiles to nothing and is listed by its source (plan Call 19). It stands beside v1's
// `src/sim/effects.ts`, whose data-only helpers it imports, until R2b moves it there.
import { UNIT_STATS } from '../../data/schema.ts';
import type { ModifierDef, SelectorDef } from '../../data/schema.ts';
import { ROUND_TRIGGERS, SIDES, other } from './state.ts';
import type { BattleModifier, IgnoredEffect, Library, LibraryUnit, RoundAction, RoundTrigger, RoundTriggerOn, Side } from './state.ts';

export { battleModifiers, resolveStat } from '../effects.ts';

/**
 * The stats a battle in rounds reads (§14.2): v1's unit and tower stats, and the side and battle stats v2
 * keeps. A modifier on any other compiles to nothing and is listed: v1's building HP, spawn timers, spawn
 * counts and gold a tick, the supply cap, capture, supply lines, turrets, power cooldowns and waves.
 */
export const ROUND_STATS: readonly string[] = [
  ...UNIT_STATS, 'tower.damage', 'tower.range', 'tower.splashRadius',
  'side.interestCap', 'side.stipend', 'side.startingGold', 'side.sellRefund', 'side.knitTicks', 'side.mergeRadius',
  'side.rerollCost', 'side.draftCards', 'side.heartcapMaxHp', 'side.comebackEnabled', 'side.loamBonus',
  'battle.sporestormStart',
];

export interface RoundEffects { mods: ModifierDef[]; triggers: RoundTrigger[]; ignored: IgnoredEffect[] }

const isRoundTrigger = (on: string): on is RoundTriggerOn => (ROUND_TRIGGERS as readonly string[]).includes(on);

/**
 * Every modifier and trigger in force for each side, from the battle's modifiers in order. A modifier
 * marked `side: opponent` lands on the other side; `battle.*` stats are left to `battleModifiers`. A
 * trigger keeps only the actions rounds run. Each thing set aside is listed once, on the side it would
 * have reached. R2a's single battles have no relics or upgrade levels, so nothing else contributes.
 */
export function collectRoundEffects(battle: readonly BattleModifier[] = []): Record<Side, RoundEffects> {
  const out: Record<Side, RoundEffects> = { player: { mods: [], triggers: [], ignored: [] }, enemy: { mods: [], triggers: [], ignored: [] } };
  const ignore = (s: Side, e: IgnoredEffect) => {
    const key = JSON.stringify(e);
    if (!out[s].ignored.some((x) => JSON.stringify(x) === key)) out[s].ignored.push(e);
  };
  for (const bm of battle) {
    for (const s of SIDES) {
      if (bm.side !== s && bm.side !== 'both') continue;
      for (const m of bm.effects.modifiers ?? []) {
        if (m.stat.startsWith('battle.')) continue;
        const to = m.side === 'opponent' ? other(s) : s;
        if (ROUND_STATS.includes(m.stat)) out[to].mods.push(m);
        else ignore(to, { source: bm.source, stat: m.stat });
      }
      for (const t of bm.effects.triggers ?? []) {
        if (!isRoundTrigger(t.on)) { ignore(s, { source: bm.source, trigger: t.on }); continue; }
        const run: RoundAction[] = [];
        for (const a of t.do) {
          if ('gainGold' in a) run.push({ gainGold: a.gainGold });
          else ignore(s, { source: bm.source, action: Object.keys(a)[0]! });
        }
        if (run.length) out[s].triggers.push({ on: t.on, ...(t.if ? { if: t.if } : {}), do: run });
      }
    }
  }
  return out;
}

export type Match = (w: SelectorDef | undefined) => boolean;

/** A selector that depends on where a building stands. Side-wide stats never meet one. */
const placed = (w: SelectorDef): boolean => w.onLoam !== undefined || w.zone !== undefined || w.adjacentOwnBuildingsGte !== undefined;

/** Selector match for a unit at a tier. `building` matches the units that building's squad fields. */
export function unitMatcher(lib: Library, u: LibraryUnit, tier: number): Match {
  return (w) => {
    if (!w) return true;
    if (w.unit !== undefined && w.unit !== u.id) return false;
    if (w.tag !== undefined && !u.tags.includes(w.tag)) return false;
    if (w.tier !== undefined && w.tier !== tier) return false;
    if (w.building !== undefined && lib.buildings[w.building]?.squad?.unit !== u.id) return false;
    return !placed(w);
  };
}

/** Selector match for a building: its id, its squad's unit and that unit's tags. */
export function buildingMatcher(lib: Library, id: string): Match {
  const unitId = lib.buildings[id]?.squad?.unit;
  const unit = unitId ? lib.units[unitId] : undefined;
  return (w) => {
    if (!w) return true;
    if (w.building !== undefined && w.building !== id) return false;
    if (w.unit !== undefined && w.unit !== unitId) return false;
    if (w.tag !== undefined && !unit?.tags.includes(w.tag)) return false;
    return !placed(w);
  };
}
