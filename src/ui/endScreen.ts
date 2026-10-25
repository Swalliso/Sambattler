// Milestone 1 end screen: the outcome, how it was decided, and basic stats (SPEC §16 M1).
import type { BattleState, Side } from '../sim/index.ts';
import { formatClock } from '../sim/index.ts';
import { columnsOwned } from '../sim/world.ts';
import { h } from './h.ts';

export function endScreen(state: BattleState, actions: { again: () => void; rematch: () => void }): HTMLElement {
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
  const st = state.stats;
  const sum = (o2: Record<string, number>) => Object.values(o2).reduce((a, b) => a + b, 0);
  const row = (label: string, f: (s: Side) => string | number) => h('tr', null, h('td', null, label), h('td', null, String(f('player'))), h('td', null, String(f('enemy'))));
  const card = h('div', { class: 'endcard', id: 'end-screen', role: 'dialog', 'aria-label': 'Battle result' },
    h('h1', { class: won ? 'win' : 'loss', id: 'end-title' }, won ? 'Victory' : 'Defeat'),
    h('div', { class: 'how', id: 'end-how' }, `${won ? 'The Velvet Bloom wins' : 'The Gray Rot wins'} ${how}`),
    h('div', { class: 'hint' }, `Battle length ${formatClock(o.tick, state.rules.tickRate)} · Sporestorm ${state.sporestorm} stack${state.sporestorm === 1 ? '' : 's'}`),
    h('table', null,
      h('tr', null, h('th', null, ''), h('th', null, 'Velvet Bloom'), h('th', null, 'Gray Rot')),
      row('Heartcap HP', (s) => `${state.sides[s].heartcapHp} / ${state.sides[s].heartcapMaxHp}`),
      row('Columns owned', (s) => columnsOwned(state, s)),
      row('Units spawned', (s) => sum(st[s].spawned)),
      row('Units lost', (s) => st[s].unitsLost),
      row('Buildings built', (s) => st[s].buildingsBuilt),
      row('Buildings lost', (s) => st[s].buildingsLost),
      row('Damage dealt', (s) => st[s].damageDealt),
      row('Gold earned', (s) => sum(st[s].goldEarned)),
    ),
    h('div', { class: 'actions' },
      h('button', { class: 'btn', onclick: actions.rematch }, 'Rematch (same seed)'),
      h('button', { class: 'btn on', onclick: actions.again, id: 'play-again' }, 'Play again'),
    ),
  );
  return h('div', { class: 'overlay' }, card);
}
