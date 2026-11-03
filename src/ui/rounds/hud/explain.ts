// What the top band of a battle in rounds means (SPEC §10.2): the tooltips for the round tally's pips and the
// lane tug. Everything is computed from render-side state and content, through the sim's own functions where
// it has them, without adding to sim state, so the numbers match the band and the field. It stands beside
// v1's `src/ui/hud/explain.ts`, whose tip layout it copies.
import type { Content } from '../../../data/registry.ts';
import type { Atlas } from '../../../render/atlas.ts';
import { survivingSupply } from '../../../sim/rounds/index.ts';
import type { BattleState, LaneResult, Side } from '../../../sim/rounds/index.ts';
import { roundOutcome, stormBpFor } from '../../../sim/rounds/systems/victory.ts';
import { h } from '../../h.ts';
import { uiIcon } from '../../icons.ts';
import type { TipSource } from '../../tooltip.ts';

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
