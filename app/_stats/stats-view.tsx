"use client";

import { useContext, useEffect, useMemo, useState, type CSSProperties, type ReactNode } from "react";
import { RARITIES, RARITY_LABEL, speciesById } from "@/lib/species";
import { MATURE_MINUTES, PLANT_MIN_MINUTES, deriveGarden, type Garden } from "@/lib/plants";
import { SKIN_UNLOCKS, formatHours, nextSkin, skinUnlocked } from "@/lib/economy";
import { useSessions } from "@/lib/sessions-data";
import { useEconomy } from "@/lib/use-economy";
import {
  computeAllStats,
  formatDay,
  formatDuration,
  formatHour,
  weekdayIndex,
  type Stats,
} from "@/lib/stats";
import { taskCompletions } from "@/lib/task-views";
import { useTasks } from "@/lib/tasks";
import { SESSION_TYPE_LABEL, type SessionType } from "@/lib/timer";
import { useClock } from "@/lib/use-clock";
import { ButtonLink } from "../_ui/button";
import { Card } from "../_ui/card";
import { EmptyState, Skeleton } from "../_ui/feedback";
import { StatGrid, StatTile } from "../_ui/stat";
import { Tabs } from "../_ui/tabs";
import { CountUp } from "../_ui/count-up";
import { useLoadFade } from "../_ui/motion";
import { BarList, ColumnChart, Heatmap, StatsIntro } from "./charts";

const MODE_LABEL = { timer: "Timer", stopwatch: "Stopwatch", cycle: "Cycle" } as const;
const WEEKDAY_SHORT = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const TYPES: SessionType[] = ["study", "notes"];

// The intro plays the first time Stats is shown after the app opens (this
// module stays loaded while you move between tabs), never on every visit.
let introPlayed = false;
const INTRO_MS = 1600; // long enough for the slowest intro animation to finish

const percent = (part: number, whole: number) =>
  whole > 0 ? `${Math.round((part / whole) * 100)}%` : "–";

export function StatsView() {
  const { rows, error } = useSessions();
  const { tasks } = useTasks();
  const economy = useEconomy();
  const clock = useClock();
  const [type, setType] = useState<SessionType>("study");
  const all = useMemo(
    () => (rows && clock ? computeAllStats(rows, clock.now, clock.timeZone) : null),
    [rows, clock],
  );
  const garden = useMemo(() => (rows ? deriveGarden(rows) : null), [rows]);
  const completed = useMemo(
    () => (tasks && clock ? taskCompletions(tasks, clock.now, clock.timeZone) : null),
    [tasks, clock],
  );
  const ready = all !== null;
  const fade = useLoadFade(ready);
  // On for INTRO_MS once the numbers are there, then off, so switching Study /
  // Notes or opening More stats later never replays it.
  const [intro, setIntro] = useState(() => !introPlayed);
  useEffect(() => {
    if (!ready) return;
    introPlayed = true;
    const timer = setTimeout(() => setIntro(false), INTRO_MS);
    return () => clearTimeout(timer);
  }, [ready]);

  if (!all) {
    if (error) return <p role="alert" className="text-sm text-danger">Couldn&apos;t load your sessions: {error}</p>;
    return (
      <div className="flex flex-col gap-5" aria-busy="true" aria-label="Loading stats">
        <Skeleton className="h-64 rounded-card" />
        <Skeleton className="h-28 rounded-card" />
        <Skeleton className="h-40 rounded-card" />
      </div>
    );
  }

  const { overview } = all;
  return (
    <StatsIntro.Provider value={intro}>
      <div className={`flex flex-col gap-5 ${intro ? "stagger-in" : fade}`}>
        {/* Study and notes together: both keep the streak alive. */}
        <Section
          title="Streak"
          note="A day counts with 5+ minutes of study or notes. One missed day per week (Mon–Sun) is forgiven, but never two in a row."
        >
          <Tiles>
            <Tile label="Current streak" value={days(overview.streak.current)} />
            <Tile label="Longest streak" value={days(overview.streak.longest)} />
          </Tiles>
          <Heatmap
            today={overview.today}
            monthLabel={(day) =>
              new Date(`${day}T00:00:00Z`).toLocaleDateString(undefined, { timeZone: "UTC", month: "short" })
            }
            weeks={overview.heatmap.map((week) =>
              week.map((c) => ({
                ...c,
                label: c.day === overview.today ? `Today, ${formatDay(c.day)}` : formatDay(c.day),
                display: c.forgiven ? `${formatDuration(c.seconds)} · forgiven ❄` : formatDuration(c.seconds),
              })),
            )}
          />
        </Section>

        <Section title="Tasks done">
          <StatGrid cols={3}>
            <Tile label="Today" value={completed ? String(completed.today) : "–"} />
            <Tile label="This week" value={completed ? String(completed.week) : "–"} />
            <Tile label="This month" value={completed ? String(completed.month) : "–"} />
          </StatGrid>
        </Section>

        <Section title="Coins & tank" note="1 coin per focus minute (Open Focus: half). Study and notes both count.">
          <Tiles>
            <Tile label="Earned" value={economy.earned === null ? "–" : String(economy.earned)} />
            <Tile label="Spent" value={economy.spent === null ? "–" : String(economy.spent)} />
            <Tile label="Decorations" value={economy.owned ? String(economy.owned.length) : "–"} sub="Owned" />
            <SkinTile hours={economy.hours} />
          </Tiles>
        </Section>

        <Tabs<SessionType>
          label="Session type"
          idPrefix="stats"
          value={type}
          onChange={setType}
          tabs={TYPES.map((t) => ({ id: t, label: SESSION_TYPE_LABEL[t] }))}
        />

        <div key={type} role="tabpanel" className="swap-in" id="stats-panel" aria-labelledby={`stats-tab-${type}`}>
          {/* key: switching tabs resets each chart's selected column. */}
          <TypeStats key={type} type={type} stats={all[type]} garden={garden} />
        </div>
      </div>
    </StatsIntro.Provider>
  );
}

function TypeStats({ type, stats, garden }: { type: SessionType; stats: Stats; garden: Garden | null }) {
  const study = type === "study";
  const intro = useContext(StatsIntro);
  const peakHour = stats.hours.reduce((best, s, h) => (s > stats.hours[best] ? h : best), 0);
  const hasHours = stats.hours[peakHour] > 0;
  const focusTotal = stats.focusMode.deep + stats.focusMode.open;

  if (stats.sessions.total === 0) {
    return (
      <EmptyState title={study ? "No study sessions yet" : "No notes sessions yet"}>
        {study
          ? "Finish a session on Home and your study time shows up here."
          : "Choose Notes in the session settings on Home. Notes sessions grow plants."}
      </EmptyState>
    );
  }

  // In the intro its cards follow the four above (Streak, Tasks, Coins, the tabs).
  return (
    <div
      className={`flex flex-col gap-5 ${intro ? "stagger-in" : ""}`}
      style={{ "--stagger-from": 4 } as CSSProperties}
    >
      <Section title={study ? "Study time" : "Notes time"}>
        <Tiles>
          <Tile label="Today" value={formatDuration(stats.focus.today)} />
          <Tile label="This week" value={formatDuration(stats.focus.week)} sub="Since Monday" />
          <Tile label="This month" value={formatDuration(stats.focus.month)} />
          <Tile label="All time" value={formatDuration(stats.focus.allTime)} />
        </Tiles>
      </Section>

      <Section title="Last 7 days">
        <ColumnChart
          tableHeading="Day"
          defaultIndex={6}
          columns={stats.last7.map((d, i) => ({
            key: d.day,
            label: i === 6 ? `Today, ${formatDay(d.day)}` : formatDay(d.day),
            tick: i === 6 ? "Today" : WEEKDAY_SHORT[weekdayIndex(d.day)],
            value: d.seconds,
            display: formatDuration(d.seconds),
          }))}
        />
      </Section>

      {!study && garden && (
        <Section
          title="Plants"
          note={`One plant per notes session of ${PLANT_MIN_MINUTES}+ min; the longer the session, the bigger it grows (mature at ${formatDuration(MATURE_MINUTES * 60)}).`}
        >
          <Tiles>
            <Tile label="Grown" value={String(garden.plants.length)} sub="In your tanks" />
            <Tile label="Mature" value={String(garden.plants.filter((p) => p.stage === "mature").length)} sub={`From ${formatDuration(MATURE_MINUTES * 60)} sessions`} />
          </Tiles>
        </Section>
      )}

      {!study && (
        <Section title="Target vs actual" note="Notes stopwatch sessions with a target, not failed.">
          {stats.target ? (
            <Tiles>
              <Tile
                label="Average time"
                value={formatDuration(stats.target.averageActualSeconds)}
                sub={`Target ${formatDuration(stats.target.averageTargetSeconds)}`}
              />
              <Tile
                label="Average difference"
                value={formatDifference(stats.target.averageActualSeconds - stats.target.averageTargetSeconds)}
              />
              <Tile
                label="Within target"
                value={`${stats.target.onOrUnder} of ${stats.target.sessions}`}
                sub={percent(stats.target.onOrUnder, stats.target.sessions)}
              />
            </Tiles>
          ) : (
            <p className="text-sm text-muted">No notes sessions with a target yet.</p>
          )}
        </Section>
      )}

      {study && <FishCaught stats={stats} />}

      <Section title="Time per task">
        {stats.tasks.length > 0 ? (
          <BarList
            rows={stats.tasks.map((t) => ({
              label: t.name,
              value: t.seconds,
              display: `${formatDuration(t.seconds)} · ${t.sessions} ${t.sessions === 1 ? "session" : "sessions"}`,
            }))}
          />
        ) : (
          <p className="text-sm text-muted">No sessions with a task yet.</p>
        )}
      </Section>

      {/* The everyday numbers are above; the rest is one tap away. */}
      <details className="disclosure group">
        <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between rounded-card bg-card px-4 shadow-card transition-colors duration-(--dur-fast) hover:bg-soft [&::-webkit-details-marker]:hidden">
          <span className="title-card">More stats</span>
          <span aria-hidden className="text-muted transition-transform duration-(--dur) ease-snap group-open:rotate-90">
            ›
          </span>
        </summary>
        <div className="flex flex-col gap-5 pt-5">
          <Section title="Sessions">
            <Tiles>
              <Tile label="Total" value={String(stats.sessions.total)} />
              <Tile label="Longest" value={formatDuration(stats.sessions.longestSeconds)} />
              <Tile
                label="Average"
                value={formatDuration(stats.sessions.averageSeconds)}
                sub="Completed + partial"
              />
            </Tiles>
          </Section>

          <Section title="Outcomes">
            <BarList
              rows={[
                { label: "Completed", value: stats.outcomes.completed, display: String(stats.outcomes.completed) },
                { label: "Partial", value: stats.outcomes.partial, display: String(stats.outcomes.partial) },
                { label: "Failed", value: stats.outcomes.failed, display: String(stats.outcomes.failed) },
              ]}
            />
            <Tiles>
              <Tile
                label="Completion rate"
                value={
                  stats.outcomes.completionRate === null
                    ? "–"
                    : `${Math.round(stats.outcomes.completionRate * 100)}%`
                }
                sub={study ? "Kept their fish" : "Not failed"}
              />
              {study && <Tile label="Bones" value={String(stats.bones)} sub="Fish lost" />}
            </Tiles>
          </Section>

          <Section title="Deep vs Open Focus">
            <BarList
              rows={[
                {
                  label: "Deep Focus",
                  value: stats.focusMode.deep,
                  display: `${formatDuration(stats.focusMode.deep)} · ${percent(stats.focusMode.deep, focusTotal)}`,
                },
                {
                  label: "Open Focus",
                  value: stats.focusMode.open,
                  display: `${formatDuration(stats.focusMode.open)} · ${percent(stats.focusMode.open, focusTotal)}`,
                },
              ]}
            />
          </Section>

          <Section title="Modes">
            <BarList
              rows={(["timer", "stopwatch", "cycle"] as const).map((mode) => ({
                label: MODE_LABEL[mode],
                value: stats.modes[mode].seconds,
                display: `${formatDuration(stats.modes[mode].seconds)} · ${stats.modes[mode].sessions} ${
                  stats.modes[mode].sessions === 1 ? "session" : "sessions"
                }`,
              }))}
            />
            {stats.mostUsedCycle && (
              <p className="text-sm">
                <span className="text-muted">Most-used cycle: </span>
                <span className="font-semibold">{stats.mostUsedCycle.name}</span>
                <span className="text-muted">
                  {" "}
                  · {stats.mostUsedCycle.sessions} {stats.mostUsedCycle.sessions === 1 ? "session" : "sessions"}
                </span>
              </p>
            )}
          </Section>

          <Section title="Records">
            <Tiles>
              <Tile
                label="Best day"
                value={stats.bestDay ? formatDuration(stats.bestDay.seconds) : "–"}
                sub={stats.bestDay ? formatDay(stats.bestDay.day, true) : undefined}
              />
              <Tile
                label="Most productive"
                value={hasHours ? `${formatHour(peakHour)}–${formatHour((peakHour + 1) % 24)}` : "–"}
                sub={hasHours ? formatDuration(stats.hours[peakHour]) : undefined}
              />
            </Tiles>
          </Section>

          <Section title="Time of day" note="Focus time by hour, spread over the hours each session ran.">
            <ColumnChart
              tableHeading="Hour"
              height={96}
              defaultIndex={peakHour}
              columns={stats.hours.map((seconds, h) => ({
                key: String(h),
                label: `${formatHour(h)}–${formatHour((h + 1) % 24)}`,
                tick: h % 6 === 0 ? formatHour(h) : null,
                value: seconds,
                display: formatDuration(seconds),
              }))}
            />
          </Section>
        </div>
      </details>
    </div>
  );
}

// Study's counterpart to the Plants section: catches by rarity, the rarest one,
// and the way into the Sea life index.
function FishCaught({ stats }: { stats: Stats }) {
  const total = RARITIES.reduce((sum, r) => sum + stats.fish[r], 0);
  const rarest = stats.rarest ? speciesById(stats.rarest.species) : null;
  return (
    <Section title="Fish caught" note="Longer sessions make rarer fish more likely.">
      <BarList
        rows={RARITIES.map((rarity) => ({
          label: RARITY_LABEL[rarity],
          value: stats.fish[rarity],
          display: String(stats.fish[rarity]),
        }))}
      />
      <Tiles>
        <Tile label="Fish" value={String(total)} sub="All time" />
        <Tile
          label="Rarest catch"
          value={rarest ? rarest.name : "–"}
          sub={rarest ? RARITY_LABEL[rarest.rarity] : undefined}
        />
      </Tiles>
      <ButtonLink href="/sea-life" variant="secondary" className="justify-between">
        Sea life index
        <span aria-hidden>›</span>
      </ButtonLink>
    </Section>
  );
}

function SkinTile({ hours }: { hours: number }) {
  const unlocked = SKIN_UNLOCKS.filter((s) => skinUnlocked(s.id, hours)).length;
  const next = nextSkin(hours);
  return (
    <Tile
      label="Skins"
      value={`${unlocked} of ${SKIN_UNLOCKS.length}`}
      sub={next ? `${next.name} at ${next.hours}h · you're at ${formatHours(hours)}` : "All unlocked"}
    />
  );
}

const days = (n: number) => `${n} ${n === 1 ? "day" : "days"}`;

// 420 → "7m over", -300 → "5m under", 20 → "On target".
function formatDifference(seconds: number) {
  if (Math.abs(seconds) < 60) return "On target";
  return `${formatDuration(Math.abs(seconds))} ${seconds > 0 ? "over" : "under"}`;
}

// One card per topic: a serif title, an optional one-line explanation, the content.
function Section({ title, note, children }: { title: string; note?: string; children: ReactNode }) {
  return (
    <Card as="section" aria-label={title} className="gap-3">
      <div className="flex flex-col gap-0.5">
        <h2 className="title-card">{title}</h2>
        {note && <p className="text-sm text-muted">{note}</p>}
      </div>
      {children}
    </Card>
  );
}

const Tiles = StatGrid;

// A stat tile; in the intro a whole number ("12", "5 days") counts up from 0.
function Tile({ label, value, sub }: { label: string; value: string; sub?: string }) {
  const intro = useContext(StatsIntro);
  const count = intro ? /^(\d+)( days?)?$/.exec(value) : null;
  const shown = count ? (
    <>
      <CountUp value={Number(count[1])} from={0} delay={200} duration={700} />
      {count[2] ?? ""}
    </>
  ) : (
    value
  );
  return <StatTile label={label} value={shown} sub={sub} />;
}
