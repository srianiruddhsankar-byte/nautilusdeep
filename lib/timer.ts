// Pure timer logic: no React, no browser APIs, and no Date.now().
// Every function takes the current time as an argument, so tests can fake time
// and the answer is always computed from timestamps (never from counting ticks).

export const LEAVE_GRACE_MS = 15_000;
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
};

export type EndReason = "finished" | "stopped" | "left";

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
};

// Sessions saved before focus modes existed have no focusMode: treat them as Deep.
export function isOpenFocus(session: Session): boolean {
  return session.focusMode === "open";
}

// ---------- Creating sessions ----------

export function startTimer(minutes: number, now: number, focusMode: FocusMode = "deep"): Session {
  return newSession("timer", focusMode, [{ kind: "focus", ms: minutes * MINUTE }], now);
}

export function startStopwatch(now: number, focusMode: FocusMode = "deep"): Session {
  return newSession("stopwatch", focusMode, [{ kind: "focus", ms: null }], now);
}

export function startCycle(
  settings: CycleSettings,
  now: number,
  focusMode: FocusMode = "deep",
): Session {
  const phases: Phase[] = [];
  for (let block = 1; block <= settings.blocksPerSet; block++) {
    phases.push({ kind: "focus", ms: settings.focusMin * MINUTE });
    phases.push(
      block < settings.blocksPerSet
        ? { kind: "shortBreak", ms: settings.shortBreakMin * MINUTE }
        : { kind: "longBreak", ms: settings.longBreakMin * MINUTE },
    );
  }
  return newSession("cycle", focusMode, phases, now);
}

function newSession(mode: Mode, focusMode: FocusMode, phases: Phase[], now: number): Session {
  return { mode, focusMode, startedAt: now, phases, awaySince: null };
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

// The long break is a cycle's last phase: every focus block is already banked.
export function isFinalBreak(session: Session, now: number): boolean {
  const status = getStatus(session, now);
  return session.mode === "cycle" && status.kind === "longBreak" && !status.finished;
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

// ---------- Ending ----------

export function endSession(session: Session, reason: EndReason, at: number): Result {
  const end = sessionEnd(session);
  if (at >= end) {
    at = end;
    reason = "finished";
  }
  // Stopping during the final long break ("Finish") is a full finish, not an early end.
  if (reason === "stopped" && isFinalBreak(session, at)) reason = "finished";

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
  };
}

// The one check the UI runs on every tick and when the user comes back.
// Returns a Result if the session is over, otherwise null.
export function checkSession(session: Session, now: number): Result | null {
  if (session.awaySince !== null) {
    const failAt = leaveFailureTime(session, session.awaySince, now);
    if (failAt !== null) return endSession(session, "left", failAt);
  }
  if (now >= sessionEnd(session)) return endSession(session, "finished", now);
  return null;
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
