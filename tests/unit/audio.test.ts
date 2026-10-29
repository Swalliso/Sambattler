// Sound (SPEC §13.9): the sound bank's schema and cross-references, the voice cap and cooldown
// policy, the engine's no-op mode in Node, and the battle events that become sounds.
import { describe, expect, it } from 'vitest';
import { AudioEngine } from '../../src/audio/engine.ts';
import { VoiceLimiter } from '../../src/audio/limits.ts';
import type { Voice } from '../../src/audio/limits.ts';
import { soundSeconds } from '../../src/audio/synth.ts';
import { BattleSound } from '../../src/app/battleSound.ts';
import { ContentError, REQUIRED_SOUNDS, loadContent } from '../../src/data/registry.ts';
import { SoundBankSchema } from '../../src/data/schema.ts';
import type { SoundDef } from '../../src/data/schema.ts';
import { createBattle, makeConfig, nextCommandTick, queueCommand, step } from '../../src/sim/index.ts';
import { readRawContent } from '../../tools/lib/content.ts';
import { content } from '../helpers.ts';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Loose = Record<string, any>;

const raw = readRawContent();
const thinning = content.audio.speedThinning;
const rule = (priority: number, cooldownMs = 0, frequent = false) => ({ priority, cooldownMs, frequent });

function voice(id: string, priority: number, start: number, end = start + 1000): Voice & { stopped: boolean } {
  const v = { id, priority, start, end, stopped: false, stop() { v.stopped = true; } };
  return v;
}

describe('sound bank', () => {
  it('ships every sound the game plays, with drips on the ambient bus', () => {
    for (const id of REQUIRED_SOUNDS) expect(content.sounds[id], id).toBeDefined();
    for (const id of content.audio.ambient.drips.sounds) expect(content.sounds[id]!.bus).toBe('ambient');
    expect(content.audio.maxVoices).toBe(12);
  });

  it('keeps the player louder than the enemy, and the spawn puff and hover tick quiet', () => {
    expect(content.audio.enemyGain).toBeLessThan(1);
    expect(content.sounds.spawn!.frequent).toBe(true);
    expect(content.sounds.spawn!.gain).toBeLessThan(content.sounds.place!.gain);
    expect(content.sounds['ui-hover']!.gain).toBeLessThan(content.sounds['ui-click']!.gain);
    expect(content.sounds['heartcap-hit']!.cooldownMs).toBe(1500);
  });

  it('rejects pitchless oscillators and pitched noise', () => {
    const bank = structuredClone(raw['sounds.json']) as Loose;
    delete bank.sounds[0].layers[0].freq;
    expect(SoundBankSchema.safeParse(bank).success).toBe(false);
    const noisy = structuredClone(raw['sounds.json']) as Loose;
    noisy.sounds[0].layers[1].freq = 400;
    const res = SoundBankSchema.safeParse(noisy);
    expect(res.success).toBe(false);
    expect(res.error!.issues.some((i) => /noise has no pitch/.test(i.message))).toBe(true);
  });

  it('rejects bad envelopes, buses, waves and gap ranges', () => {
    const cases: ((b: Loose) => void)[] = [
      (b) => { b.sounds[0].layers[0].env.sustain = 1.5; },
      (b) => { b.sounds[0].bus = 'music'; },
      (b) => { b.sounds[0].layers[0].wave = 'pulse'; },
      (b) => { b.sounds[0].layers = []; },
      (b) => { b.sounds[0].gain = 2; },
      (b) => { b.ambient.drips.maxGapMs = 10; },
      (b) => { b.speedThinning.gain = [1, 0.5]; },
      (b) => { b.sounds[0].extra = true; },
    ];
    for (const mutate of cases) {
      const b = structuredClone(raw['sounds.json']) as Loose;
      mutate(b);
      expect(SoundBankSchema.safeParse(b).success).toBe(false);
    }
  });

  it('checks references: required sounds, drip ids and drip buses, duplicate ids', () => {
    const expectProblem = (mutate: (b: Loose) => void, re: RegExp) => {
      const bad = structuredClone(raw) as Loose;
      mutate(bad['sounds.json']);
      try {
        loadContent(bad);
        expect.unreachable('content should not load');
      } catch (e) {
        expect(e).toBeInstanceOf(ContentError);
        expect((e as ContentError).problems.some((p) => re.test(p)), (e as ContentError).problems.join('\n')).toBe(true);
      }
    };
    expectProblem((b) => { b.sounds = b.sounds.filter((s: Loose) => s.id !== 'income'); }, /plays "income" but it is not defined/);
    expectProblem((b) => { b.ambient.drips.sounds.push('splash'); }, /sound "splash" does not exist/);
    expectProblem((b) => { b.ambient.drips.sounds.push('place'); }, /"place" is on the sfx bus/);
    expectProblem((b) => { b.sounds.push(structuredClone(b.sounds[0])); }, /duplicate sound id "place"/);
    const missing = structuredClone(raw) as Loose;
    delete missing['sounds.json'];
    expect(() => loadContent(missing)).toThrow(/missing data file sounds.json/);
  });

  it('knows how long a sound rings', () => {
    const def = {
      id: 'x', name: 'x', bus: 'sfx', gain: 1, priority: 1, cooldownMs: 0,
      layers: [
        { wave: 'sine', freq: 440, env: { attack: 0.1, decay: 0.2, sustain: 0, hold: 0.3, release: 0.4 }, gain: 1 },
        { wave: 'pink', env: { attack: 0, decay: 0.1, sustain: 0, hold: 0, release: 0.1 }, gain: 1, delay: 1.5 },
      ],
    } as SoundDef;
    expect(soundSeconds(def)).toBeCloseTo(1.7, 9);
  });

  it('stays out of the sim: a battle hashes the same with a different sound bank', () => {
    const quiet = structuredClone(raw) as Loose;
    for (const s of quiet['sounds.json'].sounds) s.gain = 0;
    const loud = loadContent(quiet);
    const run = (c: typeof content) => {
      const s = createBattle(c, makeConfig(c, { seed: 9, mapId: 'bogwater-hollow', player: 'bot:balanced', enemy: 'general:scripted' }));
      queueCommand(s, { tick: 0, side: 'player', type: 'begin' });
      for (let i = 0; i < 1200; i++) step(s);
      return JSON.stringify(s.sides) + s.tick;
    };
    expect(run(loud)).toBe(run(content));
  });
});

describe('voice limiter', () => {
  it('drops a sound inside its cooldown, per key', () => {
    const l = new VoiceLimiter(12, thinning);
    expect(l.admit('thud', rule(5, 1500), 0)).not.toBeNull();
    expect(l.admit('thud', rule(5, 1500), 1499)).toBeNull();
    expect(l.admit('thud:enemy', rule(5, 1500), 1499)).not.toBeNull(); // its own key
    expect(l.admit('thud', rule(5, 1500), 1500)).not.toBeNull();
  });

  it('thins frequent sounds at 2× and 3× and plays them quieter', () => {
    const l = new VoiceLimiter(12, thinning);
    const puff = rule(1, 200, true);
    expect(l.admit('puff', puff, 0, 1)!.gain).toBe(1);
    expect(l.admit('puff', puff, 200, 1)).not.toBeNull(); // 1×: every 200 ms
    const at2 = 200 + 200 * thinning.cooldown[1]; // 2×: the cooldown stretches
    expect(l.admit('puff', puff, at2 - 1, 2)).toBeNull();
    expect(l.admit('puff', puff, at2, 2)!.gain).toBe(thinning.gain[1]);
    const at3 = at2 + 200 * thinning.cooldown[2];
    expect(l.admit('puff', puff, at3 - 1, 3)).toBeNull();
    expect(l.admit('puff', puff, at3, 3)!.gain).toBe(thinning.gain[2]);
    expect(thinning.gain[2]).toBeLessThan(thinning.gain[1]);
    // an infrequent sound keeps its cooldown and gain at 3×
    expect(l.admit('chime', rule(5, 300), 0, 3)!.gain).toBe(1);
    expect(l.admit('chime', rule(5, 300), 300, 3)).not.toBeNull();
  });

  it('caps voices: a higher priority steals the oldest lowest voice, an equal one is dropped', () => {
    const l = new VoiceLimiter(3, thinning);
    const a = voice('a', 2, 0), b = voice('b', 1, 10), c = voice('c', 1, 20);
    for (const v of [a, b, c]) { expect(l.admit(v.id, rule(v.priority), v.start)).not.toBeNull(); l.add(v); }
    expect(l.admit('d', rule(1), 30)).toBeNull(); // equal to the lowest: dropped
    const got = l.admit('e', rule(4), 40);
    expect(got!.stolen).toBe(b); // the oldest of the two priority-1 voices
    expect(l.voices).toEqual([a, c]);
    l.add(voice('e', 4, 40));
    expect(l.admit('f', rule(0), 50)).toBeNull();
    expect(l.voices).toHaveLength(3);
  });

  it('frees voices when they end', () => {
    const l = new VoiceLimiter(2, thinning);
    l.add(voice('a', 9, 0, 100));
    l.add(voice('b', 9, 0, 200));
    expect(l.admit('c', rule(1), 150)).not.toBeNull(); // a has ended
    expect(l.voices.map((v) => v.id)).toEqual(['b']);
  });
});

describe('audio engine without WebAudio', () => {
  it('does nothing and never throws when disabled', () => {
    const e = new AudioEngine(content.audio, content.sounds, false);
    expect(() => {
      e.unlock();
      e.setVolumes({ master: 1, sfx: 1, ambient: 1, muted: false });
      e.setSpeed(3);
      e.setDimmed(true);
      e.setHidden(true);
      e.setAmbient(true);
    }).not.toThrow();
    expect(e.play('place')).toBe(false);
    expect(e.unlocked).toBe(false);
    expect(e.voiceCount).toBe(0);
  });

  it('turns itself off when asked to play where there is no AudioContext (Node)', () => {
    const e = new AudioEngine(content.audio, content.sounds, true);
    expect(() => e.unlock()).not.toThrow();
    expect(e.active).toBe(false);
    expect(e.play('place')).toBe(false);
    expect(e.play('no-such-sound')).toBe(false);
  });
});

describe('battle sounds', () => {
  function playBattle(seed: number, ticks: number) {
    const s = createBattle(content, makeConfig(content, { seed, mapId: 'bogwater-hollow', player: 'bot:balanced', enemy: 'general:scripted' }));
    const played: { id: string; gain: number; key?: string; tick: number }[] = [];
    const bs = new BattleSound(s, content.audio.enemyGain, (id, o) => played.push({ id, gain: o?.gain ?? 1, ...(o?.key ? { key: o.key } : {}), tick: s.tick }));
    queueCommand(s, { tick: 0, side: 'player', type: 'begin' });
    for (let i = 0; i < ticks && s.phase !== 'ended'; i++) { step(s); bs.onTick(s); }
    return { s, played };
  }

  it('plays only defined sounds, and the sounds a battle should have', () => {
    const { played } = playBattle(2, 6000);
    for (const p of played) expect(content.sounds[p.id], p.id).toBeDefined();
    const ids = new Set(played.map((p) => p.id));
    for (const id of ['begin', 'place', 'spawn', 'income', 'wave']) expect(ids.has(id), id).toBe(true);
    // wave 1 comes with Begin, so only later waves pulse
    expect(played.filter((p) => p.id === 'wave').every((p) => p.tick > 1)).toBe(true);
  });

  it('plays the enemy quieter, and no hit sounds but the Heartcaps\'', () => {
    const { s, played } = playBattle(2, 6000);
    const enemyPlaces = played.filter((p) => p.id === 'place' && p.gain < 1);
    expect(enemyPlaces.length).toBeGreaterThan(0);
    expect(enemyPlaces.every((p) => p.gain === content.audio.enemyGain)).toBe(true);
    for (const p of played.filter((x) => x.id === 'heartcap-hit')) expect(p.key).toMatch(/^heartcap-hit:(player|enemy)$/);
    const income = played.filter((p) => p.id === 'income');
    expect(income.every((p) => p.gain === 1)).toBe(true); // the player's income only
    expect(income.length).toBeLessThanOrEqual(Math.ceil(s.tick / (content.balance.incomeTickSeconds * 20)) + 1);
  });

  it('says whose building was sold from the sold counts', () => {
    const s = createBattle(content, makeConfig(content, { seed: 1, mapId: 'test-flat', player: 'human', enemy: 'human' }));
    const played: { id: string; gain: number }[] = [];
    const bs = new BattleSound(s, 0.5, (id, o) => played.push({ id, gain: o?.gain ?? 1 }));
    queueCommand(s, { tick: 0, side: 'player', type: 'place', buildingId: 'truffleCellar', lane: 0, col: 1, row: 1 });
    queueCommand(s, { tick: 0, side: 'enemy', type: 'place', buildingId: 'truffleCellar', lane: 0, col: 29, row: 1 });
    step(s); bs.onTick(s);
    const [mine, theirs] = [s.buildings.find((b) => b.side === 'player')!, s.buildings.find((b) => b.side === 'enemy')!];
    queueCommand(s, { tick: nextCommandTick(s), side: 'enemy', type: 'sell', entityId: theirs.id });
    step(s); bs.onTick(s);
    queueCommand(s, { tick: nextCommandTick(s), side: 'player', type: 'sell', entityId: mine.id });
    step(s); bs.onTick(s);
    expect(played).toEqual([
      { id: 'place', gain: 1 }, { id: 'place', gain: 0.5 },
      { id: 'sell', gain: 0.5 }, { id: 'sell', gain: 1 },
    ]);
  });
});
