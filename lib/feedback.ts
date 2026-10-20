// Sound and vibration. Browser-only; every call is wrapped so an unsupported
// browser simply stays silent instead of crashing. lib/alarm.ts decides when.

let audio: AudioContext | null = null;

// The one AudioContext for chimes AND ambience. Phones unlock sound per context
// (after a tap), so sharing it means the Start tap unlocks both. null if the
// browser has no Web Audio.
export function audioContext(): AudioContext | null {
  try {
    audio ??= new AudioContext();
    return audio;
  } catch {
    return null;
  }
}

// Phones only allow sound after a user tap, so call this from a tap handler
// (the Start button, or any tap on Home). Later chimes can then play without one.
export function unlockAudio() {
  try {
    audio ??= new AudioContext();
    if (audio.state === "suspended") void audio.resume();
  } catch {}
}

// One chime = two short rising notes, starting `start` seconds into the context.
function chimeAt(ctx: AudioContext, start: number) {
  [660, 880].forEach((freq, i) => {
    const t = start + i * 0.22;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "triangle"; // a little brighter than a pure sine, so it carries further
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(0.5, t + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.45);
    osc.connect(gain).connect(ctx.destination);
    osc.start(t);
    osc.stop(t + 0.5);
  });
}

// `count` chimes in a row, `gap` seconds apart.
export function playChimes(count: number, gap = 0.8) {
  try {
    const ctx = (audio ??= new AudioContext());
    if (ctx.state === "suspended") void ctx.resume();
    for (let i = 0; i < count; i++) chimeAt(ctx, ctx.currentTime + 0.05 + i * gap);
  } catch {}
}

// One note: `freq` Hz, `delay` s from now, rising quickly to `peak`, then fading over `decay` s.
function tone(freq: number, delay: number, peak: number, decay: number, type: OscillatorType) {
  try {
    const ctx = (audio ??= new AudioContext());
    if (ctx.state === "suspended") void ctx.resume();
    const t = ctx.currentTime + 0.03 + delay;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(peak, t + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + decay);
    osc.connect(gain).connect(ctx.destination);
    osc.start(t);
    osc.stop(t + decay + 0.05);
  } catch {}
}

// The gentle alarm (the default): the block alarm's rising two notes, but lower
// (C5 → E5), as soft sine tones with no bright edge, at about a third of the
// chime's volume. Heard by you at your desk, not by the whole library.
export function playGentleChime() {
  tone(523, 0, 0.16, 0.9, "sine");
  tone(659, 0.28, 0.14, 1.2, "sine");
}

// Night mode's own sounds, never the block alarm's rising two-note chime.
// Gentle: one soft, low bell falling a fourth (G5 → D5), with a long fade.
export function playCheckInChime() {
  tone(784, 0, 0.22, 1.6, "sine");
  tone(587, 0.35, 0.2, 2, "sine");
}

// Alarm: a brighter, insistent "ding-ding-dong" (C6 C6 G5). Repeated by the caller.
export function playCheckInAlarm() {
  [1047, 1047, 784].forEach((f, i) => tone(f, i * 0.22, 0.35, 0.35, "triangle"));
}

// Not supported on iPhone (Safari has no Vibration API); harmless there.
export function vibrate(pattern: number[]) {
  try {
    navigator.vibrate?.(pattern);
  } catch {}
}

export function stopVibrating() {
  vibrate([0]);
}
