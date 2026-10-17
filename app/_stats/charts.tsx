"use client";

import { useState, type ReactNode } from "react";
import "./viz.css";

// Plain HTML/CSS charts. One series → one colour (--viz-bar). Every chart's
// values are also reachable without tapping, via labels or "Show as table".

export type Column = {
  key: string;
  label: string; // readout + table, e.g. "Tue 13 Oct"
  tick: string | null; // axis text under the column (null = none)
  value: number; // seconds
  display: string; // "1h 20m"
};

// Vertical columns with a readout line. Tap / hover / focus a column to read it.
export function ColumnChart({
  columns,
  defaultIndex,
  height = 128,
  tableHeading,
}: {
  columns: Column[];
  defaultIndex: number; // what the readout shows when nothing is selected
  height?: number;
  tableHeading: string;
}) {
  const [active, setActive] = useState<number | null>(null);
  const shown = columns[active ?? defaultIndex];
  const max = Math.max(0, ...columns.map((c) => c.value));
  const peak = max > 0 ? columns.findIndex((c) => c.value === max) : -1;

  return (
    <div className="viz flex flex-col gap-2">
      {/* Value leads, label follows. */}
      <p className="text-sm" aria-live="polite">
        <span className="font-semibold">{shown.display}</span>{" "}
        <span className="text-muted">{shown.label}</span>
      </p>

      <div className="pt-5">
        <div
          className="flex items-end gap-[2px] border-b"
          style={{ height, borderColor: "var(--viz-grid)" }}
          onPointerLeave={() => setActive(null)}
        >
          {columns.map((c, i) => {
            const dimmed = active !== null && active !== i;
            return (
              <button
                key={c.key}
                type="button"
                aria-label={`${c.label}: ${c.display}`}
                onPointerEnter={() => setActive(i)}
                onFocus={() => setActive(i)}
                onClick={() => setActive(i)}
                className="flex h-full min-w-0 flex-1 items-end justify-center"
              >
                <span
                  className="relative w-full max-w-6 rounded-t-[4px] transition-opacity"
                  style={{
                    height: `${max ? (c.value / max) * 100 : 0}%`,
                    minHeight: c.value > 0 ? 2 : 0,
                    background: "var(--viz-bar)",
                    opacity: dimmed ? 0.45 : 1,
                  }}
                >
                  {/* Label only the tallest column; the readout and table carry the rest. */}
                  {i === peak && (
                    <span className="absolute bottom-full left-1/2 mb-1 -translate-x-1/2 text-[11px] whitespace-nowrap text-muted">
                      {c.display}
                    </span>
                  )}
                </span>
              </button>
            );
          })}
        </div>
        <div className="flex gap-[2px] pt-1" aria-hidden>
          {columns.map((c) => (
            <span
              key={c.key}
              className="flex min-w-0 flex-1 justify-center text-[11px] whitespace-nowrap text-muted"
            >
              {c.tick ?? ""}
            </span>
          ))}
        </div>
      </div>

      <TableView>
        <table className="w-full text-left text-sm">
          <thead className="text-muted">
            <tr>
              <th className="py-1 font-normal">{tableHeading}</th>
              <th className="py-1 text-right font-normal">Focus</th>
            </tr>
          </thead>
          <tbody>
            {columns.map((c) => (
              <tr key={c.key} className="border-t border-line">
                <td className="py-1">{c.label}</td>
                <td className="py-1 text-right tabular-nums">{c.display}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </TableView>
    </div>
  );
}

export type HeatCell = {
  day: string;
  seconds: number;
  future: boolean;
  forgiven: boolean; // a missed day the streak freeze covered
  label: string;
  display: string;
};

// Upper bounds (seconds) of heat levels 1–3; anything above is level 4.
const HEAT_LEVELS = [25 * 60, 60 * 60, 120 * 60];
const LEVEL_NAMES = ["No focus", "Under 25m", "25m–1h", "1–2h", "2h+"];

function heatLevel(seconds: number) {
  if (seconds <= 0) return 0;
  const i = HEAT_LEVELS.findIndex((limit) => seconds < limit);
  return i === -1 ? 4 : i + 1;
}
const levelColor = (level: number) => (level === 0 ? "var(--viz-empty)" : `var(--viz-heat-${level})`);

// GitHub-style: one column per week (Mon at top), darker = more focus.
// Forgiven days (streak freeze) get a dashed outline and a snowflake.
export function Heatmap({
  weeks,
  today,
  monthLabel,
}: {
  weeks: HeatCell[][];
  today: string;
  monthLabel: (day: string) => string;
}) {
  const [active, setActive] = useState<HeatCell | null>(null);
  const todayCell = weeks.flat().find((c) => c.day === today)!;
  const shown = active ?? todayCell;
  const withFocus = weeks.flat().filter((c) => (c.seconds > 0 || c.forgiven) && !c.future);

  return (
    <div className="viz flex flex-col gap-2">
      <p className="text-sm" aria-live="polite">
        <span className="font-semibold">{shown.display}</span>{" "}
        <span className="text-muted">{shown.label}</span>
      </p>

      <div className="flex gap-[2px]" onPointerLeave={() => setActive(null)}>
        {/* Weekday labels: built like a week column so each lines up with its row. */}
        <div className="flex min-w-0 flex-1 flex-col gap-[2px] text-[10px] text-muted" aria-hidden>
          <span className="h-4" />
          {["Mon", "", "Wed", "", "Fri", "", ""].map((d, i) => (
            <span key={i} className="flex aspect-square w-full items-center leading-none">
              {d}
            </span>
          ))}
        </div>

        <div className="contents">
          {weeks.map((week, w) => {
            const month = monthLabel(week[0].day);
            const showMonth = w === 0 || month !== monthLabel(weeks[w - 1][0].day);
            return (
              <div key={week[0].day} className="flex min-w-0 flex-1 flex-col gap-[2px]">
                <span className="h-4 text-[10px] leading-4 whitespace-nowrap text-muted" aria-hidden>
                  {showMonth ? month : ""}
                </span>
                {week.map((cell) =>
                  cell.future ? (
                    <span key={cell.day} className="aspect-square w-full" />
                  ) : (
                    <button
                      key={cell.day}
                      type="button"
                      aria-label={`${cell.label}: ${cell.display}`}
                      onPointerEnter={() => setActive(cell)}
                      onFocus={() => setActive(cell)}
                      onClick={() => setActive(cell)}
                      className={`flex aspect-square w-full items-center justify-center rounded-[3px] text-[9px] leading-none ${
                        cell.day === today ? "ring-1 ring-muted ring-offset-1 ring-offset-card" : ""
                      } ${shown.day === cell.day && active ? "outline-2 outline-ink" : ""} ${
                        cell.forgiven ? "border border-dashed" : ""
                      }`}
                      style={{
                        background: levelColor(heatLevel(cell.seconds)),
                        borderColor: cell.forgiven ? "var(--viz-forgiven)" : undefined,
                        color: "var(--viz-forgiven)",
                      }}
                    >
                      {cell.forgiven && <span aria-hidden>❄</span>}
                    </button>
                  ),
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Legend: what each shade means. */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted">
        {LEVEL_NAMES.map((name, level) => (
          <span key={name} className="flex items-center gap-1">
            <span className="h-3 w-3 rounded-[3px]" style={{ background: levelColor(level) }} />
            {name}
          </span>
        ))}
        <span className="flex items-center gap-1">
          <span
            className="flex h-3 w-3 items-center justify-center rounded-[3px] border border-dashed text-[8px] leading-none"
            style={{ background: levelColor(0), borderColor: "var(--viz-forgiven)", color: "var(--viz-forgiven)" }}
          >
            ❄
          </span>
          Forgiven (streak freeze)
        </span>
      </div>

      <TableView>
        {withFocus.length === 0 ? (
          <p className="text-sm text-muted">No focus in the last 12 weeks yet.</p>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="text-muted">
              <tr>
                <th className="py-1 font-normal">Day</th>
                <th className="py-1 text-right font-normal">Focus</th>
              </tr>
            </thead>
            <tbody>
              {withFocus.map((c) => (
                <tr key={c.day} className="border-t border-line">
                  <td className="py-1">{c.label}</td>
                  <td className="py-1 text-right tabular-nums">{c.display}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </TableView>
    </div>
  );
}

// Horizontal bars with every value labelled (no tapping needed).
export function BarList({ rows }: { rows: { label: string; value: number; display: string }[] }) {
  const max = Math.max(0, ...rows.map((r) => r.value));
  return (
    <ul className="viz flex flex-col gap-2">
      {rows.map((r) => (
        <li key={r.label} className="grid grid-cols-[6rem_1fr_auto] items-center gap-3 text-sm">
          <span className="truncate text-muted">{r.label}</span>
          <span className="flex h-3 items-center">
            <span
              className="h-3 rounded-r-[4px]"
              style={{
                width: `${max ? (r.value / max) * 100 : 0}%`,
                minWidth: r.value > 0 ? 2 : 0,
                background: "var(--viz-bar)",
              }}
            />
          </span>
          <span className="text-right whitespace-nowrap tabular-nums">{r.display}</span>
        </li>
      ))}
    </ul>
  );
}

function TableView({ children }: { children: ReactNode }) {
  return (
    <details className="text-sm">
      <summary className="inline-flex min-h-11 cursor-pointer items-center font-semibold text-primary">Show as table</summary>
      <div className="pt-2">{children}</div>
    </details>
  );
}
