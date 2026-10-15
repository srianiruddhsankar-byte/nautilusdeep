// Sound and vibration. Browser-only; every call is wrapped so an unsupported
// browser simply stays silent instead of crashing. lib/alarm.ts decides when.

let audio: AudioContext | null = null;

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

// Not supported on iPhone (Safari has no Vibration API); harmless there.
export function vibrate(pattern: number[]) {
  try {
    navigator.vibrate?.(pattern);
  } catch {}
}

export function stopVibrating() {
  vibrate([0]);
}
