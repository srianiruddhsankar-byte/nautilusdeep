import type { ReactNode } from "react";
import type { IosBrowser } from "@/lib/install-logic";
import { Button } from "../_ui/button";
import { Sheet } from "../_ui/sheet";

// The iPhone / iPad install steps (no install dialog there), shown in a sheet
// from Home's "Get Nautilus as an app" card. Every iPhone browser adds to the
// home screen through the same Share sheet; only where Share sits differs.
// Safari's Share button has moved between iOS versions (iOS 26 hid it in the •••
// menu by default), so step 1 covers both places.

// The iOS Share symbol: a box with an arrow leaving it upwards.
export function ShareIcon({ className = "size-[1.15em]" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round"
      strokeLinejoin="round" aria-hidden="true" className={className}>
      <path d="M8.5 9.5H7a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7a2 2 0 0 0-2-2h-1.5" />
      <path d="M12 14V3M8.5 6.5 12 3l3.5 3.5" />
    </svg>
  );
}

// A button's name as it looks on screen: a small paper key.
function Key({ children }: { children: ReactNode }) {
  return (
    <span className="mx-0.5 inline-flex items-center gap-1 rounded-chip border border-line bg-paper px-1.5 py-px align-baseline font-semibold whitespace-nowrap">
      {children}
    </span>
  );
}

const SHARE = (
  <Key>
    <ShareIcon className="size-[1.1em] text-primary" /> Share
  </Key>
);
const MORE = <Key>•••</Key>;

// Step 1 for each browser: where Share is, plus where else to look.
const FIND_SHARE: Record<IosBrowser, { step: ReactNode; hint: ReactNode }> = {
  safari: {
    step: <>Tap {SHARE}.</>,
    hint: <>Don&apos;t see it? Tap {MORE} next to the address first, then Share.</>,
  },
  chrome: {
    step: <>Tap {SHARE} in the address bar.</>,
    hint: <>Don&apos;t see it? Tap {MORE} first, then Share.</>,
  },
  firefox: {
    step: <>Open the menu (<Key>☰</Key>), then tap {SHARE}.</>,
    hint: <>On some versions Share sits right in the address bar.</>,
  },
  edge: {
    step: <>Tap {MORE} (the menu), then {SHARE}.</>,
    hint: <>On some versions Share sits right in the address bar.</>,
  },
  other: {
    step: <>Find {SHARE} in this browser&apos;s menu.</>,
    hint: <>No Share, or no Add to Home Screen in it? Open this page in Safari instead.</>,
  },
};

export function IosInstallSheet({ open, onClose, browser }: { open: boolean; onClose: () => void; browser: IosBrowser }) {
  const find = FIND_SHARE[browser];
  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Add to Home Screen"
      action={
        <Button variant="quiet" size="sm" className="-mr-2" onClick={onClose}>
          Done
        </Button>
      }
    >
      <div className="flex flex-col gap-5 leading-relaxed">
        <ol className="flex flex-col gap-4">
          <Step n={1} hint={find.hint}>
            {find.step}
          </Step>
          <Step n={2} hint={<>Not in the list? It may be under More or Edit Actions at the bottom.</>}>
            Scroll down and tap <Key>Add to Home Screen</Key>.
          </Step>
          <Step n={3} hint={<>If you see Open as Web App, leave it on.</>}>
            Tap <Key>Add</Key>.
          </Step>
        </ol>
        <p className="text-sm text-muted">
          Then open Nautilus from your home screen and sign in once more: the app keeps its own sign-in.
        </p>
        <p className="rounded-card bg-soft p-3 text-sm">
          On iPhone, reminders and notifications only work in the installed app.
        </p>
      </div>
    </Sheet>
  );
}

function Step({ n, hint, children }: { n: number; hint: ReactNode; children: ReactNode }) {
  return (
    <li className="flex gap-3">
      <span aria-hidden="true" className="numeral grid size-8 shrink-0 place-items-center rounded-chip bg-soft text-ink">
        {n}
      </span>
      <div className="flex flex-col gap-1 pt-0.5">
        <p>{children}</p>
        <p className="text-sm text-muted">{hint}</p>
      </div>
    </li>
  );
}
