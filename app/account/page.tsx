import type { Metadata } from "next";
import { Suspense } from "react";
import { Account } from "../_account/account";
import { BottomNav, PageHeader } from "../_nav/bottom-nav";
import { Skeleton } from "../_ui/feedback";
import { Page, TabContent } from "../_ui/page";

export const metadata: Metadata = {
  title: "Account – Deep Nautilus",
};

// Protected by proxy.ts like every route except /login, /auth/callback and /privacy.
// Reached from More; the More tab stays highlighted.
export default function AccountPage() {
  return (
    <Page>
      <PageHeader title="Account" back={{ href: "/help", label: "More" }} />
      <TabContent>
        {/* Reads the login cookie, so it streams in per request. */}
        <Suspense
          fallback={
            <>
              <Skeleton className="h-40 rounded-card" />
              <Skeleton className="h-48 rounded-card" />
            </>
          }
        >
          <Account />
        </Suspense>
      </TabContent>
      <BottomNav active="more" />
    </Page>
  );
}
