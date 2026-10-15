"use client";

import { useEffect } from "react";
import { stopAlarm, useAlarm } from "@/lib/alarm";
import "./alarm.css";

// Full screen while the alarm rings. Tapping anywhere (or "Got it", or Escape)
// stops it. It sits above everything, so the tap can't land on a button below.
// `onDismiss` runs only when YOU stop it (not when it times out): during a
// session that proves you're awake, so it counts as a Night mode check-in.
export function AlarmOverlay({ onDismiss }: { onDismiss?: () => void }) {
  const alarm = useAlarm();

  useEffect(() => {
    if (!alarm) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      stopAlarm();
      onDismiss?.();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [alarm, onDismiss]);

  if (!alarm) return null;
  const dismiss = () => {
    stopAlarm();
    onDismiss?.();
  };
  return (
    <div
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="alarm-title"
      aria-describedby="alarm-detail"
      onClick={dismiss}
      className="alarm-flash fixed inset-0 z-50 flex cursor-pointer flex-col items-center justify-center gap-4 p-8 text-center"
    >
      <p id="alarm-title" className="text-4xl font-semibold">
        {alarm.title}
      </p>
      <p id="alarm-detail" className="max-w-xs text-lg text-zinc-600 dark:text-zinc-300">
        {alarm.detail}
      </p>
      <button
        type="button"
        autoFocus
        onClick={(e) => {
          e.stopPropagation(); // the overlay's own click would count it twice
          dismiss();
        }}
        className="mt-6 w-full max-w-xs rounded-2xl bg-sky-700 py-5 text-xl font-semibold text-white hover:bg-sky-800"
      >
        Got it
      </button>
      <p className="text-sm text-zinc-500 dark:text-zinc-400">Tap anywhere to stop</p>
    </div>
  );
}
