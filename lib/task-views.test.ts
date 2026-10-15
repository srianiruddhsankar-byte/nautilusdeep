import { describe, test } from "node:test";
import assert from "node:assert/strict";
import type { SessionFacts } from "./fish.ts";
import {
  doneHistory,
  dueLabel,
  findTaskByName,
  groupTasks,
  isInProgress,
  openTasksInOrder,
  taskCompletions,
  type Task,
} from "./task-views.ts";
import { startTimer, withDetails, type Session } from "./timer.ts";

const IST = "Asia/Kolkata"; // UTC+5:30
const LA = "America/Los_Angeles"; // UTC−7 in October
let nextId = 0;

// A wall-clock time in a zone with a fixed offset, e.g. at("2026-10-14 23:59", "+05:30").
const at = (wall: string, offset: string) => Date.parse(`${wall.replace(" ", "T")}:00${offset}`);

function task(name: string, overrides: Partial<Task> = {}): Task {
  nextId++;
  return {
    id: `task-${nextId}`,
    name,
    due_date: null,
    done_at: null,
    created_at: new Date(Date.UTC(2026, 9, 1, 0, nextId)).toISOString(),
    ...overrides,
  };
}

function row(taskName: string | null, minutes: number, overrides: Partial<SessionFacts> = {}): SessionFacts {
  nextId++;
  return {
    id: `row-${nextId}`,
    started_at: "2026-10-13T09:00:00.000Z",
    ended_at: "2026-10-13T10:00:00.000Z",
    mode: "timer",
    focus_mode: "deep",
    outcome: "completed",
    focus_seconds: minutes * 60,
    session_type: "study",
    task_name: taskName,
    target_minutes: null,
    cycle_name: null,
    ...overrides,
  };
}

describe("due-date groups", () => {
  const tasks = [
    task("Due today", { due_date: "2026-10-14" }),
    task("Due yesterday", { due_date: "2026-10-13" }),
    task("Due last week", { due_date: "2026-10-07" }),
    task("Due tomorrow", { due_date: "2026-10-15" }),
    task("Due next month", { due_date: "2026-11-02" }),
    task("Whenever"),
    task("Finished", { due_date: "2026-10-14", done_at: "2026-10-14T05:00:00.000Z" }),
  ];
  const names = (list: Task[]) => list.map((t) => t.name);

  test("each task lands in the right group, in the right order", () => {
    const g = groupTasks(tasks, at("2026-10-14 12:00", "+05:30"), IST);
    assert.deepEqual(names(g.today), ["Due today"]);
    assert.deepEqual(names(g.overdue), ["Due last week", "Due yesterday"]); // oldest first
    assert.deepEqual(names(g.upcoming), ["Due tomorrow", "Due next month"]); // soonest first
    assert.deepEqual(names(g.noDate), ["Whenever"]);
    assert.deepEqual(names(g.done), ["Finished"]); // done wins over its due date
    assert.deepEqual(names(openTasksInOrder(g)).slice(0, 3), ["Due today", "Due last week", "Due yesterday"]);
  });

  test("time zone edge: 23:59 in India it's still due Today; 00:01 it's Overdue", () => {
    const due = [task("Essay", { due_date: "2026-10-14" })];
    assert.deepEqual(names(groupTasks(due, at("2026-10-14 23:59", "+05:30"), IST).today), ["Essay"]);
    // 00:01 IST on the 15th is still the 14th in UTC: the user's zone decides, not UTC.
    assert.deepEqual(names(groupTasks(due, at("2026-10-15 00:01", "+05:30"), IST).overdue), ["Essay"]);
  });

  test("time zone edge: the same instant is 'tomorrow' in India but 'today' in Los Angeles", () => {
    const due = [task("Lab report", { due_date: "2026-10-14" })];
    const instant = at("2026-10-14 20:00", "-07:00"); // = 15 Oct 08:30 in India
    assert.deepEqual(names(groupTasks(due, instant, LA).today), ["Lab report"]);
    assert.deepEqual(names(groupTasks(due, instant, IST).overdue), ["Lab report"]);
  });

  test("due labels", () => {
    assert.equal(dueLabel("2026-10-14", "2026-10-14"), "Today");
    assert.equal(dueLabel("2026-10-15", "2026-10-14"), "Tomorrow");
    assert.equal(dueLabel("2026-10-13", "2026-10-14"), "Yesterday");
    assert.match(dueLabel("2026-10-21", "2026-10-14"), /21/);
  });
});

describe("in progress: only while a session runs on the task", () => {
  const biochem = task("Biochem ch. 4");
  const running = (name: string): Session => withDetails(startTimer(25, 0), { sessionType: "study", task: name, targetMinutes: null });

  test("a running session on this task (any capitalisation)", () => {
    assert.equal(isInProgress(biochem, running("biochem CH. 4")), true);
  });

  test("not when nothing is running (e.g. the session has ended)", () => {
    assert.equal(isInProgress(biochem, null), false);
  });

  test("not when the running session is on another task, or has none", () => {
    assert.equal(isInProgress(biochem, running("Physics")), false);
    assert.equal(isInProgress(biochem, running("")), false);
  });

  test("never for a task that's already done", () => {
    const done = task("Physics", { done_at: "2026-10-14T05:00:00.000Z" });
    assert.equal(isInProgress(done, running("Physics")), false);
  });
});

describe("Mark done matching", () => {
  const tasks = [task("Biochem ch. 4"), task("Physics", { done_at: "2026-10-14T05:00:00.000Z" })];

  test("finds the not-done task by name, ignoring case", () => {
    assert.equal(findTaskByName(tasks, "BIOCHEM ch. 4")?.id, tasks[0].id);
  });

  test("a name that's only in Done has no match: no button", () => {
    assert.equal(findTaskByName(tasks, "physics"), null);
  });

  test("a repeating task: matches the open copy, never an old done one", () => {
    const reading = [
      task("Read 20 pages", { done_at: "2026-10-12T05:00:00.000Z" }),
      task("Read 20 pages", { done_at: "2026-10-13T05:00:00.000Z" }),
      task("read 20 pages"), // today's copy
    ];
    assert.equal(findTaskByName(reading, "Read 20 pages")?.id, reading[2].id);
  });

  test("a task typed just for one session isn't on the list: no button", () => {
    assert.equal(findTaskByName(tasks, "Chemistry"), null);
    assert.equal(findTaskByName(tasks, null), null);
  });
});

describe("completed-task history", () => {
  test("newest first, each with the focus time of its sessions", () => {
    const tasks = [
      task("Biochem ch. 4", { done_at: "2026-10-13T12:00:00.000Z" }), // after its sessions (13th, 09:00)
      task("Physics", { done_at: "2026-10-14T10:00:00.000Z" }),
      task("Still to do"),
    ];
    const rows = [
      row("Biochem ch. 4", 30),
      row("biochem ch. 4", 25, { session_type: "notes" }), // notes count too, any capitalisation
      row("Biochem ch. 4", 40, { outcome: "failed", focus_seconds: 0 }), // failed: no time
      row("Biochem ch. 4", 50, { mode: "cycle", outcome: "partial" }), // partial: banked time counts
      row("Still to do", 20),
      row(null, 60),
    ];
    const history = doneHistory(tasks, rows);
    assert.deepEqual(
      history.map((t) => [t.name, t.focusSeconds, t.sessions]),
      [
        ["Physics", 0, 0],
        ["Biochem ch. 4", (30 + 25 + 50) * 60, 3],
      ],
    );
  });

  test("a repeating task: every completion is listed, and each session counts once", () => {
    const tasks = [
      task("Read 20 pages", { done_at: "2026-10-12T10:00:00.000Z" }),
      task("Read 20 pages", { done_at: "2026-10-13T10:00:00.000Z" }),
      task("Read 20 pages"), // today's copy, still open
    ];
    const read = (startIso: string, minutes: number) =>
      row("Read 20 pages", minutes, { started_at: startIso, ended_at: startIso });
    const rows = [
      read("2026-10-12T08:00:00.000Z", 20), // before the 1st completion → 1st
      read("2026-10-12T09:30:00.000Z", 5), // also before the 1st → 1st
      read("2026-10-13T08:00:00.000Z", 25), // between 1st and 2nd → 2nd
      read("2026-10-14T08:00:00.000Z", 30), // after the 2nd → today's open copy, not history
    ];
    assert.deepEqual(
      doneHistory(tasks, rows).map((t) => [t.done_at, t.focusSeconds, t.sessions]),
      [
        ["2026-10-13T10:00:00.000Z", 25 * 60, 1],
        ["2026-10-12T10:00:00.000Z", 25 * 60, 2],
      ],
    );
  });
});

describe("tasks completed today / this week / this month", () => {
  test("counted by the local day each task was ticked off", () => {
    const now = at("2026-10-14 12:00", "+05:30"); // Wednesday
    const done = (iso: string) => task("t", { done_at: iso });
    const tasks = [
      done("2026-10-14T03:00:00.000Z"), // today 08:30 IST
      done("2026-10-13T19:00:00.000Z"), // 14 Oct 00:30 IST: today, though it's the 13th in UTC
      done("2026-10-12T05:00:00.000Z"), // Monday: this week
      done("2026-10-11T05:00:00.000Z"), // last Sunday: this month only
      done("2026-09-30T05:00:00.000Z"), // last month
      task("not done"),
    ];
    assert.deepEqual(taskCompletions(tasks, now, IST), { today: 2, week: 3, month: 4 });
  });
});
