"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { totalMinutes } from "@/lib/cycle-blocks";
import { useCycles } from "@/lib/cycles";
import { setPreviewVolume, startPreview, stopPreview, usePreview } from "@/lib/ambience";
import {
  AMBIENCE_CHOICES,
  AMBIENCE_DESCRIPTION,
  AMBIENCE_LABEL,
  PREVIEW_SECONDS,
  previewTap,
  type AmbienceChoice,
} from "@/lib/ambience-logic";
import { loadPrefs, savePrefs } from "@/lib/prefs-store";
import {
  NIGHT_CUSTOM_MAX,
  NIGHT_CUSTOM_MIN,
  NIGHT_INTERVALS,
  NIGHT_TEST_INTERVAL,
  isNightInterval,
  type NightPrefs,
  type SetupPrefs,
} from "@/lib/setup-prefs";
import { checkInAlert } from "@/lib/alarm";
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
  { id: "chime", label: "Gentle chime" },
  { id: "vibrate", label: "Chime + buzz" },
  { id: "alarm", label: "Alarm" },
  { id: "pulse", label: "Silent pulse" },
];
// The 1-minute check-in is only for testing on your computer (npm run dev).
const NIGHT_CHOICES =
  process.env.NODE_ENV === "development" ? [NIGHT_TEST_INTERVAL, ...NIGHT_INTERVALS] : [...NIGHT_INTERVALS];
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
    stopPreview(); // a preview never carries on into a session
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

// Ocean sounds while you focus. One line until opened, so settings stay tidy.
// Tapping a sound chooses it AND plays a short preview; tap it again to stop.
// Previews never start a session, and stop when the list or settings close.
function Ambience({
  value,
  onChange,
}: {
  value: SetupPrefs["ambience"];
  onChange: (value: SetupPrefs["ambience"]) => void;
}) {
  const previewing = usePreview();
  const [listOpen, setListOpen] = useState(false);
  useEffect(() => () => stopPreview(), []); // settings closed

  function tap(choice: AmbienceChoice) {
    const result = previewTap(previewing, choice);
    onChange({ ...value, sound: result.choose });
    if (result.preview) startPreview(result.preview, value.volume);
    else stopPreview();
  }

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        onClick={() => {
          if (listOpen) stopPreview();
          setListOpen(!listOpen);
        }}
        aria-expanded={listOpen}
        className="flex items-center justify-between gap-3 text-left"
      >
        <span className="font-semibold">Ambience</span>
        <span className="text-sm text-sky-700 dark:text-sky-400">
          {AMBIENCE_LABEL[value.sound]} {listOpen ? "▾" : "›"}
        </span>
      </button>

      {listOpen && (
        <>
          <p className="text-xs text-zinc-500">
            Tap a sound to choose it and hear {PREVIEW_SECONDS} seconds. Tap again to stop.
          </p>
          <ul role="radiogroup" aria-label="Ambience" className="flex flex-col divide-y divide-zinc-200 dark:divide-zinc-800">
            {AMBIENCE_CHOICES.map((choice) => {
              const chosen = value.sound === choice;
              const playing = previewing === choice;
              return (
                <li key={choice}>
                  <button
                    type="button"
                    role="radio"
                    aria-checked={chosen}
                    onClick={() => tap(choice)}
                    className="flex w-full items-center gap-3 py-2.5 text-left"
                  >
                    <span
                      aria-hidden
                      className={`h-4 w-4 shrink-0 rounded-full border-2 ${
                        chosen ? "border-sky-700 bg-sky-700 shadow-[inset_0_0_0_2px_white] dark:shadow-[inset_0_0_0_2px_#0a0a0a]" : "border-zinc-400"
                      }`}
                    />
                    <span className="flex min-w-0 flex-1 flex-col">
                      <span className="font-medium">{AMBIENCE_LABEL[choice]}</span>
                      <span className="truncate text-sm text-zinc-500">{AMBIENCE_DESCRIPTION[choice]}</span>
                    </span>
                    {playing && (
                      <span className="shrink-0 rounded-full bg-sky-100 px-2.5 py-1 text-xs font-medium text-sky-800 dark:bg-sky-950 dark:text-sky-300">
                        ■ Stop
                      </span>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        </>
      )}

      {value.sound !== "off" && (
        <VolumeSlider
          value={value.volume}
          onChange={(volume) => {
            onChange({ ...value, volume });
            setPreviewVolume(volume); // hear the change on the preview too
          }}
        />
      )}
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
  const isPreset = (NIGHT_CHOICES as number[]).includes(night.intervalMin);
  const [customOpen, setCustomOpen] = useState(!isPreset);
  const [customText, setCustomText] = useState(isPreset ? "" : String(night.intervalMin));
  const customValid = isNightInterval(Number(customText)) && Number(customText) >= NIGHT_CUSTOM_MIN;

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
                <Chip
                  key={m}
                  on={!customOpen && night.intervalMin === m}
                  onClick={() => {
                    setCustomOpen(false);
                    onChange({ ...night, intervalMin: m });
                  }}
                >
                  {m === NIGHT_TEST_INTERVAL ? "1 (test)" : m}
                </Chip>
              ))}
              <Chip on={customOpen} onClick={() => setCustomOpen(true)}>
                Custom
              </Chip>
            </div>
            {customOpen && (
              <label className="flex items-center gap-2 pt-1 text-sm text-zinc-500">
                Every
                <input
                  type="number"
                  inputMode="numeric"
                  min={NIGHT_CUSTOM_MIN}
                  max={NIGHT_CUSTOM_MAX}
                  value={customText}
                  placeholder="40"
                  onChange={(e) => {
                    setCustomText(e.target.value);
                    const n = Number(e.target.value);
                    if (isNightInterval(n) && n >= NIGHT_CUSTOM_MIN) onChange({ ...night, intervalMin: n });
                  }}
                  className="w-20 rounded-lg border border-zinc-300 bg-transparent px-3 py-2 text-base text-foreground dark:border-zinc-700"
                />
                minutes{" "}
                {!customValid && customText !== "" && (
                  <span className="text-amber-600">
                    ({NIGHT_CUSTOM_MIN}–{NIGHT_CUSTOM_MAX})
                  </span>
                )}
              </label>
            )}
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-sm text-zinc-500">How it asks (tap to hear)</span>
            <div className="grid grid-cols-2 gap-1 rounded-xl bg-zinc-100 p-1 dark:bg-zinc-900">
              {NIGHT_STYLES.map((o) => (
                <button
                  key={o.id}
                  type="button"
                  aria-pressed={night.style === o.id}
                  onClick={() => {
                    onChange({ ...night, style: o.id });
                    checkInAlert(o.id); // a sample, so you know what you picked
                  }}
                  className={`rounded-lg py-2.5 text-sm font-medium ${
                    night.style === o.id ? "bg-white shadow dark:bg-zinc-700" : "text-zinc-500"
                  }`}
                >
                  {o.label}
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function Chip({ on, onClick, children }: { on: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={onClick}
      className={`rounded-full border px-4 py-2 text-sm font-medium ${
        on ? "border-sky-700 bg-sky-700 text-white" : "border-zinc-300 dark:border-zinc-700"
      }`}
    >
      {children}
    </button>
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
