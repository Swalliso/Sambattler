// Turns a sound definition (data/sounds.json) into WebAudio nodes (SPEC §13.9): each layer is an
// oscillator or a looping noise buffer, through an optional biquad filter, shaped by an envelope.
import type { SoundDef, SoundLayerDef } from '../data/schema.ts';

export type NoiseKind = 'white' | 'pink' | 'brown';
export type NoiseBank = Record<NoiseKind, AudioBuffer>;

/** Gains never ramp exponentially to zero, so envelopes fade to this and then cut. */
const FLOOR = 0.0001;
const MIN_RAMP = 0.001;

const isNoise = (w: SoundLayerDef['wave']): w is NoiseKind => w === 'white' || w === 'pink' || w === 'brown';

export function layerSeconds(l: SoundLayerDef): number {
  const e = l.env;
  return (l.delay ?? 0) + e.attack + e.decay + e.hold + e.release;
}

/** How long a sound rings, in seconds. */
export function soundSeconds(def: SoundDef): number {
  return Math.max(...def.layers.map(layerSeconds));
}

/** Two seconds of each noise colour, made once per context (pink: Paul Kellet's filter; brown: leaky integrated white). */
export function makeNoise(ctx: BaseAudioContext, seconds = 2): NoiseBank {
  const n = Math.floor(ctx.sampleRate * seconds);
  const make = (fill: (d: Float32Array) => void) => {
    const b = ctx.createBuffer(1, n, ctx.sampleRate);
    fill(b.getChannelData(0));
    return b;
  };
  const white = make((d) => { for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1; });
  const pink = make((d) => {
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
    for (let i = 0; i < n; i++) {
      const w = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + w * 0.0555179; b1 = 0.99332 * b1 + w * 0.0750759; b2 = 0.969 * b2 + w * 0.153852;
      b3 = 0.8665 * b3 + w * 0.3104856; b4 = 0.55 * b4 + w * 0.5329522; b5 = -0.7616 * b5 - w * 0.016898;
      d[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * 0.5362) * 0.11;
      b6 = w * 0.115926;
    }
  });
  const brown = make((d) => {
    let last = 0;
    for (let i = 0; i < n; i++) {
      last = (last + 0.02 * (Math.random() * 2 - 1)) / 1.02;
      d[i] = last * 3.5;
    }
  });
  return { white, pink, brown };
}

/** A cave: stereo noise fading as (1 − t)^decay. */
export function makeImpulse(ctx: BaseAudioContext, seconds: number, decay: number): AudioBuffer {
  const n = Math.floor(ctx.sampleRate * seconds);
  const b = ctx.createBuffer(2, n, ctx.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const d = b.getChannelData(ch);
    for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, decay);
  }
  return b;
}

/** Attack (linear) and decay to sustain, hold, then release (exponential), from time t. */
function envelope(p: AudioParam, e: SoundLayerDef['env'], peak: number, t: number): number {
  const top = Math.max(FLOOR, peak);
  const sus = Math.max(FLOOR, top * e.sustain);
  const a = t + Math.max(MIN_RAMP, e.attack);
  const d = a + Math.max(MIN_RAMP, e.decay);
  const hold = d + e.hold;
  const end = hold + Math.max(MIN_RAMP, e.release);
  p.setValueAtTime(0, t);
  p.linearRampToValueAtTime(top, a);
  p.exponentialRampToValueAtTime(sus, d);
  p.setValueAtTime(sus, hold);
  p.exponentialRampToValueAtTime(FLOOR, end);
  p.setValueAtTime(0, end);
  return end;
}

const clampHz = (f: number) => Math.min(20000, Math.max(10, f));

/**
 * Schedules one sound into `out`, starting at context time `t0`, with every pitch (and filter)
 * multiplied by `pitch`. Returns the source nodes, so a stolen voice can stop early.
 */
export function scheduleSound(ctx: BaseAudioContext, noise: NoiseBank, def: SoundDef, out: AudioNode, t0: number, pitch: number): AudioScheduledSourceNode[] {
  const sources: AudioScheduledSourceNode[] = [];
  for (const l of def.layers) {
    const t = t0 + (l.delay ?? 0);
    let src: AudioScheduledSourceNode;
    let lfo: OscillatorNode | null = null;
    let offset: number | null = null;
    if (isNoise(l.wave)) {
      const b = ctx.createBufferSource();
      b.buffer = noise[l.wave];
      b.loop = true;
      b.playbackRate.value = pitch;
      // start somewhere random in the loop, so repeats don't sound identical
      offset = Math.random() * b.buffer.duration;
      src = b;
    } else {
      const o = ctx.createOscillator();
      o.type = l.wave === 'saw' ? 'sawtooth' : l.wave;
      o.frequency.setValueAtTime(clampHz(l.freq! * pitch), t);
      if (l.sweep) o.frequency.exponentialRampToValueAtTime(clampHz(l.sweep.to * pitch), t + l.sweep.time);
      if (l.vibrato) {
        lfo = ctx.createOscillator();
        const depth = ctx.createGain();
        lfo.frequency.value = l.vibrato.rate;
        depth.gain.value = l.vibrato.depth;
        lfo.connect(depth).connect(o.detune);
      }
      src = o;
    }
    let node: AudioNode = src;
    if (l.filter) {
      const f = ctx.createBiquadFilter();
      f.type = l.filter.type;
      f.Q.value = l.filter.q ?? 1;
      f.frequency.setValueAtTime(clampHz(l.filter.freq * pitch), t);
      if (l.filter.sweep) f.frequency.exponentialRampToValueAtTime(clampHz(l.filter.sweep.to * pitch), t + l.filter.sweep.time);
      node.connect(f);
      node = f;
    }
    const env = ctx.createGain();
    const end = envelope(env.gain, l.env, l.gain, t) + 0.02;
    node.connect(env).connect(out);
    if (offset !== null) (src as AudioBufferSourceNode).start(t, offset);
    else src.start(t);
    src.stop(end);
    sources.push(src);
    if (lfo) {
      lfo.start(t);
      lfo.stop(end);
      sources.push(lfo);
    }
  }
  return sources;
}
