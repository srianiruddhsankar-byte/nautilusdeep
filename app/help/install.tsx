"use client";

import type { ReactNode } from "react";
import { useInstall } from "@/lib/install";
import { ShareIcon } from "../_pwa/install-steps";
import { Card } from "../_ui/card";

// Help → "Install the app": add Deep Nautilus to the home screen, where it opens
// full screen like an app. Inside the installed app it just says so. (Home's
// "Get Nautilus as an app" card, app/_pwa/install-card.tsx, is the quick version.)

export function InstallCard() {
  const installed = useInstall().standalone;

  return (
    <Card as="section" aria-labelledby="install-title" className="gap-3 leading-relaxed">
      <h3 id="install-title" className="title-card">
        Install the app
      </h3>
      {installed ? (
        <p>You&apos;re using the installed app. Updates arrive by themselves: when one is ready, tap Refresh.</p>
      ) : (
        <>
          <p>Add Deep Nautilus to your home screen: it opens full screen, like any other app.</p>
          <Steps title="iPhone (Safari)">
            <li>
              Tap the <b>Share</b> button{" "}
              <ShareIcon className="inline size-[1.1em] align-[-0.15em] text-primary" /> (the square with an arrow; on newer iPhones it&apos;s inside the{" "}
              <b>•••</b> menu).
            </li>
            <li>
              Scroll down and tap <b>Add to Home Screen</b>, then <b>Add</b>.
            </li>
            <li>Open it from your home screen and sign in once more: the app keeps its own sign-in.</li>
          </Steps>
          <Steps title="Android (Chrome)">
            <li>
              Tap the <b>⋮</b> menu, then <b>Add to Home screen</b> (or <b>Install app</b>).
            </li>
            <li>
              Tap <b>Install</b>.
            </li>
          </Steps>
          <p className="text-sm text-muted">
            Finish any running session first. Sessions still waiting to save stay in the browser you started them in,
            and save the next time you open it there.
          </p>
        </>
      )}
    </Card>
  );
}

function Steps({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <h4 className="font-semibold">{title}</h4>
      <ol className="flex list-decimal flex-col gap-1.5 pl-5 marker:text-muted">{children}</ol>
    </div>
  );
}
