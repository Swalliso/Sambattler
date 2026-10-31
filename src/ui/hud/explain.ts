// What the top band's chips mean (playtest round 3: "what is interest?", "the storm isn't explained
// anywhere"): the tooltips for gold, supply, wave, Sporestorm and territory. Everything is computed from
// render-side state and content, mirroring the sim's own rules (SPEC §6.2–6.4, §4.3) without adding to
// sim state, so the numbers match the chips and the field.
import type { Content } from '../../data/registry.ts';
import type { Atlas } from '../../render/atlas.ts';
import { footprintOnLoam, formatClock, isSuppressed, other } from '../../sim/index.ts';
import type { BattleState } from '../../sim/index.ts';
import { positionalValue } from '../../sim/effects.ts';
import { buildingDef, columnsOwned, interestCapOf } from '../../sim/world.ts';
import { trayOrder } from '../buildingInfo.ts';
import { h } from '../h.ts';
import { uiIcon } from '../icons.ts';
import type { TipSource } from '../tooltip.ts';

export interface IncomeRow { label: string; gold: number; note?: string }

/** Income per income tick by source, as the sim pays it (SPEC §6.2), and the next wave's interest. */
export interface IncomeBreakdown {
  rows: IncomeRow[];
  perTick: number;
  /** The same figure as the gold chip's "/min". */
  perMinute: number;
  /** Income ticks in a minute (12 at 5 s). */
  ticksPerMinute: number;
  everySeconds: number;
  comeback: { gold: number; deficit: number };
  interest: { next: number; cap: number; base: number; per: number; inTicks: number };
}

export function incomeBreakdown(content: Content, state: BattleState): IncomeBreakdown {
  const r = state.rules, cs = state.compiled.player;
  const groups = new Map<string, { count: number; gold: number }>();
  let loam = 0, siege = 0;
  for (const b of state.buildings) {
    if (b.side !== 'player') continue;
    const def = buildingDef(state, b);
    if (!def.economy) continue;
    const e = def.economy;
    const base = e.positional ? Math.max(0, Math.round(positionalValue(state, b, e.positional, 'building.goldPerTick'))) : e.goldPerTick;
    let g = base;
    if (footprintOnLoam(state, b.col, b.row, def.w, def.h)) { const x = Math.floor((g * (100 + cs.loamBonusPct)) / 100); loam += x - g; g = x; }
    if (isSuppressed(state, b)) siege += Math.floor((g * r.besiegedIncomePct) / 100) - g;
    const grp = groups.get(b.buildingId) ?? { count: 0, gold: 0 };
    grp.count++;
    grp.gold += base;
    groups.set(b.buildingId, grp);
  }
  const deficit = columnsOwned(state, other('player')) - columnsOwned(state, 'player');
  const comeback = cs.comebackEnabled && deficit > 0 ? Math.min(r.comebackMax, Math.floor(deficit / r.comebackDivisor)) : 0;
  const rows: IncomeRow[] = [{ label: 'Heartcap stipend', gold: cs.stipend, note: 'always' }];
  for (const [id, g] of groups) rows.push({ label: `${content.buildings[id]?.name ?? id}${g.count > 1 ? ` ×${g.count}` : ''}`, gold: g.gold });
  if (loam) rows.push({ label: 'Rich Loam bonus', gold: loam, note: `+${cs.loamBonusPct}% on loam` });
  if (siege) rows.push({ label: 'Under attack', gold: siege, note: 'halved while hit' });
  rows.push({ label: 'Comeback', gold: comeback, note: deficit > 0 ? `you hold ${deficit} fewer column${deficit === 1 ? '' : 's'}` : 'only while you hold fewer columns' });
  const perTick = rows.reduce((n, x) => n + x.gold, 0);
  const cap = interestCapOf(state, 'player');
  const nextWave = state.phase === 'deploy' ? r.waveTicks : (Math.floor(state.tick / r.waveTicks) + 1) * r.waveTicks;
  return {
    rows, perTick,
    perMinute: Math.round((perTick * r.waveTicks) / r.incomeTicks),
    ticksPerMinute: (60 * r.tickRate) / r.incomeTicks,
    everySeconds: r.incomeTicks / r.tickRate,
    comeback: { gold: comeback, deficit },
    interest: { next: Math.min(cap, Math.floor(state.sides.player.gold / r.interestPer)), cap, base: cs.interestCap, per: r.interestPer, inTicks: nextWave - state.tick },
  };
}

const clock = (state: BattleState, ticks: number) => formatClock(Math.max(0, ticks), state.rules.tickRate);
const pct = (x: number) => `${x < 0 ? '−' : '+'}${Math.round(Math.abs(x) * 100)}%`;
const signed = (n: number) => (n < 0 ? `−${-n}` : n === 0 ? '0' : `+${n}`);
const kbd = (k: string) => h('kbd', null, k);

function head(atlas: Atlas, icon: string, title: string, value: string, cls = ''): HTMLElement {
  return h('div', { class: 'tip-head' }, uiIcon(atlas, icon), h('b', null, title), h('span', { class: `tip-num ${cls}`.trim() }, value));
}
const row = (label: string, value: string | Node, note?: string, cls = '') => h('div', { class: `row ${cls}`.trim() },
  h('span', null, label, note ? h('small', null, ` · ${note}`) : null), typeof value === 'string' ? h('span', null, value) : value);
const sec = (title: string) => h('div', { class: 'tip-sec' }, title);
const para = (...parts: (string | Node)[]) => h('p', null, ...parts);

/** The tray hotkey of a building in the player's kit, as a keycap (or nothing past 9 or outside the kit). */
function hotkey(content: Content, state: BattleState, id: string): Node | null {
  const i = trayOrder(content, state.sides.player.kit).indexOf(id);
  return i >= 0 && i < 9 ? kbd(String(i + 1)) : null;
}

/** The Spore Exchange (or any building that raises the interest cap) in this content. */
function exchangeOf(content: Content): string | null {
  return Object.values(content.buildings).find((b) => b.economy?.interestCapAdd)?.id ?? null;
}

/** Gold: income per minute by source, interest in plain words with the next wave's payout, and the Spore Exchange. */
export function goldTip(content: Content, atlas: Atlas, state: BattleState): TipSource {
  return {
    key: () => `${state.tick}|${state.sides.player.gold}|${state.buildings.length}|${state.phase}`,
    build: () => {
      const inc = incomeBreakdown(content, state);
      const perMin = (g: number) => `${signed(Math.round(g * inc.ticksPerMinute))}/min`;
      const it = inc.interest;
      const full = it.cap * it.per;
      const ex = exchangeOf(content);
      const exDef = ex ? content.buildings[ex]! : null;
      const exAdd = exDef?.economy?.interestCapAdd ?? 0;
      const exStanding = it.cap > it.base;
      const out: Node[] = [
        head(atlas, 'i-gold', 'Gold', String(state.sides.player.gold), 'gold'),
        sec(`Income, paid every ${inc.everySeconds} s`),
        ...inc.rows.map((x) => row(x.label, perMin(x.gold), x.note, x.gold < 0 ? 'cost' : x.gold === 0 ? 'zero' : '')),
        row('Total', h('b', { class: 'gold' }, `${signed(inc.perMinute)}/min`), undefined, 'total'),
        sec('Interest, paid at each new wave'),
        para(`You get 1 gold for every ${it.per} gold you're holding, up to ${it.cap}${exStanding ? ` (${it.base}, plus ${it.cap - it.base} from your ${exDef?.name ?? 'Spore Exchange'})` : ''}. Saving gold earns more.`),
        row(state.phase === 'deploy' ? 'First wave, 1:00 after Begin' : `Next wave, in ${clock(state, it.inTicks)}`, h('b', { class: 'gold' }, `+${it.next}`)),
        h('p', { class: 'muted' }, state.sides.player.gold >= full ? `You hold enough for the full ${it.cap}.` : `Hold ${full} gold to earn the full ${it.cap}.`),
      ];
      if (exDef && (exStanding || state.sides.player.kit.includes(exDef.id))) {
        const key = hotkey(content, state, exDef.id);
        out.push(exStanding
          ? para(`Your ${exDef.name} raises the cap by ${exAdd} while it stands.`)
          : para(`A ${exDef.name} `, ...(key ? [key, ' '] : []), `raises the cap by ${exAdd} while it stands, and pays ${signed(exDef.economy!.goldPerTick)} gold every ${inc.everySeconds} s.`));
      }
      return out;
    },
  };
}

/** The Sporestorm: what it is, when it starts and thickens, and its effect now and per stack. */
export function stormTip(content: Content, atlas: Atlas, state: BattleState): TipSource {
  return {
    key: () => `${state.sporestorm}|${Math.floor(state.tick / state.rules.tickRate)}`,
    build: () => {
      const st = state.rules.storm, n = state.sporestorm;
      const usual = content.balance.sporestorm.startSeconds * state.rules.tickRate;
      const shift = st.startTick - usual;
      const out: Node[] = [
        head(atlas, 'i-storm', 'Sporestorm', n ? `${n} of ${st.maxStacks}` : 'Not yet', n ? 'lit' : ''),
        para(`The Sporestorm ends stalemates. From ${clock(state, st.startTick)} it gains a stack every ${clock(state, st.everyTicks)}, up to ${st.maxStacks}. It hits both sides alike, so battles end sooner.`),
      ];
      if (shift) out.push(h('p', { class: 'note' }, `This battle's storm starts ${clock(state, Math.abs(shift))} ${shift < 0 ? 'early' : 'late'}, from an event.`));
      out.push(sec('Each stack'),
        row('Units and towers', `${pct(st.unitDamage)} damage`),
        row('Heartcap turrets', `${pct(st.turretDamage)} damage`),
        row('Heartcaps', `take ${pct(st.heartcapTaken)} damage`));
      if (n) {
        out.push(sec(`Now, at ${n} stack${n === 1 ? '' : 's'}`),
          row('Units and towers', `${pct(st.unitDamage * n)} damage`, undefined, 'lit'),
          row('Heartcap turrets', `${pct(st.turretDamage * n)} damage`, undefined, 'lit'),
          row('Heartcaps', `take ${pct(st.heartcapTaken * n)} damage`, undefined, 'lit'));
      }
      const nextAt = st.startTick + n * st.everyTicks;
      out.push(h('p', { class: 'muted' }, n >= st.maxStacks ? 'At full strength.'
        : state.phase === 'deploy' ? `Starts ${clock(state, st.startTick)} after Begin.`
          : `${n ? 'Next stack' : 'Starts'} at ${clock(state, nextAt)}, in ${clock(state, nextAt - state.tick)}.`));
      return out;
    },
  };
}

/** Supply: what uses it, what happens at the cap, and how merging and buildings help. */
export function supplyTip(content: Content, atlas: Atlas, state: BattleState): TipSource {
  return {
    key: () => {
      const p = state.sides.player;
      return `${p.supplyUsed}|${p.supplyCap}|${state.buildings.reduce((n, b) => n + (b.side === 'player' && b.holding ? 1 : 0), 0)}|${p.kit.length}`;
    },
    build: () => {
      const p = state.sides.player, cs = state.compiled.player;
      const units = trayOrder(content, p.kit).flatMap((id) => {
        const s = cs.buildings[id]?.spawn;
        const u = s ? cs.units[s.unit] : undefined;
        return u ? [`${content.units[u.id]?.name ?? u.id} ${u.tiers[0].supply}`] : [];
      });
      const waiting = state.buildings.filter((b) => b.side === 'player' && b.holding).length;
      const mult = content.balance.tierSupplyMult;
      const out: Node[] = [
        head(atlas, 'i-supply', 'Supply', `${p.supplyUsed}/${p.supplyCap}`, p.supplyUsed >= p.supplyCap ? 'bad' : ''),
        para('Every living unit uses supply. At the cap, your spawners wait until some of your units fall, then spawn again.'),
      ];
      if (units.length) out.push(sec('Supply per unit'), h('p', null, units.join(' · ')));
      if (waiting) out.push(h('p', { class: 'bad' }, `${waiting} spawner${waiting === 1 ? ' is' : 's are'} waiting for supply now.`));
      if (state.config.flags.merging) out.push(para(`Merging saves supply: a Bloomed unit uses ${mult[1]}× one unit's supply instead of 3×, and an Elder ${mult[2]}× instead of 9×.`));
      const vault = trayOrder(content, p.kit).find((id) => cs.buildings[id]?.utility);
      if (vault) {
        const u = cs.buildings[vault]!.utility!;
        const key = hotkey(content, state, vault);
        out.push(para(`A ${content.buildings[vault]!.name} `, ...(key ? [key, ' '] : []), `raises the cap by ${u.supplyCapAdd} while it stands (at most ${u.maxCount} count).`));
      }
      return out;
    },
  };
}

/** Wave: what each new wave brings (interest, drafts, the storm, the general's reads) and the time limit. */
export function waveTip(content: Content, atlas: Atlas, state: BattleState): TipSource {
  return {
    key: () => `${Math.floor(state.tick / state.rules.tickRate)}|${state.phase}|${state.sides.player.gold}`,
    build: () => {
      const r = state.rules;
      const wave = state.phase === 'deploy' ? 0 : Math.floor(state.tick / r.waveTicks) + 1;
      const inc = incomeBreakdown(content, state);
      const out: Node[] = [
        head(atlas, 'i-wave', wave ? `Wave ${wave}` : 'Deploy', clock(state, state.tick)),
        para(state.phase === 'deploy' ? `Wave 1 starts when you press Begin. A new wave starts every ${clock(state, r.waveTicks)}.`
          : `A new wave starts every ${clock(state, r.waveTicks)}. Wave ${wave + 1} in ${clock(state, inc.interest.inTicks)}.`),
        sec('Each new wave'),
        row('Interest pays out', h('b', { class: 'gold' }, `+${inc.interest.next} next`)),
      ];
      if (state.config.flags.drafts && r.draftWaves.length) {
        const next = r.draftWaves.find((w) => w >= Math.max(1, wave));
        const list = r.draftWaves.length > 1 ? `${r.draftWaves.slice(0, -1).join(', ')} and ${r.draftWaves[r.draftWaves.length - 1]}` : String(r.draftWaves[0]);
        out.push(row(`A draft opens after waves ${list}`, next ? `next after ${next}` : 'none left'));
      }
      out.push(row('The Sporestorm thickens', `from ${clock(state, r.storm.startTick)}`));
      const schedule = state.sides.enemy.ai?.counter?.schedule;
      if (schedule?.length) {
        out.push(row('The general reads your army', schedule.map((c) => clock(state, c.analyzeTick)).join(', ')),
          h('p', { class: 'muted' }, 'It then warns which kind of army it will counter, two waves ahead.'));
      }
      out.push(h('p', { class: 'tip-foot' }, `At ${clock(state, r.timeLimitTicks)}, if both Heartcaps stand, the side holding more columns wins by Decision.`));
      return out;
    },
  };
}

/** Territory: the frontier, how a column is claimed, where you can build, and why columns matter. */
export function territoryTip(content: Content, atlas: Atlas, state: BattleState): TipSource {
  return {
    key: () => `${columnsOwned(state, 'player')}|${columnsOwned(state, 'enemy')}`,
    build: () => {
      const r = state.rules;
      const pc = columnsOwned(state, 'player'), ec = columnsOwned(state, 'enemy');
      const secs = Math.round((r.captureThreshold / r.captureStep / r.tickRate) * 10) / 10;
      const inc = incomeBreakdown(content, state);
      const lanes = state.lanes.length;
      return [
        head(atlas, 'i-advance', 'Territory', `${pc} to ${ec}`),
        para(`The glowing line is your frontier${lanes > 1 ? ' in each lane' : ''}. Your units claim the column just past it by standing there with at least ${r.captureRatio}× the Gray Rot's units for ${secs} s. An enemy building in that column blocks the claim until it falls.`),
        para(`You can build only on your own columns. The farther from home, the more a building costs: +${Math.round(content.balance.supplyLinePerColumn * 100)}% per column past your home columns.`),
        para(inc.comeback.gold > 0 ? `Holding fewer columns pays comeback gold: +${inc.comeback.gold} every ${inc.everySeconds} s now.` : 'Holding fewer columns than the Gray Rot pays comeback gold.'),
        h('p', { class: 'tip-foot' }, `At ${clock(state, r.timeLimitTicks)}, if both Heartcaps stand, the side holding more columns wins by Decision.`),
      ];
    },
  };
}

/** Combat rework `waves`: units waiting inside `side`'s spawners for its next wave. */
export function waitingUnits(state: BattleState, side: 'player' | 'enemy'): number {
  let n = 0;
  for (const b of state.buildings) if (b.side === side) n += b.stored ?? 0;
  return n;
}

/**
 * Combat rework `mixedWave`: the unit types in `side`'s next wave in `lane`, counting the units
 * still inside its spawners and those that already left early for it.
 */
export function nextWaveTypes(state: BattleState, side: 'player' | 'enemy', lane: number): number {
  const beat = state.compiled[side].waveBeatTicks!;
  const next = Math.ceil(state.tick / beat);
  const types = new Set<string>();
  for (const b of state.buildings) {
    if (b.side !== side || b.lane !== lane || !b.stored) continue;
    const unit = state.compiled[side].buildings[b.buildingId]?.spawn?.unit;
    if (unit) types.add(unit);
  }
  for (const u of state.units) if (u.side === side && u.lane === lane && u.wave === next && u.hp > 0) types.add(u.unitId);
  return types.size;
}

/** Combat rework `waves` (a prototype): the beat chip's tip, when the next wave leaves and how Hold works with waves. */
export function beatTip(content: Content, atlas: Atlas, state: BattleState): TipSource {
  return {
    key: () => `${Math.floor(state.tick / state.rules.tickRate)}|${state.phase}|${waitingUnits(state, 'player')}|${state.sporestorm}`,
    build: () => {
      const beat = state.compiled.player.waveBeatTicks!;
      const left = state.phase === 'deploy' ? beat : beat - (state.tick % beat);
      const waiting = waitingUnits(state, 'player');
      const mixed = state.rules.mixed;
      const lanes = state.lanes.map((_, li) => nextWaveTypes(state, 'player', li));
      const kinds = (n: number) => `${n} unit type${n === 1 ? '' : 's'}`;
      return [
        head(atlas, 'i-wave', 'Next wave', clock(state, left)),
        para(`Your spawners keep their units inside until the next wave. Every ${clock(state, beat)}, both sides send their waves out at once; a spawner behind your front one lets its units out early, so they join the wave as it passes.`),
        row('Waiting inside', h('b', null, `${waiting} unit${waiting === 1 ? '' : 's'}`), 'they count toward supply'),
        ...(mixed ? [
          row('Next wave', h('b', null, lanes.length > 1 ? lanes.map((n, li) => `lane ${li + 1}: ${n}`).join(' · ') : kinds(lanes[0] ?? 0)),
            lanes.some((n) => n >= mixed.minTypes) ? 'mixed: it sets out shielded' : `${mixed.minTypes} types make a mixed wave`),
          para(`A lane's wave of ${mixed.minTypes} or more unit types sets out with shields worth ${Math.round(mixed.shieldFrac * 100)}% of each unit's HP. A shield takes damage first and never comes back.`),
        ] : []),
        ...(state.rules.stormWaves ? [
          row('Sporestorm', h('b', null, `waves ×${(Math.round(10 * (1 + state.rules.stormWaves.perStack * state.sporestorm)) / 10).toFixed(1)}`),
            `each storm stack adds ${Math.round(state.rules.stormWaves.perStack * 100)}% (extra units need free supply)`),
        ] : []),
        para('A wave marches at the pace of its slowest unit, with ranged units a tile behind their melee.'),
        h('p', { class: 'tip-foot' }, 'Hold a lane to keep its next wave home for one beat: the beat after sends both waves, and the lane can hold again once they have left.'),
      ];
    },
  };
}
