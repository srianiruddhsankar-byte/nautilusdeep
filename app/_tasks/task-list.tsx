"use client";

import { useMemo, useState, useSyncExternalStore, type FormEvent } from "react";
import { getServerSnapshot, getSnapshot, subscribe } from "@/lib/focus-storage";
import { useSessions } from "@/lib/sessions-data";
import { dayKey, formatDay, formatDuration } from "@/lib/stats";
import { TASK_NAME_MAX } from "@/lib/task-name";
import { doneHistory, dueLabel, groupTasks, isInProgress, type Task } from "@/lib/task-views";
import { addTask, deleteTask, setTaskDone, setTaskDue, useTasks } from "@/lib/tasks";
import { useClock } from "@/lib/use-clock";

type Run = (action: () => Promise<string | null>) => Promise<boolean>;

// The task list: add (with an optional due date), group by when it's due, tick
// off, and look back at what's done. Deleting a task never touches sessions:
// they keep the task's name, so its time stays in your stats.
export function TaskList() {
  const { tasks, error: loadError } = useTasks();
  const { rows } = useSessions();
  const clock = useClock();
  const saved = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const running = saved?.session ?? null;

  const [view, setView] = useState<"todo" | "done">("todo");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run: Run = async (action) => {
    setBusy(true);
    const message = await action();
    setBusy(false);
    setError(message);
    return message === null;
  };

  const groups = useMemo(
    () => (tasks && clock ? groupTasks(tasks, clock.now, clock.timeZone) : null),
    [tasks, clock],
  );
  const history = useMemo(() => (tasks && rows ? doneHistory(tasks, rows) : null), [tasks, rows]);
  const today = clock ? dayKey(clock.now, clock.timeZone) : null;

  return (
    <div className="flex flex-col gap-4">
      <AddForm busy={busy} run={run} />
      {(error ?? loadError) && <p className="text-sm text-red-600">{error ?? loadError}</p>}

      <div className="grid grid-cols-2 gap-1 rounded-xl bg-zinc-100 p-1 dark:bg-zinc-900">
        {(["todo", "done"] as const).map((v) => (
          <button
            key={v}
            onClick={() => setView(v)}
            aria-pressed={view === v}
            className={`rounded-lg py-2.5 font-medium ${view === v ? "bg-white shadow dark:bg-zinc-700" : "text-zinc-500"}`}
          >
            {v === "todo" ? "To do" : `Done${groups ? ` (${groups.done.length})` : ""}`}
          </button>
        ))}
      </div>

      {!groups || !today ? (
        !loadError && <p className="text-zinc-500">Loading…</p>
      ) : view === "todo" ? (
        <TodoView groups={groups} today={today} running={running} busy={busy} run={run} />
      ) : (
        <DoneView history={history} timeZone={clock!.timeZone} busy={busy} run={run} />
      )}
    </div>
  );
}

function AddForm({ busy, run }: { busy: boolean; run: Run }) {
  const [name, setName] = useState("");
  const [due, setDue] = useState("");

  async function add(e: FormEvent) {
    e.preventDefault();
    if (await run(() => addTask(name, due || null))) {
      setName("");
      setDue("");
    }
  }

  return (
    <form onSubmit={add} className="flex flex-col gap-2 rounded-2xl border border-zinc-200 p-3 dark:border-zinc-800">
      <input
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        maxLength={TASK_NAME_MAX}
        placeholder="New task, e.g. Biochem ch. 4"
        aria-label="New task name"
        enterKeyHint="done"
        className="rounded-lg border border-zinc-300 bg-transparent px-3 py-3 text-lg dark:border-zinc-700"
      />
      <div className="flex items-center gap-2">
        <label className="flex flex-1 items-center gap-2 text-sm text-zinc-500">
          Due
          <input
            type="date"
            value={due}
            onChange={(e) => setDue(e.target.value)}
            className="min-w-0 flex-1 rounded-lg border border-zinc-300 bg-transparent px-3 py-2 text-base text-foreground dark:border-zinc-700"
          />
        </label>
        <button
          type="submit"
          disabled={busy || name.trim() === ""}
          className="rounded-lg bg-sky-700 px-5 py-2.5 font-semibold text-white hover:bg-sky-800 disabled:opacity-40"
        >
          Add
        </button>
      </div>
      <p className="text-xs text-zinc-500">The date is optional.</p>
    </form>
  );
}

function TodoView({
  groups,
  today,
  running,
  busy,
  run,
}: {
  groups: ReturnType<typeof groupTasks>;
  today: string;
  running: Parameters<typeof isInProgress>[1];
  busy: boolean;
  run: Run;
}) {
  const sections: { title: string; tasks: Task[] }[] = [
    { title: "Today", tasks: groups.today },
    { title: "Overdue", tasks: groups.overdue },
    { title: "Upcoming", tasks: groups.upcoming },
    { title: "No date", tasks: groups.noDate },
  ];
  if (sections.every((s) => s.tasks.length === 0)) {
    return (
      <p className="py-4 text-center text-zinc-500">
        Nothing to do. Add a task above, then pick it before you start a session.
      </p>
    );
  }
  return (
    <div className="flex flex-col gap-4">
      {sections.map(
        (section) =>
          section.tasks.length > 0 && (
            <section key={section.title} className="flex flex-col">
              <h2 className="text-sm font-semibold text-zinc-500">
                {section.title} <span className="font-normal">· {section.tasks.length}</span>
              </h2>
              <ul className="flex flex-col divide-y divide-zinc-200 dark:divide-zinc-800">
                {section.tasks.map((t) => (
                  <TaskRow
                    key={t.id}
                    task={t}
                    detail={t.due_date ? dueLabel(t.due_date, today) : null}
                    inProgress={isInProgress(t, running)}
                    busy={busy}
                    run={run}
                  />
                ))}
              </ul>
            </section>
          ),
      )}
    </div>
  );
}

function DoneView({
  history,
  timeZone,
  busy,
  run,
}: {
  history: ReturnType<typeof doneHistory> | null;
  timeZone: string;
  busy: boolean;
  run: Run;
}) {
  if (!history) return <p className="text-zinc-500">Loading…</p>;
  if (history.length === 0) {
    return <p className="py-4 text-center text-zinc-500">Finished tasks will show up here.</p>;
  }
  return (
    <ul className="flex flex-col divide-y divide-zinc-200 dark:divide-zinc-800">
      {history.map((t) => (
        <TaskRow
          key={t.id}
          task={t}
          detail={`Done ${formatDay(dayKey(Date.parse(t.done_at!), timeZone))} · ${
            t.focusSeconds > 0 ? `${formatDuration(t.focusSeconds)} focus` : "no focus time"
          }`}
          inProgress={false}
          busy={busy}
          run={run}
        />
      ))}
    </ul>
  );
}

function TaskRow({
  task,
  detail,
  inProgress,
  busy,
  run,
}: {
  task: Task;
  detail: string | null;
  inProgress: boolean;
  busy: boolean;
  run: Run;
}) {
  const [open, setOpen] = useState(false);
  const done = task.done_at !== null;

  return (
    <li className="flex flex-col py-2">
      <div className="flex items-center gap-3">
        <input
          type="checkbox"
          checked={done}
          disabled={busy}
          onChange={() => run(() => setTaskDone(task.id, !done))}
          aria-label={done ? `Mark "${task.name}" as not done` : `Mark "${task.name}" as done`}
          className="h-6 w-6 shrink-0 accent-sky-700"
        />
        <div className="flex min-w-0 flex-1 flex-col">
          <span className={`break-words ${done ? "text-zinc-500 line-through" : ""}`}>{task.name}</span>
          {(detail || inProgress) && (
            <span className="flex flex-wrap items-center gap-2 text-sm text-zinc-500">
              {inProgress && (
                <span className="rounded-full bg-sky-100 px-2 py-0.5 text-xs font-medium text-sky-800 dark:bg-sky-950 dark:text-sky-300">
                  In progress
                </span>
              )}
              {detail}
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={() => setOpen(!open)}
          aria-expanded={open}
          aria-label={`Options for "${task.name}"`}
          className="h-11 w-11 shrink-0 rounded-lg text-xl text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-900"
        >
          ⋯
        </button>
      </div>

      {open && (
        <div className="flex flex-wrap items-center gap-2 pt-2 pl-9">
          {!done && (
            <label className="flex items-center gap-2 text-sm text-zinc-500">
              Due
              <input
                type="date"
                value={task.due_date ?? ""}
                disabled={busy}
                onChange={(e) => run(() => setTaskDue(task.id, e.target.value || null))}
                className="rounded-lg border border-zinc-300 bg-transparent px-2 py-1.5 text-foreground dark:border-zinc-700"
              />
            </label>
          )}
          {!done && task.due_date && (
            <button
              type="button"
              disabled={busy}
              onClick={() => run(() => setTaskDue(task.id, null))}
              className="rounded-lg px-2 py-1.5 text-sm text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-900"
            >
              Remove date
            </button>
          )}
          <button
            type="button"
            disabled={busy}
            onClick={() => run(() => deleteTask(task.id))}
            className="ml-auto rounded-lg px-2 py-1.5 text-sm text-red-600 hover:bg-zinc-100 disabled:opacity-40 dark:hover:bg-zinc-900"
          >
            Delete
          </button>
        </div>
      )}
    </li>
  );
}
