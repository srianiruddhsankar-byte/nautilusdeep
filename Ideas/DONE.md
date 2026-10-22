# Done

Ideas that have been built. Same rules as IDEAS.md: IDs never change, nothing is deleted. When an idea is built
it moves here from IDEAS.md with its ID, plus "Done in". `Reusable` marks ideas worth carrying to other apps.

The full rules for each feature live in CLAUDE.md; this file is the record of what shipped and when.

## Moved here from IDEAS.md

- **I-038 · Species art and the tank/scene redesign (Tank 4)**: every species, the nautilus, plants,
  decorations, eggs / fry, the bone and all 5 skins redrawn; realistic swimming with rope-mesh fish.
  - Done in: Phase 9, Stage C
  - Was: parked, then moved into Phase 9.
- **I-039 · Pause button (limited)** · `Reusable`: Deep Focus only, once per session, up to 5 minutes, paused
  time not credited.
  - Done in: right after Phase 8 (2026-10-15, commit 734e4ce). A "one free interruption" add-on followed on
    2026-10-20 (commit 4dfee37).
  - Was: rejected as a loophole, then reconsidered (see "Reconsidered" in IDEAS.md).

- **I-073 · "Was that a call?" late pause → the free interruption** · `Reusable`: in Deep Focus, if you leave
  for more than 15 s and haven't used your pause, the session pauses by itself (counted from when you left)
  instead of failing. Up to 5 min, once per session / cycle set / Continue chain; it IS the pause. A toast on
  return says the pause is used; with notifications on, a "Still away?" push comes a minute before it runs out.
  - Done in: hotfix 2026-10-20 (commit 4dfee37), built automatically instead of after the fact.
- **I-088 · Quiet alarm for libraries** · `Reusable`: "Alarm when time's up" in Session settings: Gentle (the
  default, a soft low two-note chime at about a third of the volume), Chime (the old three chimes), Silent
  (vibration + pulsing screen). Tapping a choice plays a sample.
  - Done in: hotfix 2026-10-20 (commit 4dfee37). Moved to More → Settings in Batch 2 (2026-10-22).

## Backfilled from CLAUDE.md (built before this folder had IDs)

### Foundations
- **I-040 · Google sign-in + deployed app** (Supabase auth, Vercel, "Hi, [name]", public privacy page).
  - Done in: Phase 1
- **I-041 · Timer, stopwatch and cycle modes, timestamp-based** · `Reusable`: elapsed time from stored
  timestamps, never counted ticks, so background tabs and refreshes stay correct.
  - Done in: Phase 2
- **I-042 · Deep Focus vs Open Focus** · `Reusable`: leaving fails Deep Focus; Open Focus is for studying on
  the same device.
  - Done in: Phase 2
- **I-043 · 10-second cancel window** · `Reusable`: cancel in the first 10 s and nothing is saved, no penalty.
  - Done in: Phase 5 (2026-10-15, commit 531c474)
- **I-044 · Save every session + offline queue** · `Reusable`: one raw record per session; finished sessions
  queue offline and upload later.
  - Done in: Phase 3

### Tank and progress
- **I-045 · The tank**: fish and bones derived from sessions, swimming fish with detail cards, dying fish on
  failure.
  - Done in: Phase 4
- **I-046 · Stats** · `Reusable`: home stats line, /stats with tiles, 7-day columns, heatmap, records, time of
  day, all derived from sessions.
  - Done in: Phase 5
- **I-047 · Streak freeze** · `Reusable`: one missed day per Mon–Sun week is forgiven.
  - Done in: Phase 6, Part 1

### Tasks and session types
- **I-048 · Tasks** · `Reusable`: title + optional due date; Today / Overdue / Upcoming / No date; Done history
  with focus time.
  - Done in: Phase 6
- **I-049 · Task on a session + "Mark done"**: pick a task before a session; running screen shows its name.
  - Done in: Phase 6
- **I-050 · Study / Notes session types** + optional notes target time (target vs actual).
  - Done in: Phase 6
- **I-051 · Saved and premade cycles, stored as blocks** · `Reusable`: Pomodoro, 50/10, Deep work; saved custom
  cycles.
  - Done in: Phase 6
- **I-052 · Help / "How it works" page**.
  - Done in: Phase 6
- **I-053 · Bottom navigation** (Home · Tasks · Shop · Stats · Help).
  - Done in: Phase 6 (Shop tab added in Phase 8)
- **I-054 · Night mode ("Still studying?" check-ins)** · `Reusable`: falling asleep ends the session at the last
  check-in, with no penalty.
  - Done in: between Phase 7 Parts 1 and 2 (2026-10-15, commit 0e3bdd8)

### Plants, coins, decorations and skins
- **I-055 · Plants**: one per notes session, scaled to its length (under 15 min no plant), and each session helps
  the oldest unfinished plant grow.
  - Done in: Phase 7, Part 1 (boosts added 2026-10-19)
- **I-056 · Coins**: 1 focus minute = 1 coin, Open Focus half, failed = 0.
  - Done in: Phase 7, Part 2
- **I-057 · Decorations**: shop + 4 milestone items, placed on the sand.
  - Done in: Phase 7, Part 2
- **I-058 · Skins unlocked by total hours** (Shallows, Pond, River, Lake, Deep), chosen per tank.
  - Done in: Phase 7, Part 2

### Sounds and species
- **I-059 · Ambience**: 5 generated water sounds (no audio files) and a tank that reacts to each.
  - Done in: Phase 8
- **I-060 · Fish species with a rarity roulette + Sea life index**: 18 saltwater species in 5 tiers; longer
  sessions raise the odds of rarer fish.
  - Done in: Phase 8 (pulled forward)
- **I-061 · The nautilus**: the namesake, unlocked at 100 hours, not in the roulette.
  - Done in: Phase 8

### Design and the installed app
- **I-062 · "Paper Tide" design system** · `Reusable`: tokens + shared components on every page.
  - Done in: Phase 9, Stage B
- **I-063 · Continue session** · `Reusable`: after a session, continue after a break; parts are linked
  ("12 min study · 10 min break · 12 min study"), break not counted.
  - Done in: Phase 9 (added between Stage C batches)
- **I-064 · Installable app (PWA) + install card** · `Reusable`.
  - Done in: Phase 10a
- **I-065 · "Time's up" push notifications** · `Reusable`.
  - Done in: Phase 10b-1
- **I-084 · Appearance: light / dark mode** · `Reusable`: System, Light or Dark, in Help → Account, saved on the
  device and applied before the first paint (no flash).
  - Done in: Phase 9, Stage E2 (2026-10-18)
- **I-085 · Motion** · `Reusable`: calm animations everywhere: screens cross-fading, the result screen counting
  up, streak / new species / nautilus moments, ticks popping, tab changes, sheets opening, stats animating in
  once per app open; all instant or a plain fade with reduced motion.
  - Done in: Phase 9, Stage E (E1 and E2, finished 2026-10-18)

## Quick wins

### Batch 1 · clearer words (2026-10-22)
- **I-096 · Explain the name in one line**: on the login page or in the about answers: "A nautilus is a deep-sea
  creature. One arrives in your tank after 100 hours."
  - Done in: Quick wins, Batch 1 (2026-10-22)
  - Related: P-037, I-066, I-061
- **I-068 · First-open guidance** · `Reusable`: answer the first-time questions on the screens themselves, not in
  Help: why Google sign-in, what to tap first, whether setup can be skipped.
  - Answers today: Google sign-in so your progress follows you to any device with no password to remember;
    tap Start (no setup needed, one tap); everything in "Change" can be set later.
  - Done in: Quick wins, Batch 1 (2026-10-22)
- **I-097 · Focus-mode hint at Start** · `Reusable`: one quiet line where you pick Deep or Open Focus: "Studying
  on this phone, or expecting a call? Choose Open Focus." Tells people about the escape hatch before a fish dies,
  not after.
  - Done in: Quick wins, Batch 1 (2026-10-22)
  - Related: P-019, P-023, I-042
- **I-109 · A welcoming empty tank** · `Reusable`: a brand-new user's tank is empty, so their first session is
  just an egg. Show one kind line in the empty tank ("Your first fish hatches after 5 minutes of focus") and let
  the egg sit in a tank that already has sand, plants of the skin and light, so it never looks broken.
  - Done in: Quick wins, Batch 1 (2026-10-22)
  - Related: P-034, I-068
- **I-110 · One sound tip by Ambience**: a single muted line under the Ambience choice: "On iPhone, the silent
  switch mutes sounds." Stops "the sounds don't work" confusion, and tells library users how to keep it quiet.
  - Done in: Quick wins, Batch 1 (2026-10-22)
  - Related: P-017, P-035, I-089
- **I-108 · A random sea fact** · `Reusable`: one short marine or freshwater fact in a quiet spot: during a break,
  on the result screen, or on Home ("Octopuses have three hearts"). A small reason to smile and to open the app.
  - Today: each of the 18 species already has a fact (shown in the Sea life index and tank cards), so the first
    version can reuse those, then add more.
  - Done in: Quick wins, Batch 1 (2026-10-22)
  - Related: I-060, P-001

### Batch 2 · More tab, Settings, Account, Help (2026-10-22)
- **I-089 · Separate Settings and Account pages** · `Reusable`: today Appearance, notifications, installing,
  your email and sign-out all live under Help → Account. Split them: **Settings** (Appearance, notifications,
  sounds, install the app), **Account** (email, privacy, sign out, delete account, I-072), and **Help** only
  explains things.
  - Done in: Quick wins, Batch 2 (2026-10-22). The Help tab became "More": Settings ›, Account ›, then Help.
  - Related: I-067, I-072, I-071
- **I-067 · Reorganise Help: short answers first, details after** · `Reusable`: split Help into "Questions"
  (short FAQ answers, grouped: Getting started · During a session · Your progress · Privacy) and "How it works"
  (today's cards), so it answers questions without getting crowded. Each answer is one or two lines and links
  to the full card.
  - Done in: Quick wins, Batch 2 (2026-10-22)
  - Related: I-066, I-068, I-069, I-071
- **I-066 · "What it is" in one sentence + before-you-download answers** · `Reusable`: one line that says what
  the app does, shown on the login page, plus a few short answers for someone deciding whether to try it.
  - Questions: What does it do? How is it different from other study apps? Do other people use it? Android,
    iPhone, laptop? How much space? Who made it? Are there ads? Can I add friends? Is it the same on phone and
    laptop? Does it eat my battery? What does "Deep Nautilus" mean?
  - Answers today: a web app, so it works in any browser on Android, iPhone and laptop, and installs like an app
    without an app store; tiny, since sounds are generated and there's nothing to download (P-015); made by
    one student for himself and friends; no ads, ever (I-037); no friends features yet (I-032). Same account and
    progress on phone and laptop, with a layout made for each. Battery: the tank pauses whenever it's off screen
    and sounds are off by default (P-014). "Do others use it?" can only be answered honestly after Phase 11.
  - Done in: Quick wins, Batches 1 (login words) and 2 (answers in More → Help), 2026-10-22
  - Related: P-020
- **I-069 · "What if…" answers for interruptions** · `Reusable`: short, honest answers about real life
  interrupting a session.
  - Questions and answers today:
    - An important call: in Deep Focus, your first time away over 15 s pauses the session by itself (the "free
      interruption", built 2026-10-20) for up to 5 min, if you haven't used your pause yet. Come back in time
      and nothing is lost; the away time just doesn't count. A second long leave, or staying away past 5 min,
      fails as before: a study fish dies (+1 bone, no coins), a notes session grows nothing. Plants never die.
      Banked cycle blocks and continued parts are kept. Open Focus never fails for leaving.
    - The restroom: in Deep Focus, tap Pause, or just go: if you haven't paused yet, leaving pauses it for you
      (once per session, up to 5 min, paused time doesn't count). In Open Focus, just go: the timer keeps
      running and counts.
    - The screen turning off: Deep Focus keeps the screen awake for the whole session; locking it yourself
      counts as leaving. In Open Focus the screen can sleep and the time stays right.
    - The battery dying: everything already finished is saved to your account and can't be lost. The session
      that was running is likely to end as failed in Deep Focus (it counts as leaving); check what happens in
      Open Focus.
  - Done in: Quick wins, Batch 2 (2026-10-22)
  - Related: P-019, I-039, I-073
- **I-071 · Trust & privacy answers** · `Reusable`: plain answers to "What data do you collect? Is it safe? If I
  delete my account, is it gone? If I change phone, is my progress saved? Do you sell my data?"
  - Answers today: your Google name, email and picture, plus your sessions, tasks, cycles, decorations and
    push settings; stored with Supabase, each person can only read their own rows; never sold, no ads, not
    shared. A new phone keeps everything (it's tied to your Google account), except settings saved on the
    device (setup, Appearance) and any session that hadn't uploaded yet. Deleting today = emailing the owner.
  - Done in: Quick wins, Batches 1 (privacy page) and 2 (answers in More → Help), 2026-10-22
  - Related: I-072, P-018
- **I-101 · Link Privacy from Help** · `Reusable`: today Help never links to the privacy page. One link in Help
  (or Account, I-089).
  - Done in: Quick wins, Batch 2 (2026-10-22) (the link is on the Account page)
  - Related: I-071, I-089
- **I-105 · High and low graphics modes** · `Reusable`: a setting for phones that struggle with the tank. High =
  today's tank. Low = fewer animated parts, 15 fps instead of 30, pixel ratio 1, no ambience scene effects
  (or the still picture the tank already falls back to without WebGL). Auto-pick Low on weak phones, changeable
  in Settings.
  - Done in: Quick wins, Batch 2 (2026-10-22). Auto-picks Low on devices reporting ≤ 2 GB memory or ≤ 2 cores (iPhones start on High).
  - Related: P-039, P-014, I-089, I-038
