// Chime + vibration when a phase ends. Browser-only; every call is wrapped so an
// unsupported browser simply stays silent instead of crashing.

let audio: AudioContext | null = null;

// Phones only allow sound after a user tap, so call this from a click handler
// (the Start button). Later chimes can then play without a tap.
export function unlockAudio() {
  try {
    audio ??= new AudioContext();
    void audio.resume();
  } catch {}
}

export function chime() {
  try {
    const ctx = (audio ??= new AudioContext());
    if (ctx.state === "suspended") void ctx.resume();
    const t = ctx.currentTime;
    // Two short rising notes.
    [660, 880].forEach((freq, i) => {
      const start = t + i * 0.25;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(0.3, start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.4);
      osc.connect(gain).connect(ctx.destination);
      osc.start(start);
      osc.stop(start + 0.45);
    });
  } catch {}

  try {
    // Not supported on iPhone (Safari has no Vibration API); harmless there.
    navigator.vibrate?.([200, 100, 200]);
  } catch {}
}
