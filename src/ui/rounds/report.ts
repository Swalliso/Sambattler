// The report of a battle in rounds, for a single battle (SPEC §10.4, §10.5) (A068): the outcome and how it was
// decided, the round in which a Heartcap fell or the Decision after round 9 with each side's damage dealt; the
// round chart, one column a round with the Heartcap damage you dealt rising in violet and what you took
// hanging in ash, each Heartcap's HP after the round as a line, Sporestorm rounds marked and, on Twin Roots,
// each lane's result as a half-pip under its column; then damage by building over the battle, units fielded
// and merged from the fielded record, gold by source with the gold banked at each Begin (R2-Q2), the general's
// counters by round, and the play clock's line, which the app passes in (X6, T128). There are no lives in a
// single battle (R2b). Again replays the seed and Rematch draws a new one, both on the same parameters. Its
// figures are plain functions of the state, which `tests/unit/rounds/report.test.ts` reads. It stands beside
// v1's `src/ui/report.ts`, whose banner art, MVP callout and styles it reuses.
import type { Content } from '../../data/registry.ts';
import type { Atlas } from '../../render/atlas.ts';
import { POWER_SOURCE_ID, SIDES } from '../../sim/rounds/index.ts';
import type { BattleState, Side } from '../../sim/rounds/index.ts';
import { h } from '../h.ts';
import { mvpCallout, mvpOf, outcomeArt } from '../report.ts';
import { KIND_LABEL } from './doctrine.ts';
import { resultOf, stormText } from './hud/explain.ts';
import type { Result } from './hud/explain.ts';

const SVG = 'http://www.w3.org/2000/svg';
const COLOR: Record<Side, string> = { player: '#8a4fd8', enemy: '#7d8a7a' };
const LIGHT: Record<Side, string> = { player: '#c9a2ff', enemy: '#b8c4a8' };
const NAME: Record<Side, string> = { player: 'Velvet Bloom', enemy: 'Gray Rot' };
const HALF: Record<Result, string> = { won: '#8a4fd8', lost: '#7d8a7a', drawn: '#a99bb8' };

function svg(tag: string, attrs: Record<string, string | number>, ...children: (SVGElement | string)[]): SVGElement {
  const el = document.createElementNS(SVG, tag);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, String(v));
  for (const c of children) el.append(c);
  return el;
}

const dealtBy = (state: BattleState, side: Side) => state.rounds.reduce((n, r) => n + r.damage[side], 0);
const pct = (part: number, whole: number) => `${Math.round((100 * part) / Math.max(1, whole))}%`;

/** How the battle was decided, in words (§6.5): the round a Heartcap fell in, or the Decision with each side's damage dealt. */
export function outcomeText(state: BattleState): string {
  const o = state.outcome!;
  const who = o.winner === 'player' ? 'The Velvet Bloom wins' : 'The Gray Rot wins';
  const p = state.sides.player, e = state.sides.enemy;
  if (o.by === 'rout') {
    const fell = p.heartcapHp <= 0 && e.heartcapHp <= 0 ? 'both Heartcaps fell, and then the general takes it'
      : o.winner === 'player' ? "the Gray Rot's Heartcap fell" : 'your Heartcap fell';
    return `${who} by Rout in round ${o.round}: ${fell}.`;
  }
  const pd = dealtBy(state, 'player'), ed = dealtBy(state, 'enemy');
  const how = state.rules.decisionBy === 'damage'
    ? `you dealt ${pd} and it dealt ${ed}`
    : `you dealt ${pd}, ${pct(pd, e.heartcapMaxHp)} of the Gray Rot's ${e.heartcapMaxHp}, and it dealt ${ed}, ${pct(ed, p.heartcapMaxHp)} of your ${p.heartcapMaxHp}`;
  return `${who} by Decision after round ${o.round}: ${how}.`;
}

/** One round's column in the chart (§10.4, A068). */
export interface ChartColumn {
  round: number;
  /** The Heartcap damage you dealt and took in the round, after the storm and the cap: one bar each way. */
  dealt: number;
  taken: number;
  /** Each Heartcap's HP after the round. */
  hp: Record<Side, number>;
  /** A Sporestorm round, with its multiplier in basis points, and whether the round cap cut its damage. */
  storm: boolean;
  stormBp: number;
  capped: boolean;
  /** Each lane's result for you, as half-pips under the column on a map of more than one lane; empty on one lane. */
  lanes: Result[];
}

export function roundChart(state: BattleState): ChartColumn[] {
  return state.rounds.map((r) => ({
    round: r.round, dealt: r.damage.player, taken: r.damage.enemy, hp: { ...r.heartcaps },
    storm: r.stormBp > 10000, stormBp: r.stormBp, capped: r.capped,
    lanes: state.lanes.length > 1 ? r.lanes.map((l) => resultOf(l.winner)) : [],
  }));
}

/** A side's gold by source over the battle (§6.2), leaving out sources that paid nothing. They add up to all it earned. */
export function goldBySource(state: BattleState, side: Side): { label: string; value: number }[] {
  const g = state.stats[side].goldEarned;
  return [
    { label: 'Stipend', value: g.stipend },
    { label: 'Economy buildings', value: g.economy },
    { label: 'Interest', value: g.interest },
    { label: 'Comeback', value: g.comeback },
    { label: 'Clash gold', value: g.pending },
    { label: 'Effects', value: g.effects },
  ].filter((r) => r.value > 0);
}

/** The gold you banked at each round's Begin, which its interest read (R2-Q2). */
export const bankedByRound = (state: BattleState): number[] => state.rounds.map((r) => r.stats.player.maxGoldBanked);

/** Damage by building type over the battle's clashes, largest first, with how many of each the side planted. */
export function damageByType(content: Content, state: BattleState, side: Side): { type: string; label: string; value: number; count: number }[] {
  const st = state.stats[side];
  const by = new Map<string, { value: number; count: number }>();
  for (const [id, dmg] of Object.entries(st.damageByBuilding)) {
    const type = id === String(POWER_SOURCE_ID) ? 'power' : st.buildingTypes[id] ?? '?';
    const cur = by.get(type) ?? { value: 0, count: 0 };
    cur.value += dmg;
    by.set(type, cur);
  }
  for (const type of Object.values(st.buildingTypes)) { const cur = by.get(type); if (cur) cur.count++; }
  return [...by.entries()]
    .map(([type, { value, count }]) => ({
      type, value, count,
      label: type === 'power' ? 'Commander power' : `${content.buildings[type]?.name ?? type}${count > 1 ? ` ×${count}` : ''}`,
    }))
    .sort((a, b) => b.value - a.value || (a.label < b.label ? -1 : 1));
}

/** The units a side fielded over the battle, after each muster, by tier (§14.4's fielded record). */
export function fieldedByTier(state: BattleState, side: Side): [number, number, number] {
  const out: [number, number, number] = [0, 0, 0];
  for (const r of state.rounds) for (const f of r.fielded[side]) out[(f.tier - 1) as 0 | 1 | 2] += f.count;
  return out;
}

/**
 * The round chart (§10.4): a column a round, dealt rising in violet over the midline and taken hanging in ash
 * under it, on one scale; each Heartcap's HP after the round as a line, from full at the top to 0 at the bottom;
 * a Sporestorm round marked with its multiplier; on Twin Roots, a half-pip a lane under each column.
 */
function chartSvg(state: BattleState, width = 900): SVGElement {
  const cols = roundChart(state);
  const slots = Math.max(state.rules.maxRounds, cols.length);
  const pad = { l: 40, r: 10, t: 18, b: state.lanes.length > 1 ? 30 : 20 };
  const height = 210;
  const plotW = width - pad.l - pad.r, plotH = height - pad.t - pad.b;
  const mid = pad.t + plotH / 2;
  const step = plotW / slots, barW = Math.min(36, step * 0.55);
  const top = Math.max(1, ...cols.map((c) => Math.max(c.dealt, c.taken)));
  const k = (plotH / 2 - 4) / top;
  const cx = (i: number) => pad.l + step * (i + 0.5);
  const root = svg('svg', { viewBox: `0 0 ${width} ${height}`, width, height, id: 'report-rounds', role: 'img', 'aria-label': 'Heartcap damage by round' });
  root.append(svg('rect', { x: pad.l, y: pad.t, width: plotW, height: plotH, fill: '#3a2a1f' }));
  root.append(svg('line', { x1: pad.l, x2: pad.l + plotW, y1: mid, y2: mid, stroke: '#ece4f4', 'stroke-opacity': 0.35 }));
  root.append(svg('text', { x: pad.l - 6, y: pad.t + 12, fill: LIGHT.player, 'font-size': 11, 'text-anchor': 'end' }, 'dealt'));
  root.append(svg('text', { x: pad.l - 6, y: pad.t + plotH - 4, fill: LIGHT.enemy, 'font-size': 11, 'text-anchor': 'end' }, 'taken'));
  cols.forEach((c, i) => {
    const g = svg('g', { 'data-round': c.round, 'data-dealt': c.dealt, 'data-taken': c.taken });
    if (c.storm) {
      g.append(svg('rect', { x: cx(i) - step / 2 + 1, y: pad.t, width: step - 2, height: plotH, fill: '#c9a2ff', 'fill-opacity': 0.08 }));
      g.append(svg('text', { x: cx(i), y: pad.t - 5, fill: '#c9a2ff', 'font-size': 11, 'text-anchor': 'middle' }, `☁ ${stormText(c.stormBp)}`));
    }
    g.append(svg('rect', { x: cx(i) - barW / 2, y: mid - c.dealt * k, width: barW, height: c.dealt * k, fill: COLOR.player }));
    g.append(svg('rect', { x: cx(i) - barW / 2, y: mid, width: barW, height: c.taken * k, fill: COLOR.enemy }));
    if (c.dealt) g.append(svg('text', { x: cx(i), y: mid - c.dealt * k - 3, fill: LIGHT.player, 'font-size': 11, 'text-anchor': 'middle' }, String(c.dealt)));
    if (c.taken) g.append(svg('text', { x: cx(i), y: mid + c.taken * k + 12, fill: LIGHT.enemy, 'font-size': 11, 'text-anchor': 'middle' }, String(c.taken)));
    c.lanes.forEach((l, j) => {
      const w = barW / c.lanes.length;
      g.append(svg('rect', { class: `half ${l}`, x: cx(i) - barW / 2 + j * w + 1, y: height - 26, width: w - 2, height: 6, fill: HALF[l], 'data-lane': j }));
    });
    root.append(g);
  });
  // each Heartcap's HP after each round, full at the top
  for (const s of SIDES) {
    const max = state.sides[s].heartcapMaxHp;
    const pts = cols.map((c, i) => `${cx(i)},${pad.t + plotH * (1 - c.hp[s] / max)}`).join(' ');
    if (cols.length) root.append(svg('polyline', { points: pts, fill: 'none', stroke: LIGHT[s], 'stroke-width': 1.5, 'stroke-dasharray': s === 'enemy' ? '4 3' : '' }));
  }
  for (let i = 0; i < slots; i++) root.append(svg('text', { x: cx(i), y: height - 6, fill: '#a99bb8', 'font-size': 11, 'text-anchor': 'middle' }, `R${i + 1}`));
  return root;
}

interface Bar { label: string; value: number; side: Side }

function bars(id: string, rows: Bar[]): HTMLElement {
  const max = Math.max(1, ...rows.map((r) => r.value));
  return h('div', { class: 'bars', id },
    ...rows.map((r) => h('div', { class: `bar ${r.side}` },
      h('span', { class: 'label' }, r.label),
      h('span', { class: 'track' }, h('span', { class: 'fill', style: `width:${((100 * r.value) / max).toFixed(1)}%` })),
      h('span', { class: 'value' }, r.value.toLocaleString('en-US')),
    )));
}

/** The general's counters by round (§7.4, §10.4): each with the buildings it planted for it. */
function counterSection(content: Content, state: BattleState): HTMLElement {
  const plans = state.sides.enemy.ai?.plans.filter((p) => p.counter) ?? [];
  const lines = plans.map((p) => h('li', { class: 'counter-line', 'data-kind': p.counter! },
    `Round ${p.round}: countered your ${KIND_LABEL[p.counter!]}${p.planted.length ? ` with ${p.planted.map((x) => content.buildings[x.building]?.name ?? x.building).join(', ')}` : ''}`));
  if (!lines.length) lines.push(h('li', { class: 'muted' }, 'No counters this battle.'));
  return h('section', { id: 'report-counters' }, h('h3', null, 'The general countered…'), h('ul', { class: 'counterlist' }, ...lines));
}

export interface RoundsReportActions {
  /** The same seed and parameters. */
  again(): void;
  /** A new seed, the same parameters. */
  rematch(): void;
}

/** The play clock's readout (§8.2, X6, RB-Q3; T128), which the app passes in, since `src/ui` can't import `src/app`. */
export interface PlayTimeReadout {
  /** Each planning phase the clock timed, in order, with its active seconds. */
  planning: readonly { round: number; seconds: number }[];
  /** Their median, or null when it timed none. */
  medianPlanningSeconds: number | null;
  /** The battle's active minutes: its planning, clash and aftermath seconds summed. */
  minutes: number;
}

/** The report's play-time line (X6): your planning seconds by round, their median, and the battle's active minutes. */
export function playTimeText(t: PlayTimeReadout): string {
  if (t.medianPlanningSeconds === null) return 'Planning time: none timed, since the preview opened past planning';
  const rounds = t.planning.map((p) => `R${p.round} ${Math.round(p.seconds)} s`).join(' · ');
  return `Planning time by round: ${rounds} · median ${Math.round(t.medianPlanningSeconds)} s · ${t.minutes.toFixed(1)} min of active play`;
}

/** @param playTime the play clock's readout, which the app passes in (T128) */
export function roundsReport(content: Content, state: BattleState, actions: RoundsReportActions, atlas?: Atlas, playTime?: PlayTimeReadout): HTMLElement {
  const o = state.outcome!;
  const won = o.winner === 'player';
  const st = state.stats;
  const sum = (x: Record<string, number>) => Object.values(x).reduce((a, b) => a + b, 0);
  const damage: Bar[] = [], gold: Bar[] = [];
  for (const side of SIDES) {
    for (const r of damageByType(content, state, side).slice(0, 5)) damage.push({ label: r.label, value: r.value, side });
    for (const r of goldBySource(state, side)) gold.push({ ...r, side });
  }
  const mine = damageByType(content, state, 'player').filter((r) => r.type !== 'power' && r.type !== '?');
  const mvp = mvpOf(Object.fromEntries(mine.map((r) => [r.type, r.value])), Object.fromEntries(mine.map((r) => [r.type, r.count])));
  const row = (label: string, f: (s: Side) => string | number) => h('tr', null, h('td', null, label), h('td', null, String(f('player'))), h('td', null, String(f('enemy'))));
  const banked = bankedByRound(state);
  const card = h('div', { class: 'reportcard rounds-report', id: 'report', role: 'dialog', 'aria-label': 'Battle report' },
    h('div', { class: `banner reveal ${won ? 'win' : 'loss'}`, style: '--d:0' },
      outcomeArt(atlas, won),
      h('div', { class: 'banner-text' },
        h('h1', { class: won ? 'win' : 'loss', id: 'end-title' }, won ? 'Victory' : 'Defeat'),
        h('div', { class: 'how', id: 'end-how' }, outcomeText(state)),
        h('div', { class: 'banner-meta' },
          h('span', { class: 'hint' }, `${state.rounds.length} round${state.rounds.length === 1 ? '' : 's'} · you dealt ${dealtBy(state, 'player')} and took ${dealtBy(state, 'enemy')} · ${sum(st.player.goldEarned)} gold earned`))),
      mvpCallout(content, atlas, mvp, 'this battle'),
    ),
    h('div', { class: 'reveal', style: '--d:1' },
      h('h3', null, 'Rounds', h('span', { class: 'legend' }, h('i', { class: 'player' }), 'dealt', h('i', { class: 'enemy' }), 'taken', ' · lines: each Heartcap\'s HP after the round')),
      chartSvg(state),
      counterSection(content, state)),
    h('div', { class: 'reportgrid reveal', style: '--d:2' },
      h('section', null,
        h('h3', null, 'Damage by building', h('span', { class: 'legend' }, h('i', { class: 'player' }), NAME.player, h('i', { class: 'enemy' }), NAME.enemy)),
        bars('report-damage', damage),
        h('h3', null, 'Units'),
        h('table', { id: 'report-units' },
          h('tr', null, h('th', null, ''), h('th', null, NAME.player), h('th', null, NAME.enemy)),
          row('Fielded: base / Bloomed / Elder', (s) => fieldedByTier(state, s).join(' / ')),
          row('Merges: Bloomed / Elder', (s) => `${st[s].merges['2']} / ${st[s].merges['3']}`),
          row('Most Elders at once', (s) => st[s].maxEldersAlive),
          row('Lost', (s) => st[s].unitsLost),
          row('Buildings planted / sold', (s) => `${st[s].buildingsPlanted} / ${st[s].buildingsSold}`),
          row('Heartcap HP', (s) => `${state.sides[s].heartcapHp} / ${state.sides[s].heartcapMaxHp}`),
        ),
      ),
      h('section', null,
        h('h3', null, 'Gold by source', h('span', { class: 'legend' }, h('i', { class: 'player' }), NAME.player, h('i', { class: 'enemy' }), NAME.enemy)),
        bars('report-gold', gold),
        h('div', { class: 'hint', id: 'report-banked' }, `You banked at each Begin: ${banked.join(' · ') || '—'}`),
        playTime ? h('div', { class: 'hint', id: 'report-planning' }, playTimeText(playTime)) : null,
      ),
    ),
    h('div', { class: 'actions' },
      h('button', { class: 'btn', onclick: actions.again, id: 'report-again', title: 'The same battle again, on the same seed' }, 'Again (same seed)'),
      h('button', { class: 'btn primary', onclick: actions.rematch, id: 'report-rematch', title: 'The same parameters on a new seed' }, 'Rematch'),
    ),
  );
  return h('div', { class: 'overlay' }, card);
}
