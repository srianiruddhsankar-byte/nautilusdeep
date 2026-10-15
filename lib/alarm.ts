import { useSyncExternalStore } from "react";
import { playChimes, stopVibrating, vibrate } from "./feedback";
import type { Status } from "./timer";

// The end-of-block alarm: 3 chimes plus a vibration, repeated every few
// seconds until you tap "Got it", and never longer than a minute. The overlay
// (app/_focus/alarm-overlay.tsx) shows while it rings, so a phone on silent
// still flashes. Shaped for React's useSyncExternalStore, like the other stores.

export const CHIMES_PER_RING = 3;
export const RING_EVERY_MS = 4_000;
export const ALARM_MAX_MS = 60_000;
const VIBRATION = [300, 150, 300, 150, 300]; // buzz-pause-buzz-pause-buzz (ms)

export type Alarm = { title: string; detail: string };

let current: Alarm | null = null;
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

function ring() {
  playChimes(CHIMES_PER_RING);
  vibrate(VIBRATION);
}

export function startAlarm(alarm: Alarm) {
  stopAlarm(); // a new alarm replaces one that's still ringing
  current = alarm;
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

// What the alarm says when a cycle moves on to its next phase (`status` is the
// NEW phase). Calm and short: what just ended, what's next.
export function phaseAlarm(status: Status): Alarm {
  if (status.kind === "focus") {
    return { title: "Break's over", detail: `Focus ${status.focusBlock} of ${status.totalBlocks} has started.` };
  }
  if (status.kind === "longBreak") {
    return { title: "Focus block done", detail: "Long break. Every block is banked." };
  }
  return { title: "Focus block done", detail: "Short break. You can leave the app." };
}

export const SESSION_DONE_ALARM: Alarm = { title: "Session complete", detail: "Nice focus." };
