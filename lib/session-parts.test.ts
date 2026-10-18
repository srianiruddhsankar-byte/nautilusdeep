import { test } from "node:test";
import assert from "node:assert/strict";
import { describeParts, focusByTask, focusSpans, readParts } from "./session-parts.ts";

const row = (parts: unknown, task: string | null = "Biology") => ({
  task_name: task,
  focus_seconds: 1440,
  started_at: "2026-10-18T09:00:00.000Z",
  ended_at: "2026-10-18T09:34:00.000Z",
  parts,
});

const CHAIN = [
  { type: "focus", seconds: 720, task: "Biology" },
  { type: "break", seconds: 600 },
  { type: "focus", seconds: 720, task: "Maths" },
];

test("reads a clean list and rejects anything else", () => {
  assert.deepEqual(readParts(CHAIN)?.length, 3);
  assert.equal(readParts(null), null);
  assert.equal(readParts([]), null);
  assert.equal(readParts([{ type: "nap", seconds: 3 }]), null);
  assert.equal(readParts("[]"), null);
  assert.deepEqual(readParts([{ type: "focus", seconds: 61.7 }]), [{ type: "focus", seconds: 61, task: null }]);
});

test("describes a chain in minutes", () => {
  assert.equal(describeParts(readParts(CHAIN)!), "12 min study · 10 min break · 12 min study");
  assert.equal(describeParts([{ type: "focus", seconds: 30 }], "notes"), "<1 min notes");
});

test("study time per task follows the parts", () => {
  assert.deepEqual(focusByTask(row(CHAIN)), [
    { name: "Biology", seconds: 720 },
    { name: "Maths", seconds: 720 },
  ]);
  // without parts: the whole row is its task; no task, nothing
  assert.deepEqual(focusByTask(row(null)), [{ name: "Biology", seconds: 1440 }]);
  assert.deepEqual(focusByTask(row(null, null)), []);
  // the same task twice adds up (ignoring case)
  const twice = [CHAIN[0], CHAIN[1], { type: "focus", seconds: 300, task: "biology" }];
  assert.deepEqual(focusByTask(row(twice)), [{ name: "Biology", seconds: 1020 }]);
});

test("study spans skip the break", () => {
  const spans = focusSpans(row(CHAIN));
  const start = Date.parse("2026-10-18T09:00:00.000Z");
  assert.deepEqual(spans, [
    { start, end: start + 720_000, seconds: 720 },
    { start: start + 1_320_000, end: start + 2_040_000, seconds: 720 },
  ]);
  assert.equal(focusSpans(row(null)).length, 1);
});
