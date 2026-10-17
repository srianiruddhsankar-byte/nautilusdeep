"use client";

import Link from "next/link";
import { useMemo } from "react";
import { dayKey } from "@/lib/stats";
import { cleanTaskName, taskKey } from "@/lib/task-name";
import { dueLabel, groupTasks } from "@/lib/task-views";
import { useTasks } from "@/lib/tasks";
import { useClock } from "@/lib/use-clock";
import { Card, CardHeader } from "../_ui/card";
import { Skeleton } from "../_ui/feedback";

const SHOWN = 4;

// "What do I do now?": tasks due today (and any still waiting from earlier).
// Tapping one PICKS it for the next session; Start (below the tank) is the only
// thing that starts one. Tapping the picked task again un-picks it.
export function TodayTasks({ picked, onPick }: { picked: string; onPick: (name: string) => void }) {
  const { tasks } = useTasks();
  const clock = useClock();
  const groups = useMemo(
    () => (tasks && clock ? groupTasks(tasks, clock.now, clock.timeZone) : null),
    [tasks, clock],
  );
  const pickedName = cleanTaskName(picked);

  if (!groups || !clock) return <Skeleton className="h-28 rounded-card" />; // the card's size, so nothing jumps
  const due = [...groups.today, ...groups.overdue];
  const today = dayKey(clock.now, clock.timeZone);

  return (
    <Card as="section" aria-labelledby="today-tasks" className="gap-0 py-2">
      <CardHeader
        id="today-tasks"
        title="Today"
        action={
          <Link href="/tasks" className="-mr-2 inline-flex min-h-11 items-center px-2 text-sm font-semibold text-primary">
            All tasks ›
          </Link>
        }
      />

      {due.length === 0 ? (
        <p className="pb-2 text-sm text-muted">
          {groups.upcoming.length + groups.noDate.length > 0
            ? "Nothing due today. You can pick any task in the session settings, or just start."
            : "Nothing due today. Add tasks on the Tasks page, or just start."}
        </p>
      ) : (
        <ul className="flex flex-col divide-y divide-line">
          {due.slice(0, SHOWN).map((t) => {
            const selected = pickedName !== null && taskKey(pickedName) === taskKey(t.name);
            return (
              <li key={t.id}>
                <button
                  type="button"
                  aria-pressed={selected}
                  onClick={() => onPick(selected ? "" : t.name)}
                  className="flex min-h-14 w-full items-center gap-3 py-2 text-left"
                >
                  <span
                    aria-hidden
                    className={`flex h-5.5 w-5.5 shrink-0 items-center justify-center rounded-[6px] text-xs transition-colors duration-(--dur) ${
                      selected ? "bg-primary text-on-primary" : "shadow-[inset_0_0_0_2px_var(--line)]"
                    }`}
                  >
                    {selected && "✓"}
                  </span>
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate">{t.name}</span>
                    {t.due_date !== today && (
                      <span className="text-sm text-muted">{dueLabel(t.due_date!, today)}</span>
                    )}
                  </span>
                  <span className={`shrink-0 text-sm font-semibold ${selected ? "text-muted" : "text-primary"}`}>
                    {selected ? "Picked" : "Pick"}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
      {due.length > SHOWN && (
        <Link href="/tasks" className="inline-flex min-h-11 items-center text-sm text-muted">
          +{due.length - SHOWN} more
        </Link>
      )}
    </Card>
  );
}
