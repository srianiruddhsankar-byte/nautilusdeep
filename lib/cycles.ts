import { useEffect, useMemo, useSyncExternalStore } from "react";
import { PREMADE_CYCLES, parseBlocks, type CycleBlock, type CycleTemplate } from "./cycle-blocks";
import { createClient } from "./supabase/client";
import { CYCLE_NAME_MAX, cleanName, taskKey } from "./task-name";

// The premade cycles (in code) plus the user's saved ones (public.cycles),
// loaded once and shared. Saved cycles can be created and deleted, not edited.

type State = { saved: CycleTemplate[] | null; error: string | null };
const SERVER_STATE: State = { saved: null, error: null };
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
    .from("cycles")
    .select("id, name, blocks")
    .order("created_at", { ascending: true });
  loading = false;
  if (error || !data) {
    setState({ saved: state.saved, error: error?.message ?? "Couldn't load cycles" });
    return;
  }
  const saved: CycleTemplate[] = [];
  for (const row of data as { id: string; name: string; blocks: unknown }[]) {
    const blocks = parseBlocks(row.blocks); // skip anything malformed rather than crash
    if (blocks) saved.push({ id: row.id, name: row.name, blocks, premade: false });
  }
  setState({ saved, error: null });
}

export function useCycles() {
  const { saved, error } = useSyncExternalStore(subscribe, () => state, () => SERVER_STATE);

  useEffect(() => {
    if (state.saved === null && !loading) void load();
  }, []);

  const cycles = useMemo(() => [...PREMADE_CYCLES, ...(saved ?? [])], [saved]);
  return { cycles, error };
}

// Returns the new cycle's id, or an error message.
export async function saveCycle(
  raw: string,
  blocks: CycleBlock[],
): Promise<{ id: string; error: null } | { id: null; error: string }> {
  const name = cleanName(raw, CYCLE_NAME_MAX);
  if (!name) return { id: null, error: "Give it a name first." };
  const taken = [...PREMADE_CYCLES, ...(state.saved ?? [])].some((c) => taskKey(c.name) === taskKey(name));
  if (taken) return { id: null, error: "You already have a cycle with that name." };
  if (!parseBlocks(blocks)) return { id: null, error: "That cycle isn't valid." };

  try {
    const { data, error } = await createClient()
      .from("cycles")
      .insert({ name, blocks })
      .select("id")
      .single();
    if (error || !data) {
      const message =
        error?.code === "23505" ? "You already have a cycle with that name." : (error?.message ?? "Couldn't save");
      return { id: null, error: message };
    }
    await load();
    return { id: (data as { id: string }).id, error: null };
  } catch (e) {
    return { id: null, error: e instanceof Error ? e.message : "Network error" };
  }
}

export async function deleteCycle(id: string): Promise<string | null> {
  try {
    const { error } = await createClient().from("cycles").delete().eq("id", id);
    if (error) return error.message;
  } catch (e) {
    return e instanceof Error ? e.message : "Network error";
  }
  await load();
  return null;
}
