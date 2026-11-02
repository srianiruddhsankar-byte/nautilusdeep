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

**Next free IDs: I-133 · P-047**

## Quick wins: small fixes only

The rule for the next version: no big features, just fix small problems. This list holds every idea that is
small (no new table, no new service, no new art style) and the problem it fixes. Built ones move to DONE.md as
usual; remove them from this list when they do. Sizes: **Tiny** = a few lines or words · **Small** = one screen
or one setting · **Small+** = small, but touches the database or stored data. Last full review: 2026-10-22
(every idea and problem checked again). Batches 1–3 shipped 2026-10-22, Batch 4 on 2026-10-23 (see DONE.md).

**Words and pages (Tiny)**: all done in Batches 1 and 2.

**Screens and settings (Small)**
- I-118 Remove the background seagrass (P-042)
- I-119 Make your plants stand out (P-042)
- I-120 Plants in a clear order, left to right (P-042)
- I-122 Study vs break ratio in Stats (from the breaks sessions already save) (P-043)
- I-124 Fix the lionfish turn (and check the other puppet fish) (P-045)
- I-132 Each task remembers its last setup (P-030)
- I-130 "Study until 5:00": pick an end time instead of minutes

**Small+ (touches the database or stored data)**
- I-091 Add a finished session to a task afterwards (a narrow update policy on `task_name`) (P-038)
- I-099 Download your data as CSV / JSON (P-018)
- I-008 Holiday mode: the streak pauses on a long break (needs the break dates stored)
- I-081 One-tap recall check after a session (P-025, P-031)
- I-125 Tank list, rename tanks, favourite tank (a column on `tank_skins`)
- I-082 Phone-check counter (needs quick leaves stored) (P-026)

**Not quick wins, even though they sound small:** I-086
carry-over minutes (reverses an anti-farming rule), I-094 free placement off the sand (changes how positions are
stored), I-028 task reminders (a new kind of push), I-092 voice tasks (needs an AI service), I-107 several tasks
in one session (changes how parts are recorded), I-106 floating timer (uneven browser support), I-080 study
links on tasks (a new task field), I-079 breathing (a new feature, not a fix), I-104 mascot (needs art).

## Background: the earlier concept

"Todo list + work cycles + living pond" (prior product idea, Oct 2026): a todo-first productivity app where
completing tasks grows a pond, with history, badges and recaps. It was designed as a free, ad-supported product.
Deep Nautilus is timer-first and for personal use instead. Ideas from it that were adopted are in CLAUDE.md; the
rest are below.

## Starting, bad days & feelings

Most people don't fail at studying, they fail at starting. See "Who we're building for" in PROBLEMS.md for the
feelings and moments behind these.

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
- **I-130 · Study until a time** · `Reusable`: instead of choosing minutes, pick an end time: it's 4:12 pm, you want
  to study until 5:00, so you set "Until 5:00" and the app runs a 48-minute timer. Handy when you have a class or
  a meal at a fixed time.
  - Status: Parked
  - Why parked: raised 2026-11-02. Small: one more option in "How long" that turns a clock time into minutes at
    Start (the timer itself doesn't change; odds and coins follow the minutes as usual). The only rule needed:
    an end time that has already passed today means tomorrow, or is refused with a kind line.
  - Revisit: a quick win; fits the next batch that touches the setup sheet.
  - Related: I-041, I-087, P-030
- **I-131 · Plan sessions ahead** · `Reusable`: set up study sessions in advance ("Today 6:00 pm · 45 min · Bio
  worksheet"), get a reminder when it's time, and start it with one tap with everything already set.
  - Status: Parked
  - Why parked: raised 2026-11-02. It's a small planner: planned sessions need saving (a new table), and the
    reminder needs a new kind of push (like task reminders, I-028). Overlaps the planner (I-021) and the
    calendar link (I-129), so it should be designed with them.
  - Revisit: after Phase 11, if testers plan their study days; with I-021 / I-028.
  - Related: I-021, I-028, I-129, I-130, P-024
- **I-121 · Take a break any time (timer and stopwatch)** · `Reusable`: a "Take a break" button on the running
  screen, next to Give up / Stop. The focus so far is banked, a break timer runs (not counted as study), and
  "Back to it" starts the next part. Today the only options mid-session are Give up / Stop, or the one 5-minute
  Pause in Deep Focus.
  - How it could work: build on Continue session (I-063), which already does "focus · break · focus" as linked
    parts of one session, but only after the time is up. "Take a break" would start that same break early.
    Breaks are already free to leave, even in Deep Focus, and earn nothing.
  - Status: Parked
  - Why parked: raised 2026-11-01. Changes the running session's logic, so not a quick win. Open questions: how
    long a break can last before the session ends by itself (Continue's 15-minute window?), and how it fits with
    the one Pause and the free interruption, which would mostly become unnecessary.
  - Revisit: after Batch 5, as the first bigger change; or after Phase 11 if testers miss it.
  - Related: P-043, I-063, I-039, I-073, I-122

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
- **I-104 · A mascot**: a character that shows up around the app (Home, the result screen, empty states) to make
  it more fun and exciting.
  - Status: Parked
  - Why parked: the nautilus is the natural mascot (the namesake, and the calm companion idea, I-010, already
    gives it a voice). A mascot must stay calm and kind, never Duolingo-style guilt, and must not turn the app
    into a game ("the tank is not a game"). Needs art, so it waits for a settled style.
  - Revisit: with I-010 and I-077, after Phase 11.
  - Related: I-010, I-077, I-061
- **I-115 · A stats page for each task** · `Reusable`: tap a task (in Tasks or in Stats' "time per task") to see
  its own numbers: total time, number of sessions, when you worked on it, and time per day as a small chart.
  - Today: Stats already has "time per task" (Phase 6) and Done history shows each finished task's focus time,
    so the data exists. What's missing is one place per task with more than a total.
  - Status: Parked
  - Why parked: raised 2026-11-01. Small (the data is there), but it's a new screen.
  - Revisit: after Phase 11, if testers use tasks; or with I-107 (several tasks per session).
  - Related: I-048, I-107, I-091, P-012
- **I-122 · Study vs break ratio** · `Reusable`: show how much you studied compared with how much you rested:
  per session on the result screen ("45 min study · 10 min break") and over a week in Stats ("82% focus, 18%
  breaks"). Breaks are a healthy part of studying, so it's shown neutrally, never as "too many breaks".
  - Today: continued sessions and cycles already save their parts with each break's length (`sessions.parts`),
    and the result screen already describes them ("12 min study · 10 min break · 12 min study").
  - Status: Parked
  - Why parked: raised 2026-11-01. Small for Stats, but most plain sessions have no breaks to count until I-121
    exists.
  - Revisit: with I-121, or as a Stats quick win now.
  - Related: I-121, I-063, P-012, I-098
- **I-116 · Daily goal** · `Reusable`: set a goal for the day ("3 hours") and see how close you are: a quiet
  progress line on Home ("1 h 40 m of 3 h"), and a kind moment on the result screen when you reach it.
  - Status: Parked
  - Why parked: raised 2026-11-01. Must stay encouraging: missing a goal never breaks anything, never scolds,
    and doesn't touch the streak (the streak keeps its 5-minute rule). Saving the goal on the device is small;
    saving it to your account (same goal on phone and laptop) needs a small database change.
  - Revisit: after Batch 5, as a small next step; or after Phase 11.
  - Related: I-070, I-021, P-001, P-024
- **I-117 · Add study time by hand** · `Reusable`: you studied 2 hours without your phone, so you add it
  afterwards: date, start time, length, Study or Notes, optional task. It counts in your stats, streak and time
  per task.
  - Status: Parked
  - Why parked: raised 2026-11-01. The app can't check a manual entry (see P-041), and "the tank rewards real
    work". Suggested rule: hand-added time counts for stats, streak and tasks, but grows no fish or plant and
    earns no coins, and is marked "added by hand" in stats. Needs a new session kind in the database.
  - Revisit: after Phase 11, if testers often study away from their phone.
  - Related: P-041, P-021, P-003, I-091

## Tank & creatures

- **I-086 · Short sessions still count toward the next fish or plant**: 12 minutes of notes grows nothing
  today (a plant needs 15), and a study session under 5 minutes makes no fish. Carry those minutes forward so
  they help the next plant or fish, instead of feeling wasted.
  - Status: Parked
  - Why parked: it reverses a deliberate rule ("minutes never add up across sessions", and under 5 min = no fish
    to stop farming). Needs a design that can't be farmed with lots of tiny sessions.
  - Revisit: after Phase 11, if testers say short sessions feel wasted.
  - Related: P-032, I-055
- **I-087 · Fair, open roulette** · `Reusable`: show the odds for your session length in plain words, never let
  coins buy a roll, and maybe a gentle guarantee (e.g. a new species after a long run of repeats).
  - Status: Partly done (2026-10-22, Batch 3): the odds are shown in plain words. Still parked: the gentle
    guarantee.
  - Why parked: the roulette is new; the guarantee needs care so it doesn't change fish already caught (species
    are saved on the session, so it only affects future hatches).
  - Revisit: after Phase 11, if testers call it unfair or gambling-like.
  - Related: P-033, I-060
- **I-093 · Make decorations more visible**: today they sit on the sand behind plants and fish, so they're easy
  to miss. Make them read clearly: bigger, nearer the front, or with fish swimming around them rather than over
  them.
  - Status: Partly done (2026-10-22, Batch 3): decorations draw about 25% bigger. Still parked: bringing
    them in front of plants and fish (with I-094).
  - Why parked: it's tank art and layering, so it should be tuned together with I-094.
  - Revisit: with I-094, after Phase 11 or in a tank polish pass.
  - Related: I-057, I-094, P-036
- **I-094 · Move decorations freely** · `Reusable`: drag a decoration anywhere in the tank (not just along the
  sand), choose what's in front, and put it away to a storage box to use later.
  - Today (per CLAUDE.md): decorations can only sit on the sand (`x` across, `y` front to back) and can only be
    moved on the Shop page. A storage box already exists: "Put away" sends an item to "Your items", with no
    refund. If people don't find it, the fix is making it obvious, not building a new one.
  - Status: Parked
  - Why parked: placing things off the sand (floating, on rocks) changes how the tank stores positions;
    decorating must also never take longer than studying.
  - Revisit: after Phase 11, if testers decorate at all.
  - Related: I-057, I-093
- **I-118 · Remove the background seagrass** · `Reusable`: each skin's scenery draws its own seagrass, which looks
  like your plants, so you can't tell what you grew from what's just decoration. Take it out of the scenery (in
  `tank4/scenery.ts`), so every plant in the tank is one you earned.
  - Status: Parked
  - Why parked: raised 2026-11-01 by the owner. Tiny (one scenery change), but check each skin still looks
    finished without it (it may need rocks or sand detail instead).
  - Revisit: next tank batch; a quick win.
  - Related: P-042, I-119, I-120, P-039
- **I-119 · Make your plants stand out** · `Reusable`: your plants should be the clearest thing on the sand:
  a little bigger, fully opaque, richer colour, drawn in front of the scenery, and never hidden behind
  decorations or the fish lanes.
  - Status: Parked
  - Why parked: raised 2026-11-01. Small art tuning in Tank 4 (sizes and layer order), no new art.
  - Revisit: next tank batch, with I-118 and I-120.
  - Related: P-042, I-118, I-120, I-093
- **I-120 · Plants in a clear order** · `Reusable`: today the 6 plant spots on the sand look scattered, so the order
  feels random. Place them left to right in the order you grew them, evenly spaced, each fully visible.
  - Status: Parked
  - Why parked: raised 2026-11-01. Small: only the 6 slot positions change. Plants are derived from sessions,
    so existing plants simply re-arrange; no migration. Decorations keep their own positions.
  - Revisit: next tank batch, with I-118 and I-119.
  - Related: P-042, I-118, I-119, I-055
- **I-123 · Fishdom-level fish art** · `Reusable`: every species should look like the real fish, in a polished
  cartoon style (the owner's reference: Fishdom), and swim with lively, natural movement.
  - Today: Tank 4 already supports paintings. A file at `public/fish/<species id>.png` replaces that species'
    drawing (`tank4/art-files.ts`, the recipe is in the file), and the rope rig bends the painting along the swim,
    so new art doesn't need a new engine.
  - Plan: make one cartoon painting per species that closely matches the real fish (18 species + the nautilus),
    side view, transparent background, then tune each species' swim in `fish-art.ts`. The images could be
    AI-generated or drawn, but must be ours to use: check the generator's licence, and never copy Fishdom's
    actual art (only the level of polish). Movement like Fishdom (fins, tail, body) is the rig's job, not the image's.
  - Status: Parked
  - Why parked: raised 2026-11-01. The biggest art job left; worth doing before friends judge the app on looks,
    but it's art time, not code time.
  - Revisit: as its own "tank art" batch after the quick wins; start with 2–3 species to test the look.
  - Related: P-044, P-039, I-038, I-124
- **I-124 · Fix the lionfish turn** · `Reusable`: the lionfish still turns like a flat 2D cutout (it just spins),
  instead of the sideways turn the other fish use.
  - Today: the lionfish is a "puppet" (cut from its art and turned around joints, `tank4/puppets.ts`), not a rope
    fish, so it may have missed the newer turn. Check the puffer and sunfish too: they're puppets cut the same way.
  - Status: Parked
  - Why parked: a bug, found 2026-11-01. Small.
  - Revisit: the next batch; a quick win.
  - Related: P-045, I-038, I-123
- **I-125 · Your tanks: a list, names and a favourite** · `Reusable`: see all your tanks in one list (with how
  many fish and plants each has), rename them ("Exam season"), and pick a favourite that Home opens on instead
  of the newest.
  - Today: tanks are worked out from your sessions (10 fish each), and each one's skin is already saved in
    `tank_skins`, so a name and a favourite flag could go in the same table (a small migration).
  - Status: Parked
  - Why parked: raised 2026-11-01. Small+, since it needs a database change. Note: tank numbers point at the
    worked-out tanks, so changing how many fish fit in a tank would move names to different tanks.
  - Revisit: after Batch 5, with other Small+ items; or after Phase 11 when people have several tanks.
  - Related: I-058, I-095, I-114
- **I-126 · About 50 fish species** · `Reusable`: 18 species is too few for variety; grow the roulette to around 50,
  so the Sea life index takes much longer to fill and new catches keep coming.
  - How (rules in CLAUDE.md): species ids are stored on sessions, so add new species only at the END of their
    rarity tier, never rename or reorder, and add each id to the `sessions_species_check` constraint in a new
    migration. Fish already caught keep their species. Each new species needs a painting (I-123), a checked
    fact, and its swim tuned in `fish-art.ts`.
  - Freshwater species (guppy, neon tetra, goldfish…) wait for water types (I-011, I-012); until then the new
    ones are saltwater.
  - Status: Parked
  - Why parked: raised 2026-11-01. Each species is art + fact + tuning, so it's art time more than code time.
    Best done together with I-123, in steps (e.g. 18 → 30 → 50), keeping the rarity tiers balanced.
  - Revisit: with I-123 (the tank art batch).
  - Related: I-123, I-060, I-011, I-012, I-014, P-013
- **I-127 · Bigger tanks you grow into** · `Reusable`: instead of a new 10-fish tank every few days, tanks get
  bigger as you study more (e.g. 10 → 15 → 20 → 25 fish, more decoration and plant spots), so a year of studying
  is a handful of big tanks, not 100+ small ones.
  - The safe rule: a tank's size is fixed when it starts, by your total hours at that moment (like skins). Hours
    only go up, so old tanks never change size and their fish, skins, decorations and names never move. Changing
    the size of tanks that already exist would shift every tank number (CLAUDE.md warns about this).
  - Owner's rule (2026-11-01): when a tank is resized, its decorations stay in that tank. That works if only
    your CURRENT (newest) tank can grow: no tank comes after it, so no fish shift between tanks, and older tanks
    stay as they are. Decorations are stored as positions in % of the tank (`x` 0–100 %, `y` 0–1), so they keep
    their place when the tank gets bigger.
  - Limit: more fish means more drawing work per frame (rope fish at 30 fps), so the biggest size must still run
    smoothly on a phone (and in Low graphics, I-105).
  - Status: Parked
  - Why parked: raised 2026-11-01. Changes how tanks are worked out from sessions, so it needs care and tests;
    not a quick win.
  - Revisit: before Phase 11 if possible (testers will hit this within weeks); with I-128.
  - Related: P-046, I-128, I-125, I-058, I-105
- **I-128 · Organising your tanks** · `Reusable`: with many tanks, group them so they stay manageable: by month or
  season ("October 2026"), the current tank first, older ones folded into an "Aquarium" archive you can browse.
  Builds on the tank list (I-125).
  - Status: Parked
  - Why parked: raised 2026-11-01. Grouping by month is easy (tanks are worked out from dated sessions), but the
    list itself (I-125) comes first.
  - Revisit: with I-125 and I-127.
  - Related: P-046, I-125, I-127
- **I-114 · Name your fish** · `Reusable`: tap a fish in the tank and give it a name ("Bubbles"). The name shows
  on its tank card and in the Sea life index next to the species. Optional, never asked for, so it never adds a
  step after a session.
  - Status: Parked
  - Why parked: raised 2026-10-23. Fish aren't stored as their own rows (they're derived from sessions, which
    can't be edited), so names need a tiny new table (session id → name) with RLS and a migration. Small, but
    not a quick win under the "no new table" rule.
  - Revisit: after Phase 11, if testers get attached to their fish; or as the first "Small+" after Batch 5.
  - Related: I-045, I-060, I-091
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
  - Related: I-092
- **I-091 · Add a finished session to a task afterwards** · `Reusable`: you studied an hour and forgot to pick a
  task; on the result screen or in recent sessions, pick or type the task and the hour counts toward it (time
  per task, done history).
  - Status: Parked
  - Why parked: sessions can't be edited today by design (RLS: insert and select only). This needs a
    narrow exception that allows changing only `task_name`, and only on your own sessions.
  - Revisit: Phase 9 Stage D (result screen), or after Phase 11 if testers forget to pick tasks.
  - Related: I-049, I-048
- **I-092 · Speak your tasks, the app sorts them out** · `Reusable`: tap the mic, say everything ("bio
  assignment Friday, revise chapter 3, exam on the 30th") and the app turns it into separate tasks with due
  dates, for you to check before saving.
  - Status: Parked
  - Why parked: splitting speech into tasks and dates needs an AI model, which means an API key, a cost per use
    and sending your words to another service (the privacy page would have to say so). A big step for a small
    personal app.
  - Revisit: after Phase 11, if testers add lots of tasks and find typing slow.
  - Related: I-025, I-028, I-071
- **I-107 · More than one task in a session** · `Reusable`: pick several tasks for one session (e.g. "Bio
  worksheet" + "Chem reading"), and the result screen offers "Mark done" for each.
  - The open question: how the time is split. Best option: switch tasks mid-session with one tap, so each task
    gets the real minutes spent on it. Splitting the time evenly is simpler but less true.
  - Today: Continue session already lets each part have its own task, and sessions already store time per task
    in `sessions.parts`, so switching mid-session builds on what exists.
  - Status: Parked
  - Why parked: changes the setup and running screens and how parts are recorded; tasks stay simple until
    testers show they need it.
  - Revisit: Phase 9 Stage D (setup screen), or after Phase 11 if testers ask.
  - Related: I-049, I-063, I-090, I-091
- **I-132 · Each task remembers its setup** · `Reusable`: pick a task and the setup switches to what you used last
  time for it (e.g. "Bio worksheet" → 50/10 cycle, Deep Focus, Study, Rain), so a regular task needs no setting up.
  A small line says so ("Your last setup for Bio worksheet"), and you can still change anything.
  - How: the simplest version reads the last session with that task's name (sessions already save the mode,
    Deep / Open Focus, Study / Notes and the cycle name), so no new storage. Things sessions don't save (the
    timer length you picked, the ambience) could be remembered on the device next to the setup prefs.
  - Status: Parked
  - Why parked: raised 2026-11-02. Small, but it changes how the setup sheet fills itself in, so it must never
    surprise you: a task with no history keeps your current setup.
  - Revisit: a quick win; with I-130 in the next batch that touches the setup sheet.
  - Related: I-049, I-090, P-030, I-130

## Installed app

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
  - Asked again: 2026-10-21, by the owner, for reminders on all tasks.
  - Related: P-004
- **I-029 · Night-mode check-in pushes**: "Still studying?" as a notification when the app isn't on screen.
  - Status: Parked
  - Why parked (10b-1): the check-in exists for falling asleep; a notification that wakes you up to tap it is
    a different feature, and in Deep Focus you can't be away anyway. Open Focus + Night mode is the only real case.
  - Revisit: if testers use Open Focus with Night mode and miss check-ins they'd have answered.
- **I-030 · "Come back, Deep Focus is about to fail"** warning a few seconds after leaving.
  - Status: Partly done: since 2026-10-20, with notifications on, a "Still away?" push comes a minute before
    the free interruption's 5 minutes run out. A warning in the first 15 s still isn't possible.
  - Why parked: the 15 s grace is too short for a server round trip (the check runs every 15 s), and a buzz to
    pull you back risks feeling guilt-driven. It would need a longer grace or a local notification, which the
    web doesn't offer.
  - Revisit: if the leave grace period is lengthened after real use.
- **I-031 · A push when the Continue window closes** ("Your session ended at 45 min").
  - Status: Parked
  - Why parked: ending quietly is on purpose (every part is already banked; nothing is lost), so there's
    nothing to act on.
  - Revisit: if testers are confused about where a session went after a long break.

- **I-106 · Timer and tank stay on screen when you leave the app** · `Reusable`: a small floating window
  (picture-in-picture) with the time left and your tank swimming, over other apps. Satisfying to glance at.
  - How the web can do it: on laptops, Chrome's Document Picture-in-Picture (a real mini window). On phones,
    only video can float, so the tank would be drawn into a video stream; that works in Android Chrome and
    partly in iPhone Safari. Lock-screen timers (Live Activities) are native-only (I-035).
  - Status: Parked
  - Why parked: browser support is uneven, and it mostly helps Open Focus: in Deep Focus, leaving still fails
    the session after 15 s, so a floating timer must not suggest leaving is fine.
  - Revisit: after Phase 11, starting with the laptop version (the easiest).
  - Related: I-042, I-095, I-027, P-023

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

- **I-072 · Delete my account in the app** · `Reusable`: a button in Help → Account that deletes your account
  and all your data, after one confirm.
  - Status: Parked
  - Why parked: today deletion is by email, which is fine for a few friends; a real delete needs a server-side
    function (users can't delete their own rows by design).
  - Revisit: before the app goes beyond friends.
  - Related: I-071, P-018
- **I-099 · Download your data** · `Reusable`: one button that downloads your sessions and tasks as CSV / JSON.
  Sending exams to Google Calendar is a separate, later step.
  - Status: Parked
  - Why parked: sessions are already raw records, so this is small; but it's only useful once people have
    months of data.
  - Revisit: before the app goes beyond friends, or if a tester asks.
  - Related: P-018, I-071, I-072
- **I-129 · Calendar subscribe link** · `Reusable`: a private link you add to Google Calendar (or Apple Calendar)
  once; your tasks with due dates (and later exams, I-076) appear there and stay up to date.
  - How hard: the subscribe link is the easy way: the app serves a calendar feed (an .ics file) at a secret URL,
    and Google Calendar reads it. No Google permission screen. Downsides: one-way only (app → calendar), and
    Google refreshes subscribed calendars slowly (every few hours, sometimes longer).
  - The hard way, real Google Calendar access (adding and editing events directly), needs the Calendar
    permission on your Google sign-in. That's a "sensitive" permission: Google reviews the app before strangers
    can use it, and until then users see an "unverified app" warning. Days of work plus the review.
  - Status: Parked
  - Why parked: raised again 2026-11-01 (Google Calendar was parked from the start). Only worth it if testers
    keep their dates in Google Calendar (a Phase 11 question).
  - Revisit: after Phase 11; start with the subscribe link.
  - Related: P-018, P-007, I-028, I-076

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
