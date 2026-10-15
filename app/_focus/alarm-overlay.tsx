"use client";

import { useEffect } from "react";
import { stopAlarm, useAlarm } from "@/lib/alarm";
import "./alarm.css";

// Full screen while the alarm rings. Tapping anywhere (or "Got it", or Escape)
// stops it. It sits above everything, so the tap can't land on a button below.
export function AlarmOverlay() {
  const alarm = useAlarm();

  useEffect(() => {
    if (!alarm) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") stopAlarm();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [alarm]);

  if (!alarm) return null;
  return (
    <div
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="alarm-title"
      aria-describedby="alarm-detail"
      onClick={stopAlarm}
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
        onClick={stopAlarm}
        className="mt-6 w-full max-w-xs rounded-2xl bg-sky-700 py-5 text-xl font-semibold text-white hover:bg-sky-800"
      >
        Got it
      </button>
      <p className="text-sm text-zinc-500 dark:text-zinc-400">Tap anywhere to stop</p>
    </div>
  );
}
