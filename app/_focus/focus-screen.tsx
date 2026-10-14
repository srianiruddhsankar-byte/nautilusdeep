"use client";

import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { chime, unlockAudio } from "@/lib/feedback";
import { deriveAquarium, type Aquarium } from "@/lib/fish";
import { getServerSnapshot, getSnapshot, save, subscribe } from "@/lib/focus-storage";
import { flushPending, queueResult, startSync } from "@/lib/save-queue";
import { useSessions } from "@/lib/sessions-data";
import {
  FOCUS_MODE_LABEL,
  LEAVE_GRACE_MS,
  checkSession,
  endSession,
  formatClock,
  getStatus,
  isOpenFocus,
  type Result,
  type Session,
  type Status,
} from "@/lib/timer";
import { useWakeLock } from "@/lib/use-wake-lock";
import { LiveFish } from "../_tank/live-fish";
import { ResultFish } from "../_tank/result-fish";
import { Tank } from "../_tank/tank";
import { SetupForm } from "./setup-form";

// Every way a session ends goes through here. Order matters: the row is queued
// for saving before the result is shown, so nothing can end without being saved,
// and the result screen itself never saves (a refresh there can't save twice).
function endWith(result: Result, withChime = false) {
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

      const result = checkSession(session, t);
      if (result) return endWith(result, isVisible() && result.endedBy === "finished");

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

      // Back on screen: did they stay away more than 15 s of focus time?
      if (session.awaySince !== null) {
        const result = checkSession(session, t);
        if (result) return endWith(result);
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
  const needsConfirm = session.mode !== "stopwatch" && !isFinalBreak;

  function stop() {
    if (needsConfirm && !confirming) return setConfirming(true);
    const current = getSnapshot().session;
    // endSession treats a stop during the long break as a full finish.
    if (current) endWith(endSession(current, "stopped", Date.now()));
  }

  let label = "Focus";
  if (session.mode === "stopwatch") label = "Stopwatch";
  if (isCycle) {
    label =
      status.kind === "focus"
        ? `Focus ${status.focusBlock} of ${status.totalBlocks}`
        : status.kind === "shortBreak"
          ? "Short break"
          : "Long break";
  }

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
        <p className="text-sm text-zinc-500">{FOCUS_MODE_LABEL[open ? "open" : "deep"]}</p>
        <p
          className={`text-lg font-medium ${isFocus ? "text-sky-700 dark:text-sky-400" : "text-emerald-600 dark:text-emerald-400"}`}
        >
          {label}
        </p>
        <p className="text-7xl font-semibold tabular-nums sm:text-8xl">{time}</p>
      </div>

      <LiveFish session={session} now={now} />

      <p className="max-w-xs text-center text-zinc-500">{hint}</p>

      {/* Bottom of the screen = easy to reach one-handed. */}
      <button
        onClick={stop}
        className={`mt-auto w-full rounded-2xl py-5 text-xl font-semibold ${
          confirming
            ? "bg-red-600 text-white"
            : isFinalBreak
              ? "bg-sky-700 text-white hover:bg-sky-800"
              : "border-2 border-zinc-300 dark:border-zinc-700"
        }`}
      >
        {stopLabel}
      </button>
    </div>
  );
}

function ResultView({ result, aquarium }: { result: Result; aquarium: Aquarium | null }) {
  const { title, detail } = describe(result);
  const failed = result.outcome === "failed";

  return (
    <div className="flex flex-1 flex-col items-center gap-6 pt-4 text-center">
      <p className="text-sm text-zinc-500">
        {FOCUS_MODE_LABEL[result.focusMode === "open" ? "open" : "deep"]}
      </p>
      <h2 className={`text-3xl font-semibold ${failed ? "text-red-600" : "text-emerald-600"}`}>
        {title}
      </h2>
      <p className="text-zinc-500">{detail}</p>

      <ResultFish result={result} aquarium={aquarium} />

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

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-zinc-100 p-4 dark:bg-zinc-900">
      <dt className="text-sm text-zinc-500">{label}</dt>
      <dd className="text-2xl font-semibold tabular-nums">{value}</dd>
    </div>
  );
}

function describe(r: Result): { title: string; detail: string } {
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
