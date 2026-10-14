import { createLocalStore } from "./local-store";
import type { Result, Session } from "./timer";

// Saves the running session (and the last result) in localStorage so a refresh
// or reopened tab picks up exactly where it left off. Shaped for React's
// useSyncExternalStore: subscribe + getSnapshot + getServerSnapshot.

export type Saved = { session: Session | null; result: Result | null };

const store = createLocalStore<Saved>(
  "deep-nautilus:focus:v1",
  { session: null, result: null },
  (data) => typeof data === "object" && data !== null && "session" in data && "result" in data,
);

export const getSnapshot = store.get;
export const save = store.set;
export const subscribe = store.subscribe;

// null = "not loaded yet". The server has no localStorage.
export function getServerSnapshot(): Saved | null {
  return null;
}
