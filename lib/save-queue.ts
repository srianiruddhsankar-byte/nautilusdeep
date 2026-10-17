import { earnsFish, speciesOf } from "./fish";
import { createLocalStore } from "./local-store";
import { toRow, type SessionRow } from "./session-record";
import { createClient } from "./supabase/client";
import type { Result } from "./timer";

// Outbox for finished sessions. A finished session is first queued here (in
// localStorage), then uploaded. It leaves the queue only once Supabase has it,
// so going offline, a network error or closing the tab can't lose it. Uploads
// use the session's own id with "ignore duplicates", so retries never duplicate.

const queue = createLocalStore<SessionRow[]>(
  "deep-nautilus:unsaved-sessions:v1",
  [],
  Array.isArray,
);

export const getPending = queue.get;
export const subscribePending = queue.subscribe;
export function getServerPending(): SessionRow[] | null {
  return null;
}

// In-memory sync status for the UI: the last error, and a counter that goes up
// after every successful save (the Recent sessions list reloads when it changes).
type SyncStatus = { error: string | null; savedCount: number };
let status: SyncStatus = { error: null, savedCount: 0 };
const statusListeners = new Set<() => void>();

function setStatus(patch: Partial<SyncStatus>) {
  status = { ...status, ...patch };
  statusListeners.forEach((listener) => listener());
}

export function getSyncStatus(): SyncStatus {
  return status;
}

export function subscribeSyncStatus(listener: () => void) {
  statusListeners.add(listener);
  return () => {
    statusListeners.delete(listener);
  };
}

// Who is signed in, so queued rows can't later be saved under someone else.
let userId: string | null = null;

// Call when a session ends. Synchronous on purpose: the row is safely in
// localStorage before anything else happens.
export function queueResult(result: Result) {
  const id = result.id ?? crypto.randomUUID(); // sessions started before Phase 3 have no id
  const pending = queue.get();
  if (pending.some((row) => row.id === id)) return; // e.g. two tabs ended the same session
  queue.set([...pending, toRow(result, id, userId)]);
}

let running = false;
let runAgain = false;

// Uploads everything in the queue that belongs to the signed-in user.
export async function flushPending() {
  if (running) {
    runAgain = true; // something was queued mid-upload: do another pass afterwards
    return;
  }
  running = true;
  try {
    do {
      runAgain = false;
      await uploadOnce();
    } while (runAgain);
  } finally {
    running = false;
  }
}

async function uploadOnce() {
  if (queue.get().length === 0) return;
  if (!navigator.onLine) {
    setStatus({ error: "Offline. Will retry when you're back online." });
    return;
  }

  const supabase = createClient();
  // getSession reads the login stored in this browser (no network call). Fine
  // here: the database's RLS policies are what actually enforce who can insert.
  const { data } = await supabase.auth.getSession();
  const uid = data.session?.user.id;
  if (!uid) return;
  userId = uid;

  const tried = new Set<string>();
  for (;;) {
    // Rows queued by another account on this device wait for that account.
    const row = queue.get().find((r) => !tried.has(r.id) && (r.user_id ?? uid) === uid);
    if (!row) break;
    tried.add(row.id);

    // Rows queued before species existed get theirs now (the same pick the app shows).
    const species = row.species ?? (earnsFish(row) ? speciesOf(row) : null);

    let message: string | null = null;
    try {
      const { error } = await supabase
        .from("sessions")
        .upsert({ ...row, species, user_id: uid }, { onConflict: "id", ignoreDuplicates: true });
      message = error?.message ?? null;
    } catch (e) {
      message = e instanceof Error ? e.message : "Network error";
    }

    if (message) {
      setStatus({ error: message }); // stays queued; retried on the next trigger
      continue;
    }
    queue.set(queue.get().filter((r) => r.id !== row.id));
    setStatus({ error: null, savedCount: status.savedCount + 1 });
  }
}

// Start uploading: now, when the browser comes back online, and when the tab
// is shown again. Returns a cleanup function (for a React effect).
export function startSync() {
  const run = () => void flushPending();
  const onVisible = () => {
    if (document.visibilityState === "visible") run();
  };

  void createClient()
    .auth.getSession()
    .then(({ data }) => {
      userId = data.session?.user.id ?? null;
    });
  run();
  window.addEventListener("online", run);
  document.addEventListener("visibilitychange", onVisible);

  return () => {
    window.removeEventListener("online", run);
    document.removeEventListener("visibilitychange", onVisible);
  };
}
