"use client";

import { describeParts, readParts } from "@/lib/session-parts";
import { useSessions } from "@/lib/sessions-data";
import { FOCUS_MODE_LABEL } from "@/lib/timer";

const MODE_LABEL = { timer: "Timer", stopwatch: "Stopwatch", cycle: "Cycle" };
// The word says what happened; colour only softens it (never red).
const OUTCOME_STYLE = {
  completed: "text-success",
  partial: "text-ink",
  failed: "text-muted",
};

// A plain check that saving works: the last 10 sessions. Collapsed by default;
// it shares its data with the tank (one load for both).
export function RecentSessions() {
  const { rows, error, pendingIds, syncError } = useSessions();
  const recent = rows
    ? [...rows].sort((a, b) => Date.parse(b.ended_at) - Date.parse(a.ended_at)).slice(0, 10)
    : null;

  return (
    <details className="disclosure group text-sm">
      <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 font-semibold text-muted [&::-webkit-details-marker]:hidden">
        <span aria-hidden className="transition-transform duration-(--dur) ease-snap group-open:rotate-90">
          ›
        </span>
        Recent sessions
        {pendingIds.size > 0 && <span className="font-normal text-warn">({pendingIds.size} waiting to save)</span>}
      </summary>

      <div className="flex flex-col gap-2 pt-1">
        {pendingIds.size > 0 && syncError && <p className="text-warn">{syncError}</p>}
        {error && <p className="text-danger">Couldn&apos;t load: {error}</p>}
        {recent === null && !error && <p className="text-muted">Loading…</p>}
        {recent?.length === 0 && <p className="text-muted">No saved sessions yet.</p>}

        <ul className="flex flex-col divide-y divide-line">
          {recent?.map((r) => {
            // a continued session (or a cycle): one row, with its parts underneath
            const parts = readParts(r.parts);
            return (
            <li key={r.id} className="flex flex-wrap items-center justify-between gap-x-2 py-2">
              <span className="text-muted">
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
                {r.cycle_name ?? MODE_LABEL[r.mode]} · {FOCUS_MODE_LABEL[r.focus_mode]}
                {pendingIds.has(r.id) && <span className="text-warn"> · saving…</span>}
              </span>
              <span className={OUTCOME_STYLE[r.outcome]}>{r.outcome}</span>
              <span className="w-12 text-right tabular-nums">{Math.floor(r.focus_seconds / 60)} min</span>
              {parts && parts.length > 1 && (
                <span className="w-full text-muted">{describeParts(parts, r.session_type === "notes" ? "notes" : "study")}</span>
              )}
            </li>
            );
          })}
        </ul>
      </div>
    </details>
  );
}
