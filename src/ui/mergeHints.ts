// Plain-language merge text for the inspect panel and the help overlay (SPEC §5.5–5.6, §10.4).
import type { Content } from '../data/registry.ts';
import { perkAt } from '../sim/compile.ts';
import type { Tier } from '../sim/index.ts';

export const TIER_NAME = ['base', 'Bloomed', 'Elder'] as const;
export const TIER_PIPS = ['', '✦', '✦✦'] as const;

const num = (x: number) => String(Math.round(x * 100) / 100);

/** The perk a unit has at a tier, e.g. "range +1.5 · attack interval ×0.9". Empty for tier 1. */
export function perkText(content: Content, unitId: string, tier: Tier): string {
  const u = content.units[unitId];
  if (!u || tier === 1) return '';
  const p = perkAt(u, tier);
  const parts: string[] = [];
  if (p.hpMult) parts.push(`HP ×${num(p.hpMult)}`);
  if (p.damageMult) parts.push(`damage ×${num(p.damageMult)}`);
  if (p.speedMult) parts.push(`speed ×${num(p.speedMult)}`);
  if (p.attackIntervalMult) parts.push(`attack interval ×${num(p.attackIntervalMult)}`);
  if (p.rangeAdd) parts.push(`range +${num(p.rangeAdd)}`);
  if (p.splashRadius) parts.push(u.splashRadius ? `cleave ${num(u.splashRadius)} → ${num(p.splashRadius)}` : `cleave ${num(p.splashRadius)}`);
  if (p.radiusAdd) parts.push('bigger body');
  if (p.slayerMult) parts.push(`slayer ×${num(p.slayerMult)}`);
  for (const [t, m] of Object.entries(p.resist ?? {})) parts.push(`takes ×${num(m)} ${t}`);
  if (p.healTargets) parts.push(`heals ${p.healTargets} targets`);
  return parts.join(' · ');
}
