// Help overlay (SPEC §10.3 `H`), all read from the data so it never drifts from the rules. Four tabs
// (docs/ui-ux-plan.md C6): the damage/armor matrix and tags, merging and your units' perks, how the
// general adapts, and every key. Each tab fits a 1280×720 window; arrow keys move between tabs, and the
// last tab opened is the one that opens next time.
import type { Content } from '../data/registry.ts';
import type { Armor, BattleState, DamageType } from '../sim/index.ts';
import { COUNTER_KINDS } from '../sim/index.ts';
import { KIND_LABEL } from './doctrine.ts';
import { h } from './h.ts';
import { TIER_NAME, perkText } from './mergeHints.ts';

const ARMORS: Armor[] = ['light', 'medium', 'heavy', 'structure'];
const TYPES: DamageType[] = ['slash', 'pierce', 'crush'];
const cap = (s: string) => s[0]!.toUpperCase() + s.slice(1);
const TABS = [['matrix', 'Matrix'], ['merging', 'Merging'], ['general', 'The general'], ['keys', 'Keys']] as const;
type Tab = (typeof TABS)[number][0];
let lastTab: Tab = 'matrix';
/** What each kind reads in your army, and what the general answers it with. */
const KIND_TEXT = {
  swarm: 'your Light units. The general answers with Slash and splash.',
  line: 'your Medium units. It answers with Pierce.',
  armor: 'your Heavy units. It answers with Crush and siege.',
  elite: 'units you actually merge. It answers with Slayers.',
} as const;

/** Keys as keycaps: alternatives joined by "/", a range by "–"; two keys are two caps, never one cap with a slash. */
function caps(keys: string[], join: '/' | '–' | '+' = '/'): HTMLElement {
  const out: (HTMLElement | string)[] = [];
  keys.forEach((k, i) => { if (i) out.push(h('span', { class: 'join' }, join)); out.push(h('kbd', null, k)); });
  return h('span', { class: 'caps' }, ...out);
}

export function helpOverlay(content: Content, state: BattleState, onClose: () => void): HTMLElement {
  const r = state.rules;
  const b = content.balance;
  const matrix = h('table', { class: 'matrix', id: 'help-matrix' },
    h('tr', null, h('th', null, 'damage \\ armor'), ...ARMORS.map((a) => h('th', null, cap(a)))),
    ...TYPES.map((t) => h('tr', null, h('th', null, cap(t)), ...ARMORS.map((a) => {
      const m = r.matrix[t][a];
      return h('td', { class: m >= r.strongAt ? 'strong' : m <= r.weakAt ? 'weak' : '' }, `×${m}`, m >= r.strongAt ? h('small', null, ' strong') : m <= r.weakAt ? h('small', null, ' weak') : null);
    }))),
  );
  const roster = h('table', { class: 'roster' },
    h('tr', null, h('th', null, 'Unit'), h('th', null, 'Armor'), h('th', null, 'Damage'), h('th', null, `${TIER_NAME[1]} perk`), h('th', null, `${TIER_NAME[2]} perk`)),
    ...state.sides.player.kit.flatMap((id) => {
      const unit = content.buildings[id]?.spawn?.unit;
      const u = unit ? content.units[unit] : undefined;
      if (!u) return [];
      const tags = u.tags.length ? ` · ${u.tags.join(', ')}` : '';
      return [h('tr', null, h('td', null, u.name), h('td', null, u.armor), h('td', null, `${u.damageType}${tags}`),
        h('td', null, perkText(content, u.id, 2)), h('td', null, perkText(content, u.id, 3)))];
    }),
  );
  const keys: [HTMLElement, string][] = [
    [caps(['1', '8'], '–'), 'choose a building; Shift-click keeps placing'],
    [caps(['Right-click', 'Esc']), 'cancel or deselect'],
    [caps(['Enter']), 'begin the battle (in deploy)'],
    [caps(['Space']), 'pause (every command still works)'],
    [caps(['[', ']']), 'speed 1× / 2× / 3×'],
    [caps(['Tab']), 'cycle your buildings'],
    [caps(['M']), 'merge toggle on the selected spawner'],
    [caps(['X', 'Delete']), 'sell (press twice)'],
    [caps(['1', '3'], '–'), 'pick a draft card'],
    [caps(['H']), 'this help'],
    [caps(['S']), 'sound on or off'],
  ];
  if (r.stance) keys.push([caps(['F']), `hold every lane, or advance them all (a hold lasts up to ${r.stance.maxHoldTicks / r.tickRate} s)`]);
  const panels: Record<Tab, HTMLElement[]> = {
    matrix: [
      h('div', { class: 'helpgrid' },
        h('section', null,
          h('h3', null, 'Damage vs armor'),
          matrix,
          h('p', { class: 'muted' }, 'Gold sparks mark strong hits, white normal, gray weak.'),
          h('p', null, 'Slash shreds Light swarms, Pierce breaks Medium line troops, Crush cracks Heavy armor and buildings.')),
        h('section', null,
          h('h3', null, 'Tags'),
          h('ul', { class: 'taglist' },
            h('li', null, h('b', null, 'siege'), ` ×${r.siegeMult} vs buildings and Heartcaps; goes for them first`),
            h('li', null, h('b', null, 'slayer'), ` ×${r.slayerMult} vs ${TIER_NAME[1]} and ${TIER_NAME[2]} units; hunts them first`),
            h('li', null, h('b', null, 'splash / cleave'), ` hits everything near the target for ${Math.round(r.splashFalloff * 100)}%`),
            h('li', null, h('b', null, 'ranged'), ' shoots from a distance; projectiles miss targets that die first')))),
    ],
    merging: [
      h('div', { class: 'helpgrid' },
        h('section', null,
          h('h3', null, 'Merging'),
          h('p', null, `Three identical units that stay out of combat for ${b.mergeCombatCooldownSeconds} s within ${b.mergeRadius} tiles of each other knit for ${b.mergeKnitSeconds} s into one ${TIER_NAME[1]} unit: ×${b.tierStatMult} HP and damage, a perk, and only ⅔ of their supply. Three ${TIER_NAME[1]} units make an ${TIER_NAME[2]}.`)),
        h('section', null,
          h('h3', null, 'The catch'),
          h('p', null, 'Merged units hold ground more slowly (presence follows supply), field fewer bodies, and Slayers tear through them. A hit during the knit cancels it. Toggle merging per building with ', h('kbd', null, 'M'), '.'))),
      h('h3', null, 'Your units'),
      roster,
    ],
    general: [
      h('div', { class: 'helpgrid' },
        h('section', null,
          h('h3', null, 'The general adapts'),
          h('p', null, 'At 2:00 and 5:00 the general reads your spawn mix and warns which kind it will counter two waves later. Then it leans its spending toward buildings that beat that kind.'),
          h('p', null, 'It remembers you across a run: each new general opens against your top kind, and the boss reads your whole run. Your intel bars on the route show what it knows.')),
        h('section', null,
          h('h3', null, 'The four kinds'),
          h('ul', { class: 'kindlist' }, ...COUNTER_KINDS.map((k) => h('li', null, h('b', { class: 'kind-tag' }, KIND_LABEL[k]), ` ${KIND_TEXT[k]}`))))),
    ],
    keys: [
      h('div', { class: 'helpgrid keys-grid' },
        h('table', { class: 'keys', id: 'help-keys' }, ...keys.map(([k, v]) => h('tr', null, h('td', null, k), h('td', null, v)))),
        h('section', null,
          h('h3', null, 'Selling'),
          h('p', null, `Full refund during deploy, or within ${r.fullRefundTicks / r.tickRate} s of placement before the building spawns units, earns gold, or fires. After that, selling refunds ${state.compiled.player.sellRefundPct}%. Spawned units stay. Besieged buildings cannot be sold.`))),
    ],
  };
  const tabs = new Map<Tab, HTMLButtonElement>();
  const bodies = new Map<Tab, HTMLElement>();
  const show = (t: Tab, focus = false) => {
    lastTab = t;
    for (const [k, b2] of tabs) {
      const on = k === t;
      b2.classList.toggle('on', on);
      b2.setAttribute('aria-selected', String(on));
      b2.tabIndex = on ? 0 : -1;
      bodies.get(k)!.hidden = !on;
    }
    if (focus) tabs.get(t)!.focus();
  };
  const list = h('div', { class: 'seg help-tabs', role: 'tablist', 'aria-label': 'Help topics' },
    ...TABS.map(([id, label]) => {
      const b2 = h('button', { class: 'btn', role: 'tab', id: `help-tab-${id}`, 'data-tab': id, 'aria-controls': `help-${id}`, onclick: () => show(id) }, label);
      tabs.set(id, b2);
      return b2;
    }));
  list.addEventListener('keydown', (e) => {
    const i = TABS.findIndex(([id]) => id === lastTab);
    const step = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
    if (!step) return;
    e.preventDefault();
    show(TABS[(i + step + TABS.length) % TABS.length]![0], true);
  });
  const body = h('div', { class: 'help-body' }, ...TABS.map(([id]) => {
    const panel = h('div', { class: 'help-panel', role: 'tabpanel', id: `help-${id}`, 'aria-labelledby': `help-tab-${id}` }, ...panels[id]);
    bodies.set(id, panel);
    return panel;
  }));
  const card = h('div', { class: 'helpcard', id: 'help', role: 'dialog', 'aria-label': 'Help' },
    h('div', { class: 'helphead' }, h('h2', null, 'How battles work'), list, h('button', { class: 'btn', onclick: onClose }, 'Close', h('kbd', null, 'H'))),
    body,
  );
  show(lastTab);
  const overlay = h('div', { class: 'overlay help-overlay', onclick: (e: Event) => { if (e.target === overlay) onClose(); } }, card);
  return overlay;
}
