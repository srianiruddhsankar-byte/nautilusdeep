// A fish's appearance, "randomly" chosen but seeded by its session id, so the
// same session always gives exactly the same fish (on every device, forever).
// Pure: no Math.random(), no React.

export type Pattern = "plain" | "stripes" | "spots" | "twoTone";
export type TailStyle = "fork" | "round" | "fan";

export type FishLook = {
  hue: number; // body colour (0–359 on the colour wheel)
  accentHue: number; // stripes/spots colour
  pattern: Pattern;
  tail: TailStyle;
  swimSeconds: number; // one lap across the tank and back
  bobSeconds: number; // gentle up-and-down
  lane: number; // 0–1: how high in the tank it swims
  phase: number; // 0–1: where in its lap it starts
};

const PATTERNS: readonly Pattern[] = ["plain", "stripes", "spots", "twoTone"];
const TAILS: readonly TailStyle[] = ["fork", "round", "fan"];

// FNV-1a: turns a string into a well-mixed 32-bit number.
export function hashString(text: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

// mulberry32: a tiny seeded random generator. Same seed → same sequence.
export function seededRandom(seed: number): () => number {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function fishLook(id: string): FishLook {
  const rand = seededRandom(hashString(id));
  const pick = <T,>(items: readonly T[]) => items[Math.floor(rand() * items.length)];
  // Keep this call order fixed: changing it would change every existing fish.
  const hue = Math.floor(rand() * 360);
  return {
    hue,
    accentHue: (hue + 40 + Math.floor(rand() * 140)) % 360,
    pattern: pick(PATTERNS),
    tail: pick(TAILS),
    swimSeconds: 16 + rand() * 14,
    bobSeconds: 2.5 + rand() * 2,
    lane: rand(),
    phase: rand(),
  };
}
