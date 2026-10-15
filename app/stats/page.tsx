import type { Metadata } from "next";
import { RecentSessions } from "../_focus/recent-sessions";
import { BottomNav, PageHeader } from "../_nav/bottom-nav";
import { StatsView } from "../_stats/stats-view";

export const metadata: Metadata = {
  title: "Stats – Deep Nautilus",
};

// Protected by proxy.ts like every route except /login, /auth/callback and /privacy.
// The numbers are computed in the browser (your time zone) from your sessions,
// which RLS limits to your own rows.
export default function StatsPage() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-4 p-4">
      <PageHeader title="Stats" />
      <StatsView />
      <RecentSessions />
      <BottomNav active="stats" />
    </main>
  );
}
