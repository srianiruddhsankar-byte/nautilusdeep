import type { Metadata } from "next";
import { BottomNav, PageHeader } from "../_nav/bottom-nav";
import { TaskList } from "../_tasks/task-list";

export const metadata: Metadata = {
  title: "Tasks – Deep Nautilus",
};

// Protected by proxy.ts like every route except /login, /auth/callback and /privacy.
// The list is loaded in the browser; RLS limits it to your own tasks.
export default function TasksPage() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-4 p-4">
      <PageHeader title="Tasks" />
      <TaskList />
      <BottomNav active="tasks" />
    </main>
  );
}
