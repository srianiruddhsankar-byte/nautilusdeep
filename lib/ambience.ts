import { useSyncExternalStore } from "react";
import { PREVIEW_SECONDS, type AmbienceSound, type AmbienceTarget } from "./ambience-logic";
import { audioContext } from "./feedback";

// The ambience engine: five water sounds made entirely in code with the Web
// Audio API (no audio files). Browser-only; every call is wrapped so a browser
// without Web Audio simply stays silent.
//
// Each sound is built from many small EVENTS scheduled at random moments, not
// from one block of filtered noise:
// - Rain: dozens of separate drops a second. A drop = a tiny click + a short
//   "plink" whose pitch rises fast (a drop hitting water traps a little bubble
//   that rings), at a random pitch, loudness and left/right position. Under it,
//   a soft patter: a precomputed texture of thousands of tiny taps.
// - Waves: each wave is one event in three parts: BUILD (a dark rumble swelling
//   and brightening), CRASH (a quick bright burst), RETREAT (a fizzy, bubbly
//   draw-back fading out). Irregular gaps; sometimes they overlap.
// - Whales: a deep hum (two very low tones slightly out of tune, so it slowly
//   pulses) and every 20–40 s a call: 2–3 long gliding tones with a slow wobble,
//   shaped to sound voice-like, through a long echo.
// - Stream: a fine soft trickle plus many separate bubble plinks of different
//   sizes (small bubbles ring higher and shorter), in livelier and quieter patches.
// - Night: the same waves, darker, softer and slower, plus 2–3 faraway crickets
//   (short trains of high pulses), each with its own pitch, place and rhythm.
//
// Events are scheduled a quarter-second ahead on the audio clock (a "look-ahead"
// timer), so their timing stays smooth even when the page's own timers jitter.

type Playing = { sound: AmbienceSound; master: GainNode; stop: () => void };
let playing: Playing | null = null;

// ---------- Building blocks ----------

const LOOP_SECONDS = 8;
const buffers = new Map<string, AudioBuffer>();

// Raw samples. brown: a slow random walk (deep). pink: Paul Kellet's filter
// (soft, even). patter: thousands of tiny decaying taps (granular, not a hiss).
function rawSamples(kind: "brown" | "pink" | "patter", length: number, rate: number): Float32Array {
  const data = new Float32Array(length);
  if (kind === "brown") {
    let last = 0;
    for (let i = 0; i < length; i++) {
      last = (last + 0.02 * (Math.random() * 2 - 1)) / 1.02;
      data[i] = last * 3.5;
    }
  } else if (kind === "pink") {
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
  } else {
    const taps = Math.floor((length / rate) * 380); // ~380 taps a second
    for (let n = 0; n < taps; n++) {
      const at = Math.floor(Math.random() * length);
      const amp = Math.random() ** 3; // mostly faint, a few clear
      const len = Math.floor(rate * (0.0015 + Math.random() * 0.004));
      for (let i = 0; i < len && at + i < length; i++) {
        data[at + i] += (Math.random() * 2 - 1) * amp * Math.exp(-i / (len / 4));
      }
    }
    let smooth = 0; // soften the taps a little
    for (let i = 0; i < length; i++) {
      smooth += (data[i] - smooth) * 0.45;
      data[i] = smooth * 0.9;
    }
  }
  return data;
}

// A loopable stereo buffer, a different stream per ear. Made a little longer
// and the extra tail crossfaded into the start, so the loop never clicks.
function loopBuffer(ctx: AudioContext, kind: "brown" | "pink" | "patter"): AudioBuffer {
  const key = `${kind}-${ctx.sampleRate}`;
  const cached = buffers.get(key);
  if (cached) return cached;
  const length = ctx.sampleRate * LOOP_SECONDS;
  const fade = Math.floor(ctx.sampleRate * 0.5);
  const buffer = ctx.createBuffer(2, length, ctx.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const raw = rawSamples(kind, length + fade, ctx.sampleRate);
    const data = buffer.getChannelData(ch);
    for (let i = 0; i < length; i++) {
      const t = i < fade ? i / fade : 1;
      data[i] = raw[i] * t + (i < fade ? raw[length + i] * (1 - t) : 0);
    }
  }
  buffers.set(key, buffer);
  return buffer;
}

function loop(ctx: AudioContext, kind: "brown" | "pink" | "patter", at = 0, rate = 1) {
  const src = ctx.createBufferSource();
  src.buffer = loopBuffer(ctx, kind);
  src.loop = true;
  src.playbackRate.value = rate;
  src.start(at, Math.random() * LOOP_SECONDS); // a random point, so layers never line up
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

// Left (-1) … right (1). Older browsers without a panner just play it centred.
function panner(ctx: AudioContext, value: number): AudioNode {
  if (!ctx.createStereoPanner) return gain(ctx, 1);
  const p = ctx.createStereoPanner();
  p.pan.value = Math.max(-1, Math.min(1, value));
  return p;
}

// A very slow wobble added on top of `param`: ±depth, `hz` times a second.
function lfo(ctx: AudioContext, hz: number, depth: number, param: AudioParam) {
  const osc = ctx.createOscillator();
  osc.frequency.value = hz;
  osc.connect(gain(ctx, depth)).connect(param);
  osc.start();
  return osc;
}

// An echo: what goes in is heard now, then again and again, quieter and darker.
function echo(ctx: AudioContext, out: AudioNode, seconds: number, feedback: number, dryLevel = 1) {
  const input = gain(ctx, 1);
  const delay = ctx.createDelay(2);
  delay.delayTime.value = seconds;
  const dark = filter(ctx, "lowpass", 1400);
  input.connect(gain(ctx, dryLevel)).connect(out);
  input.connect(delay);
  delay.connect(dark);
  dark.connect(gain(ctx, feedback)).connect(delay);
  dark.connect(out);
  return input;
}

// Look-ahead scheduling: every 100 ms, `fn(from, to)` schedules the events that
// fall in the next slice of audio time. Returns stop.
function ticker(ctx: AudioContext, fn: (from: number, to: number) => void) {
  let last = ctx.currentTime + 0.05;
  const tick = () => {
    const to = ctx.currentTime + 0.25;
    if (to > last) {
      fn(last, to);
      last = to;
    }
  };
  tick();
  const id = setInterval(tick, 100);
  return () => clearInterval(id);
}

// Random moments at `rate` per second inside [from, to) (a Poisson process).
function moments(rate: number, from: number, to: number): number[] {
  const times: number[] = [];
  if (rate <= 0) return times;
  for (let t = from - Math.log(1 - Math.random()) / rate; t < to; t -= Math.log(1 - Math.random()) / rate) {
    times.push(t);
  }
  return times;
}

const rand = (min: number, max: number) => min + Math.random() * (max - min);

// A bubble ringing: a sine whose pitch rises as it fades (how small bubbles in
// water sound). Used for raindrops and the stream.
function bubble(ctx: AudioContext, dest: AudioNode, at: number, freq: number, peak: number, decay: number) {
  const osc = ctx.createOscillator();
  osc.frequency.setValueAtTime(freq, at);
  osc.frequency.exponentialRampToValueAtTime(freq * rand(1.3, 1.9), at + decay);
  const env = gain(ctx, 0);
  env.gain.setValueAtTime(0, at);
  env.gain.linearRampToValueAtTime(peak, at + 0.002);
  env.gain.exponentialRampToValueAtTime(0.0001, at + decay);
  osc.connect(env).connect(dest);
  osc.start(at);
  osc.stop(at + decay + 0.02);
}

// A tiny burst of noise (a click / tap), `seconds` long.
function tap(ctx: AudioContext, dest: AudioNode, at: number, peak: number, seconds: number) {
  const src = ctx.createBufferSource();
  src.buffer = loopBuffer(ctx, "pink");
  const env = gain(ctx, 0);
  env.gain.setValueAtTime(peak, at);
  env.gain.exponentialRampToValueAtTime(0.0001, at + seconds);
  src.connect(env).connect(dest);
  src.start(at, Math.random() * LOOP_SECONDS, seconds + 0.01);
}

// ---------- Events the tank can react to ----------

const whaleListeners = new Set<() => void>();
let whaleCalls = 0;
function announceWhaleCall() {
  whaleCalls++;
  whaleListeners.forEach((listener) => listener());
}

// How many whale calls have started (the tank's whale swims by on each one).
export function useWhaleCalls(): number {
  return useSyncExternalStore(
    (listener) => {
      whaleListeners.add(listener);
      return () => {
        whaleListeners.delete(listener);
      };
    },
    () => whaleCalls,
    () => 0,
  );
}

// ---------- The five sounds ----------

type Build = (ctx: AudioContext, out: GainNode) => { stop: () => void };

const rain: Build = (ctx, out) => {
  // The patter: a soft granular bed of tiny taps.
  const patter = loop(ctx, "patter");
  patter.connect(filter(ctx, "lowpass", 4200)).connect(gain(ctx, 0.35)).connect(out);
  // A faint low body: rain over a wide stretch of water.
  const body = loop(ctx, "brown");
  body.connect(filter(ctx, "lowpass", 220)).connect(gain(ctx, 0.12)).connect(out);

  const near = gain(ctx, 1);
  near.connect(out);
  const far = filter(ctx, "lowpass", 2500);
  far.connect(gain(ctx, 0.6)).connect(out);

  const stop = ticker(ctx, (from, to) => {
    for (const at of moments(34, from, to)) {
      const close = Math.random() < 0.25; // most drops are further off
      const dest = panner(ctx, rand(-0.85, 0.85));
      dest.connect(close ? near : far);
      tap(ctx, dest, at, close ? rand(0.04, 0.09) : rand(0.01, 0.03), 0.004);
      bubble(ctx, dest, at + 0.003, rand(1400, 4200), close ? rand(0.03, 0.07) : rand(0.008, 0.02), rand(0.025, 0.07));
    }
  });
  return {
    stop: () => {
      stop();
      [patter, body].forEach((n) => n.stop());
    },
  };
};

// One wave: build → crash → retreat, starting at `at`. `dark` softens it (Night).
function wave(ctx: AudioContext, out: AudioNode, at: number, dark: boolean) {
  const build = rand(2.2, 3.8);
  const crash = at + build;
  const end = crash + rand(3.5, 5.5);
  const where = panner(ctx, rand(-0.4, 0.4));
  where.connect(out);

  // BUILD: a dark rumble swelling and brightening, then opening up at the crash.
  const rumble = loop(ctx, "brown", at);
  const rumbleFilter = filter(ctx, "lowpass", 160, 0.6);
  const rumbleGain = gain(ctx, 0.0001);
  rumble.connect(rumbleFilter).connect(rumbleGain).connect(where);
  rumbleFilter.frequency.setValueAtTime(160, at);
  rumbleFilter.frequency.exponentialRampToValueAtTime(dark ? 420 : 900, crash);
  rumbleFilter.frequency.exponentialRampToValueAtTime(dark ? 520 : 1300, crash + 0.15);
  rumbleFilter.frequency.exponentialRampToValueAtTime(200, end);
  rumbleGain.gain.setValueAtTime(0.0001, at);
  rumbleGain.gain.exponentialRampToValueAtTime(dark ? 0.35 : 0.55, crash);
  rumbleGain.gain.exponentialRampToValueAtTime(0.0001, end);

  // CRASH: a quick bright burst.
  const burst = loop(ctx, "pink", crash - 0.05);
  const burstGain = gain(ctx, 0.0001);
  burst.connect(filter(ctx, "highpass", dark ? 500 : 800)).connect(burstGain).connect(where);
  burstGain.gain.setValueAtTime(0.0001, crash - 0.05);
  burstGain.gain.exponentialRampToValueAtTime(dark ? 0.18 : 0.45, crash + 0.08);
  burstGain.gain.exponentialRampToValueAtTime(0.0001, crash + rand(1, 1.6));

  // RETREAT: the water drawing back over sand, fizzy and bubbly, fading out.
  const fizz = loop(ctx, "patter", crash, 1.5);
  const fizzGain = gain(ctx, 0.0001);
  fizz.connect(filter(ctx, "highpass", 1800)).connect(fizzGain).connect(where);
  fizzGain.gain.setValueAtTime(0.0001, crash);
  fizzGain.gain.exponentialRampToValueAtTime(dark ? 0.12 : 0.3, crash + 0.4);
  fizzGain.gain.exponentialRampToValueAtTime(0.0001, end);

  [rumble, burst, fizz].forEach((s) => s.stop(end + 0.1));
}

// Waves arriving at irregular gaps over a faint, distant ocean bed.
function shore(ctx: AudioContext, out: GainNode, dark: boolean) {
  const bed = loop(ctx, "brown");
  bed.connect(filter(ctx, "lowpass", dark ? 110 : 140)).connect(gain(ctx, dark ? 0.12 : 0.18)).connect(out);
  let next = ctx.currentTime + 0.2;
  const stop = ticker(ctx, (_from, to) => {
    while (next < to) {
      wave(ctx, out, next, dark);
      next += dark ? rand(7, 13) : rand(5, 10);
    }
  });
  return {
    stop: () => {
      stop();
      bed.stop();
    },
  };
}

const waves: Build = (ctx, out) => shore(ctx, out, false);

const whales: Build = (ctx, out) => {
  // The hum: two very low tones a little out of tune (a slow pulse) + rumble.
  const hums = [48, 48.6, 96.3].map((f, i) => {
    const osc = ctx.createOscillator();
    osc.frequency.value = f;
    osc.connect(gain(ctx, i === 2 ? 0.035 : 0.12)).connect(out);
    osc.start();
    return osc;
  });
  const deep = loop(ctx, "brown");
  const deepFilter = filter(ctx, "lowpass", 110, 0.9);
  deep.connect(deepFilter).connect(gain(ctx, 0.5)).connect(out);
  const wobble = lfo(ctx, 0.03, 30, deepFilter.frequency);

  // Calls, far away: shaped to sound voice-like, through a long echo.
  const far = echo(ctx, out, 0.55, 0.5, 0.6);
  const voice = filter(ctx, "bandpass", 600, 1);
  voice.connect(filter(ctx, "lowpass", 1200)).connect(far);

  function call(at: number) {
    announceWhaleCall();
    let t = at;
    const phrases = 2 + Math.floor(Math.random() * 2);
    const where = panner(ctx, rand(-0.5, 0.5));
    where.connect(voice);
    for (let p = 0; p < phrases; p++) {
      const len = rand(1.5, 3);
      const f0 = rand(120, 260);
      const peak = f0 * rand(1.4, 2);
      const env = gain(ctx, 0);
      env.connect(where);
      // A sine plus a softer triangle an octave up: a fuller, voice-like tone.
      const layers: [OscillatorType, number, number][] = [
        ["sine", 1, 1],
        ["triangle", 2, 0.25],
      ];
      for (const [type, mult, level] of layers) {
        const osc = ctx.createOscillator();
        osc.type = type;
        osc.frequency.setValueAtTime(f0 * mult, t);
        osc.frequency.linearRampToValueAtTime(peak * mult, t + len * 0.45);
        osc.frequency.linearRampToValueAtTime(f0 * 0.9 * mult, t + len);
        const vib = ctx.createOscillator(); // the slow wobble
        vib.frequency.value = rand(4, 6);
        vib.connect(gain(ctx, f0 * 0.03 * mult)).connect(osc.frequency);
        osc.connect(gain(ctx, level)).connect(env);
        [osc, vib].forEach((o) => {
          o.start(t);
          o.stop(t + len + 0.05);
        });
      }
      env.gain.setValueAtTime(0, t);
      env.gain.linearRampToValueAtTime(0.13, t + len * 0.3);
      env.gain.linearRampToValueAtTime(0.09, t + len * 0.75);
      env.gain.linearRampToValueAtTime(0, t + len);
      t += len + rand(0.3, 1.2);
    }
  }

  let next = ctx.currentTime + 3; // the first call comes soon, so a preview has one
  const stop = ticker(ctx, (_from, to) => {
    while (next < to) {
      call(next);
      next += rand(20, 40);
    }
  });
  return {
    stop: () => {
      stop();
      [...hums, deep, wobble].forEach((n) => n.stop());
    },
  };
};

const stream: Build = (ctx, out) => {
  // A fine, soft trickle underneath.
  const trickle = loop(ctx, "patter", 0, 0.7);
  trickle.connect(filter(ctx, "bandpass", 1300, 0.6)).connect(gain(ctx, 0.25)).connect(out);
  const body = loop(ctx, "brown");
  body.connect(filter(ctx, "lowpass", 300)).connect(gain(ctx, 0.08)).connect(out);

  const bubbles = gain(ctx, 1);
  bubbles.connect(out);
  let mood = 1; // livelier and quieter patches
  const stop = ticker(ctx, (from, to) => {
    mood += (rand(0.4, 1.6) - mood) * 0.08;
    for (const at of moments(40 * mood, from, to)) {
      const size = Math.random(); // 0 = tiny bubble, 1 = bigger
      const where = panner(ctx, rand(-0.7, 0.7));
      where.connect(bubbles);
      bubble(ctx, where, at, 2800 - size * 2100, rand(0.008, 0.03) * (0.6 + size * 0.6), 0.015 + size * 0.05);
    }
  });
  return {
    stop: () => {
      stop();
      [trickle, body].forEach((n) => n.stop());
    },
  };
};

const night: Build = (ctx, out) => {
  const sea = shore(ctx, out, true);

  // Crickets far up the beach: each its own pitch, place and rhythm.
  const far = echo(ctx, out, 0.12, 0.2, 1);
  const lowered = filter(ctx, "lowpass", 6000);
  lowered.connect(far);
  const crickets = Array.from({ length: 2 + Math.floor(Math.random() * 2) }, () => ({
    pitch: rand(3800, 4800),
    where: panner(ctx, rand(-0.9, 0.9)),
    every: rand(0.75, 1.3),
    next: ctx.currentTime + rand(0.2, 1.5),
    level: rand(0.006, 0.012),
  }));
  crickets.forEach((c) => c.where.connect(lowered));

  const stop = ticker(ctx, (_from, to) => {
    for (const c of crickets) {
      while (c.next < to) {
        const pulses = 3 + Math.floor(Math.random() * 3);
        for (let i = 0; i < pulses; i++) {
          const at = c.next + i * 0.04;
          const osc = ctx.createOscillator();
          osc.frequency.value = c.pitch;
          const env = gain(ctx, 0);
          env.gain.setValueAtTime(0, at);
          env.gain.linearRampToValueAtTime(c.level, at + 0.006);
          env.gain.linearRampToValueAtTime(0, at + 0.025);
          osc.connect(env).connect(c.where);
          osc.start(at);
          osc.stop(at + 0.03);
        }
        // Now and then a cricket rests for a few seconds.
        c.next += Math.random() < 0.1 ? rand(3, 7) : c.every * rand(0.9, 1.1);
      }
    }
  });
  return {
    stop: () => {
      stop();
      sea.stop();
    },
  };
};

const BUILDERS: Record<AmbienceSound, Build> = { rain, waves, whales, stream, night };

// ---------- Playing a session's sound ----------

const FADE_IN = 1.2; // time constants (s): ~3× this to fully arrive
const FADE_OUT = 0.5;
const ADJUST = 0.15; // volume changes and ducking
const HEADROOM = 0.8;

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

function begin(ctx: AudioContext, sound: AmbienceSound): Playing {
  const master = gain(ctx, 0);
  master.connect(ctx.destination);
  return { sound, master, ...BUILDERS[sound](ctx, master) };
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
      playing = begin(ctx, target.sound);
      fade = FADE_IN;
    }
    playing.master.gain.cancelScheduledValues(ctx.currentTime);
    playing.master.gain.setTargetAtTime(target.gain * HEADROOM, ctx.currentTime, fade);
  } catch {}
}

// ---------- Previews (Session settings) ----------
// A separate slot from the session's sound: ~10 s with a fade, one at a time.

// endsAt: when (in audio-clock seconds) the closing fade starts.
let preview: (Playing & { timer: ReturnType<typeof setTimeout>; endsAt: number }) | null = null;
const previewListeners = new Set<() => void>();
const emitPreview = () => previewListeners.forEach((listener) => listener());

export function startPreview(sound: AmbienceSound, volume: number) {
  try {
    stopPreview();
    const ctx = audioContext();
    if (!ctx) return;
    if (ctx.state === "suspended") void ctx.resume(); // a tap, so this works on phones too
    const p = begin(ctx, sound);
    const endsAt = ctx.currentTime + PREVIEW_SECONDS - 1.5;
    p.master.gain.setTargetAtTime(volume * HEADROOM, ctx.currentTime, 0.3);
    p.master.gain.setTargetAtTime(0, endsAt, 0.4); // fade before the end
    preview = { ...p, endsAt, timer: setTimeout(stopPreview, PREVIEW_SECONDS * 1000) };
    emitPreview();
  } catch {}
}

export function stopPreview() {
  if (!preview) return;
  clearTimeout(preview.timer);
  const ctx = audioContext();
  if (ctx) fadeOutAndStop(preview, ctx);
  preview = null;
  emitPreview();
}

export function setPreviewVolume(volume: number) {
  const ctx = audioContext();
  if (!preview || !ctx) return;
  preview.master.gain.cancelScheduledValues(ctx.currentTime);
  preview.master.gain.setTargetAtTime(volume * HEADROOM, ctx.currentTime, ADJUST);
  // That cancelled the closing fade too: schedule it again.
  preview.master.gain.setTargetAtTime(0, Math.max(ctx.currentTime, preview.endsAt), 0.4);
}

// Which sound is previewing right now (null = none), for the settings list and the tank.
export function usePreview(): AmbienceSound | null {
  return useSyncExternalStore(
    (listener) => {
      previewListeners.add(listener);
      return () => {
        previewListeners.delete(listener);
      };
    },
    () => preview?.sound ?? null,
    () => null,
  );
}
