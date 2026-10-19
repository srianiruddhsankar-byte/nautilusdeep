// Pure: which "Time's up" push notifications a running session should have
// waiting on the server, and whether this device can get them at all. No
// browser APIs and no clock (`now` comes in), so it's tested in
// lib/push-schedule.test.ts. lib/timer-pushes.ts sends the list; the server
// (supabase/functions/send-push) sends each one when its time comes.
//
// The list mirrors the in-app alarm: each phase end of a cycle, the end of the
// last focus block ("Time's up", or "Session complete" for sessions started
// before Continue existed), and a pause running out. Two rules keep it honest:
// - Deep Focus: leaving during focus ends the session, so nothing is kept from
//   the moment you'd fail if you left RIGHT NOW (or when you did leave). During
//   focus that's almost everything, during a break it's just "Break's over",
//   while paused "Pause over". A notification can never announce a block that
//   leaving has already lost, even if the app never gets to tell the server.
// - Night mode: nothing after a missed check-in's deadline (the session would
//   end at the last check-in). Confirming one rewrites the list.
// While Home is on screen, alerts due within the next 30 s are left to the
// in-app alarm (a push that shows nothing gets an iPhone's subscription
// cancelled after a few).

import { PAUSE_OVER_ALARM, SESSION_DONE_ALARM, TIMES_UP_ALARM, phaseAlarm, type Alarm } from "./alarm-text.ts";
import {
  MAX_PAUSE_MS,
  getStatus,
  isOpenFocus,
  isPaused,
  leaveFailureTime,
  missedCheckInAt,
  phaseEndsAt,
  type Session,
} from "./timer.ts";

// key: which moment it is ("end:3" = phase 3 ends, "pause"), so the server never
// sends the same one twice. at: when (ms since 1970).
export type PushAlert = { key: string; at: number; title: string; body: string };

export const VISIBLE_LOOKAHEAD_MS = 30_000;

// While paused, the schedule assumes the pause lasts its full 5 minutes (it
// ends by itself then). Resuming early rewrites the list.
function withFullPause(session: Session, now: number): Session {
  if (!isPaused(session, now)) return session;
  return { ...session, pause: { ...session.pause!, endedAt: session.pause!.startedAt + MAX_PAUSE_MS } };
}

function alert(key: string, at: number, a: Alarm): PushAlert {
  return { key, at, title: a.title, body: a.detail };
}

// Every moment this session would ring the alarm, as things stand at `now`
// (past ones included; pushPlan picks the future ones).
export function sessionAlerts(session: Session, now: number): PushAlert[] {
  const out: PushAlert[] = [];
  if (isPaused(session, now)) out.push(alert("pause", session.pause!.startedAt + MAX_PAUSE_MS, PAUSE_OVER_ALARM));

  const s = withFullPause(session, now);
  const last = s.phases.length - 1;
  for (const end of phaseEndsAt(s, now)) {
    let a: Alarm | null;
    if (end.index < last) a = phaseAlarm(getStatus(s, end.at)); // the next phase begins
    else if (!s.chain) a = SESSION_DONE_ALARM; // an older session simply ends
    // Continuable: the last focus block's end starts the break you can continue
    // in. A stopwatch part ends when you tap Stop, and a final long break
    // running out ends quietly, so neither rings.
    else a = end.kind === "focus" && s.mode !== "stopwatch" ? TIMES_UP_ALARM : null;
    if (a) out.push(alert(`end:${end.index}`, end.at, a));
  }
  return out.sort((x, y) => x.at - y.at);
}

// What the server should hold for this session right now. `visible`: Home is
// on screen (its in-app alarm rings by itself).
export function pushPlan(session: Session, now: number, { visible }: { visible: boolean }): PushAlert[] {
  const s = withFullPause(session, now);
  let cut = missedCheckInAt(s, now) ?? Infinity;
  if (!isOpenFocus(s)) {
    // As if you left now, unless you already have.
    const fail = leaveFailureTime(s, s.awaySince ?? now, Infinity);
    if (fail !== null) cut = Math.min(cut, fail);
  }
  const from = visible ? now + VISIBLE_LOOKAHEAD_MS : now;
  return sessionAlerts(session, now).filter((a) => a.at > from && a.at < cut);
}

// ---------- Can this device get them? ----------

// ready: can ask / is on. install-first: an iPhone outside the installed app
// (Safari only allows notifications there). blocked: the user said no in the
// browser (only its settings can undo that). unsupported: no Web Push here.
export type PushSupport = "ready" | "install-first" | "blocked" | "unsupported";

export function pushSupport(f: {
  hasPush: boolean;
  ios: boolean;
  standalone: boolean;
  permission: "default" | "granted" | "denied" | null;
}): PushSupport {
  if (f.ios && !f.standalone) return "install-first";
  if (!f.hasPush || f.permission === null) return "unsupported";
  if (f.permission === "denied") return "blocked";
  return "ready";
}

// The running screen's "Get a notification when time's up?" banner: not while
// it's already on, never again after Not now, not in the 10-second cancel
// window (that button matters more), and only where it can lead somewhere.
export function showPushOffer(f: { support: PushSupport; on: boolean; notNow: boolean; cancelWindow: boolean }): boolean {
  if (f.on || f.notNow || f.cancelWindow) return false;
  return f.support === "ready" || f.support === "install-first";
}
