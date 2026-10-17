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

## Sounds

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

## Tasks

- **Reward for completed tasks**: a task completed WITH real focus time could earn a small tank item
  (e.g. a shell or pearl). Ticking off a task with no focus time earns nothing.
  - Why parked: rewards and tank items belong to Phase 7 (coins and decorations), and it must reward real
    work, never app activity.
  - Revisit: in Phase 7.
- **Subtasks and priorities**.
  - Why parked: tasks stay simple (title, optional due date, done).
  - Revisit: only if testers ask.
- **To-do integration** (e.g. Notion).
  - Why parked: we don't know where testers keep their to-do lists.
  - Revisit: only if Phase 11 testers show most of them use one app.
- **Voice input**.
  - Why parked: the phone keyboard's built-in mic may already be enough.
  - Revisit: only if it isn't.

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
- **Ads, monetisation, charity, YouTube**: this is a personal project.

## Reconsidered

- **Pause button**: first rejected as a loophole around the leave rule. Built after all as a limited pause
  (Deep Focus only, once per session, up to 5 minutes, paused time not credited), the way Flipd does it, which
  closes the loophole. Rules in CLAUDE.md.
