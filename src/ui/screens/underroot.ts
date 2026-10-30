// The Underroot (SPEC §8.1, §10.5): run setup before a run starts. Milestone 5 has two tabs: the
// commanders (all three selectable until M6 brings unlocks), each card showing its passive, its power
// and its starter kit; and bans, up to 3 buildings from the shared pool (a commander's core can't be
// banned). Begin run hands the choice back; nothing is saved until the run exists.
import type { Content } from '../../data/registry.ts';
import type { Atlas } from '../../render/atlas.ts';
import { spriteToCanvas } from '../../render/atlas.ts';
import { MAX_BANS } from '../../sim/index.ts';
import { h, setText, toggleClass } from '../h.ts';
import { uiIcon } from '../icons.ts';
import { AnchoredTip } from '../tooltip.ts';
import { buildingDescription, powerAim, powerTiming } from '../words.ts';

export type UnderrootTab = 'commanders' | 'bans';

export interface UnderrootChoice { commander: string; bans: string[] }

export interface UnderrootOptions {
  tab: UnderrootTab;
  choice: UnderrootChoice;
  /** The first-time tip at the top (shown once ever; the caller remembers it). */
  tip: boolean;
  begin(choice: UnderrootChoice): void;
  back?: () => void;
}

const sprite = (atlas: Atlas, id: string, cls: string) => {
  const c = spriteToCanvas(atlas, id, 'velvet-bloom');
  c.className = cls;
  c.setAttribute('aria-hidden', 'true');
  return c;
};

export function underrootScreen(content: Content, atlas: Atlas, opts: UnderrootOptions): HTMLElement {
  const ids = Object.keys(content.commanders);
  const choice: UnderrootChoice = { commander: opts.choice.commander, bans: [...opts.choice.bans] };
  const tip = new AnchoredTip('underroot-tip', 'below');
  const roster = content.factions['velvet-bloom']?.buildings ?? [];

  /** A building chip with a real tooltip: its name and what it does. */
  const piece = (id: string, small = false) => {
    const b = content.buildings[id]!;
    const el = h('span', { class: `uc-piece${small ? ' small' : ''}`, 'data-building': id, 'aria-label': b.name },
      sprite(atlas, b.sprite, 'uc-sprite'), small ? null : h('span', null, b.name));
    tip.attach(el, { key: () => id, build: () => [h('b', null, b.name), h('span', null, buildingDescription(content, id))] });
    return el;
  };

  const cards = ids.map((id) => {
    const c = content.commanders[id]!;
    const p = c.power;
    const others = c.core.filter((b) => !c.starter.includes(b));
    const card = h('button', {
      class: 'commander-card', 'data-commander': id, 'aria-pressed': 'false', onclick: () => { choice.commander = id; sync(); },
    },
      h('div', { class: 'uc-head' },
        sprite(atlas, c.sprite, 'uc-portrait'),
        h('div', { class: 'uc-name' }, h('b', null, c.name), h('span', { class: 'eyebrow' }, c.title))),
      h('p', { class: 'uc-desc' }, c.description),
      h('div', { class: 'uc-sec uc-passive' }, h('span', { class: 'eyebrow' }, 'Passive · always on'), h('span', { class: 'uc-text' }, c.passive.text)),
      h('div', { class: 'uc-sec uc-power' },
        h('span', { class: 'eyebrow' }, 'Power · ', h('kbd', null, 'Q'), ' in battle'),
        h('span', { class: 'uc-power-name' }, uiIcon(atlas, 'i-power'), h('b', null, p.name)),
        h('span', { class: 'uc-text' }, p.text),
        h('span', { class: 'uc-meta' }, `${powerAim(p)} · ${powerTiming(p)}`)),
      h('div', { class: 'uc-sec uc-starter' }, h('span', { class: 'eyebrow' }, 'Starter kit'),
        h('div', { class: 'uc-kit' }, ...c.starter.map((b) => piece(b)))),
      h('div', { class: 'uc-sec uc-core' }, h('span', { class: 'eyebrow' }, 'Core pool · drafted twice as often'),
        h('div', { class: 'uc-kit row' }, ...others.map((b) => piece(b, true)))),
    );
    return card;
  });

  const banCount = h('b', { id: 'ban-count' });
  const banButtons = roster.map((id) => {
    const b = content.buildings[id]!;
    const btn = h('button', {
      class: 'ban', 'data-ban': id, 'aria-pressed': 'false',
      onclick: () => {
        const i = choice.bans.indexOf(id);
        if (i >= 0) choice.bans.splice(i, 1);
        else if (choice.bans.length < MAX_BANS) choice.bans.push(id);
        sync();
      },
    }, sprite(atlas, b.sprite, 'uc-sprite'), h('span', { class: 'ban-name' }, b.name), h('span', { class: 'ban-state' }));
    tip.attach(btn, { key: () => `${id}|${choice.commander}`, build: () => [h('b', null, b.name), h('span', null, buildingDescription(content, id)),
      content.commanders[choice.commander]!.core.includes(id) ? h('span', { class: 'muted' }, 'In this commander\'s core pool: it can\'t be banned.') : null].filter((x): x is HTMLElement => !!x) });
    return btn;
  });

  const tabs: Record<UnderrootTab, { btn: HTMLButtonElement; panel: HTMLElement }> = {
    commanders: {
      btn: h('button', { class: 'btn', role: 'tab', id: 'tab-commanders', 'data-tab': 'commanders', onclick: () => show('commanders') }, 'Commander'),
      panel: h('div', { class: 'uc-cards', role: 'tabpanel', id: 'commanders', 'aria-labelledby': 'tab-commanders' }, ...cards),
    },
    bans: {
      btn: h('button', { class: 'btn', role: 'tab', id: 'tab-bans', 'data-tab': 'bans', onclick: () => show('bans') }, 'Bans', h('span', { class: 'tab-count', id: 'tab-ban-count' })),
      panel: h('div', { class: 'uc-bans', role: 'tabpanel', id: 'bans', 'aria-labelledby': 'tab-bans' },
        h('p', { class: 'uc-bans-text' }, 'Ban up to ', String(MAX_BANS), ' buildings: they never come up in drafts or spoils this run. Your commander\'s core pool can\'t be banned. ', banCount),
        h('div', { class: 'ban-grid' }, ...banButtons)),
    },
  };
  let current: UnderrootTab = opts.tab;
  function show(tab: UnderrootTab): void {
    current = tab;
    sync();
  }

  const chosenLine = h('span', { class: 'uc-chosen', id: 'uc-chosen' });
  function sync(): void {
    const cmd = content.commanders[choice.commander]!;
    // switching commanders drops bans that are now in the core pool
    choice.bans = choice.bans.filter((b) => !cmd.core.includes(b));
    for (const card of cards) {
      const on = card.dataset.commander === choice.commander;
      toggleClass(card, 'on', on);
      card.setAttribute('aria-pressed', String(on));
    }
    for (const btn of banButtons) {
      const id = btn.dataset.ban!;
      const core = cmd.core.includes(id), banned = choice.bans.includes(id);
      btn.disabled = core || (!banned && choice.bans.length >= MAX_BANS);
      toggleClass(btn, 'on', banned);
      toggleClass(btn, 'core', core);
      btn.setAttribute('aria-pressed', String(banned));
      setText(btn.querySelector('.ban-state')!, core ? 'Core' : banned ? 'Banned' : '');
    }
    setText(banCount, `${choice.bans.length} of ${MAX_BANS} banned.`);
    setText(tabs.bans.btn.querySelector('.tab-count')!, choice.bans.length ? ` (${choice.bans.length})` : '');
    for (const [k, t] of Object.entries(tabs) as [UnderrootTab, (typeof tabs)[UnderrootTab]][]) {
      t.panel.hidden = k !== current;
      toggleClass(t.btn, 'on', k === current);
      t.btn.setAttribute('aria-selected', String(k === current));
    }
    setText(chosenLine, `${cmd.name}${choice.bans.length ? ` · ${choice.bans.length} ban${choice.bans.length === 1 ? '' : 's'}` : ''}`);
  }

  const beginBtn = h('button', { class: 'btn primary', id: 'underroot-begin', onclick: () => { tip.dispose(); opts.begin({ commander: choice.commander, bans: [...choice.bans] }); } }, 'Begin run');
  const el = h('div', { class: 'runscreen', id: 'underroot', 'data-tab': opts.tab },
    h('div', { class: 'runpanel wide underroot' },
      h('div', { class: 'uc-top' },
        h('div', null, h('div', { class: 'eyebrow' }, 'The Underroot · before the run'), h('h1', { class: 'runtitle' }, 'Choose your commander')),
        h('div', { class: 'seg uc-tabs', role: 'tablist', 'aria-label': 'Run setup' }, tabs.commanders.btn, tabs.bans.btn)),
      opts.tip ? h('div', { class: 'callout tip uc-hint', id: 'underroot-hint', role: 'status' },
        h('b', { class: 'tip-word' }, 'Tip'),
        h('span', null, 'Your commander shapes the whole run: a passive that\'s always on, a power you aim in battle with ', h('kbd', null, 'Q'),
          ', and the three buildings you start with. Hover a building to see what it does.')) : null,
      tabs.commanders.panel,
      tabs.bans.panel,
    ),
    h('footer', { class: 'runfoot' },
      h('div', { class: 'runfoot-left' }, opts.back ? h('button', { class: 'btn', id: 'underroot-back', onclick: () => { tip.dispose(); opts.back!(); } }, 'Back') : null),
      h('div', { class: 'runfoot-right' }, chosenLine, h('div', { class: 'uc-begin' }, beginBtn))),
    tip.el,
  );
  sync();
  return el;
}
