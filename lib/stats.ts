import { earnsFish, fishSizeFor, focusMinutes, type FishSize, type SessionFacts } from "./fish.ts";

// Stats are DERIVED from the sessions table, like the fish. Pure: the clock
// (`now`) and the user's time zone are arguments, so tests can pin both.
//
// Definitions (also in CLAUDE.md):
// - Focus time counts completed and partial sessions only.
// - Days are in the user's local time zone; a session counts toward the day it STARTED.
// - A study day has at least 5 focus minutes.
// - Current streak = consecutive study days ending today, or yesterday if today
//   has nothing yet. Longest streak = best run ever.
// - Weeks start on Monday.

export const STUDY_DAY_MIN_SECONDS = 5 * 60;
const HOUR_MS = 3_600_000;
const DAY_MS = 86_400_000;

// ---------- Calendar helpers ----------

// A calendar day in the user's time zone, "YYYY-MM-DD". Sorting these strings
// sorts them by date.
export type DayKey = string;

const formatters = new Map<string, Intl.DateTimeFormat>();
function formatterFor(timeZone: string) {
  let f = formatters.get(timeZone);
  if (!f) {
    f = new Intl.DateTimeFormat("en-CA", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hourCycle: "h23",
    });
    formatters.set(timeZone, f);
  }
  return f;
}

// The wall-clock date and hour at `ms` in `timeZone`, and that zone's UTC offset then.
export function localParts(ms: number, timeZone: string) {
  const parts: Record<string, number> = {};
  for (const p of formatterFor(timeZone).formatToParts(ms)) {
    if (p.type !== "literal") parts[p.type] = Number(p.value);
  }
  const wallAsUtc = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second);
  const day = `${parts.year}-${String(parts.month).padStart(2, "0")}-${String(parts.day).padStart(2, "0")}`;
  return { day, hour: parts.hour, offsetMs: wallAsUtc - Math.floor(ms / 1000) * 1000 };
}

export function dayKey(ms: number, timeZone: string): DayKey {
  return localParts(ms, timeZone).day;
}

// Date maths on the "YYYY-MM-DD" itself, in UTC, so no time zone or DST shifts.
function keyToUtc(key: DayKey) {
  const [y, m, d] = key.split("-").map(Number);
  return Date.UTC(y, m - 1, d);
}

export function addDays(key: DayKey, days: number): DayKey {
  return new Date(keyToUtc(key) + days * DAY_MS).toISOString().slice(0, 10);
}

// 0 = Monday … 6 = Sunday.
export function weekdayIndex(key: DayKey): number {
  return (new Date(keyToUtc(key)).getUTCDay() + 6) % 7;
}

export function startOfWeek(key: DayKey): DayKey {
  return addDays(key, -weekdayIndex(key));
}

// ---------- The stats ----------

export type DayTotal = { day: DayKey; seconds: number };

export type Stats = {
  today: DayKey;
  focus: { today: number; week: number; month: number; allTime: number }; // seconds
  streak: { current: number; longest: number }; // days
  sessions: { total: number; longestSeconds: number; averageSeconds: number };
  outcomes: { completed: number; partial: number; failed: number; completionRate: number | null };
  bones: number;
  focusMode: { deep: number; open: number }; // seconds
  modes: Record<SessionFacts["mode"], { sessions: number; seconds: number }>;
  fish: Record<FishSize, number>;
  bestDay: DayTotal | null;
  hours: number[]; // 24 buckets of focus seconds, by local hour of day
  last7: DayTotal[]; // oldest → today
  heatmap: { day: DayKey; seconds: number; future: boolean }[][]; // 12 weeks (Mon→Sun columns)
};

// Completed and partial sessions count; failed ones don't (they have 0 focus anyway).
function counts(row: SessionFacts) {
  return row.outcome !== "failed";
}

export function computeStats(rows: SessionFacts[], now: number, timeZone: string): Stats {
  const today = dayKey(now, timeZone);
  const weekStart = startOfWeek(today);
  const month = today.slice(0, 7);

  const byDay = new Map<DayKey, number>();
  const hours = new Array<number>(24).fill(0);
  const outcomes = { completed: 0, partial: 0, failed: 0 };
  const focusMode = { deep: 0, open: 0 };
  const modes: Stats["modes"] = {
    timer: { sessions: 0, seconds: 0 },
    stopwatch: { sessions: 0, seconds: 0 },
    cycle: { sessions: 0, seconds: 0 },
  };
  const fish: Record<FishSize, number> = { small: 0, medium: 0, large: 0, rare: 0 };
  let allTime = 0;
  let countedSessions = 0;
  let longestSeconds = 0;

  for (const row of rows) {
    outcomes[row.outcome]++;
    modes[row.mode].sessions++;
    if (earnsFish(row)) fish[fishSizeFor(focusMinutes(row))]++;
    if (!counts(row)) continue;

    const seconds = row.focus_seconds;
    const start = Date.parse(row.started_at);
    const day = dayKey(start, timeZone);
    byDay.set(day, (byDay.get(day) ?? 0) + seconds);
    allTime += seconds;
    countedSessions++;
    longestSeconds = Math.max(longestSeconds, seconds);
    focusMode[row.focus_mode] += seconds;
    modes[row.mode].seconds += seconds;
    spreadOverHours(hours, start, Date.parse(row.ended_at), seconds, timeZone);
  }

  let week = 0;
  let monthTotal = 0;
  let bestDay: DayTotal | null = null;
  for (const [day, seconds] of byDay) {
    if (day >= weekStart && day <= today) week += seconds;
    if (day.slice(0, 7) === month) monthTotal += seconds;
    if (!bestDay || seconds > bestDay.seconds) bestDay = { day, seconds };
  }

  const total = rows.length;
  const last7Start = addDays(today, -6);
  const firstHeatDay = addDays(weekStart, -7 * 11);

  return {
    today,
    focus: { today: byDay.get(today) ?? 0, week, month: monthTotal, allTime },
    streak: streaks(byDay, today),
    sessions: {
      total,
      longestSeconds,
      averageSeconds: countedSessions ? Math.round(allTime / countedSessions) : 0,
    },
    outcomes: {
      ...outcomes,
      // Share of sessions that kept their fish (completed or partial).
      completionRate: total ? (outcomes.completed + outcomes.partial) / total : null,
    },
    bones: outcomes.failed,
    focusMode,
    modes,
    fish,
    bestDay,
    hours,
    last7: Array.from({ length: 7 }, (_, i) => {
      const day = addDays(last7Start, i);
      return { day, seconds: byDay.get(day) ?? 0 };
    }),
    heatmap: Array.from({ length: 12 }, (_, w) =>
      Array.from({ length: 7 }, (_, d) => {
        const day = addDays(firstHeatDay, w * 7 + d);
        return { day, seconds: byDay.get(day) ?? 0, future: day > today };
      }),
    ),
  };
}

export function streaks(byDay: Map<DayKey, number>, today: DayKey) {
  const studyDays = new Set(
    [...byDay].filter(([, seconds]) => seconds >= STUDY_DAY_MIN_SECONDS).map(([day]) => day),
  );

  // Today isn't over: if it has nothing yet, the streak can still end yesterday.
  let cursor = studyDays.has(today) ? today : addDays(today, -1);
  let current = 0;
  while (studyDays.has(cursor)) {
    current++;
    cursor = addDays(cursor, -1);
  }

  let longest = 0;
  let run = 0;
  let previous: DayKey | null = null;
  for (const day of [...studyDays].sort()) {
    run = previous !== null && addDays(previous, 1) === day ? run + 1 : 1;
    longest = Math.max(longest, run);
    previous = day;
  }

  return { current, longest };
}

// Spreads a session's focus seconds evenly over the wall-clock hours it ran in,
// so a long session isn't all counted in the hour it started. Uses the zone's
// offset at the start (a DST change mid-session is ignored).
function spreadOverHours(
  hours: number[],
  startMs: number,
  endMs: number,
  seconds: number,
  timeZone: string,
) {
  if (seconds <= 0) return;
  const { hour, offsetMs } = localParts(startMs, timeZone);
  const span = endMs - startMs;
  if (span <= 0) {
    hours[hour] += seconds;
    return;
  }
  let t = startMs;
  while (t < endMs) {
    const localHour = Math.floor((t + offsetMs) / HOUR_MS);
    const sliceEnd = Math.min(endMs, (localHour + 1) * HOUR_MS - offsetMs);
    hours[((localHour % 24) + 24) % 24] += (seconds * (sliceEnd - t)) / span;
    t = sliceEnd;
  }
}

// ---------- Display helpers ----------

// 4800 → "1h 20m", 3600 → "1h", 1500 → "25m", 20 → "0m".
export function formatDuration(seconds: number): string {
  const totalMinutes = Math.floor(seconds / 60);
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  if (h === 0) return `${m}m`;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

// "Tue 13 Oct" (or with the year). The key is already a local date, so format it in UTC.
export function formatDay(key: DayKey, withYear = false): string {
  return new Date(keyToUtc(key)).toLocaleDateString(undefined, {
    timeZone: "UTC",
    weekday: "short",
    day: "numeric",
    month: "short",
    ...(withYear ? { year: "numeric" } : {}),
  });
}

// 0 → "12 am", 9 → "9 am", 13 → "1 pm".
export function formatHour(hour: number): string {
  const h = hour % 12 === 0 ? 12 : hour % 12;
  return `${h} ${hour < 12 ? "am" : "pm"}`;
}
