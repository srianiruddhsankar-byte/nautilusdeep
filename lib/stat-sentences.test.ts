import { describe, test } from "node:test";
import assert from "node:assert/strict";
import type { SessionFacts } from "./fish.ts";
import { statSentences } from "./stat-sentences.ts";

const IST = "Asia/Kolkata";
let nextId = 0;

// A session starting at a wall-clock time in India, lasting `minutes`.
function session(wall: string, minutes: number, overrides: Partial<SessionFacts> = {}): SessionFacts {
  const start = Date.parse(`${wall.replace(" ", "T")}:00+05:30`);
  return {
    id: `00000000-0000-4000-8000-${String(nextId++).padStart(12, "0")}`,
    started_at: new Date(start).toISOString(),
    ended_at: new Date(start + minutes * 60_000).toISOString(),
    mode: "timer",
    focus_mode: "deep",
    outcome: "completed",
    focus_seconds: minutes * 60,
    session_type: "study",
    task_name: null,
    target_minutes: null,
    cycle_name: null,
    ...overrides,
  };
}

// Thursday 22 Oct 2026, 20:00 in India. This week = Mon 19 → Thu 22; last week = 12 → 18.
const NOW = Date.parse("2026-10-22T20:00:00+05:30");

describe("stat sentences", () => {
  test("nothing yet: no sentences", () => {
    assert.deepEqual(statSentences([], NOW, IST), []);
  });

  test("more than last week: said, with both numbers", () => {
    const rows = [session("2026-10-14 15:00", 60), session("2026-10-19 15:00", 60), session("2026-10-21 15:00", 30)];
    assert.equal(statSentences(rows, NOW, IST)[0], "More than last week already: 1h 30m vs 1h.");
  });

  test("less than last week: never compared, just this week's time", () => {
    const rows = [session("2026-10-14 15:00", 180), session("2026-10-20 15:00", 45)];
    assert.equal(statSentences(rows, NOW, IST)[0], "45m so far this week.");
  });

  test("nothing this week yet: no week sentence", () => {
    const rows = [session("2026-10-14 15:00", 60)];
    assert.deepEqual(statSentences(rows, NOW, IST), []);
  });

  test("a clear pattern, with enough sessions: when you focus most", () => {
    const rows = ["12", "13", "14", "15", "16"].map((d) => session(`2026-10-${d} 07:00`, 40));
    assert.ok(statSentences(rows, NOW, IST).includes("You focus most in the mornings."));
  });

  test("night wraps past midnight", () => {
    const rows = ["12", "13", "14", "15", "16"].map((d) => session(`2026-10-${d} 23:30`, 40));
    assert.ok(statSentences(rows, NOW, IST).includes("You focus most late at night."));
  });

  test("too few sessions, or spread out: no pattern claimed", () => {
    const few = ["12", "13", "14"].map((d) => session(`2026-10-${d} 07:00`, 60));
    assert.ok(!statSentences(few, NOW, IST).some((s) => s.startsWith("You focus most")));
    const spread = [
      session("2026-10-12 07:00", 40),
      session("2026-10-13 13:00", 40),
      session("2026-10-14 18:00", 40),
      session("2026-10-15 22:00", 40),
      session("2026-10-16 09:00", 10),
    ];
    assert.ok(!statSentences(spread, NOW, IST).some((s) => s.startsWith("You focus most")));
  });

  test("failed sessions don't count toward either", () => {
    const rows = [session("2026-10-20 15:00", 45, { outcome: "failed", focus_seconds: 0 })];
    assert.deepEqual(statSentences(rows, NOW, IST), []);
  });
});
