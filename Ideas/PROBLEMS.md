# Problems

Problems students hit with study apps, so we can check Deep Nautilus against them. Nothing here is being built;
each one has a possible direction, a status (open / partly handled / handled) and the related ideas
(`I-…`, in IDEAS.md or DONE.md). These are about students, not this app, so they carry over to future apps.

Rules: same as IDEAS.md. Permanent IDs (`P-001`…), never deleted, never renumbered; a handled problem stays here
with its status. The next free ID is kept at the top of IDEAS.md.

Principle: **time spent in the app should never compete with time spent studying.**

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
  - Status: partly handled: 5 generated water sounds.
  - Related: I-016, I-017, I-018, I-059
- **P-018 · Data export**: your data is stuck in the app.
  - Direction: export your data (CSV / JSON), and send tasks and exams to Google Calendar without retyping
    (a calendar file or a subscribe link).
  - Status: open. Sessions are stored as raw records, so an export is straightforward.
  - Related: P-007
