import type { SessionFacts } from "./fish.ts";
import { addDays, dayKey, formatDay, startOfWeek, type DayKey } from "./stats.ts";
import { taskKey } from "./task-name.ts";
import type { Session } from "./timer.ts";

// Everything the app works out from the task list. Pure: the clock and the
// time zone are arguments, like the stats.

// One row of public.tasks.
export type Task = {
  id: string;
  name: string;
  due_date: DayKey | null; // a calendar date, "YYYY-MM-DD"
  done_at: string | null; // null = still to do
  created_at: string;
};

export type TaskGroups = {
  today: Task[];
  overdue: Task[]; // oldest due date first
  upcoming: Task[]; // soonest first
  noDate: Task[];
  done: Task[]; // most recently done first
};

const byCreated = (a: Task, b: Task) => Date.parse(a.created_at) - Date.parse(b.created_at);
const byDue = (a: Task, b: Task) => (a.due_date! < b.due_date! ? -1 : a.due_date! > b.due_date! ? 1 : byCreated(a, b));

// "Today" is today in the user's time zone, so a task due on the 14th is still
// Today at 23:59 there and Overdue one minute later.
export function groupTasks(tasks: Task[], now: number, timeZone: string): TaskGroups {
  const today = dayKey(now, timeZone);
  const groups: TaskGroups = { today: [], overdue: [], upcoming: [], noDate: [], done: [] };
  for (const task of tasks) {
    if (task.done_at !== null) groups.done.push(task);
    else if (task.due_date === null) groups.noDate.push(task);
    else if (task.due_date < today) groups.overdue.push(task);
    else if (task.due_date === today) groups.today.push(task);
    else groups.upcoming.push(task);
  }
  groups.today.sort(byCreated);
  groups.overdue.sort(byDue);
  groups.upcoming.sort(byDue);
  groups.noDate.sort(byCreated);
  groups.done.sort((a, b) => Date.parse(b.done_at!) - Date.parse(a.done_at!));
  return groups;
}

// Open tasks in the order you'd want to pick them: today, overdue, upcoming, no date.
export function openTasksInOrder(groups: TaskGroups): Task[] {
  return [...groups.today, ...groups.overdue, ...groups.upcoming, ...groups.noDate];
}

// "Today", "Tomorrow", "Yesterday", or "Wed 21 Oct".
export function dueLabel(due: DayKey, today: DayKey): string {
  if (due === today) return "Today";
  if (due === addDays(today, 1)) return "Tomorrow";
  if (due === addDays(today, -1)) return "Yesterday";
  return formatDay(due);
}

// The NOT-done task with this name, or null. Names are unique among tasks that
// aren't done (ignoring case), so there's at most one. A repeating task like
// "Read 20 pages" can have many done copies; those never match. null also means
// the name isn't on the list at all (e.g. typed just for one session).
export function findTaskByName(tasks: Task[], name: string | null | undefined): Task | null {
  if (!name) return null;
  const key = taskKey(name);
  return tasks.find((t) => t.done_at === null && taskKey(t.name) === key) ?? null;
}

// In progress is never stored: it's true only while a session is running on
// this task. `running` is the running session (null once it has ended).
export function isInProgress(task: Task, running: Session | null): boolean {
  if (task.done_at !== null || !running?.task) return false;
  return taskKey(running.task) === taskKey(task.name);
}

export type DoneTask = Task & { focusSeconds: number; sessions: number };

// Finished tasks, newest first, each with the focus time of its sessions
// (study or notes, completed or partial). A name can be done many times
// ("Read 20 pages"), so each session counts toward ONE completion: the first one
// with that name done at or after the session started. Sessions after the
// latest completion belong to the task that's still open (not in history).
export function doneHistory(tasks: Task[], rows: SessionFacts[]): DoneTask[] {
  const done = tasks
    .filter((t) => t.done_at !== null)
    .map((t) => ({ ...t, focusSeconds: 0, sessions: 0 }))
    .sort((a, b) => Date.parse(a.done_at!) - Date.parse(b.done_at!)); // oldest first, for matching

  const byName = new Map<string, DoneTask[]>();
  for (const t of done) byName.set(taskKey(t.name), [...(byName.get(taskKey(t.name)) ?? []), t]);

  for (const row of rows) {
    if (!row.task_name || row.outcome === "failed") continue;
    const started = Date.parse(row.started_at);
    const completion = byName.get(taskKey(row.task_name))?.find((t) => Date.parse(t.done_at!) >= started);
    if (!completion) continue;
    completion.focusSeconds += row.focus_seconds;
    completion.sessions++;
  }
  return done.reverse(); // newest first
}

// Tasks ticked off today / this week (from Monday) / this month, in local time.
export function taskCompletions(tasks: Task[], now: number, timeZone: string) {
  const today = dayKey(now, timeZone);
  const weekStart = startOfWeek(today);
  const month = today.slice(0, 7);
  const counts = { today: 0, week: 0, month: 0 };
  for (const task of tasks) {
    if (task.done_at === null) continue;
    const day = dayKey(Date.parse(task.done_at), timeZone);
    if (day === today) counts.today++;
    if (day >= weekStart && day <= today) counts.week++;
    if (day.slice(0, 7) === month) counts.month++;
  }
  return counts;
}
