import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { deriveAquarium, leavesBone } from "./fish.ts";
import { deriveGarden } from "./plants.ts";
import { toRow } from "./session-record.ts";
import {
  CHECK_IN_GRACE_MS,
  DEFAULT_CYCLE,
  checkInDueAt,
  checkInState,
  checkSession,
  confirmCheckIn,
  startCycle,
  startStopwatch,
  startTimer,
  withDetails,
  type Check,
  type CheckInSettings,
  type Result,
  type Session,
} from "./timer.ts";

const SEC = 1000;
const MIN = 60 * SEC;
const T0 = 1_700_000_000_000;
const ID = "00000000-0000-4000-8000-000000000001";

const every = (minutes: number): CheckInSettings => ({ intervalMs: minutes * MIN, style: "chime" });
const night = (s: Session, minutes = 30, type: "study" | "notes" = "study") =>
  withDetails({ ...s, id: ID }, { sessionType: type, task: "", targetMinutes: null, checkIn: every(minutes) });

function ended(check: Check): Result {
  assert.equal(check.status, "ended");
  return (check as { status: "ended"; result: Result }).result;
}

describe("Night mode off", () => {
  test("no check-ins: a 3-hour stopwatch keeps running", () => {
    const s = startStopwatch(T0, "open");
    assert.equal(checkInDueAt(s), null);
    assert.equal(checkSession(s, T0 + 180 * MIN).status, "running");
  });
});

describe("check-ins", () => {
  test("due after the interval; the session keeps running during the 2-minute wait", () => {
    const s = night(startStopwatch(T0, "open"));
    assert.equal(checkInDueAt(s), T0 + 30 * MIN);
    assert.equal(checkInState(s, T0 + 29 * MIN).status, "none");
    assert.deepEqual(checkInState(s, T0 + 31 * MIN), {
      status: "due",
      dueAt: T0 + 30 * MIN,
      deadline: T0 + 30 * MIN + CHECK_IN_GRACE_MS,
    });
    assert.equal(checkSession(s, T0 + 31 * MIN).status, "running");
  });

  test("confirmed check-ins extend credit; a missed one ends it at the last confirmation", () => {
    let s = night(startStopwatch(T0, "open"));
    s = confirmCheckIn(s, T0 + 31 * MIN); // answered the 30-min check-in
    assert.equal(checkInDueAt(s), T0 + 61 * MIN); // next one counts from the tap
    s = confirmCheckIn(s, T0 + 62 * MIN);
    // Fell asleep: the 92-minute check-in goes unanswered. Checked at 3 hours.
    const r = ended(checkSession(s, T0 + 180 * MIN));
    assert.equal(r.endedBy, "checkin");
    assert.equal(r.outcome, "completed");
    assert.equal(r.focusMs, 62 * MIN); // credited up to the last confirmation only
    assert.equal(r.endedAt, T0 + 62 * MIN); // and that's when it ended
    assert.equal(r.lostMs, 0);
  });

  test("no confirmation at all: credit is zero (it ends at the start)", () => {
    const s = night(startStopwatch(T0, "open"));
    const r = ended(checkSession(s, T0 + 32 * MIN + 1));
    assert.equal(r.focusMs, 0);
    assert.equal(r.endedAt, T0);
    assert.equal(r.outcome, "completed");
  });

  test("a timer: credit up to the last check-in, saved as completed (not failed)", () => {
    const s = confirmCheckIn(night(startTimer(120, T0)), T0 + 30 * MIN);
    const r = ended(checkSession(s, T0 + 63 * MIN));
    assert.equal(r.focusMs, 30 * MIN);
    assert.equal(toRow(r, ID, null).outcome, "completed");
  });

  test("a session that finishes before the deadline just finishes", () => {
    const s = night(startTimer(31, T0)); // check-in due at 30, deadline 32, timer ends at 31
    const r = ended(checkSession(s, T0 + 40 * MIN));
    assert.equal(r.endedBy, "finished");
    assert.equal(r.focusMs, 31 * MIN);
  });
});

describe("cycles", () => {
  // Pomodoro: F1 0–25, break 25–30, F2 30–55, break 55–60, F3 60–85, …
  test("check-ins only come due during focus (breaks don't count toward the interval)", () => {
    const s = confirmCheckIn(night(startCycle(DEFAULT_CYCLE, T0), 20), T0 + 21 * MIN);
    // 4 focus minutes left in F1 (21–25), then 16 more in F2: due at 46, not during the break.
    assert.equal(checkInDueAt(s), T0 + 46 * MIN);
  });

  test("a check-in landing exactly on a block's end waits for the next focus block", () => {
    const s = night(startCycle(DEFAULT_CYCLE, T0), 25); // F1 is exactly 25 min
    assert.equal(checkInDueAt(s), T0 + 30 * MIN); // the start of F2, not the first second of the break
  });

  test("a missed check-in banks only blocks fully finished by the last confirmation", () => {
    // Confirmed at 27, during the first break ("Got it" on the break alarm counts).
    const s = confirmCheckIn(night(startCycle(DEFAULT_CYCLE, T0), 20), T0 + 27 * MIN);
    assert.equal(checkInDueAt(s), T0 + 50 * MIN); // 20 focus minutes after 27: F2 30–50
    const r = ended(checkSession(s, T0 + 120 * MIN));
    assert.equal(r.endedBy, "checkin");
    assert.equal(r.blocksCompleted, 1);
    assert.equal(r.focusMs, 25 * MIN);
    assert.equal(toRow(r, ID, null).outcome, "partial");
  });

  test("asleep before the first block was finished: partial with nothing banked, still no bone", () => {
    const s = night(startCycle(DEFAULT_CYCLE, T0), 20);
    const row = toRow(ended(checkSession(s, T0 + 23 * MIN)), ID, null);
    assert.equal(row.blocks_completed, 0);
    assert.equal(row.focus_seconds, 0);
    assert.equal(row.outcome, "partial");
    assert.equal(leavesBone(row), false);
  });
});

describe("hidden page or refresh", () => {
  test("Open Focus, phone set down for hours: on return it ends at the last check-in", () => {
    // Saved state after a refresh: same session object, the page just comes back much later.
    const s = { ...confirmCheckIn(night(startStopwatch(T0, "open")), T0 + 30 * MIN), awaySince: T0 + 35 * MIN };
    const r = ended(checkSession(s, T0 + 5 * 60 * MIN));
    assert.equal(r.endedBy, "checkin");
    assert.equal(r.focusMs, 30 * MIN);
  });

  test("Deep Focus: leaving still fails it if that came first (15 s, before any check-in deadline)", () => {
    const s = { ...night(startStopwatch(T0, "deep")), awaySince: T0 + 10 * MIN };
    const r = ended(checkSession(s, T0 + 3 * 60 * MIN));
    assert.equal(r.endedBy, "left");
    assert.equal(r.outcome, "failed");
  });

  test("Deep Focus: a missed check-in that came first wins over a later leave", () => {
    const s = { ...night(startStopwatch(T0, "deep")), awaySince: T0 + 40 * MIN }; // deadline was 32
    assert.equal(ended(checkSession(s, T0 + 60 * MIN)).endedBy, "checkin");
  });
});

describe("no bones, and only credited time grows things", () => {
  test("a missed check-in never leaves a bone; the fish is sized by credited time", () => {
    const s = confirmCheckIn(night(startStopwatch(T0, "open")), T0 + 30 * MIN);
    const row = toRow(ended(checkSession(s, T0 + 180 * MIN)), ID, null);
    assert.equal(row.ended_by, "checkin");
    const aq = deriveAquarium([row]);
    assert.equal(aq.bones, 0);
    assert.equal(aq.tanks[0][0].minutes, 30);
    assert.equal(aq.tanks[0][0].size, "medium");
  });

  test("notes: the plant grows only by the credited minutes", () => {
    const s = confirmCheckIn(night(startStopwatch(T0, "open"), 30, "notes"), T0 + 45 * MIN);
    const row = toRow(ended(checkSession(s, T0 + 180 * MIN)), ID, null);
    const g = deriveGarden([row]);
    assert.equal(g.growing.minutes, 45);
    assert.equal(g.growing.wilted, false);
  });
});
