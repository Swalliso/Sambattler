// How the General's Intent panel reads in a battle in rounds (SPEC §7.5, §10.2): the general's portrait, name and
// doctrine, and what it did this round, read from its plan for the round (`ai.plans`, plan Call 12, A070), so the
// panel survives later commands and a fast-forward to a round. There's no countdown: the general's army is on
// the field before you plan, so v1's vague telegraph is retired (Appendix A). Its passive, for the panel's
// tooltip, comes from content's words, flagged when rounds don't run it yet (plan Call 19). What the general
// remembers about you joins the doctrine with the intel file (S15). It stands beside v1's `src/ui/doctrine.ts`.
import type { Content } from '../../data/registry.ts';
import type { AiPlan, BattleState, CounterKind } from '../../sim/rounds/index.ts';

export const KIND_LABEL: Record<CounterKind, string> = { swarm: 'SWARM', line: 'LINE', armor: 'ARMOR', elite: 'ELITE' };

export interface Intent {
  /** The portrait's sprite, the name, and a general's title line ("Swarm and early aggression"). */
  sprite: string;
  name: string;
  title: string | null;
  /** The counter it's running (§7.4), or what it does instead. */
  doctrine: string;
  /** Its plan for the round on screen, or null for a side with no AI. */
  plan: AiPlan | null;
  /** What it planted and sold this round, by name and grouped: "Capguard Hall ×2". */
  planted: string[];
  sold: string[];
}

/** Names grouped by building, in the order first planted. */
function grouped(content: Content, list: { building: string }[]): string[] {
  const n = new Map<string, number>();
  for (const x of list) n.set(x.building, (n.get(x.building) ?? 0) + 1);
  return [...n].map(([id, k]) => `${content.buildings[id]?.name ?? id}${k > 1 ? ` ×${k}` : ''}`);
}

export function intentOf(content: Content, state: BattleState): Intent {
  const ctl = state.config.enemy.controller;
  const general = ctl.kind === 'general' ? content.generals[ctl.id] : undefined;
  const plan = state.sides.enemy.ai?.plans.find((p) => p.round === state.round) ?? null;
  const doctrine = plan?.counter ? `Countering ${KIND_LABEL[plan.counter]}`
    : !general ? (ctl.kind === 'bot' ? 'No doctrine' : 'Idle')
      : !general.adaptive ? 'Scripted: never adapts'
        : state.config.flags.adaptiveGeneral ? 'Watching your army' : 'Adaptation off';
  return {
    sprite: general?.sprite ?? 'g-scripted',
    name: general ? general.name : ctl.kind === 'bot' ? `Bot: ${ctl.id}` : 'Gray Rot (idle)',
    title: general?.title ?? null,
    doctrine,
    plan,
    planted: plan ? grouped(content, plan.planted) : [],
    sold: plan ? grouped(content, plan.sold) : [],
  };
}

/** Up to `max` names, then "+N" for the rest, so a long list fits the panel; its tooltip has them all. */
export function cutShort(names: string[], max: number): string {
  return names.length > max ? `${names.slice(0, max).join(', ')} +${names.length - max}` : names.join(', ');
}

/**
 * A general's passive in words (§7.7): its description's "Passive:" sentence, and whether a battle in rounds runs
 * it yet, since a passive on a retired stat compiles to nothing until R2b gives it a v2 effect (plan Call 19).
 */
export function passiveOf(content: Content, state: BattleState): { text: string; inRounds: boolean } | null {
  const ctl = state.config.enemy.controller;
  const general = ctl.kind === 'general' ? content.generals[ctl.id] : undefined;
  if (!general?.passive) return null;
  const said = /Passive: (.+?\.)(?:\s|$)/.exec(general.description ?? '')?.[1];
  const text = said ? said[0]!.toUpperCase() + said.slice(1) : 'A passive of its own.';
  return { text, inRounds: !state.compiled.enemy.ignored.some((e) => e.source === `general:${general.id}`) };
}
