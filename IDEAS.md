# Ideas

Every idea that isn't being built right now, so nothing is lost. Each entry says what the idea is,
why it's parked, and when to revisit it. A new feature must help organise work, finish work, make
progress rewarding, or make progress visible (see "Principles" in CLAUDE.md). If it doesn't, or it
isn't scheduled yet, it goes here.

## Earlier concept: "Todo list + work cycles + living pond" (prior product idea, Oct 2026)

A todo-first productivity app where completing tasks grows a pond, with history, badges and recaps.
It was designed as a free, ad-supported product. Deep Nautilus is timer-first and for personal use
instead. Ideas from it that were adopted are in CLAUDE.md; the rest are below.

## Cycles

- **Drag-and-drop cycle builder** (like Scratch blocks): snap together Focus / Break / Repeat / Long
  break blocks; build one cycle and it continues.
  - Why parked: needs design work.
  - Revisit: after Phase 11. Phase 6 stores cycles as a list of blocks, so this only needs a new UI later.
- **Multi-stage custom cycles** (e.g. 45/10/45/20), with stages you can reorder or duplicate.
  - Why parked: covered by the block builder above.
  - Revisit: with the block builder.

## Progress & reflection

- **Monthly and yearly recaps**: stats for the month/year, plus a time-lapse of the tank through every stage.
  - Why parked: needs a lot of history and the tank visuals to settle first.
  - Revisit: after Phase 11, once there's real data from testers.
- **The tank changes through the year** (a yearly cycle of looks/seasons), so the recap time-lapse shows real change.
  - Why parked: depends on the tank redesign and recaps.
  - Revisit: with recaps.
- **Personal records**: most time in a day/week, most fish in a day, longest session, etc.
  - Why parked: Phase 5 stats cover the basics (best day, longest session).
  - Revisit: after Phase 11, if testers look at their stats.
- **Badges / milestones**, some unlocking tank content.
  - Why parked: they must reward real work, never app activity. Phase 7 milestone decorations come first.
  - Revisit: after Phase 7.
- **End-of-day summary**.
  - Why parked: needs notifications (Phase 10) to be useful.
  - Revisit: after Phase 10.
- **Holiday mode + "total days studied" first**: turn on holiday mode before a long break (e.g. a month off) and
  the streak pauses: it doesn't grow, but it doesn't break either. Alongside it, make total days studied more
  prominent than the current streak, so a long run of work never feels wiped out by one gap.
  - Why parked: the streak freeze (one forgiven day a week) covers short gaps; long breaks need a small new
    setting and a stats rethink.
  - Revisit: soon. It fits "punish quitting, never absence": a holiday should never cost you anything.
- **Depth levels**: every hour of study takes you deeper ("You're at 340 m"), tied to the existing skin
  progression (Shallows → Deep already unlocks by hours). A way to make total progress visible.
  - Why parked: no XP bars or levels-to-grind; it must stay a quiet measure of real work, not a game.
  - Revisit: after Phase 11 (friends testing).
- **Calm companion**: the nautilus offers gentle, encouraging messages (progress you've made, a warm welcome
  back after a break). Warm like Duolingo's owl, but never guilt-driven: no "you missed a day", no nagging.
  - Why parked: the tone has to be exactly right, and it needs real usage to know which moments matter.
  - Revisit: after Phase 11 (friends testing).

## Tank & creatures

- **Species art and the tank/scene redesign**: moved into Phase 9 (Stage C, "Tank and scene art"), so they're
  no longer parked. Phase 9 redraws every species, the nautilus, plants, decorations, eggs/fry, the bone and all
  5 skins in the chosen style.
- **Freshwater species come back with water types**: guppy, neon tetra, zebrafish, goldfish, (freshwater)
  angelfish and discus were in the first species list but were swapped for saltwater ones, because tanks don't
  have water types yet and every species is saltwater for now.
  - Why parked: depends on freshwater vs saltwater tanks (below).
  - Revisit: with water types.
- **Freshwater vs saltwater tanks**: each tank gets a water type, chosen when a new tank starts.
  - Freshwater skins (Shallows, pond, river, lake) get freshwater fish and aquatic plants.
  - Saltwater skins (coral reef, deep sea) get marine fish, and corals instead of plants.
    Index note: coral is an animal.
  - Each water type has its own species pool (today's 18 species all go in the saltwater pool).
  - Why parked: a big change to how tanks work; species exist now, but the tank stays simple for now.
  - Revisit: after Phase 11.
- **Real underwater flowering behaviour** for plants, once plants become real species: seagrass and hornwort
  flower and pollinate fully underwater (small, inconspicuous flowers); water lilies flower at the surface.
  - Why parked: today's plants are simple shapes that show maturity through size and colour, not flowers.
  - Revisit: with real species and water types (after Phase 11). Phase 9 restyles today's plants only.
- **More special creatures like the nautilus** (unlocked by long-term milestones, not in the roulette).
  - Why parked: one namesake is enough to see if it feels special; more would dilute it.
  - Revisit: after Phase 11, if testers care about the index.
- **Extra creatures** (snails, shrimp, frogs) **and extra plants** (lily pads, reeds, flowers).
  - Why parked: the tank must stay simple, not become a game.
  - Revisit: with real species / water types.

## Sounds and video

- **Revisit ambience**: Rain is weak and some static remains in the generated sounds. Consider real recordings
  instead (Freesound CC0 / Pixabay), looped and crossfaded.
  - Why parked: the generated five are good enough for now; recordings need sourcing, licence checks and hosting.
  - Revisit: in Phase 9 (polish) or after Phase 11 testing.
- **Real music tracks** (lo-fi, piano) as a library alongside the generated ambience.
  - Why parked: needs licensed or CC0 tracks (and hosting them). For now you can play your own music app in
    the background.
  - Revisit: after Phase 11 testing, if testers ask for music.
- **More ambient sounds** beyond the ocean (stream, rain, underwater), matched to the water type.
  - Why parked: Phase 8 builds ocean sounds only.
  - Revisit: after Phase 8, together with water types.
- **Study-with-me videos**: play a YouTube "study with me" video alongside a session (e.g. a small player on
  the running screen, instead of the ambience).
  - Why parked: was rejected earlier together with ads and monetisation (see "Reconsidered"); needs a careful
    look at embedding, autoplay rules on phones, and how it fits Deep Focus (leaving the app to YouTube fails it).
  - Revisit: after Phase 10.

## Tasks

- **Reward for completed tasks**: a task completed WITH real focus time could earn a small tank item
  (e.g. a shell or pearl). Ticking off a task with no focus time earns nothing.
  - Why parked: rewards and tank items belong to Phase 7 (coins and decorations), and it must reward real
    work, never app activity.
  - Revisit: in Phase 7.
- **Planner**: grow Tasks into a cute, aesthetic planner: exams and assignments with countdowns ("Biology exam
  · 12 days", shown on Home) and study goals (e.g. hours per week for a subject).
  - Why parked: it bends "keep tasks simple" (title, optional due date, done), and we don't yet know whether
    testers would plan here at all.
  - Revisit: after Phase 11 (friends testing), if they keep their to-do lists and exam dates elsewhere.
- **Spaced repetition reminders**: after studying a topic, "revisit this topic" reminders after 1, 3, 7 and
  21 days, built on tasks + push notifications (each reminder is a task with a due date). Not flashcards:
  NotebookLM already handles studying the content itself.
  - Why parked: needs task reminders and push notifications (Phase 10b) to exist first.
  - Revisit: after Phase 10.
- **Subtasks and priorities**.
  - Why parked: tasks stay simple (title, optional due date, done).
  - Revisit: only if testers ask.
- **To-do integration** (e.g. Notion).
  - Why parked: we don't know where testers keep their to-do lists.
  - Revisit: only if Phase 11 testers show most of them use one app.
- **Voice input**.
  - Why parked: the phone keyboard's built-in mic may already be enough.
  - Revisit: only if it isn't.

## Installed app

- **Open the app offline.** The service worker (Phase 10a) caches only build files and pictures, never pages,
  so opening the installed app with no connection shows the phone's "offline" page.
  - Why parked: pages are made per signed-in user; caching them risks showing a stale or wrong account and is
    the usual way installed apps get stuck on an old version. Sessions already save offline once the app is open.
  - Revisit: if testers often open the app with no signal (e.g. on the underground); start with one cached
    "You're offline" page, not cached real pages.

- **Home / lock screen widgets** showing today's progress.
  - Why parked: not possible for a web app; widgets need a native iPhone / Android app (see "native-only
    features" under Deliberately rejected).
  - Revisit: only if the app ever goes native.

- **Task reminders** (push): a notification for a task's due date. Batch 10b-2, next: the
  `push_subscriptions.task_reminders` switch is already there.

- **Night-mode check-in pushes**: "Still studying?" as a notification when the app isn't on screen.
  - Why parked (10b-1): the check-in exists for falling asleep; a notification that wakes you up to tap it is
    a different feature, and in Deep Focus you can't be away anyway. Open Focus + Night mode is the only real case.
  - Revisit: if testers use Open Focus with Night mode and miss check-ins they'd have answered.

- **"Come back, Deep Focus is about to fail"** warning a few seconds after leaving.
  - Why parked: the 15 s grace is too short for a server round trip (the check runs every 15 s), and a buzz to
    pull you back risks feeling guilt-driven. It would need a longer grace or a local notification, which the
    web doesn't offer.
  - Revisit: if the leave grace period is lengthened after real use.

- **A push when the Continue window closes** ("Your session ended at 45 min").
  - Why parked: ending quietly is on purpose (every part is already banked; nothing is lost), so there's
    nothing to act on.
  - Revisit: if testers are confused about where a session went after a long break.

## Friends

- **Friends + focus rooms**: add friends, see who's studying right now, and study rooms ("study servers")
  where friends focus at the same time. Encouragement only: no leaderboards, ever, and no ranking of any kind.
  It must stay free.
  - Why parked: the app is for the owner and a few friends first; it needs accounts to see each other (new
    tables, RLS, privacy) and moving fish rolls / coins server-side (see "Fairness").
  - Revisit: after Phase 11 (friends testing), if testers ask to study together.

## Fairness

- **Move fish roll and coin calc server-side if the app goes public or gets leaderboards.** Today the browser
  makes the session id (the fish roll's dice) and computes coins, so a determined user could pick a rare fish or
  fake coins with devtools.
  - Why parked: it's a personal app for a few friends, with nothing to compete over, so cheating only fools yourself.
  - Revisit: if the app goes public, or if any shared or comparing features are ever added.

## Deliberately rejected (and why)

- **Categories / subject tags**: an extra step before studying.
- **App blocking, controlling phone notifications, native-only features**: not possible on the web, and not needed.
- **Leaderboards**: no competition between users, ever.
- **Ads, monetisation, charity**: this is a personal project.

## Reconsidered

- **YouTube**: first rejected along with ads and monetisation. Playing a "study with me" video during a session
  is a different thing (no ads from us, no money), so it's parked as an idea instead (see "Sounds and video").

- **Pause button**: first rejected as a loophole around the leave rule. Built after all as a limited pause
  (Deep Focus only, once per session, up to 5 minutes, paused time not credited), the way Flipd does it, which
  closes the loophole. Rules in CLAUDE.md.
