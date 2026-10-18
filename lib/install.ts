import { useSyncExternalStore } from "react";
import { iosBrowser, type IosBrowser } from "./install-logic";
import { createLocalStore } from "./local-store";

// Installing the app (Home's "Get Nautilus as an app" card, Help → Install the app).
//
// Android / Chrome / Edge: the browser fires `beforeinstallprompt` when the app
// can be installed. We keep that event (and stop Chrome's own little install bar,
// so nothing pops up on first launch); the card's Install button then opens the
// real install dialog in one tap. The event can fire on any page, early, so we
// listen as soon as this file loads (it's imported by the root layout's
// PwaSetup), not when Home appears.
//
// iPhone / iPad: no event; the card shows written steps instead.
//
// "Dismissed" and "installed" are remembered in this browser, forever.

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

type Flags = { dismissed: boolean; installed: boolean };
const NO_FLAGS: Flags = { dismissed: false, installed: false };
const flags = createLocalStore<Flags>(
  "deep-nautilus:install:v1",
  NO_FLAGS,
  (d) => typeof d === "object" && d !== null && "dismissed" in d && "installed" in d,
);

const STANDALONE = "(display-mode: standalone)";
const listeners = new Set<() => void>();
let deferred: InstallPromptEvent | null = null;

const emit = () => listeners.forEach((listener) => listener());
const setFlag = (patch: Partial<Flags>) => flags.set({ ...flags.get(), ...patch });

// Opened as the installed app (iPhone's own flag covers older iOS versions).
export function isStandalone(): boolean {
  return (
    window.matchMedia(STANDALONE).matches || (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault(); // no automatic install bar: our card asks, after a first session
    deferred = event as InstallPromptEvent;
    emit();
  });
  window.addEventListener("appinstalled", () => {
    deferred = null;
    setFlag({ installed: true });
    emit();
  });
  // On Android the installed app shares this storage with Chrome, so opening it
  // once also hides the card in Chrome (covers installs from Chrome's menu too).
  if (isStandalone() && !flags.get().installed) setFlag({ installed: true });
}

export type InstallState = {
  standalone: boolean; // this is the installed app right now
  installed: boolean; // …or it was installed from this browser before
  dismissed: boolean;
  canPrompt: boolean; // a real install dialog is ready
  ios: IosBrowser | null;
};

// The server can't know any of this: it renders as "nothing to offer".
const SERVER_STATE: InstallState = { standalone: false, installed: true, dismissed: true, canPrompt: false, ios: null };

let cached: InstallState = SERVER_STATE;
function getSnapshot(): InstallState {
  const f = flags.get();
  const standalone = isStandalone();
  const next: InstallState = {
    standalone,
    installed: standalone || f.installed,
    dismissed: f.dismissed,
    canPrompt: deferred !== null,
    ios: iosBrowser(navigator.userAgent, navigator.maxTouchPoints),
  };
  // Same answer = same object, or React would re-render forever.
  const same = (Object.keys(next) as (keyof InstallState)[]).every((k) => next[k] === cached[k]);
  if (!same) cached = next;
  return cached;
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  const query = window.matchMedia(STANDALONE);
  query.addEventListener("change", listener);
  const stopFlags = flags.subscribe(listener);
  return () => {
    listeners.delete(listener);
    query.removeEventListener("change", listener);
    stopFlags();
  };
}

export function useInstall(): InstallState {
  return useSyncExternalStore(subscribe, getSnapshot, () => SERVER_STATE);
}

// Opens the browser's install dialog. The event works once, so it's used up
// either way; Chrome may offer a fresh one later.
export async function promptInstall(): Promise<"accepted" | "dismissed" | "unavailable"> {
  const event = deferred;
  if (!event) return "unavailable";
  deferred = null;
  emit();
  await event.prompt();
  const { outcome } = await event.userChoice;
  if (outcome === "accepted") setFlag({ installed: true });
  return outcome;
}

export function dismissInstallCard() {
  setFlag({ dismissed: true });
}
