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
- `lib/focus-storage.ts` — running session in localStorage; `lib/feedback.ts` — chime/vibrate; `lib/use-wake-lock.ts`
- `app/_focus/` — focus screen UI (private folder, not a route)
- Env vars: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (see `.env.local.example`)

## Next.js 16 / Supabase gotchas
- Middleware is now `proxy.ts` with an exported `proxy` function (Node runtime).
- `params`, `searchParams`, `cookies()` are async — `await` them.
- Server-side auth checks: use `supabase.auth.getUser()` / `getClaims()`, never trust `getSession()`.
- Cache Components is on: anything reading cookies/searchParams/the clock must sit inside `<Suspense>`.
  The server `createClient()` calls `await connection()` because Supabase reads `Date.now()`.

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

### Fish
- One session = one fish. It grows live on screen during the session.
- Final size by session length: small < 25 min, medium 25–49, large 50–89, rare 90+.
- Leaving the app during focus kills the fish: no coins, +1 "bone" (bones = count of fish lost).
- Leaving during breaks is safe.

### Cycle mode
- One fish for the whole cycle set, with checkpoints.
- Each completed focus block banks its minutes and coins.
- Leaving mid-block loses only that unfinished block; the fish survives at its last checkpoint size.
- Leaving during the first block kills the fish.
- During the final long break, "Finish" ends the set as completed with no penalty (every block is banked).
- **Rule across the app: you only ever lose minutes you haven't finished.**

### Economy and growth
- Coins: 1 focus minute = 1 coin, spent on decorations.
- Plants grow by studying. A plant survives one missed day and dies after two missed days in a row.
- The study streak is tracked separately from plants.

### Tanks
- Fixed size (e.g. 10 fish). When full, a new tank starts.
- The default tank is "Shallows". Total study hours unlock deeper-water skins (list and thresholds TBD).

### Stats and data
- Stats: today, this week, streak, longest session, total hours, bones.
- Store every session as a raw record (start, end, mode, focus mode, completed/died) so new stats can be computed later. Derive stats; don't only store aggregates.

### Technical rules
- Timing is timestamp-based: store the start time and compute elapsed time. Never count ticks
  (timers get throttled in background tabs).
- Use the Screen Wake Lock API during focus (Deep Focus only).
- Leaving (Deep Focus only) = Page Visibility "hidden" for more than 15 s of focus time. The web can't tell a phone
  lock from an app switch, so locking during focus counts as leaving (revisit the grace period after real use).
- Installable as a PWA later. Friends and Google Calendar features come much later.

## Roadmap
- Phase 1 (done): project setup + Google login, protected home page saying "Hi, [name]", sign-out, public `/privacy`.
- Phase 2: timer, stopwatch and cycle modes with leave detection and localStorage restore; Deep/Open Focus. No fish, coins, database or stats.
- Phase 4 (rules decided, not implemented yet):
  - Sessions under 5 focus minutes earn no fish or coins (prevents stopwatch farming).
  - Deep Focus earns full coins. Open Focus earns fish normally but only half coins, rounded down.
- Other phases: not yet planned. No database tables exist yet.
