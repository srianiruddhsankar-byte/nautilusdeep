import type { Metadata } from "next";
import { DecorateView } from "../_decorate/decorate-view";
import { BottomNav, PageHeader } from "../_nav/bottom-nav";

export const metadata: Metadata = {
  title: "Decorate – Deep Nautilus",
};

// Protected by proxy.ts like every route except /login, /auth/callback and /privacy.
// Reached from the coin balance in the tank header; part of Home, so Home is the active tab.
export default function DecoratePage() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-4 p-4">
      <PageHeader title="Decorate" />
      <DecorateView />
      <BottomNav active="home" />
    </main>
  );
}
