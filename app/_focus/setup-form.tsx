"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useCycles } from "@/lib/cycles";
import { cleanTaskName, taskKey, TASK_NAME_MAX } from "@/lib/task-name";
import { groupTasks, openTasksInOrder } from "@/lib/task-views";
import { useTasks } from "@/lib/tasks";
import {
  FOCUS_MODE_LABEL,
  SESSION_TYPE_LABEL,
  isValidMinutes,
  startCycleBlocks,
  startStopwatch,
  startTimer,
  withDetails,
  type FocusMode,
  type Mode,
  type Session,
  type SessionType,
} from "@/lib/timer";
import { useClock } from "@/lib/use-clock";
import { CyclePicker, DEFAULT_CHOICE, DEFAULT_CUSTOM, NumberField, resolveCycle } from "./cycle-picker";

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
const CHIPS = 8;

// The task is owned by the Home screen, so the Today card can fill it in.
export function SetupForm({
  task,
  onTaskChange,
  onStart,
}: {
  task: string;
  onTaskChange: (task: string) => void;
  onStart: (session: Session) => void;
}) {
  const [sessionType, setSessionType] = useState<SessionType>("study");
  const [target, setTarget] = useState(""); // blank = no target
  const [mode, setMode] = useState<Mode>("timer");
  const [focusMode, setFocusMode] = useState<FocusMode>("deep");
  const [minutes, setMinutes] = useState("25");
  const [cycleChoice, setCycleChoice] = useState(DEFAULT_CHOICE);
  const [custom, setCustom] = useState(DEFAULT_CUSTOM);
  const { cycles } = useCycles();
  const cycle = resolveCycle(cycleChoice, cycles, custom);

  // A target only makes sense when you stop the clock yourself.
  const hasTarget = sessionType === "notes" && mode === "stopwatch";
  const validTarget = !hasTarget || target.trim() === "" || isValidMinutes(Number(target));
  const valid =
    validTarget &&
    (mode === "stopwatch" ||
      (mode === "timer" && isValidMinutes(Number(minutes))) ||
      (mode === "cycle" && cycle.blocks !== null));

  function start() {
    const now = Date.now();
    const session =
      mode === "timer"
        ? startTimer(Number(minutes), now, focusMode)
        : mode === "stopwatch"
          ? startStopwatch(now, focusMode)
          : startCycleBlocks(cycle.blocks!, now, focusMode, cycle.name);
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

      <TaskPicker value={task} onChange={onTaskChange} />

      {/* Mode switcher */}
      <div className="grid grid-cols-3 gap-1 rounded-xl bg-zinc-100 p-1 dark:bg-zinc-900">
        {MODES.map((m) => (
          <button
            key={m.id}
            onClick={() => setMode(m.id)}
            aria-pressed={mode === m.id}
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
        <CyclePicker choice={cycleChoice} onChoice={setCycleChoice} custom={custom} onCustom={setCustom} />
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
        id="start-session"
        onClick={start}
        disabled={!valid}
        className="truncate rounded-2xl bg-sky-700 px-4 py-5 text-xl font-semibold text-white hover:bg-sky-800 disabled:opacity-40"
      >
        {cleanTaskName(task) ? `Start · ${cleanTaskName(task)}` : "Start"}
      </button>
    </div>
  );
}

// Optional: type a task, or tap one of your open tasks. Blank = no task.
function TaskPicker({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const { tasks } = useTasks();
  const clock = useClock();
  const open = useMemo(
    () => (tasks && clock ? openTasksInOrder(groupTasks(tasks, clock.now, clock.timeZone)) : []),
    [tasks, clock],
  );
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
          {open.slice(0, CHIPS).map((t) => {
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
