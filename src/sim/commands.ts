// The command queue and log (SPEC §14.5). Commands are validated when they execute, so an
// illegal command becomes a deterministic `commandRejected` event on replay too.
import { addBuilding } from './create.ts';
import { placementProblem, priceAt } from './placement.ts';
import { findBuilding, isBesieged } from './world.ts';
import type { BattleState, Command, CommandBody, Side } from './state.ts';

export type QueuedCommand = { tick: number; side: Side; seq?: number } & CommandBody;

/** The tick a command issued now will execute on: 0 during deploy, otherwise the next tick. */
export function nextCommandTick(state: BattleState): number {
  return state.phase === 'deploy' ? 0 : state.tick + 1;
}

function cmpCommand(a: Command, b: Command): number {
  if (a.tick !== b.tick) return a.tick - b.tick;
  if (a.side !== b.side) return a.side === 'player' ? -1 : 1;
  return a.seq - b.seq;
}

/**
 * Queues a command, keeping the queue sorted by (tick, side, seq). Sequence numbers are per side;
 * a replayed command keeps its original seq.
 */
export function queueCommand(state: BattleState, cmd: QueuedCommand): Command {
  let seq: number;
  if (cmd.seq === undefined) {
    seq = state.nextSeq[cmd.side]++;
  } else {
    seq = cmd.seq;
    if (state.nextSeq[cmd.side] <= seq) state.nextSeq[cmd.side] = seq + 1;
  }
  const full = { ...cmd, seq } as Command;
  const q = state.queue;
  let i = q.length;
  while (i > 0 && cmpCommand(q[i - 1]!, full) > 0) i--;
  q.splice(i, 0, full);
  return full;
}

function reject(state: BattleState, cmd: Command, reason: string): void {
  state.events.push({ t: 'commandRejected', side: cmd.side, seq: cmd.seq, reason });
  state.stats[cmd.side].rejectedCommands++;
}

/** Executes every queued command due at `tick` (player first, then by seq). Returns true if `begin` ran. */
export function executeCommands(state: BattleState, tick: number): boolean {
  let begun = false;
  let n = 0;
  while (n < state.queue.length && state.queue[n]!.tick <= tick) n++;
  if (n === 0) return false;
  const due = state.queue.splice(0, n);
  for (const cmd of due) {
    state.log.push(cmd);
    if (execute(state, cmd)) begun = true;
  }
  return begun;
}

function execute(state: BattleState, cmd: Command): boolean {
  const side = cmd.side;
  const ss = state.sides[side];
  if (state.phase === 'ended') { reject(state, cmd, 'battle has ended'); return false; }
  switch (cmd.type) {
    case 'begin': {
      if (state.phase !== 'deploy') { reject(state, cmd, 'not in deploy'); return false; }
      state.phase = 'live';
      return true;
    }
    case 'place': {
      const problem = placementProblem(state, side, cmd.buildingId, cmd.lane, cmd.col, cmd.row);
      if (problem) { reject(state, cmd, problem); return false; }
      if (!ss.kit.includes(cmd.buildingId)) { reject(state, cmd, 'not in your kit'); return false; }
      const price = priceAt(state, side, cmd.buildingId, cmd.col);
      if (ss.gold < price) { reject(state, cmd, 'not enough gold'); return false; }
      ss.gold -= price;
      const b = addBuilding(state, side, cmd.buildingId, cmd.lane, cmd.col, cmd.row, price);
      state.stats[side].buildingsBuilt++;
      state.events.push({ t: 'buildingPlaced', id: b.id });
      return false;
    }
    case 'sell': {
      const b = findBuilding(state, cmd.entityId);
      if (!b || b.side !== side) { reject(state, cmd, 'not your building'); return false; }
      if (isBesieged(state, b)) { reject(state, cmd, 'cannot sell while besieged'); return false; }
      const full = state.phase === 'deploy' || state.tick - b.placedTick <= state.rules.fullRefundTicks;
      const refund = full ? b.pricePaid : Math.floor((b.pricePaid * state.compiled[side].sellRefundPct) / 100);
      ss.gold += refund;
      state.buildings.splice(state.buildings.indexOf(b), 1);
      state.stats[side].buildingsSold++;
      state.events.push({ t: 'buildingSold', id: b.id, refund });
      return false;
    }
    case 'toggleMerge': {
      const b = findBuilding(state, cmd.entityId);
      if (!b || b.side !== side || !state.compiled[side].buildings[b.buildingId]?.spawn) { reject(state, cmd, 'not your spawner'); return false; }
      b.mergeOn = cmd.on;
      for (const u of state.units) if (u.sourceBuildingId === b.id) u.mergeOn = cmd.on;
      return false;
    }
    default:
      reject(state, cmd, `${cmd.type} is not available in this milestone`);
      return false;
  }
}

/** Refund the player would get for selling now (for the UI). */
export function sellValue(state: BattleState, buildingId: number): number {
  const b = findBuilding(state, buildingId);
  if (!b) return 0;
  const full = state.phase === 'deploy' || state.tick - b.placedTick <= state.rules.fullRefundTicks;
  return full ? b.pricePaid : Math.floor((b.pricePaid * state.compiled[b.side].sellRefundPct) / 100);
}
