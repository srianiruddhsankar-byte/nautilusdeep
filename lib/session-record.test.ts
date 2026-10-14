import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { toRow } from "./session-record.ts";
import { DEFAULT_CYCLE, endSession, startCycle, startStopwatch, startTimer } from "./timer.ts";

const SEC = 1000;
const MIN = 60 * SEC;
const T0 = Date.UTC(2026, 9, 14, 9, 0, 0); // 2026-10-14 09:00 UTC
const ID = "00000000-0000-4000-8000-000000000001";

describe("toRow", () => {
  test("completed timer", () => {
    const r = endSession({ ...startTimer(25, T0), id: ID }, "finished", T0 + 25 * MIN);
    assert.deepEqual(toRow(r, r.id!, "user-1"), {
      id: ID,
      user_id: "user-1",
      mode: "timer",
      focus_mode: "deep",
      outcome: "completed",
      ended_by: "finished",
      started_at: "2026-10-14T09:00:00.000Z",
      ended_at: "2026-10-14T09:25:00.000Z",
      focus_seconds: 1500,
      blocks_completed: null,
      blocks_planned: null,
      planned_minutes: 25,
    });
  });

  test("stopwatch keeps exact seconds and has no planned minutes", () => {
    const r = endSession(startStopwatch(T0, "open"), "stopped", T0 + 7 * MIN + 42 * SEC);
    const row = toRow(r, ID, null);
    assert.equal(row.focus_seconds, 462);
    assert.equal(row.planned_minutes, null);
    assert.equal(row.focus_mode, "open");
  });

  test("cycle that lost an unfinished block is partial", () => {
    const r = endSession(startCycle(DEFAULT_CYCLE, T0), "left", T0 + 70 * MIN); // mid F3
    const row = toRow(r, ID, null);
    assert.equal(row.outcome, "partial");
    assert.equal(row.blocks_completed, 2);
    assert.equal(row.blocks_planned, 4);
    assert.equal(row.planned_minutes, 100);
    assert.equal(row.focus_seconds, 50 * 60);
  });

  test("cycle that finished the whole set is completed", () => {
    const r = endSession(startCycle(DEFAULT_CYCLE, T0), "stopped", T0 + 120 * MIN); // Finish
    assert.equal(toRow(r, ID, null).outcome, "completed");
  });

  test("cycle failed in the first block is failed", () => {
    const r = endSession(startCycle(DEFAULT_CYCLE, T0), "left", T0 + 5 * MIN);
    const row = toRow(r, ID, null);
    assert.equal(row.outcome, "failed");
    assert.equal(row.blocks_completed, 0);
  });
});
