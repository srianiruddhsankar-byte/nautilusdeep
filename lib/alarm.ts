import { useSyncExternalStore } from "react";
import { playCheckInAlarm, playCheckInChime, playChimes, playGentleChime, stopVibrating, vibrate } from "./feedback";
import { loadPrefs } from "./prefs-store";
import type { Alarm, AlarmStyle } from "./alarm-text";
import type { CheckInStyle } from "./timer";

// The words live in lib/alarm-text.ts (shared with the push notifications).
export { PAUSE_OVER_ALARM, SESSION_DONE_ALARM, TIMES_UP_ALARM, phaseAlarm, type Alarm } from "./alarm-text";

// The end-of-block alarm: a sound (in the style chosen in Session settings:
// gentle, chime or silent) plus a vibration, repeated every few seconds until
// you tap "Got it", and never longer than a minute. The overlay
// (app/_focus/alarm-overlay.tsx) shows while it rings, so a phone on silent
// still flashes. Shaped for React's useSyncExternalStore, like the other stores.

export const CHIMES_PER_RING = 3;
export const RING_EVERY_MS = 4_000;
export const ALARM_MAX_MS = 60_000;
const VIBRATION = [300, 150, 300, 150, 300]; // buzz-pause-buzz-pause-buzz (ms)
const GENTLE_VIBRATION = [200, 120, 200];

let current: Alarm | null = null;
let style: AlarmStyle = "gentle";
let repeat: ReturnType<typeof setInterval> | null = null;
let timeout: ReturnType<typeof setTimeout> | null = null;
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

// One ring in the given style. Also the sample when you pick a style.
export function ringOnce(s: AlarmStyle) {
  if (s === "chime") {
    playChimes(CHIMES_PER_RING);
    vibrate(VIBRATION);
  } else {
    if (s === "gentle") playGentleChime();
    vibrate(GENTLE_VIBRATION); // silent: the buzz alone (no vibration on iPhone: the screen still pulses)
  }
}

function ring() {
  ringOnce(style);
}

export function startAlarm(alarm: Alarm) {
  stopAlarm(); // a new alarm replaces one that's still ringing
  current = alarm;
  style = loadPrefs().alarm; // saved on Start, so it's the style this session began with
  ring();
  repeat = setInterval(ring, RING_EVERY_MS);
  timeout = setTimeout(stopAlarm, ALARM_MAX_MS);
  emit();
}

export function stopAlarm() {
  if (repeat) clearInterval(repeat);
  if (timeout) clearTimeout(timeout);
  repeat = timeout = null;
  if (current === null) return;
  current = null;
  stopVibrating();
  emit();
}

export function useAlarm(): Alarm | null {
  return useSyncExternalStore(subscribe, () => current, () => null);
}

// Night mode's "Still studying?" has its own sounds, never the block alarm:
// chime = one soft falling bell (vibrate = the same + a short buzz), alarm = an
// insistent "ding-ding-dong" the running screen repeats every few seconds until
// you tap, pulse = silent (the banner pulses instead).
export const CHECK_IN_ALARM_EVERY_MS = 3_500;

export function checkInAlert(style: CheckInStyle) {
  if (style === "pulse") return;
  if (style === "alarm") {
    playCheckInAlarm();
    vibrate([300, 100, 300]);
    return;
  }
  playCheckInChime();
  if (style === "vibrate") vibrate([200, 120, 200]);
}
