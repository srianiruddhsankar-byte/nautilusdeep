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
import { Button } from "../_ui/button";
import { inputClass, NumberField } from "../_ui/field";
import { Chip, Segmented } from "../_ui/segmented";
import { Sheet } from "../_ui/sheet";
import { Switch } from "../_ui/switch";
import { CyclePicker, effectiveChoice, resolveCycle } from "./cycle-picker";

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

// Home's setup: a summary card ("Change" opens every option in a sheet) and the
// one Start button. The task is owned by the Home screen, so the Today card can
// fill it in.
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
  const taskName = cleanTaskName(task);

  function close() {
    stopPreview(); // previews stop when settings close
    setOpen(false);
  }

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
    <div className="flex flex-col gap-3">
      {/* What Start will do, in one card; tap to change any of it. */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        className="flex w-full items-center justify-between gap-3 rounded-card bg-card p-4 text-left shadow-card transition-colors duration-(--dur-fast) hover:bg-soft"
      >
        <span className="flex min-w-0 flex-col gap-0.5">
          <span className="eyebrow">Next session</span>
          <span className={`truncate font-semibold ${taskName ? "" : "text-muted"}`}>{taskName ?? "No task"}</span>
          <span className="truncate text-sm text-muted">
            {SESSION_TYPE_LABEL[prefs.sessionType]} · {modeSummary} · {FOCUS_MODE_LABEL[prefs.focusMode]}
            {prefs.ambience.sound !== "off" && ` · ${AMBIENCE_LABEL[prefs.ambience.sound]}`}
            {prefs.night.on && " · Night mode"}
          </span>
          {!valid && !cycleLoading && (
            <span className="text-sm font-semibold text-warn">Check the settings: a number needs fixing.</span>
          )}
        </span>
        <span className="shrink-0 text-sm font-semibold text-primary">Change</span>
      </button>

      <Button
        id="start-session"
        variant="primary"
        size="lg"
        onClick={() => start(Date.now())}
        disabled={!valid}
        className="truncate"
      >
        <PlayIcon />
        <span className="truncate">{cycleLoading ? "Loading…" : taskName ? `Start · ${taskName}` : "Start"}</span>
      </Button>

      <Sheet
        open={open}
        onClose={close}
        title="Session settings"
        action={
          <Button variant="quiet" size="sm" onClick={close} className="-mr-2 text-primary hover:text-primary">
            Done
          </Button>
        }
      >
        <div className="flex flex-col">
          <Group title="What">
            {/* Study grows fish; notes grow plants. */}
            <Segmented
              label="Session type"
              options={SESSION_TYPES.map((t) => ({ id: t, label: SESSION_TYPE_LABEL[t] }))}
              value={prefs.sessionType}
              onChange={(sessionType) => set({ sessionType })}
            />
            <TaskPicker value={task} onChange={onTaskChange} />
          </Group>

          <Group title="How long">
            <Segmented label="Timer type" options={MODES} value={prefs.mode} onChange={(mode) => set({ mode })} />

            {prefs.mode === "timer" && (
              <>
                <div className="grid grid-cols-4 gap-2" role="group" aria-label="Minutes">
                  {PRESETS.map((p) => (
                    <Chip
                      key={p}
                      on={prefs.minutes === String(p)}
                      onClick={() => set({ minutes: String(p) })}
                      className="px-2"
                    >
                      {p} min
                    </Chip>
                  ))}
                </div>
                <NumberField label="Or any length (minutes)" value={prefs.minutes} onChange={(minutes) => set({ minutes })} />
                {!isValidMinutes(Number(prefs.minutes)) && (
                  <p className="text-sm text-warn">Whole minutes, from 1 to 600.</p>
                )}
              </>
            )}

            {prefs.mode === "stopwatch" && <p className="text-sm text-muted">Counts up until you press Stop.</p>}

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
            {!validTarget && <p className="text-sm text-warn">The target needs whole minutes, from 1 to 600.</p>}
            {prefs.sessionType === "notes" && !hasTarget && (
              <p className="text-sm text-muted">Want a target time? Use the Stopwatch and stop when your notes are done.</p>
            )}
          </Group>

          <Group title="Focus">
            {/* Applies to all three timer types. */}
            <div className="grid grid-cols-2 gap-2" role="group" aria-label="Focus mode">
              {FOCUS_MODES.map((f) => {
                const on = prefs.focusMode === f.id;
                return (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => set({ focusMode: f.id })}
                    aria-pressed={on}
                    className={`flex flex-col gap-1 rounded-control p-3 text-left transition-shadow duration-(--dur) ease-snap ${
                      on ? "bg-card shadow-[inset_0_0_0_2px_var(--primary)]" : "shadow-[inset_0_0_0_1.5px_var(--line)] hover:bg-soft"
                    }`}
                  >
                    <span className="font-semibold">{FOCUS_MODE_LABEL[f.id]}</span>
                    <span className="text-sm text-muted">{f.explanation}</span>
                  </button>
                );
              })}
            </div>
          </Group>

          <Group title="Sound and night">
            <Ambience value={prefs.ambience} onChange={(ambience) => set({ ambience })} />
            <NightMode night={prefs.night} onChange={(night) => set({ night })} />
          </Group>
        </div>
      </Sheet>
    </div>
  );
}

// One section of the settings sheet: an eyebrow title, then its controls.
function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-3 border-t border-line py-5 first:border-t-0 first:pt-0">
      <h3 className="eyebrow">{title}</h3>
      {children}
    </section>
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
  useEffect(() => () => stopPreview(), []); // left Home

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
        className="-mx-2 flex min-h-11 items-center justify-between gap-3 rounded-control px-2 text-left"
      >
        <span className="font-semibold">Ambience</span>
        <span className="text-sm font-semibold text-primary">
          {AMBIENCE_LABEL[value.sound]} {listOpen ? "▾" : "›"}
        </span>
      </button>

      {listOpen && (
        <>
          <p className="text-sm text-muted">
            Tap a sound to choose it and hear {PREVIEW_SECONDS} seconds. Tap again to stop.
          </p>
          <ul role="radiogroup" aria-label="Ambience" className="flex flex-col divide-y divide-line">
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
                    className="flex min-h-14 w-full items-center gap-3 py-2 text-left"
                  >
                    <span
                      aria-hidden
                      className={`h-4.5 w-4.5 shrink-0 rounded-full transition-shadow duration-(--dur) ${
                        chosen
                          ? "bg-primary shadow-[inset_0_0_0_3px_var(--card)] ring-2 ring-primary"
                          : "shadow-[inset_0_0_0_2px_var(--muted)]"
                      }`}
                    />
                    <span className="flex min-w-0 flex-1 flex-col">
                      <span className="font-semibold">{AMBIENCE_LABEL[choice]}</span>
                      <span className="truncate text-sm text-muted">{AMBIENCE_DESCRIPTION[choice]}</span>
                    </span>
                    {playing && (
                      <span className="shrink-0 rounded-chip bg-soft px-2.5 py-1 text-xs font-semibold">■ Stop</span>
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
    <label className="flex min-h-11 items-center gap-3 text-sm text-muted">
      Volume
      <input
        type="range"
        min={0}
        max={1}
        step={0.05}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-11 flex-1 accent-primary"
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
      <Switch
        checked={night.on}
        onChange={(on) => onChange({ ...night, on })}
        label="Night mode"
        description={
          <>Asks &ldquo;Still studying?&rdquo; now and then. No answer in 2 min: it ends at your last check-in.</>
        }
      />

      {night.on && (
        <>
          <div className="flex flex-col gap-2">
            <span className="text-sm text-muted">Check in every (minutes of focus)</span>
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
              <label className="flex items-center gap-2 text-sm text-muted">
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
                  className={`${inputClass} w-24`}
                />
                minutes{" "}
                {!customValid && customText !== "" && (
                  <span className="text-warn">
                    ({NIGHT_CUSTOM_MIN}–{NIGHT_CUSTOM_MAX})
                  </span>
                )}
              </label>
            )}
          </div>
          <div className="flex flex-col gap-2">
            <span className="text-sm text-muted">How it asks (tap to hear)</span>
            <div className="grid grid-cols-2 gap-1 rounded-control bg-soft p-1" role="group" aria-label="Check-in sound">
              {NIGHT_STYLES.map((o) => {
                const on = night.style === o.id;
                return (
                  <button
                    key={o.id}
                    type="button"
                    aria-pressed={on}
                    onClick={() => {
                      onChange({ ...night, style: o.id });
                      checkInAlert(o.id); // a sample, so you know what you picked
                    }}
                    className={`min-h-11 rounded-[8px] text-sm font-semibold transition-colors duration-(--dur) ${
                      on ? "bg-card text-ink shadow-[0_1px_0_var(--line)]" : "text-muted hover:text-ink"
                    }`}
                  >
                    {o.label}
                  </button>
                );
              })}
            </div>
          </div>
        </>
      )}
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
      <div className="flex items-center justify-between gap-2 text-sm text-muted">
        <label htmlFor="task">Task (optional)</label>
        <Link href="/tasks" className="-my-2 inline-flex min-h-11 items-center font-semibold text-primary">
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
          className={`${inputClass} pr-11 text-lg`}
        />
        {value !== "" && (
          <button
            type="button"
            onClick={() => onChange("")}
            aria-label="Clear task"
            className="absolute inset-y-0 right-0 w-11 rounded-control text-xl text-muted"
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
              <Chip key={t.id} on={selected} onClick={() => onChange(selected ? "" : t.name)}>
                {t.name}
              </Chip>
            );
          })}
        </div>
      )}
    </div>
  );
}

function PlayIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5 shrink-0" fill="currentColor" aria-hidden>
      <path d="M8 5.5v13a1 1 0 0 0 1.5.86l10.4-6.5a1 1 0 0 0 0-1.72L9.5 4.64A1 1 0 0 0 8 5.5z" />
    </svg>
  );
}
