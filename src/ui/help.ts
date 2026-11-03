// Help overlay (SPEC §10.3 `H`), all read from the data and the battle in rounds, so it never drifts from the rules.
// Six tabs (docs/archive/v1/ui-ux-plan.md C6, playtest round 3): the damage/armor matrix and tags, merging and your
// units' perks, how the general adapts, the economy by round (income, interest, the Spore Exchange, comeback gold),
// the Sporestorm by round, and every key. Each tab fits a 1280×720 window; arrow keys move between tabs, and the
// last tab opened is the one that opens next time. R2b's T117 writes its round tabs in full.
import type { Content } from '../data/registry.ts';
import { powerOf } from '../sim/index.ts';
import type { Armor, BattleState, DamageType } from '../sim/index.ts';
import { stormBpFor } from '../sim/systems/victory.ts';
import { KIND_LABEL } from './doctrine.ts';
import { h } from './h.ts';
import { stormText } from './hud/explain.ts';
import { TIER_NAME, perkText } from './mergeHints.ts';

const ARMORS: Armor[] = ['light', 'medium', 'heavy', 'structure'];
const TYPES: DamageType[] = ['slash', 'pierce', 'crush'];
const cap = (s: string) => s[0]!.toUpperCase() + s.slice(1);
const TABS = [['matrix', 'Matrix'], ['merging', 'Merging'], ['general', 'The general'], ['economy', 'Economy'], ['storm', 'Sporestorm'], ['keys', 'Keys']] as const;
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
  const kit = state.sides.player.kit.map((k) => k.building);
  const matrix = h('table', { class: 'matrix', id: 'help-matrix' },
    h('tr', null, h('th', null, 'damage \\ armor'), ...ARMORS.map((a) => h('th', null, cap(a)))),
    ...TYPES.map((t) => h('tr', null, h('th', null, cap(t)), ...ARMORS.map((a) => {
      const m = r.matrix[t][a];
      return h('td', { class: m >= r.strongAt ? 'strong' : m <= r.weakAt ? 'weak' : '' }, `×${m}`, m >= r.strongAt ? h('small', null, ' strong') : m <= r.weakAt ? h('small', null, ' weak') : null);
    }))),
  );
  const roster = h('table', { class: 'roster' },
    h('tr', null, h('th', null, 'Unit'), h('th', null, 'Armor'), h('th', null, 'Damage'), h('th', null, `${TIER_NAME[1]} perk`), h('th', null, `${TIER_NAME[2]} perk`)),
    ...kit.flatMap((id) => {
      const unit = state.compiled.player.buildings[id]?.squad?.unit;
      const u = unit ? content.units[unit] : undefined;
      if (!u) return [];
      const tags = u.tags.length ? ` · ${u.tags.join(', ')}` : '';
      return [h('tr', null, h('td', null, u.name), h('td', null, u.armor), h('td', null, `${u.damageType}${tags}`),
        h('td', null, perkText(content, u.id, 2)), h('td', null, perkText(content, u.id, 3)))];
    }),
  );
  // number keys reach as far as the cards they pick: the tray numbers its first nine (src/ui/hud/tray.ts)
  const upTo = (n: number) => (n > 1 ? caps(['1', String(Math.min(9, n))], '–') : caps(['1']));
  const keys: [HTMLElement, string][] = [
    [upTo(kit.length), 'choose a building; Shift-click keeps placing'],
    [caps(['Right-click', 'Esc']), 'cancel or deselect'],
    [caps(['Space', 'Enter']), 'begin the clash (in planning)'],
    [caps(['Space']), 'in a clash: pause'],
    [caps(['[', ']']), 'speed 1× / 2× / 3×'],
    [caps(['Tab']), 'cycle your buildings'],
    [caps(['M']), 'merge toggle on the selected spawner'],
    [caps(['X', 'Delete']), 'sell (press twice)'],
    [upTo(b.draft.cards), 'pick a draft card'],
  ];
  const def = powerOf(state, 'player');
  const power = def && Object.values(content.commanders).find((c) => c.power.id === def.id)?.power;
  if (power) keys.push([caps(['Q']), `in a clash: aim ${power.name}, then click the field (works while paused; Esc cancels)`]);
  // the panels' keys sit beside Selling: in one list, a run's battle (its power adds a row) ran past 1280×720
  const panelKeys: [HTMLElement, string][] = [
    [caps(['H']), 'this help'],
    [caps(['S']), 'sound on or off'],
    [caps(['I']), 'read the top band: Tab moves along gold, plots, round and storm'],
  ];
  const keyTable = (list: [HTMLElement, string][], id?: string) => h('table', { class: 'keys', id }, ...list.map(([k, v]) => h('tr', null, h('td', null, k), h('td', null, v))));
  // the economy and the Sporestorm in plain words (playtest round 3: "what is interest?")
  const cs = state.compiled.player;
  const economy = Object.values(content.buildings).filter((x) => x.economy && !x.economy.interestCapAdd && kit.includes(x.id));
  const exchange = Object.values(content.buildings).find((x) => x.economy?.interestCapAdd);
  const exAdd = exchange?.economy?.interestCapAdd ?? 0;
  const full = cs.interestCap * r.interestPer;
  const st = r.storm;
  const ruleRow = (a: string | Node, v: string | Node) => h('tr', null, h('td', null, a), h('td', null, v));
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
          h('p', null, 'Merged units field fewer bodies, and Slayers tear through them. A hit while they merge cancels it. Toggle merging per building with ', h('kbd', null, 'M'), ' while you plan.'))),
      h('h3', null, 'Your units'),
      roster,
    ],
    general: [
      h('div', { class: 'helpgrid' },
        h('section', null,
          h('h3', null, 'The general adapts'),
          h('p', null, 'Each round the general plans first, so its whole army is on the field while you plan. As the battle goes on it counters the kind you field most, leaning its spending toward buildings that beat that kind.'),
          h('p', null, 'It remembers you across a run: each new general opens against your top kind, and the boss reads your whole run. Your intel bars on the route show what it knows.')),
        h('section', null,
          h('h3', null, 'The four kinds'),
          h('ul', { class: 'kindlist' }, ...(['swarm', 'line', 'armor', 'elite'] as const).map((k) => h('li', null, h('b', { class: 'kind-tag' }, KIND_LABEL[k]), ` ${KIND_TEXT[k]}`))))),
    ],
    economy: [
      h('div', { class: 'helpgrid' },
        h('section', null,
          h('h3', null, 'Income, as each round opens'),
          h('table', { class: 'rules', id: 'help-income' },
            ruleRow('Heartcap stipend', `+${cs.stipend} gold, always`),
            ...economy.map((x) => ruleRow(x.name, `+${state.compiled.player.buildings[x.id]?.economy?.goldPerRound ?? 0} gold each`)),
            ruleRow('Rich Loam', `+${cs.loamBonusPct}% for an economy building on loam`),
            cs.comebackEnabled ? ruleRow('Comeback', `+${r.comebackGold} gold if you lost the last round`) : null),
          h('p', null, 'Hover your gold in the top band for this round\'s numbers, source by source.')),
        h('section', null,
          h('h3', null, 'Interest'),
          h('p', null, `As a round's income lands you get 1 gold for every ${r.interestPer} gold you held when you pressed Begin, up to ${cs.interestCap}. Holding ${full} gold or more earns the full ${cs.interestCap}; spending everything earns nothing.`),
          h('p', { class: 'muted' }, `For example, holding 145 gold at Begin pays +${Math.min(cs.interestCap, Math.floor(145 / r.interestPer))}.`),
          exchange ? h('h3', null, `The ${exchange.name}`) : null,
          exchange ? h('p', null, `While it stands it raises your interest cap by ${exAdd}, so interest can pay up to ${cs.interestCap + exAdd} if you hold ${(cs.interestCap + exAdd) * r.interestPer} gold. It also pays +${exchange.economy?.goldPerRound ?? 0} gold a round. It earns most when you save.`) : null,
          h('h3', null, 'Other gold'),
          h('p', null, `Skipping a draft pays +${b.skipGold} gold. Gold doesn't carry from one battle to the next.`))),
    ],
    storm: [
      h('div', { class: 'helpgrid' },
        h('section', null,
          h('h3', null, 'The Sporestorm'),
          h('p', null, `The Sporestorm ends stalemates. From round ${st.startRound} it raises the Heartcap damage a round deals by ${st.stepBp / 100}% a round, up to ${stormText(st.maxBp)}. It hits both sides alike, so a long battle turns toward whoever can push.`),
          h('p', null, `After round ${r.maxRounds}, if both Heartcaps stand, the battle ends by Decision.`),
          h('p', { class: 'muted' }, 'The Storm chip lights up and the spores on the field thicken as it grows. Some events move the storm earlier or later in the next battle.')),
        h('section', null,
          h('h3', null, 'Round by round'),
          h('table', { class: 'rules storm-table', id: 'help-storm' },
            h('tr', null, h('th', null, 'Round'), h('th', null, 'Heartcap damage')),
            ...Array.from({ length: r.maxRounds }, (_, i) => h('tr', null, h('td', null, String(i + 1)), h('td', null, stormText(stormBpFor(st, i + 1)))))))),
    ],
    keys: [
      h('div', { class: 'helpgrid keys-grid' },
        keyTable(keys, 'help-keys'),
        h('section', null,
          h('h3', null, 'Selling'),
          h('p', null, `Selling in the planning phase you planted it refunds ${cs.sellRefundPlantedPct}%. Once it has fielded a squad, selling refunds ${cs.sellRefundPct}%. You sell while you plan, never in a clash.`),
          h('h3', null, 'Other keys'),
          keyTable(panelKeys))),
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
