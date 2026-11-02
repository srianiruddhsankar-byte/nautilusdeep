import type { SessionFacts } from "./fish.ts";
import { computeOverview, computeStats, formatDuration } from "./stats.ts";

// One or two plain sentences for the top of Stats, from data the app already
// has. Each has a rule for when it's TRUE and KIND: a comparison only when it's
// good news (never "less than last week"), a pattern only with enough data.
// Pure: the clock and time zone are arguments. Study and notes together.

const HOUR_S = 3600;

// The parts of the day, by local starting hour (night wraps past midnight).
const PARTS = [
  { name: "in the mornings", from: 5, to: 12 },
  { name: "in the afternoons", from: 12, to: 17 },
  { name: "in the evenings", from: 17, to: 21 },
  { name: "late at night", from: 21, to: 29 }, // 21:00–05:00
] as const;

export const PATTERN_MIN_SESSIONS = 5;
export const PATTERN_MIN_SECONDS = 2 * HOUR_S;
export const PATTERN_SHARE = 0.4; // one part of the day holds at least this much of your time

export function statSentences(rows: SessionFacts[], now: number, timeZone: string): string[] {
  const sentences: string[] = [];

  // This week (Mon → today) against all of last week.
  const weeks = computeOverview(rows, now, timeZone).heatmap;
  const sum = (week: { seconds: number; future: boolean }[] | undefined) =>
    (week ?? []).reduce((total, d) => total + (d.future ? 0 : d.seconds), 0);
  const thisWeek = sum(weeks.at(-1));
  const lastWeek = sum(weeks.at(-2));
  if (lastWeek > 0 && thisWeek > lastWeek) {
    sentences.push(`More than last week already: ${formatDuration(thisWeek)} vs ${formatDuration(lastWeek)}.`);
  } else if (thisWeek >= 60) {
    sentences.push(`${formatDuration(thisWeek)} so far this week.`);
  }

  // When you focus most, once there's enough to see a pattern.
  const stats = computeStats(rows, now, timeZone);
  const counted = stats.outcomes.completed + stats.outcomes.partial;
  const total = stats.hours.reduce((a, b) => a + b, 0);
  if (counted >= PATTERN_MIN_SESSIONS && total >= PATTERN_MIN_SECONDS) {
    const inPart = (from: number, to: number) => {
      let seconds = 0;
      for (let h = from; h < to; h++) seconds += stats.hours[h % 24];
      return seconds;
    };
    const best = PARTS.map((p) => ({ name: p.name, seconds: inPart(p.from, p.to) })).sort((a, b) => b.seconds - a.seconds)[0];
    if (best.seconds / total >= PATTERN_SHARE) sentences.push(`You focus most ${best.name}.`);
  }

  return sentences;
}
