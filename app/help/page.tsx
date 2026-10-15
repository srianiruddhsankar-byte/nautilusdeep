import type { Metadata } from "next";
import { Suspense, type ReactNode } from "react";
import { DECORATIONS, MILESTONE_LABEL } from "@/lib/decorations";
import { COIN_MIN_MINUTES, SKIN_UNLOCKS } from "@/lib/economy";
import { FISH_MIN_MINUTES, TANK_CAPACITY } from "@/lib/fish";
import { PLANTS_PER_TANK, PLANT_STAGES } from "@/lib/plants";
import { formatDuration } from "@/lib/stats";
import { EYED_AT, FRY_UNTIL, HATCH_AT } from "@/lib/brood";
import { CANCEL_WINDOW_MS, CHECK_IN_GRACE_MS, LEAVE_GRACE_MS, MAX_PAUSE_MS } from "@/lib/timer";
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

      <Card title="Pause (Deep Focus)">
        <Points>
          <li>
            Once per session (once per cycle set), you can pause for up to {MAX_PAUSE_MS / 60_000} minutes. The button
            appears under the timer after the first {CANCEL} seconds.
          </li>
          <li>While paused you can leave the app. The timer stands still and paused time doesn&apos;t count: no minutes, coins or growth.</li>
          <li>
            Tap Resume, or after {MAX_PAUSE_MS / 60_000} minutes it carries on by itself. Then the {GRACE}-second leave
            rule is back on, so come back in time.
          </li>
          <li>Open Focus doesn&apos;t need a pause: leaving never ends it.</li>
        </Points>
      </Card>

      <Card title="Night mode">
        <p>For late sessions, when you might nod off. Turn it on in Session settings.</p>
        <Points>
          <li>
            Every 20–60 minutes of focus (or a custom 10–120), a small banner asks <b>Still studying?</b> Tap it. The
            timer keeps running the whole time.
          </li>
          <li>
            It has its own sound, not the block alarm: a gentle chime, a chime with a buzz, a repeating alarm until
            you tap, or a silent pulse.
          </li>
          <li>
            No tap within {CHECK_IN_GRACE_MS / 60_000} minutes: the session ends quietly, counting only up to your last
            check-in (or the start, if you never answered one).
          </li>
          <li>
            Falling asleep isn&apos;t quitting: no bone, no lost fish. Your fish or plant grows from the time that
            counted.
          </li>
          <li>In a cycle, check-ins only come during focus, and tapping Got it on a break alarm counts as one.</li>
        </Points>
      </Card>

      <Card title="Ambience">
        <Points>
          <li>
            Five water sounds while you focus: <b>Rain</b>, <b>Waves</b>, <b>Whales</b>, <b>Stream</b> and{" "}
            <b>Night</b>. Pick one under Ambience in Session settings: tapping a sound plays a short preview.
          </li>
          <li>
            Your tank changes with it: rain on the surface, rolling waves, a whale passing far off with each call, a
            gentle current, or a darker night tank.
          </li>
          <li>It fades in when you start, keeps going through breaks, and fades out when the session ends or pauses.</li>
          <li>Tap the small speaker on the timer screen to pause it or change the volume.</li>
          <li>It gets quieter while an alarm or a &ldquo;Still studying?&rdquo; check-in sounds.</li>
          <li>On iPhone, the silent switch mutes it. It may pause while you&apos;re in another app.</li>
        </Points>
      </Card>

      <Card title="Fish">
        <Points>
          <li>
            While you focus, your tank shows a fish egg on a rock. At {EYED_AT} minutes its eyes show; at{" "}
            {HATCH_AT} minutes it hatches into a tiny fry, and from {FRY_UNTIL} minutes it&apos;s a small fish
            swimming with the others.
          </li>
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
            <b>Notes</b> sessions grow plants instead of fish.
          </li>
          <li>Notes on the Stopwatch can have a target time; the result shows how you did against it.</li>
          <li>Stats show study and notes separately.</li>
        </Points>
      </Card>

      <Card title="Plants">
        <Points>
          <li>Notes sessions grow one plant at a time. Their minutes add up across sessions.</li>
          <li>Sessions under {FISH_MIN_MINUTES} minutes don&apos;t count, same as fish.</li>
        </Points>
        <dl className="grid grid-cols-2 gap-2 text-sm">
          {PLANT_STAGES.slice(1).map((s) => (
            <Size
              key={s.stage}
              label={s.stage[0].toUpperCase() + s.stage.slice(1)}
              range={`at ${formatDuration(s.from * 60)}`}
            />
          ))}
        </dl>
        <Points>
          <li>
            When it matures, it&apos;s planted on the floor of your newest tank (up to {PLANTS_PER_TANK} per tank) and a new
            seed starts. Extra minutes carry over.
          </li>
          <li>A failed notes session adds no growth, and the plant looks a little wilted until your next notes session.</li>
          <li>Plants never die, and nothing happens while you&apos;re away.</li>
        </Points>
      </Card>

      <Card title="Coins">
        <Points>
          <li>Every focus minute earns a coin, from study and notes alike. Open Focus earns half.</li>
          <li>Sessions under {COIN_MIN_MINUTES} minutes and failed sessions earn nothing.</li>
          <li>Your balance is in the corner of the tank. Spend it in the Shop tab (or tap the balance).</li>
        </Points>
      </Card>

      <Card title="Decorations">
        <Points>
          <li>
            Buy decorations in the Shop ({Math.min(...DECORATIONS.flatMap((d) => (d.price ? [d.price] : [])))}–
            {Math.max(...DECORATIONS.flatMap((d) => (d.price ? [d.price] : [])))} coins). They&apos;re yours forever.
          </li>
          <li>To place one: tap it in Your items, then tap the sand. Tap a placed one to move it or put it away.</li>
          <li>Decorations sit behind your fish and plants, so they never get in the way.</li>
          <li>
            A few can&apos;t be bought, only earned:{" "}
            {DECORATIONS.filter((d) => d.milestone)
              .map((d) => `${d.name} (${MILESTONE_LABEL[d.milestone!].toLowerCase()})`)
              .join(", ")}
            .
          </li>
        </Points>
      </Card>

      <Card title="Tank skins">
        <p>New looks unlock with your total focus time (study + notes). Each tank can use any skin you&apos;ve unlocked.</p>
        <dl className="grid grid-cols-2 gap-2 text-sm">
          {SKIN_UNLOCKS.map((s) => (
            <Size key={s.id} label={s.name} range={s.hours === 0 ? "from the start" : `at ${s.hours} hours`} />
          ))}
        </dl>
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
