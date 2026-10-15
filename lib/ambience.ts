import type { AmbienceSound, AmbienceTarget } from "./ambience-logic";
import { audioContext } from "./feedback";

// The ocean ambience engine: three looping sounds made entirely in code with
// the Web Audio API (no audio files). Browser-only; every call is wrapped so a
// browser without Web Audio simply stays silent.
//
// How the sounds are made:
// - A few seconds of NOISE are computed once and looped: "brown" noise (each
//   sample a small random step from the last, so it's deep and rumbly) and
//   "pink" noise (equal energy per octave, softer than white static).
// - FILTERS remove the high frequencies; that's what turns noise into water.
// - LFOs (oscillators far too slow to hear, ~0.05–0.15 times a second) gently
//   move the volume and brightness up and down: swells. Two LFOs at rates that
//   never line up keep the pattern from sounding like a loop.
// - Underwater adds BUBBLES: tiny sine "blips" whose pitch sweeps upward, at
//   random moments.
// Everything goes into one master gain, which fades in, fades out and ducks.

type Playing = { sound: AmbienceSound; master: GainNode; stop: () => void };
let playing: Playing | null = null;
const buffers = new Map<string, AudioBuffer>();

const NOISE_SECONDS = 8;

// Raw noise samples. "brown": a slow random walk (deep, rumbly). "pink": Paul
// Kellet's filter, a few leaky averages of white noise (soft, even).
function rawNoise(kind: "brown" | "pink", length: number): Float32Array {
  const data = new Float32Array(length);
  if (kind === "brown") {
    let last = 0;
    for (let i = 0; i < length; i++) {
      last = (last + 0.02 * (Math.random() * 2 - 1)) / 1.02;
      data[i] = last * 3.5;
    }
    return data;
  }
  let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
  for (let i = 0; i < length; i++) {
    const w = Math.random() * 2 - 1;
    b0 = 0.99886 * b0 + w * 0.0555179;
    b1 = 0.99332 * b1 + w * 0.0750759;
    b2 = 0.969 * b2 + w * 0.153852;
    b3 = 0.8665 * b3 + w * 0.3104856;
    b4 = 0.55 * b4 + w * 0.5329522;
    b5 = -0.7616 * b5 - w * 0.016898;
    data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * 0.5362) * 0.11;
    b6 = w * 0.115926;
  }
  return data;
}

// Stereo noise, a different random stream per ear for a wide, natural sound.
// Made a little longer than needed, and the extra tail is crossfaded into the
// start, so the loop's end flows straight into its beginning: no click.
function noise(ctx: AudioContext, kind: "brown" | "pink"): AudioBuffer {
  const key = `${kind}-${ctx.sampleRate}`;
  const cached = buffers.get(key);
  if (cached) return cached;
  const length = ctx.sampleRate * NOISE_SECONDS;
  const fade = Math.floor(ctx.sampleRate * 0.5);
  const buffer = ctx.createBuffer(2, length, ctx.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const raw = rawNoise(kind, length + fade);
    const data = buffer.getChannelData(ch);
    for (let i = 0; i < length; i++) {
      const t = i < fade ? i / fade : 1;
      data[i] = raw[i] * t + (i < fade ? raw[length + i] * (1 - t) : 0);
    }
  }
  buffers.set(key, buffer);
  return buffer;
}

function loop(ctx: AudioContext, kind: "brown" | "pink") {
  const src = ctx.createBufferSource();
  src.buffer = noise(ctx, kind);
  src.loop = true;
  // Start each loop at a random point so layers never line up the same way.
  src.start(0, Math.random() * NOISE_SECONDS);
  return src;
}

function filter(ctx: AudioContext, type: BiquadFilterType, frequency: number, q = 0.7) {
  const f = ctx.createBiquadFilter();
  f.type = type;
  f.frequency.value = frequency;
  f.Q.value = q;
  return f;
}

function gain(ctx: AudioContext, value: number) {
  const g = ctx.createGain();
  g.gain.value = value;
  return g;
}

// A very slow wobble added on top of `param`: ±depth, `hz` times a second.
function lfo(ctx: AudioContext, hz: number, depth: number, param: AudioParam) {
  const osc = ctx.createOscillator();
  osc.frequency.value = hz;
  const amount = gain(ctx, depth);
  osc.connect(amount).connect(param);
  osc.start();
  return osc;
}

// Each builder wires its sound into `out` and returns what must be stopped later.
type Build = (ctx: AudioContext, out: GainNode) => { stop: () => void };

// Waves: deep surf rising and falling every ~8–12 s, brighter (foamier) at each crest.
const waves: Build = (ctx, out) => {
  const surf = loop(ctx, "brown");
  const surfFilter = filter(ctx, "lowpass", 650, 0.5);
  const swell = gain(ctx, 0.5);
  surf.connect(surfFilter).connect(swell).connect(out);

  const foam = loop(ctx, "pink");
  const foamFilter = filter(ctx, "highpass", 1800);
  const foamGain = gain(ctx, 0.06);
  foam.connect(foamFilter).connect(foamGain).connect(out);

  const oscs = [
    lfo(ctx, 0.085, 0.32, swell.gain), // the main swell
    lfo(ctx, 0.13, 0.13, swell.gain), // a second, out-of-step swell
    lfo(ctx, 0.085, 380, surfFilter.frequency), // brighter at the crest
    lfo(ctx, 0.085, 0.05, foamGain.gain), // foam hisses as the wave breaks
  ];
  return { stop: () => [surf, foam, ...oscs].forEach((n) => n.stop()) };
};

// Underwater: a deep, muffled rumble that slowly breathes, with gentle bubbles.
const underwater: Build = (ctx, out) => {
  const deep = loop(ctx, "brown");
  const muffle = filter(ctx, "lowpass", 260, 0.9);
  deep.connect(muffle).connect(gain(ctx, 1.1)).connect(out);
  const oscs = [lfo(ctx, 0.05, 70, muffle.frequency)];

  const bubbleBus = filter(ctx, "lowpass", 1600);
  bubbleBus.connect(gain(ctx, 0.5)).connect(out);
  let timer: ReturnType<typeof setTimeout> | null = null;

  function bubble(at: number) {
    const osc = ctx.createOscillator();
    const env = gain(ctx, 0);
    const start = 300 + Math.random() * 500;
    osc.frequency.setValueAtTime(start, at);
    osc.frequency.exponentialRampToValueAtTime(start * 2.6, at + 0.09); // the "bloop" rises
    env.gain.setValueAtTime(0, at);
    env.gain.linearRampToValueAtTime(0.05 + Math.random() * 0.04, at + 0.01);
    env.gain.exponentialRampToValueAtTime(0.0001, at + 0.14);
    osc.connect(env).connect(bubbleBus);
    osc.start(at);
    osc.stop(at + 0.16);
  }

  // Now and then, one bubble or a short little cluster.
  function schedule() {
    const now = ctx.currentTime;
    const count = Math.random() < 0.3 ? 2 + Math.floor(Math.random() * 3) : 1;
    for (let i = 0; i < count; i++) bubble(now + 0.05 + i * (0.06 + Math.random() * 0.1));
    timer = setTimeout(schedule, 600 + Math.random() * 2600);
  }
  schedule();

  return {
    stop: () => {
      if (timer) clearTimeout(timer);
      [deep, ...oscs].forEach((n) => n.stop());
    },
  };
};

// Calm sea: a soft, steady wash with only the faintest movement.
const calm: Build = (ctx, out) => {
  const wash = loop(ctx, "pink");
  const washGain = gain(ctx, 0.45);
  wash.connect(filter(ctx, "lowpass", 900, 0.5)).connect(washGain).connect(out);

  const body = loop(ctx, "brown");
  body.connect(filter(ctx, "lowpass", 300)).connect(gain(ctx, 0.35)).connect(out);

  const oscs = [lfo(ctx, 0.06, 0.07, washGain.gain), lfo(ctx, 0.11, 0.03, washGain.gain)];
  return { stop: () => [wash, body, ...oscs].forEach((n) => n.stop()) };
};

const BUILDERS: Record<AmbienceSound, Build> = { waves, underwater, calm };

const FADE_IN = 1.2; // time constants (s): ~3× this to fully arrive
const FADE_OUT = 0.5;
const ADJUST = 0.15; // volume changes and ducking

function fadeOutAndStop(p: Playing, ctx: AudioContext) {
  p.master.gain.cancelScheduledValues(ctx.currentTime);
  p.master.gain.setTargetAtTime(0, ctx.currentTime, FADE_OUT);
  setTimeout(() => {
    try {
      p.stop();
      p.master.disconnect();
    } catch {}
  }, FADE_OUT * 5 * 1000);
}

// Make the speakers match `target`: start, switch, re-level or stop.
// Safe to call as often as you like; it only changes what's different.
export function syncAmbience(target: AmbienceTarget) {
  try {
    const ctx = audioContext();
    if (!ctx) return;
    if (!target) {
      if (playing) fadeOutAndStop(playing, ctx);
      playing = null;
      return;
    }
    if (ctx.state === "suspended") void ctx.resume(); // only works after a tap; harmless otherwise
    let fade = ADJUST;
    if (!playing || playing.sound !== target.sound) {
      if (playing) fadeOutAndStop(playing, ctx);
      const master = gain(ctx, 0);
      master.connect(ctx.destination);
      playing = { sound: target.sound, master, ...BUILDERS[target.sound](ctx, master) };
      fade = FADE_IN;
    }
    playing.master.gain.cancelScheduledValues(ctx.currentTime);
    playing.master.gain.setTargetAtTime(target.gain * 0.8, ctx.currentTime, fade); // 0.8: headroom
  } catch {}
}
