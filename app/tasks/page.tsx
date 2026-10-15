import type { Metadata } from "next";
import Link from "next/link";
import { TaskList } from "../_tasks/task-list";

export const metadata: Metadata = {
  title: "Tasks – Deep Nautilus",
};

// Protected by proxy.ts like every route except /login, /auth/callback and /privacy.
// The list is loaded in the browser; RLS limits it to your own tasks.
export default function TasksPage() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-4 p-4 pb-10">
      <header className="flex h-10 items-center gap-3">
        <Link
          href="/"
          className="rounded-lg px-2 py-1 text-sky-700 hover:bg-zinc-100 dark:text-sky-400 dark:hover:bg-zinc-900"
        >
          ← Home
        </Link>
        <h1 className="text-xl font-semibold">Tasks</h1>
      </header>
      <TaskList />
    </main>
  );
}
