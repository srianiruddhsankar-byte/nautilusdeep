// The words for every "time's up" moment, in one place: the in-app alarm
// (lib/alarm.ts) and the push notifications (lib/push-schedule.ts) both use
// them, so a notification always says what the alarm would have said.
// Pure: no browser APIs, so it's tested along with the push schedule.

import { CONTINUE_WINDOW_MS, type Status } from "./timer.ts";

export type Alarm = { title: string; detail: string };

// How the alarm sounds (chosen in Session settings): gentle = one soft chime,
// quiet enough for a library (the default); chime = three bright ones;
// silent = vibration and the pulsing screen only. The overlay shows either way.
export type AlarmStyle = "gentle" | "chime" | "silent";
export const ALARM_STYLES: readonly AlarmStyle[] = ["gentle", "chime", "silent"];

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

// The last focus block of a session you can continue is over: its break begins.
export const TIMES_UP_ALARM: Alarm = {
  title: "Time's up",
  detail: `Take a break, or continue within ${CONTINUE_WINDOW_MS / 60_000} minutes.`,
};

export const PAUSE_OVER_ALARM: Alarm = { title: "Pause over", detail: "The timer is running again." };

// Deep Focus: you've been away a while, and the pause that took over (a phone
// call…) has a minute left. A push only: on screen you're already back.
export const AWAY_WARNING_MS = 60_000;
export const STILL_AWAY_ALARM: Alarm = {
  title: "Still away?",
  detail: "Your session is paused. Come back within a minute to keep it going.",
};
