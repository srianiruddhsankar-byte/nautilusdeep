"use client";

import { useMemo, type ReactNode } from "react";
import { FISH_SIZE_LABEL, type FishSize } from "@/lib/fish";
import { useSessions } from "@/lib/sessions-data";
import { computeStats, formatDay, formatDuration, formatHour, weekdayIndex } from "@/lib/stats";
import { useClock } from "@/lib/use-clock";
import { BarList, ColumnChart, Heatmap } from "./charts";

const MODE_LABEL = { timer: "Timer", stopwatch: "Stopwatch", cycle: "Cycle" } as const;
const SIZES: FishSize[] = ["small", "medium", "large", "rare"];
const WEEKDAY_SHORT = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const percent = (part: number, whole: number) =>
  whole > 0 ? `${Math.round((part / whole) * 100)}%` : "–";

export function StatsView() {
  const { rows, error } = useSessions();
  const clock = useClock();
  const stats = useMemo(
    () => (rows && clock ? computeStats(rows, clock.now, clock.timeZone) : null),
    [rows, clock],
  );

  if (!stats) {
    return (
      <p className="text-center text-zinc-500">
        {error ? `Couldn't load your sessions: ${error}` : "Loading stats…"}
      </p>
    );
  }

  const peakHour = stats.hours.reduce((best, s, h) => (s > stats.hours[best] ? h : best), 0);
  const hasHours = stats.hours[peakHour] > 0;
  const focusTotal = stats.focusMode.deep + stats.focusMode.open;

  return (
    <div className="flex flex-col gap-4">
      <Section title="Focus time">
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

      <Section title="Streaks" note="A study day has at least 5 focus minutes.">
        <Tiles>
          <Tile label="Current streak" value={days(stats.streak.current)} />
          <Tile label="Longest streak" value={days(stats.streak.longest)} />
        </Tiles>
      </Section>

      <Section title="Last 12 weeks">
        <Heatmap
          today={stats.today}
          monthLabel={(day) =>
            new Date(`${day}T00:00:00Z`).toLocaleDateString(undefined, { timeZone: "UTC", month: "short" })
          }
          weeks={stats.heatmap.map((week) =>
            week.map((c) => ({
              ...c,
              label: c.day === stats.today ? `Today, ${formatDay(c.day)}` : formatDay(c.day),
              display: formatDuration(c.seconds),
            })),
          )}
        />
      </Section>

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
            sub="Kept their fish"
          />
          <Tile label="Bones" value={String(stats.bones)} sub="Fish lost" />
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
      </Section>

      <Section title="Fish caught">
        <BarList
          rows={SIZES.map((size) => ({
            label: FISH_SIZE_LABEL[size],
            value: stats.fish[size],
            display: String(stats.fish[size]),
          }))}
        />
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
  );
}

const days = (n: number) => `${n} ${n === 1 ? "day" : "days"}`;

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
