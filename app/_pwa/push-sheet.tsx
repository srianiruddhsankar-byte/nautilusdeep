"use client";

import { useState, type ReactNode } from "react";
import { dismissPushOffer, turnOnTimesUp } from "@/lib/push";
import type { PushSupport } from "@/lib/push-schedule";
import { Button } from "../_ui/button";
import { Sheet } from "../_ui/sheet";
import { toast } from "../_ui/toast";

// The short note before the browser's permission prompt (from the running
// screen's offer and Help → Notifications). What the notifications are, then
// Turn on → the browser asks. On an iPhone outside the installed app it
// explains installing instead (no prompt there); when blocked, how to unblock.
export function PushSheet({ open, onClose, support }: { open: boolean; onClose: () => void; support: PushSupport }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function close() {
    setError(null);
    onClose();
  }

  async function turnOn() {
    setBusy(true);
    setError(null);
    const problem = await turnOnTimesUp(); // straight from the tap: iPhones require it
    setBusy(false);
    if (problem) return setError(problem);
    toast("Notifications on for this device");
    close();
  }

  // "Not now" / "Got it": the running screen won't offer it again on this device.
  function later() {
    dismissPushOffer();
    close();
  }

  return (
    <Sheet open={open} onClose={close} title={support === "blocked" ? "Notifications are blocked" : "Time's up notifications"}>
      <div className="flex flex-col gap-4 leading-relaxed">
        {support === "install-first" ? (
          <>
            <p>On iPhone, notifications only work in the installed app.</p>
            <ol className="flex list-decimal flex-col gap-1.5 pl-5 marker:text-muted">
              <li>
                Tap <b>Share</b> (or <b>•••</b>, then Share), then <b>Add to Home Screen</b>.
              </li>
              <li>Open Nautilus from your home screen and sign in.</li>
              <li>
                Turn on <b>Time&apos;s up</b> in Help → Account → Notifications.
              </li>
            </ol>
            <p className="text-sm text-muted">Help → Install the app has the full steps.</p>
            <Button variant="primary" size="lg" onClick={later}>
              Got it
            </Button>
          </>
        ) : support === "blocked" ? (
          <>
            <UnblockSteps />
            <Button variant="primary" size="lg" onClick={close}>
              Got it
            </Button>
          </>
        ) : (
          <>
            <Points>
              <li>When a focus block or break ends and Nautilus isn&apos;t on screen, this device gets a notification. Tap it to come back.</li>
              <li>
                In Deep Focus, leaving during focus still ends the session, so you&apos;ll mostly hear when a break or a
                pause is over. In Open Focus, you&apos;ll hear when your time is up.
              </li>
              <li>Only for sessions you start. Nothing else.</li>
            </Points>
            <p className="text-sm text-muted">Next, your browser asks whether to allow notifications.</p>
            {error && <p className="text-sm text-danger">{error}</p>}
            <div className="flex flex-col gap-2">
              <Button variant="primary" size="lg" onClick={turnOn} disabled={busy}>
                {busy ? "Turning on…" : "Turn on"}
              </Button>
              <Button variant="quiet" onClick={later} disabled={busy}>
                Not now
              </Button>
            </div>
          </>
        )}
      </div>
    </Sheet>
  );
}

// Where each browser keeps the setting (only the user can undo a "Block").
export function UnblockSteps() {
  return (
    <>
      <p>Notifications for Deep Nautilus are turned off in your settings. To allow them:</p>
      <Points>
        <li>
          <b>Installed app on Android</b>: press and hold the Nautilus icon → App info → Notifications → allow.
        </li>
        <li>
          <b>Chrome</b>: tap the icon left of the web address → Permissions (or Site settings) → Notifications → Allow.
        </li>
        <li>
          <b>iPhone app</b>: Settings → Notifications → Deep Nautilus → Allow Notifications.
        </li>
      </Points>
      <p className="text-sm text-muted">Then come back here and turn Time&apos;s up on.</p>
    </>
  );
}

function Points({ children }: { children: ReactNode }) {
  return <ul className="flex list-disc flex-col gap-1.5 pl-5 marker:text-muted">{children}</ul>;
}
