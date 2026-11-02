import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
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
import { Page, TabContent } from "../_ui/page";

export const metadata: Metadata = {
  title: "More – Deep Nautilus",
};

const GRACE = LEAVE_GRACE_MS / 1000;
const CANCEL = CANCEL_WINDOW_MS / 1000;
const PAUSE_MIN = MAX_PAUSE_MS / 60_000;

// Help's groups, for the contents row: the short answers first, then the rules.
const GROUPS = [
  { id: "questions", title: "Questions" },
  { id: "sessions", title: "Sessions" },
  { id: "tank", title: "Your tank" },
  { id: "rewards", title: "Rewards" },
  { id: "planning", title: "Planning" },
] as const;

// The More tab (still at /help): Settings and Account at the top, then Help.
// Help only explains: short answers first (each linking to its full card),
// then the plain-language rules. Numbers come from the same constants the app uses.
export default function MorePage() {
  return (
    <Page>
      <PageHeader title="More" />
      <TabContent>
        <PaperCard as="section" aria-label="Settings and account" className="gap-0 py-1">
          <ul className="flex flex-col divide-y divide-line">
            <PageLink href="/settings" title="Settings" note="Appearance, alarm, graphics, install, notifications" />
            <PageLink href="/account" title="Account" note="Your email, your data, sign out" />
          </ul>
        </PaperCard>

        <div className="flex flex-col gap-2 pt-2">
          <h2 className="title-card">Help</h2>
          <p className="text-muted">Focus, and a fish grows in your tank. That&apos;s the whole idea. Here are the details.</p>
        </div>

        <nav aria-label="Help contents" className="flex flex-wrap gap-2">
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

        {/* ---------- Questions: one or two lines each, linking to the full card ---------- */}

        <GroupHeading id="questions" />

        <Questions title="Getting started">
          <QA q="What is Deep Nautilus?" more={{ href: "#card-fish", label: "Fish" }}>
            A study timer with an ocean tank. Focus for a while and a fish hatches; keep at it and your tank fills up.
          </QA>
          <QA q="What do I tap first?">
            Just Start. Everything under Change (length, task, sounds) can be set later, or never.
          </QA>
          <QA q="Why sign in with Google?">
            So your progress follows you to any device, with no password to remember. The app only gets your name,
            email and picture.
          </QA>
          <QA q="Phone, laptop, iPhone or Android?" more={{ href: "/settings", label: "Install the app" }}>
            Any of them: it runs in the browser, with the same account and progress everywhere. You can install it like
            an app, with no app store.
          </QA>
          <QA q="How much space does it take?">
            Almost none. The sounds are made as they play, so there&apos;s nothing big to download.
          </QA>
          <QA q="Who made it? Are there ads?">Made by a student, for studying with a few friends. No ads, ever.</QA>
          <QA q="Can I add friends?">Not yet. There are no leaderboards, and there won&apos;t be.</QA>
          <QA q="What does the name mean?" more={{ href: "#card-fish", label: "Fish" }}>
            A nautilus is a deep-sea creature. One arrives in your tank after {NAUTILUS.hours} hours of focus.
          </QA>
        </Questions>

        <Questions title="During a session">
          <QA q="Deep Focus or Open Focus?" more={{ href: "#card-focus", label: "Deep Focus or Open Focus" }}>
            Deep Focus: stay in the app; leaving for more than {GRACE} seconds ends it (the first time, it pauses
            instead). Open Focus: for studying on this device; leaving never ends it.
          </QA>
          <QA q="What if I get a call?" more={{ href: "#card-pause", label: "Pause" }}>
            In Deep Focus, your first time away over {GRACE} seconds pauses the session for up to {PAUSE_MIN} minutes,
            if you haven&apos;t used your pause. Come back in time and nothing is lost; the away time just doesn&apos;t
            count. Expecting calls? Use Open Focus, where leaving never ends it.
          </QA>
          <QA q="What if I need the restroom?" more={{ href: "#card-pause", label: "Pause" }}>
            Deep Focus: tap Pause, or just go: leaving pauses it once, for up to {PAUSE_MIN} minutes. Open Focus: just
            go; the time keeps counting.
          </QA>
          <QA q="What if the screen turns off?">
            Deep Focus keeps the screen awake. Locking it yourself counts as leaving. In Open Focus the screen can sleep
            and the time stays right.
          </QA>
          <QA q="What if my battery dies?">
            Finished sessions are already saved to your account. When you open the app again: in Deep Focus the session
            ends where the app closed, keeping the time before, with no bone. In Open Focus it asks whether to count the
            time you were away. A forgotten stopwatch asks &ldquo;Still going?&rdquo; after a few hours.
          </QA>
          <QA q="Started by accident?" more={{ href: "#card-cancel", label: `The ${CANCEL}-second cancel` }}>
            For the first {CANCEL} seconds the button says Cancel. Tap it and nothing is saved.
          </QA>
          <QA q="What if I fall asleep?" more={{ href: "#card-night", label: "Night mode" }}>
            Turn on Night mode in Session settings. If you miss a &ldquo;Still studying?&rdquo; check-in, the session
            ends at your last one, with no bone.
          </QA>
          <QA q="Too loud for a library?" more={{ href: "/settings#alarm", label: "Alarm" }}>
            The alarm is Gentle by default; Settings also has Chime and Silent. On iPhone, the silent switch mutes all
            the app&apos;s sounds.
          </QA>
          <QA q="Does it eat my battery?" more={{ href: "/settings", label: "Graphics" }}>
            The tank pauses whenever it&apos;s off screen, and sounds are off unless you pick one. Deep Focus keeps the
            screen on, which does use battery. On an older phone, set Graphics to Low in Settings.
          </QA>
        </Questions>

        <Questions title="Your progress">
          <QA q="Do fish die if I take a few days off?" more={{ href: "#card-bones", label: "Bones" }}>
            No. Nothing dies from time passing, so holidays are safe. Only quitting Deep Focus loses a fish.
          </QA>
          <QA q="How do I get rarer fish?" more={{ href: "#card-fish", label: "Fish" }}>
            Longer sessions make rarer fish more likely. Never guaranteed, but the odds get better at 25, 50 and 90
            minutes.
          </QA>
          <QA q="What are coins for?" more={{ href: "#card-coins", label: "Coins" }}>
            Every focus minute earns a coin. Spend them on decorations in the Shop.
          </QA>
          <QA q="How does the streak work?" more={{ href: "#card-streaks", label: "Streaks" }}>
            A day counts with {FISH_MIN_MINUTES}+ minutes of study or notes. One missed day a week is forgiven.
          </QA>
          <QA q="New phone: is my progress saved?">
            Yes, it&apos;s tied to your Google account. Only this device&apos;s settings (your setup, Appearance, Alarm,
            Graphics) and any session that hadn&apos;t uploaded yet stay behind.
          </QA>
        </Questions>

        <Questions title="Privacy">
          <QA q="What data is stored?" more={{ href: "/privacy", label: "Privacy policy" }}>
            Your Google name, email and picture, plus your sessions, tasks, saved cycles, decorations, skins and
            notification settings.
          </QA>
          <QA q="Who can see it?">
            Only you: each person can read only their own data. It&apos;s stored with Supabase, never sold, never shared,
            and there are no ads.
          </QA>
          <QA q="How do I delete my account?" more={{ href: "/account", label: "Account" }}>
            Email the address in Account, and your account and all its data will be deleted.
          </QA>
        </Questions>

        {/* ---------- How it works: the full rules ---------- */}

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
            <li>
              When time&apos;s up, an alarm rings until you tap Got it. In a library or class? It&apos;s Gentle by default;
              pick Chime (louder) or Silent (vibration and a pulsing screen) in Settings.
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

        <Card id="card-focus" title="Deep Focus or Open Focus">
          <Points>
            <li>
              <b>Deep Focus</b>: stay in the app. Leaving for more than {GRACE} seconds during focus ends it. The screen
              stays on.
            </li>
            <li>
              A phone call or something urgent? If your pause is unused, leaving uses it instead: the timer stands still
              for up to {PAUSE_MIN} minutes and carries on when you come back. A second long leave ends it.
            </li>
            <li>
              <b>Open Focus</b>: for studying on this same device. Use other apps freely; leaving never ends it.
            </li>
            <li>Locking your phone counts as leaving in Deep Focus.</li>
          </Points>
        </Card>

        <Card id="card-cancel" title={`The ${CANCEL}-second cancel`}>
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

        <Card id="card-pause" title="Pause (Deep Focus)">
          <Points>
            <li>
              Once per session (a cycle or a continued session still gets one), you can pause for up to {PAUSE_MIN} minutes. The button
              appears under the timer after the first {CANCEL} seconds.
            </li>
            <li>While paused you can leave the app. The timer stands still and paused time doesn&apos;t count: no minutes, coins or growth.</li>
            <li>
              Tap Resume, or after {PAUSE_MIN} minutes it carries on by itself. Then the {GRACE}-second leave
              rule is back on, so come back in time.
            </li>
            <li>If you leave for more than {GRACE} seconds with your pause unused, it pauses by itself, from the moment you left.</li>
            <li>Open Focus doesn&apos;t need a pause: leaving never ends it.</li>
          </Points>
        </Card>

        <Card id="card-night" title="Night mode">
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

        <Card id="card-fish" title="Fish">
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

        <Card id="card-bones" title="Bones">
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
            <li>Every notes session plants something new and helps an old plant grow.</li>
            <li>
              A continued session is one session, so one plant. Under {PLANT_MIN_MINUTES} minutes there&apos;s no plant
              (your minutes and coins still count).
            </li>
            <li>
              Each session of {PLANT_MIN_MINUTES}+ minutes also moves your oldest plant that isn&apos;t mature yet up one
              stage, so small plants never stay small.
            </li>
            <li>The new plant grows while you take notes, and the session&apos;s length sets the size it starts at:</li>
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
            <li>A failed notes session grows no plant and helps none. Plants never die, and nothing happens while you&apos;re away.</li>
          </Points>
        </Card>

        <GroupHeading id="rewards" />

        <Card id="card-coins" title="Coins">
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

        <Card id="card-streaks" title="Streaks">
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
      </TabContent>
      <BottomNav active="more" />
    </Page>
  );
}

// A row at the top of More that opens another page (Settings, Account).
function PageLink({ href, title, note }: { href: string; title: string; note: string }) {
  return (
    <li>
      <Link
        href={href}
        transitionTypes={["tab"]}
        className="flex min-h-14 items-center justify-between gap-3 py-2 transition-colors duration-(--dur-fast) hover:text-primary"
      >
        <span className="flex min-w-0 flex-col">
          <span className="font-semibold">{title}</span>
          <span className="truncate text-sm text-muted">{note}</span>
        </span>
        <span aria-hidden className="shrink-0 text-muted">
          ›
        </span>
      </Link>
    </li>
  );
}

// An eyebrow over each group of cards; the contents row jumps here.
function GroupHeading({ id }: { id: (typeof GROUPS)[number]["id"] }) {
  return (
    <h3 id={id} className="eyebrow scroll-mt-6 pt-3">
      {GROUPS.find((g) => g.id === id)!.title}
    </h3>
  );
}

// One group of short answers: a card of questions that open in place.
function Questions({ title, children }: { title: string; children: ReactNode }) {
  return (
    <PaperCard as="section" aria-label={title} className="gap-1">
      <h4 className="title-card">{title}</h4>
      <div className="flex flex-col divide-y divide-line">{children}</div>
    </PaperCard>
  );
}

// A question and its one- or two-line answer, with a link to the full card
// (or page) when there's more to read.
function QA({ q, more, children }: { q: string; more?: { href: string; label: string }; children: ReactNode }) {
  return (
    <details className="disclosure group">
      <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 py-2 font-semibold [&::-webkit-details-marker]:hidden">
        <span>{q}</span>
        <span aria-hidden className="shrink-0 text-muted transition-transform duration-(--dur) ease-snap group-open:rotate-90">
          ›
        </span>
      </summary>
      <div className="flex flex-col pb-2 leading-relaxed">
        <p>{children}</p>
        {more && (
          <Link href={more.href} className="inline-flex min-h-11 items-center self-start text-sm font-semibold text-primary">
            {more.label} ›
          </Link>
        )}
      </div>
    </details>
  );
}

function Card({ id, title, children }: { id?: string; title: string; children: ReactNode }) {
  return (
    <PaperCard as="section" id={id} aria-label={title} className="scroll-mt-6 gap-3 leading-relaxed">
      <h4 className="title-card">{title}</h4>
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
