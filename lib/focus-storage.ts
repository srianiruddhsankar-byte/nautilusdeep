import type { Result, Session } from "./timer";

// Saves the running session (and the last result) in localStorage so a refresh
// or reopened tab picks up exactly where it left off. Shaped for React's
// useSyncExternalStore: subscribe + getSnapshot + getServerSnapshot.

const KEY = "deep-nautilus:focus:v1";

export type Saved = { session: Session | null; result: Result | null };
const EMPTY: Saved = { session: null, result: null };

// getSnapshot must return the same object until the data changes,
// so cache the parsed value against the raw string.
let cachedRaw: string | null = null;
let cached: Saved = EMPTY;
let memoryOnly = false; // set once a write fails; from then on, trust memory
const listeners = new Set<() => void>();

export function getSnapshot(): Saved {
  if (memoryOnly) return cached;
  let raw: string | null;
  try {
    raw = localStorage.getItem(KEY);
  } catch {
    return cached; // storage blocked (e.g. private mode): fall back to memory
  }
  if (raw !== cachedRaw) {
    cachedRaw = raw;
    cached = parse(raw);
  }
  return cached;
}

// null = "not loaded yet". The server has no localStorage.
export function getServerSnapshot(): Saved | null {
  return null;
}

export function save(next: Saved) {
  cached = next;
  try {
    const raw = JSON.stringify(next);
    localStorage.setItem(KEY, raw);
    cachedRaw = raw;
  } catch {
    // Still works for this page load, just won't survive a refresh.
    memoryOnly = true;
  }
  listeners.forEach((listener) => listener());
}

export function subscribe(listener: () => void) {
  listeners.add(listener);
  // Another tab changed it.
  const onStorage = (e: StorageEvent) => {
    if (e.key === KEY) listener();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

function parse(raw: string | null): Saved {
  if (!raw) return EMPTY;
  try {
    const data = JSON.parse(raw);
    if (data && typeof data === "object" && "session" in data && "result" in data) {
      return data as Saved;
    }
  } catch {}
  return EMPTY;
}
