import { useSyncExternalStore } from "react";
import { createLocalStore } from "./local-store";
import { parseWhatsNew, type WhatsNew } from "./whats-new";

// The "What's new" entry built into this version (next.config.ts), and which
// one this device has already seen (localStorage; forgotten in private mode,
// which only means it shows once more).

export const WHATS_NEW: WhatsNew | null = parseWhatsNew(process.env.NEXT_PUBLIC_WHATS_NEW);

const store = createLocalStore<string | null>("deep-nautilus:whats-new-seen:v1", null, (v) => typeof v === "string");

export function useSeenWhatsNew(): string | null {
  return useSyncExternalStore(store.subscribe, store.get, () => null);
}

export function markWhatsNewSeen(id: string) {
  store.set(id);
}
