@AGENTS.md

# Deep Nautilus

A Forest-style focus/study app with an ocean theme, for the owner and a few friends.
The owner is a student learning to code: explain what you do and why, briefly.

## Principles
- Deep Nautilus is a study app. Its purpose is to make me better at studying. Study and Notes sessions are both
  studying.
- Calm, simple, encouraging personality is the core of the app. Quiet interface, subtle animation, never guilt-driven.
- The tank rewards real work, never app activity: no rewards for creating tasks, opening the app, or ticking off
  tasks with no focus time.
- The tank is not a game: no breeding, feeding, energy, farming, quests or complex economy.
- Decorating must never take more time than studying.
- Punish quitting, never absence: fish die only when you quit Deep Focus; nothing dies from time passing,
  so holidays are safe.
- The app should never make you feel trapped: Open Focus, the 10-second cancel and one short pause in Deep Focus
  are the escape hatches.
- Falling asleep isn't quitting: Night mode ends a session at the last check-in you confirmed, with no bone and no
  dying fish, so the record stays honest without punishing you.
- Keep tasks simple: title, optional due date, done.
- No leaderboards. Any future friends features are about encouragement, not ranking.
- Web-first: no features that require native iPhone/Android apps.
- Feature test: a new feature must help organise work, finish work, make progress rewarding, or make progress
  visible. Otherwise it goes in IDEAS.md.
- UI/UX every phase: each phase organises and polishes the screens it touches, and new features are designed
  with the future layout in mind. Phase 9 is still the big polish pass.
- Ideas rule: any idea that isn't built goes into IDEAS.md with why and when to revisit.

## Stack
- Next.js 16 (App Router), TypeScript, Tailwind CSS v4
- Supabase (Auth + Postgres) via `@supabase/ssr` (cookie-based sessions)
- Hosting: Vercel. Repo: github.com/srianiruddhsankar-byte
- Keep dependencies minimal; don't add libraries without a clear reason.

## Code layout
- `lib/supabase/client.ts` — browser client (Client Components)
- `lib/supabase/server.ts` — server client (Server Components, Actions, Route Handlers); new client per request
- `lib/supabase/proxy.ts` — `updateSession`: refreshes the session and guards routes
- `proxy.ts` — Next 16's renamed "middleware". Every route is protected except `/login`, `/auth/callback` and `/privacy`
- `app/auth/callback/route.ts` — exchanges the OAuth `code` for a session
- `app/login` — "Sign in with Google" (Google OAuth only)
- `lib/timer.ts` — pure timer logic (no React/browser/clock; takes `now` as an argument). Tests: `lib/timer.test.ts`, run with `npm test`
- `lib/focus-storage.ts` — running session in localStorage (built on `lib/local-store.ts`); `lib/feedback.ts` — chime/vibrate; `lib/use-wake-lock.ts`
- `lib/session-record.ts` — pure `Result` → `sessions` row mapping (tested). `lib/save-queue.ts` — localStorage outbox that uploads finished sessions and retries
- `app/_focus/` — focus screen UI (private folder, not a route); `recent-sessions.tsx` is the Phase 3 "is saving
  working?" list, shown at the bottom of `/stats`
- `lib/fish.ts` — pure fish derivation: sessions → tanks, fish sizes, bones (tested in `lib/fish.test.ts`).
  `lib/fish-look.ts` — a fish's colours/pattern/swim seeded from its session id. `lib/sessions-data.ts` — `useSessions()`:
  all of the user's sessions (paged), shared by tank + recent list, merged with not-yet-uploaded queue rows
- `lib/plants.ts` — pure plant derivation (`deriveGarden`): notes sessions → growing plant, mature plants with
  tank + slot, per-session growth; stage thresholds in `PLANT_STAGES` (tested in `lib/plants.test.ts`).
  `lib/plant-look.ts` — a plant's shape/colours/sway seeded from the session that started it
- `app/_tank/` — tank UI: `tank.tsx` (fish + plants on the floor), `fish-sprite.tsx` (SVG fish/bone),
  `brood.tsx` (eggs → eyed eggs → fry, and their gentle drift on failure), `plant-sprite.tsx` (SVG underwater
  plants: stem / fern / grass × 5 stages, no flowers), `running-tank.tsx` (the running screen's real tank with
  the session's eggs / fry / fish or growing plant), `ambience-scene.tsx` + `.css` (the tank scene for each
  ambience: all scene effects live here), `live-plant.tsx` (Home `SeedlingCard`), `result-fish.tsx`,
  `result-plant.tsx`, `decoration-sprite.tsx` (SVG decorations), `skins.tsx` (the 5 tank looks built on one
  `WaterScene`; `SHALLOWS` is the default), `tank.css` (animation + reduced-motion rules). `Tank` takes `skinOf`,
  `decorations`, `coins`, `edit` (decorate mode), and for the running screen `bare`, `fixedIndex`, `scene`,
  `overlay`, `liveFish`
- `lib/brood.ts` — pure egg stages (`broodStage`, `broodCaption`): eggs 0–2 min, eyed 2–5, fry 5–10, then fish
  sizes; tested in `lib/brood.test.ts`
- `lib/decorations.ts` — the shop catalogue: prices and milestone items (tune here). `lib/economy.ts` — pure coins
  (`coinsFor`, balance), milestones, `canGet`, placement helpers, skin unlock thresholds (`SKIN_UNLOCKS`), tested in
  `lib/economy.test.ts`. `lib/owned.ts` — `useOwned()`: your decorations + per-tank skins, buy / place / put away /
  set skin. `lib/use-economy.ts` — `useEconomy()`: balance, hours, milestones, `skinIdOf(tank)` in one place
- `app/_decorate/decorate-view.tsx` + `app/decorate/page.tsx` — the `/decorate` route, titled "Shop" (the Shop tab;
  tank in edit mode, Shop / Your items / Skins). The coin balance in the tank header links here too
- `lib/ambience-logic.ts` — pure: what should play and how loud (`ambienceTarget`, ducking, volume), tested in
  `lib/ambience-logic.test.ts`. `lib/ambience.ts` — the Web Audio engine (`syncAmbience`): generated noise →
  filters → slow LFO swells → one master gain. `lib/prefs-store.ts` — the remembered setup in localStorage
  (`loadPrefs` / `savePrefs` / `updatePrefs`); `lib/feedback.ts` shares one `AudioContext` for chimes + ambience
- `lib/stats.ts` — pure stats from sessions (`computeStats(rows, now, timeZone)`), tested in `lib/stats.test.ts`.
  `lib/use-clock.ts` — `useClock()`: now + browser time zone, read in an effect (never `Date.now()` in render)
- `app/_stats/` — `stats-line.tsx` (home "Today · streak" link), `stats-view.tsx`, `charts.tsx` (plain HTML/CSS
  column chart, heatmap, bar list), `viz.css` (chart colours, validated with the dataviz palette checker).
  `app/stats/page.tsx` is the protected `/stats` route
- `lib/task-name.ts` — pure `cleanName` / `cleanTaskName` / `taskKey`. `lib/task-views.ts` — pure task logic
  (`Task` type, due-date groups, in progress, Mark done matching, done history, completions), tested.
  `lib/tasks.ts` — `useTasks()` + add / done / due date / delete (`public.tasks`, online only).
  `app/_tasks/task-list.tsx` + `app/tasks/page.tsx` — the `/tasks` route
- `lib/cycle-blocks.ts` — pure cycle blocks: premade cycles, `expandBlocks` (blocks → phases), `parseBlocks`, tested.
  `lib/cycles.ts` — `useCycles()` (premade + saved) + save / delete (`public.cycles`).
  `app/_focus/cycle-picker.tsx` — cycle chips, Custom fields, "Save as…"
- `app/_nav/bottom-nav.tsx` — `BottomNav` (Home · Tasks · Shop · Stats · Help; each page renders it, Home hides it
  while a session runs) and `PageHeader`. `app/help/page.tsx` — the `/help` "How it works" route
- `app/_focus/today-tasks.tsx` — Home's "Today" card. `app/_focus/task-status.tsx` — "In progress" badge, "Mark done"
- `lib/alarm.ts` — end-of-block alarm store (`startAlarm` / `stopAlarm` / `useAlarm`): 3 chimes + vibration every 4 s,
  stops on "Got it" or after 60 s. `app/_focus/alarm-overlay.tsx` + `alarm.css` — the full-screen, gently pulsing overlay
- `lib/notes.ts` — pure `compareToTarget` ("Took 52 min — 7 min over target")
- `supabase/migrations/` — SQL migrations. The owner pastes each one into the Supabase SQL Editor (no CLI)
- Env vars: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (see `.env.local.example`)

## Next.js 16 / Supabase gotchas
- Middleware is now `proxy.ts` with an exported `proxy` function (Node runtime).
- `params`, `searchParams`, `cookies()` are async — `await` them.
- Server-side auth checks: use `supabase.auth.getUser()` / `getClaims()`, never trust `getSession()`.
- Cache Components is on: anything reading cookies/searchParams/the clock must sit inside `<Suspense>`.
  The server `createClient()` calls `await connection()` because Supabase reads `Date.now()`.
- New Supabase tables are NOT exposed to the Data API automatically: each migration needs an explicit
  `grant ... to authenticated` (only the operations used), on top of RLS policies.
- Upserts use `ignoreDuplicates: true` (`ON CONFLICT DO NOTHING`), which needs only an INSERT policy.
  A plain upsert (`DO UPDATE`) would also need an UPDATE policy.

## Working preferences
- Create a module's dependencies before the files that import it.
- State the file path before showing code; show full files when changing them (except one-liners).
- Before the owner tests something, say exactly what they should see if it works.
- Never git push or deploy without the owner's confirmation.

## Product design (the eventual app)

### Modes
- Focus timer (countdown), stopwatch, and cycle (pomodoro) mode.
- Each session also has a focus mode, chosen on the setup screen and stored on the session:
  - **Deep Focus** (default): leaving for more than 15 s during focus fails the session/block; wake lock on for
    the whole session, breaks included (so the end-of-break alarm can ring).
  - **Open Focus**: for studying on the same device. No leave detection, no wake lock; leaving never fails it.
    Only leaving is ignored: Give up still fails a timer, same as Deep Focus.
- **10-second cancel window** (every mode, Deep and Open Focus), timed from the session's start timestamp:
  - For the first 10 s the end button reads "Cancel · N" (countdown, neutral style, no confirm tap).
  - Cancelling discards the session completely: nothing saved or queued, no bone, no dying fish,
    no result screen — straight back to setup. After 10 s: normal Give up / Stop / End session rules.
  - Deep Focus: a leave that BEGINS in the first 10 s and lasts over 15 s is a cancel, not a failure.
    (A quick leave or refresh in the window just keeps running.)
  - No confirmation popup before starting.
- **Pause** (Deep Focus only; Open Focus doesn't need it): once per session (once per cycle set), up to 5 min
  (`MAX_PAUSE_MS`), offered after the cancel window. The session runs on SESSION TIME, a clock that stands still
  while paused (`toSession` / `toReal` in `lib/timer.ts`): paused time earns no minutes, coins or growth; the
  leave rule is off during it and back on after; Night mode check-ins can't come due or run out. It ends on
  Resume or by itself after 5 min (a gentle "Pause over" alarm if on screen). Stored on the running session as
  `pause: { startedAt, endedAt }`, so refreshes and hidden pages work. Ambience and the tank scene stop for it.

### App structure (Phase 6)
- The running screen covers the whole window (`fixed`, no header or nav). Portrait: time, a compact tank (about a
  third of the height), then hint + buttons. Landscape (laptops, phones sideways): the tank takes most of the
  screen, sized to the height, with the time and controls in a column beside it (Tailwind `landscape:`).
- Bottom nav: Home · Tasks · Shop · Stats · Help, on every signed-in page, hidden while a session is running.

### Ambience (Phase 8)
- 5 water sounds generated with the Web Audio API (no audio files), built from many small EVENTS rather than
  filtered noise (`AMBIENCE_SOUNDS`; ids are stored: never rename, only add): Rain (separate drops = click +
  rising "plink", plus a granular patter texture), Waves (each wave: build → crash → retreat, irregular gaps),
  Whales (a beating low hum + gliding, wobbling calls through a long echo every 20–40 s), Stream (many bubble
  plinks in lively and quiet patches over a soft trickle), Night (darker waves + faraway crickets). Events are
  scheduled ahead on the audio clock (`ticker`, `moments`). Retired ids from the earlier 9-sound library map to
  the closest match (`toAmbienceChoice`). The 9-sound version is commit 841c98b, to go back to if needed.
- The tank reacts (`sceneFor`, tested; drawn in `app/_tank/ambience-scene.tsx`): rain + surface ripples,
  rolling surface + shifting light, a whale silhouette passing on each call (`useWhaleCalls`), a sideways
  current with drifting bubbles, a dimmed night tank. During a session (not while paused) and during a preview.
- Session settings: an Ambience line that opens the list (Off + 5) + volume, remembered with the setup prefs.
  Tapping a sound chooses it AND plays a ~10 s preview (`startPreview`, a separate slot from the session's sound,
  one at a time); tapping it again stops it (`previewTap`, tested). Previews stop on closing the list or
  settings and on Start; they never start a session. Stored on the
  running session (`ambience: { sound, volume, paused }`), so a refresh keeps it. The running screen has a small
  speaker by the focus mode: Pause / Play + volume (a volume change is remembered too).
- Starts with the session (the Start tap unlocks audio; after a refresh the first tap does), fades in/out, keeps
  playing in breaks, stops when the session ends or is cancelled, and when leaving Home. Ducks to 20 % while an
  alarm rings or a check-in waits. Decided by `ambienceTarget` (pure); `syncAmbience` just follows.
- Limits: the iPhone silent switch mutes Web Audio; browsers may pause audio when the page is hidden (Open Focus in
  another app); phones need a tap before any sound.
- Home, top to bottom: greeting, stats line, "Today" card (due today + overdue; tap one to pick it for the next
  session), tank, setup summary card ("Change" opens every option) and Start. The setup is remembered in this
  browser (`lib/setup-prefs.ts`, saved on Start; the task isn't remembered).
- Result screen: big focus minutes, fish / notes result, then one main button (New session); Mark done is quieter.
- Stats: Streak, Tasks done, then per type: time, last 7 days, target (notes), time per task; the rest under
  "More stats". Sign out is on the Help page (Account section with your email), not on Home.

### Night mode ("Still studying?" check-ins)
- Optional, off by default, in Session settings: interval 20 / 30 / 45 / 60 min or Custom (any whole 10–120,
  `isNightInterval`; plus "1 (test)" in development only). Check-ins have their OWN sounds (never the block
  alarm's rising chime): gentle chime (a soft falling bell), chime + buzz, alarm (an insistent "ding-ding-dong"
  repeated every 3.5 s until tapped, `CHECK_IN_ALARM_EVERY_MS`) or silent pulse; tapping a style plays a sample.
  Remembered with the setup prefs. All modes, Deep and Open, Study and Notes.
- A check-in is due after `interval` of FOCUS time since the last confirmation (or the start), so in cycles it only
  comes due during focus blocks. A small banner, not a takeover; the timer keeps running. Tapping it, or "Got it"
  on any phase alarm, confirms (`confirmCheckIn`, stored as `confirmedAt` on the running session).
- No tap within 2 min (`CHECK_IN_GRACE_MS`): the session ends quietly with `ended_by = 'checkin'`. Credited focus
  and `ended_at` both stop at the last confirmation (or the start). Saved as completed (cycles: partial, only
  blocks fully finished by then are banked). No bone, no dying fish; fish / plant use only credited time.
- All in `lib/timer.ts` from timestamps (`checkInDueAt`, `missedCheckInAt`, `checkSession`), so a hidden page or a
  refresh gives the same answer on return. The earliest event wins: a Deep Focus leave (15 s), a missed check-in,
  or the natural end.

### Tasks and session types (Phase 6)
- Tasks: name, optional due date (a plain calendar date), done. Names are unique among NOT-done tasks only
  (partial unique index, ignoring case): re-adding a done name ("Read 20 pages") makes a new task, and every
  completion stays in history. "Mark done" / "In progress" match the not-done task with that name.
  Grouped Today / Overdue / Upcoming / No date by the user's local today; Done is a separate view (history with
  done date + focus time). Each session with the task's name counts toward ONE completion: the first one done at
  or after the session started.
- "In progress" is never stored: only while the running session's task matches the task by name.
- Optional task per session: type one or tap an open task on the setup screen; blank = no task (starts as before).
  The running screen shows the task name instead of "Focus"/"Stopwatch" (a cycle keeps its block line under it).
  The result screen offers "Mark done" if the task is on the list (matched by name).
- Sessions store the task's NAME (`task_name`), not a link to `tasks`: queued sessions can't break when a task is
  deleted, and deleted tasks keep their stats. Time per task groups names case-insensitively.
- Study / Notes toggle (Study default). Notes sessions make no fish, and a failed notes session leaves no bone.
- Optional target time only for Notes + Stopwatch (you stop when done); result shows target vs actual.

### Fish
- Fish are DERIVED from `sessions` (never stored): one source of truth, so rule changes apply to past fish too.
- The running screen shows your real tank. A study session's fish starts as ONE big translucent egg on a rock
  (0–2 min; bright outline + soft glow so it's visible on every skin), then an eyed egg (2–5), hatches into a
  see-through fry with a yolk sac at 5, and from 10 min swims among the other fish as it grows. A notes
  session's plant grows in the tank's next free plant spot. A failed session's egg / fry fades and drifts away.
- One completed or partial session with at least 5 focus minutes = one fish; under 5 min = no fish (anti-farming).
  Deep and Open Focus earn fish the same way. It grows live on screen during the session.
- Size by focus minutes (partial cycles: banked minutes): small < 25, medium 25–49, large 50–89, rare 90+.
- Every failed study session = +1 "bone" (bones = count of fish lost). No coins for failed sessions.
- Leaving during breaks is safe.
- A fish's look is seeded from its session id (same session → same fish everywhere). Don't change the
  order of random draws in `fishLook()`, or every existing fish changes.

### Cycle mode
- One fish for the whole cycle set, with checkpoints.
- Each completed focus block banks its minutes and coins.
- Leaving mid-block loses only that unfinished block; the fish survives at its last checkpoint size.
- Leaving during the first block kills the fish.
- During the final long break, "Finish" ends the set as completed with no penalty (every block is banked).
- **Rule across the app: you only ever lose minutes you haven't finished.**
- Cycles are stored as an ordered list of blocks (`lib/cycle-blocks.ts`): steps (focus / break / longBreak, minutes)
  and `repeat × N` holding steps (no nested repeats). Expanding: no leading break; neighbouring breaks collapse to
  the last; a trailing short break is dropped. Premade: Pomodoro (25/5 × 4 + 15), 50/10 (× 2), Deep work (90).
  Users save Custom settings under a name (unique per user) and can delete them; no editing.
  `cycle_name` is stored on cycle sessions (null = Custom). "Finish" only applies to a long break that is the last phase.

### Plants, coins, decorations and skins (Phase 7)
- Study sessions grow FISH. Notes sessions grow PLANTS, never fish; study sessions never touch plants.
- Plants are DERIVED from `sessions` like fish (no table). One plant grows at a time from notes focus minutes added
  up across sessions (completed / partial, 5+ minutes each). Stages: seed 0 → sprout 30 → young 90 → full 180 →
  mature 300 min (`PLANT_STAGES` in `lib/plants.ts`, the one place to tune).
- Plants live underwater: NO land-style flowers or petals. Maturity shows through size, fullness and colour
  (richer greens; the newest growth at the top takes on a warm tint, `tipHue`).
- When it's mature it's planted in the tank that is newest at that moment (by fish count then), in the next free
  floor slot (6 per tank; if full, the next tank, which can then exist with plants only). A new seed starts with
  the leftover minutes of that session.
- A failed notes session (Deep or Open) adds no growth and the growing plant looks a little wilted until the next
  notes session that counts. No bones from notes. Plants never die; time passing does nothing (holidays are safe).
- A plant's look is seeded from the session that started it (`plantLook`); a session that starts several plants
  gives ids `<id>`, `<id>#2`… Don't change the order of random draws in `plantLook()`.
- Coins (Phase 7 part 2): DERIVED from sessions like fish; only spending is stored. Per completed / partial
  session with 5+ credited focus minutes, Study and Notes alike: Deep Focus 1 coin per minute, Open Focus half
  (rounded down). Failed: 0. Night mode: credited minutes only (focus_seconds already is). Balance = earned − sum of
  `price` on your decorations. Coins are computed in the browser, so the database can't stop a determined cheat
  (fine for a personal app).
- Decorations: catalogue in `lib/decorations.ts` (8 bought, 30–600 coins; 4 milestone items: first rare fish,
  10 hours, 7-day longest streak, first mature plant; free, once each). `public.decorations`: one row per owned
  item with `price` paid and placement (`tank`, `x` 0–100 %, `y` 0 front … 1 back of the sand), or all null = in
  your inventory. Owned forever: no delete; "put away" clears the placement, no refund. Only the placement columns
  are updatable. Decorations sit on the sand BEHIND plants and fish and are only tappable on /decorate.
- Skins: unlocked by total credited hours (study + notes): Shallows 0, Pond 10, River 30, Lake 75, Deep 150
  (`SKIN_UNLOCKS`). Chosen per tank (`public.tank_skins`, no row = Shallows); a choice that's no longer unlocked
  falls back to Shallows. Cosmetic only for now.
- Tank numbers in `decorations.tank` and `tank_skins.tank` (0 = Tank 1) point at the DERIVED tanks. Changing the
  fish rules (tank size, what earns a fish) could shift which tank a number means.

### Tanks
- 10 fish per tank, filled oldest first. The 11th fish starts Tank 2, and so on. Opens on the newest tank.
- Up to 6 mature plants per tank, in fixed spots on the sand below the fish lanes. Tap one for its card.
- Each tank shows its own skin (default Shallows) and its placed decorations. The tank header shows the coin
  balance, which links to /decorate.

### Stats and data
- Stats are DERIVED from `sessions` in the browser (no table, no SQL). Definitions — use exactly these:
  - Focus time counts completed and partial sessions only (failed sessions have 0 focus seconds anyway).
  - Days are in the user's local time zone (computed in the browser). A session counts toward the day it STARTED on.
  - A "study day" = at least 5 focus minutes of study OR notes that day (sessions in a day add up).
  - Streak freeze: one missed day per Mon–Sun week is forgiven. It keeps the run alive but doesn't add a day.
    A second miss in the same week breaks it, and so do two missed days in a row, even across a week
    boundary (e.g. Sunday + Monday).
    Today is never "missed" (it isn't over). Forgiven days show on the heatmap with a dashed outline and ❄.
  - Current streak = study days in the run that reaches today. Longest streak = best run ever (same rule).
  - Study and Notes get the same stats, shown separately (tabs). Streak, heatmap and the home "Today" line use both.
  - Weeks start on Monday.
  - Sessions total = all sessions (incl. failed). Longest / average session = focus time of completed + partial.
  - Completion rate = (completed + partial) ÷ all sessions (sessions that kept their fish).
  - Time of day: each session's focus time is spread evenly over the wall-clock hours it ran.
- Store every session as a raw record (start, end, mode, focus mode, completed/died) so new stats can be computed later. Derive stats; don't only store aggregates.
- `public.sessions` table: one row per finished session. `id` is generated on the client at Start
  (retries can't duplicate). Focus time is stored as `focus_seconds` (derive minutes). `outcome` is
  completed / failed / partial (partial = a cycle that ended early with some blocks banked).
  RLS: users can select and insert only their own rows; no update/delete.

### Technical rules
- Timing is timestamp-based: store the start time and compute elapsed time. Never count ticks
  (timers get throttled in background tabs).
- Use the Screen Wake Lock API for the whole running session, breaks included (Deep Focus only).
- Leaving (Deep Focus only) = Page Visibility "hidden" for more than 15 s of focus time. The web can't tell a phone
  lock from an app switch, so locking during focus counts as leaving (revisit the grace period after real use).
- Installable PWA + push reminders come in Phase 10. Friends and Google Calendar features are not planned yet.

## Roadmap
- Phase 1 (done): project setup + Google login, protected home page saying "Hi, [name]", sign-out, public `/privacy`.
- Phase 2 (done): timer, stopwatch and cycle modes with leave detection and localStorage restore; Deep/Open Focus.
- Phase 3 (done): save every finished session to Supabase (`sessions` table, offline queue + retry) and a plain "Recent sessions" list.
- Phase 4 (done): the tank. Fish/bones derived from sessions, Shallows skin, swimming fish with detail cards,
  live-growing fish while running, dying fish on failure.
- Phase 5 (done): stats. Home stats line (today + streak) and `/stats` page with tiles, 7-day columns,
  12-week heatmap, splits, records and time of day. All derived from sessions.
- Phase 6: app structure + tasks + session types
  - Part 1 (done): task list, task on sessions, Study / Notes + target time, stats split by type and time per
    task, streak freeze.
  - Part 2 (done): everything below that part 1 didn't cover.
  - Navigation between Home, Tasks, Stats and Help, organised and consistent.
  - Help / "How it works" page: modes, Deep vs Open Focus, cycles, the 10-second cancel, fish, bones, plants, streaks.
  - Tasks: title + optional due date; grouped Today / Overdue / Upcoming / Done. States: To do, In progress
    (automatic, only while a timer runs on that task), Done. Tasks can be ticked off without a timer.
  - Optionally pick a task before a session (blank = start as today); the running screen shows its name;
    "Mark done" on the result screen.
  - Completed-task history: what, when, and total focus time.
  - Saved cycles, stored as a list of blocks (so a drag-and-drop builder can be added later), plus premade
    cycles: 25/5 × 4, 50/10 × 2, 90 deep work.
  - Study / Notes session type; notes have an optional target time (target vs actual on the result).
  - Stats: study and notes separately, time per task, tasks completed, most-used cycle.
  - Streak freeze: streak = any day with 5+ minutes of study or notes; one missed day per Monday–Sunday week
    is forgiven, and never two consecutive missed days.
- Phase 7: plants, coins, decorations, skins (rules in "Plants, coins, decorations and skins" above)
  - Part 1 (done): plants only.
  - Part 2 (done): coins, decorations (shop + milestones + placing), skins per tank.
  - Plants: notes sessions grow plants from cumulative notes minutes; they never die from time passing; a failed
    Deep Focus notes session loses only that session's growth.
  - Coins: 1 focus minute = 1 coin; Open Focus = half.
  - Decorations: mostly bought with coins, some unlocked by milestones.
  - Skins unlocked by total hours.
- Phase 8 (in progress): ocean sounds — looping ocean ambience generated with the Web Audio API (no audio files),
  plus Shop as a bottom-bar tab.
- Phase 9: UI polish pass across the whole app.
- Phase 10: PWA (installable) + task reminder notifications.
- Phase 11: testing with friends. Key questions: do they study more because the tank grows, or just think it
  looks nice? Do they come back for the tank? Do they use cycles and tasks? Where do they keep their to-do lists?
  If they say "cool" and never return, rethink — don't just add features.
- Later: see IDEAS.md.
