"use client";

import Link from "next/link";
import { useState } from "react";
import { cleanTaskName, taskKey, TASK_NAME_MAX } from "@/lib/task-name";
import { useTasks } from "@/lib/tasks";
import {
  DEFAULT_CYCLE,
  FOCUS_MODE_LABEL,
  SESSION_TYPE_LABEL,
  isValidMinutes,
  startCycle,
  startStopwatch,
  startTimer,
  withDetails,
  type FocusMode,
  type Mode,
  type Session,
  type SessionType,
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
const SESSION_TYPES: SessionType[] = ["study", "notes"];

export function SetupForm({ onStart }: { onStart: (session: Session) => void }) {
  const [sessionType, setSessionType] = useState<SessionType>("study");
  const [task, setTask] = useState("");
  const [target, setTarget] = useState(""); // blank = no target
  const [mode, setMode] = useState<Mode>("timer");
  const [focusMode, setFocusMode] = useState<FocusMode>("deep");
  const [minutes, setMinutes] = useState("25");
  const [cycle, setCycle] = useState({
    focusMin: String(DEFAULT_CYCLE.focusMin),
    shortBreakMin: String(DEFAULT_CYCLE.shortBreakMin),
    longBreakMin: String(DEFAULT_CYCLE.longBreakMin),
    blocksPerSet: String(DEFAULT_CYCLE.blocksPerSet),
  });

  // A target only makes sense when you stop the clock yourself.
  const hasTarget = sessionType === "notes" && mode === "stopwatch";
  const cycleNums = {
    focusMin: Number(cycle.focusMin),
    shortBreakMin: Number(cycle.shortBreakMin),
    longBreakMin: Number(cycle.longBreakMin),
    blocksPerSet: Number(cycle.blocksPerSet),
  };
  const validTarget = !hasTarget || target.trim() === "" || isValidMinutes(Number(target));
  const valid =
    validTarget &&
    (mode === "stopwatch" ||
      (mode === "timer" && isValidMinutes(Number(minutes))) ||
      (mode === "cycle" &&
        isValidMinutes(cycleNums.focusMin) &&
        isValidMinutes(cycleNums.shortBreakMin) &&
        isValidMinutes(cycleNums.longBreakMin) &&
        Number.isInteger(cycleNums.blocksPerSet) &&
        cycleNums.blocksPerSet >= 1 &&
        cycleNums.blocksPerSet <= 12));

  function start() {
    const now = Date.now();
    const session =
      mode === "timer"
        ? startTimer(Number(minutes), now, focusMode)
        : mode === "stopwatch"
          ? startStopwatch(now, focusMode)
          : startCycle(cycleNums, now, focusMode);
    onStart(
      withDetails(session, {
        sessionType,
        task, // blank = no task, exactly like before
        targetMinutes: hasTarget && target.trim() !== "" ? Number(target) : null,
      }),
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Study grows fish; notes don't (plants come later). */}
      <div className="grid grid-cols-2 gap-1 rounded-xl bg-zinc-100 p-1 dark:bg-zinc-900">
        {SESSION_TYPES.map((t) => (
          <button
            key={t}
            onClick={() => setSessionType(t)}
            aria-pressed={sessionType === t}
            className={`rounded-lg py-3 font-medium ${
              sessionType === t ? "bg-white shadow dark:bg-zinc-700" : "text-zinc-500"
            }`}
          >
            {SESSION_TYPE_LABEL[t]}
          </button>
        ))}
      </div>

      <TaskPicker value={task} onChange={setTask} />

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

      {hasTarget && (
        <NumberField
          label="Target (minutes, optional): finish in…"
          value={target}
          placeholder="e.g. 45"
          onChange={setTarget}
        />
      )}
      {sessionType === "notes" && !hasTarget && (
        <p className="text-center text-sm text-zinc-500">
          Want a target time? Use the Stopwatch and stop when your notes are done.
        </p>
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

// Optional: type a task, or tap one of your open tasks. Blank = no task.
function TaskPicker({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const { tasks } = useTasks();
  const open = (tasks ?? []).filter((t) => t.done_at === null).reverse(); // newest first
  const picked = cleanTaskName(value);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between gap-2 text-sm text-zinc-500">
        <label htmlFor="task">Task (optional)</label>
        <Link href="/tasks" className="text-sky-700 dark:text-sky-400">
          Manage tasks ›
        </Link>
      </div>
      <div className="relative">
        <input
          id="task"
          type="text"
          value={value}
          maxLength={TASK_NAME_MAX}
          placeholder="e.g. Biochem ch. 4"
          autoComplete="off"
          enterKeyHint="done"
          onChange={(e) => onChange(e.target.value)}
          className="w-full rounded-lg border border-zinc-300 bg-transparent py-3 pr-11 pl-3 text-lg dark:border-zinc-700"
        />
        {value !== "" && (
          <button
            type="button"
            onClick={() => onChange("")}
            aria-label="Clear task"
            className="absolute inset-y-0 right-0 w-11 text-xl text-zinc-500"
          >
            ×
          </button>
        )}
      </div>
      {open.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {open.map((t) => {
            const selected = picked !== null && taskKey(picked) === taskKey(t.name);
            return (
              <button
                key={t.id}
                type="button"
                aria-pressed={selected}
                onClick={() => onChange(selected ? "" : t.name)}
                className={`max-w-full truncate rounded-full border px-3 py-1.5 text-sm ${
                  selected
                    ? "border-sky-700 bg-sky-700 text-white"
                    : "border-zinc-300 dark:border-zinc-700"
                }`}
              >
                {t.name}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function NumberField({
  label,
  value,
  placeholder,
  onChange,
}: {
  label: string;
  value: string;
  placeholder?: string;
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
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-lg border border-zinc-300 bg-transparent px-3 py-3 text-lg text-foreground dark:border-zinc-700"
      />
    </label>
  );
}
