// Graphics: High (today's tank) or Low, for phones that struggle with it.
// Pure: no React, no browser. The saved choice lives in lib/graphics.ts.
//
// Low = 15 fps instead of 30, pixel ratio 1, and no ambience scene effects
// (rain, waves, the whale…) drawn over the tank. The fish still swim.

export type Graphics = "high" | "low";
export const GRAPHICS: Graphics[] = ["high", "low"];
export const GRAPHICS_LABEL: Record<Graphics, string> = { high: "High", low: "Low" };

export const isGraphics = (v: unknown): v is Graphics => v === "high" || v === "low";

export const GRAPHICS_FPS: Record<Graphics, number> = { high: 30, low: 15 };
export const GRAPHICS_MAX_DPR: Record<Graphics, number> = { high: 2, low: 1 };

// What the browser tells us about the device. deviceMemory (GB, rounded down)
// is Chrome / Android only; iPhones report neither, so they start on High.
export type DeviceHints = { deviceMemory?: number; hardwareConcurrency?: number };

// A first guess when nothing has been chosen: Low only on clearly weak devices.
export function autoGraphics(hints: DeviceHints): Graphics {
  const { deviceMemory, hardwareConcurrency } = hints;
  if (typeof deviceMemory === "number" && deviceMemory > 0 && deviceMemory <= 2) return "low";
  if (typeof hardwareConcurrency === "number" && hardwareConcurrency > 0 && hardwareConcurrency <= 2) return "low";
  return "high";
}

// The saved choice wins; with none, the guess.
export function effectiveGraphics(saved: Graphics | null, hints: DeviceHints): Graphics {
  return saved ?? autoGraphics(hints);
}
