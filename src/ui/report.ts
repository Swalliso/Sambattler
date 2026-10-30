// Battle report (SPEC §10.4, §10.5): the outcome and how it was decided, the front-line graph
// (columns owned over time, one band per lane), damage by building, gold by source, and units
// spawned and merged. Shown when a battle ends and for `scene=report`. The outcome is a banner (on a
// win the Heartcap blooms in lilac spores, on a loss the cap wilts to ash) with the MVP building beside
// it, and the report reveals in stages: the banner, then the front line, then the bars (docs/ui-ux-plan.md C4).
// The banner's rewards (gold earned, and in a run the Spores and Amber) and the gold bars roll up (A6).
import type { Content } from '../data/registry.ts';
import type { Atlas } from '../render/atlas.ts';
import { spriteToCanvas } from '../render/atlas.ts';
import { sporeLayer } from '../render/spores.ts';
import type { BattleState, Side } from '../sim/index.ts';
import { POWER_SOURCE_ID, formatClock } from '../sim/index.ts';
import { columnsOwned } from '../sim/world.ts';
import { h } from './h.ts';
import { uiIcon } from './icons.ts';
import { KIND_LABEL, counterLine, generalName } from './doctrine.ts';
import { rollUp } from './motion.ts';

const SVG = 'http://www.w3.org/2000/svg';
const COLOR: Record<Side, string> = { player: '#8a4fd8', enemy: '#7d8a7a' };
const LIGHT: Record<Side, string> = { player: '#c9a2ff', enemy: '#b8c4a8' };
const NAME: Record<Side, string> = { player: 'Velvet Bloom', enemy: 'Gray Rot' };

function svg(tag: string, attrs: Record<string, string | number>, ...children: (SVGElement | string)[]): SVGElement {
  const el = document.createElementNS(SVG, tag);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, String(v));
  for (const c of children) el.append(c);
  return el;
}

/** How the battle was decided, in words. */
export function outcomeText(state: BattleState): string {
  const o = state.outcome!;
  const won = o.winner === 'player';
  const pc = columnsOwned(state, 'player'), ec = columnsOwned(state, 'enemy');
  let how: string;
  if (o.by === 'rout') {
    how = won ? 'by Rout: the Gray Rot\'s Heartcap fell.' : 'by Rout: your Heartcap fell.';
  } else {
    const p = state.sides.player, e = state.sides.enemy;
    how = pc !== ec
      ? `by Decision at 10:00: ${pc} vs ${ec} columns.`
      : p.heartcapHp * e.heartcapMaxHp !== e.heartcapHp * p.heartcapMaxHp
        ? `by Decision at 10:00: columns tied ${pc}–${ec}; Heartcap health ${Math.round((100 * p.heartcapHp) / p.heartcapMaxHp)}% vs ${Math.round((100 * e.heartcapHp) / e.heartcapMaxHp)}%.`
        : 'by Decision at 10:00: dead even, so the general wins.';
  }
  return `${won ? 'The Velvet Bloom wins' : 'The Gray Rot wins'} ${how}`;
}

/** Columns owned over time, one band per lane: violet climbs from the bottom, gray hangs from the top. */
export function frontLineGraph(state: BattleState, width = 900): SVGElement {
  const W = state.map.width;
  const home = state.map.homeCols;
  const end = Math.max(state.tick, 1);
  const pad = { l: 34, r: 8, t: 6, b: 18 };
  const band = state.lanes.length === 1 ? 96 : state.lanes.length === 2 ? 64 : 48;
  const gap = 8;
  const plotW = width - pad.l - pad.r;
  const height = pad.t + state.lanes.length * band + (state.lanes.length - 1) * gap + pad.b;
  const x = (tick: number) => pad.l + (tick / end) * plotW;
  const root = svg('svg', { viewBox: `0 0 ${width} ${height}`, width, height, id: 'report-frontline', role: 'img', 'aria-label': 'Front line over time' });
  const wave = state.rules.waveTicks;
  state.frontLine.forEach((series, li) => {
    const top = pad.t + li * (band + gap);
    const y = (col: number) => top + band * (1 - col / W);
    root.append(svg('rect', { x: pad.l, y: top, width: plotW, height: band, fill: '#3a2a1f' }));
    const pts = series.length ? series : [[0, home - 1, W - home] as [number, number, number]];
    const last = pts[pts.length - 1]!;
    const steps: [number, number, number][] = [...pts, [end, last[1], last[2]]];
    // step areas: a border holds until the next sample changes it
    let p = `M${x(0)},${y(0)}`, e = `M${x(0)},${y(W)}`;
    for (let i = 0; i < steps.length; i++) {
      const [t, pb, eb] = steps[i]!;
      const prev = i > 0 ? steps[i - 1]! : steps[0]!;
      p += ` L${x(t)},${y(prev[1] + 1)} L${x(t)},${y(pb + 1)}`;
      e += ` L${x(t)},${y(prev[2])} L${x(t)},${y(eb)}`;
    }
    p += ` L${x(end)},${y(0)} Z`;
    e += ` L${x(end)},${y(W)} Z`;
    root.append(svg('path', { d: p, fill: COLOR.player, 'fill-opacity': 0.85 }));
    root.append(svg('path', { d: e, fill: COLOR.enemy, 'fill-opacity': 0.85 }));
    // home zones, the midline and wave beats
    for (const c of [home, W - home]) root.append(svg('line', { x1: pad.l, x2: pad.l + plotW, y1: y(c), y2: y(c), stroke: '#120a16', 'stroke-dasharray': '3 3', 'stroke-width': 1 }));
    root.append(svg('line', { x1: pad.l, x2: pad.l + plotW, y1: y(W / 2), y2: y(W / 2), stroke: '#ece4f4', 'stroke-opacity': 0.35, 'stroke-width': 1 }));
    for (let t = wave; t < end; t += wave) root.append(svg('line', { x1: x(t), x2: x(t), y1: top, y2: top + band, stroke: '#120a16', 'stroke-opacity': 0.5 }));
    if (state.rules.storm.startTick < end) {
      const sx = x(state.rules.storm.startTick);
      root.append(svg('line', { x1: sx, x2: sx, y1: top, y2: top + band, stroke: '#c9a2ff', 'stroke-dasharray': '2 3', 'stroke-width': 1.5 }));
      if (li === 0) root.append(svg('text', { x: sx + 4, y: top + 12, fill: '#c9a2ff', 'font-size': 11 }, 'Sporestorm'));
    }
    root.append(svg('text', { x: pad.l - 6, y: top + 12, fill: LIGHT.enemy, 'font-size': 11, 'text-anchor': 'end' }, 'them'));
    root.append(svg('text', { x: pad.l - 6, y: top + band - 4, fill: LIGHT.player, 'font-size': 11, 'text-anchor': 'end' }, 'you'));
    if (state.lanes.length > 1) root.append(svg('text', { x: pad.l + 4, y: top + band / 2 + 4, fill: '#ece4f4', 'font-size': 11 }, `lane ${li + 1}`));
  });
  const axisY = height - 4;
  for (let t = 0; t <= end; t += wave) root.append(svg('text', { x: x(t), y: axisY, fill: '#a99bb8', 'font-size': 11, 'text-anchor': t === 0 ? 'start' : 'middle' }, formatClock(t, state.rules.tickRate)));
  return root;
}

interface Bar { label: string; value: number; side: Side }

/** `roll`: the values roll up after this many ms (the gold bars, once their stage has revealed). */
function bars(id: string, rows: Bar[], roll?: number): HTMLElement {
  const max = Math.max(1, ...rows.map((r) => r.value));
  return h('div', { class: 'bars', id },
    ...rows.map((r) => h('div', { class: `bar ${r.side}` },
      h('span', { class: 'label' }, r.label),
      h('span', { class: 'track' }, h('span', { class: 'fill', style: `width:${((100 * r.value) / max).toFixed(1)}%` })),
      roll === undefined ? h('span', { class: 'value' }, r.value.toLocaleString('en-US')) : rollUp(h('span', { class: 'value' }), r.value, { delay: roll }),
    )),
  );
}

/** What a battle in a run earns beyond gold (SPEC §8.6); an elite's Amber is a chance, rolled on Continue. */
export interface ReportRewards { spores: number; amber: number; amberChance: number }

/** The banner's rewards: an icon, a number that rolls up, and its word. */
function rewardsRow(atlas: Atlas | undefined, gold: number, rewards: ReportRewards | undefined): HTMLElement {
  const item = (icon: string, cls: string, value: number, word: string, delay: number) => h('span', { class: `reward ${cls}`, 'data-reward': cls },
    atlas ? uiIcon(atlas, icon) : null, rollUp(h('b'), value, { delay }), h('small', null, word));
  return h('div', { class: 'rewards', id: 'report-rewards' },
    item('i-gold', 'gold', gold, 'gold earned', 300),
    rewards ? item('i-spores', 'spores', rewards.spores, 'Spores', 450) : null,
    rewards?.amber ? item('i-amber', 'amber', rewards.amber, 'Amber', 600) : null,
    rewards?.amberChance ? h('span', { class: 'reward chance' }, atlas ? uiIcon(atlas, 'i-amber') : null,
      h('small', null, `${Math.round(rewards.amberChance * 100)}% chance of +1 Amber`)) : null);
}

/** What dealt damage under a damage-by-building key: a building type, the Heartcap turrets or the commander power. */
function sourceType(st: BattleState['stats']['player'], id: string): string {
  return id === '0' ? 'turret' : id === String(POWER_SOURCE_ID) ? 'power' : st.buildingTypes[id] ?? '?';
}

/** The side's commander power by name, for its damage row. */
function powerName(state: BattleState, side: Side): string {
  const id = state.config[side].power;
  return `${(id && state.library.powers?.[id]?.name) ?? 'Commander power'} (power)`;
}

/** What the player's power did this battle: uses, and its damage, columns or trios. */
function powerLine(state: BattleState): string {
  const st = state.stats.player;
  const def = state.library.powers?.[state.config.player.power ?? ''];
  const uses = st.powerUses ?? 0;
  const what = def?.kind === 'tithe' ? `${st.powerGold ?? 0} gold` : def?.kind === 'surge' ? `${st.powerCaptures ?? 0} columns` : def?.kind === 'bloom' ? `${st.powerMerges ?? 0} trios` : `${st.powerDamage ?? 0} damage`;
  return `${uses}× · ${what}`;
}

/** Damage per building type (turrets and the commander power as their own rows), largest first. */
export function damageByType(content: Content, state: BattleState, side: Side): { label: string; value: number }[] {
  const st = state.stats[side];
  const byType = new Map<string, { value: number; count: number }>();
  for (const [id, dmg] of Object.entries(st.damageByBuilding)) {
    const type = sourceType(st, id);
    const cur = byType.get(type) ?? { value: 0, count: 0 };
    cur.value += dmg;
    byType.set(type, cur);
  }
  for (const type of Object.values(st.buildingTypes)) {
    const cur = byType.get(type);
    if (cur) cur.count++;
  }
  return [...byType.entries()]
    .map(([type, { value, count }]) => ({
      label: type === 'turret' ? 'Heartcap turrets' : type === 'power' ? powerName(state, side)
        : `${content.buildings[type]?.name ?? type}${count > 1 ? ` ×${count}` : ''}`,
      value,
    }))
    .sort((a, b) => b.value - a.value || (a.label < b.label ? -1 : 1));
}

/** "The general countered…" (SPEC §7.5): each counter with its time and the buildings it used. */
export function counterSection(content: Content, state: BattleState): HTMLElement | null {
  const ai = state.sides.enemy.ai;
  const c = ai?.counter;
  if (!ai || !c) return null;
  const name = generalName(content, state);
  const lines: HTMLElement[] = [];
  if (ai.opening) {
    lines.push(h('li', null, `${ai.opening.dual ? 'Dual doctrine' : 'Opened'} against your ${ai.opening.kinds.map((k) => KIND_LABEL[k]).join(' and ')}, from the intel on you`));
  }
  for (const rec of c.history) lines.push(h('li', { class: 'counter-line', 'data-kind': rec.kind }, counterLine(content, rec, state.rules.tickRate)));
  if (!lines.length) lines.push(h('li', { class: 'muted' }, 'No counters: the battle ended before the first analysis, or there was nothing to read.'));
  return h('section', { id: 'report-counters' }, h('h3', null, `${name} countered…`), h('ul', { class: 'counterlist' }, ...lines));
}

/** The building type that dealt the most damage (Heartcap turrets and the power aside), its count and its share of the side's damage. */
export interface Mvp { type: string; value: number; count: number; share: number }

export function mvpOf(damage: Record<string, number>, counts: Record<string, number> = {}): Mvp | null {
  const total = Object.values(damage).reduce((a, b) => a + b, 0);
  const best = Object.entries(damage).filter(([id]) => id !== 'turret' && id !== 'power').sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1))[0];
  if (!best || best[1] <= 0) return null;
  return { type: best[0], value: best[1], count: counts[best[0]] ?? 1, share: best[1] / Math.max(1, total) };
}

/** A battle's damage by building type for one side (turrets keyed `turret`), and how many of each type it built. */
export function damageTotals(state: BattleState, side: Side): { damage: Record<string, number>; counts: Record<string, number> } {
  const st = state.stats[side];
  const damage: Record<string, number> = {};
  for (const [id, dmg] of Object.entries(st.damageByBuilding)) {
    const type = sourceType(st, id);
    damage[type] = (damage[type] ?? 0) + dmg;
  }
  const counts: Record<string, number> = {};
  for (const type of Object.values(st.buildingTypes)) counts[type] = (counts[type] ?? 0) + 1;
  return { damage, counts };
}

/** The MVP callout: the building at 2×, its name and what it did. */
export function mvpCallout(content: Content, atlas: Atlas | undefined, mvp: Mvp | null, scope: string): HTMLElement | null {
  if (!mvp) return null;
  const b = content.buildings[mvp.type];
  if (!b) return null;
  return h('div', { class: 'mvp', id: 'mvp' },
    atlas ? Object.assign(spriteToCanvas(atlas, b.sprite, 'velvet-bloom'), { className: 'mvp-art' }) : null,
    h('div', { class: 'mvp-text' },
      h('span', { class: 'eyebrow' }, `MVP building ${scope}`),
      h('b', null, `${b.name}${mvp.count > 1 ? ` ×${mvp.count}` : ''}`),
      h('span', null, `${mvp.value.toLocaleString('en-US')} damage · ${Math.round(mvp.share * 100)}% of yours`)));
}

/**
 * The outcome banner's art: on a win the Heartcap at 2× with lilac spores rising off it; on a loss the cap
 * wilted to ash, with ash drifting down.
 */
export function outcomeArt(atlas: Atlas | undefined, won: boolean): HTMLElement {
  const box = h('div', { class: `outcome-art ${won ? 'win' : 'loss'}`, 'aria-hidden': 'true' });
  if (!atlas) return box;
  const still = document.documentElement.classList.contains('still');
  const art = won
    ? h('div', { class: 'bloom' }, Object.assign(spriteToCanvas(atlas, 'heartcap-cap', 'velvet-bloom'), { className: 'cap' }),
      Object.assign(spriteToCanvas(atlas, 'heartcap-stalk', 'velvet-bloom'), { className: 'stalk' }))
    : Object.assign(spriteToCanvas(atlas, 'hc-wilt', 'velvet-bloom'), { className: 'wilt' });
  box.append(art);
  const color = getComputedStyle(document.documentElement).getPropertyValue(won ? '--lilac' : '--rot-light').trim();
  requestAnimationFrame(() => sporeLayer(box, { scale: 2, density: won ? 40 : 26, rate: won ? 2.2 : -1.2, still, color, seed: won ? 0xb100 : 0xa54 }));
  return box;
}

export function battleReport(content: Content, state: BattleState, actions: { again: () => void; rematch: () => void; continueRun?: () => void }, atlas?: Atlas, rewards?: ReportRewards): HTMLElement {
  const o = state.outcome!;
  const won = o.winner === 'player';
  const st = state.stats;
  const sum = (x: Record<string, number>) => Object.values(x).reduce((a, b) => a + b, 0);
  const damage: Bar[] = [];
  for (const side of ['player', 'enemy'] as Side[]) {
    for (const r of damageByType(content, state, side).slice(0, 5)) damage.push({ ...r, side });
  }
  const gold: Bar[] = [];
  const SOURCES: [keyof typeof st.player.goldEarned, string][] = [['stipend', 'Stipend'], ['economy', 'Economy'], ['interest', 'Interest'], ['comeback', 'Comeback']];
  for (const side of ['player', 'enemy'] as Side[]) {
    for (const [k, label] of SOURCES) if (st[side].goldEarned[k] > 0) gold.push({ label, value: st[side].goldEarned[k], side });
  }
  const row = (label: string, f: (s: Side) => string | number) => h('tr', null, h('td', null, label), h('td', null, String(f('player'))), h('td', null, String(f('enemy'))));
  const totals = damageTotals(state, 'player');
  const card = h('div', { class: 'reportcard', id: 'report', role: 'dialog', 'aria-label': 'Battle report' },
    h('div', { class: `banner reveal ${won ? 'win' : 'loss'}`, style: '--d:0' },
      outcomeArt(atlas, won),
      h('div', { class: 'banner-text' },
        h('h1', { class: won ? 'win' : 'loss', id: 'end-title' }, won ? 'Victory' : 'Defeat'),
        h('div', { class: 'how', id: 'end-how' }, outcomeText(state)),
        h('div', { class: 'banner-meta' },
          rewardsRow(atlas, sum(st.player.goldEarned), rewards),
          h('span', { class: 'hint' }, `Battle length ${formatClock(o.tick, state.rules.tickRate)} · Sporestorm ${state.sporestorm} stack${state.sporestorm === 1 ? '' : 's'}`))),
      mvpCallout(content, atlas, mvpOf(totals.damage, totals.counts), 'this battle'),
    ),
    h('div', { class: 'reveal', style: '--d:1' },
      h('h3', null, 'Front line'),
      frontLineGraph(state),
      counterSection(content, state)),
    h('div', { class: 'reportgrid reveal', style: '--d:2' },
      h('section', null,
        h('h3', null, 'Damage by building', h('span', { class: 'legend' }, h('i', { class: 'player' }), NAME.player, h('i', { class: 'enemy' }), NAME.enemy)),
        bars('report-damage', damage),
      ),
      h('section', null,
        h('h3', null, 'Gold by source'),
        bars('report-gold', gold, 700),
        h('h3', null, 'Units'),
        h('table', { id: 'report-units' },
          h('tr', null, h('th', null, ''), h('th', null, NAME.player), h('th', null, NAME.enemy)),
          row('Spawned', (s) => sum(st[s].spawned)),
          row('Merged: Bloomed / Elder', (s) => `${st[s].merges['2']} / ${st[s].merges['3']}`),
          row('Most Elders at once', (s) => st[s].maxEldersAlive),
          row('Lost', (s) => st[s].unitsLost),
          row('Buildings built / lost', (s) => `${st[s].buildingsBuilt} / ${st[s].buildingsLost}`),
          row('Heartcap HP', (s) => `${state.sides[s].heartcapHp} / ${state.sides[s].heartcapMaxHp}`),
          st.player.powerUses !== undefined ? row(powerName(state, 'player').replace(' (power)', ' used'), (s) => (s === 'player' ? powerLine(state) : '—')) : null,
        ),
      ),
    ),
    actions.continueRun
      ? h('div', { class: 'actions' }, h('button', { class: 'btn primary', onclick: actions.continueRun, id: 'continue-run' }, 'Continue the run'))
      : h('div', { class: 'actions' },
        h('button', { class: 'btn', onclick: actions.rematch, id: 'rematch' }, 'Rematch (same seed)'),
        h('button', { class: 'btn primary', onclick: actions.again, id: 'play-again' }, 'Play again'),
      ),
  );
  return h('div', { class: 'overlay' }, card);
}
