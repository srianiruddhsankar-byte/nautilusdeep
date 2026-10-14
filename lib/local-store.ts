// A tiny JSON value kept in localStorage, shaped for React's useSyncExternalStore
// (get must return the same object until the data changes, so we cache it).
// If storage is blocked or full, it keeps working in memory for this page load.
export function createLocalStore<T>(
  key: string,
  empty: T,
  isValid: (data: unknown) => boolean,
) {
  let cachedRaw: string | null = null;
  let cached = empty;
  let memoryOnly = false; // set once a write fails; from then on, trust memory
  const listeners = new Set<() => void>();

  function get(): T {
    if (memoryOnly) return cached;
    let raw: string | null;
    try {
      raw = localStorage.getItem(key);
    } catch {
      return cached; // storage blocked (e.g. private mode)
    }
    if (raw !== cachedRaw) {
      cachedRaw = raw;
      cached = parse(raw);
    }
    return cached;
  }

  function set(next: T) {
    cached = next;
    try {
      const raw = JSON.stringify(next);
      localStorage.setItem(key, raw);
      cachedRaw = raw;
    } catch {
      memoryOnly = true; // still works for this page load, just won't survive a refresh
    }
    listeners.forEach((listener) => listener());
  }

  function subscribe(listener: () => void) {
    listeners.add(listener);
    // Another tab changed it.
    const onStorage = (e: StorageEvent) => {
      if (e.key === key) listener();
    };
    window.addEventListener("storage", onStorage);
    return () => {
      listeners.delete(listener);
      window.removeEventListener("storage", onStorage);
    };
  }

  function parse(raw: string | null): T {
    if (!raw) return empty;
    try {
      const data: unknown = JSON.parse(raw);
      if (isValid(data)) return data as T;
    } catch {}
    return empty;
  }

  return { get, set, subscribe };
}
