// The sound engine (SPEC §13.9): synthesized WebAudio from data/sounds.json, no audio files.
//
//   voices ─► sfx / ui / ambient buses ─► master gain ─► limiter (DynamicsCompressor) ─► speakers
//                     └──── sends ───► cave reverb ──┘
//
// The AudioContext is made on the first pointerdown or keydown (browsers' autoplay rule) and is
// suspended while the tab is hidden or the sound is muted. A disabled engine (no AudioContext, ?test=1,
// headless runs, Node) does nothing and never throws, so screenshots and tests are unaffected.
import type { SoundBankDef, SoundBusT, SoundDef } from '../data/schema.ts';
import { VoiceLimiter } from './limits.ts';
import type { Voice } from './limits.ts';
import { makeImpulse, makeNoise, scheduleSound, soundSeconds } from './synth.ts';
import type { NoiseBank } from './synth.ts';

export interface PlayOptions {
  /** Multiplies the sound's gain (the enemy's side plays quieter). */
  gain?: number;
  /** −1 (left) to 1 (right), before the sound's own pan jitter. */
  pan?: number;
  /** Cooldowns are per key; defaults to the sound id. */
  key?: string;
}

/** Player settings: volumes from 0 to 1 and mute. */
export interface Volumes { master: number; sfx: number; ambient: number; muted: boolean }

const BUSES: SoundBusT[] = ['sfx', 'ui', 'ambient'];
/** Seconds for volume changes to settle, so sliders and pause don't click. */
const SMOOTH = 0.05;

interface Graph {
  ctx: AudioContext;
  noise: NoiseBank;
  master: GainNode;
  buses: Record<SoundBusT, GainNode>;
}

type AudioContextCtor = new () => AudioContext;

function contextCtor(): AudioContextCtor | null {
  const g = globalThis as { AudioContext?: AudioContextCtor; webkitAudioContext?: AudioContextCtor };
  return g.AudioContext ?? g.webkitAudioContext ?? null;
}

/** True where WebAudio exists (a browser); the caller also turns sound off for tests and headless runs. */
export function audioAvailable(): boolean {
  return contextCtor() !== null;
}

export class AudioEngine {
  private g: Graph | null = null;
  private limiter: VoiceLimiter;
  private volumes: Volumes = { master: 0.6, sfx: 0.8, ambient: 0.5, muted: false };
  private speed = 1;
  private dimmed = false;
  private hidden = false;
  private ambientWanted = false;
  private drone: { stop(): void } | null = null;
  private dripTimer: ReturnType<typeof setTimeout> | null = null;
  /** Called once the context exists (the first gesture), e.g. to start the ambient bed. */
  onUnlock: (() => void) | null = null;

  constructor(readonly bank: SoundBankDef, private sounds: Record<string, SoundDef>, private enabled: boolean) {
    this.limiter = new VoiceLimiter(bank.maxVoices, bank.speedThinning);
  }

  /** False once disabled, or if WebAudio failed. */
  get active(): boolean { return this.enabled; }

  /** True once a gesture has made the context. */
  get unlocked(): boolean { return this.g !== null; }

  /** Voices playing now (the sound board shows it). */
  get voiceCount(): number {
    this.limiter.prune(this.now());
    return this.limiter.voices.length;
  }

  private now(): number { return typeof performance !== 'undefined' ? performance.now() : 0; }

  /** Makes or resumes the context. Call from a user gesture (pointerdown, keydown). */
  unlock(): void {
    if (!this.enabled) return;
    if (!this.g) {
      const Ctor = contextCtor();
      if (!Ctor) { this.enabled = false; return; }
      try {
        this.g = this.build(new Ctor());
      } catch (e) {
        console.warn(`sound is off: ${(e as Error).message}`);
        this.enabled = false;
        return;
      }
      this.applyVolumes(true);
      this.onUnlock?.();
    }
    this.syncRunning();
  }

  private build(ctx: AudioContext): Graph {
    const limiter = ctx.createDynamicsCompressor();
    limiter.threshold.value = -10;
    limiter.knee.value = 6;
    limiter.ratio.value = 12;
    limiter.attack.value = 0.003;
    limiter.release.value = 0.25;
    limiter.connect(ctx.destination);
    const master = ctx.createGain();
    master.connect(limiter);
    const reverb = ctx.createConvolver();
    reverb.buffer = makeImpulse(ctx, this.bank.reverb.seconds, this.bank.reverb.decay);
    reverb.connect(master);
    const buses = {} as Record<SoundBusT, GainNode>;
    for (const b of BUSES) {
      const bus = ctx.createGain();
      bus.connect(master);
      const send = this.bank.reverb.sends[b];
      if (send > 0) {
        const s = ctx.createGain();
        s.gain.value = send;
        bus.connect(s).connect(reverb);
      }
      buses[b] = bus;
    }
    return { ctx, noise: makeNoise(ctx), master, buses };
  }

  /** Runs the context only while it can be heard: unlocked, visible and not muted. */
  private syncRunning(): void {
    const g = this.g;
    if (!g) return;
    const want = !this.hidden && !this.volumes.muted;
    try {
      if (want && g.ctx.state === 'suspended') void g.ctx.resume().catch(() => {});
      else if (!want && g.ctx.state === 'running') void g.ctx.suspend().catch(() => {});
    } catch { /* a closed context: nothing to do */ }
    this.syncAmbient();
  }

  setVolumes(v: Volumes): void {
    const wasMuted = this.volumes.muted;
    this.volumes = { ...v };
    this.applyVolumes(false);
    if (wasMuted !== v.muted) this.syncRunning();
    else this.syncAmbient();
  }

  /** Volumes follow the square of the slider, which sounds closer to even steps. */
  private applyVolumes(now: boolean): void {
    const g = this.g;
    if (!g) return;
    const v = this.volumes, b = this.bank.buses;
    const level = (p: AudioParam, x: number) => {
      if (now) p.value = x;
      else p.setTargetAtTime(x, g.ctx.currentTime, SMOOTH);
    };
    level(g.master.gain, v.muted ? 0 : v.master * v.master);
    level(g.buses.sfx.gain, b.sfx * v.sfx * v.sfx);
    level(g.buses.ui.gain, b.ui * v.sfx * v.sfx);
    level(g.buses.ambient.gain, b.ambient * v.ambient * v.ambient * (this.dimmed ? this.bank.ambient.pausedLevel : 1));
  }

  /** Battle speed (1–3): frequent sounds thin out and play quieter when it is faster. */
  setSpeed(speed: number): void { this.speed = speed; }

  /** A paused battle: the ambient bed keeps going, softer. */
  setDimmed(dimmed: boolean): void {
    if (dimmed === this.dimmed) return;
    this.dimmed = dimmed;
    this.applyVolumes(false);
  }

  /** The tab was hidden or shown. */
  setHidden(hidden: boolean): void {
    if (hidden === this.hidden) return;
    this.hidden = hidden;
    this.syncRunning();
  }

  /** Plays a sound by id; returns false if it was throttled, dropped, muted or sound is off. */
  play(id: string, opts: PlayOptions = {}): boolean {
    const g = this.g;
    const def = this.sounds[id];
    if (!g || !def || this.volumes.muted || this.hidden || g.ctx.state === 'closed') return false;
    if (def.bus === 'ambient' ? this.volumes.ambient === 0 : this.volumes.sfx === 0) return false;
    const now = this.now();
    const ok = this.limiter.admit(opts.key ?? id, def, now, this.speed);
    if (!ok) return false;
    ok.stolen?.stop();
    try {
      this.start(g, def, now, ok.gain * (opts.gain ?? 1), opts.pan ?? 0);
    } catch (e) {
      console.warn(`sound ${id} failed: ${(e as Error).message}`);
      return false;
    }
    return true;
  }

  private start(g: Graph, def: SoundDef, now: number, gainMult: number, pan: number): void {
    const { ctx } = g;
    const j = def.jitter ?? {};
    const spread = (x: number | undefined) => (x ? (Math.random() * 2 - 1) * x : 0);
    const pitch = 1 + spread(j.pitch);
    const gain = def.gain * gainMult * (1 + spread(j.gain));
    const t0 = ctx.currentTime + 0.005;
    const out = ctx.createGain();
    out.gain.value = gain;
    const p = Math.max(-1, Math.min(1, pan + spread(j.pan)));
    if (p !== 0 && typeof ctx.createStereoPanner === 'function') {
      const panner = ctx.createStereoPanner();
      panner.pan.value = p;
      out.connect(panner).connect(g.buses[def.bus]);
    } else {
      out.connect(g.buses[def.bus]);
    }
    const sources = scheduleSound(ctx, g.noise, def, out, t0, pitch);
    const seconds = soundSeconds(def);
    const voice: Voice = {
      id: def.id, priority: def.priority, start: now, end: now + seconds * 1000 + 30,
      stop: () => {
        const t = ctx.currentTime;
        out.gain.cancelScheduledValues(t);
        out.gain.setTargetAtTime(0, t, 0.015);
        for (const s of sources) { try { s.stop(t + 0.08); } catch { /* already stopped */ } }
      },
    };
    // the limiter drops the voice once its end time passes
    this.limiter.add(voice);
  }

  // ---- the ambient bed: a filtered noise drone and random drips ----

  /** Starts (or, with false, stops) the cave ambience; it plays whenever it can be heard. */
  setAmbient(on: boolean): void {
    this.ambientWanted = on;
    this.syncAmbient();
  }

  get ambientOn(): boolean { return this.ambientWanted; }

  private syncAmbient(): void {
    const g = this.g;
    const audible = !!g && this.ambientWanted && !this.hidden && !this.volumes.muted && this.volumes.ambient > 0;
    if (audible && !this.drone) {
      try {
        this.drone = this.startDrone(g);
      } catch (e) {
        console.warn(`ambient bed failed: ${(e as Error).message}`);
        this.ambientWanted = false;
        return;
      }
      this.scheduleDrip();
    } else if (!audible && this.drone) {
      this.drone.stop();
      this.drone = null;
      if (this.dripTimer !== null) clearTimeout(this.dripTimer);
      this.dripTimer = null;
    }
  }

  private startDrone(g: Graph): { stop(): void } {
    const { ctx } = g;
    const d = this.bank.ambient.drone;
    const src = ctx.createBufferSource();
    src.buffer = g.noise[d.wave];
    src.loop = true;
    const f = ctx.createBiquadFilter();
    f.type = d.filter.type;
    f.frequency.value = d.filter.freq;
    f.Q.value = d.filter.q ?? 1;
    const out = ctx.createGain();
    const t = ctx.currentTime;
    // fade in over two seconds, so the bed arrives rather than switches on
    out.gain.setValueAtTime(0, t);
    out.gain.linearRampToValueAtTime(d.gain, t + 2);
    src.connect(f).connect(out).connect(g.buses.ambient);
    let lfo: OscillatorNode | null = null;
    if (d.wobble) {
      lfo = ctx.createOscillator();
      const depth = ctx.createGain();
      lfo.frequency.value = d.wobble.rate;
      depth.gain.value = d.wobble.depth;
      lfo.connect(depth).connect(f.frequency);
      lfo.start(t);
    }
    src.start(t, Math.random() * src.buffer.duration);
    return {
      stop: () => {
        const now = ctx.currentTime;
        out.gain.cancelScheduledValues(now);
        out.gain.setTargetAtTime(0, now, 0.2);
        try { src.stop(now + 1); lfo?.stop(now + 1); } catch { /* already stopped */ }
      },
    };
  }

  private scheduleDrip(): void {
    const { minGapMs, maxGapMs, sounds } = this.bank.ambient.drips;
    const gap = minGapMs + Math.random() * (maxGapMs - minGapMs);
    this.dripTimer = setTimeout(() => {
      this.dripTimer = null;
      if (!this.drone) return;
      this.play(sounds[Math.floor(Math.random() * sounds.length)]!);
      this.scheduleDrip();
    }, gap);
  }
}
