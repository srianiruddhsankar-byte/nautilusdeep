import { useSyncExternalStore } from "react";
import { createLocalStore } from "./local-store";
import { THEME_COLOR, THEME_KEY } from "./theme-script";

// Appearance: System (follow the phone / computer), Light or Dark. Saved on
// this device only (localStorage; private mode just forgets it).
//
// It works through one attribute: <html data-theme="light|dark">, none for
// System. globals.css (and viz.css, alarm.css) swap the colour tokens on it.
// The small script in app/layout.tsx (THEME_SCRIPT) sets it before the page is
// painted, so a saved Dark never flashes Light first. That script and the
// colours are in lib/theme-script.ts (no React, so the server layout can use it).

export type Theme = "system" | "light" | "dark";
export const THEMES: Theme[] = ["system", "light", "dark"];
export const THEME_LABEL: Record<Theme, string> = { system: "System", light: "Light", dark: "Dark" };

const isTheme = (v: unknown): v is Theme => typeof v === "string" && (THEMES as string[]).includes(v);
const store = createLocalStore<Theme>(THEME_KEY, "system", isTheme);

export function useTheme(): Theme {
  return useSyncExternalStore(store.subscribe, store.get, () => "system");
}

export function setTheme(theme: Theme) {
  store.set(theme);
  applyTheme(theme);
}

function applyTheme(theme: Theme) {
  const root = document.documentElement;
  if (theme === "system") root.removeAttribute("data-theme");
  else root.setAttribute("data-theme", theme);
  // The browser bar: each <meta name="theme-color"> has a light / dark media
  // query; a chosen theme makes both say the same colour.
  document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]').forEach((meta) => {
    const dark = (meta.media ?? "").includes("dark");
    const mode = theme === "system" ? (dark ? "dark" : "light") : theme;
    meta.content = THEME_COLOR[mode];
  });
}
