"use client";

import { useSyncExternalStore } from "react";

// Small confirmations ("Task done", "Cycle saved"): call `toast("…")` from any
// client code. One at a time; a new one replaces the old. They disappear after
// 3 s and are announced to screen readers. Never for errors you must act on:
// those stay next to the thing that failed.
// A toast can carry one action ("Refresh") and stay until it's used or
// replaced (`sticky`), e.g. "New version available".

type Action = { label: string; onClick: () => void };
type Toast = { id: number; message: string; action?: Action };

const SHOW_MS = 3000;
let current: Toast | null = null;
let timer: ReturnType<typeof setTimeout> | undefined;
const listeners = new Set<() => void>();

function emit() {
  for (const l of listeners) l();
}

// Returns the toast's id, for `isToastShowing`.
export function toast(message: string, options: { action?: Action; sticky?: boolean } = {}) {
  current = { id: (current?.id ?? 0) + 1, message, action: options.action };
  clearTimeout(timer);
  if (!options.sticky) {
    timer = setTimeout(() => {
      current = null;
      emit();
    }, SHOW_MS);
  }
  emit();
  return current.id;
}

export function isToastShowing(id: number) {
  return current?.id === id;
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
        <div
          key={shown.id}
          className={`toast-in flex max-w-sm items-center gap-3 rounded-control bg-ink text-sm font-semibold text-paper shadow-[0_3px_0_rgb(0_0_0/0.2)] ${
            shown.action ? "pointer-events-auto py-1 pr-1 pl-4" : "px-4 py-3"
          }`}
        >
          <p>{shown.message}</p>
          {shown.action && (
            <button
              type="button"
              onClick={shown.action.onClick}
              className="min-h-11 rounded-chip px-3 font-bold underline underline-offset-2 transition-transform duration-(--dur-fast) ease-snap active:scale-[0.97]"
            >
              {shown.action.label}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
