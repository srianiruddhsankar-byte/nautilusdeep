"use client";

import { useState, type FormEvent } from "react";
import { TASK_NAME_MAX } from "@/lib/task-name";
import { addTask, deleteTask, setTaskDone, useTasks, type Task } from "@/lib/tasks";

// Add, tick off and delete tasks. Deleting a task never touches your sessions:
// they keep the task's name, so its time stays in your stats.
export function TaskList() {
  const { tasks, error: loadError } = useTasks();
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run(action: () => Promise<string | null>) {
    setBusy(true);
    const message = await action();
    setBusy(false);
    setError(message);
    return message === null;
  }

  async function add(e: FormEvent) {
    e.preventDefault();
    if (await run(() => addTask(name))) setName("");
  }

  const open = (tasks ?? []).filter((t) => t.done_at === null);
  const done = (tasks ?? []).filter((t) => t.done_at !== null);

  return (
    <div className="flex flex-col gap-4">
      <form onSubmit={add} className="flex gap-2">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={TASK_NAME_MAX}
          placeholder="New task, e.g. Biochem ch. 4"
          aria-label="New task name"
          enterKeyHint="done"
          className="min-w-0 flex-1 rounded-lg border border-zinc-300 bg-transparent px-3 py-3 text-lg dark:border-zinc-700"
        />
        <button
          type="submit"
          disabled={busy || name.trim() === ""}
          className="rounded-lg bg-sky-700 px-5 font-semibold text-white hover:bg-sky-800 disabled:opacity-40"
        >
          Add
        </button>
      </form>

      {(error ?? loadError) && <p className="text-sm text-red-600">{error ?? loadError}</p>}
      {tasks === null && !loadError && <p className="text-zinc-500">Loading…</p>}
      {tasks !== null && open.length === 0 && (
        <p className="text-zinc-500">Nothing to do. Add a task above, then pick it before you start a session.</p>
      )}

      <ul className="flex flex-col divide-y divide-zinc-200 dark:divide-zinc-800">
        {open.map((t) => (
          <TaskRow key={t.id} task={t} busy={busy} run={run} />
        ))}
      </ul>

      {done.length > 0 && (
        <details className="border-t border-zinc-200 pt-4 dark:border-zinc-800">
          <summary className="cursor-pointer text-sm font-semibold text-zinc-500">
            Done ({done.length})
          </summary>
          <ul className="flex flex-col divide-y divide-zinc-200 dark:divide-zinc-800">
            {done.map((t) => (
              <TaskRow key={t.id} task={t} busy={busy} run={run} />
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}

function TaskRow({
  task,
  busy,
  run,
}: {
  task: Task;
  busy: boolean;
  run: (action: () => Promise<string | null>) => Promise<boolean>;
}) {
  const done = task.done_at !== null;
  return (
    <li className="flex items-center gap-3 py-2">
      <input
        type="checkbox"
        checked={done}
        disabled={busy}
        onChange={() => run(() => setTaskDone(task.id, !done))}
        aria-label={done ? `Mark "${task.name}" as not done` : `Mark "${task.name}" as done`}
        className="h-6 w-6 shrink-0 accent-sky-700"
      />
      <span className={`flex-1 break-words ${done ? "text-zinc-500 line-through" : ""}`}>{task.name}</span>
      <button
        type="button"
        disabled={busy}
        onClick={() => run(() => deleteTask(task.id))}
        aria-label={`Delete "${task.name}"`}
        className="h-11 w-11 shrink-0 rounded-lg text-xl text-zinc-500 hover:bg-zinc-100 disabled:opacity-40 dark:hover:bg-zinc-900"
      >
        ×
      </button>
    </li>
  );
}
