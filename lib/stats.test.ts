import { describe, test } from "node:test";
import assert from "node:assert/strict";
import type { SessionFacts } from "./fish.ts";
import { compareToTarget } from "./notes.ts";
import {
  addDays,
  computeAllStats,
  computeOverview,
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
    session_type: "study",
    task_name: null,
    target_minutes: null,
    cycle_name: null,
    ...overrides,
  };
}

const notes = (startWall: string, minutes: number, overrides: Partial<SessionFacts> = {}) =>
  session(startWall, minutes, { session_type: "notes", ...overrides });

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

  test("a gap too long for the freezes: streak is 0, but the longest is remembered", () => {
    // After Sat 10 Oct: Sun 11 is forgiven, Mon 12 is a second miss in a row and breaks it.
    const byDay = days([
      ["2026-10-01", 1500],
      ["2026-10-02", 1500],
      ["2026-10-03", 1500],
      ["2026-10-10", 1500],
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
    const overview = computeOverview(
      [session("2026-10-13 08:00", 3), session("2026-10-13 19:00", 2)],
      NOW,
      IST,
    );
    assert.equal(overview.streak.current, 1);
  });

  test("failed sessions add no focus time and can't make a study day", () => {
    const rows = [session("2026-10-13 08:00", 30, { outcome: "failed", focus_seconds: 0 })];
    const stats = computeStats(rows, NOW, IST);
    assert.equal(computeOverview(rows, NOW, IST).streak.current, 0);
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
    const stats = computeOverview([], NOW, IST);
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

describe("streak freeze: one missed day per Mon–Sun week is forgiven", () => {
  const study = (...dayKeys: string[]) => new Map(dayKeys.map((d) => [d, 1500]));

  test("one missed day keeps the streak, and doesn't add a day", () => {
    // Mon ✓, Tue missed, Wed ✓, Thu ✓ (today)
    const s = streaks(study("2026-10-12", "2026-10-14", "2026-10-15"), "2026-10-15");
    assert.equal(s.current, 3);
    assert.deepEqual([...s.forgiven], ["2026-10-13"]);
  });

  test("two missed days in the same week break it", () => {
    // Mon ✓, Tue missed, Wed missed, Thu ✓ (today)
    const s = streaks(study("2026-10-12", "2026-10-15"), "2026-10-15");
    assert.equal(s.current, 1);
    assert.equal(s.longest, 1);
    assert.equal(s.forgiven.size, 0); // Tue didn't save anything, so it isn't shown as forgiven
  });

  test("a missed day in each of two weeks: both forgiven", () => {
    // Thu 8 ✓, Fri 9 missed, Sat 10 ✓, Sun 11 ✓ | Mon 12 ✓, Tue 13 missed, Wed 14 ✓
    const s = streaks(
      study("2026-10-08", "2026-10-10", "2026-10-11", "2026-10-12", "2026-10-14"),
      "2026-10-14",
    );
    assert.equal(s.current, 5);
    assert.deepEqual([...s.forgiven].sort(), ["2026-10-09", "2026-10-13"]);
  });

  test("two missed days in a row break it, even across a week boundary", () => {
    // Fri 9 ✓, Sat 10 ✓, Sun 11 missed (week of 5 Oct), Mon 12 missed (week of 12 Oct), Tue 13 ✓
    const s = streaks(study("2026-10-09", "2026-10-10", "2026-10-13"), "2026-10-13");
    assert.equal(s.current, 1);
    assert.equal(s.longest, 2);
    assert.equal(s.forgiven.size, 0);
  });

  test("a missed day just before and just after a week boundary, with a study day between: both forgiven", () => {
    // Sat 10 ✓, Sun 11 missed (week of 5 Oct), Mon 12 ✓, Tue 13 missed (week of 12 Oct), Wed 14 ✓
    const s = streaks(study("2026-10-10", "2026-10-12", "2026-10-14"), "2026-10-14");
    assert.equal(s.current, 3);
    assert.deepEqual([...s.forgiven].sort(), ["2026-10-11", "2026-10-13"]);
  });

  test("the two days before today both missed: the streak is over", () => {
    // Sat 10 ✓, Sun 11 missed, Mon 12 missed, Tue 13 (today) nothing yet
    const s = streaks(study("2026-10-09", "2026-10-10"), "2026-10-13");
    assert.equal(s.current, 0);
    assert.equal(s.longest, 2);
  });

  test("once a week's free day is used, the next miss that week breaks it", () => {
    // Sun 11 ✓ | Mon 12 missed (free), Tue 13 ✓, Wed 14 ✓, Thu 15 missed (breaks), Fri 16 ✓
    const s = streaks(
      study("2026-10-11", "2026-10-13", "2026-10-14", "2026-10-16"),
      "2026-10-16",
    );
    assert.equal(s.current, 1);
    assert.equal(s.longest, 3);
  });

  test("yesterday missed: the streak is still alive today", () => {
    // Mon ✓, Tue ✓, Wed missed, Thu (today) nothing yet
    const s = streaks(study("2026-10-12", "2026-10-13"), "2026-10-15");
    assert.equal(s.current, 2);
    assert.deepEqual([...s.forgiven], ["2026-10-14"]);
  });

  test("longest streak follows the same rule", () => {
    // Mon 7 Sep ✓, Tue 8 missed (free), Wed 9 ✓, Thu 10 ✓, then nothing for weeks
    const s = streaks(study("2026-09-07", "2026-09-09", "2026-09-10"), "2026-10-14");
    assert.equal(s.current, 0);
    assert.equal(s.longest, 3);
  });

  test("the heatmap marks forgiven days", () => {
    const overview = computeOverview(
      [session("2026-10-12 09:00", 25), session("2026-10-14 09:00", 25)],
      NOW,
      IST,
    );
    const thisWeek = overview.heatmap[11];
    assert.equal(thisWeek[1].day, "2026-10-13");
    assert.equal(thisWeek[1].forgiven, true);
    assert.equal(thisWeek[0].forgiven, false);
    assert.equal(overview.streak.current, 2);
  });
});

describe("study and notes", () => {
  test("notes days count toward the streak, and study + notes add up", () => {
    const overview = computeOverview(
      [
        session("2026-10-12 09:00", 25), // Mon: study
        notes("2026-10-13 09:00", 30), // Tue: notes only
        session("2026-10-14 08:00", 3), // Wed: 3 min study…
        notes("2026-10-14 10:00", 2), // …+ 2 min notes = a 5-minute day
      ],
      NOW,
      IST,
    );
    assert.equal(overview.streak.current, 3);
    assert.equal(overview.todaySeconds, 5 * 60);
  });

  test("stats are split by type", () => {
    const { overview, study, notes: n } = computeAllStats(
      [
        session("2026-10-14 08:00", 30),
        session("2026-10-13 08:00", 10, { outcome: "failed", focus_seconds: 0 }),
        notes("2026-10-14 10:00", 45),
        notes("2026-10-13 10:00", 20, { outcome: "failed", focus_seconds: 0 }),
      ],
      NOW,
      IST,
    );
    assert.equal(study.focus.today, 30 * 60);
    assert.equal(n.focus.today, 45 * 60);
    assert.equal(overview.todaySeconds, 75 * 60);
    assert.equal(study.sessions.total, 2);
    assert.equal(n.sessions.total, 2);
    assert.equal(study.bones, 1);
    assert.equal(n.bones, 0); // a failed notes session loses no fish
    assert.deepEqual(n.fish, { small: 0, medium: 0, large: 0, rare: 0 });
    assert.equal(study.fish.medium, 1);
  });

  test("time per task: grouped ignoring case, most time first, failed and untasked left out", () => {
    const stats = computeStats(
      [
        session("2026-10-12 09:00", 30, { task_name: "biochem ch. 4" }),
        session("2026-10-13 09:00", 25, { task_name: "Biochem ch. 4" }),
        session("2026-10-13 15:00", 40, { task_name: "Physics" }),
        session("2026-10-14 09:00", 20, { task_name: "Physics", outcome: "failed", focus_seconds: 0 }),
        session("2026-10-14 10:00", 60),
      ],
      NOW,
      IST,
    );
    assert.deepEqual(stats.tasks, [
      { name: "Biochem ch. 4", seconds: 55 * 60, sessions: 2 }, // latest spelling
      { name: "Physics", seconds: 40 * 60, sessions: 1 },
    ]);
  });

  test("average time vs target (notes)", () => {
    const stats = computeStats(
      [
        notes("2026-10-12 09:00", 52, { mode: "stopwatch", target_minutes: 45 }),
        notes("2026-10-13 09:00", 25, { mode: "stopwatch", target_minutes: 30 }),
        notes("2026-10-13 15:00", 40, { mode: "stopwatch" }), // no target
        notes("2026-10-14 09:00", 10, { mode: "stopwatch", target_minutes: 20, outcome: "failed", focus_seconds: 0 }),
      ],
      NOW,
      IST,
    );
    assert.deepEqual(stats.target, {
      sessions: 2,
      averageActualSeconds: Math.round(((52 + 25) * 60) / 2),
      averageTargetSeconds: Math.round(((45 + 30) * 60) / 2),
      onOrUnder: 1,
    });
  });

  test("no targets yet → null", () => {
    assert.equal(computeStats([notes("2026-10-14 09:00", 30)], NOW, IST).target, null);
  });
});

describe("most-used cycle", () => {
  test("counts cycle sessions by name (any outcome); unsaved ones are Custom", () => {
    const cycle = (name: string | null, overrides: Partial<SessionFacts> = {}) =>
      session("2026-10-13 09:00", 50, { mode: "cycle", cycle_name: name, ...overrides });
    const stats = computeStats(
      [
        cycle("Pomodoro"),
        cycle("Pomodoro", { outcome: "failed", focus_seconds: 0 }),
        cycle("Exam prep"),
        cycle(null),
        session("2026-10-13 15:00", 25), // a timer: not a cycle
      ],
      NOW,
      IST,
    );
    assert.deepEqual(stats.mostUsedCycle, { name: "Pomodoro", sessions: 2 });
  });

  test("no cycles yet → null", () => {
    assert.equal(computeStats([session("2026-10-13 09:00", 25)], NOW, IST).mostUsedCycle, null);
  });

  test("old cycle sessions without a name count as Custom", () => {
    const stats = computeStats([session("2026-10-13 09:00", 50, { mode: "cycle" })], NOW, IST);
    assert.deepEqual(stats.mostUsedCycle, { name: "Custom", sessions: 1 });
  });
});

describe("target vs actual", () => {
  test("over", () => {
    assert.equal(compareToTarget(52 * 60, 45).text, "Took 52 min — 7 min over target");
  });
  test("under", () => {
    assert.deepEqual(compareToTarget(38 * 60 + 30, 45), {
      actualMinutes: 38,
      diffMinutes: -7,
      text: "Took 38 min — 7 min under target",
    });
  });
  test("45 min 59 s against 45 is right on target (minutes round down)", () => {
    assert.equal(compareToTarget(45 * 60 + 59, 45).text, "Took 45 min — right on target");
  });
});
