"use client";

import { useSessions } from "@/lib/sessions-data";
import { FOCUS_MODE_LABEL } from "@/lib/timer";

const MODE_LABEL = { timer: "Timer", stopwatch: "Stopwatch", cycle: "Cycle" };
const OUTCOME_STYLE = {
  completed: "text-emerald-600",
  partial: "text-amber-600",
  failed: "text-red-600",
};

// A plain check that saving works: the last 10 sessions. Collapsed by default;
// it shares its data with the tank (one load for both).
export function RecentSessions() {
  const { rows, error, pendingIds, syncError } = useSessions();
  const recent = rows
    ? [...rows].sort((a, b) => Date.parse(b.ended_at) - Date.parse(a.ended_at)).slice(0, 10)
    : null;

  return (
    <details className="border-t border-zinc-200 pt-4 text-sm dark:border-zinc-800">
      <summary className="cursor-pointer font-semibold text-zinc-500">
        Recent sessions
        {pendingIds.size > 0 && (
          <span className="ml-2 font-normal text-amber-600">({pendingIds.size} waiting to save)</span>
        )}
      </summary>

      <div className="flex flex-col gap-2 pt-2">
        {pendingIds.size > 0 && syncError && <p className="text-amber-600">{syncError}</p>}
        {error && <p className="text-red-600">Couldn&apos;t load: {error}</p>}
        {recent === null && !error && <p className="text-zinc-500">Loading…</p>}
        {recent?.length === 0 && <p className="text-zinc-500">No saved sessions yet.</p>}

        <ul className="flex flex-col divide-y divide-zinc-200 dark:divide-zinc-800">
          {recent?.map((r) => (
            <li key={r.id} className="flex items-center justify-between gap-2 py-2">
              <span className="text-zinc-500">
                {new Date(r.started_at).toLocaleString(undefined, {
                  month: "short",
                  day: "numeric",
                  hour: "numeric",
                  minute: "2-digit",
                })}
              </span>
              <span className="flex-1 truncate">
                {r.task_name ? `${r.task_name} · ` : ""}
                {r.session_type === "notes" ? "Notes · " : ""}
                {MODE_LABEL[r.mode]} · {FOCUS_MODE_LABEL[r.focus_mode]}
                {pendingIds.has(r.id) && <span className="text-amber-600"> · saving…</span>}
              </span>
              <span className={OUTCOME_STYLE[r.outcome]}>{r.outcome}</span>
              <span className="w-12 text-right tabular-nums">
                {Math.floor(r.focus_seconds / 60)} min
              </span>
            </li>
          ))}
        </ul>
      </div>
    </details>
  );
}
