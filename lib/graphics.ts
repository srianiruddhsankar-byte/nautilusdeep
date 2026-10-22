import { useSyncExternalStore } from "react";
import { effectiveGraphics, isGraphics, type DeviceHints, type Graphics } from "./graphics-logic";
import { createLocalStore } from "./local-store";

// Settings → Graphics, saved on this device only (like Appearance). Nothing
// saved = a guess from the device (autoGraphics). The tank reads it each time
// it starts, so a change shows the next time a tank is on screen.

const store = createLocalStore<Graphics | null>("deep-nautilus:graphics:v1", null, isGraphics);

function hints(): DeviceHints {
  const nav = navigator as Navigator & { deviceMemory?: number };
  return { deviceMemory: nav.deviceMemory, hardwareConcurrency: nav.hardwareConcurrency };
}

// For code outside React (the tank's pixel ratio). Browser only.
export function readGraphics(): Graphics {
  return effectiveGraphics(store.get(), hints());
}

// The graphics in use, and whether it's the device's guess (nothing chosen yet).
export function useGraphics(): { graphics: Graphics; guessed: boolean } {
  const graphics = useSyncExternalStore(store.subscribe, readGraphics, () => "high" as Graphics);
  const saved = useSyncExternalStore(store.subscribe, store.get, () => null);
  return { graphics, guessed: saved === null };
}

export function setGraphics(graphics: Graphics) {
  store.set(graphics);
}
