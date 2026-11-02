# Changelog

What changed in Deep Nautilus, newest first. One entry per big update; small fixes go under "Small fixes" in
the next big entry. Idea IDs point at `Ideas/DONE.md`.

Versions: v0.x until friends testing (v1.0 = Phase 11 starts). Each phase or quick-wins batch bumps the middle
number (v0.14 → v0.15); a small fix after a release bumps the last one (v0.14.1). Updates between phases also
used the last number (v0.9.1 …). `package.json` matches the newest entry, and each version has a git tag.

## v0.14 · 2026-10-23 · Quick wins 4: stats, records and honest time

### What's new
- Stats open with a sentence or two about your week, and Records now has your best week, longest session and
  most fish in a day.
- A forgotten stopwatch can't run forever: after 3 hours (4 for notes) it asks "Still going?".
- Back after the app closed for a while? Open Focus asks whether to count that time; Deep Focus keeps the time
  before, with no bone.
- Opening the app with no connection shows a calm "You're offline" page, and this note shows once after each
  update.

Ideas built: I-005, I-026, I-098, I-102, I-112, I-113

### Notes for me
- The offline page and the service worker only run in production (`npm run build && npm start` to try them).
- This "What's new" text is what users see: it's read from this entry when the app is built.

## v0.13 · 2026-10-22 · Quick wins 3: tank, results and starting

### What's new
- See your tank full screen with one tap; decorations are bigger, and the Shop shows how many items are put away.
- The result screen says honestly what a short session still counted, how many coins until the next decoration,
  and what unlocks next.
- "Just start: 10 minutes" under Start, for the days starting feels hard.
- Session settings show the fish odds for your session length, and a typed task can be added to your list in
  one tap.

Ideas built: I-070, I-074, I-087 (odds in words only), I-090, I-093 (bigger only), I-095, I-100, I-103, I-111

## v0.12 · 2026-10-22 · Quick wins 2: More, Settings and Account

### What's new
- The Help tab is now **More**: Settings and Account at the top, then Help.
- Settings has Appearance, the alarm (moved from Session settings), Graphics, Install the app and Notifications.
- Low graphics for older phones: a calmer tank at 15 fps with no scene effects (picked automatically on weak
  devices).
- Help starts with short answers ("What if I get a call?", "What if my battery dies?"…); Account links to the
  privacy policy.

Ideas built: I-067, I-069, I-089, I-101, I-105

### Notes for me
- I-088 (quiet alarm) already existed from 2026-10-20; this update only moved it to Settings.

## v0.11 · 2026-10-22 · Quick wins 1: clearer words

### What's new
- The login page says what the app is in one sentence, why Google, that it installs with no app store, and what
  a nautilus is.
- New users see "One tap is all it takes" under Start, and a kind line in their empty tank.
- Session settings: a hint to choose Open Focus when studying on the phone or expecting calls, and a tip that
  the iPhone silent switch mutes sounds.
- A sea fact in breaks and on result screens without a fish; the privacy page lists everything stored.

Ideas built: I-066, I-068, I-071 (privacy wording only), I-096, I-097, I-108, I-109, I-110

### Small fixes
- One free interruption in Deep Focus: leaving for more than 15 s with the pause unused pauses the session (up
  to 5 min) instead of failing it; a "Still away?" push a minute before it runs out (2026-10-20).
- Alarm style in Session settings: Gentle (the new default, quiet enough for a library), Chime or Silent
  (2026-10-20).
- Plants: each notes session also helps the oldest unfinished plant grow (2026-10-19).
- Dependency patch updates: Next 16.4.2, React 19.3.1, supabase-js 2.118.0 (2026-10-19).

## v0.10.1 · 2026-10-19 · Phase 10b-1: "Time's up" notifications

### What's new
- Turn on "Time's up" and your phone tells you when a block ends, even with the app closed.
- Offered on the running screen after your first Start, never before; switch it off in Help → Account.

Ideas built: I-065

### Small fixes
- Fixed the tank freezing when you came back to a page: every start gets a fresh canvas.
- Notifications got a monochrome badge, and each alert is a fresh post so it pops up.

### Notes for me
- Push only works in production (the service worker isn't registered in dev).

## v0.10 · 2026-10-18 · Phase 10a: install the app

### What's new
- Deep Nautilus can be installed on your home screen and opens like an app.
- After your first finished session, Home offers "Get Nautilus as an app" (with iPhone steps).

Ideas built: I-064

## v0.9.5 · 2026-10-18 · Phase 9 Stage E: motion and Appearance

### What's new
- Calm motion everywhere: screens cross-fade, the result counts up, streak / new species / nautilus moments.
- Tabs fade gently, sheets slide, stats animate in once per app open; reduced motion makes it all instant.
- Appearance setting: System, Light or Dark, in Help → Account.

Ideas built: I-084, I-085

## v0.9.4 · 2026-10-18 · Phase 9 Stage C: Tank 4

### What's new
- A new tank: every species redrawn and swimming realistically, plus the nautilus, eggs and fry.
- Plants, decorations and all 5 skins redrawn, each skin with its own scenery.
- Each notes session now grows its own plant.

Ideas built: I-038

### Notes for me
- Started 2026-10-17 (batch 1), finished 2026-10-18 (batches 2 and 3).

## v0.9.3 · 2026-10-18 · Continue session

### What's new
- When time's up you get a break, then Continue or Finish: the whole chain is saved as one session.
- Breaks never count; failing a later part only loses that part.

Ideas built: I-063

## v0.9.2 · 2026-10-17 · Phase 9 Stage B: Paper Tide

### What's new
- A new look on every page: the "Paper Tide" design system (colours, type, cards, buttons).
- Session settings moved into a sheet; Home is simpler.

Ideas built: I-062

## v0.9.1 · 2026-10-17 · Fish species and the Sea life index

### What's new
- Each fish hatches into one of 18 real saltwater species; longer sessions make rarer ones likelier.
- The Sea life index shows every species you've caught.
- The nautilus arrives at 100 hours.

Ideas built: I-060, I-061

## v0.9 · 2026-10-17 · Phase 9 Stage A: design direction

### What's new
- Three design options compared on a preview page; Paper Tide and Tank 4 were chosen.

Ideas built: none

## v0.8 · 2026-10-15 · Phase 8: ocean sounds and the Shop tab

### What's new
- Five generated water sounds (Rain, Waves, Whales, Stream, Night), and the tank reacts to each.
- Shop is a tab in the bottom bar.
- The running screen shows your real tank with a hatching egg.
- One short pause in Deep Focus: once per session, up to 5 minutes.

Ideas built: I-059, I-039

### Notes for me
- The earlier 9-sound version is commit 841c98b.

## v0.7.2 · 2026-10-15 · Phase 7 Part 2: coins, decorations and skins

### What's new
- Focus minutes earn coins (Open Focus half); spend them on decorations in the Shop.
- Milestone decorations for big moments, and tank skins unlocked by total hours.

Ideas built: I-056, I-057, I-058

## v0.7.1 · 2026-10-15 · Night mode

### What's new
- Optional "Still studying?" check-ins: fall asleep and the session ends at your last check-in, with no penalty.

Ideas built: I-054

## v0.7 · 2026-10-15 · Phase 7 Part 1: plants

### What's new
- Notes sessions grow plants in your tank.

Ideas built: I-055

### Small fixes
- Louder end-of-block alarm.
- Setup remembered as one line, breaks keep the screen awake, calmer result and stats, sign out moved to Help.

## v0.6 · 2026-10-15 · Phase 6: tasks and session types

### What's new
- A task list with due dates, and pick a task for a session ("Mark done" on the result).
- Study and Notes sessions, with a target time for notes.
- Bottom navigation, a Help page, saved and premade cycles.
- Streak freeze: one missed day a week is forgiven.

Ideas built: I-047, I-048, I-049, I-050, I-051, I-052, I-053

## v0.5 · 2026-10-15 · Phase 5: stats

### What's new
- A stats page and a "Today · streak" line on Home.
- The 10-second cancel: cancel in the first 10 s and nothing is saved.

Ideas built: I-046, I-043

## v0.4 · 2026-10-14 · Phase 4: the tank

### What's new
- Every finished session puts a fish in your tank; quitting Deep Focus leaves a bone.

Ideas built: I-045

## v0.3 · 2026-10-14 · Phase 3: saving sessions

### What's new
- Every finished session is saved, even offline (it uploads later).

Ideas built: I-044

## v0.2 · 2026-10-14 · Phase 2: timers

### What's new
- Timer, stopwatch and cycle modes.
- Deep Focus (leaving fails it) and Open Focus (for studying on the same device).

Ideas built: I-041, I-042

## v0.1 · 2026-10-13 · Phase 1: sign in

### What's new
- Sign in with Google and see "Hi, [name]"; a public privacy page.

Ideas built: I-040
