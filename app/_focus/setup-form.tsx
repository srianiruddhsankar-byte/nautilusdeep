"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { totalMinutes } from "@/lib/cycle-blocks";
import { useCycles } from "@/lib/cycles";
import { AMBIENCE_LABEL, type AmbienceChoice } from "@/lib/ambience-logic";
import { loadPrefs, savePrefs } from "@/lib/prefs-store";
import { NIGHT_INTERVALS, NIGHT_TEST_INTERVAL, type NightPrefs, type SetupPrefs } from "@/lib/setup-prefs";
import { formatDuration } from "@/lib/stats";
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
  type CheckInStyle,
  type FocusMode,
  type Mode,
  type Session,
  type SessionType,
} from "@/lib/timer";
import { useClock } from "@/lib/use-clock";
import { CyclePicker, NumberField, effectiveChoice, resolveCycle } from "./cycle-picker";

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
const NIGHT_STYLES: { id: CheckInStyle; label: string }[] = [
  { id: "chime", label: "Chime" },
  { id: "vibrate", label: "Chime + buzz" },
  { id: "pulse", label: "Silent pulse" },
];
// The 1-minute check-in is only for testing on your computer (npm run dev).
const NIGHT_CHOICES =
  process.env.NODE_ENV === "development" ? [NIGHT_TEST_INTERVAL, ...NIGHT_INTERVALS] : [...NIGHT_INTERVALS];
const CHIPS = 8;

const AMBIENCES: AmbienceChoice[] = ["off", "waves", "underwater", "calm"];

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
  // Only rendered in the browser (Home waits for localStorage), so reading it here is safe.
  const [prefs, setPrefs] = useState<SetupPrefs>(() => loadPrefs());
  const [open, setOpen] = useState(false);
  const set = (patch: Partial<SetupPrefs>) => setPrefs((p) => ({ ...p, ...patch }));

  const { cycles, loaded } = useCycles();
  const choice = effectiveChoice(prefs.cycleChoice, cycles, loaded);
  const cycle = resolveCycle(choice, cycles, prefs.custom);
  const cycleLoading = prefs.mode === "cycle" && choice === null;

  // A target only makes sense when you stop the clock yourself.
  const hasTarget = prefs.sessionType === "notes" && prefs.mode === "stopwatch";
  const validTarget = !hasTarget || prefs.target.trim() === "" || isValidMinutes(Number(prefs.target));
  const valid =
    validTarget &&
    (prefs.mode === "stopwatch" ||
      (prefs.mode === "timer" && isValidMinutes(Number(prefs.minutes))) ||
      (prefs.mode === "cycle" && cycle.blocks !== null));
  // Never hide a problem behind the summary (a cycle that's still loading isn't one).
  const showOptions = open || (!valid && !cycleLoading);
  const taskName = cleanTaskName(task);

  // `now` comes from the tap itself (read in the click handler, never during render).
  function start(now: number) {
    const session =
      prefs.mode === "timer"
        ? startTimer(Number(prefs.minutes), now, prefs.focusMode)
        : prefs.mode === "stopwatch"
          ? startStopwatch(now, prefs.focusMode)
          : startCycleBlocks(cycle.blocks!, now, prefs.focusMode, cycle.name);
    savePrefs({ ...prefs, cycleChoice: choice ?? prefs.cycleChoice }); // next time starts like this
    setOpen(false);
    onStart(
      withDetails(session, {
        sessionType: prefs.sessionType,
        task, // blank = no task, exactly like before
        targetMinutes: hasTarget && prefs.target.trim() !== "" ? Number(prefs.target) : null,
        checkIn: prefs.night.on ? { intervalMs: prefs.night.intervalMin * 60_000, style: prefs.night.style } : null,
        ambience: prefs.ambience,
      }),
    );
  }

  const modeSummary =
    prefs.mode === "timer"
      ? `${prefs.minutes} min timer`
      : prefs.mode === "stopwatch"
        ? hasTarget && prefs.target
          ? `Stopwatch · target ${prefs.target} min`
          : "Stopwatch"
        : cycle.blocks
          ? `${cycle.name ?? "Custom"} cycle · ${formatDuration(totalMinutes(cycle.blocks) * 60)}`
          : "Cycle";

  return (
    <div className="flex flex-col gap-4">
      {showOptions ? (
        <div className="flex flex-col gap-6 rounded-2xl border border-zinc-200 p-4 dark:border-zinc-800">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">Session settings</h2>
            {valid && (
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-lg px-3 py-1.5 text-sm font-medium text-sky-700 hover:bg-zinc-100 dark:text-sky-400 dark:hover:bg-zinc-900"
              >
                Done
              </button>
            )}
          </div>

          {/* Study grows fish; notes don't (plants come later). */}
          <Segmented
            options={SESSION_TYPES.map((t) => ({ id: t, label: SESSION_TYPE_LABEL[t] }))}
            value={prefs.sessionType}
            onChange={(sessionType) => set({ sessionType })}
          />

          <TaskPicker value={task} onChange={onTaskChange} />

          <Segmented options={MODES} value={prefs.mode} onChange={(mode) => set({ mode })} />

          {prefs.mode === "timer" && (
            <div className="flex flex-col gap-3">
              <div className="grid grid-cols-4 gap-2">
                {PRESETS.map((p) => (
                  <button
                    key={p}
                    onClick={() => set({ minutes: String(p) })}
                    aria-pressed={prefs.minutes === String(p)}
                    className={`rounded-lg border py-3 font-medium ${
                      prefs.minutes === String(p)
                        ? "border-sky-700 bg-sky-700 text-white"
                        : "border-zinc-300 dark:border-zinc-700"
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
              <NumberField label="Custom (minutes)" value={prefs.minutes} onChange={(minutes) => set({ minutes })} />
            </div>
          )}

          {prefs.mode === "stopwatch" && (
            <p className="text-center text-zinc-500">Counts up until you press Stop.</p>
          )}

          {prefs.mode === "cycle" && (
            <CyclePicker
              choice={prefs.cycleChoice}
              onChoice={(cycleChoice) => set({ cycleChoice })}
              custom={prefs.custom}
              onCustom={(custom) => set({ custom })}
            />
          )}

          {hasTarget && (
            <NumberField
              label="Target (minutes, optional): finish in…"
              value={prefs.target}
              placeholder="e.g. 45"
              onChange={(target) => set({ target })}
            />
          )}
          {prefs.sessionType === "notes" && !hasTarget && (
            <p className="text-center text-sm text-zinc-500">
              Want a target time? Use the Stopwatch and stop when your notes are done.
            </p>
          )}

          <Ambience value={prefs.ambience} onChange={(ambience) => set({ ambience })} />

          <NightMode night={prefs.night} onChange={(night) => set({ night })} />

          {/* Focus mode toggle: applies to all three modes */}
          <div className="grid grid-cols-2 gap-2">
            {FOCUS_MODES.map((f) => (
              <button
                key={f.id}
                onClick={() => set({ focusMode: f.id })}
                aria-pressed={prefs.focusMode === f.id}
                className={`flex flex-col gap-1 rounded-xl border-2 p-3 text-left ${
                  prefs.focusMode === f.id
                    ? "border-sky-700 bg-sky-50 dark:bg-sky-950"
                    : "border-zinc-300 dark:border-zinc-700"
                }`}
              >
                <span className="font-semibold">{FOCUS_MODE_LABEL[f.id]}</span>
                <span className="text-sm text-zinc-500">{f.explanation}</span>
              </button>
            ))}
          </div>
        </div>
      ) : (
        // One line of what Start will do; tap to change any of it.
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-expanded={false}
          className="flex w-full items-center justify-between gap-3 rounded-2xl border border-zinc-200 p-4 text-left hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-900"
        >
          <span className="flex min-w-0 flex-col">
            <span className={`truncate font-semibold ${taskName ? "" : "text-zinc-500"}`}>
              {taskName ?? "No task"}
            </span>
            <span className="truncate text-sm text-zinc-500">
              {SESSION_TYPE_LABEL[prefs.sessionType]} · {modeSummary} · {FOCUS_MODE_LABEL[prefs.focusMode]}
              {prefs.ambience.sound !== "off" && ` · ${AMBIENCE_LABEL[prefs.ambience.sound]}`}
              {prefs.night.on && " · Night mode"}
            </span>
          </span>
          <span className="shrink-0 text-sm font-medium text-sky-700 dark:text-sky-400">Change</span>
        </button>
      )}

      <button
        id="start-session"
        onClick={() => start(Date.now())}
        disabled={!valid}
        className="truncate rounded-2xl bg-sky-700 px-4 py-5 text-xl font-semibold text-white hover:bg-sky-800 disabled:opacity-40"
      >
        {cycleLoading ? "Loading…" : taskName ? `Start · ${taskName}` : "Start"}
      </button>
    </div>
  );
}

// Ocean sounds while you focus. Volume can also be changed during the session.
function Ambience({
  value,
  onChange,
}: {
  value: SetupPrefs["ambience"];
  onChange: (value: SetupPrefs["ambience"]) => void;
}) {
  return (
    <div className="flex flex-col gap-2">
      <span className="font-semibold">Ambience</span>
      <div className="grid grid-cols-2 gap-1 rounded-xl bg-zinc-100 p-1 sm:grid-cols-4 dark:bg-zinc-900">
        {AMBIENCES.map((sound) => (
          <button
            key={sound}
            type="button"
            aria-pressed={value.sound === sound}
            onClick={() => onChange({ ...value, sound })}
            className={`rounded-lg py-2.5 text-sm font-medium ${
              value.sound === sound ? "bg-white shadow dark:bg-zinc-700" : "text-zinc-500"
            }`}
          >
            {AMBIENCE_LABEL[sound]}
          </button>
        ))}
      </div>
      {value.sound !== "off" && <VolumeSlider value={value.volume} onChange={(volume) => onChange({ ...value, volume })} />}
    </div>
  );
}

export function VolumeSlider({ value, onChange }: { value: number; onChange: (volume: number) => void }) {
  return (
    <label className="flex items-center gap-3 text-sm text-zinc-500">
      Volume
      <input
        type="range"
        min={0}
        max={1}
        step={0.05}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="flex-1 accent-sky-700"
      />
    </label>
  );
}

// "Still studying?" check-ins, for late sessions where you might fall asleep.
function NightMode({ night, onChange }: { night: NightPrefs; onChange: (night: NightPrefs) => void }) {
  return (
    <div className="flex flex-col gap-3">
      <button
        type="button"
        role="switch"
        aria-checked={night.on}
        onClick={() => onChange({ ...night, on: !night.on })}
        className="flex items-center justify-between gap-3 text-left"
      >
        <span className="flex flex-col">
          <span className="font-semibold">Night mode</span>
          <span className="text-sm text-zinc-500">
            Asks &ldquo;Still studying?&rdquo; now and then. No answer in 2 min: it ends at your last check-in.
          </span>
        </span>
        <span
          aria-hidden
          className={`relative h-7 w-12 shrink-0 rounded-full transition-colors ${night.on ? "bg-sky-700" : "bg-zinc-300 dark:bg-zinc-700"}`}
        >
          <span
            className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-[left] ${night.on ? "left-6" : "left-1"}`}
          />
        </span>
      </button>

      {night.on && (
        <>
          <div className="flex flex-col gap-1">
            <span className="text-sm text-zinc-500">Check in every (minutes of focus)</span>
            <div className="flex flex-wrap gap-2">
              {NIGHT_CHOICES.map((m) => (
                <button
                  key={m}
                  type="button"
                  aria-pressed={night.intervalMin === m}
                  onClick={() => onChange({ ...night, intervalMin: m })}
                  className={`rounded-full border px-4 py-2 text-sm font-medium ${
                    night.intervalMin === m ? "border-sky-700 bg-sky-700 text-white" : "border-zinc-300 dark:border-zinc-700"
                  }`}
                >
                  {m === NIGHT_TEST_INTERVAL ? "1 (test)" : m}
                </button>
              ))}
            </div>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-sm text-zinc-500">How it asks</span>
            <Segmented options={NIGHT_STYLES} value={night.style} onChange={(style) => onChange({ ...night, style })} />
          </div>
        </>
      )}
    </div>
  );
}

function Segmented<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { id: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <div
      className="grid gap-1 rounded-xl bg-zinc-100 p-1 dark:bg-zinc-900"
      style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}
    >
      {options.map((o) => (
        <button
          key={o.id}
          onClick={() => onChange(o.id)}
          aria-pressed={value === o.id}
          className={`rounded-lg py-3 font-medium ${value === o.id ? "bg-white shadow dark:bg-zinc-700" : "text-zinc-500"}`}
        >
          {o.label}
        </button>
      ))}
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
