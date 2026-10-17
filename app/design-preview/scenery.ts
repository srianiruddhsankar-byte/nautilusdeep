// Scenery shared by the SVG and Canvas tanks: the same plants, anemone and
// drifting particles in the same places, in screen units (the tank is 400 × 300).
// Pure maths; each tank draws them its own way.

import type { XY } from "./fish-2d";
import { CAST, REST } from "./fish-art";
import { createFish, type Fish, rest, separate, step } from "./swim";

export const SAND_TOP = 212; // the back edge of the sand on screen

// The water's slow sway: plants and particles all lean with it.
export const current = (t: number) => Math.sin(t * 0.35) * 1 + Math.sin(t * 0.13 + 1) * 0.6;

export type Blade = { x: number; y: number; h: number; w: number; phase: number; color: string; tip: string; layer: "back" | "front" };

export const BLADES: Blade[] = [
  // seagrass behind the fish, right
  { x: 300, y: 236, h: 118, w: 7, phase: 0, color: "#3f7f5f", tip: "#79b37a", layer: "back" },
  { x: 309, y: 238, h: 150, w: 8, phase: 0.8, color: "#356f53", tip: "#6aa56e", layer: "back" },
  { x: 318, y: 237, h: 104, w: 6, phase: 1.7, color: "#447f60", tip: "#86bc84", layer: "back" },
  { x: 328, y: 239, h: 132, w: 7, phase: 2.4, color: "#3a7458", tip: "#74ac76", layer: "back" },
  { x: 338, y: 236, h: 88, w: 6, phase: 3.1, color: "#4a8766", tip: "#8dc28a", layer: "back" },
  // a small tuft left of centre
  { x: 176, y: 244, h: 54, w: 5, phase: 0.4, color: "#4a8766", tip: "#8dc28a", layer: "back" },
  { x: 183, y: 245, h: 70, w: 5.5, phase: 1.3, color: "#3f7f5f", tip: "#79b37a", layer: "back" },
  { x: 190, y: 244, h: 46, w: 5, phase: 2.2, color: "#447f60", tip: "#86bc84", layer: "back" },
  // in front of the fish, bottom right corner (closest to the glass)
  { x: 372, y: 304, h: 120, w: 12, phase: 0.6, color: "#2d5f46", tip: "#5f9a68", layer: "front" },
  { x: 386, y: 306, h: 92, w: 11, phase: 1.9, color: "#28553f", tip: "#558f5f", layer: "front" },
];

// A blade's centreline, base to tip: it sways more toward the tip, like a
// real blade bending in a current.
export function bladeLine(b: Blade, t: number, n = 7): XY[] {
  const c: XY[] = [];
  const cur = current(t);
  for (let j = 0; j <= n; j++) {
    const k = j / n;
    const sway = (Math.sin(t * 0.7 + b.phase + k * 1.6) * 5 + cur * 7) * Math.pow(k, 1.6) * (b.h / 120);
    c.push({ x: b.x + sway, y: b.y - b.h * k });
  }
  return c;
}

// A blade's outline: a tapered ribbon along a centreline that sways more
// toward the tip, like a real blade bending in a current.
export function bladePts(b: Blade, t: number): XY[] {
  const n = 7;
  const c = bladeLine(b, t, n);
  const left: XY[] = [];
  const right: XY[] = [];
  for (let j = 0; j <= n; j++) {
    const a = c[Math.max(0, j - 1)];
    const d = c[Math.min(n, j + 1)];
    const tx = d.x - a.x;
    const ty = d.y - a.y;
    const l = Math.hypot(tx, ty) || 1;
    const w = b.w * Math.pow(1 - j / n, 0.55) * 0.5 + 0.2;
    left.push({ x: c[j].x - (ty / l) * w, y: c[j].y + (tx / l) * w });
    right.push({ x: c[j].x + (ty / l) * w, y: c[j].y - (tx / l) * w });
  }
  return [...left, ...right.reverse()];
}

// The clownfish's anemone, on the rock at the left.
export const ANEMONE_BASE = { x: 99, y: 226 };

export type Tentacle = { x: number; len: number; angle: number; phase: number };

export const TENTACLES: Tentacle[] = Array.from({ length: 24 }, (_, i) => {
  const k = i / 23;
  return {
    x: ANEMONE_BASE.x - 26 + k * 52,
    len: 20 + Math.sin(k * Math.PI) * 14 + ((i * 7) % 5),
    angle: (k - 0.5) * 1.6,
    phase: (i * 2.39) % 6.28,
  };
});

// Base, control point and tip of one tentacle (a gently waving curve).
export function tentacle(tn: Tentacle, t: number) {
  const cur = current(t);
  const wave = Math.sin(t * 1.1 + tn.phase) * 0.25 + cur * 0.12;
  const a = tn.angle + wave;
  const base = { x: tn.x, y: ANEMONE_BASE.y };
  const tip = { x: base.x + Math.sin(a) * tn.len, y: base.y - Math.cos(a) * tn.len };
  const ctrl = { x: base.x + Math.sin(tn.angle * 0.6) * tn.len * 0.5, y: base.y - tn.len * 0.6 };
  return { base, ctrl, tip };
}

// Marine snow and tiny bubbles; depth 0 (far) … 1 (near) sets size, speed and parallax.
export type Particle = { x: number; y: number; d: number; r: number; vy: number; ph: number };

export function makeParticles(n: number, seed: number): Particle[] {
  let a = seed;
  const rnd = () => {
    a = (a * 1664525 + 1013904223) >>> 0;
    return a / 4294967296;
  };
  return Array.from({ length: n }, () => {
    const d = rnd();
    return { x: rnd() * 400, y: rnd() * 300, d, r: 0.5 + d * 1.3, vy: -(1.5 + d * 3.5), ph: rnd() * 6.28 };
  });
}

export function stepParticles(ps: Particle[], dt: number, t: number) {
  const cur = current(t);
  for (const p of ps) {
    p.y += p.vy * dt;
    p.x += (cur * 2.5 + Math.sin(t * 0.5 + p.ph) * 1.2) * dt * (0.5 + p.d);
    if (p.y < -4) {
      p.y = 304;
      p.x = (p.x * 7.3 + 91) % 400;
    }
    if (p.x < -4) p.x += 408;
    if (p.x > 404) p.x -= 408;
  }
}

// The cast, ready to swim (or resting, for reduced motion).
export function createCast(): Fish[] {
  const fish = CAST.map((c) => createFish(c.id, c.swim, c.seed, { x: c.start[0], y: c.start[1], z: c.start[2] }, c.yaw));
  CAST.forEach((c, i) => {
    if (c.follows) fish[i].leader = fish.find((f) => f.id === c.follows);
  });
  return fish;
}

// One simulation step for the whole cast: swim, then keep apart.
export function stepAll(fish: Fish[], dt: number) {
  for (const f of fish) step(f, dt);
  separate(fish);
}

export function restCast(fish: Fish[]) {
  for (const f of fish) {
    const r = REST[f.id];
    rest(f, { x: r.at[0], y: r.at[1], z: r.at[2] }, r.left);
  }
}

export const artOf = (id: string) => CAST.find((c) => c.id === id)!.art;

// One fish at rest (for the fish card picture).
export function restingFish(id: string, facingLeft = false): Fish {
  const c = CAST.find((m) => m.id === id)!;
  const f = createFish(c.id, c.swim, c.seed, { x: 200, y: 150, z: 0 }, 0);
  rest(f, { x: 200, y: 150, z: 0 }, facingLeft);
  return f;
}
