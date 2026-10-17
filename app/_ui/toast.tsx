"use client";

import { useSyncExternalStore } from "react";

// Small confirmations ("Task done", "Cycle saved"): call `toast("…")` from any
// client code. One at a time; a new one replaces the old. They disappear after
// 3 s and are announced to screen readers. Never for errors you must act on:
// those stay next to the thing that failed.

type Toast = { id: number; message: string };

const SHOW_MS = 3000;
let current: Toast | null = null;
let timer: ReturnType<typeof setTimeout> | undefined;
const listeners = new Set<() => void>();

function emit() {
  for (const l of listeners) l();
}

export function toast(message: string) {
  current = { id: (current?.id ?? 0) + 1, message };
  clearTimeout(timer);
  timer = setTimeout(() => {
    current = null;
    emit();
  }, SHOW_MS);
  emit();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

// Rendered once, in the root layout. Sits above the bottom nav.
export function Toaster() {
  const shown = useSyncExternalStore(
    subscribe,
    () => current,
    () => null,
  );
  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 bottom-[calc(5.5rem+env(safe-area-inset-bottom))] z-60 flex justify-center px-4"
    >
      {shown && (
        <p
          key={shown.id}
          className="toast-in max-w-sm rounded-control bg-ink px-4 py-3 text-sm font-semibold text-paper shadow-[0_3px_0_rgb(0_0_0/0.2)]"
        >
          {shown.message}
        </p>
      )}
    </div>
  );
}
