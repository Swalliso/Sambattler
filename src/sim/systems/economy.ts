// Clock, waves, Sporestorm (SPEC §4.2, §6.4) and income, interest, comeback (SPEC §6.2).
import { aiDraft } from '../ai/draftPolicy.ts';
import { openDraft } from '../draft.ts';
import { fireTriggers, positionalValue } from '../effects.ts';
import { footprintOnLoam } from '../placement.ts';
import { buildingDef, columnsOwned, interestCapOf, isSuppressed } from '../world.ts';
import { SIDES, other } from '../state.ts';
import type { BattleState, BuildingState, CompiledBuilding } from '../state.ts';

/** A building's gold per income tick before loam and siege (positional modifiers resolved for it). */
function baseGold(state: BattleState, b: BuildingState, def: CompiledBuilding): number {
  const e = def.economy!;
  return e.positional ? Math.max(0, Math.round(positionalValue(state, b, e.positional, 'building.goldPerTick'))) : e.goldPerTick;
}

const WAVE = { x: 0, y: 0, lane: 0, sourceBuildingId: 0 };

export function clockSystem(state: BattleState): void {
  const t = state.tick;
  const r = state.rules;
  if (t % r.waveTicks === 0) {
    const n = t / r.waveTicks + 1;
    state.events.push({ t: 'wave', n });
    for (const side of SIDES) fireTriggers(state, side, 'waveStart', WAVE);
    // a draft opens at the end of each draft wave, i.e. as the next wave starts (SPEC §8.3)
    if (state.config.flags.drafts && r.draftWaves.includes(n - 1)) {
      for (const side of SIDES) if (openDraft(state, side)) aiDraft(state, side);
    }
  }
  const st = r.storm;
  if (t >= st.startTick && (t - st.startTick) % st.everyTicks === 0 && state.sporestorm < st.maxStacks) {
    state.sporestorm++;
    state.events.push({ t: 'sporestorm', stacks: state.sporestorm });
  }
}

export function incomeSystem(state: BattleState): void {
  const t = state.tick;
  const r = state.rules;
  if (t > 0 && t % r.incomeTicks === 0) {
    const cols = { player: columnsOwned(state, 'player'), enemy: columnsOwned(state, 'enemy') };
    for (const side of SIDES) {
      const ss = state.sides[side];
      const cs = state.compiled[side];
      const stats = state.stats[side];
      let total = cs.stipend;
      stats.goldEarned.stipend += cs.stipend;
      for (const b of state.buildings) {
        if (b.side !== side) continue;
        const def = buildingDef(state, b);
        if (!def.economy) continue;
        let g = baseGold(state, b, def);
        if (footprintOnLoam(state, b.col, b.row, def.w, def.h)) g = Math.floor((g * (100 + cs.loamBonusPct)) / 100);
        if (isSuppressed(state, b)) g = Math.floor((g * r.besiegedIncomePct) / 100);
        if (g > 0) b.hasProduced = true;
        total += g;
        stats.goldEarned.economy += g;
        const key = String(b.id);
        stats.goldByBuilding[key] = (stats.goldByBuilding[key] ?? 0) + g;
      }
      const deficit = cols[other(side)] - cols[side];
      if (cs.comebackEnabled && deficit > 0) {
        const cb = Math.min(r.comebackMax, Math.floor(deficit / r.comebackDivisor));
        total += cb;
        stats.goldEarned.comeback += cb;
      }
      ss.gold += total;
      state.events.push({ t: 'income', side, amount: total });
    }
  }
  if (t > 0 && t % r.waveTicks === 0) {
    for (const side of SIDES) {
      const ss = state.sides[side];
      const interest = Math.min(interestCapOf(state, side), Math.floor(ss.gold / r.interestPer));
      ss.gold += interest;
      state.stats[side].goldEarned.interest += interest;
      if (interest > 0) state.events.push({ t: 'interest', side, amount: interest });
    }
  }
}

/** Projected gold per minute right now: stipend, economy and comeback per income tick (for the HUD). */
export function incomePerMinute(state: BattleState, side: 'player' | 'enemy'): number {
  const r = state.rules;
  const cs = state.compiled[side];
  let perTick = cs.stipend;
  for (const b of state.buildings) {
    if (b.side !== side) continue;
    const def = buildingDef(state, b);
    if (!def.economy) continue;
    let g = baseGold(state, b, def);
    if (footprintOnLoam(state, b.col, b.row, def.w, def.h)) g = Math.floor((g * (100 + cs.loamBonusPct)) / 100);
    if (isSuppressed(state, b)) g = Math.floor((g * r.besiegedIncomePct) / 100);
    perTick += g;
  }
  const deficit = columnsOwned(state, other(side)) - columnsOwned(state, side);
  if (cs.comebackEnabled && deficit > 0) perTick += Math.min(r.comebackMax, Math.floor(deficit / r.comebackDivisor));
  return Math.round((perTick * r.waveTicks) / r.incomeTicks);
}
