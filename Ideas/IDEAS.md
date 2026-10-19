# Ideas

Every idea that isn't built yet, so nothing is lost. A new feature must help organise work, finish work, make
progress rewarding, or make progress visible (see "Principles" in CLAUDE.md). If it doesn't, or it isn't
scheduled yet, it goes here.

## Rules for this folder

The `Ideas/` folder has three files:

- **IDEAS.md** (this file): ideas not built yet: parked, reconsidered and rejected.
- **DONE.md**: ideas that have been built, with the phase they shipped in.
- **PROBLEMS.md**: problems students hit with study apps. A problem is something to solve; ideas are ways to
  solve it.

1. **Never delete.** Every idea stays forever, even rejected ones, so it's never pitched again by accident.
2. **Permanent IDs.** Ideas are `I-001`, `I-002`…, problems are `P-001`… An ID is never changed or reused, even
   when an entry moves file. New entries take the next free ID below.
3. **Every idea has:** ID and title, a one-line description, Status, Why parked, Revisit, and Related (the
   problems it helps with or ideas it depends on) when there are any.
4. **Status** is one of: Parked · Reconsidered · Rejected · Partly done · Done.
5. **When an idea is built**, it moves to DONE.md with the same ID, plus "Done in: Phase X (date)".
6. **Partly done** ideas stay here until they're fully built.
7. **Rejected** ideas stay here under "Deliberately rejected", with the reason.
8. **`Reusable`** marks ideas that would work in other apps, not just Deep Nautilus.
9. This folder is edited outside Claude Code (see CLAUDE.md). Claude Code never edits it.

**Next free IDs: I-066 · P-019**

## Background: the earlier concept

"Todo list + work cycles + living pond" (prior product idea, Oct 2026): a todo-first productivity app where
completing tasks grows a pond, with history, badges and recaps. It was designed as a free, ad-supported product.
Deep Nautilus is timer-first and for personal use instead. Ideas from it that were adopted are in CLAUDE.md; the
rest are below.

## Cycles

- **I-001 · Drag-and-drop cycle builder** · `Reusable`: snap together Focus / Break / Repeat / Long break blocks
  (like Scratch blocks); build one cycle and it continues.
  - Status: Parked
  - Why parked: needs design work.
  - Revisit: after Phase 11. Phase 6 stores cycles as a list of blocks, so this only needs a new UI later.
  - Related: P-006
- **I-002 · Multi-stage custom cycles** (e.g. 45/10/45/20), with stages you can reorder or duplicate.
  - Status: Parked
  - Why parked: covered by the block builder (I-001).
  - Revisit: with I-001.

## Progress & reflection

- **I-003 · Monthly and yearly recaps** · `Reusable`: stats for the month/year, plus a time-lapse of the tank
  through every stage.
  - Status: Parked
  - Why parked: needs a lot of history and the tank visuals to settle first.
  - Revisit: after Phase 11, once there's real data from testers.
  - Related: P-001
- **I-004 · The tank changes through the year** (a yearly cycle of looks/seasons), so the recap time-lapse shows
  real change.
  - Status: Parked
  - Why parked: depends on the tank redesign and recaps (I-003).
  - Revisit: with I-003.
  - Related: P-001, P-013
- **I-005 · Personal records** · `Reusable`: most time in a day/week, most fish in a day, longest session, etc.
  - Status: Parked
  - Why parked: Phase 5 stats cover the basics (best day, longest session).
  - Revisit: after Phase 11, if testers look at their stats.
- **I-006 · Badges / milestones**, some unlocking tank content.
  - Status: Parked
  - Why parked: they must reward real work, never app activity. Phase 7 milestone decorations come first.
  - Revisit: after Phase 7.
- **I-007 · End-of-day summary**.
  - Status: Parked
  - Why parked: needs notifications (Phase 10) to be useful.
  - Revisit: after Phase 10.
- **I-008 · Holiday mode + "total days studied" first** · `Reusable`: turn on holiday mode before a long break
  (e.g. a month off) and the streak pauses: it doesn't grow, but it doesn't break either. Alongside it, make total
  days studied more prominent than the current streak, so a long run of work never feels wiped out by one gap.
  - Status: Parked
  - Why parked: the streak freeze (one forgiven day a week) covers short gaps; long breaks need a small new
    setting and a stats rethink.
  - Revisit: soon. It fits "punish quitting, never absence": a holiday should never cost you anything.
- **I-009 · Depth levels**: every hour of study takes you deeper ("You're at 340 m"), tied to the existing skin
  progression (Shallows → Deep already unlocks by hours). A way to make total progress visible.
  - Status: Parked
  - Why parked: no XP bars or levels-to-grind; it must stay a quiet measure of real work, not a game.
  - Revisit: after Phase 11 (friends testing).
  - Related: P-013
- **I-010 · Calm companion** · `Reusable`: the nautilus offers gentle, encouraging messages (progress you've
  made, a warm welcome back after a break). Warm like Duolingo's owl, but never guilt-driven: no "you missed a
  day", no nagging.
  - Status: Parked
  - Why parked: the tone has to be exactly right, and it needs real usage to know which moments matter.
  - Revisit: after Phase 11 (friends testing).
  - Related: P-001

## Tank & creatures

- **I-011 · Freshwater species come back with water types**: guppy, neon tetra, zebrafish, goldfish,
  (freshwater) angelfish and discus were in the first species list but were swapped for saltwater ones, because
  tanks don't have water types yet and every species is saltwater for now.
  - Status: Parked
  - Why parked: depends on freshwater vs saltwater tanks (I-012).
  - Revisit: with I-012.
- **I-012 · Freshwater vs saltwater tanks**: each tank gets a water type, chosen when a new tank starts.
  - Freshwater skins (Shallows, pond, river, lake) get freshwater fish and aquatic plants.
  - Saltwater skins (coral reef, deep sea) get marine fish, and corals instead of plants.
    Index note: coral is an animal.
  - Each water type has its own species pool (today's 18 species all go in the saltwater pool).
  - Status: Parked
  - Why parked: a big change to how tanks work; species exist now, but the tank stays simple for now.
  - Revisit: after Phase 11.
- **I-013 · Real underwater flowering behaviour** for plants, once plants become real species: seagrass and
  hornwort flower and pollinate fully underwater (small, inconspicuous flowers); water lilies flower at the
  surface.
  - Status: Parked
  - Why parked: today's plants are simple shapes that show maturity through size and colour, not flowers.
  - Revisit: with real species and water types (I-012, after Phase 11). Phase 9 restyles today's plants only.
- **I-014 · More special creatures like the nautilus** (unlocked by long-term milestones, not in the roulette).
  - Status: Parked
  - Why parked: one namesake is enough to see if it feels special; more would dilute it.
  - Revisit: after Phase 11, if testers care about the index.
  - Related: P-013
- **I-015 · Extra creatures** (snails, shrimp, frogs) **and extra plants** (lily pads, reeds, flowers).
  - Status: Parked
  - Why parked: the tank must stay simple, not become a game.
  - Revisit: with real species / water types (I-012).

## Sounds and video

- **I-016 · Revisit ambience** · `Reusable`: Rain is weak and some static remains in the generated sounds.
  Consider real recordings instead (Freesound CC0 / Pixabay), looped and crossfaded.
  - Status: Parked
  - Why parked: the generated five are good enough for now; recordings need sourcing, licence checks and hosting.
  - Revisit: in Phase 9 (polish) or after Phase 11 testing.
  - Related: P-017
- **I-017 · Real music tracks** (lo-fi, piano) as a library alongside the generated ambience · `Reusable`.
  - Status: Parked
  - Why parked: needs licensed or CC0 tracks (and hosting them). For now you can play your own music app in
    the background.
  - Revisit: after Phase 11 testing, if testers ask for music.
  - Related: P-017
- **I-018 · More ambient sounds** beyond the ocean (stream, rain, underwater), matched to the water type.
  - Status: Parked
  - Why parked: Phase 8 builds ocean sounds only.
  - Revisit: after Phase 8, together with water types (I-012).
  - Related: P-017
- **I-019 · Study-with-me videos**: play a YouTube "study with me" video alongside a session (e.g. a small player
  on the running screen, instead of the ambience).
  - Status: Reconsidered (was rejected, now parked; see "Reconsidered")
  - Why parked: needs a careful look at embedding, autoplay rules on phones, and how it fits Deep Focus (leaving
    the app to YouTube fails it).
  - Revisit: after Phase 10.

## Tasks

- **I-020 · Reward for completed tasks**: a task completed WITH real focus time could earn a small tank item
  (e.g. a shell or pearl). Ticking off a task with no focus time earns nothing.
  - Status: Parked
  - Why parked: rewards and tank items belong to Phase 7 (coins and decorations), and it must reward real
    work, never app activity.
  - Revisit: in Phase 7.
- **I-021 · Planner** · `Reusable`: grow Tasks into a cute, aesthetic planner: exams and assignments with
  countdowns ("Biology exam · 12 days", shown on Home) and study goals (e.g. hours per week for a subject).
  - Status: Parked
  - Why parked: it bends "keep tasks simple" (title, optional due date, done), and we don't yet know whether
    testers would plan here at all.
  - Revisit: after Phase 11 (friends testing), if they keep their to-do lists and exam dates elsewhere.
  - Related: P-011
- **I-022 · Spaced repetition reminders** · `Reusable`: after studying a topic, "revisit this topic" reminders
  after 1, 3, 7 and 21 days, built on tasks + push notifications (each reminder is a task with a due date). Not
  flashcards: NotebookLM already handles studying the content itself.
  - Status: Parked
  - Why parked: needs task reminders (I-028) to exist first.
  - Revisit: with I-028.
  - Related: P-003, P-007
- **I-023 · Subtasks and priorities**.
  - Status: Parked
  - Why parked: tasks stay simple (title, optional due date, done).
  - Revisit: only if testers ask.
- **I-024 · To-do integration** (e.g. Notion).
  - Status: Parked
  - Why parked: we don't know where testers keep their to-do lists.
  - Revisit: only if Phase 11 testers show most of them use one app.
  - Related: P-007
- **I-025 · Voice input**.
  - Status: Parked
  - Why parked: the phone keyboard's built-in mic may already be enough.
  - Revisit: only if it isn't.

## Installed app

- **I-026 · Open the app offline** · `Reusable`: the service worker (Phase 10a) caches only build files and
  pictures, never pages, so opening the installed app with no connection shows the phone's "offline" page.
  - Status: Parked
  - Why parked: pages are made per signed-in user; caching them risks showing a stale or wrong account and is
    the usual way installed apps get stuck on an old version. Sessions already save offline once the app is open.
  - Revisit: if testers often open the app with no signal (e.g. on the underground); start with one cached
    "You're offline" page, not cached real pages.
  - Related: P-016
- **I-027 · Home / lock screen widgets** showing today's progress.
  - Status: Parked
  - Why parked: not possible for a web app; widgets need a native iPhone / Android app (see I-035).
  - Revisit: only if the app ever goes native.
- **I-028 · Task reminders** (push) · `Reusable`: a notification for a task's due date. Was batch 10b-2.
  - Status: Parked
  - Why parked: we don't know yet whether friends will use Tasks at all, and reminders are a new kind of
    notification to get right (see P-004). The push infrastructure from 10b-1 and the
    `push_subscriptions.task_reminders` switch are already there, so it only needs the reminders themselves.
  - Revisit: after friends testing (Phase 11), if friends actually use Tasks and ask for reminders.
  - Related: P-004
- **I-029 · Night-mode check-in pushes**: "Still studying?" as a notification when the app isn't on screen.
  - Status: Parked
  - Why parked (10b-1): the check-in exists for falling asleep; a notification that wakes you up to tap it is
    a different feature, and in Deep Focus you can't be away anyway. Open Focus + Night mode is the only real case.
  - Revisit: if testers use Open Focus with Night mode and miss check-ins they'd have answered.
- **I-030 · "Come back, Deep Focus is about to fail"** warning a few seconds after leaving.
  - Status: Parked
  - Why parked: the 15 s grace is too short for a server round trip (the check runs every 15 s), and a buzz to
    pull you back risks feeling guilt-driven. It would need a longer grace or a local notification, which the
    web doesn't offer.
  - Revisit: if the leave grace period is lengthened after real use.
- **I-031 · A push when the Continue window closes** ("Your session ended at 45 min").
  - Status: Parked
  - Why parked: ending quietly is on purpose (every part is already banked; nothing is lost), so there's
    nothing to act on.
  - Revisit: if testers are confused about where a session went after a long break.

## Friends

- **I-032 · Friends + focus rooms**: add friends, see who's studying right now, and study rooms ("study
  servers") where friends focus at the same time. Encouragement only: no leaderboards, ever, and no ranking of
  any kind. It must stay free.
  - Status: Parked
  - Why parked: the app is for the owner and a few friends first; it needs accounts to see each other (new
    tables, RLS, privacy) and moving fish rolls / coins server-side (I-033).
  - Revisit: after Phase 11 (friends testing), if testers ask to study together.
  - Related: P-008, P-009, P-010

## Fairness

- **I-033 · Move fish roll and coin calc server-side if the app goes public or gets leaderboards.** Today the
  browser makes the session id (the fish roll's dice) and computes coins, so a determined user could pick a rare
  fish or fake coins with devtools.
  - Status: Parked
  - Why parked: it's a personal app for a few friends, with nothing to compete over, so cheating only fools yourself.
  - Revisit: if the app goes public, or if any shared or comparing features are ever added.

## Deliberately rejected (and why)

- **I-034 · Categories / subject tags**: an extra step before studying. Status: Rejected
- **I-035 · App blocking, controlling phone notifications, native-only features**: not possible on the web, and
  not needed. Status: Rejected
- **I-036 · Leaderboards**: no competition between users, ever. Status: Rejected. Related: P-008
- **I-037 · Ads, monetisation, charity**: this is a personal project. Status: Rejected

## Reconsidered

- **YouTube** (now I-019): first rejected along with ads and monetisation (I-037). Playing a "study with me"
  video during a session is a different thing (no ads from us, no money), so it's parked as an idea instead.
- **Pause button** (now I-039, in DONE.md): first rejected as a loophole around the leave rule. Built after all
  as a limited pause (Deep Focus only, once per session, up to 5 minutes, paused time not credited), the way
  Flipd does it, which closes the loophole. Rules in CLAUDE.md.
