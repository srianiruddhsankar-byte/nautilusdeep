"use client";

import { useState } from "react";
import { findTaskByName } from "@/lib/task-views";
import { setTaskDone, useTasks } from "@/lib/tasks";

// Both match the session's task to the NOT-done task with that name (names are
// unique among open tasks). A task typed just for one session, or one that's
// already done, has no match, so neither shows.

// On the running screen: this session is working on a task from your list.
export function InProgressBadge({ taskName }: { taskName: string }) {
  const { tasks } = useTasks();
  if (!findTaskByName(tasks ?? [], taskName)) return null;
  return (
    <span className="rounded-full bg-sky-100 px-2.5 py-0.5 text-xs font-medium text-sky-800 dark:bg-sky-950 dark:text-sky-300">
      In progress
    </span>
  );
}

// On the result screen: tick the task off without going to the Tasks page.
export function MarkDone({ taskName, onDone }: { taskName: string; onDone: () => void }) {
  const { tasks } = useTasks();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Once it's done it no longer matches (only open tasks do), so remember it here.
  const [doneName, setDoneName] = useState<string | null>(null);
  const task = findTaskByName(tasks ?? [], taskName);

  if (doneName) return <p className="font-medium text-emerald-600">✓ “{doneName}” is done</p>;
  if (!task) return null;

  async function markDone() {
    setBusy(true);
    const message = await setTaskDone(task!.id, true);
    setBusy(false);
    setError(message);
    if (!message) {
      setDoneName(task!.name);
      onDone();
    }
  }

  return (
    <div className="flex w-full flex-col items-center gap-1">
      <button
        type="button"
        onClick={markDone}
        disabled={busy}
        className="w-full truncate rounded-2xl border-2 border-emerald-600 px-4 py-4 text-lg font-semibold text-emerald-700 hover:bg-emerald-50 disabled:opacity-40 dark:text-emerald-400 dark:hover:bg-emerald-950"
      >
        ✓ Mark “{task.name}” done
      </button>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
