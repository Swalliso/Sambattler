// Plain words for player-facing text (playtest round 3: "orthogonally adjacent" lost a player, and
// "income tick", "surcharge" and "knit" read as jargon). v1's battles copied the data's own text into their
// state, so its plain wording lived here, keyed by id, and every screen reads relics, upgrade levels and
// building descriptions through it. A battle in rounds holds no text (R2-Q8), so wording moves into the data:
// relics' since R2b's S6, in their v2 form (T077). tests/unit/words.test.ts checks that each rewording left
// keeps the data's numbers.
import type { Content } from '../data/registry.ts';
import type { PowerDef } from '../data/schema.ts';
import type { BattleRecord } from '../run/index.ts';


/** Upgrade levels by `<building>:<level>` (1-based). */
const UPGRADES: Record<string, string> = {
  'capguardHall:2': 'Capguards take 20% less Pierce damage (×0.8)',
  'gillNest:1': 'Gill Archer range +0.75 tiles',
  'gillNest:3': 'Gill Archers wait 15% less between attacks',
  'puffballMortar:1': "Mortar emplacement's blast reaches +0.3 tiles farther",
  'puffballMortar:3': 'Mortar emplacement range +1 tile',
  'scythecapGrove:3': 'Scythecap cleave reaches +0.3 tiles farther',
  'tendersRing:3': 'Tender heal range +0.75 tiles',
  'hammercapForge:3': 'Hammercaps wait 12% less between attacks',
  'sporeExchange:3': "Interest cap +10: each round's interest can pay up to 10 more gold",
};

const BUILDINGS: Record<string, string> = {
  truffleCellar: 'Grows truffles: gold every 5 s, all battle. +50% on Rich Loam.',
  sporeExchange: 'Trades spores for interest: +1 gold every 5 s, and each new wave can pay up to 10 more gold of interest while it stands.',
  puffballMortar: 'A tower that lobs bursting puffballs: Crush damage to everything near where they land. It can\'t hit units right next to it.',
};

/** The relic's effect in plain words: its data's text, written for v2 (§11.7). */
export function relicText(content: Content, id: string): string {
  return content.relics[id]?.text ?? id;
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
  return p.target === 'point' ? `Aim at a point: ${p.radius}-tile radius` : "No aim: pays for this clash's kills";
}

/** A power's timing in plain words: it fires once a clash (§6.6). */
export function powerTiming(): string {
  return 'Once a clash, from its first tick';
}

/** The plain rewordings, for the test that keeps their numbers in step with the data. */
export const REWORDED = { upgrades: UPGRADES, buildings: BUILDINGS } as const;

/** Lives' name on the game's screens (§2, §8.5, #56): Regrowths, with "lives" in each tooltip (`LIVES_TIP`). */
export const regrowths = (n: number): string => `${n} Regrowth${n === 1 ? '' : 's'}`;

/** The tooltip wherever Regrowths show: the run bar, the Grove, event chips, the report, the title and the top band. */
export const LIVES_TIP = 'Regrowths are your lives: a lost battle costs one, and the run ends at 0 or when the boss wins. Each battle\'s Heartcaps start full.';

/** How a battle was decided, as the summary words it (§8.8): a Rout names the round a Heartcap fell, which a battle migrated from v1 doesn't record. */
export function battleOutcome(b: Pick<BattleRecord, 'winner' | 'by' | 'rounds'>): string {
  const fell = b.rounds.at(-1)?.round;
  return `${b.winner === 'player' ? 'Won' : 'Lost'} by ${b.by === 'decision' ? 'Decision' : `Rout${fell ? ` in round ${fell}` : ''}`}`;
}
