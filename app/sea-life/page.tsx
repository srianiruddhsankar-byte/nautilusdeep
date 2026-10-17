import type { Metadata } from "next";
import { BottomNav, PageHeader } from "../_nav/bottom-nav";
import { Page } from "../_ui/page";
import { SeaLifeView } from "../_sea-life/sea-life-view";

export const metadata: Metadata = {
  title: "Sea life index – Deep Nautilus",
};

// Protected by proxy.ts like every route except /login, /auth/callback and /privacy.
// Reached from Stats ("Fish caught"), the result screen and a fish's card in the tank.
// Part of Stats, so the Stats tab stays highlighted.
export default function SeaLifePage() {
  return (
    <Page>
      <PageHeader title="Sea life index" />
      <SeaLifeView />
      <BottomNav active="stats" />
    </Page>
  );
}
