import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { toRow, withRowDefaults, type SessionRow } from "./session-record.ts";
import {
  DEFAULT_CYCLE,
  endSession,
  startCycle,
  startStopwatch,
  startTimer,
  withDetails,
} from "./timer.ts";

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
      session_type: "study",
      task_name: null,
      target_minutes: null,
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

describe("session type, task and target", () => {
  const blank = { sessionType: "study" as const, task: "   ", targetMinutes: null };

  test("a blank task starts exactly as before: a Study session with no task", () => {
    const plain = { ...startTimer(25, T0), id: ID };
    const detailed = withDetails(plain, blank);
    assert.deepEqual(detailed, { ...plain, sessionType: "study", task: null, targetMinutes: null });
    // Same row as a session started before Phase 6 (no details at all).
    const before = toRow(endSession(plain, "finished", T0 + 25 * MIN), ID, null);
    const after = toRow(endSession(detailed, "finished", T0 + 25 * MIN), ID, null);
    assert.deepEqual(after, before);
    assert.equal(after.session_type, "study");
    assert.equal(after.task_name, null);
  });

  test("the task name is tidied and saved on the row", () => {
    const s = withDetails(startTimer(25, T0), { ...blank, task: "  Biochem   ch. 4 " });
    const row = toRow(endSession(s, "finished", T0 + 25 * MIN), ID, null);
    assert.equal(row.task_name, "Biochem ch. 4");
  });

  test("a notes stopwatch keeps its target", () => {
    const s = withDetails(startStopwatch(T0), { sessionType: "notes", task: "", targetMinutes: 45 });
    const row = toRow(endSession(s, "stopped", T0 + 52 * MIN), ID, null);
    assert.equal(row.session_type, "notes");
    assert.equal(row.target_minutes, 45);
    assert.equal(row.focus_seconds, 52 * 60);
  });

  test("targets are dropped for study sessions and for notes timers", () => {
    assert.equal(withDetails(startStopwatch(T0), { ...blank, targetMinutes: 45 }).targetMinutes, null);
    const notesTimer = withDetails(startTimer(30, T0), { sessionType: "notes", task: "", targetMinutes: 45 });
    assert.equal(notesTimer.targetMinutes, null);
  });

  test("rows queued before Phase 6 read back as Study with no task or target", () => {
    const old: Partial<SessionRow> = { id: ID, focus_seconds: 1500 }; // no Phase 6 columns
    assert.deepEqual(withRowDefaults(old), {
      id: ID,
      focus_seconds: 1500,
      session_type: "study",
      task_name: null,
      target_minutes: null,
    });
  });
});
