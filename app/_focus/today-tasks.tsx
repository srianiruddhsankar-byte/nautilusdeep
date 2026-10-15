"use client";

import Link from "next/link";
import { useMemo } from "react";
import { dayKey } from "@/lib/stats";
import { dueLabel, groupTasks } from "@/lib/task-views";
import { useTasks } from "@/lib/tasks";
import { useClock } from "@/lib/use-clock";

const SHOWN = 4;

// "What do I do now?": tasks due today (and any still waiting from earlier).
// Tapping one picks it for the next session.
export function TodayTasks({ onPick }: { onPick: (name: string) => void }) {
  const { tasks } = useTasks();
  const clock = useClock();
  const groups = useMemo(
    () => (tasks && clock ? groupTasks(tasks, clock.now, clock.timeZone) : null),
    [tasks, clock],
  );

  if (!groups || !clock) return <div className="h-14" aria-hidden />; // keeps the layout still while loading
  const due = [...groups.today, ...groups.overdue];
  const today = dayKey(clock.now, clock.timeZone);

  return (
    <section aria-labelledby="today-tasks" className="flex flex-col gap-1 rounded-2xl border border-zinc-200 px-4 py-3 dark:border-zinc-800">
      <div className="flex items-center justify-between">
        <h2 id="today-tasks" className="font-semibold">
          Today
        </h2>
        <Link href="/tasks" className="py-1 text-sm text-sky-700 dark:text-sky-400">
          All tasks ›
        </Link>
      </div>

      {due.length === 0 ? (
        <p className="pb-1 text-sm text-zinc-500">
          {groups.upcoming.length + groups.noDate.length > 0
            ? "Nothing due today. Pick any task below, or just start."
            : "Nothing due today."}
        </p>
      ) : (
        <ul className="flex flex-col divide-y divide-zinc-200 dark:divide-zinc-800">
          {due.slice(0, SHOWN).map((t) => (
            <li key={t.id}>
              <button
                type="button"
                onClick={() => onPick(t.name)}
                className="flex w-full items-center justify-between gap-3 py-2.5 text-left"
              >
                <span className="min-w-0 flex-1 truncate">{t.name}</span>
                <span className="shrink-0 text-sm text-zinc-500">
                  {t.due_date !== today && `${dueLabel(t.due_date!, today)} · `}
                  <span className="font-medium text-sky-700 dark:text-sky-400">Start ›</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {due.length > SHOWN && (
        <Link href="/tasks" className="pb-1 text-sm text-zinc-500">
          +{due.length - SHOWN} more
        </Link>
      )}
    </section>
  );
}
