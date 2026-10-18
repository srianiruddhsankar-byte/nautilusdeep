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
import { hasFinishedSession } from "@/lib/install-logic";
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
  canContinue,
  canPause,
  cancelWindowRemainingMs,
  continueSession,
  continueWindowRemainingMs,
  CONTINUE_WINDOW_MS,
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
  partStartedAt,
  pauseRemainingMs,
  pressStop,
  startPause,
  withChain,
  type Result,
  type Session,
  type SessionAmbience,
  type SessionEnd,
  type SessionUpdate,
  type Status,
} from "@/lib/timer";
import { describeParts } from "@/lib/session-parts";
import { resultMoments } from "@/lib/result-moments";
import type { SessionFacts } from "@/lib/fish";
import { useClock } from "@/lib/use-clock";
import { useWakeLock } from "@/lib/use-wake-lock";
import { BottomNav } from "../_nav/bottom-nav";
import { InstallAppCard } from "../_pwa/install-card";
import { StatsLine } from "../_stats/stats-line";
import { ResultFish } from "../_tank/result-fish";
import { ResultPlant } from "../_tank/result-plant";
import { RunningTank } from "../_tank/running-tank";
import { SKINS } from "../_tank/skins";
import { Coin, Tank } from "../_tank/tank";
import { useReducedMotion } from "../_tank/tank4/tank-loop";
import { Button, buttonClass } from "../_ui/button";
import { CountUp } from "../_ui/count-up";
import { Field, NumberField } from "../_ui/field";
import { ProgressBar, Skeleton } from "../_ui/feedback";
import { changeScreen, step, useLoadFade } from "../_ui/motion";
import { AlarmOverlay } from "./alarm-overlay";
import { NautilusMoment, StreakMoment } from "./result-moments";
import { SetupForm } from "./setup-form";
import { VolumeSlider } from "./setup-form";
import { InProgressBadge, MarkDone } from "./task-status";
import { TodayTasks } from "./today-tasks";

// Every way a session ends goes through here.
// - Cancelled (first 10 s): the session just disappears. Nothing is queued or
//   saved, no bone, no result screen: straight back to setup.
// Going to another screen (back to setup, or the result) cross-fades
// (changeScreen); a session that carries on just changes in place.
// - Updated: it carries on, changed (a stopwatch part stopped into its break, or
//   a cancelled continuation back in the break).
// - Ended: the row is queued for saving BEFORE the result is shown, so nothing
//   can end without being saved, and the result screen itself never saves (a
//   refresh there can't save twice).
function finish(end: SessionEnd | SessionUpdate, withAlarm = false) {
  if (end.status === "cancelled") {
    changeScreen(() => save({ session: null, result: null }));
    return;
  }
  if (end.status === "updated") {
    save({ session: end.session, result: null });
    return;
  }
  endWith(end.result, withAlarm);
}

function endWith(result: Result, withAlarm: boolean) {
  queueResult(result);
  changeScreen(() => save({ session: null, result }));
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

  const fade = useLoadFade(saved !== null); // Home fades in over its skeleton
  if (saved === null) return <HomeSkeleton />;
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
        <ResultView
          result={saved.result}
          rows={rows}
          aquarium={aquarium}
          garden={garden}
          onTaskDone={() => setTask("")}
        />
        <BottomNav active="home" />
        <AlarmOverlay />
      </>
    );
  }
  return (
    <>
      <AlarmOverlay />
      <div className={`flex flex-col gap-5 ${fade}`}>
        <StatsLine />
        <TodayTasks
          picked={task}
          onPick={(name) => {
            setTask(name);
            if (name) scrollToStart();
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
        <SetupForm
          task={task}
          onTaskChange={setTask}
          onStart={(s) => {
            unlockAudio(); // this runs inside the Start tap, which phones require for sound
            // The id is generated here, once, and becomes the database row's id.
            // withChain: when its time is up it can be continued (Continue session).
            const session = withChain({ ...s, id: crypto.randomUUID() });
            changeScreen(() => save({ session, result: null }));
          }}
        />
        <InstallAppCard finishedSession={hasFinishedSession(rows)} />
      </div>
      <BottomNav active="home" />
    </>
  );
}

// Home's shape while localStorage is read, so nothing jumps when it arrives.
function HomeSkeleton() {
  return (
    <div className="flex flex-col gap-5" aria-busy="true" aria-label="Loading">
      <Skeleton className="h-12" />
      <Skeleton className="h-28 rounded-card" />
      <Skeleton className="aspect-[4/3] rounded-tank" />
      <Skeleton className="h-24 rounded-card" />
      <Skeleton className="h-15" />
    </div>
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
    let wasWaiting: boolean | null = null; // in the break where you can continue
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
      if (check.status === "updated") return finish(check);
      if (check.status !== "running") {
        // A continuable session already rang when its time was up; when its
        // break runs out it just ends, quietly.
        const finished = check.status === "ended" && check.result.endedBy === "finished" && !session.chain;
        return finish(check, isVisible() && finished);
      }

      // Ring when a focus block or break ends, but only if the app is on screen
      // (a hidden page can't be trusted to play sound, and you'd come back to a
      // screen that's already moved on).
      const status = getStatus(session, t);
      // A timer part's time is up: the break where you can continue begins.
      if (status.waiting && wasWaiting === false && session.mode === "timer" && isVisible()) {
        startAlarm({ title: "Time's up", detail: `Take a break, or continue within ${CONTINUE_WINDOW_MS / 60_000} minutes.` });
      }
      wasWaiting = status.waiting;
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
      wasWaiting = getStatus(session, t).waiting;
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

// How far along the session is, for the bar under the time. A timer fills once;
// a cycle has one segment per focus block (a break counts its block as done); a
// notes stopwatch with a target fills toward the target. A plain stopwatch has
// no end, so it has no bar.
function progressOf(session: Session, status: Status): { value: number; steps: number; index: number; label: string } | null {
  const phaseMs = session.phases[status.phaseIndex]?.ms ?? null;
  if (session.mode === "cycle") {
    const value = status.kind === "focus" && phaseMs ? status.elapsedMs / phaseMs : 1;
    return {
      value,
      steps: status.totalBlocks,
      index: status.focusBlock - 1,
      label: `Block ${status.focusBlock} of ${status.totalBlocks}`,
    };
  }
  if (phaseMs) return { value: status.elapsedMs / phaseMs, steps: 1, index: 0, label: "Session progress" };
  const target = session.targetMinutes ?? null;
  if (target) return { value: status.elapsedMs / (target * 60_000), steps: 1, index: 0, label: "Progress to target" };
  return null;
}

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

  const waiting = status.waiting; // the break after a part, where you can continue
  const isFocus = status.kind === "focus" && !waiting;
  const isCycle = session.mode === "cycle";
  const open = isOpenFocus(session);
  // The cycle's last phase is a long break: every block is banked, so "Finish" is safe.
  const finalBreak = isFinalBreak(session, now);
  const continuable = canContinue(session, now);
  // First 10 s: the button is "Cancel" (computed from the start time, so it's right after a refresh).
  const cancelSeconds = Math.ceil(cancelWindowRemainingMs(session, now) / 1000);
  const cancellable = cancelSeconds > 0;
  const needsConfirm = !cancellable && session.mode !== "stopwatch" && !finalBreak && !waiting;

  function stop() {
    if (needsConfirm && !confirming) return setConfirming(true);
    const current = getSnapshot().session;
    if (!current) return;
    // Honour what the button showed: a tap on "Cancel" cancels even if it lands a
    // moment after the 10 s mark (up to 1 s late).
    const t =
      cancellable && Date.now() < partStartedAt(current) + CANCEL_WINDOW_MS + 1000
        ? partStartedAt(current)
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

  if (waiting) label = "Break";

  // The task name replaces the generic label; a cycle keeps its block line under
  // it. In the break you can continue in, "Break" leads and the task follows.
  const task = session.task ?? null;
  const heading = waiting ? label : (task ?? label);
  const subheading = waiting ? task : task && isCycle ? label : null;
  const notes = isNotes(session);

  // Countdowns round up so "0:01" shows until the very end, then "0:00".
  const windowMs = continuable ? continueWindowRemainingMs(session, now) : 0;
  const time = waiting
    ? formatClock(Math.ceil(windowMs / 1000) * 1000)
    : status.remainingMs === null
      ? formatClock(status.elapsedMs)
      : formatClock(Math.ceil(status.remainingMs / 1000) * 1000);

  // Only the first block (or part) loses the whole session; later ones only themselves.
  const losesWholeSession = !(isCycle || session.chain) || status.focusBlock === 1;
  const piece = isCycle ? "block" : "part";
  const paused = isPaused(session, now);
  const progress = waiting ? null : progressOf(session, status);
  const hint = paused
    ? "Paused. You can leave the app; the timer is stopped and nothing counts until you resume."
    : waiting
    ? "Nice work. This break doesn't count as study time, and it's safe to leave the app. Continue to keep the session going, or finish it."
    : finalBreak && continuable
    ? "Last break. Every block is banked. Continue for another set, or finish."
    : finalBreak
    ? "Last break. Every block is banked. Tap Finish whenever you're ready."
    : !isFocus
      ? `Break. It's safe to leave the app. Next: Focus ${status.focusBlock + 1} of ${status.totalBlocks}.`
      : open
        ? "Open Focus: you can use other apps on this device."
        : `Stay on this screen. Leaving for more than ${LEAVE_GRACE_MS / 1000} s ends ${
            losesWholeSession ? "the session" : `this ${piece}`
          }.`;

  let stopLabel = session.mode === "stopwatch" ? "Stop" : isCycle ? "End session" : "Give up";
  if (finalBreak || waiting) stopLabel = "Finish";
  if (cancellable) stopLabel = `Cancel · ${cancelSeconds}`;
  if (confirming) {
    stopLabel = !isFocus
      ? "Tap again to end"
      : losesWholeSession
        ? "Tap again to end the session"
        : `Tap again: this ${piece} won't count`;
  }
  // Calm in every state: never red. The confirm step only darkens the border.
  // Continue is the one primary action when it's offered; Finish is then calm.
  const stopClass = continuable
    ? buttonClass("outline", "lg")
    : finalBreak
    ? buttonClass("primary", "lg")
    : cancellable
      ? buttonClass("secondary", "lg")
      : confirming
        ? buttonClass("outline", "lg", "shadow-[inset_0_0_0_2px_var(--ink)]")
        : buttonClass("outline", "lg");

  const checkIn = checkInState(session, now);

  return (
    // The running screen covers the whole window (no page header or nav), so it
    // can lay out for any shape:
    // - portrait (phones): time, then a compact tank, then the controls.
    // - landscape (laptops, phones turned sideways): the tank takes most of the
    //   screen, with the time and controls in a column beside it.
    <div className="fixed inset-0 z-30 overflow-y-auto bg-paper">
      <div className="safe-pad mx-auto grid min-h-full w-full max-w-md grid-rows-[auto_auto_1fr] gap-5 landscape:max-w-7xl landscape:grid-cols-[minmax(0,1fr)_minmax(15rem,22rem)] landscape:grid-rows-[1fr_1fr] landscape:gap-x-8">
        {/* What's running, and the time. */}
        <div
          className="rise-in flex flex-col items-center gap-3 landscape:col-start-2 landscape:row-start-1 landscape:self-end"
          style={step(0)}
        >
          {checkIn.status === "due" && (
            <CheckInBanner
              secondsLeft={Math.max(0, Math.ceil((checkIn.deadline - now) / 1000))}
              pulse={session.checkIn?.style === "pulse"}
            />
          )}
          <div className="flex w-full flex-col items-center gap-1">
            <p className="flex items-center gap-1">
              <span className="eyebrow">
                {FOCUS_MODE_LABEL[open ? "open" : "deep"]}
                {notes && ` · ${SESSION_TYPE_LABEL.notes}`}
              </span>
              {session.ambience && <SoundControl ambience={session.ambience} />}
            </p>
            {/* A new phase (focus → break, the break you can continue in, a
                continued part) swaps in, so the change is noticed but quiet. */}
            <div key={`${status.phaseIndex}:${waiting}`} className="swap-in flex w-full flex-col items-center gap-1">
              <p className={`title-card max-w-full truncate px-2 ${isFocus ? "text-ink" : "text-success"}`}>{heading}</p>
              {subheading && <p className="text-sm text-muted">{subheading}</p>}
              {task && <InProgressBadge taskName={task} />}
              <p
                className={`numeral pt-2 text-[76px] transition-colors duration-(--dur-slow) sm:text-[88px] lg:text-[104px] ${paused ? "text-muted" : ""}`}
                aria-live="off"
              >
                {time}
              </p>
              {waiting && <p className="text-sm text-muted">left to continue</p>}
              {progress && (
                <div className="w-full max-w-xs pt-3">
                  <ProgressBar {...progress} muted={paused} />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* The tank: compact in portrait; as big as the height allows in landscape. */}
        <div
          style={step(1)}
          className="rise-in mx-auto w-full max-w-[calc(34svh*4/3)] landscape:col-start-1 landscape:row-span-2 landscape:row-start-1 landscape:max-w-[calc((100svh-6rem)*4/3)] landscape:self-center"
        >
          <RunningTank session={session} now={now} {...tank} note={notes ? targetLine(session, status) : null} />
        </div>

        {/* Hint and buttons: at the bottom in portrait, easy to reach one-handed. */}
        <div
          style={step(2)}
          className="rise-in flex w-full flex-col items-center gap-2 self-end landscape:col-start-2 landscape:row-start-2 landscape:self-start"
        >
          <p key={hint} className="swap-in max-w-xs text-center text-sm text-muted">
            {hint}
          </p>
          {session.checkIn && !paused && (
            <p className="text-center text-sm text-muted">
              Night mode · a check-in every {Math.round(session.checkIn.intervalMs / 60_000)} min
            </p>
          )}
          {paused ? (
            <PausePanel msLeft={pauseRemainingMs(session, now)} />
          ) : (
            canPause(session, now) && (
              <Button
                variant="quiet"
                size="sm"
                onClick={() => {
                  const current = getSnapshot().session;
                  if (current) save({ session: startPause(current, Date.now()), result: null });
                }}
              >
                Pause · once, up to {MAX_PAUSE_MS / 60_000} min
              </Button>
            )
          )}
          {cancellable && (
            <p className="text-center text-sm text-muted">
              {session.chain && session.chain.parts.length > 1
                ? "Continued by accident? Cancel now to go back to the break."
                : "Started by accident? Cancel now and nothing is saved."}
            </p>
          )}
          {continuable && <ContinuePanel session={session} windowMs={windowMs} />}
          <button
            type="button"
            onClick={stop}
            aria-label={cancellable ? `Cancel session, ${cancelSeconds} seconds left` : undefined}
            className={`${stopClass} tabular-nums`}
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
  rows,
  aquarium,
  garden,
  onTaskDone,
}: {
  result: Result;
  rows: SessionFacts[] | null;
  aquarium: Aquarium | null;
  garden: Garden | null;
  onTaskDone: () => void;
}) {
  const { title, detail } = describe(result);
  const notes = isNotes(result);
  const clock = useClock();
  const reduce = useReducedMotion();
  // What this session changed: the streak (if it grew) and the nautilus (once, at 100 hours).
  const moments = useMemo(
    () =>
      rows && clock && result.id
        ? resultMoments(rows, toRow(result, result.id, null), clock.now, clock.timeZone)
        : null,
    [rows, clock, result],
  );
  // Ended early: everything just fades in slowly, in place. No rising, no counting.
  const quiet = result.outcome === "failed";
  const arrive = quiet ? "calm-in" : "rise-in";
  // The nautilus waits until the fish has hatched (about 2.5 s; at once with reduced motion).
  const nautilusDelay = reduce ? 0 : notes ? 900 : 3000;

  return (
    <div className="flex flex-1 flex-col items-center gap-6 pt-2 text-center">
      <div className={`${arrive} flex flex-col items-center gap-2`} style={step(0)}>
        <p className="eyebrow">
          {FOCUS_MODE_LABEL[result.focusMode === "open" ? "open" : "deep"]}
          {notes && ` · ${SESSION_TYPE_LABEL.notes}`}
        </p>
        {result.task && <p className="max-w-full truncate text-sm text-muted">{result.task}</p>}
        {result.parts && result.parts.length > 1 && (
          <p className="max-w-xs text-sm text-muted">{describeParts(result.parts, notes ? "notes" : "study")}</p>
        )}
        <h2 className="title-page">{title}</h2>
        <p className="max-w-xs text-muted">{detail}</p>
      </div>

      {/* The number that matters most, big. */}
      <p className={`${arrive} flex flex-col items-center gap-1`} style={step(1)}>
        <span className="numeral text-[72px]">{Math.floor(result.focusMs / 60_000)}</span>
        <span className="eyebrow">focus minutes</span>
      </p>
      <EarnedCoins result={result} />
      {moments?.streak && <StreakMoment {...moments.streak} />}

      {notes ? <NotesResult result={result} garden={garden} /> : <ResultFish result={result} aquarium={aquarium} />}
      {moments?.nautilus && <NautilusMoment delayMs={nautilusDelay} />}

      {(result.mode === "cycle" || result.lostMs >= 1000) && (
        <dl className={`${arrive} grid w-full grid-cols-2 gap-3 text-left`} style={step(4)}>
          {result.mode === "cycle" && (
            <Stat label="Blocks completed" value={`${result.blocksCompleted} of ${result.totalBlocks}`} />
          )}
          {result.lostMs >= 1000 && <Stat label="Not counted" value={formatClock(result.lostMs)} />}
        </dl>
      )}

      {/* One main action. Mark done is there, but quieter. */}
      <div className={`${arrive} mt-auto flex w-full flex-col items-center gap-3`} style={step(5)}>
        {tasksOf(result).map((name) => (
          <MarkDone key={name} taskName={name} onDone={onTaskDone} />
        ))}
        <Button variant="primary" size="lg" onClick={() => changeScreen(() => save({ session: null, result: null }))}>
          New session
        </Button>
      </div>
    </div>
  );
}

// Every task a session worked on (a continued one can switch), for Mark done:
// the counted blocks' tasks, and the one you were on at the end.
function tasksOf(result: Result): string[] {
  const names = [...(result.parts ?? []).map((p) => (p.type === "focus" ? (p.task ?? null) : null)), result.task];
  const seen = new Set<string>();
  return names.filter((n): n is string => {
    if (!n || seen.has(n.toLowerCase())) return false;
    seen.add(n.toLowerCase());
    return true;
  });
}

// The break after a part: Continue (the one main action) keeps the session
// going, the same again by default. "Change" lets you pick another length (a
// timer) or task; Deep / Open Focus and Study / Notes stay as they are.
function ContinuePanel({ session, windowMs }: { session: Session; windowMs: number }) {
  const lastFocus = [...session.phases].reverse().find((p) => p.kind === "focus");
  const [changing, setChanging] = useState(false);
  const [minutes, setMinutes] = useState(String(lastFocus?.ms ? Math.round(lastFocus.ms / 60_000) : 25));
  const [task, setTask] = useState(session.task ?? "");
  const isTimer = session.mode === "timer";

  function go() {
    const current = getSnapshot().session;
    if (!current) return;
    const change = changing ? { task, ...(isTimer && { minutes: Number(minutes) }) } : {};
    const next = continueSession(current, Date.now(), change);
    if (next !== current) save({ session: next, result: null });
  }

  return (
    <div className="swap-in flex w-full flex-col items-center gap-2">
      {changing && (
        <div className="swap-in flex w-full flex-col gap-3 rounded-card bg-card p-4 shadow-card">
          {isTimer && <NumberField label="Minutes" value={minutes} onChange={setMinutes} />}
          <Field label="Task (optional)" value={task} onChange={(e) => setTask(e.target.value)} placeholder="No task" />
        </div>
      )}
      <Button variant="primary" size="lg" onClick={go}>
        Continue
      </Button>
      <Button variant="quiet" size="sm" onClick={() => setChanging(!changing)} aria-expanded={changing}>
        {changing ? "Keep it the same" : isTimer ? "Change length or task" : "Change task"}
      </Button>
      <span className="sr-only" aria-live="polite">
        {Math.ceil(windowMs / 60_000)} minutes left to continue
      </span>
    </div>
  );
}

// While paused: how long is left, and Resume. Calm, never a takeover.
function PausePanel({ msLeft }: { msLeft: number }) {
  return (
    <div className="swap-in flex w-full items-center justify-between gap-3 rounded-card bg-card px-4 py-3 shadow-card">
      <span className="flex flex-col text-left">
        <span className="font-semibold">Paused</span>
        <span className="text-sm text-muted tabular-nums">{formatClock(msLeft)} left, then it carries on</span>
      </span>
      <Button
        variant="primary"
        onClick={() => {
          const current = getSnapshot().session;
          if (current) save({ session: endPause(current, Date.now()), result: null });
        }}
      >
        Resume
      </Button>
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
        className="-my-3 flex h-11 w-11 items-center justify-center rounded-control text-muted hover:bg-soft hover:text-ink"
      >
        <SpeakerIcon off={ambience.paused} />
      </button>
      {open && (
        <span className="swap-in absolute top-full left-1/2 z-20 mt-1 flex w-64 -translate-x-1/2 flex-col gap-2 rounded-card bg-card p-4 text-left shadow-card">
          <span className="flex items-center justify-between gap-2">
            <span className="font-semibold">{AMBIENCE_LABEL[ambience.sound]}</span>
            <Button variant="secondary" size="sm" onClick={() => update({ paused: !ambience.paused })}>
              {ambience.paused ? "Play" : "Pause"}
            </Button>
          </span>
          <VolumeSlider value={ambience.volume} onChange={(volume) => update({ volume })} />
          <Button variant="quiet" size="sm" onClick={() => setOpen(false)} className="self-end text-primary">
            Done
          </Button>
        </span>
      )}
    </span>
  );
}

function SpeakerIcon({ off }: { off: boolean }) {
  return (
    <svg viewBox="0 0 24 24" className="h-4.5 w-4.5" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M4 9.5h3.5L12 6v12l-4.5-3.5H4z" />
      {off ? <path d="m16 9.5 5 5m0-5-5 5" /> : <path d="M15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11" />}
    </svg>
  );
}

// Night mode: a small, calm banner at the top. The timer keeps running under it.
// It swaps in when it appears (the "silent pulse" style has its own animation instead).
function CheckInBanner({ secondsLeft, pulse }: { secondsLeft: number; pulse: boolean }) {
  return (
    <button
      type="button"
      onClick={confirmNow}
      className={`flex w-full flex-col items-center gap-0.5 rounded-card px-4 py-3 text-center shadow-[inset_0_0_0_2px_var(--primary)] ${
        pulse ? "alarm-flash" : "swap-in bg-card"
      }`}
    >
      <span className="title-card">Still studying? Tap to continue</span>
      <span className="text-sm text-muted">
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

// Notes sessions grow no fish: target vs actual at the end, and the plant.
function NotesResult({ result, garden }: { result: Result; garden: Garden | null }) {
  const focusSeconds = Math.floor(result.focusMs / 1000);
  const showTarget = result.targetMinutes !== null && result.outcome !== "failed";
  return (
    <div className="flex w-full flex-col items-center gap-4">
      {showTarget && (
        <div className="flex w-full flex-col gap-1 rounded-card bg-card px-4 py-4 shadow-card">
          <p className="title-card">{compareToTarget(focusSeconds, result.targetMinutes!).text}</p>
          <p className="text-sm text-muted">Target: {result.targetMinutes} min</p>
        </div>
      )}
      <ResultPlant result={result} garden={garden} />
    </div>
  );
}

// "+25 coins" (Open Focus earns half). Nothing for failed or under-5-minute sessions.
// They count up from 0 once the minutes have arrived.
function EarnedCoins({ result }: { result: Result }) {
  const coins = coinsFor(toRow(result, result.id ?? "legacy", null));
  if (coins === 0) return null;
  return (
    <p className="rise-in -mt-3 flex items-center gap-1.5 text-lg font-semibold text-coin" style={step(2)}>
      <Coin size={18} />+<CountUp value={coins} from={0} delay={350} duration={900} /> coins
      {result.focusMode === "open" && <span className="text-sm font-normal text-muted">(Open Focus: half)</span>}
    </p>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1 rounded-card bg-soft p-4">
      <dt className="text-sm text-muted">{label}</dt>
      <dd className="numeral text-[28px]">{value}</dd>
    </div>
  );
}

// The words on the result screen. A session that ended early is described
// plainly and kindly: what happened, and that the next one starts fresh.
function describe(r: Result): { title: string; detail: string } {
  // Night mode: not a failure, just an honest record of the time that counted.
  if (r.endedBy === "checkin") {
    return {
      title: "Session ended",
      detail: `Ended at your last check-in — looks like you fell asleep. Credited: ${Math.floor(r.focusMs / 60_000)} min.`,
    };
  }
  const away = `You were away for more than ${LEAVE_GRACE_MS / 1000} seconds`;
  if (isNotes(r)) {
    if (r.outcome === "failed") {
      return {
        title: "Ended early",
        detail:
          r.endedBy === "left"
            ? `${away}, so this session's time doesn't count. Your plant keeps everything it had.`
            : "This session's time doesn't count. Your plant keeps everything it had.",
      };
    }
    if (r.mode === "cycle" && r.endedBy !== "finished") {
      return { title: "Notes session ended", detail: "Your finished blocks still count." };
    }
    return { title: "Notes session done", detail: "Nice work getting it down on paper." };
  }
  if (r.outcome === "failed") {
    if (r.endedBy === "left") {
      return { title: "Ended early", detail: `${away} during focus. The next session starts fresh.` };
    }
    return {
      title: "Ended early",
      detail:
        r.mode === "cycle"
          ? "It ended during the first focus block. The next session starts fresh."
          : "It ended before the timer finished. The next session starts fresh.",
    };
  }
  if (r.endedBy === "finished") {
    const continued = r.parts !== null && r.mode !== "cycle";
    return {
      title: "Session complete",
      detail: continued
        ? "Every part counts. Nice focus!"
        : r.mode === "cycle"
          ? "You finished the whole set."
          : r.mode === "stopwatch"
            ? "Stopwatch stopped."
            : "Time's up. Nice focus!",
    };
  }
  if (r.mode === "stopwatch") return { title: "Session complete", detail: "Stopwatch stopped." };

  // A cycle (or continued session) that ended early but had banked blocks:
  // the checkpoints are kept.
  const piece = r.mode === "cycle" ? "block" : "part";
  return {
    title: "Session ended",
    detail:
      r.endedBy === "left"
        ? `You left during a focus ${piece}, so only that ${piece} doesn't count.`
        : r.lostMs > 0
          ? `You ended it mid-${piece}, so only that ${piece} doesn't count.`
          : `You ended it during a break, so every ${piece} counts.`,
  };
}
