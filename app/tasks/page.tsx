import type { Metadata } from "next";
import { BottomNav, PageHeader } from "../_nav/bottom-nav";
import { Page } from "../_ui/page";
import { TaskList } from "../_tasks/task-list";

export const metadata: Metadata = {
  title: "Tasks – Deep Nautilus",
};

// Protected by proxy.ts like every route except /login, /auth/callback and /privacy.
// The list is loaded in the browser; RLS limits it to your own tasks.
export default function TasksPage() {
  return (
    <Page>
      <PageHeader title="Tasks" />
      <TaskList />
      <BottomNav active="tasks" />
    </Page>
  );
}
