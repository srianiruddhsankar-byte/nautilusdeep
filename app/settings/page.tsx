import type { Metadata } from "next";
import { BottomNav, PageHeader } from "../_nav/bottom-nav";
import { AlarmSetting } from "../_settings/alarm-setting";
import { AppearanceSetting } from "../_settings/appearance";
import { GraphicsSetting } from "../_settings/graphics-setting";
import { InstallCard } from "../_settings/install";
import { NotificationsCard } from "../_settings/notifications";
import { Page, TabContent } from "../_ui/page";

export const metadata: Metadata = {
  title: "Settings – Deep Nautilus",
};

// Protected by proxy.ts like every route except /login, /auth/callback and /privacy.
// Reached from More (and the session sheet's Alarm line); the More tab stays
// highlighted. Everything here is saved on this device. Install comes before
// Notifications: on iPhone, notifications need the installed app.
export default function SettingsPage() {
  return (
    <Page>
      <PageHeader title="Settings" back={{ href: "/help", label: "More" }} />
      <TabContent>
        <p className="text-muted">Saved on this device, so your phone and laptop can each have their own.</p>
        <AppearanceSetting />
        <AlarmSetting />
        <GraphicsSetting />
        <InstallCard />
        <NotificationsCard />
      </TabContent>
      <BottomNav active="more" />
    </Page>
  );
}
