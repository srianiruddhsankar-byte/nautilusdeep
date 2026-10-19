# Problems

Problems students hit with study apps, so we can check Deep Nautilus against them. Nothing here is being built;
each one has a possible direction, a status (open / partly handled / handled) and the related ideas
(`I-…`, in IDEAS.md or DONE.md). These are about students, not this app, so they carry over to future apps.

Rules: same as IDEAS.md. Permanent IDs (`P-001`…), never deleted, never renumbered; a handled problem stays here
with its status. The next free ID is kept at the top of IDEAS.md.

Principle: **time spent in the app should never compete with time spent studying.**

## Who we're building for

What students actually care about, feel and avoid. Check every new idea against this. Most of it is reusable
for any study or productivity app.

**What they want deep down:** marks and grades, passing, CGPA going up, no arrears, not looking dumb, free time
because the work is finished, feeling in control, their future, being consistent, having discipline.

**When they actually open a study app:** the start of the semester; after a bad test; when a friend says
"let's study together"; when they're procrastinating and want to feel better.
→ I-076 (exam plan), I-083 (time vs marks), I-032 (friends rooms), I-074 (just start).

**How they feel, and how the app could help:**
- Overwhelmed: one small next step (I-074, I-075), a breathing minute (I-079).
- Guilt: the calm, never guilt-driven tone (a core principle); bad-day mode (I-078).
- Boredom: ambience, variety in the tank, rare fish (I-059, I-060).
- Anxiety: breathing (I-079); knowing you're on track for the exam (I-076).
- Comparison: no leaderboards, ever (I-036).
- Tiredness: short sessions count (I-074), Night mode (I-054).
- Satisfaction: the result screen, the hatch, streak moments.
- Loneliness: studying with friends (I-032).
- Hope: a visible end goal (I-070).

**What they don't want from the app:** feeling watched or judged; pressure to be perfect, or pressure in
general; another thing to manage or maintain; studying about productivity instead of studying; being sold
something when they open it.

**What they already use:** YouTube, WhatsApp, AI tools, Google Drive, PDFs, the Notes app, a physical
notebook, the phone clock and timer, Spotify, Instagram. The app should connect to these, not replace them
(P-007, I-080).

## Problems

- **P-001 · Drop-off after 1–2 weeks**: the novelty wears off and nothing pulls you back.
  - Direction: one gentle reminder at a time you choose, a weekly recap, the tank changing over time, the calm
    companion. Phase 11 measures this.
  - Status: open.
  - Related: I-003, I-004, I-010
- **P-002 · The app becomes procrastination**: you check one thing and 30 min later you haven't studied, or you
  spend ages entering tasks.
  - Direction: keep "low effort to start", make task entry very fast, and have the app push you into a session,
    not around the app.
  - Status: partly handled: one-tap Start on Home with the remembered setup; tasks are title + optional date;
    no rewards for app activity; decorating must never take longer than studying.
- **P-003 · Tracks time, not learning**: half-asleep studying counts the same as real focus.
  - Direction: an optional one-tap "how focused were you?" or a one-line "what I learned" after a session.
  - Status: open. Partly handled: Night mode stops credit at the last check-in.
  - Related: I-022, I-054
- **P-004 · Notification spam** ("Don't lose your streak!").
  - Direction: at most one nudge a day, off by default, never guilt-driven.
  - Status: partly handled: the only push today is "Time's up" for a running session, off until you turn it on.
    Keep it this way if task reminders (parked) or any nudges arrive.
  - Related: I-028, I-065
- **P-005 · Unreliable timers**: timers that drift, stop in the background or lose sessions.
  - Direction: keep timing timestamp-based and covered by tests.
  - Status: handled: elapsed time is computed from stored timestamps, never counted ticks, so background
    throttling, hidden pages and refreshes give the same answer (`lib/timer.ts`, tested). Gap: the timestamps
    come from the device clock, so changing the clock mid-session could skew one.
  - Related: I-041
- **P-006 · One method doesn't fit everyone** (Pomodoro vs 90-min deep work).
  - Direction: let people pick their own rhythm.
  - Status: handled: timer, stopwatch, premade cycles (Pomodoro, 50/10, Deep work), saved custom cycles and
    Continue session.
  - Related: I-001, I-051, I-063
- **P-007 · Too many apps that don't talk** (flashcards, Notion, Google Calendar, ChatGPT).
  - Direction: don't replace them; export and connect instead (see P-018).
  - Status: open. Deliberately not flashcards (I-022).
  - Related: I-022, I-024, P-018
- **P-008 · Social pressure and comparison** (a friend did 13 h, you did 30 min).
  - Direction: no leaderboards ever; show "studying now", not totals; friends' stats private by default.
  - Status: partly handled: no friends features exist, and leaderboards are rejected.
  - Related: I-032, I-036
- **P-009 · Study rooms with strangers feel pointless.**
  - Direction: friends-only or invite-only rooms.
  - Status: open.
  - Related: I-032
- **P-010 · "Why not just Google Meet with friends?"**
  - Direction: rooms must be lower effort than a call: no camera or mic, just quiet presence and everyone's
    tank / timer. If that's not enough of a reason, don't build rooms.
  - Status: open. Decide this before building I-032.
  - Related: I-032
- **P-011 · Rigid planners break when you miss one thing.**
  - Direction: flexible plans that reshuffle missed tasks automatically; "plan for today" over perfect schedules.
  - Status: partly handled: missed tasks simply move to Overdue, nothing breaks.
  - Related: I-021, I-048
- **P-012 · Stats that say nothing useful.**
  - Direction: plain-language insights ("You focus best in the mornings", "You've studied more this week than
    last").
  - Status: open. The data is already there (time of day, last 7 days in `lib/stats.ts`); only the sentences
    are missing.
  - Related: I-046
- **P-013 · Rewards get boring after a year** (full tanks, every rare fish caught).
  - Direction: new things that come slowly. Careful: not a game.
  - Status: partly handled: skins unlock up to 150 h, the nautilus at 100 h, Legendary fish are rare.
  - Related: I-004, I-009, I-014, I-058, I-061
- **P-014 · Battery drain from sounds and animations.**
  - Direction: a possible low-power mode (still tank, no ambience).
  - Status: partly handled: the tank runs at 30 fps, caps the pixel ratio at 2, pauses when hidden, unfocused
    or off screen, and reduced motion shows one still frame; ambience is optional and off by default.
- **P-015 · Phone storage full.**
  - Direction: keep the app small (a PWA, small assets).
  - Status: handled for now: no native app to install, sounds are generated (no audio files), and the worker
    caches only build files and pictures. Keep it that way when adding paintings or recordings.
- **P-016 · No Wi-Fi.**
  - Direction: sessions should never be lost offline.
  - Status: partly handled: finished sessions save to an offline queue and upload later. Opening the app with
    no connection doesn't work yet.
  - Related: I-026, I-044
- **P-017 · Weak sound / music library.**
  - Direction: better ambience sounds.
  - Status: partly handled: 5 generated water sounds. Owner, Oct 2026: none of them feel nice yet.
  - Related: I-016, I-017, I-018, I-059
- **P-018 · Data export**: your data is stuck in the app.
  - Direction: export your data (CSV / JSON), and send tasks and exams to Google Calendar without retyping
    (a calendar file or a subscribe link).
  - Status: open. Sessions are stored as raw records, so an export is straightforward.
  - Related: P-007
- **P-019 · Real life gets punished as quitting**: an important call, or a phone that dies mid-session, fails
  Deep Focus the same way giving up does.
  - Direction: "punish quitting, never absence". A call isn't quitting. Options: a late pause (I-073), a longer
    grace, or clearly steering people who expect calls to Open Focus.
  - Status: partly handled: Pause covers planned breaks (restroom), Open Focus never fails for leaving, banked
    blocks are kept, plants never die. A sudden call in Deep Focus still kills the fish.
  - Related: I-069, I-073, I-039, I-042
- **P-020 · "Will this actually help, or will I quit in a week?"**: doubts before committing time to a new app.
  Will it help me study more? During exams? Will it make me feel guilty? Will I waste time on setup and
  decorating? Is it fun enough to open?
  - Direction: answer honestly up front (I-066), then let Phase 11 testing give the real answer. Exams: a
    planner with countdowns (I-021). Guilt: calm tone is a core principle. Wasted time: one-tap Start, and
    decorating must never take longer than studying.
  - Status: open. These are the Phase 11 questions.
  - Related: P-001, P-002, I-066, I-021
- **P-021 · Faking hours**: inflating your time, fish or coins.
  - Ways it can happen today: editing the browser with devtools (the fish roll and coins are worked out in the
    browser, I-033); changing the device clock mid-session (P-005); leaving a timer running in Open Focus while
    not studying (P-003).
  - Direction: devtools and clock tricks are fixed by moving the maths and timestamps to the server (I-033).
    Nothing fully stops "timer on, not studying"; Deep Focus and Night mode check-ins make it harder.
  - Status: open, on purpose: with no leaderboards there's nothing to compete over, so faking only fools
    yourself. Becomes urgent if friends features or any comparison arrive (I-032).
  - Related: I-033, P-003, P-005, I-032
- **P-022 · Group study turns into chatting**: half studying, half gossiping.
  - Direction: study together in focus blocks, talk in the breaks. A shared timer makes the split clear
    without anyone policing anyone.
  - Status: open.
  - Related: I-032, P-010
- **P-023 · Studying in another app counts as leaving**: a YouTube lecture on the parts of the brain, a PDF,
  NotebookLM.
  - Direction: Open Focus is for this (studying on the same device); make that choice obvious at Start for
    people who study on their phone.
  - Status: partly handled: Open Focus never fails for leaving, but people have to know to pick it.
  - Related: I-042, I-080, I-019
- **P-024 · Planning instead of doing**: you plan a lot, or make beautiful timetables, and don't follow them.
  - Direction: plan less, start more. One next step beats a perfect timetable; missed plans never break.
  - Status: partly handled: tasks are simple and missed ones move to Overdue. Keep any planner (I-021) light.
  - Related: P-011, I-021, I-074, I-075
- **P-025 · Rereading instead of testing yourself**: rereading notes feels like studying but doesn't stick.
  - Direction: nudge towards recall: a "what do you remember?" check (I-081), spaced revision (I-022).
  - Status: open.
  - Related: P-003, I-081, I-022
- **P-026 · Checking your phone without noticing.**
  - Direction: Deep Focus makes leaving cost something; showing quick checks makes the habit visible (I-082).
  - Status: partly handled: leaving over 15 s fails Deep Focus; quick checks aren't shown.
  - Related: I-082, I-042
- **P-027 · Rewarding yourself before finishing.**
  - Direction: rewards only arrive after the work.
  - Status: handled in the app: fish, coins and plants only come at the end of a session, never before. The
    app can't stop real-life rewards (a snack, a scroll) taken early.
  - Related: I-056
- **P-028 · "Is this even an app?"**: it's a website you have to install, most people don't know how, and an
  uninstalled app gets lost among 40 open tabs.
  - Direction: make installing obvious and worth it, and explain it in one line ("works like an app, no app
    store needed").
  - Status: partly handled: the install card on Home and the iPhone install steps (I-064).
  - Related: I-064, I-066
- **P-029 · Too much to understand**: modes, fish, bones, plants, coins, skins, cycles, Night mode…
  - Direction: learn one thing at a time; everything beyond Start should be discoverable later, not explained
    up front.
  - Status: open.
  - Related: I-066, I-067, I-068
- **P-030 · Too many decisions before starting**: Deep or Open Focus, Study or Notes, how many minutes, timer or
  cycle.
  - Direction: good defaults, remembered choices, and one tap to start; choosing should be optional.
  - Status: partly handled: Start is one tap with the remembered setup, and every choice sits behind "Change".
    A first-time user still meets them.
  - Related: P-002, I-074, I-068
- **P-031 · Writing notes isn't the same as studying**: people zone out while writing and don't understand what
  they write down.
  - Direction: needs a decision. CLAUDE.md says "Study and Notes sessions are both studying"; this questions
    that principle. Options: keep counting notes the same, or nudge notes towards understanding (a recall check
    after a notes session, I-081).
  - Status: open, needs a decision.
  - Related: P-025, I-081, I-050
- **P-032 · Short sessions feel wasted**: 12 minutes of notes and no plant (plants start at 15 min).
  - Direction: show what you still earned (minutes, coins, the streak day), or carry the minutes forward (I-086).
  - Status: partly handled: the minutes and coins still count; only the plant is missing.
  - Related: I-086, I-055
- **P-033 · The roulette can feel like gambling, or unfair.**
  - Direction: no money and no buying rolls ever; show the odds openly; maybe a gentle guarantee (I-087).
  - Status: partly handled: rolls can't be bought, longer study only improves the odds, and the running screen
    says when the odds improve next.
  - Related: I-087, I-060
- **P-034 · Watching an egg is like watching paint dry.**
  - Direction: the egg is a small part of the screen; your other fish swim around it, which is calming.
  - Status: partly handled: the running screen shows your real tank. A brand-new user with no fish yet only has
    the egg to watch.
  - Related: I-038, I-060
- **P-035 · The alarm rings in a library and everyone hears it.**
  - Direction: a vibrate-only or silent alarm choice (I-088).
  - Status: open. On iPhone the silent switch mutes the app's sounds; on Android the chime plays.
  - Related: I-088
- **P-036 · Coins might not buy anything cool enough.**
  - Direction: ask in Phase 11 whether decorations make people want to earn coins; if not, rethink what coins
    are for instead of adding more items.
  - Status: open.
  - Related: I-056, I-057, P-013
- **P-037 · People don't know what "Deep Nautilus" means.**
  - Direction: one line on the login page or in the about answers: a nautilus is a deep-sea creature, and the
    one in your tank arrives at 100 hours.
  - Status: open.
  - Related: I-066, I-061
