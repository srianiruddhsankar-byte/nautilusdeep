"use client";

import { useState } from "react";
import { findTaskByName } from "@/lib/task-views";
import { setTaskDone, useTasks } from "@/lib/tasks";
import { Button } from "../_ui/button";
import { TickMark } from "../_ui/tick";
import { toast } from "../_ui/toast";

// Both match the session's task to the NOT-done task with that name (names are
// unique among open tasks). A task typed just for one session, or one that's
// already done, has no match, so neither shows.

// On the running screen: this session is working on a task from your list.
export function InProgressBadge({ taskName }: { taskName: string }) {
  const { tasks } = useTasks();
  if (!findTaskByName(tasks ?? [], taskName)) return null;
  return <span className="rounded-chip bg-soft px-2.5 py-0.5 text-xs font-semibold text-muted">In progress</span>;
}

// On the result screen: tick the task off without going to the Tasks page.
export function MarkDone({ taskName, onDone }: { taskName: string; onDone: () => void }) {
  const { tasks } = useTasks();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Once it's done it no longer matches (only open tasks do), so remember it here.
  const [doneName, setDoneName] = useState<string | null>(null);
  const task = findTaskByName(tasks ?? [], taskName);

  if (doneName) {
    return (
      <p className="swap-in flex min-h-12 items-center gap-1.5 font-semibold text-success">
        <TickMark animate className="h-4 w-4 shrink-0" />“{doneName}” is done
      </p>
    );
  }
  if (!task) return null;

  async function markDone() {
    setBusy(true);
    const message = await setTaskDone(task!.id, true);
    setBusy(false);
    setError(message);
    if (!message) {
      setDoneName(task!.name);
      toast("Task done. Nice work.");
      onDone();
    }
  }

  return (
    <div className="flex w-full flex-col items-center gap-1">
      <Button variant="outline" onClick={markDone} disabled={busy} className="w-full">
        <span className="truncate">✓ Mark “{task.name}” done</span>
      </Button>
      {error && <p className="text-sm text-danger">{error}</p>}
    </div>
  );
}
