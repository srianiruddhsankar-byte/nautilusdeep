"use client";

import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import {
  CHECK_IN_ALARM_EVERY_MS,
  SESSION_DONE_ALARM,
  checkInAlert,
  phaseAlarm,
  startAlarm,
  useAlarm,
} from "@/lib/alarm";
import { syncAmbience, usePreview } from "@/lib/ambience";
import { AMBIENCE_LABEL, ambienceTarget, sceneFor, type AmbienceSound } from "@/lib/ambience-logic";
import { unlockAudio } from "@/lib/feedback";
import { deriveAquarium, type Aquarium } from "@/lib/fish";
import { getServerSnapshot, getSnapshot, save, subscribe } from "@/lib/focus-storage";
import { compareToTarget } from "@/lib/notes";
import { deriveGarden, type Garden } from "@/lib/plants";
import { flushPending, queueResult, startSync } from "@/lib/save-queue";
import { coinsFor } from "@/lib/economy";
import { updatePrefs } from "@/lib/prefs-store";
import { toRow } from "@/lib/session-record";
import { useSessions } from "@/lib/sessions-data";
import { useEconomy } from "@/lib/use-economy";
import {
  CANCEL_WINDOW_MS,
  FOCUS_MODE_LABEL,
  LEAVE_GRACE_MS,
  MAX_PAUSE_MS,
  SESSION_TYPE_LABEL,
  canPause,
  cancelWindowRemainingMs,
  checkInState,
  checkSession,
  confirmCheckIn,
  endPause,
  formatClock,
  getStatus,
  isFinalBreak,
  isNotes,
  isOpenFocus,
  isPaused,
  pauseRemainingMs,
  pressStop,
  startPause,
  type Result,
  type Session,
  type SessionAmbience,
  type SessionEnd,
  type Status,
} from "@/lib/timer";
import { useWakeLock } from "@/lib/use-wake-lock";
import { BottomNav } from "../_nav/bottom-nav";
import { StatsLine } from "../_stats/stats-line";
import { SeedlingCard } from "../_tank/live-plant";
import { ResultFish } from "../_tank/result-fish";
import { ResultPlant } from "../_tank/result-plant";
import { RunningTank } from "../_tank/running-tank";
import { SKINS } from "../_tank/skins";
import { Coin, Tank } from "../_tank/tank";
import { AlarmOverlay } from "./alarm-overlay";
import { SetupForm } from "./setup-form";
import { VolumeSlider } from "./setup-form";
import { InProgressBadge, MarkDone } from "./task-status";
import { TodayTasks } from "./today-tasks";

// Every way a session ends goes through here.
// - Cancelled (first 10 s): the session just disappears. Nothing is queued or
//   saved, no bone, no result screen: straight back to setup.
// - Ended: the row is queued for saving BEFORE the result is shown, so nothing
//   can end without being saved, and the result screen itself never saves (a
//   refresh there can't save twice).
function finish(end: SessionEnd, withAlarm = false) {
  if (end.status === "cancelled") {
    save({ session: null, result: null });
    return;
  }
  endWith(end.result, withAlarm);
}

function endWith(result: Result, withAlarm: boolean) {
  queueResult(result);
  save({ session: null, result });
  void flushPending();
  if (withAlarm) startAlarm(SESSION_DONE_ALARM);
}

// "Still studying?" answered (the banner, or "Got it" on a phase alarm): credit
// now runs to this moment. Checked first, so a tap that lands just after the
// deadline can't undo a session that has already ended.
function confirmNow() {
  const session = getSnapshot().session;
  if (!session) return;
  const t = Date.now();
  const check = checkSession(session, t);
  if (check.status !== "running") return finish(check);
  const next = confirmCheckIn(session, t);
  if (next !== session) save({ session: next, result: null });
}

export function FocusScreen() {
  // null until we've read localStorage in the browser (the server has none).
  const saved = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const session = saved?.session ?? null;
  const now = useSessionClock(session !== null);
  // The next session's task. Lives here so the Today card can fill it in.
  const [task, setTask] = useState("");

  // Upload any sessions that couldn't be saved earlier, and keep retrying.
  useEffect(() => startSync(), []);

  // Phones only play sound after a tap. Start does this, but after a refresh
  // mid-session there's been no tap yet: any tap on the page unlocks it again.
  useEffect(() => {
    document.addEventListener("pointerdown", unlockAudio);
    return () => document.removeEventListener("pointerdown", unlockAudio);
  }, []);

  // Fish are derived from the sessions, never stored separately.
  const { rows, error } = useSessions();
  const aquarium = useMemo(() => (rows ? deriveAquarium(rows) : null), [rows]);
  // Plants too: notes sessions grow them, derived the same way.
  const garden = useMemo(() => (rows ? deriveGarden(rows) : null), [rows]);
  // Coins, decorations and each tank's skin.
  const economy = useEconomy();

  // Ocean ambience: decide what should play (pure, tested) and let the engine
  // follow. It ducks while an alarm rings or a check-in waits, and stops when the
  // session ends or is cancelled (session becomes null).
  const alarm = useAlarm();
  const at = session ? (now ?? session.startedAt) : 0;
  const checkInDue = session !== null && checkInState(session, at).status === "due";
  // Silent while you've paused the sound, or the session itself is paused.
  const soundOff = (session?.ambience?.paused ?? false) || (session !== null && isPaused(session, at));
  const target = ambienceTarget({
    sound: session?.ambience?.sound,
    running: session !== null,
    paused: soundOff,
    volume: session?.ambience?.volume ?? 0,
    alerting: alarm !== null || checkInDue,
  });
  const targetSound = target?.sound ?? null;
  const targetGain = target?.gain ?? 0;
  useEffect(() => {
    syncAmbience(targetSound ? { sound: targetSound, gain: targetGain } : null);
  }, [targetSound, targetGain]);
  // Leaving Home (e.g. to another page) stops it too.
  useEffect(() => () => syncAmbience(null), []);
  // The tank's scene goes with it: the session's sound, or a preview on Home.
  const previewing = usePreview();
  const scene = sceneFor({ running: session !== null, sound: session?.ambience?.sound, paused: soundOff, previewing });
  const skinOf = (t: number) => SKINS[economy.skinIdOf(t)];

  const status = session ? getStatus(session, now ?? session.startedAt) : null;
  // Wake lock only for Deep Focus (Open Focus users are using the device anyway).
  // On for breaks too: a locked phone can't ring the "Break's over" alarm.
  useWakeLock(session !== null && !isOpenFocus(session) && status !== null && !status.finished);

  if (saved === null) return <p className="text-center text-zinc-500">Loading…</p>;
  // Running: just the timer. No navigation, nothing else to tap.
  if (session && status) {
    return (
      <>
        <RunningView
          session={session}
          status={status}
          now={now ?? session.startedAt}
          tank={{ aquarium, garden, skinOf, decorations: economy.owned, scene }}
        />
        <AlarmOverlay onDismiss={confirmNow} />
      </>
    );
  }
  if (saved.result) {
    return (
      <>
        <ResultView result={saved.result} aquarium={aquarium} garden={garden} onTaskDone={() => setTask("")} />
        <BottomNav active="home" />
        <AlarmOverlay />
      </>
    );
  }
  return (
    <>
      <AlarmOverlay />
      <StatsLine />
      <TodayTasks
        onPick={(name) => {
          setTask(name);
          scrollToStart();
        }}
      />
      <Tank
        aquarium={aquarium}
        garden={garden}
        error={error}
        skinOf={skinOf}
        decorations={economy.owned}
        coins={economy.balance}
        scene={scene}
      />
      <SeedlingCard garden={garden} />
      <SetupForm
        task={task}
        onTaskChange={setTask}
        onStart={(s) => {
          unlockAudio(); // this runs inside the Start tap, which phones require for sound
          // The id is generated here, once, and becomes the database row's id.
          save({ session: { ...s, id: crypto.randomUUID() }, result: null });
        }}
      />
      <BottomNav active="home" />
    </>
  );
}

// After picking a task from the Today card, bring the Start button into view.
function scrollToStart() {
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  document.getElementById("start-session")?.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "center" });
}

// Re-reads the clock while a session runs, and handles leaving/returning.
// The interval only refreshes the display: all timing comes from timestamps,
// so a throttled or frozen tab still shows the right time once it wakes.
function useSessionClock(active: boolean): number | null {
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    if (!active) return;
    let lastPhase: number | null = null;
    let promptedFor: number | null = null; // the check-in we've already chimed for
    let wasPaused = false;
    let lastRing = 0; // the "alarm" check-in style rings again every few seconds
    const isVisible = () => document.visibilityState === "visible";

    function tick() {
      const session = getSnapshot().session;
      if (!session) return;
      const t = Date.now();
      setNow(t);

      const check = checkSession(session, t);
      if (check.status !== "running") {
        const finished = check.status === "ended" && check.result.endedBy === "finished";
        return finish(check, isVisible() && finished);
      }

      // Ring when a focus block or break ends, but only if the app is on screen
      // (a hidden page can't be trusted to play sound, and you'd come back to a
      // screen that's already moved on).
      const status = getStatus(session, t);
      if (status.phaseIndex !== lastPhase) {
        if (lastPhase !== null && isVisible()) startAlarm(phaseAlarm(status));
        lastPhase = status.phaseIndex;
      }

      // The pause ran out by itself (not Resume): say so, since the leave rule is back on.
      const pausedNow = isPaused(session, t);
      if (wasPaused && !pausedNow && session.pause?.endedAt === null && isVisible()) {
        startAlarm({ title: "Pause over", detail: "The timer is running again." });
      }
      wasPaused = pausedNow;

      // Night mode: a gentle nudge (never the alarm) when a check-in comes due.
      const checkIn = checkInState(session, t);
      if (checkIn.status === "due" && session.checkIn) {
        const style = session.checkIn.style;
        if (checkIn.dueAt !== promptedFor) {
          promptedFor = checkIn.dueAt;
          lastRing = t;
          if (isVisible()) checkInAlert(style);
        } else if (style === "alarm" && t - lastRing >= CHECK_IN_ALARM_EVERY_MS && isVisible()) {
          lastRing = t;
          checkInAlert(style);
        }
      }
    }

    function onVisibilityChange() {
      const session = getSnapshot().session;
      if (!session) return;
      const t = Date.now();

      if (!isVisible()) {
        // Leaving (switching tabs, locking, closing, refreshing). Saved so it
        // still counts if the page is closed and reopened. Open Focus has no
        // leave rule, so there's nothing to record.
        if (!isOpenFocus(session) && session.awaySince === null) {
          save({ session: { ...session, awaySince: t }, result: null });
        }
        return;
      }

      // Back on screen: away more than 15 s of focus? (A leave that began in the
      // first 10 s counts as a cancel, not a failure.)
      if (session.awaySince !== null) {
        const check = checkSession(session, t);
        if (check.status !== "running") return finish(check);
        save({ session: { ...session, awaySince: null }, result: null });
      }
      // Don't ring for phases that ended while away.
      lastPhase = getStatus(session, t).phaseIndex;
      setNow(t);
    }

    // First frame: also covers coming back via a refresh or reopened tab.
    const frame = requestAnimationFrame(() => {
      onVisibilityChange();
      tick();
    });
    const interval = setInterval(tick, 250);
    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("pageshow", onVisibilityChange); // back/forward cache

    return () => {
      cancelAnimationFrame(frame);
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("pageshow", onVisibilityChange);
    };
  }, [active]);

  return now;
}

// Everything the running screen's tank needs, passed down from Home.
type RunningTankData = {
  aquarium: Aquarium | null;
  garden: Garden | null;
  skinOf: (tank: number) => (typeof SKINS)[keyof typeof SKINS];
  decorations: Parameters<typeof RunningTank>[0]["decorations"];
  scene: AmbienceSound | null;
};

function RunningView({
  session,
  status,
  now,
  tank,
}: {
  session: Session;
  status: Status;
  now: number;
  tank: RunningTankData;
}) {
  const [confirming, setConfirming] = useState(false);

  // A second tap is needed to give up; the first one expires after 3 s.
  useEffect(() => {
    if (!confirming) return;
    const id = setTimeout(() => setConfirming(false), 3000);
    return () => clearTimeout(id);
  }, [confirming]);

  const isFocus = status.kind === "focus";
  const isCycle = session.mode === "cycle";
  const open = isOpenFocus(session);
  // The cycle's last phase is a long break: every block is banked, so "Finish" is safe.
  const finalBreak = isFinalBreak(session, now);
  // First 10 s: the button is "Cancel" (computed from the start time, so it's right after a refresh).
  const cancelSeconds = Math.ceil(cancelWindowRemainingMs(session, now) / 1000);
  const cancellable = cancelSeconds > 0;
  const needsConfirm = !cancellable && session.mode !== "stopwatch" && !finalBreak;

  function stop() {
    if (needsConfirm && !confirming) return setConfirming(true);
    const current = getSnapshot().session;
    if (!current) return;
    // Honour what the button showed: a tap on "Cancel" cancels even if it lands a
    // moment after the 10 s mark (up to 1 s late).
    const t =
      cancellable && Date.now() < current.startedAt + CANCEL_WINDOW_MS + 1000
        ? current.startedAt
        : Date.now();
    // pressStop: cancel in the first 10 s, otherwise a normal stop (a stop during
    // the long break counts as a full finish).
    finish(pressStop(current, t));
  }

  let label = session.mode === "stopwatch" ? "Stopwatch" : "Focus";
  if (isCycle) {
    label =
      status.kind === "focus"
        ? `Focus ${status.focusBlock} of ${status.totalBlocks}`
        : status.kind === "shortBreak"
          ? "Short break"
          : "Long break";
  }

  // The task name replaces the generic label; a cycle keeps its block line under it.
  const task = session.task ?? null;
  const heading = task ?? label;
  const subheading = task && isCycle ? label : null;
  const notes = isNotes(session);

  // Countdowns round up so "0:01" shows until the very end, then "0:00".
  const time =
    status.remainingMs === null
      ? formatClock(status.elapsedMs)
      : formatClock(Math.ceil(status.remainingMs / 1000) * 1000);

  const losesWholeSession = !isCycle || status.focusBlock === 1;
  const paused = isPaused(session, now);
  const hint = paused
    ? "Paused. You can leave the app; the timer is stopped and nothing counts until you resume."
    : finalBreak
    ? "Last break. Every block is banked. Tap Finish whenever you're ready."
    : !isFocus
      ? `Break. It's safe to leave the app. Next: Focus ${status.focusBlock + 1} of ${status.totalBlocks}.`
      : open
        ? "Open Focus: you can use other apps on this device."
        : `Stay on this screen. Leaving for more than ${LEAVE_GRACE_MS / 1000} s fails ${
            losesWholeSession ? "the session" : "this block"
          }.`;

  let stopLabel = session.mode === "stopwatch" ? "Stop" : isCycle ? "End session" : "Give up";
  if (finalBreak) stopLabel = "Finish";
  if (cancellable) stopLabel = `Cancel · ${cancelSeconds}`;
  if (confirming) {
    stopLabel = !isFocus
      ? "Tap again to end"
      : losesWholeSession
        ? "Tap again: session fails"
        : "Tap again: this block is lost";
  }

  const checkIn = checkInState(session, now);

  return (
    // The running screen covers the whole window (no page header or nav), so it
    // can lay out for any shape:
    // - portrait (phones): time, then a compact tank, then the controls.
    // - landscape (laptops, phones turned sideways): the tank takes most of the
    //   screen, with the time and controls in a column beside it.
    <div className="fixed inset-0 z-30 overflow-y-auto bg-background">
      <div className="mx-auto grid min-h-full w-full max-w-md grid-rows-[auto_auto_1fr] gap-4 p-4 landscape:max-w-7xl landscape:grid-cols-[minmax(0,1fr)_minmax(15rem,22rem)] landscape:grid-rows-[1fr_1fr] landscape:gap-x-8">
        {/* What's running, and the time. */}
        <div className="flex flex-col items-center gap-3 landscape:col-start-2 landscape:row-start-1 landscape:self-end">
          {checkIn.status === "due" && (
            <CheckInBanner
              secondsLeft={Math.max(0, Math.ceil((checkIn.deadline - now) / 1000))}
              pulse={session.checkIn?.style === "pulse"}
            />
          )}
          <div className="flex flex-col items-center gap-1">
            <p className="flex items-center gap-1 text-sm text-zinc-500">
              {FOCUS_MODE_LABEL[open ? "open" : "deep"]}
              {notes && ` · ${SESSION_TYPE_LABEL.notes}`}
              {session.ambience && <SoundControl ambience={session.ambience} />}
            </p>
            <p
              className={`max-w-full truncate px-2 text-lg font-medium ${isFocus ? "text-sky-700 dark:text-sky-400" : "text-emerald-600 dark:text-emerald-400"}`}
            >
              {heading}
            </p>
            {subheading && <p className="text-sm text-zinc-500">{subheading}</p>}
            {task && <InProgressBadge taskName={task} />}
            <p
              className={`text-6xl font-semibold tabular-nums sm:text-7xl lg:text-8xl ${paused ? "text-zinc-400" : ""}`}
            >
              {time}
            </p>
          </div>
        </div>

        {/* The tank: compact in portrait; as big as the height allows in landscape. */}
        <div className="mx-auto w-full max-w-[calc(34svh*4/3)] landscape:col-start-1 landscape:row-span-2 landscape:row-start-1 landscape:max-w-[calc((100svh-6rem)*4/3)] landscape:self-center">
          <RunningTank session={session} now={now} {...tank} note={notes ? targetLine(session, status) : null} />
        </div>

        {/* Hint and buttons: at the bottom in portrait, easy to reach one-handed. */}
        <div className="flex w-full flex-col items-center gap-2 self-end landscape:col-start-2 landscape:row-start-2 landscape:self-start">
          <p className="max-w-xs text-center text-sm text-zinc-500">{hint}</p>
          {session.checkIn && !paused && (
            <p className="text-center text-sm text-zinc-500">
              Night mode · a check-in every {Math.round(session.checkIn.intervalMs / 60_000)} min
            </p>
          )}
          {paused ? (
            <PausePanel msLeft={pauseRemainingMs(session, now)} />
          ) : (
            canPause(session, now) && (
              <button
                type="button"
                onClick={() => {
                  const current = getSnapshot().session;
                  if (current) save({ session: startPause(current, Date.now()), result: null });
                }}
                className="rounded-xl px-4 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-900"
              >
                Pause · once, up to {MAX_PAUSE_MS / 60_000} min
              </button>
            )
          )}
          {cancellable && (
            <p className="text-center text-sm text-zinc-500">Started by accident? Cancel now and nothing is saved.</p>
          )}
          <button
            onClick={stop}
            aria-label={cancellable ? `Cancel session, ${cancelSeconds} seconds left` : undefined}
            className={`w-full rounded-2xl py-5 text-xl font-semibold tabular-nums ${
              confirming
                ? "bg-red-600 text-white"
                : cancellable
                  ? "bg-zinc-200 text-zinc-800 hover:bg-zinc-300 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-700"
                  : finalBreak
                    ? "bg-sky-700 text-white hover:bg-sky-800"
                    : "border-2 border-zinc-300 dark:border-zinc-700"
            }`}
          >
            {stopLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

function ResultView({
  result,
  aquarium,
  garden,
  onTaskDone,
}: {
  result: Result;
  aquarium: Aquarium | null;
  garden: Garden | null;
  onTaskDone: () => void;
}) {
  const { title, detail } = describe(result);
  const failed = result.outcome === "failed";
  const notes = isNotes(result);

  return (
    <div className="flex flex-1 flex-col items-center gap-6 pt-4 text-center">
      <p className="text-sm text-zinc-500">
        {FOCUS_MODE_LABEL[result.focusMode === "open" ? "open" : "deep"]}
        {notes && ` · ${SESSION_TYPE_LABEL.notes}`}
        {result.task && ` · ${result.task}`}
      </p>
      <h2 className={`text-3xl font-semibold ${failed ? "text-red-600" : "text-emerald-600"}`}>
        {title}
      </h2>
      <p className="text-zinc-500">{detail}</p>

      {/* The number that matters most, big. */}
      <p className="flex flex-col items-center">
        <span className="text-6xl font-semibold tabular-nums">{Math.floor(result.focusMs / 60_000)}</span>
        <span className="text-zinc-500">focus minutes</span>
      </p>
      <EarnedCoins result={result} />

      {notes ? <NotesResult result={result} garden={garden} /> : <ResultFish result={result} aquarium={aquarium} />}

      {(result.mode === "cycle" || result.lostMs >= 1000) && (
        <dl className="grid w-full grid-cols-2 gap-3 text-left">
          {result.mode === "cycle" && (
            <Stat label="Blocks completed" value={`${result.blocksCompleted} of ${result.totalBlocks}`} />
          )}
          {result.lostMs >= 1000 && <Stat label="Unfinished, not counted" value={formatClock(result.lostMs)} />}
        </dl>
      )}

      {/* One main action. Mark done is there, but quieter. */}
      <div className="mt-auto flex w-full flex-col items-center gap-3">
        {result.task && <MarkDone taskName={result.task} onDone={onTaskDone} />}
        <button
          onClick={() => save({ session: null, result: null })}
          className="w-full rounded-2xl bg-sky-700 py-5 text-xl font-semibold text-white hover:bg-sky-800"
        >
          New session
        </button>
      </div>
    </div>
  );
}

// Notes sessions grow no fish: show the target instead, while it runs…
// While paused: how long is left, and Resume. Calm, never a takeover.
function PausePanel({ msLeft }: { msLeft: number }) {
  return (
    <div className="flex w-full items-center justify-between gap-3 rounded-2xl bg-zinc-100 px-4 py-3 dark:bg-zinc-900">
      <span className="flex flex-col">
        <span className="font-semibold">Paused</span>
        <span className="text-sm text-zinc-500 tabular-nums">{formatClock(msLeft)} left, then it carries on</span>
      </span>
      <button
        type="button"
        onClick={() => {
          const current = getSnapshot().session;
          if (current) save({ session: endPause(current, Date.now()), result: null });
        }}
        className="rounded-xl bg-sky-700 px-5 py-3 font-semibold text-white hover:bg-sky-800"
      >
        Resume
      </button>
    </div>
  );
}

// The running screen's sound control: a small speaker next to the focus mode.
// Tap it for Pause / Play and volume, without leaving the session. A volume
// change is also remembered for next time.
function SoundControl({ ambience }: { ambience: SessionAmbience }) {
  const [open, setOpen] = useState(false);

  function update(patch: Partial<SessionAmbience>) {
    const current = getSnapshot().session;
    if (!current?.ambience) return;
    const next = { ...current.ambience, ...patch };
    save({ session: { ...current, ambience: next }, result: null });
    if (patch.volume !== undefined) updatePrefs({ ambience: { sound: next.sound, volume: next.volume } });
  }

  return (
    <span className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        aria-label={`Sound: ${AMBIENCE_LABEL[ambience.sound]}${ambience.paused ? ", paused" : ""}`}
        className="-my-1 flex h-8 w-8 items-center justify-center rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-900"
      >
        <SpeakerIcon off={ambience.paused} />
      </button>
      {open && (
        <span className="absolute top-full left-1/2 z-20 mt-2 flex w-64 -translate-x-1/2 flex-col gap-3 rounded-2xl border border-zinc-200 bg-background p-4 text-left shadow-lg dark:border-zinc-800">
          <span className="flex items-center justify-between gap-2">
            <span className="font-medium text-foreground">{AMBIENCE_LABEL[ambience.sound]}</span>
            <button
              type="button"
              onClick={() => update({ paused: !ambience.paused })}
              className="rounded-lg bg-zinc-100 px-3 py-1.5 font-medium text-foreground hover:bg-zinc-200 dark:bg-zinc-900 dark:hover:bg-zinc-800"
            >
              {ambience.paused ? "Play" : "Pause"}
            </button>
          </span>
          <VolumeSlider value={ambience.volume} onChange={(volume) => update({ volume })} />
          <button type="button" onClick={() => setOpen(false)} className="self-end text-sky-700 dark:text-sky-400">
            Done
          </button>
        </span>
      )}
    </span>
  );
}

function SpeakerIcon({ off }: { off: boolean }) {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M4 9.5h3.5L12 6v12l-4.5-3.5H4z" />
      {off ? <path d="m16 9.5 5 5m0-5-5 5" /> : <path d="M15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11" />}
    </svg>
  );
}

// Night mode: a small, calm banner at the top. The timer keeps running under it.
function CheckInBanner({ secondsLeft, pulse }: { secondsLeft: number; pulse: boolean }) {
  return (
    <button
      type="button"
      onClick={confirmNow}
      className={`flex w-full flex-col items-center gap-0.5 rounded-2xl px-4 py-3 text-center ${
        pulse ? "alarm-flash" : "bg-sky-100 dark:bg-sky-950"
      }`}
    >
      <span className="text-lg font-semibold">Still studying? Tap to continue</span>
      <span className="text-sm text-zinc-600 dark:text-zinc-300">
        No tap in {formatClock(secondsLeft * 1000)} and it ends at your last check-in.
      </span>
    </button>
  );
}

// The target line under the growing plant (notes stopwatch with a target), or null.
function targetLine(session: Session, status: Status): string | null {
  const target = session.targetMinutes ?? null;
  if (target === null) return null;
  const minutes = Math.floor(status.elapsedMs / 60_000);
  return minutes < target
    ? `Target ${target} min · ${target - minutes} min to go`
    : minutes === target
      ? `Target ${target} min · right on target`
      : `Target ${target} min · ${minutes - target} min over`;
}

// …and target vs actual at the end.
function NotesResult({ result, garden }: { result: Result; garden: Garden | null }) {
  const focusSeconds = Math.floor(result.focusMs / 1000);
  const showTarget = result.targetMinutes !== null && result.outcome !== "failed";
  return (
    <div className="flex w-full flex-col items-center gap-4">
      {showTarget && (
        <div className="flex w-full flex-col gap-1 rounded-2xl bg-zinc-100 px-4 py-4 dark:bg-zinc-900">
          <p className="text-xl font-semibold">{compareToTarget(focusSeconds, result.targetMinutes!).text}</p>
          <p className="text-sm text-zinc-500">Target: {result.targetMinutes} min</p>
        </div>
      )}
      <ResultPlant result={result} garden={garden} />
    </div>
  );
}

// "+25 coins" (Open Focus earns half). Nothing for failed or under-5-minute sessions.
function EarnedCoins({ result }: { result: Result }) {
  const coins = coinsFor(toRow(result, result.id ?? "legacy", null));
  if (coins === 0) return null;
  return (
    <p className="-mt-4 flex items-center gap-1.5 text-lg font-semibold text-amber-600 dark:text-amber-400">
      <Coin size={18} />+{coins} coins
      {result.focusMode === "open" && <span className="text-sm font-normal text-zinc-500">(Open Focus: half)</span>}
    </p>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-zinc-100 p-4 dark:bg-zinc-900">
      <dt className="text-sm text-zinc-500">{label}</dt>
      <dd className="text-2xl font-semibold tabular-nums">{value}</dd>
    </div>
  );
}

function describe(r: Result): { title: string; detail: string } {
  // Night mode: not a failure, just an honest record of the time that counted.
  if (r.endedBy === "checkin") {
    return {
      title: "Session ended",
      detail: `Ended at your last check-in — looks like you fell asleep. Credited: ${Math.floor(r.focusMs / 60_000)} min.`,
    };
  }
  if (isNotes(r)) {
    if (r.outcome === "failed") {
      return {
        title: "Notes session failed",
        detail:
          r.endedBy === "left"
            ? `You left the app for more than ${LEAVE_GRACE_MS / 1000} seconds. Only this session's time is lost.`
            : "You ended it early. Only this session's time is lost.",
      };
    }
    if (r.mode === "cycle" && r.endedBy !== "finished") {
      return { title: "Notes session ended", detail: "Your finished blocks still count." };
    }
    return { title: "Notes session done", detail: "Nice work getting it down on paper." };
  }
  if (r.outcome === "failed") {
    if (r.endedBy === "left") {
      return {
        title: "Session failed",
        detail: `You left the app for more than ${LEAVE_GRACE_MS / 1000} seconds during focus.`,
      };
    }
    return {
      title: "Session failed",
      detail:
        r.mode === "cycle"
          ? "You ended it during the first focus block."
          : "You gave up before the timer finished.",
    };
  }
  if (r.endedBy === "finished") {
    return {
      title: "Session complete",
      detail: r.mode === "cycle" ? "You finished the whole set." : "Time's up. Nice focus!",
    };
  }
  if (r.mode === "stopwatch") return { title: "Session complete", detail: "Stopwatch stopped." };

  // A cycle that ended early but had banked blocks: the checkpoints are kept.
  return {
    title: "Session ended",
    detail:
      r.endedBy === "left"
        ? "You left during a focus block, so only that block was lost."
        : r.lostMs > 0
          ? "You ended it mid-block, so only that block was lost."
          : "You ended it during a break, so nothing was lost.",
  };
}
