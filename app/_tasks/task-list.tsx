"use client";

import { useMemo, useState, useSyncExternalStore, type FormEvent } from "react";
import { getServerSnapshot, getSnapshot, subscribe } from "@/lib/focus-storage";
import { useSessions } from "@/lib/sessions-data";
import { dayKey, formatDay, formatDuration } from "@/lib/stats";
import { TASK_NAME_MAX } from "@/lib/task-name";
import { doneHistory, dueLabel, groupTasks, isInProgress, type Task } from "@/lib/task-views";
import { addTask, deleteTask, setTaskDone, setTaskDue, useTasks } from "@/lib/tasks";
import { useClock } from "@/lib/use-clock";
import { Button } from "../_ui/button";
import { Card } from "../_ui/card";
import { EmptyState, Skeleton } from "../_ui/feedback";
import { inputClass } from "../_ui/field";
import { Tabs } from "../_ui/tabs";
import { toast } from "../_ui/toast";

type Run = (action: () => Promise<string | null>) => Promise<boolean>;
type View = "todo" | "done";

// The task list: add (with an optional due date), group by when it's due, tick
// off, and look back at what's done. Deleting a task never touches sessions:
// they keep the task's name, so its time stays in your stats.
export function TaskList() {
  const { tasks, error: loadError } = useTasks();
  const { rows } = useSessions();
  const clock = useClock();
  const saved = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const running = saved?.session ?? null;

  const [view, setView] = useState<View>("todo");
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
    <div className="flex flex-col gap-5">
      <AddForm busy={busy} run={run} />
      {(error ?? loadError) && (
        <p role="alert" className="text-sm text-danger">
          {error ?? loadError}
        </p>
      )}

      <Tabs<View>
        label="Tasks"
        idPrefix="tasks"
        value={view}
        onChange={setView}
        tabs={[
          { id: "todo", label: "To do" },
          { id: "done", label: `Done${groups ? ` · ${groups.done.length}` : ""}` },
        ]}
      />

      <div role="tabpanel" id="tasks-panel" aria-labelledby={`tasks-tab-${view}`}>
        {!groups || !today ? (
          !loadError && <ListSkeleton />
        ) : view === "todo" ? (
          <TodoView groups={groups} today={today} running={running} busy={busy} run={run} />
        ) : (
          <DoneView history={history} timeZone={clock!.timeZone} busy={busy} run={run} />
        )}
      </div>
    </div>
  );
}

function ListSkeleton() {
  return (
    <div className="flex flex-col gap-2" aria-busy="true" aria-label="Loading tasks">
      <Skeleton className="h-4 w-20" />
      <Skeleton className="h-40 rounded-card" />
    </div>
  );
}

function AddForm({ busy, run }: { busy: boolean; run: Run }) {
  const [name, setName] = useState("");
  const [due, setDue] = useState("");

  async function add(e: FormEvent) {
    e.preventDefault();
    if (await run(() => addTask(name, due || null))) {
      toast(`Added “${name.trim()}”`);
      setName("");
      setDue("");
    }
  }

  return (
    <Card as="section" aria-label="Add a task" className="gap-3">
      <form onSubmit={add} className="flex flex-col gap-3">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={TASK_NAME_MAX}
          placeholder="New task, e.g. Biochem ch. 4"
          aria-label="New task name"
          enterKeyHint="done"
          className={`${inputClass} text-lg`}
        />
        <div className="flex items-end gap-2">
          <label className="flex min-w-0 flex-1 flex-col gap-1.5 text-sm text-muted">
            Due date (optional)
            <input type="date" value={due} onChange={(e) => setDue(e.target.value)} className={inputClass} />
          </label>
          <Button type="submit" variant="primary" disabled={busy || name.trim() === ""}>
            Add
          </Button>
        </div>
      </form>
    </Card>
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
      <EmptyState title="Nothing to do">
        Add a task above, then pick it on Home before you start a session.
      </EmptyState>
    );
  }
  return (
    <div className="flex flex-col gap-5">
      {sections.map(
        (section) =>
          section.tasks.length > 0 && (
            <section key={section.title} className="flex flex-col gap-2" aria-label={section.title}>
              <h2 className="eyebrow">
                {section.title} · {section.tasks.length}
              </h2>
              <Card as="div" className="gap-0 py-1">
                <ul className="flex flex-col divide-y divide-line">
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
              </Card>
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
  if (!history) return <ListSkeleton />;
  if (history.length === 0) {
    return <EmptyState title="Nothing done yet">Tasks you tick off show up here, with their focus time.</EmptyState>;
  }
  return (
    <Card as="div" className="gap-0 py-1">
      <ul className="flex flex-col divide-y divide-line">
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
    </Card>
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

  async function toggle() {
    if ((await run(() => setTaskDone(task.id, !done))) && !done) toast("Done. Nice work.");
  }

  return (
    <li className="flex flex-col py-1">
      <div className="flex items-center gap-1">
        {/* The whole 44 px square is the checkbox; the box drawn inside it is 22 px. */}
        <label className="-ml-2.5 flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center">
          <input
            type="checkbox"
            checked={done}
            disabled={busy}
            onChange={toggle}
            aria-label={done ? `Mark "${task.name}" as not done` : `Mark "${task.name}" as done`}
            className="peer sr-only"
          />
          <span
            aria-hidden
            className={`flex h-5.5 w-5.5 items-center justify-center rounded-[6px] text-xs transition-colors duration-(--dur) peer-focus-visible:outline-3 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-(--focus) ${
              done ? "bg-primary text-on-primary" : "shadow-[inset_0_0_0_2px_var(--line)]"
            }`}
          >
            {done && "✓"}
          </span>
        </label>
        <div className="flex min-w-0 flex-1 flex-col py-1.5">
          <span className={`break-words ${done ? "text-muted line-through" : ""}`}>{task.name}</span>
          {(detail || inProgress) && (
            <span className="flex flex-wrap items-center gap-2 text-sm text-muted">
              {inProgress && (
                <span className="rounded-chip bg-soft px-2 py-0.5 text-xs font-semibold">In progress</span>
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
          className="-mr-2 h-11 w-11 shrink-0 rounded-control text-xl text-muted hover:bg-soft hover:text-ink"
        >
          ⋯
        </button>
      </div>

      {open && (
        <div className="flex flex-wrap items-end gap-2 pt-1 pb-2 pl-9">
          {!done && (
            <label className="flex flex-col gap-1.5 text-sm text-muted">
              Due date
              <input
                type="date"
                value={task.due_date ?? ""}
                disabled={busy}
                onChange={(e) => run(() => setTaskDue(task.id, e.target.value || null))}
                className={`${inputClass} w-auto`}
              />
            </label>
          )}
          {!done && task.due_date && (
            <Button variant="quiet" size="sm" disabled={busy} onClick={() => run(() => setTaskDue(task.id, null))}>
              Remove date
            </Button>
          )}
          <Button
            variant="quiet"
            size="sm"
            disabled={busy}
            onClick={async () => {
              if (await run(() => deleteTask(task.id))) toast(`Deleted “${task.name}”`);
            }}
            className="ml-auto text-danger hover:text-danger"
          >
            Delete
          </Button>
        </div>
      )}
    </li>
  );
}
