import { hashString, seededRandom } from "./fish-look.ts";

// A plant's appearance, seeded by the id of the session that started it, so the
// same plant always looks the same (on every device, forever). Pure.

export type PlantShape = "stem" | "fern" | "grass";

export type PlantLook = {
  shape: PlantShape;
  leafHue: number; // greens, 95–150
  tipHue: number; // the warm tint a mature plant's newest growth takes on
  lean: number; // -1…1: a slight natural curve
  swaySeconds: number; // one gentle sway left to right
  phase: number; // 0–1: where in its sway it starts
};

const SHAPES: readonly PlantShape[] = ["stem", "fern", "grass"];
// Underwater plants show maturity through colour, not flowers: reddish, bronze or
// purple tips like real aquarium plants (Ludwigia, Rotala). Soft enough for the water.
const TIP_HUES: readonly number[] = [0, 15, 30, 345, 290, 50];

export function plantLook(id: string): PlantLook {
  // "plant:" keeps a plant's look independent of a fish with the same seed.
  const rand = seededRandom(hashString(`plant:${id}`));
  const pick = <T,>(items: readonly T[]) => items[Math.floor(rand() * items.length)];
  // Keep this call order fixed: changing it would change every existing plant.
  return {
    shape: pick(SHAPES),
    leafHue: 95 + Math.floor(rand() * 55),
    tipHue: pick(TIP_HUES),
    lean: rand() * 2 - 1,
    swaySeconds: 4 + rand() * 3,
    phase: rand(),
  };
}
