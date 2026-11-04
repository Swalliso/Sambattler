// Help overlay (SPEC §10.3 `H`, §10.5), all read from the data and the battle in rounds, so it never drifts from the
// rules. Six tabs (R2b/T117): the damage/armor matrix and tags; merging at the muster, with the toggle you set in
// planning; the general, which plans first and counters by round with no telegraph; the economy by round (income by
// source, interest as "bank 140 for +14", the Spore Exchange, comeback gold); rounds (the three phases, how a clash
// ends and what it costs, the Sporestorm by round, the Decision and Regrowths); and the keys by phase. Each tab fits
// a 1280×720 window; arrow keys move between tabs, and the last tab opened is the one that opens next time. It's a
// first plain wording, which R4b rewrites (§16).
import type { Content } from '../data/registry.ts';
import { powerOf } from '../sim/index.ts';
import type { Armor, BattleState, CounterKind, DamageType } from '../sim/index.ts';
import { stormBpFor } from '../sim/systems/victory.ts';
import { KIND_LABEL } from './doctrine.ts';
import { h } from './h.ts';
import { capWords, stormText } from './hud/explain.ts';
import { TIER_NAME, perkText } from './mergeHints.ts';

const ARMORS: Armor[] = ['light', 'medium', 'heavy', 'structure'];
const TYPES: DamageType[] = ['slash', 'pierce', 'crush'];
const cap = (s: string) => s[0]!.toUpperCase() + s.slice(1);
export const TABS = [['matrix', 'Matrix'], ['merging', 'Merging'], ['general', 'The general'], ['economy', 'Economy'], ['rounds', 'Rounds'], ['keys', 'Keys']] as const;
type Tab = (typeof TABS)[number][0];
let lastTab: Tab = 'matrix';
/** What each kind reads in your army, and what the general answers it with. */
const KIND_TEXT: Record<CounterKind, string> = {
  swarm: 'your Light units. The general answers with Slash and splash.',
  line: 'your Medium units. It answers with Pierce.',
  armor: 'your Heavy units. It answers with Crush and siege.',
  ranged: 'your ranged units. It answers with swarms that close on them.',
  elite: 'the Elders you actually field. It answers with Slayers.',
};
/** The bank the Economy tab's example holds at Begin (§10.5: "bank 140 for +14"). */
export const BANK_EXAMPLE = 140;

/** Keys as keycaps: alternatives joined by "/", a range by "–"; two keys are two caps, never one cap with a slash. */
function caps(keys: string[], join: '/' | '–' | '+' = '/'): HTMLElement {
  const out: (HTMLElement | string)[] = [];
  keys.forEach((k, i) => { if (i) out.push(h('span', { class: 'join' }, join)); out.push(h('kbd', null, k)); });
  return h('span', { class: 'caps' }, ...out);
}

/** "rounds 1–3" or "round 1". */
const roundsWord = (from: number, to: number) => (to > from ? `rounds ${from}–${to}` : `round ${from}`);
/** "3, 5 and 7". */
const listWord = (xs: (number | string)[]) => (xs.length > 1 ? `${xs.slice(0, -1).join(', ')} and ${xs.at(-1)}` : String(xs[0] ?? ''));

export function helpOverlay(content: Content, state: BattleState, onClose: () => void): HTMLElement {
  const r = state.rules;
  const b = content.balance;
  const cs = state.compiled.player;
  const kit = state.sides.player.kit.map((k) => k.building);
  const secs = (ticks: number) => Math.round(ticks / r.tickRate);
  const ruleRow = (a: string | Node, v: string | Node) => h('tr', null, h('td', null, a), h('td', null, v));
  const sec = (title: string, ...body: (Node | null)[]) => h('section', null, h('h3', null, title), ...body);
  const p = (...parts: (string | Node)[]) => h('p', null, ...parts);

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
      const unit = cs.buildings[id]?.squad?.unit;
      const u = unit ? content.units[unit] : undefined;
      if (!u) return [];
      const tags = u.tags.length ? ` · ${u.tags.join(', ')}` : '';
      return [h('tr', null, h('td', null, u.name), h('td', null, u.armor), h('td', null, `${u.damageType}${tags}`),
        h('td', null, perkText(content, u.id, 2)), h('td', null, perkText(content, u.id, 3)))];
    }),
  );

  // the economy (playtest round 3: "what is interest?")
  const economy = Object.values(content.buildings).filter((x) => x.economy && !x.economy.interestCapAdd && kit.includes(x.id));
  const exchange = Object.values(content.buildings).find((x) => x.economy?.interestCapAdd);
  const exAdd = exchange?.economy?.interestCapAdd ?? 0;
  const full = cs.interestCap * r.interestPer;
  const banked = Math.min(cs.interestCap, Math.floor(BANK_EXAMPLE / r.interestPer));

  // the general's counter cycles by round (§7.4), from the data
  const cycles = b.ai.counter.cycles;
  const cycleText = cycles.map((c) => `in round ${c.round}'s planning it reads ${roundsWord(c.from, c.round - 1)}`);
  const boss = b.ai.counter.bossCycles[0];

  // a round in three phases (§4.7, §6.7), the storm by round (§6.4) and the end (§6.5, §8.5)
  const st = r.storm;
  const capped = capWords(r.roundDamageCap);
  const drafts = b.draftRounds.map((x) => x + 1);
  const def = powerOf(state, 'player');
  const power = def && Object.values(content.commanders).find((c) => c.power.id === def.id)?.power;
  const stormTable = h('table', { class: 'rules storm-table', id: 'help-storm' },
    h('tr', null, h('th', null, 'Round'), ...Array.from({ length: r.maxRounds }, (_, i) => h('th', null, String(i + 1)))),
    h('tr', null, h('td', null, 'Damage'), ...Array.from({ length: r.maxRounds }, (_, i) => h('td', null, stormText(stormBpFor(st, i + 1))))));

  // the keys by phase (§10.3); the number keys reach as far as the cards they pick: the tray numbers its first nine
  const upTo = (n: number) => (n > 1 ? caps(['1', String(Math.min(9, n))], '–') : caps(['1']));
  const phaseKeys: [string, string, [HTMLElement, string][]][] = [
    ['planning', 'Planning', [
      [upTo(kit.length), 'choose a building, then click a plot; Shift-click keeps planting'],
      [caps(['Right-click', 'Esc']), 'cancel or deselect'],
      [caps(['Tab']), 'cycle your buildings'],
      [caps(['M']), 'merge toggle on the selected spawner'],
      [caps(['U']), 'upgrade the selected spawner, once every plot is built on'],
      [caps(['X', 'Delete']), `sell (press twice): ${cs.sellRefundPlantedPct}% back in the round you planted it, ${cs.sellRefundPct}% later`],
      [upTo(b.draft.cards), 'pick a draft card, while a draft is open'],
      [caps(['Space', 'Enter']), 'Begin the clash'],
    ]],
    ['clash', 'Clash', [
      [caps(['Space']), 'pause or resume'],
      [caps(['[', ']']), 'speed 1× / 2× / 3×'],
      ...(power ? [[caps(['Q']), `aim ${power.name}, then click the field (works while paused; Esc cancels)`] as [HTMLElement, string]] : []),
    ]],
    ['aftermath', 'Aftermath', [
      [caps(['Space', 'Enter']), 'go on to the next round (a click does too)'],
      [caps(['[', ']']), 'speed 1× / 2× / 3×'],
    ]],
    ['any', 'Any time', [
      [caps(['H']), 'this help'],
      [caps(['S']), 'sound on or off'],
      [caps(['I']), 'read the top band: Tab moves along gold, plots, round and storm'],
      [caps(['R']), 'your relics and upgrades, in a run\'s battle'],
    ]],
  ];
  const keyTable = ([phase, title, list]: (typeof phaseKeys)[number]) => h('section', null, h('h3', null, title),
    h('table', { class: 'keys', 'data-phase': phase }, ...list.map(([k, v]) => h('tr', null, h('td', null, k), h('td', null, v)))));

  const panels: Record<Tab, HTMLElement[]> = {
    matrix: [
      h('div', { class: 'helpgrid' },
        sec('Damage vs armor', matrix,
          h('p', { class: 'muted' }, 'Gold sparks mark strong hits, white normal, gray weak.'),
          p('Slash shreds Light swarms, Pierce breaks Medium line troops, Crush cracks Heavy armor and buildings.')),
        sec('Tags',
          h('ul', { class: 'taglist' },
            h('li', null, h('b', null, 'siege'), ` ×${r.siegeMult} vs buildings; counts double for Heartcap damage`),
            h('li', null, h('b', null, 'slayer'), ` ×${r.slayerMult} vs ${TIER_NAME[1]} and ${TIER_NAME[2]} units; hunts them first`),
            h('li', null, h('b', null, 'splash / cleave'), ` hits everything near the target for ${Math.round(r.splashFalloff * 100)}%`),
            h('li', null, h('b', null, 'ranged'), ' shoots from a distance; projectiles miss targets that die first')))),
    ],
    merging: [
      h('div', { class: 'helpgrid' },
        sec('The muster',
          p(`Each clash opens with a ${secs(r.musterTicks)} s muster: before anyone moves, three identical units within ${cs.mergeRadius} tiles knit into one ${TIER_NAME[1]} unit (×${b.tierStatMult} HP and damage, a perk, ⅔ of their supply), and three ${TIER_NAME[1]} into an ${TIER_NAME[2]}. Neighbouring squads of one unit knit together.`)),
        sec('The toggle',
          p('Squads field at tier 1 each round and knit again at the muster. Merging is on by default; set it per building with ', h('kbd', null, 'M'), ' while you plan. Merged units field fewer bodies, and Slayers hunt them.'))),
      h('h3', null, 'Your units'),
      roster,
    ],
    general: [
      h('div', { class: 'helpgrid' },
        sec('It plans first',
          p('Each round the general plans before you, by your rules and on your income. Its whole army stands on the field while you plan, and its Intent panel lists what it planted, with a "New" sprout on the field.'),
          p('There\'s no countdown or warning: what you see is what it fields this round.'),
          h('h3', null, 'It counters by round'),
          p(`${cap(listWord(cycleText))}. Each time it leans its buying toward buildings that beat the kind you fielded most, and the counter lands at once, in that round's planning.${boss ? ` The boss reads you sooner, from round ${boss.round}.` : ''}`),
          p('Across a run it remembers you: each new general opens against your top kind, and your intel bars on the route show what it knows.')),
        sec('The kinds it reads',
          h('ul', { class: 'kindlist' }, ...(Object.keys(KIND_TEXT) as CounterKind[]).map((k) => h('li', null, h('b', { class: 'kind-tag' }, KIND_LABEL[k]), ` ${KIND_TEXT[k]}`))))),
    ],
    economy: [
      h('div', { class: 'helpgrid' },
        sec('Income, as each round opens',
          h('table', { class: 'rules', id: 'help-income' },
            ruleRow('Heartcap stipend', `+${cs.stipend} gold, always`),
            ...economy.map((x) => ruleRow(x.name, `+${cs.buildings[x.id]?.economy?.goldPerRound ?? 0} gold each`)),
            ruleRow('Rich Loam', `+${cs.loamBonusPct}% for an economy building on loam`),
            cs.comebackEnabled ? ruleRow('Comeback', `+${r.comebackGold} gold if you lost the last round`) : null),
          p('No income comes in round 1: you plan your opener with what you start with. Hover your gold in the top band for this round\'s numbers, source by source.')),
        sec('Interest',
          p(`As a round's income lands you get 1 gold for every ${r.interestPer} gold you held when you pressed Begin, up to ${cs.interestCap}: bank ${BANK_EXAMPLE} for +${banked}. Holding ${full} or more earns the full ${cs.interestCap}; spending everything earns nothing.`),
          exchange ? h('h3', null, `The ${exchange.name}`) : null,
          exchange ? p(`While it stands it raises your interest cap by ${exAdd}, so interest can pay up to ${cs.interestCap + exAdd} if you hold ${(cs.interestCap + exAdd) * r.interestPer} gold. It also pays +${exchange.economy?.goldPerRound ?? 0} gold a round. It earns most when you save.`) : null,
          h('h3', null, 'Other gold'),
          p(`Skipping a draft pays +${b.skipGold} gold. Gold doesn't carry from one battle to the next.`))),
    ],
    rounds: [
      h('div', { class: 'helpgrid' },
        sec('A round, in three phases',
          p(h('b', null, 'Planning. '), 'The clock is stopped and the general has planned. Plant, sell and set merge toggles, then press Begin.'
            + ` In rounds ${listWord(drafts)} a draft opens first: pick a card, reroll or skip.`),
          h('p', { id: 'help-upgrades' }, h('b', null, 'Upgrades. '), 'Once every plot is built on, gold buys upgrades: select a spawner and press ', h('kbd', null, 'U'),
            `. For ${b.upgradeCostPct}% of its price its squad arrives ${TIER_NAME[1]} for the rest of the battle, and can knit on to ${TIER_NAME[2]}s. The general upgrades too.`),
          p(h('b', null, 'Clash. '), `Both whole armies fight, lane by lane. A lane ends when one side has nothing left in it, or at ${secs(r.clashCapTicks)} s, when the side with more supply left wins it.`
            + `${power ? ` ${power.name} fires once a clash.` : ''}`),
          p(h('b', null, 'Aftermath. '), `A lane's winner deals ${r.heartcapDamagePerSupply} Heartcap damage for each supply it has left over the loser's (siege units count double)`
            + `${capped ? `, up to ${capped} a round` : ''}.`)),
        sec('The Sporestorm',
          p(`From round ${st.startRound} the Sporestorm raises the Heartcap damage a round deals by ${st.stepBp / 100}% a round, up to ${stormText(st.maxBp)}, for both sides alike.`),
          stormTable,
          h('h3', null, 'How a battle ends'),
          p(`A Heartcap at 0 loses the battle (a Rout). After round ${r.maxRounds}, if both Heartcaps stand, the battle ends by Decision: whoever dealt the larger share of the other's max HP wins.`),
          p(`In a run a lost battle costs a Regrowth, one of your ${b.lives} lives, and a won one never does. The run ends when the last is gone, or if you lose the boss.`))),
    ],
    keys: [
      h('div', { class: 'helpgrid keys-grid', id: 'help-keys' },
        h('div', null, keyTable(phaseKeys[0]!)),
        h('div', null, ...phaseKeys.slice(1).map(keyTable))),
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
