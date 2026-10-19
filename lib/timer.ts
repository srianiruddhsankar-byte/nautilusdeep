// Pure timer logic: no React, no browser APIs, and no Date.now().
// Every function takes the current time as an argument, so tests can fake time
// and the answer is always computed from timestamps (never from counting ticks).

import type { AmbienceChoice } from "./ambience-logic.ts";
import { blocksFromSettings, expandBlocks, type CycleBlock } from "./cycle-blocks.ts";
import type { SessionPart } from "./session-parts.ts";
import { cleanTaskName } from "./task-name.ts";

export const LEAVE_GRACE_MS = 15_000;
// For the first 10 s a session can be cancelled: it vanishes with no record, no bone.
export const CANCEL_WINDOW_MS = 10_000;
// Night mode: how long a "Still studying?" check-in waits for a tap.
export const CHECK_IN_GRACE_MS = 2 * 60_000;
const MINUTE = 60_000;
// Continue session: how long the break after a session waits for "Continue".
export const CONTINUE_WINDOW_MS = 15 * MINUTE;

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
  // Ocean ambience for this session (Phase 8). Missing = off.
  ambience?: SessionAmbience | null;
  // The one pause (Deep Focus only). endedAt null = still paused (it ends by
  // itself after MAX_PAUSE_MS). Missing = not used yet.
  pause?: { startedAt: number; endedAt: number | null } | null;
  // Continue session: present on sessions started since it exists (older ones
  // simply end, as before). See "Continuing" below.
  chain?: Chain;
};

// Continuing turns a session into a chain, like a cycle: part, break, part…
// Each part remembers where its phases begin, its task (it can switch), when it
// began (its own 10-second cancel), and the phases from before it was added, so
// a cancelled continuation goes back to the break exactly as it was.
export type ChainPart = { startedAt: number; firstPhase: number; task: string | null; before: Phase[] | null };
export type Chain = { parts: ChainPart[]; set: Phase[] }; // set: what one part runs (a cycle repeats its whole set)

export type SessionAmbience = { sound: AmbienceChoice; volume: number; paused: boolean };

// How a check-in asks: a gentle chime (+ a buzz), a repeating check-in alarm, or a silent pulse.
export type CheckInStyle = "chime" | "vibrate" | "alarm" | "pulse";
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
  // The pieces of a continued session or a cycle (null for one plain session).
  // Only what counts: a lost last part and any break after the last block are left out.
  parts: SessionPart[] | null;
};

// What happened to a session. Only "ended" produces a Result (which gets saved);
// "cancelled" means the session simply disappears; "updated" means it carries
// on changed (a stopwatch part stopped into its break, or a cancelled
// continuation back in the break).
export type SessionEnd = { status: "cancelled" } | { status: "ended"; result: Result };
export type SessionUpdate = { status: "updated"; session: Session };
export type Check = { status: "running" } | SessionEnd | SessionUpdate;

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
  ambience?: { sound: AmbienceChoice; volume: number } | null; // missing/null = off
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
    ambience:
      details.ambience && details.ambience.sound !== "off" ? { ...details.ambience, paused: false } : null,
  };
}

// ---------- Pause ----------
//
// Deep Focus only, once per session (once per cycle set), up to 5 minutes. The
// session runs on SESSION TIME: a clock that stands still while paused. Every
// rule below works in session time (the countdown, focus credit, blocks, the
// leave rule, Night mode check-ins), so paused minutes never count, leaving
// can't fail you while paused, and check-ins can't come due. Real timestamps go
// in and come out; only the conversion knows about the pause.

export const MAX_PAUSE_MS = 5 * MINUTE;

// The pause as it stands at `now`: when it began and how long it has lasted so
// far (never more than 5 minutes). null = never paused.
function pauseSpan(session: Session, now: number): { start: number; length: number } | null {
  const p = session.pause;
  if (!p) return null;
  const end = Math.min(p.endedAt ?? now, p.startedAt + MAX_PAUSE_MS);
  return { start: p.startedAt, length: Math.max(0, end - p.startedAt) };
}

// Real time → session time.
function toSession(session: Session, t: number): number {
  const p = pauseSpan(session, t);
  if (!p || t <= p.start) return t;
  return Math.max(p.start, t - p.length);
}

// Session time → real time (as things stand at `now`, for a pause still going).
function toReal(session: Session, s: number, now: number): number {
  const p = pauseSpan(session, now);
  if (!p || s <= p.start) return s;
  return s + p.length;
}

export function isPaused(session: Session, now: number): boolean {
  const p = session.pause;
  return !!p && p.endedAt === null && now >= p.startedAt && now < p.startedAt + MAX_PAUSE_MS;
}

export function pauseRemainingMs(session: Session, now: number): number {
  return isPaused(session, now) ? session.pause!.startedAt + MAX_PAUSE_MS - now : 0;
}

// Pause is offered in Deep Focus, once, after the cancel window, while running.
export function canPause(session: Session, now: number): boolean {
  return (
    !isOpenFocus(session) &&
    !session.pause &&
    cancelWindowRemainingMs(session, now) === 0 &&
    !getStatus(session, now).finished
  );
}

export function startPause(session: Session, now: number): Session {
  if (!canPause(session, now)) return session;
  return { ...session, pause: { startedAt: now, endedAt: null }, awaySince: null };
}

// Tapping Resume. (After 5 minutes it resumes by itself; nothing to store.)
export function endPause(session: Session, now: number): Session {
  if (!isPaused(session, now)) return session;
  return { ...session, pause: { ...session.pause!, endedAt: now } };
}

// ---------- Where are we? ----------

type Span = { kind: PhaseKind; start: number; end: number };

// Turns the phase list into absolute [start, end) ranges, in session time.
function spans(session: Session): Span[] {
  let t = session.startedAt;
  return session.phases.map((p) => {
    const start = t;
    t = p.ms === null ? Infinity : t + p.ms;
    return { kind: p.kind, start, end: t };
  });
}

// When the last phase ends, in session time.
function endS(session: Session): number {
  const all = spans(session);
  return all[all.length - 1].end;
}

// When each phase that has an end finishes, in real time (as things stand at
// `now`, for a pause still going). For the push notifications' schedule.
export function phaseEndsAt(session: Session, now: number): { index: number; kind: PhaseKind; at: number }[] {
  return spans(session).flatMap((s, index) =>
    s.end === Infinity ? [] : [{ index, kind: s.kind, at: toReal(session, s.end, now) }],
  );
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
  waiting: boolean; // …and it's the break where you can continue (Continue session)
};

export function getStatus(session: Session, now: number): Status {
  const all = spans(session);
  const t = Math.max(toSession(session, now), session.startedAt);
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
    waiting: finished && isWaitingS(session, t),
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

// Focus time inside [fromS, toS), in session time.
function focusBetweenS(session: Session, fromS: number, toS: number): number {
  let total = 0;
  for (const s of spans(session)) {
    if (s.kind !== "focus") continue;
    total += Math.max(0, Math.min(toS, s.end) - Math.max(fromS, s.start));
  }
  return total;
}

// How much focus time falls between two real moments (paused time never counts).
export function focusMsBetween(session: Session, from: number, to: number): number {
  return focusBetweenS(session, toSession(session, from), toSession(session, to));
}

function bankedS(session: Session, atS: number) {
  const done = spans(session).filter((s) => s.kind === "focus" && s.end <= atS);
  return {
    blocks: done.length,
    ms: done.reduce((sum, s) => sum + (s.end - s.start), 0),
  };
}

// Focus blocks fully finished by real time `at`: these are the banked checkpoints.
export function bankedFocus(session: Session, at: number) {
  return bankedS(session, toSession(session, at));
}

// ---------- Cancel window ----------

// Time left to cancel (0 once the first 10 s are over). Based on the start
// timestamp, so it's right after a refresh too.
// A continuation has its own 10 s, from when you tapped Continue.
export function cancelWindowRemainingMs(session: Session, now: number): number {
  return Math.max(0, partStartedAt(session) + CANCEL_WINDOW_MS - now);
}

// When the current part began (the session's start, unless it was continued).
export function partStartedAt(session: Session): number {
  return session.chain?.parts.at(-1)?.startedAt ?? session.startedAt;
}

// The end button: Cancel during the first 10 s (a cancelled continuation goes
// back to the break), Stop on a continuable stopwatch (its break begins),
// otherwise a normal stop (Give up / End session / Finish).
export function pressStop(session: Session, now: number): SessionEnd | SessionUpdate {
  if (cancelWindowRemainingMs(session, now) > 0) {
    return isContinuation(session) ? { status: "updated", session: undoContinue(session) } : { status: "cancelled" };
  }
  if (session.chain) {
    const status = getStatus(session, now);
    if (!status.finished && status.kind === "focus" && session.phases[status.phaseIndex].ms === null) {
      return { status: "updated", session: closeFocus(session, now) };
    }
  }
  return { status: "ended", result: endSession(session, "stopped", now) };
}

// ---------- Leaving the app ----------

// If the user was away from `from` to `to` (real times), returns the moment they
// ran out of grace (more than 15 s away during focus), or null if they're fine.
// Only focus time counts: time away during a break, or while paused, is free.
// Open Focus has no leave rule at all.
export function leaveFailureTime(
  session: Session,
  from: number,
  to: number,
): number | null {
  if (isOpenFocus(session)) return null;
  const fromS = toSession(session, from);
  const toS = toSession(session, to);
  let grace = LEAVE_GRACE_MS;
  for (const s of spans(session)) {
    if (s.kind !== "focus") continue;
    const awayStart = Math.max(fromS, s.start);
    const awayMs = Math.min(toS, s.end) - awayStart;
    if (awayMs <= 0) continue;
    if (awayMs > grace) return toReal(session, awayStart + grace, to);
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
// All in session time, so nothing comes due (or runs out) while paused.

// Where credit runs up to so far: the last confirmation, or the start.
export function lastConfirmed(session: Session): number {
  return session.confirmedAt ?? session.startedAt;
}

// The moment `focusMs` of focus time has passed after `from` (session time), or
// null if the session ends first. Landing exactly on the end of a focus block
// rolls over to the start of the next one, so a check-in never pops up as a
// break begins.
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

// When the next check-in is due, in session time (or null).
function dueS(session: Session): number | null {
  if (!session.checkIn) return null;
  const due = afterFocus(session, toSession(session, lastConfirmed(session)), session.checkIn.intervalMs);
  return due !== null && due < endS(session) ? due : null;
}

// When the next check-in is due (real time), or null (Night mode off, or the session ends first).
export function checkInDueAt(session: Session, now = session.startedAt): number | null {
  const due = dueS(session);
  return due === null ? null : toReal(session, due, now);
}

// Is a check-in waiting for a tap right now?
export function checkInState(session: Session, now: number) {
  const due = dueS(session);
  if (due === null || toSession(session, now) < due) {
    return { status: "none" as const, dueAt: due === null ? null : toReal(session, due, now) };
  }
  return {
    status: "due" as const,
    dueAt: toReal(session, due, now),
    deadline: toReal(session, due + CHECK_IN_GRACE_MS, now),
  };
}

// When (session time) an unanswered check-in ends the session, or null if it
// can't (Night mode off, or the session finishes before the deadline).
function missedS(session: Session): number | null {
  const due = dueS(session);
  if (due === null) return null;
  const deadline = due + CHECK_IN_GRACE_MS;
  return deadline < endS(session) ? deadline : null;
}

// When (real time) an unanswered check-in would end the session, or null.
export function missedCheckInAt(session: Session, now: number): number | null {
  const missed = missedS(session);
  return missed === null ? null : toReal(session, missed, now);
}

// Tapping "Still studying?" (or "Got it" on a phase alarm): credit now runs to here.
export function confirmCheckIn(session: Session, now: number): Session {
  if (!session.checkIn || now < lastConfirmed(session)) return session;
  return { ...session, confirmedAt: now };
}

// ---------- Ending ----------

export function endSession(session: Session, reason: EndReason, at: number): Result {
  let atS = toSession(session, at);
  const end = endS(session);
  if (atS >= end) {
    atS = end;
    at = toReal(session, end, at);
    reason = "finished";
  }
  // Stopping during the final long break ("Finish") is a full finish, not an early end.
  if (reason === "stopped" && isFinalBreak(session, at)) reason = "finished";
  if (reason === "checkin") return endAtLastCheckIn(session);

  const focusSoFar = focusBetweenS(session, session.startedAt, atS);
  let failed: boolean;
  let focusMs: number;
  let blocksCompleted: number;

  if (session.mode === "cycle" || session.chain) {
    // Checkpoints: finished blocks are banked, the unfinished one is lost.
    // Nothing banked yet (still in the first block) means the session failed.
    // A continuable session works the same way: each part is a block (a timer
    // part counts once it reaches zero, a stopwatch part once you Stop it).
    const banked = bankedS(session, atS);
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
    parts: partsOf(session, lastBankedEndS(session, atS)),
  };
}

// A missed check-in: the session counts only up to the last confirmation, and
// that's when it ends. Completed (a cycle keeps only blocks fully finished by
// then, so it's partial); never failed, so no bone and no dying fish.
function endAtLastCheckIn(session: Session): Result {
  const end = lastConfirmed(session);
  const endAtS = toSession(session, end);
  const isCycle = session.mode === "cycle";
  const banked = bankedS(session, endAtS);
  // a continued timer or stopwatch counts up to the confirmation, like a plain one
  const blocks = isCycle ? banked.blocks : session.chain ? countFocusBlocks(session) : 1;
  return {
    id: session.id,
    mode: session.mode,
    focusMode: isOpenFocus(session) ? "open" : "deep",
    outcome: "completed",
    endedBy: "checkin",
    startedAt: session.startedAt,
    endedAt: end,
    plannedMs: plannedFocusMs(session),
    focusMs: isCycle ? banked.ms : focusBetweenS(session, session.startedAt, endAtS),
    lostMs: 0, // the time asleep isn't "lost focus": it was never focus
    blocksCompleted: blocks,
    totalBlocks: countFocusBlocks(session),
    sessionType: isNotes(session) ? "notes" : "study",
    task: session.task ?? null,
    targetMinutes: session.targetMinutes ?? null,
    cycleName: isCycle ? (session.cycleName ?? null) : null,
    parts: partsOf(session, isCycle ? lastBankedEndS(session, endAtS) : endAtS),
  };
}

// The one check the UI runs on every tick and when the user comes back.
// Whatever happened FIRST decides: leaving (Deep Focus), a missed check-in, or
// the natural end. All from timestamps, so a refresh or a hidden page gives the
// same answer on return.
export function checkSession(session: Session, now: number): Check {
  const nowS = toSession(session, now);
  const failAt = session.awaySince !== null ? leaveFailureTime(session, session.awaySince, now) : null;
  const missS = missedS(session);
  const missed = missS !== null && missS <= nowS ? toReal(session, missS, now) : null;

  if (failAt !== null && (missed === null || failAt <= missed)) {
    // Left during the first 10 s and didn't come back in time: an accidental
    // start, so it's a cancel (no record, no bone), not a failure. A cancelled
    // continuation goes back to the break.
    if (session.awaySince! < partStartedAt(session) + CANCEL_WINDOW_MS) {
      return isContinuation(session) ? { status: "updated", session: undoContinue(session) } : { status: "cancelled" };
    }
    return { status: "ended", result: endSession(session, "left", failAt) };
  }
  if (missed !== null) return { status: "ended", result: endSession(session, "checkin", missed) };
  if (nowS >= endS(session) && !isWaitingS(session, nowS)) {
    return { status: "ended", result: endSession(session, "finished", now) };
  }
  return { status: "running" };
}

// ---------- Continuing ----------
//
// A session started since Continue exists doesn't end when its time is up: it
// goes into a break, like a cycle. For 15 minutes after its last focus block
// (or until a cycle's final long break is over, if that's longer) you can
// Continue (another part: the same again, or with a different length or task;
// Deep / Open Focus and Study / Notes stay) or Finish. If the window runs out,
// it ends by itself, as if you'd tapped Finish: the break after the last block
// never counts, and the session ends where its last block did.
// Everything else works as in a cycle: breaks are free to leave, finished
// parts are banked, and failing a part loses only that part (failing the
// first part loses the session, as always).

export function withChain(session: Session): Session {
  return {
    ...session,
    chain: { parts: [{ startedAt: session.startedAt, firstPhase: 0, task: session.task ?? null, before: null }], set: session.phases },
  };
}

function isContinuation(session: Session): boolean {
  return (session.chain?.parts.length ?? 0) > 1;
}

// The end of the last focus block (session time), or Infinity while a
// stopwatch part runs.
function lastFocusEndS(session: Session): number {
  const focus = spans(session).filter((s) => s.kind === "focus");
  return focus[focus.length - 1].end;
}

// When the chance to continue runs out (session time), or null (not continuable).
function windowEndS(session: Session): number | null {
  if (!session.chain) return null;
  const last = lastFocusEndS(session);
  return last === Infinity ? null : Math.max(endS(session), last + CONTINUE_WINDOW_MS);
}

function isWaitingS(session: Session, nowS: number): boolean {
  const until = windowEndS(session);
  return until !== null && nowS >= endS(session) && nowS < until;
}

// Continue is offered once every focus block is over: in the break after a
// part (or a cycle's final long break), until the window runs out.
export function canContinue(session: Session, now: number): boolean {
  const until = windowEndS(session);
  if (until === null || isPaused(session, now)) return false;
  const nowS = toSession(session, now);
  return nowS >= lastFocusEndS(session) && nowS < until;
}

// Time left to tap Continue (0 when it can't be).
export function continueWindowRemainingMs(session: Session, now: number): number {
  const until = windowEndS(session);
  if (until === null || !canContinue(session, now)) return 0;
  return Math.max(0, toReal(session, until, now) - now);
}

// A stopwatch part's Stop: its focus block ends now and the break begins.
function closeFocus(session: Session, now: number): Session {
  const nowS = toSession(session, now);
  const all = spans(session);
  const i = all.findIndex((s) => nowS < s.end);
  if (i === -1 || session.phases[i].ms !== null) return session;
  const phases = session.phases.map((p, j) => (j === i ? { ...p, ms: Math.max(0, nowS - all[i].start) } : p));
  return { ...session, phases };
}

export type ContinueChange = { minutes?: number; task?: string };

// Another part, starting now. The break so far becomes a break phase (a final
// long break still running ends here). A timer part runs the minutes you pick
// (the last part's length by default); a stopwatch part is another stopwatch;
// a cycle runs its whole set again. The task carries on unless you change it.
export function continueSession(session: Session, now: number, change: ContinueChange = {}): Session {
  if (!session.chain || !canContinue(session, now)) return session;
  const nowS = toSession(session, now);
  const all = spans(session);
  const last = all[all.length - 1];
  const phases = session.phases.map((p) => ({ ...p }));
  if (last.end > nowS) phases[phases.length - 1] = { ...phases[phases.length - 1], ms: nowS - last.start };
  else if (nowS > last.end) phases.push({ kind: "shortBreak", ms: nowS - last.end });

  const firstPhase = phases.length;
  if (session.mode === "timer") {
    const lastFocus = [...session.phases].reverse().find((p) => p.kind === "focus")!;
    const minutes = change.minutes !== undefined && isValidMinutes(change.minutes) ? change.minutes : null;
    phases.push({ kind: "focus", ms: minutes !== null ? minutes * MINUTE : lastFocus.ms });
  } else {
    phases.push(...session.chain.set.map((p) => ({ ...p })));
  }

  const task = change.task !== undefined ? cleanTaskName(change.task) : (session.task ?? null);
  return {
    ...session,
    phases,
    task,
    awaySince: null,
    chain: {
      ...session.chain,
      parts: [...session.chain.parts, { startedAt: now, firstPhase, task, before: session.phases }],
    },
  };
}

// A continuation cancelled in its first 10 s: back to the break, as it was.
function undoContinue(session: Session): Session {
  const chain = session.chain!;
  const part = chain.parts[chain.parts.length - 1];
  const parts = chain.parts.slice(0, -1);
  return {
    ...session,
    phases: part.before ?? session.phases,
    task: parts[parts.length - 1].task,
    awaySince: null,
    chain: { ...chain, parts },
  };
}

// Where the counted study ends (session time) when finished blocks are banked:
// the end of the last finished block, or the start if none.
function lastBankedEndS(session: Session, atS: number): number {
  const done = spans(session).filter((s) => s.kind === "focus" && s.end <= atS);
  return done.length ? done[done.length - 1].end : session.startedAt;
}

// The pieces for history: blocks and breaks up to `creditEndS`, each block
// with its part's task. Only for cycles and continued sessions.
function partsOf(session: Session, creditEndS: number): SessionPart[] | null {
  if (session.mode !== "cycle" && !isContinuation(session)) return null;
  const chainParts = session.chain?.parts ?? [];
  const out: { type: "focus" | "break"; ms: number; task: string | null }[] = [];
  spans(session).forEach((s, i) => {
    if (s.start >= creditEndS) return;
    const ms = Math.min(s.end, creditEndS) - s.start;
    if (s.kind === "focus") {
      const owner = [...chainParts].reverse().find((p) => p.firstPhase <= i);
      out.push({ type: "focus", ms, task: owner ? owner.task : (session.task ?? null) });
    } else {
      const prev = out[out.length - 1];
      if (prev?.type === "break") prev.ms += ms;
      else out.push({ type: "break", ms, task: null });
    }
  });
  while (out.length && out[out.length - 1].type === "break") out.pop();
  const parts = out
    .filter((p) => p.ms >= 1000)
    .map((p) => (p.type === "focus" ? { type: p.type, seconds: Math.floor(p.ms / 1000), task: p.task } : { type: p.type, seconds: Math.floor(p.ms / 1000) }));
  return parts.length ? parts : null;
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
