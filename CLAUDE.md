@AGENTS.md

# Deep Nautilus

A Forest-style focus/study app with an ocean theme, for the owner and a few friends.
The owner is a student learning to code: explain what you do and why, briefly.

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
- `app/_focus/` — focus screen UI (private folder, not a route); `recent-sessions.tsx` is the Phase 3 "is saving working?" list
- `lib/fish.ts` — pure fish derivation: sessions → tanks, fish sizes, bones (tested in `lib/fish.test.ts`).
  `lib/fish-look.ts` — a fish's colours/pattern/swim seeded from its session id. `lib/sessions-data.ts` — `useSessions()`:
  all of the user's sessions (paged), shared by tank + recent list, merged with not-yet-uploaded queue rows
- `app/_tank/` — tank UI: `tank.tsx`, `fish-sprite.tsx` (SVG fish/egg/bone), `live-fish.tsx`, `result-fish.tsx`,
  `skins.tsx` (the tank's look; `SHALLOWS` is the default), `tank.css` (all animation + reduced-motion rules)
- `lib/stats.ts` — pure stats from sessions (`computeStats(rows, now, timeZone)`), tested in `lib/stats.test.ts`.
  `lib/use-clock.ts` — `useClock()`: now + browser time zone, read in an effect (never `Date.now()` in render)
- `app/_stats/` — `stats-line.tsx` (home "Today · streak" link), `stats-view.tsx`, `charts.tsx` (plain HTML/CSS
  column chart, heatmap, bar list), `viz.css` (chart colours, validated with the dataviz palette checker).
  `app/stats/page.tsx` is the protected `/stats` route
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
  - **Deep Focus** (default): leaving for more than 15 s during focus fails the session/block; wake lock on during focus.
  - **Open Focus**: for studying on the same device. No leave detection, no wake lock; leaving never fails it.
    Only leaving is ignored: Give up still fails a timer, same as Deep Focus.
- **10-second cancel window** (every mode, Deep and Open Focus), timed from the session's start timestamp:
  - For the first 10 s the end button reads "Cancel · N" (countdown, neutral style, no confirm tap).
  - Cancelling discards the session completely: nothing saved or queued, no bone, no dying fish,
    no result screen — straight back to setup. After 10 s: normal Give up / Stop / End session rules.
  - Deep Focus: a leave that BEGINS in the first 10 s and lasts over 15 s is a cancel, not a failure.
    (A quick leave or refresh in the window just keeps running.)
  - No confirmation popup before starting.

### Fish
- Fish are DERIVED from `sessions` (never stored): one source of truth, so rule changes apply to past fish too.
- One completed or partial session with at least 5 focus minutes = one fish; under 5 min = no fish (anti-farming).
  Deep and Open Focus earn fish the same way. It grows live on screen during the session.
- Size by focus minutes (partial cycles: banked minutes): small < 25, medium 25–49, large 50–89, rare 90+.
- Every failed session = +1 "bone" (bones = count of fish lost). No coins for failed sessions.
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

### Economy and growth (Phase 7, not built yet)
- Study sessions grow FISH (as now). Notes sessions (Phase 6) grow PLANTS, not fish.
- Plants grow from cumulative notes minutes across sessions: seed → sprout → young → full → flowering
  (~5 hours total, tune later). When it flowers it's placed in the tank and a new seed starts.
- Same 5-minute minimum as fish. A failed Deep Focus notes session loses only that session's growth
  (the plant wilts slightly, never dies). Plants never die from time passing — holidays are safe.
- Coins: 1 focus minute = 1 coin; Open Focus earns half, rounded down; under 5 focus minutes earns none;
  failed sessions earn none. Spent on decorations.

### Tanks
- 10 fish per tank, filled oldest first. The 11th fish starts Tank 2, and so on. Opens on the newest tank.
- The default tank is "Shallows". Skins are unlocked by total hours (Phase 7; list and thresholds TBD).

### Stats and data
- Stats are DERIVED from `sessions` in the browser (no table, no SQL). Definitions — use exactly these:
  - Focus time counts completed and partial sessions only (failed sessions have 0 focus seconds anyway).
  - Days are in the user's local time zone (computed in the browser). A session counts toward the day it STARTED on.
  - A "study day" = at least 5 focus minutes that day (sessions in a day add up).
  - Current streak = consecutive study days ending today, or yesterday if today has nothing yet (today isn't over).
    Longest streak = best run ever.
    (Phase 6 changes this: study or notes minutes count, and one free missed day per week doesn't break it.)
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
- Use the Screen Wake Lock API during focus (Deep Focus only).
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
- Phase 6: tasks + session types
  - Optional task name chosen/typed before a session (blank = start as today); the running timer shows the
    task name; time per task in stats.
  - Simple built-in task list (add, complete, pick one to start a session).
  - Study / Notes session type toggle on the setup screen. Notes stats shown separately from study stats.
    Optional target time for notes sessions, with target vs actual on the result screen.
  - Streak freeze: one free missed day per week doesn't break the streak
    (streak = any day with 5+ minutes of study or notes).
- Phase 7: plants + coins + decorations + skins (rules in "Economy and growth" above)
  - Study sessions grow fish; notes sessions grow plants (seed → sprout → young → full → flowering).
  - Coins: 1 focus minute = 1 coin (Open Focus = half, rounded down); spent on decorations.
  - Skins unlocked by total hours.
- Phase 8: ocean sounds — looping ocean ambience generated with the Web Audio API (no audio files);
  play/pause and volume on the focus screen.
- Phase 9: UI polish pass across the whole app (general UI only, not the species redesign).
- Phase 10: PWA (installable) + push notification reminders for tasks.
- Phase 11: testing phase with friends — real use, feedback, bug fixes. Ask testers where they keep their
  to-do lists (Notion, Google Tasks, Apple Reminders, paper...) before deciding on any integration.

## Later (after Phase 11)
- Real species (extinct or not), different body shapes, fish index with rarity tiers (common → legendary);
  uncaught species shown as "???" silhouettes.
- Freshwater vs saltwater tanks: each tank has a water type, chosen when a new tank starts. Freshwater skins
  (Shallows, pond, river, lake) get freshwater fish and aquatic plants; saltwater skins (coral reef, deep sea)
  get marine fish and corals instead of plants (index note: coral is an animal). Species pools per water type.
- Realistic tank/visual redesign (style to be decided).
- To-do integration (e.g. Notion) only if testers show most use one app.
- Voice input only if the phone keyboard's built-in mic isn't enough.
