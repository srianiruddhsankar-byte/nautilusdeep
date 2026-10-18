import { earnsFish, leavesBone, speciesOf, type SessionFacts } from "./fish.ts";
import { rarityRank, speciesById, type Rarity, type SpeciesId } from "./species.ts";
import { compareToTarget } from "./notes.ts";
import { taskKey } from "./task-name.ts";
import type { SessionType } from "./timer.ts";
import { focusByTask, focusSpans } from "./session-parts.ts";

// Stats are DERIVED from the sessions table, like the fish. Pure: the clock
// (`now`) and the user's time zone are arguments, so tests can pin both.
//
// Definitions (also in CLAUDE.md):
// - Focus time counts completed and partial sessions only.
// - Days are in the user's local time zone; a session counts toward the day it STARTED.
// - A study day has at least 5 focus minutes of study OR notes (they add up).
// - Current streak = study days in a run that reaches today, or yesterday if today
//   has nothing yet. One missed day per Monday–Sunday week is forgiven (a streak
//   freeze): it keeps the run going but doesn't add a day. Two missed days in a
//   row always break it, even across a week boundary. Longest = best run ever.
// - Weeks start on Monday.
// - Study and Notes get the same stats, computed separately. The streak, the
//   heatmap and the home "Today" line use both together.

export const STUDY_DAY_MIN_SECONDS = 5 * 60;
export const CUSTOM_CYCLE = "Custom";
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

// ---------- Shared pieces ----------

// Completed and partial sessions count; failed ones don't (they have 0 focus anyway).
function counts(row: SessionFacts) {
  return row.outcome !== "failed";
}

// Focus seconds per local day (by the day each session started).
function dailyTotals(rows: SessionFacts[], timeZone: string): Map<DayKey, number> {
  const byDay = new Map<DayKey, number>();
  for (const row of rows) {
    if (!counts(row)) continue;
    const day = dayKey(Date.parse(row.started_at), timeZone);
    byDay.set(day, (byDay.get(day) ?? 0) + row.focus_seconds);
  }
  return byDay;
}

export function splitByType(rows: SessionFacts[]): Record<SessionType, SessionFacts[]> {
  return {
    study: rows.filter((row) => row.session_type === "study"),
    notes: rows.filter((row) => row.session_type === "notes"),
  };
}

// ---------- Overview: study + notes together ----------

export type HeatDay = { day: DayKey; seconds: number; future: boolean; forgiven: boolean };

export type Overview = {
  today: DayKey;
  todaySeconds: number; // study + notes
  streak: { current: number; longest: number }; // days
  heatmap: HeatDay[][]; // 12 weeks (Mon→Sun columns)
};

export function computeOverview(rows: SessionFacts[], now: number, timeZone: string): Overview {
  const today = dayKey(now, timeZone);
  const byDay = dailyTotals(rows, timeZone);
  const { current, longest, forgiven } = streaks(byDay, today);
  const firstHeatDay = addDays(startOfWeek(today), -7 * 11);

  return {
    today,
    todaySeconds: byDay.get(today) ?? 0,
    streak: { current, longest },
    heatmap: Array.from({ length: 12 }, (_, w) =>
      Array.from({ length: 7 }, (_, d) => {
        const day = addDays(firstHeatDay, w * 7 + d);
        return { day, seconds: byDay.get(day) ?? 0, future: day > today, forgiven: forgiven.has(day) };
      }),
    ),
  };
}

// Walks every day from the first study day to today. A missed day inside a run
// is forgiven if the day before it was a study day and its week (Mon–Sun) hasn't
// used its free day yet; otherwise the run breaks. Today never counts as missed
// (it isn't over).
export function streaks(byDay: Map<DayKey, number>, today: DayKey) {
  const isStudyDay = (day: DayKey) => (byDay.get(day) ?? 0) >= STUDY_DAY_MIN_SECONDS;
  const studyDays = [...byDay.keys()].filter(isStudyDay).sort();
  const forgiven = new Set<DayKey>();
  if (studyDays.length === 0) return { current: 0, longest: 0, forgiven };

  const usedWeeks = new Set<DayKey>(); // Mondays of weeks whose free day is spent
  let pending: DayKey[] = []; // a forgiven missed day not yet followed by a study day (at most one)
  let run = 0;
  let longest = 0;

  for (let day = studyDays[0]; day <= today; day = addDays(day, 1)) {
    if (isStudyDay(day)) {
      run++;
      longest = Math.max(longest, run);
      pending.forEach((d) => forgiven.add(d));
      pending = [];
    } else if (day === today) {
      // Today isn't over yet: not a missed day.
    } else if (run > 0 && pending.length === 0 && !usedWeeks.has(startOfWeek(day))) {
      // Yesterday was a study day (nothing pending) and this week's free day is unused.
      usedWeeks.add(startOfWeek(day));
      pending.push(day);
    } else {
      // The run breaks. A free day it was holding saved nothing, so give it back.
      pending.forEach((d) => usedWeeks.delete(startOfWeek(d)));
      pending = [];
      run = 0;
    }
  }
  // A missed yesterday is still holding the current run together.
  pending.forEach((d) => forgiven.add(d));

  return { current: run, longest, forgiven };
}

// ---------- Per session type ----------

export type DayTotal = { day: DayKey; seconds: number };
export type TaskTotal = { name: string; seconds: number; sessions: number };

export type Stats = {
  focus: { today: number; week: number; month: number; allTime: number }; // seconds
  sessions: { total: number; longestSeconds: number; averageSeconds: number };
  outcomes: { completed: number; partial: number; failed: number; completionRate: number | null };
  bones: number;
  focusMode: { deep: number; open: number }; // seconds
  modes: Record<SessionFacts["mode"], { sessions: number; seconds: number }>;
  fish: Record<Rarity, number>; // fish caught per rarity tier
  // Your rarest species (the first one caught, if there's a tie). null = no fish yet.
  rarest: { species: SpeciesId; caughtAt: string } | null;
  bestDay: DayTotal | null;
  hours: number[]; // 24 buckets of focus seconds, by local hour of day
  last7: DayTotal[]; // oldest → today
  tasks: TaskTotal[]; // most time first
  // The cycle started most often (any outcome); unsaved cycles count as "Custom".
  mostUsedCycle: { name: string; sessions: number } | null;
  // Sessions that had a target (notes), completed or partial. null = none yet.
  target: {
    sessions: number;
    averageActualSeconds: number;
    averageTargetSeconds: number;
    onOrUnder: number; // finished within the target
  } | null;
};

// The same numbers for any set of sessions; the caller picks Study or Notes.
export function computeStats(rows: SessionFacts[], now: number, timeZone: string): Stats {
  const today = dayKey(now, timeZone);
  const weekStart = startOfWeek(today);
  const month = today.slice(0, 7);

  const byDay = dailyTotals(rows, timeZone);
  const hours = new Array<number>(24).fill(0);
  const outcomes = { completed: 0, partial: 0, failed: 0 };
  const focusMode = { deep: 0, open: 0 };
  const modes: Stats["modes"] = {
    timer: { sessions: 0, seconds: 0 },
    stopwatch: { sessions: 0, seconds: 0 },
    cycle: { sessions: 0, seconds: 0 },
  };
  const fish: Record<Rarity, number> = { common: 0, uncommon: 0, rare: 0, epic: 0, legendary: 0 };
  let rarest: Stats["rarest"] = null;
  // Keyed case-insensitively; shows the spelling of the most recent session.
  const tasks = new Map<string, TaskTotal & { lastStart: number }>();
  const target = { sessions: 0, actual: 0, target: 0, onOrUnder: 0 };
  const cycles = new Map<string, number>();
  let allTime = 0;
  let countedSessions = 0;
  let longestSeconds = 0;

  for (const row of rows) {
    outcomes[row.outcome]++;
    modes[row.mode].sessions++;
    if (row.mode === "cycle") {
      const name = row.cycle_name ?? CUSTOM_CYCLE;
      cycles.set(name, (cycles.get(name) ?? 0) + 1);
    }
    if (earnsFish(row)) {
      const species = speciesOf(row);
      const rank = rarityRank(speciesById(species).rarity);
      fish[speciesById(species).rarity]++;
      const best = rarest ? rarityRank(speciesById(rarest.species).rarity) : -1;
      if (rank > best || (rank === best && Date.parse(row.ended_at) < Date.parse(rarest!.caughtAt))) {
        rarest = { species, caughtAt: row.ended_at };
      }
    }
    if (!counts(row)) continue;

    const seconds = row.focus_seconds;
    const start = Date.parse(row.started_at);
    allTime += seconds;
    countedSessions++;
    longestSeconds = Math.max(longestSeconds, seconds);
    focusMode[row.focus_mode] += seconds;
    modes[row.mode].seconds += seconds;
    // A continued session's breaks are skipped: only its study blocks fill hours.
    for (const span of focusSpans(row)) spreadOverHours(hours, span.start, span.end, span.seconds, timeZone);

    // A continued session can switch tasks: each gets its own blocks' time.
    for (const part of focusByTask(row)) {
      const key = taskKey(part.name);
      const task = tasks.get(key) ?? { name: part.name, seconds: 0, sessions: 0, lastStart: start };
      task.seconds += part.seconds;
      task.sessions++;
      if (start >= task.lastStart) {
        task.name = part.name;
        task.lastStart = start;
      }
      tasks.set(key, task);
    }

    if (row.target_minutes !== null) {
      target.sessions++;
      target.actual += seconds;
      target.target += row.target_minutes * 60;
      if (compareToTarget(seconds, row.target_minutes).diffMinutes <= 0) target.onOrUnder++;
    }
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

  return {
    focus: { today: byDay.get(today) ?? 0, week, month: monthTotal, allTime },
    sessions: {
      total,
      longestSeconds,
      averageSeconds: countedSessions ? Math.round(allTime / countedSessions) : 0,
    },
    outcomes: {
      ...outcomes,
      // Share of sessions that weren't failed (for study: kept their fish).
      completionRate: total ? (outcomes.completed + outcomes.partial) / total : null,
    },
    bones: rows.filter(leavesBone).length,
    focusMode,
    modes,
    fish,
    rarest,
    bestDay,
    hours,
    last7: Array.from({ length: 7 }, (_, i) => {
      const day = addDays(last7Start, i);
      return { day, seconds: byDay.get(day) ?? 0 };
    }),
    tasks: [...tasks.values()]
      .map(({ name, seconds, sessions }) => ({ name, seconds, sessions }))
      .sort((a, b) => b.seconds - a.seconds || a.name.localeCompare(b.name)),
    mostUsedCycle:
      [...cycles]
        .map(([name, sessions]) => ({ name, sessions }))
        .sort((a, b) => b.sessions - a.sessions || a.name.localeCompare(b.name))[0] ?? null,
    target: target.sessions
      ? {
          sessions: target.sessions,
          averageActualSeconds: Math.round(target.actual / target.sessions),
          averageTargetSeconds: Math.round(target.target / target.sessions),
          onOrUnder: target.onOrUnder,
        }
      : null,
  };
}

// Everything the stats page shows.
export function computeAllStats(rows: SessionFacts[], now: number, timeZone: string) {
  const { study, notes } = splitByType(rows);
  return {
    overview: computeOverview(rows, now, timeZone),
    study: computeStats(study, now, timeZone),
    notes: computeStats(notes, now, timeZone),
  };
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
