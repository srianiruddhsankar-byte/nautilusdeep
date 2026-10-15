"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useSessions } from "@/lib/sessions-data";
import { computeStats, formatDuration } from "@/lib/stats";
import { useClock } from "@/lib/use-clock";

// "Today 1h 20m · 🔥 4-day streak" — tap for the full stats page.
export function StatsLine() {
  const { rows } = useSessions();
  const clock = useClock();
  const stats = useMemo(
    () => (rows && clock ? computeStats(rows, clock.now, clock.timeZone) : null),
    [rows, clock],
  );

  const streak = stats?.streak.current ?? 0;
  return (
    <Link
      href="/stats"
      className="flex h-11 items-center justify-between gap-3 rounded-xl bg-zinc-100 px-4 text-sm hover:bg-zinc-200 dark:bg-zinc-900 dark:hover:bg-zinc-800"
    >
      {stats ? (
        <span>
          Today <span className="font-semibold">{formatDuration(stats.focus.today)}</span>
          <span className="text-zinc-400"> · </span>
          {streak > 0 ? (
            <>
              🔥 <span className="font-semibold">{streak}-day</span> streak
            </>
          ) : (
            <span className="text-zinc-500">No streak yet</span>
          )}
        </span>
      ) : (
        <span className="text-zinc-500">Loading stats…</span>
      )}
      <span className="text-zinc-500">Stats ›</span>
    </Link>
  );
}
