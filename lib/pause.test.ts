import { describe, test } from "node:test";
import assert from "node:assert/strict";
import {
  DEFAULT_CYCLE,
  MAX_PAUSE_MS,
  canPause,
  checkInDueAt,
  checkInState,
  checkSession,
  endPause,
  getStatus,
  isPaused,
  pauseRemainingMs,
  pressStop,
  startCycle,
  startPause,
  startStopwatch,
  startTimer,
  withDetails,
  type Check,
  type Result,
  type Session,
} from "./timer.ts";

const SEC = 1000;
const MIN = 60 * SEC;
const T0 = 1_700_000_000_000;

function ended(check: Check): Result {
  assert.equal(check.status, "ended");
  return (check as { status: "ended"; result: Result }).result;
}
const away = (s: Session, at: number): Session => ({ ...s, awaySince: at });

describe("who can pause, and when", () => {
  test("Deep Focus, once, after the 10-second cancel window", () => {
    const s = startTimer(25, T0, "deep");
    assert.equal(canPause(s, T0 + 5 * SEC), false); // still "Cancel"
    assert.equal(canPause(s, T0 + MIN), true);
    const paused = startPause(s, T0 + MIN);
    assert.equal(isPaused(paused, T0 + MIN + SEC), true);
    const resumed = endPause(paused, T0 + 2 * MIN);
    assert.equal(canPause(resumed, T0 + 3 * MIN), false); // used up
    assert.equal(startPause(resumed, T0 + 3 * MIN), resumed); // a second pause does nothing
  });

  test("Open Focus has no pause", () => {
    const s = startStopwatch(T0, "open");
    assert.equal(canPause(s, T0 + MIN), false);
    assert.equal(startPause(s, T0 + MIN), s);
  });

  test("a cycle set gets one pause too", () => {
    const s = endPause(startPause(startCycle(DEFAULT_CYCLE, T0), T0 + 10 * MIN), T0 + 11 * MIN);
    assert.equal(canPause(s, T0 + 40 * MIN), false); // block 2: still used up
  });
});

describe("paused time is not credited", () => {
  test("the countdown stands still while paused, then carries on", () => {
    const s = startPause(startTimer(25, T0), T0 + 10 * MIN);
    assert.equal(getStatus(s, T0 + 13 * MIN).remainingMs, 15 * MIN); // frozen at 15:00 left
    const resumed = endPause(s, T0 + 13 * MIN); // paused 3 minutes
    assert.equal(getStatus(resumed, T0 + 18 * MIN).remainingMs, 10 * MIN);
  });

  test("a 25-minute timer with a 3-minute pause ends 3 minutes later, with 25 minutes credited", () => {
    const s = endPause(startPause(startTimer(25, T0), T0 + 10 * MIN), T0 + 13 * MIN);
    assert.equal(checkSession(s, T0 + 27 * MIN).status, "running");
    const r = ended(checkSession(s, T0 + 28 * MIN + SEC));
    assert.equal(r.endedBy, "finished");
    assert.equal(r.focusMs, 25 * MIN);
    assert.equal(r.endedAt, T0 + 28 * MIN);
  });

  test("a stopwatch stopped after a pause: only the unpaused minutes count", () => {
    const s = endPause(startPause(startStopwatch(T0), T0 + 20 * MIN), T0 + 24 * MIN);
    const end = pressStop(s, T0 + 40 * MIN);
    assert.equal(end.status === "ended" && end.result.focusMs, 36 * MIN);
  });

  test("stopping DURING the pause credits up to the moment it began", () => {
    const s = startPause(startStopwatch(T0), T0 + 20 * MIN);
    const end = pressStop(s, T0 + 22 * MIN);
    assert.equal(end.status === "ended" && end.result.focusMs, 20 * MIN);
  });
});

describe("the 5-minute limit", () => {
  test("it resumes by itself after 5 minutes (nothing needs to be stored)", () => {
    const s = startPause(startTimer(25, T0), T0 + 10 * MIN);
    assert.equal(pauseRemainingMs(s, T0 + 12 * MIN), 3 * MIN);
    assert.equal(isPaused(s, T0 + 15 * MIN), false);
    // Real minute 20 = 15 minutes of session time (5 were paused), so 10 minutes are left.
    assert.equal(getStatus(s, T0 + 20 * MIN).remainingMs, 10 * MIN);
    assert.equal(ended(checkSession(s, T0 + 31 * MIN)).focusMs, 25 * MIN); // ends at 30, not 25
  });

  test("tapping Resume after 5 minutes changes nothing (it already resumed)", () => {
    const s = startPause(startTimer(25, T0), T0 + 10 * MIN);
    assert.equal(endPause(s, T0 + 20 * MIN), s);
    assert.equal(MAX_PAUSE_MS, 5 * MIN);
  });
});

describe("the leave rule while paused", () => {
  test("off during the pause: leave for the whole pause and come back during it", () => {
    const s = away(startPause(startTimer(25, T0), T0 + 10 * MIN), T0 + 10 * MIN + SEC);
    assert.equal(checkSession(s, T0 + 14 * MIN).status, "running");
  });

  test("back on after: still away 15 s after the pause runs out → fails then", () => {
    const s = away(startPause(startTimer(25, T0), T0 + 10 * MIN), T0 + 11 * MIN);
    const r = ended(checkSession(s, T0 + 20 * MIN));
    assert.equal(r.endedBy, "left");
    assert.equal(r.outcome, "failed");
    assert.equal(r.endedAt, T0 + 15 * MIN + 15 * SEC); // 5-min pause over, then 15 s of grace
  });

  test("back on after Resume: leaving later fails as usual", () => {
    const s = away(endPause(startPause(startTimer(25, T0), T0 + 10 * MIN), T0 + 11 * MIN), T0 + 12 * MIN);
    assert.equal(ended(checkSession(s, T0 + 13 * MIN)).endedAt, T0 + 12 * MIN + 15 * SEC);
  });
});

describe("cycles and Night mode", () => {
  test("a pause in block 1 delays the cycle; blocks bank on session time", () => {
    // F1 0–25, paused 10–14: F1 really ends at 29 (real); stop at 30 → block 1 banked.
    const s = endPause(startPause(startCycle(DEFAULT_CYCLE, T0), T0 + 10 * MIN), T0 + 14 * MIN);
    assert.equal(getStatus(s, T0 + 28 * MIN).kind, "focus");
    const end = pressStop(s, T0 + 30 * MIN);
    assert.equal(end.status === "ended" && end.result.blocksCompleted, 1);
    assert.equal(end.status === "ended" && end.result.focusMs, 25 * MIN);
  });

  test("check-ins don't come due during a pause, and their deadline waits too", () => {
    const night = withDetails(startStopwatch(T0, "deep"), {
      sessionType: "study",
      task: "",
      targetMinutes: null,
      checkIn: { intervalMs: 30 * MIN, style: "chime" },
    });
    const s = startPause(night, T0 + 29 * MIN);
    assert.equal(checkInState(s, T0 + 33 * MIN).status, "none"); // would have been due at 30
    const resumed = endPause(s, T0 + 33 * MIN); // paused 4 min
    assert.equal(checkInDueAt(resumed, T0 + 33 * MIN), T0 + 34 * MIN);
    // Due at 34, deadline 36: still running at 35.
    assert.equal(checkSession(resumed, T0 + 35 * MIN).status, "running");
  });
});
