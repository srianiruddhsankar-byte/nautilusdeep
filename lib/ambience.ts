import { useSyncExternalStore } from "react";
import { PREVIEW_SECONDS, type AmbienceSound, type AmbienceTarget } from "./ambience-logic";
import { audioContext } from "./feedback";

// The ocean ambience engine: looping water sounds made entirely in code with
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
// - EVENTS at random moments give each sound its character: bubbles and drips
//   (tiny sines whose pitch sweeps), rain drops (tiny bursts of noise), crickets,
//   a wooden creak, a far bell, whale-like calls. An ECHO (a delay feeding back
//   into itself, darker each time) makes things sound far away or in a hollow.
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

// Calls `fn` again and again at random gaps (ms), the first after `firstMs`. Returns stop.
function randomly(firstMs: number, minMs: number, maxMs: number, fn: () => void) {
  let timer: ReturnType<typeof setTimeout> | null = setTimeout(function tick() {
    fn();
    timer = setTimeout(tick, minMs + Math.random() * (maxMs - minMs));
  }, firstMs);
  return () => {
    if (timer) clearTimeout(timer);
    timer = null;
  };
}

// An echo: whatever goes into the returned node is heard now, then again and
// again, quieter and darker each time. Makes a sound feel distant (or in a hollow).
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

// A short sound "event": a tone gliding from `from` to `to` Hz with a quick rise
// and a fade, into `dest`.
function blip(
  ctx: AudioContext,
  dest: AudioNode,
  at: number,
  { from, to, glide, peak, decay, type = "sine" }: {
    from: number;
    to: number;
    glide: number;
    peak: number;
    decay: number;
    type?: OscillatorType;
  },
) {
  const osc = ctx.createOscillator();
  osc.type = type;
  const env = gain(ctx, 0);
  osc.frequency.setValueAtTime(from, at);
  osc.frequency.exponentialRampToValueAtTime(to, at + glide);
  env.gain.setValueAtTime(0, at);
  env.gain.linearRampToValueAtTime(peak, at + 0.005);
  env.gain.exponentialRampToValueAtTime(0.0001, at + decay);
  osc.connect(env).connect(dest);
  osc.start(at);
  osc.stop(at + decay + 0.05);
}

// Night shore: slower, darker surf, with faint crickets far up the beach.
const night: Build = (ctx, out) => {
  const surf = loop(ctx, "brown");
  const dark = filter(ctx, "lowpass", 420, 0.5);
  const swell = gain(ctx, 0.45);
  surf.connect(dark).connect(swell).connect(out);
  const oscs = [
    lfo(ctx, 0.06, 0.3, swell.gain),
    lfo(ctx, 0.097, 0.1, swell.gain),
    lfo(ctx, 0.06, 200, dark.frequency),
  ];

  const crickets = gain(ctx, 1);
  crickets.connect(out);
  // A chirp: three or four very short high pulses.
  const stopCrickets = randomly(500, 900, 2600, () => {
    const at = ctx.currentTime + 0.05;
    const pitch = 4200 + Math.random() * 500;
    const pulses = 3 + Math.floor(Math.random() * 2);
    for (let i = 0; i < pulses; i++) {
      blip(ctx, crickets, at + i * 0.06, { from: pitch, to: pitch, glide: 0.01, peak: 0.012, decay: 0.035 });
    }
  });
  return {
    stop: () => {
      stopCrickets();
      [surf, ...oscs].forEach((n) => n.stop());
    },
  };
};

// Rain on the sea: a soft hiss with gusts, a low sea beneath, and countless tiny drops.
const rain: Build = (ctx, out) => {
  const hiss = loop(ctx, "pink");
  const hissGain = gain(ctx, 0.3);
  hiss.connect(filter(ctx, "highpass", 1200)).connect(filter(ctx, "lowpass", 7000)).connect(hissGain).connect(out);

  const sea = loop(ctx, "brown");
  const seaGain = gain(ctx, 0.35);
  sea.connect(filter(ctx, "lowpass", 350)).connect(seaGain).connect(out);

  const oscs = [lfo(ctx, 0.23, 0.06, hissGain.gain), lfo(ctx, 0.071, 0.08, hissGain.gain), lfo(ctx, 0.07, 0.1, seaGain.gain)];

  // A drop: a few milliseconds of noise, each a slightly different pitch.
  const drops = filter(ctx, "bandpass", 3000, 0.8);
  drops.connect(out);
  const stopDrops = randomly(0, 15, 70, () => {
    const at = ctx.currentTime + 0.02;
    const src = ctx.createBufferSource();
    src.buffer = noise(ctx, "pink");
    src.playbackRate.value = 0.8 + Math.random() * 1.2;
    const env = gain(ctx, 0);
    env.gain.setValueAtTime(0, at);
    env.gain.linearRampToValueAtTime(0.05 + Math.random() * 0.12, at + 0.002);
    env.gain.exponentialRampToValueAtTime(0.0001, at + 0.03);
    src.connect(env).connect(drops);
    src.start(at, Math.random() * NOISE_SECONDS, 0.05);
  });
  return {
    stop: () => {
      stopDrops();
      [hiss, sea, ...oscs].forEach((n) => n.stop());
    },
  };
};

// Rock pool: small shifting ripples, a gentle wash, and drips echoing off the rock.
const rockpool: Build = (ctx, out) => {
  const ripple = loop(ctx, "pink");
  const band = filter(ctx, "bandpass", 900, 0.8);
  const rippleGain = gain(ctx, 0.3);
  ripple.connect(band).connect(rippleGain).connect(out);
  const stopRipple = randomly(0, 120, 320, () => {
    const now = ctx.currentTime;
    band.frequency.setTargetAtTime(600 + Math.random() * 900, now, 0.08);
    rippleGain.gain.setTargetAtTime(0.18 + Math.random() * 0.18, now, 0.1);
  });

  const wash = loop(ctx, "brown");
  const washGain = gain(ctx, 0.3);
  wash.connect(filter(ctx, "lowpass", 300)).connect(washGain).connect(out);
  const oscs = [lfo(ctx, 0.11, 0.15, washGain.gain)];

  const hollow = echo(ctx, out, 0.09, 0.3);
  const stopDrips = randomly(800, 500, 2200, () => {
    const from = 1100 + Math.random() * 1300;
    blip(ctx, hollow, ctx.currentTime + 0.02, { from, to: from * 1.5, glide: 0.025, peak: 0.07, decay: 0.12 });
  });
  return {
    stop: () => {
      stopRipple();
      stopDrips();
      [ripple, wash, ...oscs].forEach((n) => n.stop());
    },
  };
};

// Gentle stream: water babbling over stones. Three narrow bands of noise whose
// pitches keep jumping around quickly: that busy shifting is what "babble" is.
const stream: Build = (ctx, out) => {
  const bands: [number, number][] = [
    [500, 0.35],
    [1100, 0.25],
    [2300, 0.12],
  ];
  const sources: AudioBufferSourceNode[] = [];
  const stops = bands.map(([base, level]) => {
    const src = loop(ctx, "pink");
    const band = filter(ctx, "bandpass", base, 2.2);
    const level0 = gain(ctx, level);
    src.connect(band).connect(level0).connect(out);
    sources.push(src);
    return randomly(0, 70, 180, () => {
      const now = ctx.currentTime;
      band.frequency.setTargetAtTime(base * (0.65 + Math.random() * 0.7), now, 0.04);
      level0.gain.setTargetAtTime(level * (0.6 + Math.random() * 0.8), now, 0.05);
    });
  });
  const body = loop(ctx, "brown");
  body.connect(filter(ctx, "lowpass", 400)).connect(gain(ctx, 0.25)).connect(out);
  return {
    stop: () => {
      stops.forEach((stop) => stop());
      [body, ...sources].forEach((n) => n.stop());
    },
  };
};

// Harbour: water slapping lightly at hulls, a slow wooden creak, a bell far off.
const harbour: Build = (ctx, out) => {
  const lap = loop(ctx, "brown");
  const lapGain = gain(ctx, 0.4);
  lap.connect(filter(ctx, "lowpass", 520, 0.7)).connect(lapGain).connect(out);
  const oscs = [lfo(ctx, 0.31, 0.18, lapGain.gain), lfo(ctx, 0.47, 0.1, lapGain.gain), lfo(ctx, 0.05, 0.08, lapGain.gain)];

  // Creak: a low, rough tone sinking in pitch, heard through a narrow band.
  const wood = filter(ctx, "bandpass", 420, 3);
  wood.connect(out);
  const stopCreaks = randomly(2500, 7000, 15000, () => {
    const at = ctx.currentTime + 0.05;
    const osc = ctx.createOscillator();
    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(115 + Math.random() * 30, at);
    osc.frequency.linearRampToValueAtTime(85 + Math.random() * 15, at + 0.8);
    const env = gain(ctx, 0);
    env.gain.setValueAtTime(0, at);
    env.gain.linearRampToValueAtTime(0.035, at + 0.25);
    env.gain.linearRampToValueAtTime(0, at + 0.9);
    osc.connect(env).connect(wood);
    osc.start(at);
    osc.stop(at + 1);
  });

  // Bell: a few ringing partials with a long fade, through a long echo.
  const far = echo(ctx, out, 0.45, 0.4, 0.6);
  const stopBells = randomly(6000, 18000, 35000, () => {
    const at = ctx.currentTime + 0.05;
    [1, 2.76, 5.4].forEach((ratio, i) => {
      blip(ctx, far, at, { from: 620 * ratio, to: 620 * ratio, glide: 0.01, peak: 0.02 / (i + 1), decay: 4 - i });
    });
  });
  return {
    stop: () => {
      stopCreaks();
      stopBells();
      [lap, ...oscs].forEach((n) => n.stop());
    },
  };
};

// Deep ocean: a very low hum, and now and then a slow, distant whale-like call.
const deep: Build = (ctx, out) => {
  const hum = loop(ctx, "brown");
  const low = filter(ctx, "lowpass", 150, 1);
  hum.connect(low).connect(gain(ctx, 1.4)).connect(out);
  const oscs = [lfo(ctx, 0.03, 40, low.frequency)];

  const far = echo(ctx, out, 0.6, 0.45, 0.5);
  const callBus = filter(ctx, "lowpass", 700);
  callBus.connect(far);
  // A call: a tone gliding up and back down over ~3 s, with a slow wobble.
  const stopCalls = randomly(2000, 10000, 22000, () => {
    const at = ctx.currentTime + 0.05;
    const f = 170 + Math.random() * 130;
    const osc = ctx.createOscillator();
    osc.frequency.setValueAtTime(f, at);
    osc.frequency.linearRampToValueAtTime(f * (1.4 + Math.random() * 0.4), at + 1.3);
    osc.frequency.linearRampToValueAtTime(f * 1.05, at + 2.8);
    const wobble = ctx.createOscillator();
    wobble.frequency.value = 4.5;
    wobble.connect(gain(ctx, 5)).connect(osc.frequency);
    const env = gain(ctx, 0);
    env.gain.setValueAtTime(0, at);
    env.gain.linearRampToValueAtTime(0.06, at + 0.7);
    env.gain.linearRampToValueAtTime(0.045, at + 2.2);
    env.gain.linearRampToValueAtTime(0, at + 3);
    osc.connect(env).connect(callBus);
    [osc, wobble].forEach((o) => {
      o.start(at);
      o.stop(at + 3.1);
    });
  });
  return {
    stop: () => {
      stopCalls();
      [hum, ...oscs].forEach((n) => n.stop());
    },
  };
};

const BUILDERS: Record<AmbienceSound, Build> = {
  waves,
  calm,
  night,
  rain,
  rockpool,
  stream,
  harbour,
  underwater,
  deep,
};

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
    const master = gain(ctx, 0);
    master.connect(ctx.destination);
    const endsAt = ctx.currentTime + PREVIEW_SECONDS - 1.5;
    master.gain.setTargetAtTime(volume * 0.8, ctx.currentTime, 0.3);
    master.gain.setTargetAtTime(0, endsAt, 0.4); // fade before the end
    const timer = setTimeout(stopPreview, PREVIEW_SECONDS * 1000);
    preview = { sound, master, timer, endsAt, ...BUILDERS[sound](ctx, master) };
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
  preview.master.gain.setTargetAtTime(volume * 0.8, ctx.currentTime, ADJUST);
  // That cancelled the closing fade too: schedule it again.
  preview.master.gain.setTargetAtTime(0, Math.max(ctx.currentTime, preview.endsAt), 0.4);
}

// Which sound is previewing right now (null = none), for the settings list.
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
