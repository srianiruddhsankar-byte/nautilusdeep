"use client";

import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { chime, unlockAudio } from "@/lib/feedback";
import { deriveAquarium, type Aquarium } from "@/lib/fish";
import { getServerSnapshot, getSnapshot, save, subscribe } from "@/lib/focus-storage";
import { compareToTarget } from "@/lib/notes";
import { flushPending, queueResult, startSync } from "@/lib/save-queue";
import { useSessions } from "@/lib/sessions-data";
import {
  CANCEL_WINDOW_MS,
  FOCUS_MODE_LABEL,
  LEAVE_GRACE_MS,
  SESSION_TYPE_LABEL,
  cancelWindowRemainingMs,
  checkSession,
  formatClock,
  getStatus,
  isNotes,
  isOpenFocus,
  pressStop,
  type Result,
  type Session,
  type SessionEnd,
  type Status,
} from "@/lib/timer";
import { useWakeLock } from "@/lib/use-wake-lock";
import { StatsLine } from "../_stats/stats-line";
import { LiveFish } from "../_tank/live-fish";
import { ResultFish } from "../_tank/result-fish";
import { Tank } from "../_tank/tank";
import { SetupForm } from "./setup-form";

// Every way a session ends goes through here.
// - Cancelled (first 10 s): the session just disappears. Nothing is queued or
//   saved, no bone, no result screen: straight back to setup.
// - Ended: the row is queued for saving BEFORE the result is shown, so nothing
//   can end without being saved, and the result screen itself never saves (a
//   refresh there can't save twice).
function finish(end: SessionEnd, withChime = false) {
  if (end.status === "cancelled") {
    save({ session: null, result: null });
    return;
  }
  endWith(end.result, withChime);
}

function endWith(result: Result, withChime: boolean) {
  queueResult(result);
  save({ session: null, result });
  void flushPending();
  if (withChime) chime();
}

export function FocusScreen() {
  // null until we've read localStorage in the browser (the server has none).
  const saved = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const session = saved?.session ?? null;
  const now = useSessionClock(session !== null);

  // Upload any sessions that couldn't be saved earlier, and keep retrying.
  useEffect(() => startSync(), []);

  // Fish are derived from the sessions, never stored separately.
  const { rows, error } = useSessions();
  const aquarium = useMemo(() => (rows ? deriveAquarium(rows) : null), [rows]);

  const status = session ? getStatus(session, now ?? session.startedAt) : null;
  // Wake lock only for Deep Focus: Open Focus users are using the device anyway.
  useWakeLock(
    session !== null &&
      !isOpenFocus(session) &&
      status !== null &&
      status.kind === "focus" &&
      !status.finished,
  );

  if (saved === null) return <p className="text-center text-zinc-500">Loading…</p>;
  if (session && status) {
    return <RunningView session={session} status={status} now={now ?? session.startedAt} />;
  }
  if (saved.result) return <ResultView result={saved.result} aquarium={aquarium} />;
  return (
    <>
      <StatsLine />
      <Tank aquarium={aquarium} error={error} />
      <SetupForm
        onStart={(s) => {
          unlockAudio(); // this runs inside the Start tap, which phones require for sound
          // The id is generated here, once, and becomes the database row's id.
          save({ session: { ...s, id: crypto.randomUUID() }, result: null });
        }}
      />
    </>
  );
}

// Re-reads the clock while a session runs, and handles leaving/returning.
// The interval only refreshes the display: all timing comes from timestamps,
// so a throttled or frozen tab still shows the right time once it wakes.
function useSessionClock(active: boolean): number | null {
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    if (!active) return;
    let lastPhase: number | null = null;
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

      // Chime when a focus block or break ends, but only if the app is on screen.
      const { phaseIndex } = getStatus(session, t);
      if (phaseIndex !== lastPhase) {
        if (lastPhase !== null && isVisible()) chime();
        lastPhase = phaseIndex;
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
      // Don't chime for phases that ended while away.
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

function RunningView({
  session,
  status,
  now,
}: {
  session: Session;
  status: Status;
  now: number;
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
  // The long break is the last phase: every block is banked, so "Finish" is safe.
  const isFinalBreak = status.kind === "longBreak";
  // First 10 s: the button is "Cancel" (computed from the start time, so it's right after a refresh).
  const cancelSeconds = Math.ceil(cancelWindowRemainingMs(session, now) / 1000);
  const cancellable = cancelSeconds > 0;
  const needsConfirm = !cancellable && session.mode !== "stopwatch" && !isFinalBreak;

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
  const hint = isFinalBreak
    ? "Last break. Every block is banked. Tap Finish whenever you're ready."
    : !isFocus
      ? `Break. It's safe to leave the app. Next: Focus ${status.focusBlock + 1} of ${status.totalBlocks}.`
      : open
        ? "Open Focus: you can use other apps on this device."
        : `Stay on this screen. Leaving for more than ${LEAVE_GRACE_MS / 1000} s fails ${
            losesWholeSession ? "the session" : "this block"
          }.`;

  let stopLabel = session.mode === "stopwatch" ? "Stop" : isCycle ? "End session" : "Give up";
  if (isFinalBreak) stopLabel = "Finish";
  if (cancellable) stopLabel = `Cancel · ${cancelSeconds}`;
  if (confirming) {
    stopLabel = !isFocus
      ? "Tap again to end"
      : losesWholeSession
        ? "Tap again: session fails"
        : "Tap again: this block is lost";
  }

  return (
    <div className="flex flex-1 flex-col items-center gap-6">
      <div className="flex flex-col items-center gap-1">
        <p className="text-sm text-zinc-500">
          {FOCUS_MODE_LABEL[open ? "open" : "deep"]}
          {notes && ` · ${SESSION_TYPE_LABEL.notes}`}
        </p>
        <p
          className={`max-w-full truncate px-2 text-lg font-medium ${isFocus ? "text-sky-700 dark:text-sky-400" : "text-emerald-600 dark:text-emerald-400"}`}
        >
          {heading}
        </p>
        {subheading && <p className="text-sm text-zinc-500">{subheading}</p>}
        <p className="text-7xl font-semibold tabular-nums sm:text-8xl">{time}</p>
      </div>

      {notes ? <NotesProgress session={session} status={status} /> : <LiveFish session={session} now={now} />}

      <p className="max-w-xs text-center text-zinc-500">{hint}</p>

      {/* Bottom of the screen = easy to reach one-handed. */}
      <div className="mt-auto flex w-full flex-col items-center gap-2">
        {cancellable && (
          <p className="text-sm text-zinc-500">Started by accident? Cancel now and nothing is saved.</p>
        )}
        <button
          onClick={stop}
          aria-label={cancellable ? `Cancel session, ${cancelSeconds} seconds left` : undefined}
          className={`w-full rounded-2xl py-5 text-xl font-semibold tabular-nums ${
            confirming
              ? "bg-red-600 text-white"
              : cancellable
                ? "bg-zinc-200 text-zinc-800 hover:bg-zinc-300 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-700"
                : isFinalBreak
                  ? "bg-sky-700 text-white hover:bg-sky-800"
                  : "border-2 border-zinc-300 dark:border-zinc-700"
          }`}
        >
          {stopLabel}
        </button>
      </div>
    </div>
  );
}

function ResultView({ result, aquarium }: { result: Result; aquarium: Aquarium | null }) {
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

      {notes ? <NotesResult result={result} /> : <ResultFish result={result} aquarium={aquarium} />}

      <dl className="grid w-full grid-cols-2 gap-3 text-left">
        <Stat label="Focus minutes" value={String(Math.floor(result.focusMs / 60_000))} />
        {result.mode === "cycle" && (
          <Stat
            label="Blocks completed"
            value={`${result.blocksCompleted} of ${result.totalBlocks}`}
          />
        )}
        {result.lostMs >= 1000 && (
          <Stat label="Unfinished, not counted" value={formatClock(result.lostMs)} />
        )}
      </dl>

      <button
        onClick={() => save({ session: null, result: null })}
        className="mt-auto w-full rounded-2xl bg-sky-700 py-5 text-xl font-semibold text-white hover:bg-sky-800"
      >
        New session
      </button>
    </div>
  );
}

// Notes sessions grow no fish: show the target instead, while it runs…
function NotesProgress({ session, status }: { session: Session; status: Status }) {
  const target = session.targetMinutes ?? null;
  const minutes = Math.floor(status.elapsedMs / 60_000);
  let line = "Notes session: no fish for this one. Plants come later.";
  if (target !== null) {
    line =
      minutes < target
        ? `Target ${target} min · ${target - minutes} min to go`
        : minutes === target
          ? `Target ${target} min · right on target`
          : `Target ${target} min · ${minutes - target} min over`;
  }
  return (
    <p className="w-full rounded-2xl bg-zinc-100 px-4 py-6 text-center font-medium dark:bg-zinc-900">
      {line}
    </p>
  );
}

// …and target vs actual at the end.
function NotesResult({ result }: { result: Result }) {
  const focusSeconds = Math.floor(result.focusMs / 1000);
  const showTarget = result.targetMinutes !== null && result.outcome !== "failed";
  return (
    <div className="flex w-full flex-col gap-1 rounded-2xl bg-zinc-100 px-4 py-6 dark:bg-zinc-900">
      <p className="text-xl font-semibold">
        {showTarget
          ? compareToTarget(focusSeconds, result.targetMinutes!).text
          : `Took ${Math.floor(focusSeconds / 60)} min`}
      </p>
      {showTarget && <p className="text-sm text-zinc-500">Target: {result.targetMinutes} min</p>}
      <p className="text-sm text-zinc-500">Notes sessions don&apos;t grow fish. Plants are coming later.</p>
    </div>
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
