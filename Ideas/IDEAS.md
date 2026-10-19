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

**Next free IDs: I-086 · P-028**

## Background: the earlier concept

"Todo list + work cycles + living pond" (prior product idea, Oct 2026): a todo-first productivity app where
completing tasks grows a pond, with history, badges and recaps. It was designed as a free, ad-supported product.
Deep Nautilus is timer-first and for personal use instead. Ideas from it that were adopted are in CLAUDE.md; the
rest are below.

## Starting, bad days & feelings

Most people don't fail at studying, they fail at starting. See "Who we're building for" in PROBLEMS.md for the
feelings and moments behind these.

- **I-074 · "Just start" button** · `Reusable`: one tap for a tiny session ("Just 10 minutes"), for the moments
  you're procrastinating and want to feel better. When the 10 minutes end, Continue (I-063) lets you keep going
  if you've found your rhythm. Small enough that saying no feels silly.
  - Status: Parked
  - Why parked: one-tap Start already exists; this is a framing on top of it, and it needs Phase 11 to show
    whether starting is the real blocker.
  - Revisit: Phase 9 Stage D (Home rebuild) or after Phase 11.
  - Related: P-002, P-024, I-063, I-078
- **I-077 · Make studying feel like play**: the owner wants studying to feel like a game you'd actually want to
  open.
  - Status: Parked, needs a decision. This clashes with the principle "the tank is not a game" (no quests,
    farming or complex economy). The calm version already exists: the hatch roulette, the Sea life index,
    skins and the nautilus. Decide what "play" means without turning it into a game.
  - Revisit: after Phase 11, using what testers say is fun.
  - Related: P-013, P-020, I-009
- **I-078 · Bad-day mode** · `Reusable`: on a day you feel tired, low or overwhelmed, the app asks for less: a
  smaller goal ("10 minutes counts today"), a kind line, maybe a breathing minute first (I-079). Never makes
  you feel lazy for having a bad day.
  - Status: Parked
  - Why parked: the tone has to be exactly right (same as the calm companion, I-010).
  - Revisit: with I-010, after Phase 11.
  - Related: I-010, I-074, I-079
- **I-079 · Calm the mind before a session** · `Reusable`: an optional one-minute box breathing (4 in, 4 hold,
  4 out, 4 hold) with the tank's water moving in time, before Start or when you feel overwhelmed.
  - Status: Parked
  - Why parked: it must stay optional and short, never a step before studying ("low effort to start").
  - Revisit: after Phase 11, or with I-078.
  - Related: I-078

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

- **I-081 · Recall check after a session** · `Reusable`: an optional prompt at the end: "Without looking, what
  do you remember?" (one line, or just "a lot / some / not much"). Turns rereading into testing yourself.
  - Status: Parked
  - Why parked: it must stay one tap or skippable, never a chore after every session.
  - Revisit: after Phase 11.
  - Related: P-003, P-025, I-022
- **I-082 · Phone-check counter** · `Reusable`: count the quick leaves (under the 15 s that fail Deep Focus)
  and show them as a quiet stat ("you checked your phone 3 times"), so you notice the habit. Neutral, never
  scolding.
  - Status: Parked
  - Why parked: has to be framed so it informs without guilt; needs the leave events to be stored.
  - Revisit: after Phase 11.
  - Related: P-026, P-012
- **I-083 · Time vs marks** · `Reusable`: after a test, note your mark against the task or topic, and see how much
  time you'd put in before it. Answers "does studying more actually help my marks?", for the moment after a
  bad test.
  - Status: Parked
  - Why parked: it's close to subject tags (I-034, rejected as an extra step); it must work from task names
    and stay optional.
  - Revisit: after Phase 11, if testers ask what their time is getting them.
  - Related: I-034, I-076, P-020

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
- **I-075 · "What should I study?"** · `Reusable`: when you don't know what to do, one tap suggests a task:
  something due soon, an exam coming up, or a topic you haven't touched in a long time.
  - Status: Parked
  - Why parked: needs exam dates (I-076) and topic history to give good suggestions.
  - Revisit: with I-021 / I-076.
  - Related: I-021, I-022, I-076
- **I-076 · Exam dates + syllabus, and "am I falling behind?"** · `Reusable`: add an exam with its date and its
  topics; tick topics off as you study them, and see whether you're on track for the days left. Builds on the
  planner (I-021).
  - Status: Parked
  - Why parked: same as I-021: it bends "keep tasks simple", and we don't know if testers would plan here.
  - Revisit: with I-021, after Phase 11.
  - Related: I-021, I-075, I-022
- **I-080 · Your study materials on a task** · `Reusable`: attach a link to a task (a Drive PDF, a YouTube
  lecture, a NotebookLM notebook) so one tap opens it as the session starts. The smallest way to have "one
  app" without replacing the others.
  - Status: Parked
  - Why parked: tasks stay simple for now; one optional link field is the most it should add.
  - Revisit: after Phase 11, if testers jump between apps to find their material.
  - Related: P-007, P-023, I-024
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

## Help, first use & trust

Questions a normal person has before downloading, on first open, and before trusting the app with their
time. "Answers today" are what the app does now (from CLAUDE.md and the code, Oct 2026); check them with Claude
Code before writing them into the app. Today's Help page only explains how things work (sessions, tank,
rewards, planning, account); it has no FAQ, no what-ifs and no link to Privacy.

- **I-066 · "What it is" in one sentence + before-you-download answers** · `Reusable`: one line that says what
  the app does, shown on the login page, plus a few short answers for someone deciding whether to try it.
  - Questions: What does it do? How is it different from other study apps? Do other people use it? Android,
    iPhone, laptop? How much space? Who made it? Are there ads? Can I add friends?
  - Answers today: a web app, so it works in any browser on Android, iPhone and laptop, and installs like an app
    without an app store; tiny, since sounds are generated and there's nothing to download (P-015); made by
    one student for himself and friends; no ads, ever (I-037); no friends features yet (I-032). "Do others use
    it?" can only be answered honestly after Phase 11.
  - Status: Parked
  - Why parked: the login page and Help get rebuilt in Phase 9 Stage D anyway.
  - Revisit: Phase 9 Stage D. The one-liner needs writing first.
  - Related: P-020
- **I-067 · Reorganise Help: short answers first, details after** · `Reusable`: split Help into "Questions"
  (short FAQ answers, grouped: Getting started · During a session · Your progress · Privacy) and "How it works"
  (today's cards), so it answers questions without getting crowded. Each answer is one or two lines and links
  to the full card.
  - Status: Parked
  - Why parked: it needs the answers from I-066, I-068, I-069 and I-071 written first.
  - Revisit: Phase 9 Stage D (every page rebuilt), so the redesign happens once.
  - Related: I-066, I-068, I-069, I-071
- **I-068 · First-open guidance** · `Reusable`: answer the first-time questions on the screens themselves, not in
  Help: why Google sign-in, what to tap first, whether setup can be skipped.
  - Answers today: Google sign-in so your progress follows you to any device with no password to remember;
    tap Start (no setup needed, one tap); everything in "Change" can be set later.
  - Status: Parked
  - Why parked: "low effort to start" already holds; this is only words on the login page and Home.
  - Revisit: Phase 9 Stage D, or sooner if Phase 11 testers get stuck on the first screen.
- **I-069 · "What if…" answers for interruptions** · `Reusable`: short, honest answers about real life
  interrupting a session.
  - Questions and answers today:
    - An important call: in Deep Focus, more than 15 s away fails the session or block. A study fish dies (+1
      bone, no coins); a notes session grows nothing and leaves no bone. Plants never die. Banked cycle blocks
      and continued parts are kept. Open Focus never fails for leaving.
    - The restroom: in Deep Focus, tap Pause (once per session, up to 5 min, paused time doesn't count). In
      Open Focus, just go: the timer keeps running and counts.
    - The screen turning off: Deep Focus keeps the screen awake for the whole session; locking it yourself
      counts as leaving. In Open Focus the screen can sleep and the time stays right.
    - The battery dying: everything already finished is saved to your account and can't be lost. The session
      that was running is likely to end as failed in Deep Focus (it counts as leaving); check what happens in
      Open Focus.
  - Status: Parked
  - Why parked: writing these honestly shows the call case is harsh (see P-019); decide that first.
  - Revisit: with P-019, before Phase 11.
  - Related: P-019, I-039, I-073
- **I-070 · Show the end goal** · `Reusable`: make it clear what you're working towards: skins unlock up to
  150 h, the nautilus arrives at 100 h, fill the Sea life index. A quiet "next: River skin at 30 h" line, not
  a progress bar to grind.
  - Status: Parked
  - Why parked: must stay a quiet measure of real work, not a game; overlaps with depth levels (I-009).
  - Revisit: with I-009, after Phase 11.
  - Related: I-009, I-058, I-061, P-001
- **I-071 · Trust & privacy answers** · `Reusable`: plain answers to "What data do you collect? Is it safe? If I
  delete my account, is it gone? If I change phone, is my progress saved? Do you sell my data?"
  - Answers today: your Google name, email and picture, plus your sessions, tasks, cycles, decorations and
    push settings; stored with Supabase, each person can only read their own rows; never sold, no ads, not
    shared. A new phone keeps everything (it's tied to your Google account), except settings saved on the
    device (setup, Appearance) and any session that hadn't uploaded yet. Deleting today = emailing the owner.
  - Fix with it: the privacy page only mentions sessions and push; it should also list tasks, cycles,
    decorations and skins.
  - Status: Parked
  - Why parked: belongs with the Help reorganisation (I-067).
  - Revisit: with I-067. Fix the privacy page wording before Phase 11, since friends will be signing in.
  - Related: I-072, P-018
- **I-072 · Delete my account in the app** · `Reusable`: a button in Help → Account that deletes your account
  and all your data, after one confirm.
  - Status: Parked
  - Why parked: today deletion is by email, which is fine for a few friends; a real delete needs a server-side
    function (users can't delete their own rows by design).
  - Revisit: before the app goes beyond friends.
  - Related: I-071, P-018
- **I-073 · "Was that a call?" late pause**: if you come back after leaving Deep Focus and haven't used your
  pause yet, offer to count the time away as your one pause (still max 5 min, not credited), instead of
  failing.
  - Status: Parked
  - Why parked: it must not become a loophole. It uses the same once-per-session, 5-minute limits as Pause, but
    needs thought on how the failure is undone after the fact.
  - Revisit: with P-019, after real use shows how often calls kill sessions.
  - Related: P-019, I-039, I-030

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
