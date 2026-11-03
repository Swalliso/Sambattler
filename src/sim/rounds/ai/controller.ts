// The planning turn in rounds (SPEC §7.1, §7.2, §14.6's opening steps 5 and 7): the general's, at the
// round's opening before the player plans, and a bot's or general's on the player's side after it, which
// ends by queueing `beginClash`, so the state is then the planning checkpoint (plan Call 14). A planner reads
// only `planningView` and draws only on its own side's AI stream (plan Call 10). It acts only through
// `planning.ts`'s executors, run at once, since a queued enemy plan is refused (plan Call 8), so it stamps,
// logs and counts its own refusals as the queue does. Its plan for the round goes in `ai.plans` (plan Call
// 12). An adaptive general's counter cycle (`counter.ts`) is step 1, and X8's two default-off knobs are read
// here (§7.2). It stands beside v1's `src/sim/ai/controller.ts` until R2b moves it there.
import { nextFloat } from '../../rng.ts';
import { commandStamp, queueCommand } from '../commands.ts';
import { plant, sell, sellValue, toggleMerge } from '../planning.ts';
import { other } from '../state.ts';
import type { AiPlan, AiState, AiWeight, BattleState, BuildingState, Command, CommandBody, Side } from '../state.ts';
import { roundOutcome } from '../systems/victory.ts';
import { counterKindsOf, doctrineMult, lastAnswer, runCycle } from './counter.ts';
import { choosePlot, freePlots } from './formationScore.ts';
import { planningView } from './view.ts';
import type { PlanningView } from './view.ts';

/** The commands a planner runs at once. */
export type PlanBody = Extract<CommandBody, { type: 'plant' | 'sell' | 'toggleMerge' }>;

/**
 * The side's planning turn (§7.2), which `openRound` runs for each AI side. `income` is what the round's
 * opening paid the side, which its plan records.
 */
export function planTurn(state: BattleState, side: Side, income = 0): void {
  const ai = state.sides[side].ai;
  if (!ai) throw new Error(`the ${side} side has no AI to plan`);
  const sold: AiPlan['sold'] = [];
  const sellNow = (b: BuildingState): boolean => {
    if (runAtOnce(state, side, { type: 'sell', entityId: b.id })) return false;
    sold.push({ building: b.buildingId, plot: b.plot });
    return true;
  };
  // 1. a due counter, which may sell for room (§7.4); round 1's opening doctrine came with the profile (§7.6)
  const counter = runCycle(planningView(state, side), ai, sellNow);
  // 2. buy and plant in a loop, then X8's replace-when-full when it's on
  const planted = buy(state, side, ai);
  if (ai.counter && state.library.balance.rounds.ai.replaceWhenFull) replaceWhenFull(state, side, sellNow, planted);
  // 3. set the merge toggles
  setToggles(state, side);
  const plan: AiPlan = {
    round: state.round, planted: planted.map((b) => ({ building: b.buildingId, plot: b.plot })), sold, income, banked: state.sides[side].gold,
    ...(counter ? { counter: counter.kind } : {}),
  };
  ai.plans.push(plan);
  state.events.push({ t: 'generalPlanned', side, planted: planted.map((b) => b.id), sold: sold.map((x) => x.building), ...(counter ? { counter: counter.kind } : {}) });
  if (side === 'player') queueCommand(state, { ...commandStamp(state), side, type: 'beginClash' });
}

/**
 * Runs a planning command now (§7.1): stamped as the queue would stamp it, logged, and run by its executor.
 * A refusal is a `commandRejected`, counted in `rejectedCommands`. It returns why it was refused, or null.
 */
export function runAtOnce(state: BattleState, side: Side, body: PlanBody): string | null {
  const cmd = { ...commandStamp(state), side, seq: state.nextSeq[side]++, ...body } as Command;
  state.log.push(cmd);
  const problem = body.type === 'plant' ? plant(state, side, body.buildingId, body.plot)
    : body.type === 'sell' ? sell(state, side, body.entityId) : toggleMerge(state, side, body.entityId, body.on);
  if (problem) {
    state.events.push({ t: 'commandRejected', side, seq: cmd.seq, reason: problem });
    state.stats[side].rejectedCommands++;
  }
  return problem;
}

/**
 * Step 2 (§7.2): in round 1 the opener first, skipping a card it can't afford or may not plant, then
 * weighted picks with the gold left. A target is planted at its best plot while it's in reach, then it
 * picks again. It stops when the target is out of reach, which it carries into the next planning phase
 * once, or when nothing it buys has a free plot. It keeps no reserve (#29). It returns what it planted.
 */
/** Plants the card at its best plot (§7.3), adding it to `planted`; false when it has no plot or was refused. */
function plantBest(state: BattleState, side: Side, view: PlanningView, buildingId: string, planted: BuildingState[]): boolean {
  const plot = choosePlot(view, buildingId, merges(view, buildingId));
  if (plot === null || runAtOnce(state, side, { type: 'plant', buildingId, plot })) return false;
  planted.push(state.buildings.at(-1)!);
  return true;
}

function buy(state: BattleState, side: Side, ai: AiState): BuildingState[] {
  const planted: BuildingState[] = [];
  const plantAt = (view: PlanningView, buildingId: string): boolean => plantBest(state, side, view, buildingId, planted);
  if (state.round === 1) {
    for (const id of ai.opener) {
      const view = planningView(state, side);
      if (canBuy(view, id) && inReach(view, id)) plantAt(view, id);
    }
  }
  for (;;) {
    const view = planningView(state, side);
    const carried = ai.target;
    delete ai.target;
    // a target carried from the last planning phase comes first, if it's in reach now; otherwise it's dropped
    const id = carried && carried.round === view.round - 1 && canBuy(view, carried.building) && inReach(view, carried.building)
      ? carried.building : pick(view);
    if (id === null) break;
    if (!inReach(view, id)) {
      ai.target = { building: id, round: view.round };
      break;
    }
    if (!plantAt(view, id)) break;
  }
  return planted;
}

/** Step 3 (§7.2): each spawner's toggle as the side's policy wants it this round, changed by a command. */
function setToggles(state: BattleState, side: Side): void {
  const view = planningView(state, side);
  if (!view.merging) return;
  for (const b of view.buildings) {
    if (view.cards[b.buildingId]?.kind !== 'spawner') continue;
    const on = wantsMerge(view, b.buildingId);
    if (b.mergeOn !== on) runAtOnce(state, side, { type: 'toggleMerge', entityId: b.id, on });
  }
}

/**
 * The weights the side would pick a target by now (§7.2), for each card its profile lists: its doctrine
 * weight × the situational multipliers (economy × 1.5 before round 3 and × 0.3 from round 7, towers × 2
 * after a round it lost) × the counter's and the intel's (§7.4, §7.6) × X8's lean. A card it may not buy now weighs 0.
 */
export function targetWeights(view: PlanningView): Record<string, number> {
  const out: Record<string, number> = {};
  const answer = leanKind(view);
  for (const w of view.ai?.weights ?? []) out[w.building] = canBuy(view, w.building) ? weightOf(view, w, answer) : 0;
  return out;
}

/** A listed card's weight, whether or not it may be bought now: `answer` is the kind X8's lean favours, if any. */
function weightOf(view: PlanningView, w: AiWeight, answer: ReturnType<typeof leanKind>): number {
  const lean = answer && counterKindsOf(view, w.building).includes(answer) ? 1 + view.knobs.leanToLastAnswer : 1;
  return w.weight * situational(view, w.building) * doctrineMult(view, w.building) * lean;
}

/** X8's `leanToLastAnswer` (default off, §7.2): from round 2, the kind that answers last round's army, for a general that runs the counter cycle. */
function leanKind(view: PlanningView) {
  return view.knobs.leanToLastAnswer > 0 && view.round >= 2 && view.ai?.counter ? lastAnswer(view) : null;
}

/**
 * X8's `replaceWhenFull` (default off, §7.2): with no plot free once it has bought, it sells its lowest-weighted
 * spawner that has fielded, at 60%, for the heaviest card that outweighs it and that its gold and the refund
 * afford, at most once a turn. The spawner's ties go rearmost, then the lower file, the building id and the
 * entity id; the card's go to the dearer, then by id.
 */
function replaceWhenFull(state: BattleState, side: Side, sellNow: (b: BuildingState) => boolean, planted: BuildingState[]): void {
  const view = planningView(state, side);
  if (freePlots(view).length > 0) return;
  const answer = leanKind(view);
  const listed = new Map(view.ai!.weights.map((w) => [w.building, w]));
  const weigh = (id: string) => { const w = listed.get(id); return w ? weightOf(view, w, answer) : 0; };
  const plot = (b: BuildingState) => view.plots[b.plot]!;
  const [low] = view.buildings
    .filter((b) => b.fielded && view.cards[b.buildingId]?.kind === 'spawner')
    .sort((a, b) => weigh(a.buildingId) - weigh(b.buildingId) || plot(b).rank - plot(a).rank || plot(a).file - plot(b).file
      || (a.buildingId < b.buildingId ? -1 : a.buildingId > b.buildingId ? 1 : 0) || a.id - b.id);
  if (!low) return;
  const gold = view.gold + sellValue(state, low.id), floor = weigh(low.buildingId);
  const [card] = [...listed.keys()]
    .filter((id) => weigh(id) > floor && withinLimits(view, id, low) && view.cards[id]!.cost <= gold)
    .sort((a, b) => weigh(b) - weigh(a) || view.cards[b]!.cost - view.cards[a]!.cost || (a < b ? -1 : a > b ? 1 : 0));
  if (!card || !sellNow(low)) return;
  plantBest(state, side, planningView(state, side), card, planted);
}

/** A weighted pick from its stream (§7.2), in the profile's order, by building id; null when nothing weighs anything. */
function pick(view: PlanningView): string | null {
  const weights = targetWeights(view);
  const list = view.ai!.weights.map((w) => [w.building, weights[w.building]!] as const);
  const total = list.reduce((n, [, w]) => n + w, 0);
  if (total <= 0) return null;
  let roll = nextFloat(view.rng) * total;
  for (const [id, w] of list) {
    roll -= w;
    if (roll < 0 && w > 0) return id;
  }
  // rounding can leave the roll at the very top: the last card that weighs anything
  for (let i = list.length - 1; i >= 0; i--) if (list[i]![1] > 0) return list[i]![0];
  return null;
}

function situational(view: PlanningView, buildingId: string): number {
  const k = view.knobs;
  let mult = 1;
  switch (view.cards[buildingId]!.kind) {
    case 'economy':
      if (view.round < k.economyEarly.beforeRound) mult *= k.economyEarly.mult;
      else if (view.round >= k.economyLate.fromRound) mult *= k.economyLate.mult;
      break;
    case 'tower': {
      const last = view.rounds.at(-1);
      if (last && roundOutcome(last.damage).loser === view.side) mult *= k.towerAfterLossMult;
      break;
    }
  }
  return mult;
}

/**
 * True if the side may plant the card now, gold aside (§7.2, §7.8): it's in its kit, it's under its
 * `maxOwned` (the profile's limit, or a general's kit card's), its `afterRound` has come, and a plot is free.
 */
function canBuy(view: PlanningView, buildingId: string): boolean {
  return withinLimits(view, buildingId) && freePlots(view).length > 0;
}

/** `canBuy`'s rules but the free plot, counting what it owns without `sold`, a building it is about to sell. */
function withinLimits(view: PlanningView, buildingId: string, sold?: BuildingState): boolean {
  const card = view.kit.find((c) => c.building === buildingId);
  if (!card || !view.cards[buildingId]) return false;
  const limit: AiWeight | undefined = view.ai?.weights.find((w) => w.building === buildingId);
  const owned = view.buildings.filter((b) => b.buildingId === buildingId && b.id !== sold?.id).length;
  if ([limit?.maxOwned, card.maxOwned].some((max) => max !== undefined && owned >= max)) return false;
  return limit?.afterRound === undefined || view.round >= limit.afterRound;
}

const inReach = (view: PlanningView, buildingId: string): boolean => view.gold >= view.cards[buildingId]!.cost;

/**
 * Whether the side's toggle for the spawner is on this round (§7.2 step 3): always with policy `on`, never
 * with `off`, and with `auto` off only on swarm buildings while the other side's last fielded army was more
 * than `mergeOffSlayerShare` Slayers by supply.
 */
export function wantsMerge(view: PlanningView, buildingId: string): boolean {
  const policy = view.ai?.mergePolicy ?? 'on';
  if (policy !== 'auto') return policy === 'on';
  const squad = view.cards[buildingId]?.squad;
  const swarm = squad !== undefined && view.units[squad.unit]!.tags.includes('swarm');
  return !(swarm && slayerShare(view) > view.mergeOffSlayerShare);
}

/** Whether the building's squads merge this round, as step 2's placement reads it: a spawner, in a battle that merges, toggled on. */
function merges(view: PlanningView, buildingId: string): boolean {
  return view.merging && view.cards[buildingId]?.kind === 'spawner' && wantsMerge(view, buildingId);
}

/** The share of supply the other side fielded last round in Slayers (§7.2), from the `fielded` record; 0 before any round. */
export function slayerShare(view: PlanningView): number {
  let all = 0, slayers = 0;
  for (const f of view.rounds.at(-1)?.fielded[other(view.side)] ?? []) {
    const u = view.theirUnits[f.unitId];
    if (!u) continue;
    const supply = f.count * u.tiers[f.tier - 1]!.supply;
    all += supply;
    if (u.slayer) slayers += supply;
  }
  return all > 0 ? slayers / all : 0;
}
