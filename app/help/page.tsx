import type { Metadata } from "next";
import { Suspense, type ReactNode } from "react";
import { DECORATIONS, MILESTONE_LABEL } from "@/lib/decorations";
import { COIN_MIN_MINUTES, SKIN_UNLOCKS } from "@/lib/economy";
import { FISH_MIN_MINUTES, TANK_CAPACITY } from "@/lib/fish";
import { PLANT_MIN_MINUTES, PLANT_STAGE_LABEL, PLANTS_PER_TANK, PLANT_STAGES } from "@/lib/plants";
import { formatDuration } from "@/lib/stats";
import { EYED_AT, HATCH_AT } from "@/lib/brood";
import { NAUTILUS, ODDS, RARITIES, RARITY_LABEL, SPECIES } from "@/lib/species";
import { CANCEL_WINDOW_MS, CHECK_IN_GRACE_MS, CONTINUE_WINDOW_MS, LEAVE_GRACE_MS, MAX_PAUSE_MS } from "@/lib/timer";
import { BottomNav, PageHeader } from "../_nav/bottom-nav";
import { Card as PaperCard } from "../_ui/card";
import { Skeleton } from "../_ui/feedback";
import { Page, TabContent } from "../_ui/page";
import { Account } from "./account";

export const metadata: Metadata = {
  title: "How it works – Deep Nautilus",
};

const GRACE = LEAVE_GRACE_MS / 1000;
const CANCEL = CANCEL_WINDOW_MS / 1000;

// The page's groups, for the contents row at the top.
const GROUPS = [
  { id: "sessions", title: "Sessions" },
  { id: "tank", title: "Your tank" },
  { id: "rewards", title: "Rewards" },
  { id: "planning", title: "Planning" },
  { id: "account", title: "Account" },
] as const;

// Plain-language rules. Numbers come from the same constants the app uses.
export default function HelpPage() {
  return (
    <Page>
      <PageHeader title="How it works" />
      <TabContent>
        <p className="text-muted">Focus, and a fish grows in your tank. That&apos;s the whole idea. Here are the details.</p>

        <nav aria-label="On this page" className="flex flex-wrap gap-2">
          {GROUPS.map((g) => (
            <a
              key={g.id}
              href={`#${g.id}`}
              className="inline-flex min-h-11 items-center rounded-chip bg-card px-4 text-sm font-semibold shadow-[inset_0_0_0_1.5px_var(--line)] transition-[background-color,transform] duration-(--dur-fast) ease-snap hover:bg-soft active:scale-[0.97]"
            >
              {g.title}
            </a>
          ))}
        </nav>

        <GroupHeading id="sessions" />

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
          <ol className="flex flex-col gap-1 rounded-control bg-soft p-3 text-sm tabular-nums">
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

        <Card title="Continue a session">
          <Points>
            <li>
              When a session&apos;s time is up (or you stop a stopwatch), it goes into a break. For{" "}
              {CONTINUE_WINDOW_MS / 60_000} minutes you can tap <b>Continue</b> to keep going, the same again or with
              another length or task. Deep or Open Focus and Study or Notes stay the same.
            </li>
            <li>
              It all counts as one session: one egg (its odds use all the study time together), one entry in your
              stats, and history shows each part, like &ldquo;12 min study · 10 min break · 12 min study&rdquo;.
            </li>
            <li>Breaks never count as study time, coins or streaks, and it&apos;s safe to leave the app during one.</li>
            <li>
              Tap <b>Finish</b>, or let the {CONTINUE_WINDOW_MS / 60_000} minutes run out, and the session ends where
              its last part did. Giving up a later part loses only that part, like a block in a cycle.
            </li>
            <li>Continued by accident? The new part has its own {CANCEL}-second cancel, back to the break.</li>
          </Points>
        </Card>

        <Card title="Pause (Deep Focus)">
          <Points>
            <li>
              Once per session (a cycle or a continued session still gets one), you can pause for up to {MAX_PAUSE_MS / 60_000} minutes. The button
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

        <GroupHeading id="tank" />

        <Card title="Fish">
          <Points>
            <li>
              While you focus, your tank shows a fish egg on a rock. At {EYED_AT} minutes its eyes show; at{" "}
              {HATCH_AT} minutes it hatches into a tiny fry, and it stays a fry until the session ends.
            </li>
            <li>
              Every session with at least {FISH_MIN_MINUTES} minutes of focus ends with the fry hatching into one of{" "}
              {SPECIES.length} real species. Shorter ones don&apos;t hatch.
            </li>
            <li>
              Species come in five rarities ({RARITIES.map((r) => RARITY_LABEL[r]).join(", ")}). Longer sessions
              don&apos;t guarantee a rare fish, but they make one more likely:
            </li>
          </Points>
          <dl className="grid grid-cols-2 gap-2 text-sm">
            {ODDS.map((band, i) => (
              <Size
                key={band.from}
                label={ODDS[i + 1] ? `${band.from}–${ODDS[i + 1].from - 1} min` : `${band.from}+ min`}
                range={RARITIES.filter((r) => band.odds[r] > 0)
                  .map((r) => `${band.odds[r]}% ${RARITY_LABEL[r].toLowerCase()}`)
                  .join(" · ")}
              />
            ))}
          </dl>
          <Points>
            <li>Once a fish has hatched, it stays that species forever.</li>
            <li>
              Tap a fish in your tank to see what it is. The Sea life index (from Stats) shows every species: the ones
              you&apos;ve caught, and &ldquo;???&rdquo; for the rest.
            </li>
            <li>
              At {NAUTILUS.hours} hours of focus, a special guest joins your newest tank: the {NAUTILUS.name.toLowerCase()},
              this app&apos;s namesake.
            </li>
            <li>
              Each tank holds {TANK_CAPACITY} fish. The next one starts a new tank; swipe to see older tanks.
            </li>
          </Points>
        </Card>

        <Card title="Bones">
          <p>
            A bone means a fry or egg was lost: you gave up a timer, ended a cycle in its first block, or left Deep Focus. Nothing
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
            <li>
              Every notes session grows its own plant, like a fish for a study session. A continued session is one
              session, so one plant.
            </li>
            <li>
              The plant grows while you take notes, and the session&apos;s length decides how big it gets. Under{" "}
              {PLANT_MIN_MINUTES} minutes there&apos;s no plant (your minutes and coins still count).
            </li>
          </Points>
          <dl className="grid grid-cols-2 gap-2 text-sm">
            {PLANT_STAGES.slice(1).map((s, i, all) => (
              <Size
                key={s.stage}
                label={PLANT_STAGE_LABEL[s.stage]}
                range={all[i + 1] ? `${s.from}–${all[i + 1].from - 1} min` : `${formatDuration(s.from * 60)}+`}
              />
            ))}
          </dl>
          <Points>
            <li>
              When the session ends, its plant goes on the floor of your newest tank (up to {PLANTS_PER_TANK} per tank).
            </li>
            <li>A failed notes session grows no plant. Plants never die, and nothing happens while you&apos;re away.</li>
          </Points>
        </Card>

        <GroupHeading id="rewards" />

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

        <GroupHeading id="planning" />

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

        <GroupHeading id="account" />
        {/* Reads the login cookie, so it streams in per request. */}
        <Suspense fallback={<Skeleton className="h-40 rounded-card" />}>
          <Account />
        </Suspense>
      </TabContent>
      <BottomNav active="help" />
    </Page>
  );
}

// An eyebrow over each group of cards; the contents row jumps here.
function GroupHeading({ id }: { id: (typeof GROUPS)[number]["id"] }) {
  return (
    <h2 id={id} className="eyebrow scroll-mt-6 pt-3">
      {GROUPS.find((g) => g.id === id)!.title}
    </h2>
  );
}

function Card({ title, children }: { title: string; children: ReactNode }) {
  return (
    <PaperCard as="section" aria-label={title} className="gap-3 leading-relaxed">
      <h3 className="title-card">{title}</h3>
      {children}
    </PaperCard>
  );
}

function Points({ children }: { children: ReactNode }) {
  return <ul className="flex list-disc flex-col gap-1.5 pl-5 marker:text-muted">{children}</ul>;
}

function Size({ label, range }: { label: string; range: string }) {
  return (
    <div className="rounded-control bg-soft p-3">
      <dt className="font-semibold">{label}</dt>
      <dd className="text-muted">{range}</dd>
    </div>
  );
}
