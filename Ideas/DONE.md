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
  - Done in: built after Phase 6 (exact phase not recorded in CLAUDE.md)
  - Was: rejected as a loophole, then reconsidered (see "Reconsidered" in IDEAS.md).

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
  - Done in: phase not recorded in CLAUDE.md
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
  - Done in: phase not recorded in CLAUDE.md

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
