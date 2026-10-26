// Help overlay (SPEC §10.3 `H`): the damage/armor matrix, tags, merging and hotkeys, all read from
// the data so it never drifts from the rules.
import type { Content } from '../data/registry.ts';
import type { Armor, BattleState, DamageType } from '../sim/index.ts';
import { h } from './h.ts';
import { TIER_NAME, perkText } from './mergeHints.ts';

const ARMORS: Armor[] = ['light', 'medium', 'heavy', 'structure'];
const TYPES: DamageType[] = ['slash', 'pierce', 'crush'];
const cap = (s: string) => s[0]!.toUpperCase() + s.slice(1);

export function helpOverlay(content: Content, state: BattleState, onClose: () => void): HTMLElement {
  const r = state.rules;
  const b = content.balance;
  const matrix = h('table', { class: 'matrix', id: 'help-matrix' },
    h('tr', null, h('th', null, 'damage \\ armor'), ...ARMORS.map((a) => h('th', null, cap(a)))),
    ...TYPES.map((t) => h('tr', null, h('th', null, cap(t)), ...ARMORS.map((a) => {
      const m = r.matrix[t][a];
      return h('td', { class: m >= r.strongAt ? 'strong' : m <= r.weakAt ? 'weak' : '' }, `×${m}`);
    }))),
  );
  const roster = h('table', { class: 'roster' },
    h('tr', null, h('th', null, 'unit'), h('th', null, 'armor'), h('th', null, 'damage'), h('th', null, 'Bloomed perk'), h('th', null, 'Elder perk')),
    ...state.sides.player.kit.flatMap((id) => {
      const unit = content.buildings[id]?.spawn?.unit;
      const u = unit ? content.units[unit] : undefined;
      if (!u) return [];
      const tags = u.tags.length ? ` · ${u.tags.join(', ')}` : '';
      return [h('tr', null, h('td', null, u.name), h('td', null, u.armor), h('td', null, `${u.damageType}${tags}`),
        h('td', null, perkText(content, u.id, 2)), h('td', null, perkText(content, u.id, 3)))];
    }),
  );
  const keys: [string, string][] = [
    ['1–8', 'choose a building (Shift-click keeps placing)'], ['Right-click / Esc', 'cancel or deselect'],
    ['Space', 'pause (every command still works)'], ['[ ]', 'speed 1× / 2× / 3×'], ['Tab', 'cycle your buildings'],
    ['M', 'merge toggle on the selected spawner'], ['X / Delete', 'sell (press twice)'], ['H', 'this help'],
  ];
  const card = h('div', { class: 'helpcard', id: 'help', role: 'dialog', 'aria-label': 'Help' },
    h('div', { class: 'helphead' }, h('h2', null, 'How battles work'), h('button', { class: 'btn', onclick: onClose }, 'Close [H]')),
    h('div', { class: 'helpgrid' },
      h('section', null,
        h('h3', null, 'Damage vs armor'),
        matrix,
        h('p', { class: 'muted' }, 'Gold sparks mark strong hits, white normal, gray weak. Slash shreds Light swarms, Pierce breaks Medium line troops, Crush cracks Heavy armor and buildings.'),
        h('h3', null, 'Tags'),
        h('ul', null,
          h('li', null, h('b', null, 'siege'), ` ×${r.siegeMult} vs buildings and Heartcaps; goes for them first`),
          h('li', null, h('b', null, 'slayer'), ` ×${r.slayerMult} vs Bloomed and Elder units; hunts them first`),
          h('li', null, h('b', null, 'splash / cleave'), ` hits everything near the target for ${Math.round(r.splashFalloff * 100)}%`),
          h('li', null, h('b', null, 'ranged'), ' shoots from a distance; projectiles miss targets that die first'),
        ),
      ),
      h('section', null,
        h('h3', null, 'Merging'),
        h('p', null, `Three identical units that stay out of combat for ${b.mergeCombatCooldownSeconds} s within ${b.mergeRadius} tiles of each other knit for ${b.mergeKnitSeconds} s into one ${TIER_NAME[1]} unit: ×${b.tierStatMult} HP and damage, a perk, and only ⅔ of their supply. Three ${TIER_NAME[1]} units make an ${TIER_NAME[2]}.`),
        h('p', null, 'The catch: merged units hold ground more slowly (presence follows supply), field fewer bodies, and Slayers tear through them. A hit during the knit cancels it. Toggle merging per building with M.'),
        h('h3', null, 'Hotkeys'),
        h('table', { class: 'keys' }, ...keys.map(([k, v]) => h('tr', null, h('td', null, h('kbd', null, k)), h('td', null, v)))),
      ),
    ),
    h('h3', null, 'Your units'),
    roster,
  );
  const overlay = h('div', { class: 'overlay help-overlay', onclick: (e: Event) => { if (e.target === overlay) onClose(); } }, card);
  return overlay;
}
