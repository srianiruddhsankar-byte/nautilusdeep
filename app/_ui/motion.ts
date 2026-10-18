import type { CSSProperties } from "react";
import { flushSync } from "react-dom";

// Small motion helpers shared by every screen. The animations themselves are
// CSS (globals.css, "Motion"); these only decide when they run.

export function prefersReducedMotion(): boolean {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

// One screen becoming another (Home → running → result → Home): the browser
// takes a picture of the old screen, we render the new one, and it cross-fades
// between them (`::view-transition-*` in globals.css). The browser does the
// animation itself, so it costs the tank nothing.
// Falls back to a plain instant change when the browser can't do it, the page
// is hidden (nothing to see) or reduced motion is on.
//
// The update runs a frame later (after the "before" picture). A second change
// asked for in that frame (a double tap, or the clock ending the session at the
// same moment) is dropped: the first one wins, so nothing ends twice.
let changing = false;

export function changeScreen(update: () => void) {
  const canAnimate =
    typeof document !== "undefined" &&
    "startViewTransition" in document &&
    document.visibilityState === "visible" &&
    !prefersReducedMotion();
  if (!canAnimate) return update();
  if (changing) return;
  changing = true;
  // flushSync: React must draw the new screen inside the callback, so the
  // browser's "after" picture is the new screen, not the old one again.
  document.startViewTransition(() => {
    try {
      flushSync(update);
    } finally {
      changing = false;
    }
  });
}

// `style={step(2)}` on a `.rise-in` / `.calm-in`: arrive third in its group.
export function step(n: number): CSSProperties {
  return { "--step": n } as CSSProperties;
}
