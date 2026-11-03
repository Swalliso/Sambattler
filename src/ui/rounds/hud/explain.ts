// What the top band of a battle in rounds means (SPEC §10.2, playtest round 3: "what is interest?", "the storm
// isn't explained anywhere"): the tooltips for the gold, plots, round and storm chips, the round tally's pips,
// the lane tug and the General's Intent panel. Everything is computed from render-side state and content, through the sim's own functions
// (`incomePreview`, `survivingSupply`, the storm's `stormBpFor`) where it has them, without adding to sim state,
// so the numbers match the band and the field. It stands beside v1's `src/ui/hud/explain.ts`, whose tip layout
// it copies.
import type { Content } from '../../../data/registry.ts';
import type { Atlas } from '../../../render/atlas.ts';
import { incomePreview, survivingSupply } from '../../../sim/rounds/index.ts';
import type { BattleState, LaneResult, Side } from '../../../sim/rounds/index.ts';
import { interestCapOf } from '../../../sim/rounds/systems/economy.ts';
import { capFor, roundOutcome, stormBpFor } from '../../../sim/rounds/systems/victory.ts';
import { trayOrder } from '../../buildingInfo.ts';
import { h } from '../../h.ts';
import { uiIcon } from '../../icons.ts';
import type { TipSource } from '../../tooltip.ts';
import { intentOf, passiveOf } from '../doctrine.ts';

/** A round's storm as the band shows it: ×1.0 to ×2.0 (§6.4). */
export const stormText = (bp: number): string => {
  const x = bp / 10000;
  return `×${Number.isInteger(x * 10) ? x.toFixed(1) : x}`;
};

/** A round's or a lane's result for you (§6.7). */
export type Result = 'won' | 'lost' | 'drawn';
export const resultOf = (winner: Side | null): Result => (winner === 'player' ? 'won' : winner === 'enemy' ? 'lost' : 'drawn');
const RESULT_WORD: Record<Result, string> = { won: 'Won', lost: 'Lost', drawn: 'Drawn' };

function head(atlas: Atlas, icon: string, title: string, value: string, cls = ''): HTMLElement {
  return h('div', { class: 'tip-head' }, uiIcon(atlas, icon), h('b', null, title), h('span', { class: `tip-num ${cls}`.trim() }, value));
}
const row = (label: string, value: string | Node, note?: string, cls = '') => h('div', { class: `row ${cls}`.trim() },
  h('span', null, label, note ? h('small', null, ` · ${note}`) : null), typeof value === 'string' ? h('span', null, value) : value);
const sec = (title: string) => h('div', { class: 'tip-sec' }, title);
const para = (...parts: (string | Node)[]) => h('p', null, ...parts);
const kbd = (k: string) => h('kbd', null, k);
const plus = (n: number) => `+${n}`;
const laneName = (state: BattleState, i: number) => (state.lanes.length > 1 ? `Lane ${i + 1}` : 'The lane');
const seconds = (state: BattleState, ticks: number) => Math.round(ticks / state.rules.tickRate);

/** A building entity's name, from the colony as it stands. */
function buildingName(content: Content, state: BattleState, id: number): string {
  const b = state.buildings.find((x) => x.id === id);
  return b ? content.buildings[b.buildingId]?.name ?? b.buildingId : 'A building since sold';
}

/** A lane's result as a pip's tip gives it: who won, each side's survivors, and whether the cap decided it. */
function laneRow(state: BattleState, i: number, l: LaneResult): HTMLElement {
  const note = `${l.survivors.player} supply to ${l.survivors.enemy}${l.capped ? `, at ${seconds(state, state.rules.clashCapTicks)} s` : ''}`;
  return row(laneName(state, i), RESULT_WORD[resultOf(l.winner)], note, resultOf(l.winner));
}

/**
 * A round's pip (§10.2, A064): each lane's result and survivors, the Heartcap damage both ways, and your squads
 * that dealt the most in its clash ("what killed what", `damageByBuilding`). A round to come gives its storm.
 */
export function pipTip(content: Content, atlas: Atlas, state: BattleState, round: number): TipSource {
  return {
    key: () => String(state.rounds.length),
    build: () => {
      const r = state.rounds[round - 1];
      if (!r) {
        const bp = stormBpFor(state.rules.storm, round);
        return [head(atlas, 'i-wave', `Round ${round}`, 'to come'), para(`The Sporestorm multiplies its Heartcap damage by ${stormText(bp)}.`)];
      }
      const result = resultOf(roundOutcome(r.damage).winner);
      const out: Node[] = [head(atlas, 'i-wave', `Round ${round}`, RESULT_WORD[result], result === 'won' ? 'lit' : '')];
      r.lanes.forEach((l, i) => out.push(laneRow(state, i, l)));
      out.push(sec('Heartcap damage'), row('You dealt', String(r.damage.player)), row('You took', String(r.damage.enemy)));
      const extra = [r.stormBp > 10000 ? `the Sporestorm's ${stormText(r.stormBp)}` : '', r.capped ? 'the round cap cut it' : ''].filter(Boolean);
      if (extra.length) out.push(h('p', { class: 'muted' }, `With ${extra.join(', and ')}.`));
      const top = Object.entries(r.damageByBuilding.player).filter(([, d]) => d > 0)
        .sort((a, b) => b[1] - a[1] || Number(a[0]) - Number(b[0])).slice(0, 3);
      if (top.length) out.push(sec('Your squads that dealt the most'), ...top.map(([id, d]) => row(buildingName(content, state, Number(id)), String(d))));
      return out;
    },
  };
}

/** The lane tug (§10.2, §6.7): each lane's surviving supply, what it is, and how a lane's clash ends and what its winner deals. */
export function tugTip(content: Content, atlas: Atlas, state: BattleState): TipSource {
  return {
    key: () => `${state.tick}|${state.phase}`,
    build: () => {
      const r = state.rules;
      const out: Node[] = [head(atlas, 'i-supply', 'Surviving supply', '')];
      state.lanes.forEach((_, i) => {
        const lock = state.clash?.lanes[i];
        const note = lock?.ended ? RESULT_WORD[resultOf(lock.winner)].toLowerCase() : 'fighting';
        out.push(row(laneName(state, i), `you ${survivingSupply(state, 'player', i)} · it ${survivingSupply(state, 'enemy', i)}`, note));
      });
      out.push(
        para('Each living unit in a lane counts its supply, and a merged unit counts its own. The aftermath counts what\'s left.'),
        para(`A lane's clash ends when one side has no units left, or at ${seconds(state, r.clashCapTicks)} s, when the side with more surviving supply wins it. `
          + `Its winner deals ${r.heartcapDamagePerSupply} × its margin to the loser's Heartcap, siege units counting twice, times the Sporestorm.`),
      );
      return out;
    },
  };
}

export interface IncomeRow { label: string; gold: number; note?: string }

/** The gold tip's figures (§6.2, §10.2): next round's income by source, interest, and the comeback a lost round would add. */
export interface GoldLesson {
  /** Next round's income by source, as `incomePreview` pays it: they add up to `total`, the gold chip's +N. */
  rows: IncomeRow[];
  total: number;
  /** No round follows this one, so no more income comes in. */
  last: boolean;
  /** The comeback gold a lost round would add, until the round is scored, when `rows` count it if you lost. */
  comeback: number;
  /** 1 gold per `per` held, up to `cap` (`base`, raised by each Spore Exchange); `held` pays `now`. */
  interest: { per: number; cap: number; base: number; held: number; now: number };
}

/**
 * Next round's income for you as the battle stands, by source. `incomePreview` gives each source's total, and
 * the economy buildings are split by kind as the sim pays them: each its gold a round, × (100 + the loam
 * bonus)% on a loam plot rounded down, × your income multiplier (§6.2).
 */
export function goldLesson(content: Content, state: BattleState): GoldLesson {
  const inc = incomePreview(state, 'player');
  const c = state.compiled.player, r = state.rules, ss = state.sides.player;
  const mult = (gold: number) => Math.floor((gold * c.incomeBp) / 10000);
  const rows: IncomeRow[] = [{ label: 'Heartcap stipend', gold: inc.stipend, note: 'every round' }];
  const kinds = new Map<string, { count: number; gold: number; loam: number }>();
  for (const b of state.buildings) {
    const e = b.side === 'player' ? c.buildings[b.buildingId]?.economy : undefined;
    if (!e) continue;
    const loam = ss.plots[b.plot]!.terrain === 'loam' ? Math.floor((e.goldPerRound * (100 + c.loamBonusPct)) / 100) - e.goldPerRound : 0;
    const k = kinds.get(b.buildingId) ?? { count: 0, gold: 0, loam: 0 };
    k.count++;
    k.gold += mult(e.goldPerRound + loam);
    k.loam += loam;
    kinds.set(b.buildingId, k);
  }
  for (const [id, k] of kinds) {
    rows.push({ label: `${content.buildings[id]?.name ?? id}${k.count > 1 ? ` ×${k.count}` : ''}`, gold: k.gold, note: k.loam ? `+${k.loam} on loam` : undefined });
  }
  const planning = state.phase === 'planning';
  const held = planning ? ss.gold : ss.bankedAtBegin;
  rows.push({ label: 'Interest', gold: inc.interest, note: planning ? `on the ${held} you hold` : `on the ${held} you banked` });
  if (inc.comeback) rows.push({ label: 'Comeback', gold: inc.comeback, note: 'you lost the round' });
  if (inc.pending) rows.push({ label: 'Pending', gold: inc.pending, note: 'earned in the last clash' });
  const scored = state.phase === 'aftermath' || state.phase === 'ended';
  return {
    rows,
    total: inc.total,
    last: state.round >= r.maxRounds || !!state.outcome,
    comeback: !scored && c.comebackEnabled ? mult(r.comebackGold) : 0,
    interest: { per: r.interestPer, cap: interestCapOf(state, 'player'), base: c.interestCap, held, now: inc.interest },
  };
}

/** The tray hotkey of a building in your kit, as a keycap, or nothing past 9 (the tray's order, §10.2). */
function hotkey(content: Content, state: BattleState, id: string): Node | null {
  const i = trayOrder(content, state.sides.player.kit.map((k) => k.building)).indexOf(id);
  return i >= 0 && i < 9 ? kbd(String(i + 1)) : null;
}

/**
 * Gold (§10.2, §6.2): next round's income by source, totalling the chip's +N, and the comeback a lost round
 * would add; interest in plain words, what your gold now pays, a partial example and what to hold for the full
 * cap; and what a Spore Exchange adds, or that yours raises the cap.
 */
export function goldTip(content: Content, atlas: Atlas, state: BattleState): TipSource {
  return {
    key: () => `${state.round}|${state.phase}|${state.sides.player.gold}|${state.buildings.length}`,
    build: () => {
      const g = goldLesson(content, state);
      const it = g.interest;
      const out: Node[] = [head(atlas, 'i-gold', 'Gold', String(state.sides.player.gold), 'gold')];
      if (g.last) {
        out.push(para('This is the last round, so no more income comes in: whatever you hold now goes unspent.'));
        return out;
      }
      out.push(
        sec(state.phase === 'planning' ? 'Next round, if you Begin now' : 'Next round\'s income'),
        ...g.rows.map((x) => row(x.label, plus(x.gold), x.note, x.gold === 0 ? 'zero' : '')),
        row('Total', h('b', { class: 'gold' }, plus(g.total)), undefined, 'total'),
      );
      if (g.comeback) out.push(h('p', { class: 'muted' }, `Lose this round and the comeback adds ${plus(g.comeback)}.`));
      const ex = Object.values(content.buildings).find((b) => b.economy?.interestCapAdd);
      const raised = it.cap > it.base;
      const full = it.cap * it.per, partial = Math.min(14, it.cap - 1);
      out.push(
        sec('Interest'),
        para(`1 gold for every ${it.per} you're holding when you Begin, up to ${it.cap}${raised ? ` (${it.base}, plus ${it.cap - it.base} from your ${ex?.name ?? 'Spore Exchange'})` : ''}.`),
        row(state.phase === 'planning' ? `Holding ${it.held} pays` : `You banked ${it.held}`, h('b', { class: 'gold' }, plus(it.now))),
        h('p', { class: 'muted' }, `Spend and it pays less: bank ${partial * it.per} for ${plus(partial)}. Hold ${full} for the full ${plus(it.cap)}.`),
      );
      if (ex?.economy) {
        const key = hotkey(content, state, ex.id);
        out.push(raised
          ? para(`Your ${ex.name} raises the cap by ${ex.economy.interestCapAdd} while it stands.`)
          : para(`A ${ex.name} `, ...(key ? [key, ' '] : []), `raises the cap by ${ex.economy.interestCapAdd} while it stands, and pays ${ex.economy.goldPerRound} gold a round.`));
      }
      return out;
    },
  };
}

const RANK_NAME = ['Front rank', 'Second rank', 'Third rank'];

/** Plots (§10.2, §4.6): your plots by rank, which are free, loam, stumps or closed, and how the colony gains plots over a run. */
export function plotsTip(content: Content, atlas: Atlas, state: BattleState): TipSource {
  return {
    key: () => `${state.buildings.length}|${state.round}`,
    build: () => {
      const plots = state.sides.player.plots;
      const open = plots.filter((p) => p.open && p.terrain !== 'stump');
      const out: Node[] = [head(atlas, 'i-supply', 'Plots', `${open.filter((p) => p.building).length}/${open.length}`)];
      const lanes = state.lanes.length;
      for (let lane = 0; lane < lanes; lane++) {
        if (lanes > 1) out.push(sec(`Lane ${lane + 1}`));
        const ranks = [...new Set(plots.filter((p) => p.lane === lane).map((p) => p.rank))].sort((a, b) => a - b);
        for (const rank of ranks) {
          const here = plots.filter((p) => p.lane === lane && p.rank === rank);
          const usable = here.filter((p) => p.open && p.terrain !== 'stump');
          const files = (f: (p: (typeof here)[number]) => boolean) => here.filter(f).map((p) => p.file);
          const notes = [
            files((p) => p.open && p.terrain === 'loam').map((f) => `file ${f} loam`).join(', '),
            files((p) => p.open && p.terrain === 'stump').map((f) => `file ${f} a stump`).join(', '),
          ].filter(Boolean).join(', ');
          const name = RANK_NAME[rank] ?? `Rank ${rank + 1}`;
          out.push(usable.length
            ? row(name, `${usable.filter((p) => !p.building).length} free of ${usable.length}`, notes || undefined)
            : row(name, 'closed', undefined, 'zero'));
        }
      }
      const loam = state.compiled.player.loamBonusPct;
      out.push(
        para(`Each plot takes one building, and fields its squad in the matching slot of your formation: the front rank fights in front. On loam an economy building earns ${loam}% more; a stump takes nothing.`),
        h('p', { class: 'muted' }, 'Over a run the colony gains plots: they open a third rank behind your back rank.'),
      );
      return out;
    },
  };
}

/**
 * The round (§10.2, §6.5, §6.7): a round's three phases, how a lane's clash ends and the 45 s cap, what the
 * loser's Heartcap takes, and the Decision after the last round with the damage each side has dealt so far.
 */
export function roundTip(content: Content, atlas: Atlas, state: BattleState): TipSource {
  return {
    key: () => `${state.round}|${state.phase}|${state.rounds.length}|${state.phase === 'clash' ? Math.floor(state.tick / state.rules.tickRate) : 0}`,
    build: () => {
      const r = state.rules, cap = seconds(state, r.clashCapTicks);
      const out: Node[] = [head(atlas, 'i-wave', 'Round', `${state.round} of ${r.maxRounds}`)];
      if (state.phase === 'clash' && state.clash) out.push(row('Clash clock', `${seconds(state, state.tick - state.clash.startTick)} s of ${cap} s`));
      const capBp = r.roundDamageCap.maxHpBp;
      out.push(
        para('Each round has three phases: you plan with the clock stopped, both armies clash, and the aftermath scores it.'),
        para(`A lane's clash ends when one side has no units left. At ${cap} s the side with more surviving supply wins it.`),
        para(`The lane's winner deals ${r.heartcapDamagePerSupply} × its margin to the loser's Heartcap, siege units counting twice, times the Sporestorm`
          + `${capBp !== undefined ? `, and a Heartcap takes at most ${capBp / 100}% of its max HP a round` : ''}.`),
      );
      if (state.config.flags.drafts) out.push(para('A draft opens in the planning phases of rounds 3, 5 and 7.'));
      const dealt = (s: Side) => state.rounds.reduce((n, x) => n + x.damage[s], 0);
      const pct = (n: number, max: number) => `${Math.round((1000 * n) / max) / 10}%`;
      const pMax = state.sides.player.heartcapMaxHp, eMax = state.sides.enemy.heartcapMaxHp;
      out.push(
        sec(`The Decision after round ${r.maxRounds}`),
        para('If both Heartcaps still stand, the side that dealt the larger share of the other\'s max HP wins.'),
        row('You\'ve dealt', `${dealt('player')}`, `${pct(dealt('player'), eMax)} of ${eMax}`),
        row('It has dealt', `${dealt('enemy')}`, `${pct(dealt('enemy'), pMax)} of ${pMax}`),
      );
      return out;
    },
  };
}

/** The storm (§10.2, §6.4): what the round escalation is, its multiplier now and in each round to come, the cap on a round's damage, and whether an event moved it. */
export function stormTip(content: Content, atlas: Atlas, state: BattleState): TipSource {
  return {
    key: () => `${state.round}|${state.rules.storm.startRound}`,
    build: () => {
      const r = state.rules, st = r.storm, now = stormBpFor(st, state.round);
      const out: Node[] = [head(atlas, 'i-storm', 'Sporestorm', stormText(now), now > 10000 ? 'lit' : '')];
      out.push(para(`The Sporestorm raises the Heartcap damage a round deals: from round ${st.startRound} by ${st.stepBp / 100}% a round, up to ${stormText(st.maxBp)}. `
        + 'It hits both Heartcaps alike, so battles end sooner.'));
      if (st.startRound !== content.balance.rounds.sporestorm.startRound) out.push(para(`An event moved its start to round ${st.startRound} in this battle.`));
      out.push(sec('By round'));
      const before = Math.min(st.startRound, r.maxRounds + 1) - 1;
      if (state.round <= before) {
        out.push(row(before > state.round ? `Rounds ${state.round}–${before}` : `Round ${before}`, stormText(10000), undefined, 'zero'));
      }
      for (let round = Math.max(state.round, st.startRound); round <= r.maxRounds; round++) {
        out.push(row(`Round ${round}${round === state.round ? ' (now)' : ''}`, stormText(stormBpFor(st, round))));
      }
      const capDef = r.roundDamageCap;
      if (capDef.maxHpBp !== undefined) {
        const capOf = (s: Side) => capFor(capDef, state.sides[s].heartcapMaxHp, 10000);
        out.push(h('p', { class: 'muted' }, `A round's damage to a Heartcap is capped at ${capDef.maxHpBp / 100}% of its max HP: ${capOf('player')} of yours, ${capOf('enemy')} of the general's`
          + `${capDef.stormScales ? ', and the storm raises the cap too' : ''}.`));
      }
      return out;
    },
  };
}

/**
 * The General's Intent panel (§7.5, §10.2): the whole of its plan for the round, which the panel cuts short, its
 * passive (§7.7) and its kit. R2a's single battles have no copies (D45), so a card shows the general's
 * `maxOwned` cap where it has one.
 */
export function intentTip(content: Content, atlas: Atlas, state: BattleState): TipSource {
  return {
    key: () => `${state.round}|${state.sides.enemy.ai?.plans.length ?? 0}`,
    build: () => {
      const i = intentOf(content, state);
      const out: Node[] = [h('div', { class: 'tip-head' }, h('b', null, i.name), h('span', { class: 'tip-num' }, i.doctrine))];
      if (i.title) out.push(h('p', { class: 'muted' }, i.title));
      if (i.plan) {
        out.push(
          sec(`Round ${i.plan.round}`),
          row('Planted', i.planted.join(', ') || 'nothing'),
          row('Sold', i.sold.join(', ') || 'nothing'),
          row('Income', plus(i.plan.income), i.plan.round === 1 ? 'none in round 1' : undefined),
          row('Banked', String(i.plan.banked), 'held at Begin, for interest'),
        );
      }
      const passive = passiveOf(content, state);
      out.push(sec('Passive'), para(passive ? passive.text : 'None.'));
      if (passive && !passive.inRounds) out.push(h('p', { class: 'muted' }, 'It does nothing in a battle in rounds yet.'));
      const kit = state.sides.enemy.kit;
      const names = trayOrder(content, kit.map((k) => k.building)).map((id) => {
        const cap = kit.find((k) => k.building === id)?.maxOwned;
        return `${content.buildings[id]?.name ?? id}${cap !== undefined ? ` (at most ${cap})` : ''}`;
      });
      out.push(sec('Kit'), para(names.join(', ')),
        h('p', { class: 'muted' }, 'It plays by your rules: its gold is public, and its whole army is on the field before you plan.'));
      return out;
    },
  };
}
