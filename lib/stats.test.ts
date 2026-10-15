import { describe, test } from "node:test";
import assert from "node:assert/strict";
import type { SessionFacts } from "./fish.ts";
import {
  addDays,
  computeStats,
  dayKey,
  formatDuration,
  startOfWeek,
  streaks,
  weekdayIndex,
} from "./stats.ts";

const IST = "Asia/Kolkata"; // UTC+5:30, no daylight saving
const MIN = 60_000;
let nextId = 0;

// A session starting at an IST wall-clock time, e.g. at("2026-10-13 23:50").
function at(wall: string): number {
  return Date.parse(`${wall.replace(" ", "T")}:00+05:30`);
}

function session(
  startWall: string,
  minutes: number,
  overrides: Partial<SessionFacts> = {},
): SessionFacts {
  const start = at(startWall);
  return {
    id: `00000000-0000-4000-8000-${String(nextId++).padStart(12, "0")}`,
    started_at: new Date(start).toISOString(),
    ended_at: new Date(start + minutes * MIN).toISOString(),
    mode: "timer",
    focus_mode: "deep",
    outcome: "completed",
    focus_seconds: minutes * 60,
    ...overrides,
  };
}

// Wed 14 Oct 2026, 12:00 in India.
const NOW = at("2026-10-14 12:00");

describe("day boundaries in a non-UTC time zone", () => {
  test("23:59 IST is still that day, 00:01 IST is the next (UTC would say same day)", () => {
    assert.equal(dayKey(at("2026-10-13 23:59"), IST), "2026-10-13");
    assert.equal(dayKey(at("2026-10-14 00:01"), IST), "2026-10-14");
    // Both instants are on 13 Oct in UTC: the time zone really matters.
    assert.equal(new Date(at("2026-10-14 00:01")).toISOString().slice(0, 10), "2026-10-13");
  });

  test("a session over midnight counts toward the day it STARTED", () => {
    const stats = computeStats([session("2026-10-13 23:50", 30)], NOW, IST);
    assert.equal(stats.focus.today, 0);
    assert.deepEqual(stats.last7.at(-2), { day: "2026-10-13", seconds: 30 * 60 });
  });

  test("a session just after midnight counts today", () => {
    const stats = computeStats([session("2026-10-14 00:05", 20)], NOW, IST);
    assert.equal(stats.focus.today, 20 * 60);
  });

  test("hour-of-day buckets follow local (half-hour offset) time", () => {
    // 09:30–10:30 IST: half an hour in the 9 am bucket, half in the 10 am bucket.
    const stats = computeStats([session("2026-10-14 09:30", 60)], NOW, IST);
    assert.equal(stats.hours[9], 30 * 60);
    assert.equal(stats.hours[10], 30 * 60);
    assert.equal(stats.hours.reduce((a, b) => a + b, 0), 60 * 60);
  });
});

describe("streaks", () => {
  const days = (entries: [string, number][]) => new Map(entries);

  test("today empty but yesterday counts: the streak is still alive", () => {
    const byDay = days([
      ["2026-10-12", 1500],
      ["2026-10-13", 1500],
    ]);
    assert.equal(streaks(byDay, "2026-10-14").current, 2);
  });

  test("studying today extends it", () => {
    const byDay = days([
      ["2026-10-12", 1500],
      ["2026-10-13", 1500],
      ["2026-10-14", 600],
    ]);
    assert.equal(streaks(byDay, "2026-10-14").current, 3);
  });

  test("nothing today or yesterday: streak is 0, but the longest is remembered", () => {
    const byDay = days([
      ["2026-10-01", 1500],
      ["2026-10-02", 1500],
      ["2026-10-03", 1500],
      ["2026-10-12", 1500],
    ]);
    const s = streaks(byDay, "2026-10-14");
    assert.equal(s.current, 0);
    assert.equal(s.longest, 3);
  });

  test("streaks run across a month end", () => {
    const byDay = days([
      ["2026-09-30", 1500],
      ["2026-10-01", 1500],
    ]);
    assert.equal(streaks(byDay, "2026-10-01").current, 2);
  });
});

describe("5-minute study-day rule", () => {
  test("4 min 59 s in a day is not a study day", () => {
    const s = streaks(new Map([["2026-10-13", 299]]), "2026-10-14");
    assert.equal(s.current, 0);
  });

  test("short sessions in one day add up: 3 + 2 minutes is a study day", () => {
    const stats = computeStats(
      [session("2026-10-13 08:00", 3), session("2026-10-13 19:00", 2)],
      NOW,
      IST,
    );
    assert.equal(stats.streak.current, 1);
  });

  test("failed sessions add no focus time and can't make a study day", () => {
    const stats = computeStats(
      [session("2026-10-13 08:00", 30, { outcome: "failed", focus_seconds: 0 })],
      NOW,
      IST,
    );
    assert.equal(stats.streak.current, 0);
    assert.equal(stats.bones, 1);
    assert.equal(stats.focus.allTime, 0);
  });

  test("partial cycles count with their banked minutes", () => {
    const stats = computeStats(
      [session("2026-10-14 08:00", 70, { mode: "cycle", outcome: "partial", focus_seconds: 3000 })],
      NOW,
      IST,
    );
    assert.equal(stats.focus.today, 3000);
    assert.equal(stats.outcomes.partial, 1);
    assert.equal(stats.outcomes.completionRate, 1);
  });
});

describe("weeks start on Monday", () => {
  test("weekday index and start of week", () => {
    assert.equal(weekdayIndex("2026-10-12"), 0); // Monday
    assert.equal(weekdayIndex("2026-10-18"), 6); // Sunday
    assert.equal(startOfWeek("2026-10-14"), "2026-10-12"); // Wed → Mon
    assert.equal(startOfWeek("2026-10-18"), "2026-10-12"); // Sun → previous Mon
    assert.equal(startOfWeek("2026-10-12"), "2026-10-12"); // Mon → itself
  });

  test("on Sunday, this week includes Monday 00:10 but not the Sunday before", () => {
    const sunday = at("2026-10-18 20:00");
    const stats = computeStats(
      [session("2026-10-11 23:50", 30), session("2026-10-12 00:10", 20)],
      sunday,
      IST,
    );
    assert.equal(stats.focus.week, 20 * 60);
  });

  test("the heatmap is 12 Monday-first weeks ending with this week", () => {
    const stats = computeStats([], NOW, IST);
    assert.equal(stats.heatmap.length, 12);
    assert.ok(stats.heatmap.every((week) => week.length === 7));
    assert.equal(weekdayIndex(stats.heatmap[0][0].day), 0);
    const lastWeek = stats.heatmap[11];
    assert.equal(lastWeek[0].day, "2026-10-12");
    assert.equal(lastWeek[2].day, "2026-10-14"); // today, Wednesday
    assert.equal(lastWeek[2].future, false);
    assert.equal(lastWeek[3].future, true); // Thursday hasn't happened yet
  });
});

describe("totals and records", () => {
  const rows = [
    session("2026-10-14 09:00", 25), // today
    session("2026-10-12 09:00", 50, { focus_mode: "open" }), // this week (Mon)
    session("2026-10-02 09:00", 95, { mode: "stopwatch" }), // this month
    session("2026-09-20 09:00", 10, { outcome: "failed", focus_seconds: 0 }),
  ];
  const stats = computeStats(rows, NOW, IST);

  test("today / week / month / all time", () => {
    assert.deepEqual(stats.focus, {
      today: 25 * 60,
      week: 75 * 60,
      month: 170 * 60,
      allTime: 170 * 60,
    });
  });

  test("sessions, records and splits", () => {
    assert.equal(stats.sessions.total, 4);
    assert.equal(stats.sessions.longestSeconds, 95 * 60);
    assert.equal(stats.sessions.averageSeconds, Math.round((170 * 60) / 3));
    assert.deepEqual(stats.bestDay, { day: "2026-10-02", seconds: 95 * 60 });
    assert.deepEqual(stats.focusMode, { deep: 120 * 60, open: 50 * 60 });
    assert.equal(stats.modes.stopwatch.sessions, 1);
    assert.equal(stats.outcomes.completionRate, 3 / 4);
    assert.deepEqual(stats.fish, { small: 0, medium: 1, large: 1, rare: 1 });
  });

  test("last 7 days ends today", () => {
    assert.equal(stats.last7.length, 7);
    assert.equal(stats.last7[6].day, "2026-10-14");
    assert.equal(stats.last7[0].day, addDays("2026-10-14", -6));
  });

  test("duration formatting", () => {
    assert.equal(formatDuration(4800), "1h 20m");
    assert.equal(formatDuration(3600), "1h");
    assert.equal(formatDuration(1500), "25m");
    assert.equal(formatDuration(20), "0m");
  });
});
