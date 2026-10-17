// The preview species, described once in BODY SPACE so every tank draws the
// same fish from the same numbers:
//   s = 0 at the snout … 1 at the tail root (where the tail fin starts)
//   f = +1 along the back … −1 along the belly (0 = the middle line)
// Sizes are fractions of the body length.

import type { SwimSpec } from "./swim";

export type Pt = [s: number, f: number];

export type Marking = { color: string; pts: Pt[]; edge?: string; edgeWidth?: number };

export type FinShape = {
  from: number; // s where it starts
  to: number; // s where it ends
  height: (t: number) => number; // t: 0 → 1 along the fin
  color: string;
  edge?: string;
  opacity: number;
};

export type Art = {
  name: string;
  half: (s: number) => number; // half the body height
  thick: (s: number) => number; // half the body width (fish are thin!)
  back: string; // colour along the back
  belly: string;
  side: string; // the main colour
  markings: Marking[];
  caudal: { len: number; span: number; shape: "round" | "fork" | "lunate"; color: string; edge?: string; opacity: number };
  dorsal: FinShape;
  anal: FinShape;
  pelvic?: { s: number; len: number; color: string; edge?: string };
  pectoral: { s: number; len: number; width: number; color: string; opacity: number };
  eye: { s: number; f: number; r: number; iris: string };
};

// A smooth curve through (s, value) points.
function curve(pts: [number, number][]) {
  return (s: number) => {
    if (s <= pts[0][0]) return pts[0][1];
    for (let i = 1; i < pts.length; i++) {
      const [s1, v1] = pts[i];
      if (s <= s1) {
        const [s0, v0] = pts[i - 1];
        const k = (s - s0) / (s1 - s0);
        const e = k * k * (3 - 2 * k);
        return v0 + (v1 - v0) * e;
      }
    }
    return pts[pts.length - 1][1];
  };
}

// A band across the body between two wavy edges (for stripes).
function band(front: [number, number][], back: [number, number][]): Pt[] {
  return [...front.map(([f, s]) => [s, f] as Pt), ...back.reverse().map(([f, s]) => [s, f] as Pt)];
}

const clownBand = (a: number, b: number, bulge: number): Pt[] =>
  band(
    [
      [1.3, a + bulge * 0.2],
      [0.6, a - bulge * 0.4],
      [0, a - bulge],
      [-0.6, a - bulge * 0.4],
      [-1.3, a + bulge * 0.2],
    ],
    [
      [1.3, b + bulge * 0.6],
      [0.6, b + bulge * 0.1],
      [0, b - bulge * 0.4],
      [-0.6, b + bulge * 0.1],
      [-1.3, b + bulge * 0.6],
    ],
  );

const INK = "#1b1a1f";

export const CLOWN: Art = {
  name: "Clownfish",
  half: curve([
    [0, 0.07],
    [0.08, 0.16],
    [0.3, 0.25],
    [0.55, 0.22],
    [0.85, 0.12],
    [1, 0.09],
  ]),
  thick: curve([
    [0, 0.05],
    [0.25, 0.11],
    [0.6, 0.08],
    [1, 0.03],
  ]),
  back: "#d9480f",
  side: "#f76707",
  belly: "#ffa94d",
  markings: [
    { color: "#fffaf3", pts: clownBand(0.15, 0.25, -0.035), edge: INK, edgeWidth: 1.6 },
    { color: "#fffaf3", pts: clownBand(0.46, 0.57, 0.06), edge: INK, edgeWidth: 1.6 },
    { color: "#fffaf3", pts: clownBand(0.86, 0.93, 0), edge: INK, edgeWidth: 1.4 },
  ],
  caudal: { len: 0.26, span: 0.2, shape: "round", color: "#f76707", edge: INK, opacity: 0.95 },
  dorsal: {
    from: 0.22,
    to: 0.9,
    height: curve([
      [0, 0.03],
      [0.15, 0.1],
      [0.42, 0.07],
      [0.6, 0.15],
      [0.85, 0.13],
      [1, 0.02],
    ]),
    color: "#f76707",
    edge: INK,
    opacity: 0.95,
  },
  anal: {
    from: 0.6,
    to: 0.9,
    height: curve([
      [0, 0.03],
      [0.4, 0.13],
      [1, 0.03],
    ]),
    color: "#f76707",
    edge: INK,
    opacity: 0.95,
  },
  pelvic: { s: 0.34, len: 0.15, color: "#f76707", edge: INK },
  pectoral: { s: 0.3, len: 0.17, width: 0.1, color: "#fd7e14", opacity: 0.85 },
  eye: { s: 0.1, f: 0.3, r: 0.055, iris: "#c2410c" },
};

export const TANG: Art = {
  name: "Blue tang",
  half: curve([
    [0, 0.08],
    [0.1, 0.2],
    [0.38, 0.3],
    [0.7, 0.24],
    [0.92, 0.1],
    [1, 0.07],
  ]),
  thick: curve([
    [0, 0.04],
    [0.3, 0.07],
    [1, 0.02],
  ]),
  back: "#1c3fa8",
  side: "#2563eb",
  belly: "#5b8cf0",
  markings: [
    // The black "palette": from behind the eye, along the back to the tail.
    {
      color: "#121a33",
      pts: [
        [0.12, 0.42],
        [0.22, 0.72],
        [0.4, 0.86],
        [0.6, 0.82],
        [0.82, 0.62],
        [1.0, 0.25],
        [1.02, -0.2],
        [0.92, -0.2],
        [0.8, 0.12],
        [0.64, 0.02],
        [0.5, -0.12],
        [0.36, -0.08],
        [0.26, 0.12],
        [0.16, 0.18],
      ],
    },
    // and the blue window inside it
    {
      color: "#2f6df0",
      pts: [
        [0.4, 0.52],
        [0.5, 0.64],
        [0.62, 0.58],
        [0.68, 0.4],
        [0.58, 0.3],
        [0.46, 0.32],
      ],
    },
  ],
  caudal: { len: 0.24, span: 0.24, shape: "lunate", color: "#facc15", edge: "#121a33", opacity: 0.95 },
  dorsal: {
    from: 0.14,
    to: 0.92,
    height: curve([
      [0, 0.02],
      [0.2, 0.08],
      [0.8, 0.09],
      [1, 0.02],
    ]),
    color: "#1e40af",
    edge: "#121a33",
    opacity: 0.95,
  },
  anal: {
    from: 0.42,
    to: 0.92,
    height: curve([
      [0, 0.02],
      [0.25, 0.08],
      [0.8, 0.08],
      [1, 0.02],
    ]),
    color: "#1e40af",
    edge: "#121a33",
    opacity: 0.95,
  },
  pectoral: { s: 0.3, len: 0.16, width: 0.08, color: "#facc15", opacity: 0.8 },
  eye: { s: 0.09, f: 0.32, r: 0.045, iris: "#1e293b" },
};

export const CHROMIS: Art = {
  name: "Green chromis",
  half: curve([
    [0, 0.07],
    [0.1, 0.16],
    [0.35, 0.22],
    [0.75, 0.15],
    [1, 0.07],
  ]),
  thick: curve([
    [0, 0.05],
    [0.3, 0.09],
    [1, 0.03],
  ]),
  back: "#2bb39a",
  side: "#7ee2c4",
  belly: "#d9f7ec",
  markings: [
    // iridescent sheen along the upper side
    {
      color: "#b4f1e0",
      pts: [
        [0.15, 0.25],
        [0.4, 0.42],
        [0.75, 0.3],
        [0.95, 0.1],
        [0.75, 0.12],
        [0.4, 0.15],
      ],
    },
  ],
  caudal: { len: 0.3, span: 0.24, shape: "fork", color: "#9be8d1", opacity: 0.7 },
  dorsal: {
    from: 0.25,
    to: 0.85,
    height: curve([
      [0, 0.03],
      [0.3, 0.11],
      [0.85, 0.08],
      [1, 0.02],
    ]),
    color: "#9be8d1",
    opacity: 0.65,
  },
  anal: {
    from: 0.6,
    to: 0.88,
    height: curve([
      [0, 0.02],
      [0.4, 0.1],
      [1, 0.02],
    ]),
    color: "#9be8d1",
    opacity: 0.65,
  },
  pectoral: { s: 0.3, len: 0.15, width: 0.07, color: "#c8f5e8", opacity: 0.6 },
  eye: { s: 0.1, f: 0.25, r: 0.06, iris: "#0f766e" },
};

// The cast: one clownfish (staying near its anemone), a blue tang and a pair of chromis.
export const ANEMONE_AT = { x: 98, y: 70, z: 6 };

export type CastMember = { id: string; art: Art; swim: SwimSpec; seed: number; start: [number, number, number]; yaw: number; follows?: string };

export const CAST: CastMember[] = [
  {
    id: "clown",
    art: CLOWN,
    swim: {
      length: 44,
      cruise: 22,
      burst: 42,
      turn: 1.9,
      minRadius: 0.2,
      hover: 0.55,
      tailHz: [0.9, 0.05],
      girth: 0.26,
      home: { x: ANEMONE_AT.x, y: 118, z: ANEMONE_AT.z },
      homeRange: 70,
    },
    seed: 11,
    start: [130, 130, 4],
    yaw: 0,
  },
  {
    id: "tang",
    art: TANG,
    swim: { length: 62, cruise: 30, burst: 55, turn: 1.4, minRadius: 0.26, hover: 0.18, tailHz: [0.6, 0.035], girth: 0.3 },
    seed: 29,
    start: [280, 190, -14],
    yaw: Math.PI,
  },
  {
    id: "chromis-a",
    art: CHROMIS,
    swim: { length: 28, cruise: 30, burst: 60, turn: 2.4, minRadius: 0.2, hover: 0.25, tailHz: [1.3, 0.06], girth: 0.22 },
    seed: 47,
    start: [220, 220, 18],
    yaw: 0.2,
  },
  {
    id: "chromis-b",
    art: CHROMIS,
    swim: { length: 26, cruise: 32, burst: 62, turn: 2.6, minRadius: 0.2, hover: 0.2, tailHz: [1.4, 0.06], girth: 0.22 },
    seed: 53,
    start: [190, 212, 26],
    yaw: 0.1,
    follows: "chromis-a",
  },
];

// Reduced motion: where each fish rests (side-on, still).
export const REST: Record<string, { at: [number, number, number]; left: boolean }> = {
  clown: { at: [128, 122, 6], left: true },
  tang: { at: [262, 176, -10], left: false },
  "chromis-a": { at: [214, 226, 14], left: true },
  "chromis-b": { at: [250, 214, 22], left: true },
};
