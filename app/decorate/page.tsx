import type { Metadata } from "next";
import { DecorateView } from "../_decorate/decorate-view";
import { BottomNav, PageHeader } from "../_nav/bottom-nav";
import { Page, TabContent } from "../_ui/page";

export const metadata: Metadata = {
  title: "Shop – Deep Nautilus",
};

// Protected by proxy.ts like every route except /login, /auth/callback and /privacy.
// The Shop tab in the bottom bar; the coin balance in the tank header links here too.
export default function DecoratePage() {
  return (
    <Page>
      <PageHeader title="Shop" />
      <TabContent>
        <DecorateView />
      </TabContent>
      <BottomNav active="shop" />
    </Page>
  );
}
