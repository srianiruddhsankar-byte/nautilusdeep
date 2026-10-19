"use client";

import { useState } from "react";
import { turnOffTimesUp, turnOnTimesUp, usePush } from "@/lib/push";
import { PushSheet, UnblockSteps } from "../_pwa/push-sheet";
import { Card } from "../_ui/card";
import { Switch } from "../_ui/switch";
import { toast } from "../_ui/toast";

// Help → Account → Notifications: this device's switches. Turning one on for
// the first time shows the short note, then the browser asks; once allowed, the
// switch just flips. Per device: a phone and a laptop each decide.
export function NotificationsCard() {
  const push = usePush();
  const [sheet, setSheet] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function change(on: boolean) {
    setError(null);
    if (!on) {
      const problem = await turnOffTimesUp();
      if (problem) setError(problem);
      return;
    }
    // Already allowed: no note needed, no prompt either.
    if (Notification.permission !== "granted") return setSheet(true);
    const problem = await turnOnTimesUp();
    if (problem) setError(problem);
    else toast("Notifications on for this device");
  }

  return (
    <Card as="section" aria-labelledby="notifications-title" className="gap-3 leading-relaxed">
      <h3 id="notifications-title" className="title-card">
        Notifications
      </h3>
      {push.support === "ready" ? (
        <>
          <Switch
            checked={push.timesUp}
            onChange={change}
            label="Time's up"
            description="When a focus block or break ends while Nautilus isn't on screen."
          />
          {error && <p className="text-sm text-danger">{error}</p>}
          <p className="text-sm text-muted">
            For this device only. In Deep Focus, leaving during focus still ends the session, so these are mostly for
            breaks, a pause running out, and Open Focus.
          </p>
          <PushSheet open={sheet} onClose={() => setSheet(false)} support={push.support} />
        </>
      ) : push.support === "install-first" ? (
        <p>
          On iPhone, notifications only work in the installed app. Install it (see <b>Install the app</b> above), open it
          from your home screen, and turn on Time&apos;s up here.
        </p>
      ) : push.support === "blocked" ? (
        <UnblockSteps />
      ) : (
        <p className="text-muted">
          {process.env.NODE_ENV === "production"
            ? "This browser can't show notifications from Deep Nautilus."
            : "Notifications only work in the deployed app (the service worker doesn't run in development)."}
        </p>
      )}
    </Card>
  );
}
