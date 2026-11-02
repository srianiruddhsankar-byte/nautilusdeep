import { describe, test } from "node:test";
import assert from "node:assert/strict";
import {
  LONG_GAP_MS,
  LONG_STOPWATCH_MS,
  checkSession,
  confirmCheckIn,
  endAtSeen,
  longGapSince,
  markSeen,
  startCycle,
  startStopwatch,
  startTimer,
  withDetails,
  DEFAULT_CYCLE,
  type Session,
} from "./timer.ts";

const MIN = 60_000;
const HOUR = 60 * MIN;
const T0 = 1_700_000_000_000;

const details = (sessionType: "study" | "notes", night = false) => ({
  sessionType,
  task: "",
  targetMinutes: null,
  checkIn: night ? { intervalMs: 30 * MIN, style: "chime" as const } : null,
});

describe("stopwatch 'Still going?' check (I-113)", () => {
  test("a stopwatch gets one check: 3 h for study, 4 h for notes", () => {
    assert.deepEqual(withDetails(startStopwatch(T0), details("study")).checkIn, {
      intervalMs: LONG_STOPWATCH_MS.study,
      style: "chime",
      kind: "long",
    });
    assert.equal(withDetails(startStopwatch(T0), details("notes")).checkIn?.intervalMs, 4 * HOUR);
  });

  test("timers and cycles end by themselves, so they get none", () => {
    assert.equal(withDetails(startTimer(25, T0), details("study")).checkIn, null);
    assert.equal(withDetails(startCycle(DEFAULT_CYCLE, T0), details("study")).checkIn, null);
  });

  test("Night mode already covers it: its check-ins are kept, no extra one", () => {
    assert.equal(withDetails(startStopwatch(T0), details("study", true)).checkIn?.kind, undefined);
  });

  test("no tap within 2 min of the 3 h check: ends AT the check, completed, no bone", () => {
    const s = withDetails(startStopwatch(T0, "open"), details("study"));
    assert.equal(checkSession(s, T0 + 3 * HOUR + MIN).status, "running"); // still time to tap
    const check = checkSession(s, T0 + 5 * HOUR);
    assert.equal(check.status, "ended");
    const r = (check as { result: { outcome: string; focusMs: number; endedBy: string; endNote?: string } }).result;
    assert.equal(r.outcome, "completed");
    assert.equal(r.endedBy, "checkin");
    assert.equal(r.focusMs, 3 * HOUR); // counted up to the check, not back to the start
    assert.equal((r as unknown as { endedAt: number }).endedAt, T0 + 3 * HOUR);
    assert.equal(r.endNote, "long-check");
  });

  test("tapping it keeps counting, and the next check is 3 h later", () => {
    const s = confirmCheckIn(withDetails(startStopwatch(T0, "open"), details("study")), T0 + 3 * HOUR);
    assert.equal(checkSession(s, T0 + 5 * HOUR).status, "running");
    const r = (checkSession(s, T0 + 7 * HOUR) as { result: { focusMs: number } }).result;
    assert.equal(r.focusMs, 6 * HOUR); // the second check, unanswered: counted up to it
  });
});

describe("coming back after a long gap (I-112)", () => {
  const open = (): Session => markSeen(withDetails(startStopwatch(T0, "open"), details("study")), T0 + 30 * MIN);
  const deep = (): Session => markSeen(startTimer(60, T0, "deep"), T0 + 10 * MIN);

  test("a short gap is fine", () => {
    assert.equal(longGapSince(open(), T0 + 30 * MIN + LONG_GAP_MS - 1), null);
  });

  test("a long gap in focus: the moment the app was last seen", () => {
    assert.equal(longGapSince(open(), T0 + 2 * HOUR), T0 + 30 * MIN);
    assert.equal(longGapSince(deep(), T0 + 50 * MIN), T0 + 10 * MIN);
  });

  test("sessions from before seenAt existed are left alone", () => {
    assert.equal(longGapSince(startTimer(60, T0, "deep"), T0 + 2 * HOUR), null);
  });

  test("Deep Focus: a leave the app noticed keeps the normal leave rules", () => {
    assert.equal(longGapSince({ ...deep(), awaySince: T0 + 10 * MIN }, T0 + 50 * MIN), null);
  });

  test("nothing in doubt when the gap was all break", () => {
    // Pomodoro: focus 0–25, break 25–30. Seen at 25, back at 29: no focus in between.
    const s = markSeen(startCycle(DEFAULT_CYCLE, T0, "open"), T0 + 25 * MIN);
    assert.equal(longGapSince(s, T0 + 29 * MIN), null); // also under the gap length
    const timer = markSeen(startTimer(25, T0, "open"), T0 + 25 * MIN); // seen at its end
    assert.equal(longGapSince(timer, T0 + 2 * HOUR), null);
  });

  test("a Night mode check-in that already ran out wins", () => {
    const s = markSeen(withDetails(startStopwatch(T0, "open"), details("study", true)), T0 + 10 * MIN);
    assert.equal(longGapSince(s, T0 + 2 * HOUR), null);
  });

  test("ending at seenAt: completed, only the time before counts, no bone", () => {
    const r = endAtSeen(open(), T0 + 30 * MIN, "gap-no");
    assert.equal(r.outcome, "completed");
    assert.equal(r.focusMs, 30 * MIN);
    assert.equal(r.endedAt, T0 + 30 * MIN);
    assert.equal(r.endNote, "gap-no");
  });

  test("a timer that ran out during the gap doesn't count as finished", () => {
    const r = endAtSeen(deep(), T0 + 10 * MIN, "gap-closed");
    assert.equal(r.outcome, "completed");
    assert.equal(r.focusMs, 10 * MIN);
    assert.equal(r.endedBy, "checkin");
  });

  test("a cycle keeps only the blocks finished by then", () => {
    const s = markSeen(startCycle(DEFAULT_CYCLE, T0, "deep"), T0 + 40 * MIN); // in focus 2
    const r = endAtSeen(s, T0 + 40 * MIN, "gap-closed");
    assert.equal(r.focusMs, 25 * MIN);
    assert.equal(r.blocksCompleted, 1);
  });
});
