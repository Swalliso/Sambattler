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
import type { RunEffect } from '../../data/schema.ts';
import { cardView } from '../cards.ts';
import { mvpCallout, mvpOf, outcomeArt } from '../report.ts';
import { h } from '../h.ts';
import { uiIcon } from '../icons.ts';
import { rollUp } from '../motion.ts';
import { uiScale } from '../scale.ts';

const NODE_ICON: Record<RouteNode['kind'], string> = { battle: 'i-battle', elite: 'i-elite', event: 'i-event', grove: 'i-grove', boss: 'i-boss' };
const NODE_NAME: Record<RouteNode['kind'], string> = { battle: 'Battle', elite: 'Elite battle', event: 'Event', grove: 'Grove', boss: 'Boss' };
const RARITY_NAME = { common: 'Common', uncommon: 'Uncommon', rare: 'Rare' } as const;

const icon = (atlas: Atlas, id: string, cls = 'icon') => {
  const c = spriteToCanvas(atlas, id, 'velvet-bloom');
  c.className = cls;
  return c;
};

/** A relic as a pixel badge (its shape and rim name the rarity) with a tooltip naming it, on hover or focus. */
export function relicBadge(content: Content, atlas: Atlas, id: string): HTMLElement {
  const r = content.relics[id]!;
  const art = icon(atlas, `r-${r.rarity}`, 'badge');
  art.setAttribute('aria-hidden', 'true');
  return h('span', { class: `relic ${r.rarity}`, tabindex: 0, 'data-relic': id, 'aria-label': `${r.name} (${RARITY_NAME[r.rarity]} relic): ${r.text}` },
    art,
    h('span', { class: 'relic-tip', role: 'tooltip' },
      h('span', { class: 'tip-head' }, h('b', null, r.name), h('span', { class: `rarity ${r.rarity}` }, RARITY_NAME[r.rarity])),
      h('span', null, r.text)));
}

/** The strip at the top of every run screen: Heartcap, Spores, Amber, battles won, the kit and the relics. */
export function runBar(content: Content, atlas: Atlas, run: RunState): HTMLElement {
  const pct = run.heartcap.hp / run.heartcap.max;
  return h('header', { class: 'runbar', id: 'runbar' },
    h('div', { class: `rb-heart${pct < 1 / 3 ? ' low' : ''}`, title: 'Your Heartcap: it carries its damage from battle to battle' },
      uiIcon(atlas, 'i-heart'),
      h('div', { class: 'rb-hp' },
        h('span', { class: 'rb-num' }, h('b', { id: 'run-heartcap' }, `${run.heartcap.hp}/${run.heartcap.max}`), h('small', null, `${Math.round(pct * 100)}%`)),
        h('span', { class: 'rb-bar', role: 'img', 'aria-label': `Heartcap ${Math.round(pct * 100)}%` }, h('i', { style: `width:${(pct * 100).toFixed(1)}%` })))),
    h('div', { class: 'rb-stat', title: 'Spores: spent in the Underroot (Milestone 6)' }, uiIcon(atlas, 'i-spores'), h('b', { id: 'run-spores' }, String(run.spores)), h('small', null, 'Spores')),
    h('div', { class: 'rb-stat', title: 'Amber: rare currency, spent in the Underroot (Milestone 6)' }, uiIcon(atlas, 'i-amber'), h('b', null, String(run.amber)), h('small', null, 'Amber')),
    h('div', { class: 'rb-stat' }, h('b', null, `${battlesWon(run)}/${run.battles.length}`), h('small', null, 'battles won')),
    h('div', { class: 'rb-group' }, h('span', { class: 'eyebrow' }, 'Kit'),
      h('div', { class: 'kit', id: 'run-kit' },
        ...run.kit.map((id) => {
          const b = content.buildings[id]!;
          const lvl = run.upgrades[id] ?? 0;
          return h('span', { class: 'kitpiece', title: `${b.name}${lvl ? ` (upgrade ${lvl}/3)` : ''}` }, spriteToCanvas(atlas, b.sprite, 'velvet-bloom'), lvl ? h('i', null, String(lvl)) : null);
        }))),
    h('div', { class: 'rb-group relics-group' }, h('span', { class: 'eyebrow' }, 'Relics'),
      h('div', { class: 'relics', id: 'run-relics' },
        ...(run.relics.length ? run.relics.map((id) => relicBadge(content, atlas, id)) : [h('span', { class: 'muted' }, 'None yet')]))),
  );
}

/** The run screens' footer: a note or legend on the left; the seed and the way out on the right. */
export function runFoot(run: RunState, left: Node | null, ...buttons: (HTMLElement | null)[]): HTMLElement {
  return h('footer', { class: 'runfoot' },
    h('div', { class: 'runfoot-left' }, left),
    h('div', { class: 'runfoot-right' }, h('span', { class: 'seed', id: 'run-seed' }, `seed ${run.seed}`), ...buttons));
}

type NodeState = 'chosen' | 'open' | 'past' | 'future';
const POD_FRAME: Record<NodeState, number> = { future: 0, past: 0, open: 1, chosen: 2 };

function nodeView(content: Content, atlas: Atlas, node: RouteNode, state: NodeState, r: number, i: number, onPick: () => void): HTMLElement {
  const details: (HTMLElement | null)[] = [];
  if (node.map) {
    const map = content.maps[node.map]!;
    const general = content.generals[node.general ?? 'scripted'];
    const portrait = spriteToCanvas(atlas, general?.sprite ?? 'g-scripted', 'gray-rot');
    portrait.className = 'portrait';
    details.push(h('span', { class: 'node-map' }, `${map.name} · ${map.lanes.length} lane${map.lanes.length === 1 ? '' : 's'}`));
    details.push(h('span', { class: 'node-general' }, portrait, general?.name ?? 'The Gray Rot'));
  }
  if (node.elite) {
    const e = content.elites[node.elite]!;
    details.push(h('span', { class: 'node-elite' }, h('b', null, e.name), ` ${e.text}`));
  }
  if (node.kind === 'event') details.push(h('span', { class: 'node-sub' }, 'A choice with tradeoffs'));
  if (node.kind === 'grove') details.push(h('span', { class: 'node-sub' }, 'Repair 30% or graft an upgrade'));
  if (node.kind === 'boss') details.push(h('span', { class: 'node-sub' }, 'Win to end the run victorious'));
  const pod = spriteToCanvas(atlas, node.kind === 'boss' ? 'p-pod-boss' : 'p-pod', 'velvet-bloom', POD_FRAME[state]);
  pod.className = 'pod-art';
  const open = state === 'open';
  return h('button', {
    class: `route-node ${node.kind} ${state}`, 'data-kind': node.kind, 'data-node': `${r}:${i}`,
    'aria-disabled': open ? null : 'true', tabindex: open ? null : -1, onclick: () => { if (open) onPick(); },
  }, h('span', { class: 'pod' }, pod, icon(atlas, NODE_ICON[node.kind], 'node-icon')),
  h('span', { class: 'node-title' }, NODE_NAME[node.kind]), ...details);
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
        c, h('span', null, KIND_NAME[k]),
        h('span', { class: 'dots', role: 'img', 'aria-label': `${dots[k]} of 4` }, ...[0, 1, 2, 3].map((d) => h('i', { class: d < dots[k] ? 'on' : '' }))));
    }) : [h('span', { class: 'muted' }, 'None yet: the first general knows nothing about you.')]),
  );
}

const SVG = 'http://www.w3.org/2000/svg';

/**
 * The hyphae between the pods (docs/ui-ux-plan.md C1): a thread from every node to every node in the next
 * row, and from the colony's start to the first row. The path you walked glows violet, the threads you can
 * take now glow lilac, the rest stay dim; hovering or focusing a pod lights its own threads. Threads are
 * drawn after layout, from the pods' centres, and again whenever the map changes size.
 */
function hyphae(map: HTMLElement, run: RunState, row: number): void {
  const svg = document.createElementNS(SVG, 'svg');
  svg.setAttribute('class', 'hyphae');
  svg.setAttribute('aria-hidden', 'true');
  map.prepend(svg);
  const origin = h('span', { class: 'route-origin', 'aria-hidden': 'true' });
  map.append(origin);
  const draw = () => {
    const box = map.getBoundingClientRect();
    if (!box.width) return;
    const ui = uiScale();
    const centre = (el: Element): [number, number] => {
      const r = el.getBoundingClientRect();
      return [(r.left + r.width / 2 - box.left) / ui, (r.top + r.height / 2 - box.top) / ui];
    };
    const pods = run.route.map((nodes, r) => nodes.map((_, i) => centre(map.querySelector(`[data-node="${r}:${i}"] .node-icon`)!)));
    const w = box.width / ui, hgt = box.height / ui;
    svg.setAttribute('viewBox', `0 0 ${w} ${hgt}`);
    const o: [number, number] = [Math.max(10, pods[0]![0]![0] - 110), hgt / 2];
    origin.style.left = `${o[0]}px`;
    origin.style.top = `${o[1]}px`;
    const paths: SVGPathElement[] = [];
    const thread = (a: [number, number], b: [number, number], cls: string, from: string, to: string) => {
      const p = document.createElementNS(SVG, 'path');
      const dx = (b[0] - a[0]) * 0.5;
      p.setAttribute('d', `M${a[0].toFixed(1)} ${a[1].toFixed(1)} C${(a[0] + dx).toFixed(1)} ${a[1].toFixed(1)}, ${(b[0] - dx).toFixed(1)} ${b[1].toFixed(1)}, ${b[0].toFixed(1)} ${b[1].toFixed(1)}`);
      p.setAttribute('class', `thread ${cls}`);
      p.dataset.from = from;
      p.dataset.to = to;
      paths.push(p);
    };
    // from the colony's start to the first row
    pods[0]!.forEach((b, j) => thread(o, b, row === 0 ? 'open' : run.path[0] === j ? 'walked' : 'past', 'start', `0:${j}`));
    for (let r = 0; r + 1 < pods.length; r++) {
      pods[r]!.forEach((a, i) => pods[r + 1]!.forEach((b, j) => {
        const cls = r + 1 < row ? (run.path[r] === i && run.path[r + 1] === j ? 'walked' : 'past')
          : r + 1 === row ? (run.path[r] === i ? 'open' : 'past') : 'future';
        thread(a, b, cls, `${r}:${i}`, `${r + 1}:${j}`);
      }));
    }
    // dim threads first, so lit ones cross over them
    const order = ['future', 'past', 'walked', 'open'];
    paths.sort((a, b) => order.indexOf(a.classList[1]!) - order.indexOf(b.classList[1]!));
    svg.replaceChildren(...paths);
  };
  new ResizeObserver(draw).observe(map);
  const light = (node: string | null) => {
    for (const p of svg.querySelectorAll<SVGPathElement>('path')) p.classList.toggle('hot', node !== null && (p.dataset.from === node || p.dataset.to === node));
  };
  for (const n of map.querySelectorAll<HTMLElement>('.route-node')) {
    n.addEventListener('pointerenter', () => light(n.dataset.node!));
    n.addEventListener('pointerleave', () => light(null));
    n.addEventListener('focus', () => light(n.dataset.node!));
    n.addEventListener('blur', () => light(null));
  }
}

/** The node legend: each kind's icon and name. */
function routeLegend(atlas: Atlas): HTMLElement {
  return h('div', { class: 'legend route-legend', id: 'route-legend', 'aria-label': 'Node types' },
    ...(Object.keys(NODE_ICON) as RouteNode['kind'][]).map((k) => h('span', { class: `legend-item ${k}` }, uiIcon(atlas, NODE_ICON[k]), NODE_NAME[k])),
    h('span', { class: 'legend-item thread-walked' }, h('i'), 'Your path'),
    h('span', { class: 'legend-item thread-open' }, h('i'), 'Open now'));
}

export function routeScreen(content: Content, atlas: Atlas, run: RunState, actions: { choose(i: number): void; abandon(): void; toTitle?: () => void }): HTMLElement {
  const row = currentRow(run);
  const rows = run.route.map((nodes, r) => {
    const status = r < row ? 'done' : r === row ? 'current' : 'future';
    return h('section', { class: `route-row ${status}`, 'data-row': r, 'aria-label': `Row ${r + 1}` },
      ...nodes.map((n, i) => nodeView(content, atlas, n,
        r < row ? (run.path[r] === i ? 'chosen' : 'past') : r === row ? 'open' : 'future', r, i, () => actions.choose(i))),
    );
  });
  const map = h('main', { class: 'route', id: 'route-map', style: `--rows:${rows.length}` }, ...rows);
  hyphae(map, run, row);
  return h('div', { class: 'runscreen', id: 'route' },
    runBar(content, atlas, run),
    h('div', { class: 'runhead' },
      h('h1', { class: 'runtitle' }, 'The Route', h('span', { class: 'hint' }, 'Pick a lit pod. Every pod links to every pod in the next row; the Boss waits at the end.')),
      intelBars(atlas, run)),
    map,
    runFoot(run, routeLegend(atlas),
      actions.toTitle ? h('button', { class: 'btn', id: 'to-title', onclick: actions.toTitle }, 'Title') : null,
      h('button', { class: 'btn danger', id: 'abandon', onclick: actions.abandon }, 'Abandon run')),
  );
}

export function spoilsScreen(content: Content, atlas: Atlas, run: RunState, actions: { pick(card: string | null): void; reroll(): void }): HTMLElement {
  if (run.screen.kind !== 'spoils') throw new Error('not on spoils');
  const p = run.screen.picks[0]!;
  const el = h('div', { class: 'runscreen', id: 'spoils' },
    runBar(content, atlas, run),
    h('div', { class: 'runpanel' },
      h('div', { class: 'draft-top' },
        h('h1', { class: 'runtitle' }, p.label === 'Spoils' ? `Spoils of battle ${p.battleIndex}` : 'Elite spoils: a relic'),
        h('div', { class: 'hint' }, `Choose 1 of ${p.offer.length}. Press `, h('kbd', null, '1'), '–', h('kbd', null, String(p.offer.length)), ' or click a card.')),
      h('div', { class: 'draft-cards', id: 'spoils-cards' }, ...p.offer.map((c, i) => cardView(content, atlas, c, run.upgrades, () => actions.pick(c.id), String(i + 1), i))),
      h('div', { class: 'actions' },
        p.freeRerolls > 0 ? h('button', { class: 'btn', id: 'spoils-reroll', onclick: actions.reroll }, `Reroll (free, ${p.freeRerolls} left)`) : null,
        h('button', { class: 'btn', id: 'spoils-skip', onclick: () => actions.pick(null) }, 'Skip'),
      ),
    ),
    runFoot(run, h('span', { class: 'hint' }, 'Spoils go straight into your kit, upgrades or relics for the rest of the run.')),
  );
  // keys 1–3 pick, as in the battle's draft
  const onKey = (e: KeyboardEvent) => {
    if (!el.isConnected) { window.removeEventListener('keydown', onKey); return; }
    const card = /^[1-9]$/.test(e.key) ? p.offer[Number(e.key) - 1] : undefined;
    if (card && !e.repeat) { e.preventDefault(); window.removeEventListener('keydown', onKey); actions.pick(card.id); }
  };
  window.addEventListener('keydown', onKey);
  return el;
}

/** One outcome chip: a word or a number with an icon, in its signal's color (a gain, a cost, gold or a note). */
type Chip = { kind: 'gain' | 'cost' | 'gold' | 'note'; text: string; icon?: string };

const pct = (v: number) => `${Math.round(Math.abs(v) * 100)}%`;
const signed = (v: number) => (v < 0 ? `−${Math.abs(v)}` : `+${v}`);

/** The chips for an event or Grove choice, read from its outcome data (SPEC §8.7). Costs carry a real minus. */
export function outcomeChips(content: Content, run: RunState, outcome: readonly RunEffect[]): Chip[] {
  const chips: Chip[] = [];
  for (const e of outcome) {
    if ('repairPct' in e) chips.push({ kind: 'gain', icon: 'i-heart', text: `+${Math.round(run.heartcap.max * e.repairPct)} Heartcap` });
    else if ('maxHpPct' in e) chips.push({ kind: e.maxHpPct < 0 ? 'cost' : 'gain', icon: 'i-heart', text: `${e.maxHpPct < 0 ? '−' : '+'}${pct(e.maxHpPct)} max Heartcap` });
    else if ('gainRelic' in e) {
      const n = e.gainRelic.count ?? 1;
      const r = e.gainRelic.rarity;
      chips.push({ kind: 'gain', icon: `r-${r ?? 'common'}`, text: `+${n} ${r ? `${RARITY_NAME[r].toLowerCase()} ` : ''}relic${n > 1 ? 's' : ''}` });
    } else if ('gainAmber' in e) chips.push({ kind: 'gain', icon: 'i-amber', text: `+${e.gainAmber} Amber` });
    else if ('nextBattle' in e) {
      const nb = e.nextBattle;
      if (nb.startingGold) chips.push({ kind: nb.startingGold < 0 ? 'cost' : 'gold', icon: 'i-gold', text: `${signed(nb.startingGold)} gold next battle` });
      if (nb.sporestormShiftSeconds) {
        const s = Math.abs(nb.sporestormShiftSeconds);
        chips.push({ kind: 'note', icon: 'i-storm', text: `Sporestorm ${formatClock(s * content.balance.tickRate)} ${nb.sporestormShiftSeconds < 0 ? 'earlier' : 'later'}` });
      }
    } else if ('halveIntel' in e) chips.push({ kind: 'gain', text: 'Gray Rot intel halved' });
    else if ('upgrade' in e) chips.push({ kind: 'gain', icon: 'i-upgrade', text: `+${e.upgrade.count} upgrade level${e.upgrade.count > 1 ? 's' : ''}` });
    else if ('removeBlueprint' in e) chips.push({ kind: 'cost', icon: 'i-blueprint', text: '−1 blueprint' });
    else if ('sacrificeRelic' in e) {
      chips.push({ kind: 'cost', icon: 'i-relic', text: '−1 relic' });
      chips.push({ kind: 'gain', icon: 'i-relic', text: `+${e.sacrificeRelic.gain} relics` });
    }
  }
  return chips;
}

function chipEl(atlas: Atlas, c: Chip): HTMLElement {
  return h('span', { class: `outcome ${c.kind}` }, c.icon ? uiIcon(atlas, c.icon) : null, c.text);
}

/** A choice card: its name, the full effect and its outcome chips; a choice you can't take is unlit, with why. */
function choiceCard(atlas: Atlas, label: string, text: string, chips: Chip[], onPick: () => void, unavailable: string | null, key: number): HTMLButtonElement {
  return h('button', { class: 'choice', disabled: unavailable !== null, onclick: onPick, style: `--i:${key - 1}` },
    h('span', { class: 'choice-main' },
      h('b', null, label), h('span', { class: 'choice-text' }, text),
      unavailable ? h('span', { class: 'bad' }, unavailable) : null),
    h('span', { class: 'chips' }, ...chips.map((c) => chipEl(atlas, c))),
    h('kbd', { class: 'choice-key', 'aria-label': `Key ${key}` }, String(key)));
}

/** The event and Grove layout (docs/ui-ux-plan.md C2): a framed 4× scene, the story on stalk cream, the choices as cards. */
function vignette(content: Content, atlas: Atlas, run: RunState, id: string, art: string, eyebrow: string, title: string, text: string, choices: HTMLButtonElement[], foot: string): HTMLElement {
  const scene = spriteToCanvas(atlas, art, 'velvet-bloom');
  scene.className = 'scene';
  scene.setAttribute('aria-hidden', 'true');
  const el = h('div', { class: 'runscreen', id },
    runBar(content, atlas, run),
    h('div', { class: 'runpanel vignette-layout' },
      h('div', { class: 'vignette' }, scene),
      h('div', { class: 'story' },
        h('div', { class: 'parchment' }, h('div', { class: 'eyebrow' }, eyebrow), h('h1', { class: 'runtitle' }, title), h('p', { class: 'eventtext' }, text)),
        h('div', { class: 'choices' }, ...choices))),
    runFoot(run, h('span', { class: 'hint' }, foot)),
  );
  // keys pick a choice, as on the draft
  const onKey = (e: KeyboardEvent) => {
    if (!el.isConnected) { window.removeEventListener('keydown', onKey); return; }
    const b = /^[1-9]$/.test(e.key) ? choices[Number(e.key) - 1] : undefined;
    if (b && !b.disabled && !e.repeat) { e.preventDefault(); window.removeEventListener('keydown', onKey); b.click(); }
  };
  window.addEventListener('keydown', onKey);
  return el;
}

export function eventScreen(content: Content, atlas: Atlas, run: RunState, actions: { choose(i: number): void }): HTMLElement {
  if (run.screen.kind !== 'event') throw new Error('not at an event');
  const ev = content.events[run.screen.event]!;
  const art = content.sprites[`v-${ev.id}`] ? `v-${ev.id}` : 'v-quiet-clearing';
  return vignette(content, atlas, run, 'event', art, 'Event', ev.title, ev.text,
    ev.choices.map((c, i) => choiceCard(atlas, c.label, c.text, outcomeChips(content, run, c.outcome), () => actions.choose(i),
      outcomeAvailable(content, run, c.outcome) ? null : 'Not available right now', i + 1)),
    'Choose one. Its effects last for the rest of the run unless it names the next battle.');
}

export function groveScreen(content: Content, atlas: Atlas, run: RunState, actions: { choose(c: 'repair' | 'graft'): void }): HTMLElement {
  const repair = Math.round(run.heartcap.max * content.balance.groveRepair);
  const after = Math.min(run.heartcap.max, run.heartcap.hp + repair);
  const canGraft = upgradeable(content, run).length > 0;
  return vignette(content, atlas, run, 'grove', 'v-grove', 'Grove', 'The Grove', 'A quiet grove where the colony can mend or grow. Choose one.', [
    choiceCard(atlas, 'Repair', `Heartcap +${after - run.heartcap.hp} (to ${after}/${run.heartcap.max}).`,
      [{ kind: 'gain', icon: 'i-heart', text: `+${after - run.heartcap.hp} Heartcap` }], () => actions.choose('repair'), null, 1),
    choiceCard(atlas, 'Graft', canGraft ? '+1 level on an upgrade track you own (you choose).' : 'Every track is maxed.',
      [{ kind: 'gain', icon: 'i-upgrade', text: '+1 upgrade level' }], () => actions.choose('graft'), canGraft ? null : 'Every upgrade track you own is at its last level', 2),
  ], 'The Grove repairs 30% of your Heartcap, or grafts one upgrade level.');
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
      h('div', { class: 'parchment' }, h('div', { class: 'eyebrow' }, 'Choose'), h('h1', { class: 'runtitle' }, p.title),
        h('p', { class: 'eventtext' }, p.remaining > 1 ? `${p.text} (${p.remaining} picks left)` : p.text)),
      h('div', { class: 'choices' }, ...p.options.map(option)),
    ),
    runFoot(run, null),
  );
}

// ---- summary ----

/** A small front-line sparkline: one line per lane, the front's position across the map over time. */
function sparkline(b: BattleRecord): SVGElement {
  const W = 160, H = 34;
  const root = document.createElementNS(SVG, 'svg');
  root.setAttribute('viewBox', `0 0 ${W} ${H}`);
  root.setAttribute('width', String(W));
  root.setAttribute('height', String(H));
  root.setAttribute('class', 'sparkline');
  const mid = document.createElementNS(SVG, 'line');
  Object.entries({ x1: 0, x2: W, y1: H / 2, y2: H / 2, style: 'stroke: var(--line)' }).forEach(([k, v]) => mid.setAttribute(k, String(v)));
  root.append(mid);
  const colors = ['var(--lilac)', 'var(--sprout)', 'var(--rarity-uncommon)'];
  b.front.forEach((series, li) => {
    if (series.length < 2) return;
    const pts = series.map((f, i) => `${((i / (series.length - 1)) * W).toFixed(1)},${(H - (f / b.mapWidth) * H).toFixed(1)}`).join(' ');
    const line = document.createElementNS(SVG, 'polyline');
    line.setAttribute('points', pts);
    line.setAttribute('fill', 'none');
    line.setAttribute('style', `stroke: ${colors[li % colors.length]!}`);
    line.setAttribute('stroke-width', '1.5');
    root.append(line);
  });
  return root;
}

export function summaryScreen(content: Content, atlas: Atlas, run: RunState, actions: { newRun(): void; toTitle?: () => void }): HTMLElement {
  const won = run.outcome === 'victory';
  const damage = new Map<string, number>();
  for (const b of run.battles) for (const [id, v] of Object.entries(b.damageByBuilding)) damage.set(id, (damage.get(id) ?? 0) + v);
  const dmgRows = [...damage.entries()].sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1));
  const maxDmg = Math.max(1, ...dmgRows.map(([, v]) => v));
  const totalTicks = run.battles.reduce((n, b) => n + b.durationTicks, 0);
  const lastBoss = run.battles.find((b) => b.kind === 'boss');
  return h('div', { class: 'runscreen', id: 'summary' },
    runBar(content, atlas, run),
    h('div', { class: 'runpanel wide' },
      h('div', { class: `banner reveal ${won ? 'win' : 'loss'}`, style: '--d:0' },
        outcomeArt(atlas, won),
        h('div', { class: 'banner-text' },
          h('h1', { class: won ? 'win' : 'loss', id: 'summary-title' }, won ? 'Victory: the boss falls' : 'Defeat'),
          h('div', { class: 'how' }, won ? `${content.generals[lastBoss?.general ?? '']?.name ?? 'The boss'} is beaten. The colony holds the roots.`
            : `The run ends after ${run.battles.length} battle${run.battles.length === 1 ? '' : 's'}.`),
          h('div', { class: 'hint' }, `${run.battles.length} battles · ${formatClock(totalTicks)} of battle · Heartcap ${run.heartcap.hp}/${run.heartcap.max}`)),
        mvpCallout(content, atlas, mvpOf(Object.fromEntries(damage)), 'this run'),
      ),
      h('div', { class: 'reveal', style: '--d:1' },
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
        )),
      h('div', { class: 'summarygrid reveal', style: '--d:2' },
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
        ),
        h('section', null,
          h('h3', null, 'Earned'),
          h('table', { id: 'summary-earned' },
            // the run's rewards roll up once their stage has revealed
            h('tr', { class: 'earned spores' }, h('td', null, uiIcon(atlas, 'i-spores'), 'Spores'), h('td', null, rollUp(h('b'), run.spores, { delay: 700 }))),
            h('tr', { class: 'earned amber' }, h('td', null, uiIcon(atlas, 'i-amber'), 'Amber'), h('td', null, rollUp(h('b'), run.amber, { delay: 850 }))),
            h('tr', null, h('td', null, 'Commander XP'), h('td', null, rollUp(h('span'), run.xp, { delay: 1000 }))),
            h('tr', null, h('td', null, 'Feats'), h('td', null, 'none yet (Milestone 6)')),
            h('tr', null, h('td', null, 'Decay'), h('td', null, '0')),
          ),
        ),
      ),
    ),
    runFoot(run, h('span', { class: 'hint' }, won ? 'The run is won. Start another from here or from the title.' : 'Every run starts fresh: a new route, kit and set of generals.'),
      actions.toTitle ? h('button', { class: 'btn', id: 'to-title', onclick: actions.toTitle }, 'Title') : null,
      h('button', { class: 'btn primary', id: 'new-run', onclick: actions.newRun }, 'New run')),
  );
}
