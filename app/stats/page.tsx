import type { Metadata } from "next";
import { RecentSessions } from "../_focus/recent-sessions";
import { BottomNav, PageHeader } from "../_nav/bottom-nav";
import { Page } from "../_ui/page";
import { StatsView } from "../_stats/stats-view";

export const metadata: Metadata = {
  title: "Stats – Deep Nautilus",
};

// Protected by proxy.ts like every route except /login, /auth/callback and /privacy.
// The numbers are computed in the browser (your time zone) from your sessions,
// which RLS limits to your own rows.
export default function StatsPage() {
  return (
    <Page>
      <PageHeader title="Stats" />
      <StatsView />
      <RecentSessions />
      <BottomNav active="stats" />
    </Page>
  );
}
