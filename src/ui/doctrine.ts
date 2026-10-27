// How the general's intent reads in the UI (SPEC §7.4–7.5): kind names and icons, the pending
// warning's countdown in waves, and callout and report text. The telegraph is vague on purpose: it
// names a counter kind, never units or buildings, until the report after the battle.
import type { Content } from '../data/registry.ts';
import { activeCounter, formatClock, openingActive } from '../sim/index.ts';
import type { BattleState, CounterKind, CounterRecord } from '../sim/index.ts';

export const KIND_LABEL: Record<CounterKind, string> = { swarm: 'SWARM', line: 'LINE', armor: 'ARMOR', elite: 'ELITE' };
export const KIND_NAME: Record<CounterKind, string> = { swarm: 'Swarm', line: 'Line', armor: 'Armor', elite: 'Elite' };
export const KIND_ICON: Record<CounterKind, string> = { swarm: 'i-swarm', line: 'i-line', armor: 'i-armor', elite: 'i-elite-doctrine' };
/** What each kind answers, in the player's terms (help and tooltips). */
export const KIND_HINT: Record<CounterKind, string> = {
  swarm: 'Anti-Swarm: Slash and splash against Light units',
  line: 'Anti-Line: Pierce against Medium units',
  armor: 'Anti-Armor: Crush and siege against Heavy units',
  elite: 'Anti-Elite: Slayers against Bloomed and Elder units',
};

/** The enemy general's display name ("The Gray Rot" for bots and idle sides). */
export function generalName(content: Content, state: BattleState): string {
  const ctl = state.config.enemy.controller;
  return ctl.kind === 'general' ? content.generals[ctl.id]?.name ?? 'The Gray Rot' : 'The Gray Rot';
}

export interface Intent {
  /** The active counter doctrine, if one has activated. */
  active: CounterKind | null;
  /** The opening doctrine from intel while it is in force (two kinds for the boss). */
  opening: CounterKind[];
  dual: boolean;
  /** The soonest pending warning and the waves until it activates (rounded up). */
  pending: { kind: CounterKind; waves: number; activeAt: number } | null;
  adaptive: boolean;
}

export function intentOf(state: BattleState): Intent {
  const ai = state.sides.enemy.ai;
  const c = ai?.counter;
  if (!ai || !c) return { active: null, opening: [], dual: false, pending: null, adaptive: false };
  const waiting = c.history.filter((r) => !r.active).sort((a, b) => a.activeAt - b.activeAt)[0];
  return {
    active: activeCounter(ai)?.kind ?? null,
    opening: openingActive(ai) ? [...ai.opening!.kinds] : [],
    dual: !!ai.opening?.dual,
    pending: waiting ? { kind: waiting.kind, activeAt: waiting.activeAt, waves: Math.max(1, Math.ceil((waiting.activeAt - state.tick) / state.rules.waveTicks)) } : null,
    adaptive: true,
  };
}

export const wavesText = (n: number): string => `${n} wave${n === 1 ? '' : 's'}`;

export function warningText(name: string, kind: CounterKind, waves: number): string {
  return `${name} is preparing to counter your ${KIND_LABEL[kind]}: ${wavesText(waves)}`;
}

export function activeText(name: string, kind: CounterKind): string {
  return `${name} now counters your ${KIND_LABEL[kind]}`;
}

export function rememberText(kinds: CounterKind[]): string {
  return `The Gray Rot remembers your ${kinds.map((k) => KIND_LABEL[k]).join(' and ')}`;
}

/**
 * One report line per counter (SPEC §7.5): "Swarm (4:00) with Capguard Hall ×2, Scythecap Grove",
 * plus what it drafted and sold. The units are named after the fact so the player learns.
 */
export function counterLine(content: Content, c: Pick<CounterRecord, 'kind' | 'activeAt' | 'warnedAt' | 'active' | 'drafted' | 'sold' | 'built'>, tickRate = 20): string {
  const name = (id: string) => content.buildings[id]?.name ?? id;
  const built = Object.entries(c.built).sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1)).map(([id, n]) => `${name(id)}${n > 1 ? ` ×${n}` : ''}`);
  let s = `${KIND_NAME[c.kind]} (${formatClock(c.active ? c.activeAt : c.warnedAt, tickRate)})`;
  if (!c.active) s += `: warned, the battle ended before it activated`;
  else s += built.length ? ` with ${built.join(', ')}` : ': no new buildings';
  if (c.drafted) s += `; drafted ${name(c.drafted)}`;
  if (c.sold.length) s += `; sold ${c.sold.map(name).join(', ')} for space`;
  return s;
}
