// Run screens (SPEC §8, §10.5): the route map, spoils, events, the Grove, prompts and the run
// summary. Plain DOM built from the run state; every button calls back into the run controller.
import type { Content } from '../../data/registry.ts';
import type { Atlas } from '../../render/atlas.ts';
import { spriteToCanvas } from '../../render/atlas.ts';
import { formatClock } from '../../sim/index.ts';
import { battlesWon, cardLabel, currentRow, intelDots, outcomeAvailable, upgradeable } from '../../run/index.ts';
import { COUNTER_KINDS } from '../../sim/index.ts';
import { KIND_HINT, KIND_ICON, KIND_NAME, counterLine } from '../doctrine.ts';
import type { BattleRecord, RouteNode, RunState } from '../../run/index.ts';
import { cardView } from '../cards.ts';
import { h } from '../h.ts';

const NODE_ICON: Record<RouteNode['kind'], string> = { battle: 'i-battle', elite: 'i-elite', event: 'i-event', grove: 'i-grove', boss: 'i-boss' };
const NODE_NAME: Record<RouteNode['kind'], string> = { battle: 'Battle', elite: 'Elite battle', event: 'Event', grove: 'Grove', boss: 'Boss' };

const icon = (atlas: Atlas, id: string, cls = 'icon') => {
  const c = spriteToCanvas(atlas, id, 'velvet-bloom');
  c.className = cls;
  return c;
};

/** The strip at the top of every run screen: Heartcap, Spores, Amber, battles, kit and relics. */
export function runBar(content: Content, atlas: Atlas, run: RunState): HTMLElement {
  const hpPct = Math.round((100 * run.heartcap.hp) / run.heartcap.max);
  return h('header', { class: 'runbar', id: 'runbar' },
    h('div', { class: 'stat' }, h('span', { class: 'icon' }, '♥'), h('b', { id: 'run-heartcap' }, `${run.heartcap.hp}/${run.heartcap.max}`), h('span', { class: 'sub' }, `${hpPct}%`)),
    h('div', { class: 'stat' }, h('span', { class: 'icon' }, 'Spores'), h('b', { id: 'run-spores' }, String(run.spores))),
    h('div', { class: 'stat' }, h('span', { class: 'icon' }, 'Amber'), h('b', null, String(run.amber))),
    h('div', { class: 'stat' }, h('span', { class: 'icon' }, 'Battles'), h('b', null, `${battlesWon(run)}/${run.battles.length} won`)),
    h('div', { class: 'kit', id: 'run-kit', title: 'Your kit' },
      ...run.kit.map((id) => {
        const b = content.buildings[id]!;
        const lvl = run.upgrades[id] ?? 0;
        return h('span', { class: 'kitpiece', title: `${b.name}${lvl ? ` (upgrade ${lvl}/3)` : ''}` }, spriteToCanvas(atlas, b.sprite, 'velvet-bloom'), lvl ? h('i', null, String(lvl)) : null);
      })),
    h('div', { class: 'relics', id: 'run-relics' },
      ...(run.relics.length ? run.relics.map((id) => h('span', { class: `relic ${content.relics[id]!.rarity}`, title: content.relics[id]!.text }, content.relics[id]!.name))
        : [h('span', { class: 'muted' }, 'No relics yet')])),
    h('div', { class: 'seed muted' }, `seed ${run.seed}`),
  );
}

function nodeView(content: Content, atlas: Atlas, node: RouteNode, state: 'chosen' | 'open' | 'past' | 'future', onPick: () => void): HTMLElement {
  const details: (HTMLElement | null)[] = [];
  if (node.map) {
    const map = content.maps[node.map]!;
    const general = content.generals[node.general ?? 'scripted'];
    const portrait = spriteToCanvas(atlas, general?.sprite ?? 'g-scripted', 'gray-rot');
    portrait.className = 'portrait';
    details.push(h('div', { class: 'node-map' }, `${map.name} · ${map.lanes.length} lane${map.lanes.length === 1 ? '' : 's'}`));
    details.push(h('div', { class: 'node-general' }, portrait, general?.name ?? 'The Gray Rot'));
  }
  if (node.elite) {
    const e = content.elites[node.elite]!;
    details.push(h('div', { class: 'node-elite' }, h('b', null, e.name), ` ${e.text}`));
  }
  if (node.kind === 'event') details.push(h('div', { class: 'node-sub' }, 'A choice with tradeoffs'));
  if (node.kind === 'grove') details.push(h('div', { class: 'node-sub' }, 'Repair 30% or graft an upgrade'));
  if (node.kind === 'boss') details.push(h('div', { class: 'node-sub' }, 'Win to end the run victorious'));
  return h('button', {
    class: `route-node ${node.kind} ${state}`, 'data-kind': node.kind, disabled: state !== 'open', onclick: onPick,
  }, icon(atlas, NODE_ICON[node.kind], 'node-icon'), h('div', { class: 'node-title' }, NODE_NAME[node.kind]), ...details);
}

/**
 * The player's own intel bars (SPEC §7.6): what the Gray Rot has learned about them, shown fairly so
 * they can plan a pivot before the boss. Four dots per kind; the boss reads the whole run's average.
 */
export function intelBars(atlas: Atlas, run: RunState): HTMLElement {
  if (!run.flags.adaptiveGeneral) return h('div', { class: 'intel off', id: 'route-intel' }, h('span', { class: 'muted' }, 'Adaptive generals are off: no intel is kept.'));
  const intel = run.intel;
  const dots = intel ? intelDots(intel) : null;
  return h('div', { class: 'intel', id: 'route-intel', title: 'Each new general opens against your top kind; the boss reads your whole run' },
    h('span', { class: 'intel-title' }, 'Gray Rot intel on you'),
    ...(dots ? COUNTER_KINDS.map((k) => {
      const c = spriteToCanvas(atlas, KIND_ICON[k], 'velvet-bloom');
      c.className = 'kind-icon';
      return h('span', { class: 'intel-kind', 'data-kind': k, 'data-dots': dots[k], title: `${KIND_HINT[k]} · ${(intel![k] * 100).toFixed(0)}%` },
        c, h('span', null, KIND_NAME[k]), h('span', { class: 'dots' }, '●'.repeat(dots[k]) + '○'.repeat(4 - dots[k])));
    }) : [h('span', { class: 'muted' }, 'None yet: the first general knows nothing about you.')]),
  );
}

export function routeScreen(content: Content, atlas: Atlas, run: RunState, actions: { choose(i: number): void; abandon(): void }): HTMLElement {
  const row = currentRow(run);
  const rows = run.route.map((nodes, r) => {
    const status = r < row ? 'done' : r === row ? 'current' : 'future';
    return h('section', { class: `route-row ${status}`, 'data-row': r },
      h('div', { class: 'row-label' }, `Row ${r + 1}`),
      ...nodes.map((n, i) => nodeView(content, atlas, n,
        r < row ? (run.path[r] === i ? 'chosen' : 'past') : r === row ? 'open' : 'future', () => actions.choose(i))),
    );
  });
  const joined: HTMLElement[] = [];
  rows.forEach((r, i) => { if (i) joined.push(h('div', { class: 'route-link' }, '›')); joined.push(r); });
  return h('div', { class: 'runscreen', id: 'route' },
    runBar(content, atlas, run),
    h('h1', { class: 'runtitle' }, 'The Route', h('span', { class: 'hint' }, ' Pick one node in the highlighted row; every node leads to every node in the next row.')),
    intelBars(atlas, run),
    h('main', { class: 'route', id: 'route-map' }, ...joined),
    h('footer', { class: 'runfoot' },
      h('div', { class: 'hint' }, 'Battles: 4 or 5 per run. A loss by Rout ends the run; a loss by Decision costs 25% of your Heartcap.'),
      h('button', { class: 'btn danger', id: 'abandon', onclick: actions.abandon }, 'Abandon run'),
    ),
  );
}

export function spoilsScreen(content: Content, atlas: Atlas, run: RunState, actions: { pick(card: string | null): void; reroll(): void }): HTMLElement {
  if (run.screen.kind !== 'spoils') throw new Error('not on spoils');
  const p = run.screen.picks[0]!;
  return h('div', { class: 'runscreen', id: 'spoils' },
    runBar(content, atlas, run),
    h('div', { class: 'runpanel' },
      h('h1', { class: 'runtitle' }, p.label === 'Spoils' ? `Spoils of battle ${p.battleIndex}` : 'Elite spoils: a relic',
        h('span', { class: 'hint' }, ` Choose 1 of ${p.offer.length}.`)),
      h('div', { class: 'draft-cards', id: 'spoils-cards' }, ...p.offer.map((c) => cardView(content, atlas, c, run.upgrades, () => actions.pick(c.id)))),
      h('div', { class: 'actions' },
        p.freeRerolls > 0 ? h('button', { class: 'btn', id: 'spoils-reroll', onclick: actions.reroll }, `Reroll (free, ${p.freeRerolls} left)`) : null,
        h('button', { class: 'btn', id: 'spoils-skip', onclick: () => actions.pick(null) }, 'Skip'),
      ),
    ),
  );
}

export function eventScreen(content: Content, atlas: Atlas, run: RunState, actions: { choose(i: number): void }): HTMLElement {
  if (run.screen.kind !== 'event') throw new Error('not at an event');
  const ev = content.events[run.screen.event]!;
  return h('div', { class: 'runscreen', id: 'event' },
    runBar(content, atlas, run),
    h('div', { class: 'runpanel narrow' },
      h('div', { class: 'eventhead' }, icon(atlas, 'i-event', 'node-icon'), h('h1', { class: 'runtitle' }, ev.title)),
      h('p', { class: 'eventtext' }, ev.text),
      h('div', { class: 'choices' }, ...ev.choices.map((c, i) => {
        const ok = outcomeAvailable(content, run, c.outcome);
        return h('button', { class: 'choice', disabled: !ok, onclick: () => actions.choose(i) },
          h('b', null, c.label), h('span', null, c.text), ok ? null : h('span', { class: 'bad' }, 'Not available right now'));
      })),
    ),
  );
}

export function groveScreen(content: Content, atlas: Atlas, run: RunState, actions: { choose(c: 'repair' | 'graft'): void }): HTMLElement {
  const repair = Math.round(run.heartcap.max * content.balance.groveRepair);
  const after = Math.min(run.heartcap.max, run.heartcap.hp + repair);
  const canGraft = upgradeable(content, run).length > 0;
  return h('div', { class: 'runscreen', id: 'grove' },
    runBar(content, atlas, run),
    h('div', { class: 'runpanel narrow' },
      h('div', { class: 'eventhead' }, icon(atlas, 'i-grove', 'node-icon'), h('h1', { class: 'runtitle' }, 'The Grove')),
      h('p', { class: 'eventtext' }, 'A quiet grove where the colony can mend or grow. Choose one.'),
      h('div', { class: 'choices' },
        h('button', { class: 'choice', onclick: () => actions.choose('repair') }, h('b', null, 'Repair'), h('span', null, `Heartcap +${repair} (to ${after}/${run.heartcap.max}).`)),
        h('button', { class: 'choice', disabled: !canGraft, onclick: () => actions.choose('graft') }, h('b', null, 'Graft'),
          h('span', null, canGraft ? '+1 level on an upgrade track you own (you choose).' : 'Every track is maxed.')),
      ),
    ),
  );
}

export function promptScreen(content: Content, atlas: Atlas, run: RunState, actions: { answer(option: string): void }): HTMLElement {
  if (run.screen.kind !== 'prompt') throw new Error('no prompt');
  const p = run.screen.prompt;
  const option = (id: string) => {
    if (p.optionKind === 'relic') {
      const r = content.relics[id]!;
      return h('button', { class: 'choice', 'data-option': id, onclick: () => actions.answer(id) }, h('b', null, r.name), h('span', null, r.text));
    }
    const b = content.buildings[id]!;
    const lvl = run.upgrades[id] ?? 0;
    const text = p.optionKind === 'upgrade' ? `Level ${lvl + 1}: ${content.upgrades[id]!.levels[lvl]!.text}` : b.description;
    return h('button', { class: 'choice withart', 'data-option': id, onclick: () => actions.answer(id) },
      spriteToCanvas(atlas, b.sprite, 'velvet-bloom'), h('b', null, b.name), h('span', null, text));
  };
  return h('div', { class: 'runscreen', id: 'prompt' },
    runBar(content, atlas, run),
    h('div', { class: 'runpanel narrow' },
      h('h1', { class: 'runtitle' }, p.title),
      h('p', { class: 'eventtext' }, p.remaining > 1 ? `${p.text} (${p.remaining} picks left)` : p.text),
      h('div', { class: 'choices' }, ...p.options.map(option)),
    ),
  );
}

// ---- summary ----

const SVG = 'http://www.w3.org/2000/svg';

/** A small front-line sparkline: one line per lane, the front's position across the map over time. */
function sparkline(b: BattleRecord): SVGElement {
  const W = 160, H = 34;
  const root = document.createElementNS(SVG, 'svg');
  root.setAttribute('viewBox', `0 0 ${W} ${H}`);
  root.setAttribute('width', String(W));
  root.setAttribute('height', String(H));
  root.setAttribute('class', 'sparkline');
  const mid = document.createElementNS(SVG, 'line');
  Object.entries({ x1: 0, x2: W, y1: H / 2, y2: H / 2, stroke: '#3b3046' }).forEach(([k, v]) => mid.setAttribute(k, String(v)));
  root.append(mid);
  const colors = ['#c9a2ff', '#7fcf8a', '#f0c85a'];
  b.front.forEach((series, li) => {
    if (series.length < 2) return;
    const pts = series.map((f, i) => `${((i / (series.length - 1)) * W).toFixed(1)},${(H - (f / b.mapWidth) * H).toFixed(1)}`).join(' ');
    const line = document.createElementNS(SVG, 'polyline');
    line.setAttribute('points', pts);
    line.setAttribute('fill', 'none');
    line.setAttribute('stroke', colors[li % colors.length]!);
    line.setAttribute('stroke-width', '1.5');
    root.append(line);
  });
  return root;
}

export function summaryScreen(content: Content, atlas: Atlas, run: RunState, actions: { newRun(): void }): HTMLElement {
  const won = run.outcome === 'victory';
  const damage = new Map<string, number>();
  for (const b of run.battles) for (const [id, v] of Object.entries(b.damageByBuilding)) damage.set(id, (damage.get(id) ?? 0) + v);
  const dmgRows = [...damage.entries()].sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1));
  const maxDmg = Math.max(1, ...dmgRows.map(([, v]) => v));
  const totalTicks = run.battles.reduce((n, b) => n + b.durationTicks, 0);
  return h('div', { class: 'runscreen', id: 'summary' },
    runBar(content, atlas, run),
    h('div', { class: 'runpanel wide' },
      h('div', { class: 'reporthead' },
        h('h1', { class: won ? 'win' : 'loss', id: 'summary-title' }, won ? 'Victory: the boss falls' : 'Defeat'),
        h('div', { class: 'hint' }, `${run.battles.length} battles · ${formatClock(totalTicks)} of battle · seed ${run.seed}`),
      ),
      intelBars(atlas, run),
      h('h3', null, 'Battles'),
      h('table', { class: 'summary-table', id: 'summary-battles' },
        h('tr', null, ...['#', 'Node', 'Map', 'General', 'Result', 'Length', 'Heartcap', 'Front line', 'Countered'].map((t) => h('th', null, t))),
        ...run.battles.map((b) => h('tr', { class: `summary-battle ${b.winner === 'player' ? 'won' : 'lost'}` },
          h('td', null, String(b.index)),
          h('td', null, b.kind === 'elite' ? `Elite (${content.elites[b.elite!]?.name ?? b.elite})` : b.kind === 'boss' ? 'Boss' : 'Battle'),
          h('td', null, `${b.mapName}${b.lanes > 1 ? ` (${b.lanes} lanes)` : ''}`),
          h('td', null, content.generals[b.general]?.name ?? b.general),
          h('td', { class: 'result' }, `${b.winner === 'player' ? 'Won' : 'Lost'} by ${b.by === 'rout' ? 'Rout' : 'Decision'}`),
          h('td', null, formatClock(b.durationTicks)),
          h('td', null, `${b.heartcapBefore} → ${b.heartcapAfter}`),
          h('td', null, sparkline(b)),
          h('td', { class: 'countered' }, (b.counters ?? []).filter((c) => c.active).map((c) => counterLine(content, c)).join('; ') || '-'),
        )),
      ),
      h('div', { class: 'reportgrid' },
        h('section', null,
          h('h3', null, 'Damage by building (whole run)'),
          h('div', { class: 'bars', id: 'summary-damage' }, ...dmgRows.slice(0, 8).map(([id, v]) => h('div', { class: 'bar player' },
            h('span', { class: 'label' }, id === 'turret' ? 'Heartcap turrets' : content.buildings[id]?.name ?? id),
            h('span', { class: 'track' }, h('span', { class: 'fill', style: `width:${((100 * v) / maxDmg).toFixed(1)}%` })),
            h('span', { class: 'value' }, v.toLocaleString('en-US')),
          ))),
        ),
        h('section', null,
          h('h3', null, 'Cards drafted'),
          h('ul', { class: 'cardlist', id: 'summary-cards' }, ...(run.cards.length ? run.cards.map((c) => h('li', null, cardLabel(content, c.card), h('span', { class: 'muted' }, ` · ${c.source}`)))
            : [h('li', { class: 'muted' }, 'None')])),
          h('h3', null, 'Earned'),
          h('table', { id: 'summary-earned' },
            h('tr', null, h('td', null, 'Spores'), h('td', null, String(run.spores))),
            h('tr', null, h('td', null, 'Amber'), h('td', null, String(run.amber))),
            h('tr', null, h('td', null, 'Commander XP'), h('td', null, String(run.xp))),
            h('tr', null, h('td', null, 'Feats'), h('td', null, 'none yet (Milestone 6)')),
            h('tr', null, h('td', null, 'Decay'), h('td', null, '0')),
          ),
        ),
      ),
      h('div', { class: 'actions' }, h('button', { class: 'btn on', id: 'new-run', onclick: actions.newRun }, 'New run')),
    ),
  );
}
