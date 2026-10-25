// Clock, waves, Sporestorm (SPEC §4.2, §6.4) and income, interest, comeback (SPEC §6.2).
import { footprintOnLoam } from '../placement.ts';
import { buildingDef, columnsOwned, isBesieged } from '../world.ts';
import { SIDES, other } from '../state.ts';
import type { BattleState } from '../state.ts';

export function clockSystem(state: BattleState): void {
  const t = state.tick;
  const r = state.rules;
  if (t % r.waveTicks === 0) state.events.push({ t: 'wave', n: t / r.waveTicks + 1 });
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
        let g = def.economy.goldPerTick;
        if (footprintOnLoam(state, b.col, b.row, def.w, def.h)) g = Math.floor((g * (100 + cs.loamBonusPct)) / 100);
        if (isBesieged(state, b)) g = Math.floor((g * r.besiegedIncomePct) / 100);
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
      const interest = Math.min(state.compiled[side].interestCap, Math.floor(ss.gold / r.interestPer));
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
    let g = def.economy.goldPerTick;
    if (footprintOnLoam(state, b.col, b.row, def.w, def.h)) g = Math.floor((g * (100 + cs.loamBonusPct)) / 100);
    if (isBesieged(state, b)) g = Math.floor((g * r.besiegedIncomePct) / 100);
    perTick += g;
  }
  const deficit = columnsOwned(state, other(side)) - columnsOwned(state, side);
  if (cs.comebackEnabled && deficit > 0) perTick += Math.min(r.comebackMax, Math.floor(deficit / r.comebackDivisor));
  return Math.round((perTick * r.waveTicks) / r.incomeTicks);
}
