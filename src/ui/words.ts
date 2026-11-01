// Plain words for player-facing text (playtest round 3: "orthogonally adjacent" lost a player, and
// "income tick", "surcharge" and "knit" read as jargon). Every battle copies the data's own text into its
// state, so rewording data/*.json would move the golden hashes. Until the next golden refresh the plain
// wording lives here, keyed by id, and every screen reads relics, upgrade levels and building
// descriptions through it. tests/unit/words.test.ts checks that each rewording keeps the data's numbers.
import type { Content } from '../data/registry.ts';
import type { PowerDef } from '../data/schema.ts';
import { h } from './h.ts';

const RELICS: Record<string, string> = {
  fruitingSeason: 'Economy buildings earn +1 gold more every 5 s.',
  rootStipend: 'Your Heartcap pays +2 gold more every 5 s.',
  quickRoots: 'Your units claim columns 20% faster.',
  deepCellars: 'Interest cap +10: each new wave can pay up to 10 more gold of interest.',
  sporeTithe: '+4 gold each time your units merge.',
  forwardSpores: 'Building farther from home costs half as much extra.',
  knittingCircle: 'Merging takes 50% less time, and units can merge from 0.5 tiles farther apart.',
  mycorrhizalLink: 'Buildings touching 2 or more of your buildings on a side, not just a corner, spawn 15% faster.',
  sporeCloud: 'Your units burst as they die: 10 Crush damage to everything within 1.0 tile.',
  eldersPatience: 'Elders +25% HP; out of combat they heal 2% of their HP every second.',
  rotEater: '+1 gold for each enemy unit killed while the Sporestorm is on.',
  martyrsBloom: 'When one of your buildings is destroyed, it bursts: 60 Crush damage to everything within 2.0 tiles.',
};

/** Upgrade levels by `<building>:<level>` (1-based). */
const UPGRADES: Record<string, string> = {
  'capguardHall:2': 'Capguards take 20% less Pierce damage (×0.8)',
  'gillNest:1': 'Gill Archer range +0.75 tiles',
  'gillNest:3': 'Gill Archers wait 15% less between attacks',
  'rootbreakerDen:3': 'Rootbreakers deal +25% to buildings and Heartcaps',
  'puffballMortar:1': 'Mortar blast reaches +0.3 tiles farther',
  'puffballMortar:3': 'Mortar range +1 tile',
  'truffleCellar:1': 'Truffle Cellar +1 gold every 5 s',
  'truffleCellar:3': 'Truffle Cellar +1 gold every 5 s',
  'scythecapGrove:3': 'Scythecap cleave reaches +0.3 tiles farther',
  'tendersRing:3': 'Tender heal range +0.75 tiles',
  'hammercapForge:3': 'Hammercaps wait 12% less between attacks',
  'sporeExchange:1': '+1 gold every 5 s',
  'sporeExchange:3': 'Interest cap +10: each new wave can pay up to 10 more gold',
};

const BUILDINGS: Record<string, string> = {
  truffleCellar: 'Grows truffles: gold every 5 s, all battle. +50% on Rich Loam.',
  sporeExchange: 'Trades spores for interest: +1 gold every 5 s, and each new wave can pay up to 10 more gold of interest while it stands.',
  puffballMortar: 'A tower that lobs bursting puffballs: Crush damage to everything near where they land. It can\'t hit units right next to it.',
};

/** The relic's effect in plain words. */
export function relicText(content: Content, id: string): string {
  return RELICS[id] ?? content.relics[id]?.text ?? id;
}

/** One upgrade level's effect in plain words (`level` counts from 1). */
export function upgradeText(content: Content, id: string, level: number): string {
  return UPGRADES[`${id}:${level}`] ?? content.upgrades[id]?.levels[level - 1]?.text ?? '';
}

/** A building's description in plain words. */
export function buildingDescription(content: Content, id: string): string {
  return BUILDINGS[id] ?? content.buildings[id]?.description ?? '';
}

/** How a commander power is aimed, in plain words ("Aim at a point: 2-tile radius"). */
export function powerAim(p: PowerDef): string {
  return p.target === 'point' ? `Aim at a point: ${p.radius}-tile radius`
    : p.kind === 'tithe' ? 'No aim: pays for all your ground' : 'No aim: every lane at once';
}

/** A power's timing in plain words ("Ready at 0:45, then every 75 s"). */
export function powerTiming(p: PowerDef, cooldownMult = 1): string {
  const first = Math.round(p.firstReady);
  return `Ready at ${Math.floor(first / 60)}:${String(first % 60).padStart(2, '0')}, then every ${Math.round(p.cooldown * cooldownMult)} s`;
}

/** The plain rewordings, for the test that keeps their numbers in step with the data. */
export const REWORDED = { relics: RELICS, upgrades: UPGRADES, buildings: BUILDINGS } as const;

/**
 * A tiny picture for a relic whose rule is about layout, or null. Mycorrhizal Link: a building in the
 * middle, two buildings on its sides (they count) and one on a corner (it doesn't).
 */
export function relicDiagram(id: string): HTMLElement | null {
  if (id !== 'mycorrhizalLink') return null;
  // a 3×3 patch of ground: the middle building, side neighbours that count, a corner one that doesn't
  const cells = ['corner', 'side', '', 'side', 'mid', '', '', '', ''];
  return h('span', { class: 'adj-diagram', role: 'img', 'aria-label': 'Touching on a side counts; touching only at a corner does not' },
    h('span', { class: 'adj-grid', 'aria-hidden': 'true' }, ...cells.map((c) => h('i', { class: c }))),
    h('span', { class: 'adj-key', 'aria-hidden': 'true' },
      h('span', null, h('i', { class: 'mid' }), 'this building'),
      h('span', null, h('i', { class: 'side' }), 'counts'),
      h('span', null, h('i', { class: 'corner' }), 'doesn\'t')));
}
