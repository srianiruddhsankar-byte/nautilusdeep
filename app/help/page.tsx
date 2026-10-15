import type { Metadata } from "next";
import { Suspense, type ReactNode } from "react";
import { FISH_MIN_MINUTES, TANK_CAPACITY } from "@/lib/fish";
import { CANCEL_WINDOW_MS, LEAVE_GRACE_MS } from "@/lib/timer";
import { BottomNav, PageHeader } from "../_nav/bottom-nav";
import { Account } from "./account";

export const metadata: Metadata = {
  title: "How it works – Deep Nautilus",
};

const GRACE = LEAVE_GRACE_MS / 1000;
const CANCEL = CANCEL_WINDOW_MS / 1000;

// Plain-language rules. Numbers come from the same constants the app uses.
export default function HelpPage() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-4 p-4">
      <PageHeader title="How it works" />
      <p className="text-zinc-600 dark:text-zinc-400">
        Focus, and a fish grows in your tank. That&apos;s the whole idea. Here are the details.
      </p>

      <Card title="Three ways to focus">
        <Points>
          <li>
            <b>Timer</b>: pick a length and count down. Reaching zero completes it.
          </li>
          <li>
            <b>Stopwatch</b>: counts up until you press Stop. Good when you don&apos;t know how long it&apos;ll take.
          </li>
          <li>
            <b>Cycle</b>: focus and breaks take turns, like the Pomodoro method.
          </li>
        </Points>
      </Card>

      <Card title="How cycles work">
        <p>A cycle is a list of blocks. Pomodoro looks like this:</p>
        <ol className="flex flex-col gap-1 rounded-xl bg-zinc-100 p-3 text-sm dark:bg-zinc-900">
          <li>Focus 25 → Break 5</li>
          <li>Focus 25 → Break 5</li>
          <li>Focus 25 → Break 5</li>
          <li>Focus 25 → Long break 15</li>
        </ol>
        <Points>
          <li>That&apos;s 100 minutes of focus in about 2 hours.</li>
          <li>Each focus block you finish is banked: your fish keeps it.</li>
          <li>Ending or leaving mid-block loses only that block. In the first block, there&apos;s nothing banked yet, so the fish is lost.</li>
          <li>Breaks are free: leave the app and rest.</li>
          <li>In the last long break, tap Finish whenever you&apos;re ready.</li>
          <li>Pick Pomodoro, 50/10 or Deep work, or set your own under Custom and save it with a name.</li>
        </Points>
      </Card>

      <Card title="Deep Focus or Open Focus">
        <Points>
          <li>
            <b>Deep Focus</b>: stay in the app. Leaving for more than {GRACE} seconds during focus ends it. The screen
            stays on.
          </li>
          <li>
            <b>Open Focus</b>: for studying on this same device. Use other apps freely; leaving never ends it.
          </li>
          <li>Locking your phone counts as leaving in Deep Focus.</li>
        </Points>
      </Card>

      <Card title={`The ${CANCEL}-second cancel`}>
        <p>
          Started by accident? For the first {CANCEL} seconds the button says <b>Cancel</b>. Tap it and the session
          disappears: nothing saved, nothing lost.
        </p>
      </Card>

      <Card title="Fish">
        <Points>
          <li>Every session with at least {FISH_MIN_MINUTES} minutes of focus hatches a fish. Shorter ones don&apos;t.</li>
          <li>The longer you focus, the bigger it grows:</li>
        </Points>
        <dl className="grid grid-cols-2 gap-2 text-sm">
          <Size label="Small" range={`${FISH_MIN_MINUTES}–24 min`} />
          <Size label="Medium" range="25–49 min" />
          <Size label="Large" range="50–89 min" />
          <Size label="Rare" range="90+ min" />
        </dl>
        <Points>
          <li>
            Each tank holds {TANK_CAPACITY} fish. The next one starts a new tank; swipe to see older tanks.
          </li>
        </Points>
      </Card>

      <Card title="Bones">
        <p>
          A bone means a fish was lost: you gave up a timer, ended a cycle in its first block, or left Deep Focus. Nothing
          ever dies from time passing. Holidays are safe.
        </p>
      </Card>

      <Card title="Study or Notes">
        <Points>
          <li>
            <b>Study</b> sessions grow fish.
          </li>
          <li>
            <b>Notes</b> sessions don&apos;t make fish. They&apos;ll grow plants in a future update.
          </li>
          <li>Notes on the Stopwatch can have a target time; the result shows how you did against it.</li>
          <li>Stats show study and notes separately.</li>
        </Points>
      </Card>

      <Card title="Tasks">
        <Points>
          <li>Add tasks with an optional due date. Pick one before you start, or start without one.</li>
          <li>A task shows In progress while a session runs on it.</li>
          <li>Tick tasks off any time, or tap Mark done after a session.</li>
        </Points>
      </Card>

      <Card title="Streaks">
        <Points>
          <li>A day counts when you do at least {FISH_MIN_MINUTES} minutes of study or notes.</li>
          <li>Your streak is how many of those days you&apos;ve strung together.</li>
          <li>
            <b>Streak freeze</b>: one missed day each week (Monday–Sunday) is forgiven automatically, shown with ❄. Two
            missed days in a row end the streak.
          </li>
          <li>Today isn&apos;t over until midnight, so an empty today never breaks it.</li>
        </Points>
      </Card>

      {/* Reads the login cookie, so it streams in per request. */}
      <Suspense fallback={<div className="h-36 rounded-2xl border border-zinc-200 dark:border-zinc-800" />}>
        <Account />
      </Suspense>

      <BottomNav active="help" />
    </main>
  );
}

function Card({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-3 rounded-2xl border border-zinc-200 p-4 leading-relaxed dark:border-zinc-800">
      <h2 className="font-semibold">{title}</h2>
      {children}
    </section>
  );
}

function Points({ children }: { children: ReactNode }) {
  return <ul className="flex list-disc flex-col gap-1.5 pl-5 marker:text-zinc-400">{children}</ul>;
}

function Size({ label, range }: { label: string; range: string }) {
  return (
    <div className="rounded-xl bg-zinc-100 p-3 dark:bg-zinc-900">
      <dt className="font-semibold">{label}</dt>
      <dd className="text-zinc-500">{range}</dd>
    </div>
  );
}
