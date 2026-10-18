import { useEffect, useMemo, useSyncExternalStore } from "react";
import { mergeSessions, type SessionFacts } from "./fish";
import {
  getPending,
  getServerPending,
  getSyncStatus,
  subscribePending,
  subscribeSyncStatus,
} from "./save-queue";
import { withRowDefaults } from "./session-record";
import { createClient } from "./supabase/client";

// All of the signed-in user's sessions, loaded once and shared by every
// component (tank, results, recent list). RLS means the query only ever
// returns your own rows, so no user filter is needed.

const COLUMNS =
  "id, started_at, ended_at, mode, focus_mode, outcome, focus_seconds, session_type, task_name, target_minutes, cycle_name, species, parts";
const PAGE_SIZE = 1000; // Supabase returns at most 1000 rows per request

type State = { rows: SessionFacts[] | null; error: string | null };
const SERVER_STATE: State = { rows: null, error: null };
let state: State = SERVER_STATE;
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
  const supabase = createClient();
  const all: SessionFacts[] = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await supabase
      .from("sessions")
      .select(COLUMNS)
      .order("ended_at", { ascending: true })
      .order("id", { ascending: true })
      .range(from, from + PAGE_SIZE - 1);
    if (error || !data) {
      loadedFor = null; // allow a retry
      setState({ rows: state.rows, error: error?.message ?? "Couldn't load sessions" });
      return;
    }
    all.push(...(data as SessionFacts[]));
    if (data.length < PAGE_SIZE) break;
  }
  setState({ rows: all, error: null });
}

// Reload once per successful save (savedCount), however many components ask.
let loadedFor: number | null = null;
function ensureLoaded(savedCount: number) {
  if (loadedFor === savedCount) return;
  loadedFor = savedCount;
  void load();
}

export function useSessions() {
  const { rows, error } = useSyncExternalStore(subscribe, () => state, () => SERVER_STATE);
  const pending = useSyncExternalStore(subscribePending, getPending, getServerPending);
  const sync = useSyncExternalStore(subscribeSyncStatus, getSyncStatus, getSyncStatus);

  useEffect(() => ensureLoaded(sync.savedCount), [sync.savedCount]);

  // A failed load (e.g. offline at startup) is retried when the network returns.
  useEffect(() => {
    const retry = () => {
      if (state.error) ensureLoaded(getSyncStatus().savedCount);
    };
    window.addEventListener("online", retry);
    return () => window.removeEventListener("online", retry);
  }, []);

  // Sessions still waiting to upload count straight away (a fish appears offline too).
  const merged = useMemo(
    () => (rows === null ? null : mergeSessions(rows, (pending ?? []).map(withRowDefaults))),
    [rows, pending],
  );
  const pendingIds = useMemo(() => new Set((pending ?? []).map((r) => r.id)), [pending]);

  return {
    rows: merged, // null until the first load finishes
    error,
    pendingIds,
    syncError: sync.error,
  };
}
