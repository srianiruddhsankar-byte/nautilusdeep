import { describe, test } from "node:test";
import assert from "node:assert/strict";
import {
  CANCEL_WINDOW_MS,
  DEFAULT_CYCLE,
  cancelWindowRemainingMs,
  checkSession,
  endSession,
  getStatus,
  leaveFailureTime,
  pressStop,
  startCycle,
  startStopwatch,
  startTimer,
  type Check,
  type Result,
  type Session,
} from "./timer.ts";

const SEC = 1000;
const MIN = 60 * SEC;
const T0 = 1_700_000_000_000; // an arbitrary fixed start time

// Default cycle timeline: F1 0–25, break 25–30, F2 30–55, break 55–60,
// F3 60–85, break 85–90, F4 90–115, long break 115–130.
const cycle = () => startCycle(DEFAULT_CYCLE, T0);

// The Result of a check that must have ended (fails the test otherwise).
function ended(check: Check): Result {
  assert.equal(check.status, "ended");
  return (check as { status: "ended"; result: Result }).result;
}

describe("elapsed time across a simulated sleep", () => {
  test("timer: no ticks for 10 minutes, still shows 15:00 left", () => {
    const s = startTimer(25, T0);
    assert.equal(getStatus(s, T0 + 10 * MIN).remainingMs, 15 * MIN);
  });

  test("stopwatch: phone locked for an hour, elapsed is an hour", () => {
    const s = startStopwatch(T0);
    assert.equal(getStatus(s, T0 + 60 * MIN).elapsedMs, 60 * MIN);
  });

  test("cycle: waking up 32 minutes in lands 2 minutes into Focus 2", () => {
    const st = getStatus(cycle(), T0 + 32 * MIN);
    assert.equal(st.kind, "focus");
    assert.equal(st.focusBlock, 2);
    assert.equal(st.elapsedMs, 2 * MIN);
  });

  test("timer that ran out while asleep finishes at its end time, not wake time", () => {
    const r = ended(checkSession(startTimer(25, T0), T0 + 40 * MIN));
    assert.equal(r.outcome, "completed");
    assert.equal(r.endedAt, T0 + 25 * MIN);
    assert.equal(r.focusMs, 25 * MIN);
  });
});

describe("15-second leave rule", () => {
  const timer = startTimer(25, T0);
  const away = (s: Session, from: number, to: number) =>
    leaveFailureTime(s, T0 + from, T0 + to);

  test("14 s away during focus is fine", () => {
    assert.equal(away(timer, 5 * MIN, 5 * MIN + 14 * SEC), null);
  });

  test("exactly 15 s is still fine", () => {
    assert.equal(away(timer, 5 * MIN, 5 * MIN + 15 * SEC), null);
  });

  test("16 s away fails, at the moment the 15 s ran out", () => {
    assert.equal(away(timer, 5 * MIN, 5 * MIN + 16 * SEC), T0 + 5 * MIN + 15 * SEC);
  });

  test("away for a whole break is fine", () => {
    assert.equal(away(cycle(), 25 * MIN, 30 * MIN), null);
  });

  test("away during a break that runs into focus: only focus time counts", () => {
    // Leave 1 min before the break ends; come back 10 s into Focus 2 → fine.
    assert.equal(away(cycle(), 29 * MIN, 30 * MIN + 10 * SEC), null);
    // Come back 20 s into Focus 2 → failed 15 s into it.
    assert.equal(away(cycle(), 29 * MIN, 30 * MIN + 20 * SEC), T0 + 30 * MIN + 15 * SEC);
  });

  test("checkSession fails a stopwatch the user left", () => {
    const s = { ...startStopwatch(T0), awaySince: T0 + 10 * MIN };
    const r = ended(checkSession(s, T0 + 11 * MIN));
    assert.equal(r.outcome, "failed");
    assert.equal(r.endedBy, "left");
    assert.equal(r.focusMs, 0);
  });
});

describe("cycle checkpoints", () => {
  test("leaving during the first block fails the whole session", () => {
    const r = endSession(cycle(), "left", T0 + 10 * MIN);
    assert.equal(r.outcome, "failed");
    assert.equal(r.blocksCompleted, 0);
    assert.equal(r.lostMs, 10 * MIN);
  });

  test("leaving mid-block 3 keeps blocks 1–2 and loses only block 3", () => {
    const r = endSession(cycle(), "left", T0 + 70 * MIN); // 10 min into F3
    assert.equal(r.outcome, "completed");
    assert.equal(r.blocksCompleted, 2);
    assert.equal(r.focusMs, 50 * MIN);
    assert.equal(r.lostMs, 10 * MIN);
  });

  test("stopping during a short break keeps every finished block", () => {
    const r = endSession(cycle(), "stopped", T0 + 57 * MIN); // break after F2
    assert.equal(r.endedBy, "stopped");
    assert.equal(r.blocksCompleted, 2);
    assert.equal(r.lostMs, 0);
  });

  test("Finish during the long break counts as a full finish", () => {
    const r = endSession(cycle(), "stopped", T0 + 120 * MIN); // 5 min into long break
    assert.equal(r.outcome, "completed");
    assert.equal(r.endedBy, "finished");
    assert.equal(r.blocksCompleted, 4);
    assert.equal(r.focusMs, 100 * MIN);
    assert.equal(r.lostMs, 0);
  });

  test("leaving mid-block, via checkSession, banks blocks done before the leave", () => {
    // Left 10 min into F3 and came back an hour later.
    const s = { ...cycle(), awaySince: T0 + 70 * MIN };
    const r = ended(checkSession(s, T0 + 130 * MIN - 1));
    assert.equal(r.endedAt, T0 + 70 * MIN + 15 * SEC);
    assert.equal(r.blocksCompleted, 2);
  });

  test("finishing the whole set banks all 4 blocks", () => {
    const r = ended(checkSession(cycle(), T0 + 130 * MIN));
    assert.equal(r.outcome, "completed");
    assert.equal(r.blocksCompleted, 4);
    assert.equal(r.focusMs, 100 * MIN);
  });
});

describe("focus modes", () => {
  test("new sessions default to Deep Focus", () => {
    assert.equal(startTimer(25, T0).focusMode, "deep");
  });

  test("Deep Focus still fails after 15 s away", () => {
    const s = { ...startTimer(25, T0, "deep"), awaySince: T0 + 5 * MIN };
    assert.equal(checkSession(s, T0 + 5 * MIN + 15 * SEC).status, "running");
    const r = ended(checkSession(s, T0 + 5 * MIN + 16 * SEC));
    assert.equal(r.outcome, "failed");
    assert.equal(r.endedBy, "left");
    assert.equal(r.focusMode, "deep");
  });

  test("Open Focus never fails from leaving, in any mode", () => {
    const timer = { ...startTimer(25, T0, "open"), awaySince: T0 + MIN };
    const stopwatch = { ...startStopwatch(T0, "open"), awaySince: T0 + MIN };
    const set = { ...startCycle(DEFAULT_CYCLE, T0, "open"), awaySince: T0 + MIN };
    for (const s of [timer, stopwatch, set]) {
      assert.equal(leaveFailureTime(s, T0 + MIN, T0 + 20 * MIN), null);
      assert.equal(checkSession(s, T0 + 20 * MIN).status, "running");
    }
  });

  test("Open Focus timer away the whole time still completes normally", () => {
    const s = { ...startTimer(25, T0, "open"), awaySince: T0 + MIN };
    const r = ended(checkSession(s, T0 + 40 * MIN));
    assert.equal(r.outcome, "completed");
    assert.equal(r.focusMs, 25 * MIN);
    assert.equal(r.focusMode, "open");
  });

  test("Open Focus: giving up a timer still fails it (only leaving is ignored)", () => {
    const r = endSession(startTimer(25, T0, "open"), "stopped", T0 + 10 * MIN);
    assert.equal(r.outcome, "failed");
    assert.equal(r.focusMs, 0);
  });

  test("Open Focus cycle away through every block banks all of them", () => {
    const s = { ...startCycle(DEFAULT_CYCLE, T0, "open"), awaySince: T0 + MIN };
    const r = ended(checkSession(s, T0 + 130 * MIN));
    assert.equal(r.outcome, "completed");
    assert.equal(r.blocksCompleted, 4);
  });
});

describe("cancel window", () => {
  const sessions: [string, Session][] = [
    ["timer", startTimer(25, T0)],
    ["stopwatch", startStopwatch(T0)],
    ["cycle", cycle()],
    ["open timer", startTimer(25, T0, "open")],
  ];

  test("the countdown comes from the start time (so a refresh shows the right number)", () => {
    const s = startTimer(25, T0);
    assert.equal(cancelWindowRemainingMs(s, T0), CANCEL_WINDOW_MS);
    assert.equal(cancelWindowRemainingMs(s, T0 + 3.2 * SEC), 6.8 * SEC);
    assert.equal(cancelWindowRemainingMs(s, T0 + 10 * SEC), 0);
    assert.equal(cancelWindowRemainingMs(s, T0 + MIN), 0);
  });

  for (const [name, s] of sessions) {
    test(`${name}: pressing the button within 10 s cancels and produces nothing to save`, () => {
      const end = pressStop(s, T0 + 9.9 * SEC);
      assert.deepEqual(end, { status: "cancelled" }); // no Result → nothing queued, no bone
    });
  }

  test("at 11 s the normal give-up rule applies: a timer fails", () => {
    const end = pressStop(startTimer(25, T0), T0 + 11 * SEC);
    const r = ended(end);
    assert.equal(r.outcome, "failed");
    assert.equal(r.endedBy, "stopped");
  });

  test("at 11 s a stopwatch Stop completes normally", () => {
    const r = ended(pressStop(startStopwatch(T0), T0 + 11 * SEC));
    assert.equal(r.outcome, "completed");
    assert.equal(r.focusMs, 11 * SEC);
  });

  test("at 11 s ending a cycle in block 1 fails it", () => {
    assert.equal(ended(pressStop(cycle(), T0 + 11 * SEC)).outcome, "failed");
  });

  test("Deep Focus: leaving in the first 10 s and staying away is a cancel, not a bone", () => {
    const s = { ...startTimer(25, T0), awaySince: T0 + 4 * SEC };
    assert.deepEqual(checkSession(s, T0 + 30 * SEC), { status: "cancelled" });
    assert.deepEqual(checkSession(s, T0 + 2 * 60 * MIN), { status: "cancelled" }); // even hours later
  });

  test("Deep Focus: leaving in the first 10 s but returning within 15 s keeps running", () => {
    const s = { ...startTimer(25, T0), awaySince: T0 + 4 * SEC };
    assert.equal(checkSession(s, T0 + 18 * SEC).status, "running"); // e.g. a refresh
  });

  test("Deep Focus: leaving at 11 s follows the normal 15-second rule and fails", () => {
    const s = { ...startTimer(25, T0), awaySince: T0 + 11 * SEC };
    const r = ended(checkSession(s, T0 + 30 * SEC));
    assert.equal(r.outcome, "failed");
    assert.equal(r.endedBy, "left");
  });
});
