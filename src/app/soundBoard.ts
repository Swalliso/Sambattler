// The sound board (`?scene=sounds`, SPEC §13.9): every sound in data/sounds.json with a play button,
// grouped by bus, plus the ambient bed, speed thinning and the enemy's quieter side, for auditioning
// the set before a playtest. It isn't part of the game, so nothing here touches a run or a battle.
import type { AudioEngine } from '../audio/engine.ts';
import { soundSeconds } from '../audio/synth.ts';
import type { Content } from '../data/registry.ts';
import type { SoundBusT, SoundDef } from '../data/schema.ts';
import type { Atlas } from '../render/atlas.ts';
import { h, setText, toggleClass } from '../ui/h.ts';
import { soundDim, soundSpeed, soundToggle } from './sound.ts';

const GROUPS: [SoundBusT, string, string][] = [
  ['sfx', 'Battle', 'Sim events, heard on the battle screen. Yours play louder than the Gray Rot\'s.'],
  ['ui', 'Interface', 'Buttons, cards, the route and events, on every screen.'],
  ['ambient', 'Ambience', 'The cave bed\'s random drips. The drone itself is the ambient bed below.'],
];
const BURST = 8;
const BURST_GAP_MS = 70;

export function soundBoard(content: Content, atlas: Atlas, engine: AudioEngine): void {
  const bank = content.audio;
  let side: 'player' | 'enemy' = 'player';
  let playAll: ReturnType<typeof setTimeout> | null = null;
  const rows = new Map<string, HTMLElement>();
  const play = (id: string) => engine.play(id, side === 'enemy' ? { gain: bank.enemyGain } : {});

  const segmented = (label: string, options: [string, () => void][], initial: number) => {
    const btns = options.map(([text, f], i) => h('button', {
      class: `btn${i === initial ? ' on' : ''}`, onclick: () => { btns.forEach((b, j) => toggleClass(b, 'on', i === j)); f(); },
    }, text));
    return h('div', { class: 'sb-group' }, h('span', { class: 'label' }, label), ...btns);
  };

  const ambientBtn = h('button', { class: 'btn', id: 'sb-ambient', onclick: () => { engine.setAmbient(!engine.ambientOn); syncAmbient(); } }, '');
  const syncAmbient = () => {
    setText(ambientBtn, engine.ambientOn ? 'Stop the ambient bed' : 'Play the ambient bed');
    toggleClass(ambientBtn, 'on', engine.ambientOn);
  };
  syncAmbient();
  const voices = h('span', { class: 'sb-voices', id: 'sb-voices' }, '');
  const allBtn = h('button', { class: 'btn', id: 'sb-play-all', 'data-sfx': 'none', onclick: () => (playAll ? stopAll() : startAll()) }, 'Play all');

  const stopAll = () => {
    if (playAll !== null) clearTimeout(playAll);
    playAll = null;
    setText(allBtn, 'Play all');
    for (const r of rows.values()) toggleClass(r, 'playing', false);
  };
  const startAll = () => {
    const order = bank.sounds;
    let i = 0;
    setText(allBtn, 'Stop');
    const next = () => {
      for (const r of rows.values()) toggleClass(r, 'playing', false);
      const s = order[i++];
      if (!s) { stopAll(); return; }
      toggleClass(rows.get(s.id)!, 'playing', true);
      rows.get(s.id)!.scrollIntoView({ block: 'nearest' });
      play(s.id);
      playAll = setTimeout(next, soundSeconds(s) * 1000 + 450);
    };
    next();
  };

  const row = (s: SoundDef) => {
    const result = h('span', { class: 'sb-result muted' });
    const burst = () => {
      let played = 0, n = 0;
      const tick = () => {
        if (play(s.id)) played++;
        setText(result, `${played}/${++n} played`);
        if (n < BURST) setTimeout(tick, BURST_GAP_MS);
      };
      tick();
    };
    const meta = [`priority ${s.priority}`, `cooldown ${s.cooldownMs} ms`, `${soundSeconds(s).toFixed(2)} s`];
    if (s.frequent) meta.push('frequent: thins at 2× and 3×');
    const el = h('tr', { class: 'sb-row', 'data-sound': s.id },
      h('td', null, h('button', { class: 'btn sb-play', 'data-sfx': 'none', onclick: () => setText(result, play(s.id) ? '' : 'dropped') }, 'Play')),
      h('td', null, h('button', { class: 'btn sb-burst', 'data-sfx': 'none', title: `${BURST} plays ${BURST_GAP_MS} ms apart: hear the cooldown and voice cap`, onclick: burst }, `×${BURST}`)),
      h('td', null, h('b', null, s.name), h('div', { class: 'sb-id' }, s.id)),
      h('td', null, s.note ?? '', h('div', { class: 'muted' }, meta.join(' · '))),
      h('td', null, result),
    );
    rows.set(s.id, el);
    return el;
  };

  const notice = engine.active ? null
    : h('div', { class: 'callout bad', id: 'sb-off', role: 'status' }, 'Sound is off on this page: ?test=1, an automated browser (add &sound=1), or no WebAudio.');
  const page = h('div', { class: 'runscreen soundboard', id: 'soundboard' },
    h('header', { class: 'runbar' }, h('div', { class: 'stat' }, h('b', null, 'Sound board')),
      h('span', { class: 'muted' }, `${bank.sounds.length} sounds from data/sounds.json, synthesized live`), h('span', { class: 'relics' }), soundToggle(atlas, 'down')),
    h('div', { class: 'runpanel wide' },
      h('h1', { class: 'runtitle' }, 'Sound board',
        h('span', { class: 'hint' }, ' Click anywhere first: browsers start audio only after a click or key press.')),
      notice,
      h('div', { class: 'sb-controls' },
        h('div', { class: 'sb-group' }, h('span', { class: 'label' }, 'Ambient bed'), ambientBtn,
          h('label', { class: 'sb-check' }, h('input', { type: 'checkbox', id: 'sb-dim', onchange: (e: Event) => soundDim((e.target as HTMLInputElement).checked) }), 'Battle paused (softer)')),
        segmented('Speed', [1, 2, 3].map((n) => [`${n}×`, () => soundSpeed(n)]), 0),
        segmented('Side', [['Yours', () => { side = 'player'; }], ['Theirs', () => { side = 'enemy'; }]], 0),
        h('div', { class: 'sb-group' }, allBtn, voices),
      ),
      ...GROUPS.map(([bus, title, blurb]) => h('section', null,
        h('h3', null, title, h('span', { class: 'muted sb-blurb' }, blurb)),
        h('table', { class: 'sb-table', id: `sb-${bus}` }, ...bank.sounds.filter((s) => s.bus === bus).map(row)),
      )),
    ),
  );
  document.getElementById('app')!.replaceChildren(page);
  const tickVoices = () => setText(voices, `voices ${engine.voiceCount}/${bank.maxVoices}${engine.unlocked ? '' : ' · waiting for a click'}`);
  tickVoices();
  setInterval(tickVoices, 200);
}
