"use client";

import { useSyncExternalStore, type ReactNode } from "react";
import { Card } from "../_ui/card";

// Help → "Install the app": add Deep Nautilus to the home screen, where it opens
// full screen like an app. Inside the installed app it just says so.

const STANDALONE = "(display-mode: standalone)";

function subscribe(onChange: () => void) {
  const query = window.matchMedia(STANDALONE);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

// iPhone's own flag covers older iOS versions.
const isInstalled = () =>
  window.matchMedia(STANDALONE).matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;

export function InstallCard() {
  const installed = useSyncExternalStore(subscribe, isInstalled, () => false);

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
              Tap the <b>Share</b> button (the square with an arrow; on newer iPhones it&apos;s inside the{" "}
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
