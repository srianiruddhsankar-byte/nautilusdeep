import { useEffect, useSyncExternalStore } from "react";
import { createClient } from "./supabase/client";
import { cleanTaskName, taskKey } from "./task-name";
import type { Task } from "./task-views";

export type { Task } from "./task-views";

// The signed-in user's task list (public.tasks), loaded once and shared by
// every screen. RLS means every query only touches your own rows. Changes need
// a connection; sessions keep the task's name, so finished sessions never
// depend on this table.

type State = { tasks: Task[] | null; error: string | null };
const SERVER_STATE: State = { tasks: null, error: null };
let state: State = SERVER_STATE;
let loading = false;
const listeners = new Set<() => void>();

function setState(next: State) {
  state = next;
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

async function load() {
  loading = true;
  const { data, error } = await createClient()
    .from("tasks")
    .select("id, name, due_date, done_at, created_at")
    .order("created_at", { ascending: true });
  loading = false;
  if (error || !data) {
    setState({ tasks: state.tasks, error: error?.message ?? "Couldn't load tasks" });
    return;
  }
  setState({ tasks: data as Task[], error: null });
}

export function useTasks() {
  const { tasks, error } = useSyncExternalStore(subscribe, () => state, () => SERVER_STATE);

  useEffect(() => {
    if (state.tasks === null && !loading) void load();
  }, []);

  return { tasks, error };
}

// Each change returns an error message, or null if it worked, then reloads the list.
async function change(run: () => PromiseLike<{ error: { code?: string; message: string } | null }>) {
  try {
    const { error } = await run();
    // 23505 = unique index: a not-done task already has this name (e.g. unticking
    // an old copy of a task that's on the list again, or another tab added it).
    if (error) return error.code === "23505" ? "That task is already on your to-do list." : error.message;
  } catch (e) {
    return e instanceof Error ? e.message : "Network error";
  }
  await load();
  return null;
}

// Names are unique among tasks that aren't done (ignoring case), so "Mark done"
// can find the task by name. A name that's only in Done (e.g. "Read 20 pages"
// again) just makes a new task, and every completion stays in history.
export async function addTask(raw: string, dueDate: string | null): Promise<string | null> {
  const name = cleanTaskName(raw);
  if (!name) return "Type a name first.";
  const open = (state.tasks ?? []).filter((t) => t.done_at === null);
  if (open.some((t) => taskKey(t.name) === taskKey(name))) return "That task is already on your to-do list.";
  return change(() => createClient().from("tasks").insert({ name, due_date: dueDate || null }));
}

export function setTaskDone(id: string, done: boolean) {
  const doneAt = done ? new Date().toISOString() : null;
  return change(() => createClient().from("tasks").update({ done_at: doneAt }).eq("id", id));
}

export function setTaskDue(id: string, dueDate: string | null) {
  return change(() => createClient().from("tasks").update({ due_date: dueDate || null }).eq("id", id));
}

export function deleteTask(id: string) {
  return change(() => createClient().from("tasks").delete().eq("id", id));
}
