"use client";

import { useState } from "react";
import {
  DEFAULT_CYCLE,
  FOCUS_MODE_LABEL,
  isValidMinutes,
  startCycle,
  startStopwatch,
  startTimer,
  type FocusMode,
  type Mode,
  type Session,
} from "@/lib/timer";

const PRESETS = [15, 25, 45, 60];
const MODES: { id: Mode; label: string }[] = [
  { id: "timer", label: "Timer" },
  { id: "stopwatch", label: "Stopwatch" },
  { id: "cycle", label: "Cycle" },
];
const FOCUS_MODES: { id: FocusMode; explanation: string }[] = [
  { id: "deep", explanation: "Stay in the app. Leaving over 15 s fails it." },
  { id: "open", explanation: "Use this device to study. No leave rule." },
];

export function SetupForm({ onStart }: { onStart: (session: Session) => void }) {
  const [mode, setMode] = useState<Mode>("timer");
  const [focusMode, setFocusMode] = useState<FocusMode>("deep");
  const [minutes, setMinutes] = useState("25");
  const [cycle, setCycle] = useState({
    focusMin: String(DEFAULT_CYCLE.focusMin),
    shortBreakMin: String(DEFAULT_CYCLE.shortBreakMin),
    longBreakMin: String(DEFAULT_CYCLE.longBreakMin),
    blocksPerSet: String(DEFAULT_CYCLE.blocksPerSet),
  });

  const cycleNums = {
    focusMin: Number(cycle.focusMin),
    shortBreakMin: Number(cycle.shortBreakMin),
    longBreakMin: Number(cycle.longBreakMin),
    blocksPerSet: Number(cycle.blocksPerSet),
  };
  const valid =
    mode === "stopwatch" ||
    (mode === "timer" && isValidMinutes(Number(minutes))) ||
    (mode === "cycle" &&
      isValidMinutes(cycleNums.focusMin) &&
      isValidMinutes(cycleNums.shortBreakMin) &&
      isValidMinutes(cycleNums.longBreakMin) &&
      Number.isInteger(cycleNums.blocksPerSet) &&
      cycleNums.blocksPerSet >= 1 &&
      cycleNums.blocksPerSet <= 12);

  function start() {
    const now = Date.now();
    if (mode === "timer") onStart(startTimer(Number(minutes), now, focusMode));
    else if (mode === "stopwatch") onStart(startStopwatch(now, focusMode));
    else onStart(startCycle(cycleNums, now, focusMode));
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Mode switcher */}
      <div className="grid grid-cols-3 gap-1 rounded-xl bg-zinc-100 p-1 dark:bg-zinc-900">
        {MODES.map((m) => (
          <button
            key={m.id}
            onClick={() => setMode(m.id)}
            className={`rounded-lg py-3 font-medium ${
              mode === m.id ? "bg-white shadow dark:bg-zinc-700" : "text-zinc-500"
            }`}
          >
            {m.label}
          </button>
        ))}
      </div>

      {mode === "timer" && (
        <div className="flex flex-col gap-3">
          <div className="grid grid-cols-4 gap-2">
            {PRESETS.map((p) => (
              <button
                key={p}
                onClick={() => setMinutes(String(p))}
                className={`rounded-lg border py-3 font-medium ${
                  minutes === String(p)
                    ? "border-sky-700 bg-sky-700 text-white"
                    : "border-zinc-300 dark:border-zinc-700"
                }`}
              >
                {p}
              </button>
            ))}
          </div>
          <NumberField label="Custom (minutes)" value={minutes} onChange={setMinutes} />
        </div>
      )}

      {mode === "stopwatch" && (
        <p className="text-center text-zinc-500">Counts up until you press Stop.</p>
      )}

      {mode === "cycle" && (
        <div className="grid grid-cols-2 gap-3">
          <NumberField
            label="Focus (min)"
            value={cycle.focusMin}
            onChange={(v) => setCycle({ ...cycle, focusMin: v })}
          />
          <NumberField
            label="Short break (min)"
            value={cycle.shortBreakMin}
            onChange={(v) => setCycle({ ...cycle, shortBreakMin: v })}
          />
          <NumberField
            label="Long break (min)"
            value={cycle.longBreakMin}
            onChange={(v) => setCycle({ ...cycle, longBreakMin: v })}
          />
          <NumberField
            label="Blocks per set"
            value={cycle.blocksPerSet}
            onChange={(v) => setCycle({ ...cycle, blocksPerSet: v })}
          />
        </div>
      )}

      {/* Focus mode toggle: applies to all three modes */}
      <div className="grid grid-cols-2 gap-2">
        {FOCUS_MODES.map((f) => (
          <button
            key={f.id}
            onClick={() => setFocusMode(f.id)}
            aria-pressed={focusMode === f.id}
            className={`flex flex-col gap-1 rounded-xl border-2 p-3 text-left ${
              focusMode === f.id
                ? "border-sky-700 bg-sky-50 dark:bg-sky-950"
                : "border-zinc-300 dark:border-zinc-700"
            }`}
          >
            <span className="font-semibold">{FOCUS_MODE_LABEL[f.id]}</span>
            <span className="text-sm text-zinc-500">{f.explanation}</span>
          </button>
        ))}
      </div>

      <button
        onClick={start}
        disabled={!valid}
        className="rounded-2xl bg-sky-700 py-5 text-xl font-semibold text-white hover:bg-sky-800 disabled:opacity-40"
      >
        Start
      </button>
    </div>
  );
}

function NumberField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="flex flex-col gap-1 text-sm text-zinc-500">
      {label}
      <input
        type="number"
        inputMode="numeric"
        min={1}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-lg border border-zinc-300 bg-transparent px-3 py-3 text-lg text-foreground dark:border-zinc-700"
      />
    </label>
  );
}
