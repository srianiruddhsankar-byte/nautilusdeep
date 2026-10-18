"use client";

import { useState } from "react";
import { showInstallCard } from "@/lib/install-logic";
import { dismissInstallCard, promptInstall, useInstall } from "@/lib/install";
import { Button, buttonClass } from "../_ui/button";
import { Card, CardHeader } from "../_ui/card";
import { toast } from "../_ui/toast";
import { IosInstallSheet } from "./install-steps";

// Home's "Get Nautilus as an app" card (at the bottom, so it never stands
// between you and Start). Only after a first finished session, never once
// dismissed or installed, and only where installing works (lib/install-logic.ts).
// Help → Install the app keeps the full steps for every device.
export function InstallAppCard({ finishedSession }: { finishedSession: boolean }) {
  const state = useInstall();
  const [stepsOpen, setStepsOpen] = useState(false);

  if (!showInstallCard({ ...state, finishedSession })) return null;

  async function install() {
    if (state.ios) {
      setStepsOpen(true); // iPhones never offer a dialog (checked first, so a laptop pretending to be one shows it too)
    } else if (state.canPrompt) {
      // Chrome / Edge: the real install dialog.
      if ((await promptInstall()) === "accepted") toast("Adding Nautilus to your home screen");
    }
  }

  function dismiss() {
    dismissInstallCard();
    toast("Hidden. Help has the install steps any time.");
  }

  return (
    <Card as="section" aria-labelledby="install-app-title">
      <CardHeader
        id="install-app-title"
        title="Get Nautilus as an app"
        action={
          <button type="button" aria-label="Hide this card" onClick={dismiss}
            className={buttonClass("quiet", "sm", "-mr-2 w-11 px-0")}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round"
              aria-hidden="true" className="size-5">
              <path d="M6 6l12 12M18 6 6 18" />
            </svg>
          </button>
        }
      />
      <p className="text-sm text-muted">It opens full screen from your home screen, like any other app.</p>
      <Button variant="secondary" className="mt-1 self-start" onClick={install}>
        Install
      </Button>
      {state.ios && <IosInstallSheet open={stepsOpen} onClose={() => setStepsOpen(false)} browser={state.ios} />}
    </Card>
  );
}
