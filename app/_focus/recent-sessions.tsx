"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import {
  getPending,
  getServerPending,
  getSyncStatus,
  subscribePending,
  subscribeSyncStatus,
} from "@/lib/save-queue";
import type { SessionRow } from "@/lib/session-record";
import { createClient } from "@/lib/supabase/client";
import { FOCUS_MODE_LABEL } from "@/lib/timer";

type RecentRow = Pick<
  SessionRow,
  "id" | "started_at" | "mode" | "focus_mode" | "outcome" | "focus_seconds"
>;

const MODE_LABEL = { timer: "Timer", stopwatch: "Stopwatch", cycle: "Cycle" };
const OUTCOME_STYLE = {
  completed: "text-emerald-600",
  partial: "text-amber-600",
  failed: "text-red-600",
};

// A plain check that saving works: the last 10 sessions as stored in Supabase.
export function RecentSessions() {
  const pending = useSyncExternalStore(subscribePending, getPending, getServerPending);
  const sync = useSyncExternalStore(subscribeSyncStatus, getSyncStatus, getSyncStatus);
  const [rows, setRows] = useState<RecentRow[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Reload whenever a save succeeds. RLS means this only ever returns your own rows.
  useEffect(() => {
    let cancelled = false;
    createClient()
      .from("sessions")
      .select("id, started_at, mode, focus_mode, outcome, focus_seconds")
      .order("ended_at", { ascending: false })
      .limit(10)
      .then(({ data, error }) => {
        if (cancelled) return;
        setLoadError(error?.message ?? null);
        if (data) setRows(data as RecentRow[]);
      });
    return () => {
      cancelled = true;
    };
  }, [sync.savedCount]);

  return (
    <section className="flex flex-col gap-2 border-t border-zinc-200 pt-6 text-sm dark:border-zinc-800">
      <h2 className="font-semibold">Recent sessions</h2>

      {pending !== null && pending.length > 0 && (
        <p className="text-amber-600">
          {pending.length} waiting to save{sync.error ? ` (${sync.error})` : "…"}
        </p>
      )}
      {loadError && <p className="text-red-600">Couldn&apos;t load: {loadError}</p>}

      {rows === null && !loadError && <p className="text-zinc-500">Loading…</p>}
      {rows?.length === 0 && <p className="text-zinc-500">No saved sessions yet.</p>}

      <ul className="flex flex-col divide-y divide-zinc-200 dark:divide-zinc-800">
        {rows?.map((r) => (
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
              {MODE_LABEL[r.mode]} · {FOCUS_MODE_LABEL[r.focus_mode]}
            </span>
            <span className={OUTCOME_STYLE[r.outcome]}>{r.outcome}</span>
            <span className="w-12 text-right tabular-nums">
              {Math.floor(r.focus_seconds / 60)} min
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
