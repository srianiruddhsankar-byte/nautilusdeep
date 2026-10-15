// Pure timer logic: no React, no browser APIs, and no Date.now().
// Every function takes the current time as an argument, so tests can fake time
// and the answer is always computed from timestamps (never from counting ticks).

import { blocksFromSettings, expandBlocks, type CycleBlock } from "./cycle-blocks.ts";
import { cleanTaskName } from "./task-name.ts";

export const LEAVE_GRACE_MS = 15_000;
// For the first 10 s a session can be cancelled: it vanishes with no record, no bone.
export const CANCEL_WINDOW_MS = 10_000;
// Night mode: how long a "Still studying?" check-in waits for a tap.
export const CHECK_IN_GRACE_MS = 2 * 60_000;
const MINUTE = 60_000;

export type Mode = "timer" | "stopwatch" | "cycle";
export type PhaseKind = "focus" | "shortBreak" | "longBreak";

// Deep: leaving during focus fails it, screen kept awake.
// Open: for studying on this same device; no leave detection, no wake lock.
export type FocusMode = "deep" | "open";

export const FOCUS_MODE_LABEL: Record<FocusMode, string> = {
  deep: "Deep Focus",
  open: "Open Focus",
};

// Study sessions grow fish. Notes sessions don't (they'll grow plants in Phase 7).
export type SessionType = "study" | "notes";

export const SESSION_TYPE_LABEL: Record<SessionType, string> = {
  study: "Study",
  notes: "Notes",
};

// ms: null means open-ended (the stopwatch runs until you stop it).
export type Phase = { kind: PhaseKind; ms: number | null };

export type CycleSettings = {
  focusMin: number;
  shortBreakMin: number;
  longBreakMin: number;
  blocksPerSet: number; // long break comes after this many focus blocks
};

export const DEFAULT_CYCLE: CycleSettings = {
  focusMin: 25,
  shortBreakMin: 5,
  longBreakMin: 15,
  blocksPerSet: 4,
};

// Everything needed to rebuild the timer after a refresh. Plain JSON on purpose.
export type Session = {
  // Assigned by the UI at Start (crypto.randomUUID) and reused as the database
  // id, so saving the same session twice can't duplicate it. Optional because
  // sessions started before Phase 3 don't have one.
  id?: string;
  mode: Mode;
  focusMode: FocusMode;
  startedAt: number;
  phases: Phase[];
  awaySince: number | null; // when the page was last hidden (null = on screen)
  // Added in Phase 6, so sessions saved before then don't have them (= Study, no task).
  sessionType?: SessionType;
  task?: string | null;
  targetMinutes?: number | null; // notes only: "finish in N minutes"
  cycleName?: string | null; // a saved or premade cycle's name; null = Custom
  // Night mode ("Still studying?" check-ins). Off when missing (older sessions too).
  checkIn?: CheckInSettings | null;
  confirmedAt?: number; // the last confirmed check-in; missing = none yet (counts from the start)
};

export type CheckInStyle = "chime" | "vibrate" | "pulse";
export type CheckInSettings = { intervalMs: number; style: CheckInStyle };

// checkin = a Night mode check-in went unanswered (fell asleep): credit stops at the last confirmation.
export type EndReason = "finished" | "stopped" | "left" | "checkin";

export type Result = {
  id?: string; // copied from the session
  mode: Mode;
  focusMode: FocusMode;
  outcome: "completed" | "failed";
  endedBy: EndReason;
  startedAt: number;
  endedAt: number;
  plannedMs: number | null; // total planned focus time; null for the stopwatch
  focusMs: number; // focus time that counts
  lostMs: number; // focus time spent in an unfinished block that doesn't count
  blocksCompleted: number;
  totalBlocks: number;
  sessionType: SessionType;
  task: string | null;
  targetMinutes: number | null;
  cycleName: string | null;
};

// What happened to a session. Only "ended" produces a Result (which gets saved);
// "cancelled" means the session simply disappears.
export type SessionEnd = { status: "cancelled" } | { status: "ended"; result: Result };
export type Check = { status: "running" } | SessionEnd;

// Sessions saved before focus modes existed have no focusMode: treat them as Deep.
export function isOpenFocus(session: Session): boolean {
  return session.focusMode === "open";
}

export function isNotes(session: { sessionType?: SessionType }): boolean {
  return session.sessionType === "notes";
}

// ---------- Creating sessions ----------

export function startTimer(minutes: number, now: number, focusMode: FocusMode = "deep"): Session {
  return newSession("timer", focusMode, [{ kind: "focus", ms: minutes * MINUTE }], now);
}

export function startStopwatch(now: number, focusMode: FocusMode = "deep"): Session {
  return newSession("stopwatch", focusMode, [{ kind: "focus", ms: null }], now);
}

// The four Custom fields (focus, short break, long break, blocks per set).
export function startCycle(
  settings: CycleSettings,
  now: number,
  focusMode: FocusMode = "deep",
): Session {
  return startCycleBlocks(blocksFromSettings(settings), now, focusMode);
}

// Any cycle, from its blocks (see lib/cycle-blocks.ts). The name is kept for stats.
export function startCycleBlocks(
  blocks: CycleBlock[],
  now: number,
  focusMode: FocusMode = "deep",
  cycleName: string | null = null,
): Session {
  return { ...newSession("cycle", focusMode, expandBlocks(blocks), now), cycleName };
}

function newSession(mode: Mode, focusMode: FocusMode, phases: Phase[], now: number): Session {
  return { mode, focusMode, startedAt: now, phases, awaySince: null };
}

export type SessionDetails = {
  sessionType: SessionType;
  task: string; // as typed; blank = no task
  targetMinutes: number | null;
  checkIn?: CheckInSettings | null; // Night mode; missing/null = off
};

// Adds what the setup screen chose. A blank task means no task (the session
// starts exactly as before), and only a notes stopwatch keeps a target.
export function withDetails(session: Session, details: SessionDetails): Session {
  const keepsTarget =
    details.sessionType === "notes" &&
    session.mode === "stopwatch" &&
    details.targetMinutes !== null &&
    isValidMinutes(details.targetMinutes);
  return {
    ...session,
    sessionType: details.sessionType,
    task: cleanTaskName(details.task),
    targetMinutes: keepsTarget ? details.targetMinutes : null,
    checkIn: details.checkIn ?? null,
  };
}

// ---------- Where are we? ----------

type Span = { kind: PhaseKind; start: number; end: number };

// Turns the phase list into absolute [start, end) time ranges.
function spans(session: Session): Span[] {
  let t = session.startedAt;
  return session.phases.map((p) => {
    const start = t;
    t = p.ms === null ? Infinity : t + p.ms;
    return { kind: p.kind, start, end: t };
  });
}

export function sessionEnd(session: Session): number {
  const all = spans(session);
  return all[all.length - 1].end;
}

export function countFocusBlocks(session: Session): number {
  return session.phases.filter((p) => p.kind === "focus").length;
}

// Total focus time the session was planned for; null if open-ended (stopwatch).
export function plannedFocusMs(session: Session): number | null {
  let total = 0;
  for (const p of session.phases) {
    if (p.kind !== "focus") continue;
    if (p.ms === null) return null;
    total += p.ms;
  }
  return total;
}

export type Status = {
  phaseIndex: number;
  kind: PhaseKind;
  elapsedMs: number; // time spent in the current phase
  remainingMs: number | null; // null for the stopwatch
  focusBlock: number; // 1-based number of the current (or just finished) focus block
  totalBlocks: number;
  finished: boolean; // every phase is over
};

export function getStatus(session: Session, now: number): Status {
  const all = spans(session);
  const t = Math.max(now, session.startedAt);
  let index = all.findIndex((s) => t < s.end);
  const finished = index === -1;
  if (finished) index = all.length - 1;

  const span = all[index];
  const elapsedMs = Math.min(t, span.end) - span.start;
  return {
    phaseIndex: index,
    kind: span.kind,
    elapsedMs,
    remainingMs: span.end === Infinity ? null : span.end - span.start - elapsedMs,
    focusBlock: all.slice(0, index + 1).filter((s) => s.kind === "focus").length,
    totalBlocks: countFocusBlocks(session),
    finished,
  };
}

// A long break that is the cycle's last phase: every focus block is already banked.
// (Built cycles could have a long break in the middle; that one isn't final.)
export function isFinalBreak(session: Session, now: number): boolean {
  const status = getStatus(session, now);
  return (
    session.mode === "cycle" &&
    status.kind === "longBreak" &&
    status.phaseIndex === session.phases.length - 1 &&
    !status.finished
  );
}

// How much focus time falls inside [from, to).
export function focusMsBetween(session: Session, from: number, to: number): number {
  let total = 0;
  for (const s of spans(session)) {
    if (s.kind !== "focus") continue;
    total += Math.max(0, Math.min(to, s.end) - Math.max(from, s.start));
  }
  return total;
}

// Focus blocks fully finished by time `at`: these are the banked checkpoints.
export function bankedFocus(session: Session, at: number) {
  const done = spans(session).filter((s) => s.kind === "focus" && s.end <= at);
  return {
    blocks: done.length,
    ms: done.reduce((sum, s) => sum + (s.end - s.start), 0),
  };
}

// ---------- Cancel window ----------

// Time left to cancel (0 once the first 10 s are over). Based on the start
// timestamp, so it's right after a refresh too.
export function cancelWindowRemainingMs(session: Session, now: number): number {
  return Math.max(0, session.startedAt + CANCEL_WINDOW_MS - now);
}

// The end button: Cancel during the first 10 s, otherwise a normal stop
// (Give up / Stop / End session / Finish).
export function pressStop(session: Session, now: number): SessionEnd {
  if (cancelWindowRemainingMs(session, now) > 0) return { status: "cancelled" };
  return { status: "ended", result: endSession(session, "stopped", now) };
}

// ---------- Leaving the app ----------

// If the user was away from `from` to `to`, returns the moment they ran out of
// grace (more than 15 s away during focus), or null if they're fine.
// Only focus time counts: time away during a break is free.
// Open Focus has no leave rule at all.
export function leaveFailureTime(
  session: Session,
  from: number,
  to: number,
): number | null {
  if (isOpenFocus(session)) return null;
  let grace = LEAVE_GRACE_MS;
  for (const s of spans(session)) {
    if (s.kind !== "focus") continue;
    const awayStart = Math.max(from, s.start);
    const awayMs = Math.min(to, s.end) - awayStart;
    if (awayMs <= 0) continue;
    if (awayMs > grace) return awayStart + grace;
    grace -= awayMs;
  }
  return null;
}

// ---------- Night mode check-ins ----------
//
// Every `intervalMs` of FOCUS time since the last confirmation (or the start),
// a check-in is due. Breaks don't count toward it, so in a cycle check-ins only
// come due during focus blocks. If it isn't confirmed within 2 minutes, the
// session ends and its credit stops at the last confirmation: falling asleep
// isn't quitting, so it's saved as completed (or partial), never failed.

// Where credit runs up to so far: the last confirmation, or the start.
export function lastConfirmed(session: Session): number {
  return session.confirmedAt ?? session.startedAt;
}

// The moment `focusMs` of focus time has passed after `from`, or null if the
// session ends first. Landing exactly on the end of a focus block rolls over to
// the start of the next one, so a check-in never pops up as a break begins.
function afterFocus(session: Session, from: number, focusMs: number): number | null {
  let left = focusMs;
  for (const s of spans(session)) {
    if (s.kind !== "focus" || s.end <= from) continue;
    const start = Math.max(from, s.start);
    if (s.end - start > left) return start + left;
    left -= s.end - start;
  }
  return null;
}

// When the next check-in is due, or null (Night mode off, or the session ends first).
export function checkInDueAt(session: Session): number | null {
  if (!session.checkIn) return null;
  const due = afterFocus(session, lastConfirmed(session), session.checkIn.intervalMs);
  return due !== null && due < sessionEnd(session) ? due : null;
}

// Is a check-in waiting for a tap right now?
export function checkInState(session: Session, now: number) {
  const dueAt = checkInDueAt(session);
  if (dueAt === null || now < dueAt) return { status: "none" as const, dueAt };
  return { status: "due" as const, dueAt, deadline: dueAt + CHECK_IN_GRACE_MS };
}

// The moment an unanswered check-in ends the session, or null if it can't
// (Night mode off, or the session finishes before the deadline).
export function missedCheckInAt(session: Session): number | null {
  const dueAt = checkInDueAt(session);
  if (dueAt === null) return null;
  const deadline = dueAt + CHECK_IN_GRACE_MS;
  return deadline < sessionEnd(session) ? deadline : null;
}

// Tapping "Still studying?" (or "Got it" on a phase alarm): credit now runs to here.
export function confirmCheckIn(session: Session, now: number): Session {
  if (!session.checkIn || now < lastConfirmed(session)) return session;
  return { ...session, confirmedAt: now };
}

// ---------- Ending ----------

export function endSession(session: Session, reason: EndReason, at: number): Result {
  const end = sessionEnd(session);
  if (at >= end) {
    at = end;
    reason = "finished";
  }
  // Stopping during the final long break ("Finish") is a full finish, not an early end.
  if (reason === "stopped" && isFinalBreak(session, at)) reason = "finished";
  if (reason === "checkin") return endAtLastCheckIn(session);

  const focusSoFar = focusMsBetween(session, session.startedAt, at);
  let failed: boolean;
  let focusMs: number;
  let blocksCompleted: number;

  if (session.mode === "cycle") {
    // Checkpoints: finished blocks are banked, the unfinished one is lost.
    // Nothing banked yet (still in the first block) means the session failed.
    const banked = bankedFocus(session, at);
    focusMs = banked.ms;
    blocksCompleted = banked.blocks;
    failed = blocksCompleted === 0;
  } else {
    // Timer: only reaching zero counts. Stopwatch: Stop is the normal ending.
    failed = session.mode === "timer" ? reason !== "finished" : reason === "left";
    focusMs = failed ? 0 : focusSoFar;
    blocksCompleted = failed ? 0 : 1;
  }

  return {
    id: session.id,
    mode: session.mode,
    focusMode: isOpenFocus(session) ? "open" : "deep",
    outcome: failed ? "failed" : "completed",
    endedBy: reason,
    startedAt: session.startedAt,
    endedAt: at,
    plannedMs: plannedFocusMs(session),
    focusMs,
    lostMs: focusSoFar - focusMs,
    blocksCompleted,
    totalBlocks: countFocusBlocks(session),
    sessionType: isNotes(session) ? "notes" : "study",
    task: session.task ?? null,
    targetMinutes: session.targetMinutes ?? null,
    cycleName: session.mode === "cycle" ? (session.cycleName ?? null) : null,
  };
}

// A missed check-in: the session counts only up to the last confirmation, and
// that's when it ends. Completed (a cycle keeps only blocks fully finished by
// then, so it's partial); never failed, so no bone and no dying fish.
function endAtLastCheckIn(session: Session): Result {
  const end = lastConfirmed(session);
  const isCycle = session.mode === "cycle";
  const banked = bankedFocus(session, end);
  return {
    id: session.id,
    mode: session.mode,
    focusMode: isOpenFocus(session) ? "open" : "deep",
    outcome: "completed",
    endedBy: "checkin",
    startedAt: session.startedAt,
    endedAt: end,
    plannedMs: plannedFocusMs(session),
    focusMs: isCycle ? banked.ms : focusMsBetween(session, session.startedAt, end),
    lostMs: 0, // the time asleep isn't "lost focus": it was never focus
    blocksCompleted: isCycle ? banked.blocks : 1,
    totalBlocks: countFocusBlocks(session),
    sessionType: isNotes(session) ? "notes" : "study",
    task: session.task ?? null,
    targetMinutes: session.targetMinutes ?? null,
    cycleName: isCycle ? (session.cycleName ?? null) : null,
  };
}

// The one check the UI runs on every tick and when the user comes back.
// Whatever happened FIRST decides: leaving (Deep Focus), a missed check-in, or
// the natural end. All from timestamps, so a refresh or a hidden page gives the
// same answer on return.
export function checkSession(session: Session, now: number): Check {
  const failAt = session.awaySince !== null ? leaveFailureTime(session, session.awaySince, now) : null;
  const missedAt = missedCheckInAt(session);
  const missed = missedAt !== null && missedAt <= now ? missedAt : null;

  if (failAt !== null && (missed === null || failAt <= missed)) {
    // Left during the first 10 s and didn't come back in time: an accidental
    // start, so it's a cancel (no record, no bone), not a failure.
    if (session.awaySince! < session.startedAt + CANCEL_WINDOW_MS) return { status: "cancelled" };
    return { status: "ended", result: endSession(session, "left", failAt) };
  }
  if (missed !== null) return { status: "ended", result: endSession(session, "checkin", missed) };
  if (now >= sessionEnd(session)) {
    return { status: "ended", result: endSession(session, "finished", now) };
  }
  return { status: "running" };
}

// ---------- Display helpers ----------

// 1500000 → "25:00", 3723000 → "1:02:03".
export function formatClock(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  const ss = String(s).padStart(2, "0");
  return h > 0 ? `${h}:${String(m).padStart(2, "0")}:${ss}` : `${m}:${ss}`;
}

export function isValidMinutes(n: number): boolean {
  return Number.isInteger(n) && n >= 1 && n <= 600;
}
