"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useSessions } from "@/lib/sessions-data";
import { computeOverview, formatDuration } from "@/lib/stats";
import { useClock } from "@/lib/use-clock";
import { useLoadFade } from "../_ui/motion";

// "Today 1h 20m · 4-day streak" (study + notes) — tap for the full stats page.
export function StatsLine() {
  const { rows } = useSessions();
  const clock = useClock();
  const stats = useMemo(
    () => (rows && clock ? computeOverview(rows, clock.now, clock.timeZone) : null),
    [rows, clock],
  );

  const streak = stats?.streak.current ?? 0;
  const fade = useLoadFade(stats !== null);
  return (
    <Link
      href="/stats"
      className="flex min-h-12 items-center justify-between gap-3 rounded-control bg-soft px-4 text-sm transition-colors duration-(--dur-fast) hover:bg-line"
    >
      {stats ? (
        <span className={`flex flex-wrap items-center gap-x-3 gap-y-1 ${fade}`}>
          <span>
            Today <b className="font-semibold tabular-nums">{formatDuration(stats.todaySeconds)}</b>
          </span>
          {streak > 0 ? (
            <span className="inline-flex items-center gap-1">
              <FlameIcon />
              <b className="font-semibold">{streak}-day</b> streak
            </span>
          ) : (
            <span className="text-muted">No streak yet</span>
          )}
        </span>
      ) : (
        <span className="text-muted">Loading stats…</span>
      )}
      <span className="shrink-0 font-semibold text-primary">Stats ›</span>
    </Link>
  );
}

// The accent colour is for this icon only: as text it would be too faint to read.
// Also on the result screen, when a session grows the streak.
export function FlameIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={`h-4 w-4 text-accent ${className}`}
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M12 3c1 3.5 5 5.5 5 10a5 5 0 0 1-10 0c0-2 1-3.5 2-4.5.3 1.5 1 2.5 2 2.5-1-3 0-6 1-8z" />
    </svg>
  );
}
