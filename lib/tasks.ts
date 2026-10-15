import { useEffect, useSyncExternalStore } from "react";
import { createClient } from "./supabase/client";
import { cleanTaskName, taskKey } from "./task-name";

// The signed-in user's task list (public.tasks), loaded once and shared by the
// setup form and the /tasks page. RLS means every query only touches your own
// rows. Changes need a connection; sessions keep the task's name, so finished
// sessions never depend on this table.

export type Task = { id: string; name: string; done_at: string | null; created_at: string };

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
    .select("id, name, done_at, created_at")
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
async function change(run: () => PromiseLike<{ error: { message: string } | null }>) {
  try {
    const { error } = await run();
    if (error) return error.message;
  } catch (e) {
    return e instanceof Error ? e.message : "Network error";
  }
  await load();
  return null;
}

export async function addTask(raw: string): Promise<string | null> {
  const name = cleanTaskName(raw);
  if (!name) return "Type a name first.";
  const open = (state.tasks ?? []).filter((t) => t.done_at === null);
  if (open.some((t) => taskKey(t.name) === taskKey(name))) return "That task is already on your list.";
  return change(() => createClient().from("tasks").insert({ name }));
}

export function setTaskDone(id: string, done: boolean) {
  const doneAt = done ? new Date().toISOString() : null;
  return change(() => createClient().from("tasks").update({ done_at: doneAt }).eq("id", id));
}

export function deleteTask(id: string) {
  return change(() => createClient().from("tasks").delete().eq("id", id));
}
