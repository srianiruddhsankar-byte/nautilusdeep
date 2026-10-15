"use client";

import { useMemo, useState, type ReactNode } from "react";
import { FISH_SIZE_LABEL, type FishSize } from "@/lib/fish";
import { MATURE_MINUTES, PLANT_STAGE_LABEL, deriveGarden, type Garden } from "@/lib/plants";
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
import { BarList, ColumnChart, Heatmap } from "./charts";

const MODE_LABEL = { timer: "Timer", stopwatch: "Stopwatch", cycle: "Cycle" } as const;
const SIZES: FishSize[] = ["small", "medium", "large", "rare"];
const WEEKDAY_SHORT = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const TYPES: SessionType[] = ["study", "notes"];

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

  if (!all) {
    return (
      <p className="text-center text-zinc-500">
        {error ? `Couldn't load your sessions: ${error}` : "Loading stats…"}
      </p>
    );
  }

  const { overview } = all;
  return (
    <div className="flex flex-col gap-4">
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
        <dl className="grid grid-cols-3 gap-2">
          <Tile label="Today" value={completed ? String(completed.today) : "–"} />
          <Tile label="This week" value={completed ? String(completed.week) : "–"} />
          <Tile label="This month" value={completed ? String(completed.month) : "–"} />
        </dl>
      </Section>

      <Section title="Coins & tank" note="1 coin per focus minute (Open Focus: half). Study and notes both count.">
        <Tiles>
          <Tile label="Earned" value={economy.earned === null ? "–" : String(economy.earned)} />
          <Tile label="Spent" value={economy.spent === null ? "–" : String(economy.spent)} />
          <Tile label="Decorations" value={economy.owned ? String(economy.owned.length) : "–"} sub="Owned" />
          <SkinTile hours={economy.hours} />
        </Tiles>
      </Section>

      <div role="tablist" aria-label="Session type" className="grid grid-cols-2 gap-1 rounded-xl bg-zinc-100 p-1 dark:bg-zinc-900">
        {TYPES.map((t) => (
          <button
            key={t}
            role="tab"
            aria-selected={type === t}
            onClick={() => setType(t)}
            className={`rounded-lg py-3 font-medium ${type === t ? "bg-white shadow dark:bg-zinc-700" : "text-zinc-500"}`}
          >
            {SESSION_TYPE_LABEL[t]}
          </button>
        ))}
      </div>

      {/* key: switching tabs resets each chart's selected column. */}
      <TypeStats key={type} type={type} stats={all[type]} garden={garden} />
    </div>
  );
}

function TypeStats({ type, stats, garden }: { type: SessionType; stats: Stats; garden: Garden | null }) {
  const study = type === "study";
  const peakHour = stats.hours.reduce((best, s, h) => (s > stats.hours[best] ? h : best), 0);
  const hasHours = stats.hours[peakHour] > 0;
  const focusTotal = stats.focusMode.deep + stats.focusMode.open;

  if (stats.sessions.total === 0) {
    return (
      <p className="py-6 text-center text-zinc-500">
        {study ? "No study sessions yet." : "No notes sessions yet. Pick Notes on the setup screen."}
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-4">
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
        <Section title="Plants" note={`Notes minutes grow one plant at a time. It matures at ${formatDuration(MATURE_MINUTES * 60)}.`}>
          <Tiles>
            <Tile label="Matured" value={String(garden.matured.length)} sub="In your tanks" />
            <Tile
              label="Growing now"
              value={PLANT_STAGE_LABEL[garden.growing.stage]}
              sub={`${garden.growing.minutes} of ${MATURE_MINUTES} min${garden.growing.wilted ? " · a little wilted" : ""}`}
            />
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
            <p className="text-sm text-zinc-500">No notes sessions with a target yet.</p>
          )}
        </Section>
      )}

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
          <p className="text-sm text-zinc-500">No sessions with a task yet.</p>
        )}
      </Section>

      {/* The everyday numbers are above; the rest is one tap away. */}
      <details className="group">
        <summary className="flex cursor-pointer list-none items-center justify-between rounded-2xl border border-zinc-200 p-4 font-semibold hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-900 [&::-webkit-details-marker]:hidden">
          More stats
          <span aria-hidden className="text-zinc-500 transition-transform group-open:rotate-90">
            ›
          </span>
        </summary>
        <div className="flex flex-col gap-4 pt-4">
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
                <span className="text-zinc-500">Most-used cycle: </span>
                <span className="font-semibold">{stats.mostUsedCycle.name}</span>
                <span className="text-zinc-500">
                  {" "}
                  · {stats.mostUsedCycle.sessions} {stats.mostUsedCycle.sessions === 1 ? "session" : "sessions"}
                </span>
              </p>
            )}
          </Section>

          {study && (
            <Section title="Fish caught">
              <BarList
                rows={SIZES.map((size) => ({
                  label: FISH_SIZE_LABEL[size],
                  value: stats.fish[size],
                  display: String(stats.fish[size]),
                }))}
              />
            </Section>
          )}

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

function Section({ title, note, children }: { title: string; note?: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-3 rounded-2xl border border-zinc-200 p-4 dark:border-zinc-800">
      <div>
        <h2 className="font-semibold">{title}</h2>
        {note && <p className="text-xs text-zinc-500">{note}</p>}
      </div>
      {children}
    </section>
  );
}

function Tiles({ children }: { children: ReactNode }) {
  return <dl className="grid grid-cols-2 gap-2 sm:grid-cols-4">{children}</dl>;
}

function Tile({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-xl bg-zinc-100 p-3 dark:bg-zinc-900">
      <dt className="text-xs text-zinc-500">{label}</dt>
      <dd className="text-xl font-semibold">{value}</dd>
      {sub && <dd className="text-xs text-zinc-500">{sub}</dd>}
    </div>
  );
}
