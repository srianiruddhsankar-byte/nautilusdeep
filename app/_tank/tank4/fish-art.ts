// Every species, described once in BODY SPACE, for Tank 4:
//   s = 0 at the snout … 1 at the tail root (where the tail fin starts)
//   f = +1 along the back … −1 along the belly (0 = the middle line)
// Sizes are fractions of the body length. side-view.ts turns this into one
// side drawing per species; the engine bends that drawing along the swimming
// spine. A PNG in public/fish/ replaces the drawing (art-files.ts).
//
// Most species are ROPES: the side drawing bends along the spine. The odd
// shapes are PUPPETS (puppets.ts): pieces that move on their own. The
// pufferfish, lionfish and sunfish are puppets cut from their art here; the
// manta ray, seahorse and nautilus are drawn by hand in puppets.ts.

import type { SpeciesId } from "@/lib/species";
import type { SwimSpec } from "@/lib/swim";

export type Pt = [s: number, f: number];

export type Marking = { color: string; pts: Pt[]; edge?: string; edgeWidth?: number };

export type FinShape = {
  from: number; // s where it starts
  to: number; // s where it ends
  height: (t: number) => number; // t: 0 → 1 along the fin
  color: string;
  edge?: string;
  opacity: number;
  sweep?: number; // leans the tip back toward the tail (× its height): sharks, streamers
  spikes?: number; // a spiny edge with this many points (lionfish)
};

export type Caudal = {
  len: number;
  span: number;
  shape: "round" | "fork" | "lunate" | "point" | "shark" | "lobed" | "clavus";
  color: string;
  edge?: string;
  opacity: number;
};

export type Art = {
  half: (s: number) => number; // half the body height
  back: string; // colour along the back
  side: string; // the main colour
  belly: string;
  markings: Marking[];
  caudal: Caudal;
  dorsal: FinShape;
  anal?: FinShape;
  pelvic?: { s: number; len: number; color: string; edge?: string };
  pectoral: { s: number; len: number; width: number; color: string; opacity: number };
  eye: { s: number; f: number; r: number; iris: string };
};

// How a species swims; the body length comes from its size (lengthOf). Big
// fish need quick, tight turns: the tank is shallower than they are long, and
// a slow turn spends seconds pointing into the glass (drawn nose-down).
export type Temperament = Omit<SwimSpec, "length" | "girth" | "home" | "homeRange" | "roam"> & {
  schools?: boolean; // follows another of its kind
  home?: "anemone" | "low"; // stays near the anemone / near the sand
};

// A rope's swimming wave: most fish beat their tail (the default); the oarfish
// ripples its whole length.
export type Wave = { amp: number; waves: number };

export type PuppetId = "pufferfish" | "lionfish" | "sunfish" | "manta_ray" | "seahorse" | "nautilus";
export type SpeciesArt =
  | { kind: "rope"; art: Art; swim: Temperament; wave?: Wave }
  | { kind: "puppet"; id: PuppetId; art: Art | null; swim: Temperament };

// A smooth curve through (s, value) points.
export function curve(pts: [number, number][]) {
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

// A band across the body from s0 to s1 (stripes and bars). `slant` leans it
// (its top sits further back), `bulge` bows it toward the tail at the middle.
function bar(s0: number, s1: number, slant = 0, bulge = 0): Pt[] {
  const fs = [1.4, 0.7, 0, -0.7, -1.4];
  const at = (s: number, f: number): Pt => [s + slant * f + bulge * (1 - (f * f) / 2), f];
  return [...fs.map((f) => at(s0, f)), ...[...fs].reverse().map((f) => at(s1, f))];
}

// A small round spot at (s, f); r in s units (it's squashed toward the tail, like the body).
function spot(s: number, f: number, r: number): Pt[] {
  return Array.from({ length: 8 }, (_, i) => {
    const a = (i / 8) * Math.PI * 2;
    return [s + Math.cos(a) * r, f + Math.sin(a) * r * 4] as Pt;
  });
}

// A wavy line along the body, at height f, `w` thick (in f).
function wave(f: number, w: number, amp: number, freq: number, from = 0.06, to = 1.02): Pt[] {
  const n = 14;
  const top: Pt[] = [];
  const bot: Pt[] = [];
  for (let i = 0; i <= n; i++) {
    const s = from + ((to - from) * i) / n;
    const y = f + amp * Math.sin(s * freq);
    top.push([s, y + w / 2]);
    bot.push([s, y - w / 2]);
  }
  return [...top, ...bot.reverse()];
}

const INK = "#1b1a1f";

// ---------------- the species ----------------

const CLOWN_BAND = (a: number, b: number, bulge: number) => bar(a, b, 0, bulge);

const ART: Record<Exclude<SpeciesId, "seahorse" | "manta_ray">, { art: Art; swim: Temperament; wave?: Wave }> = {
  // ---- Common ----
  green_chromis: {
    art: {
      half: curve([
        [0, 0.07],
        [0.1, 0.16],
        [0.35, 0.22],
        [0.75, 0.15],
        [1, 0.07],
      ]),
      // a deeper green than life: pale mint vanishes against the bright surface water
      back: "#13866f",
      side: "#43c29c",
      belly: "#c6efdf",
      markings: [
        {
          color: "#7fdcc0",
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
      caudal: { len: 0.3, span: 0.24, shape: "fork", color: "#3fb592", edge: "#13866f", opacity: 0.85 },
      dorsal: {
        from: 0.25,
        to: 0.85,
        height: curve([
          [0, 0.03],
          [0.3, 0.11],
          [0.85, 0.08],
          [1, 0.02],
        ]),
        color: "#3fb592",
        opacity: 0.8,
      },
      anal: {
        from: 0.6,
        to: 0.88,
        height: curve([
          [0, 0.02],
          [0.4, 0.1],
          [1, 0.02],
        ]),
        color: "#3fb592",
        opacity: 0.8,
      },
      pectoral: { s: 0.3, len: 0.15, width: 0.07, color: "#8fe0c6", opacity: 0.6 },
      eye: { s: 0.1, f: 0.25, r: 0.06, iris: "#0f766e" },
    },
    swim: { cruise: 30, burst: 60, turn: 2.4, minRadius: 0.2, hover: 0.25, tailHz: [1.3, 0.06], schools: true },
  },
  blue_damselfish: {
    art: {
      half: curve([
        [0, 0.07],
        [0.1, 0.18],
        [0.35, 0.25],
        [0.75, 0.16],
        [1, 0.08],
      ]),
      back: "#1d4ed8",
      side: "#2f6bff",
      belly: "#7aa7ff",
      markings: [
        {
          color: "#5b8cff",
          pts: [
            [0.18, 0.35],
            [0.45, 0.5],
            [0.75, 0.36],
            [0.6, 0.22],
            [0.35, 0.22],
          ],
        },
      ],
      caudal: { len: 0.26, span: 0.22, shape: "fork", color: "#1d4ed8", opacity: 0.9 },
      dorsal: {
        from: 0.2,
        to: 0.88,
        height: curve([
          [0, 0.03],
          [0.3, 0.1],
          [0.85, 0.09],
          [1, 0.02],
        ]),
        color: "#1d4ed8",
        opacity: 0.9,
      },
      anal: {
        from: 0.58,
        to: 0.88,
        height: curve([
          [0, 0.02],
          [0.4, 0.1],
          [1, 0.02],
        ]),
        color: "#1d4ed8",
        opacity: 0.9,
      },
      pectoral: { s: 0.3, len: 0.15, width: 0.07, color: "#9dbcff", opacity: 0.6 },
      eye: { s: 0.1, f: 0.28, r: 0.06, iris: "#1e3a8a" },
    },
    swim: { cruise: 32, burst: 62, turn: 2.6, minRadius: 0.2, hover: 0.35, tailHz: [1.4, 0.06] },
  },
  royal_gramma: {
    art: {
      half: curve([
        [0, 0.07],
        [0.1, 0.16],
        [0.35, 0.21],
        [0.75, 0.15],
        [1, 0.08],
      ]),
      back: "#eab308",
      side: "#facc15",
      belly: "#fde68a",
      markings: [
        // the purple front half, with a soft slanted edge
        { color: "#9333ea", pts: bar(-0.1, 0.46, -0.06) },
        // the dark line through the eye
        {
          color: "#1f2937",
          pts: [
            [-0.05, 0.42],
            [0.13, 0.32],
            [0.13, 0.26],
            [-0.05, 0.34],
          ],
        },
      ],
      caudal: { len: 0.24, span: 0.2, shape: "round", color: "#facc15", opacity: 0.95 },
      dorsal: {
        from: 0.18,
        to: 0.9,
        height: curve([
          [0, 0.03],
          [0.3, 0.09],
          [0.85, 0.1],
          [1, 0.02],
        ]),
        color: "#a855f7",
        opacity: 0.9,
      },
      anal: {
        from: 0.55,
        to: 0.9,
        height: curve([
          [0, 0.02],
          [0.5, 0.1],
          [1, 0.02],
        ]),
        color: "#facc15",
        opacity: 0.9,
      },
      pelvic: { s: 0.28, len: 0.13, color: "#a855f7" },
      pectoral: { s: 0.3, len: 0.14, width: 0.07, color: "#c084fc", opacity: 0.65 },
      eye: { s: 0.1, f: 0.25, r: 0.055, iris: "#facc15" },
    },
    swim: { cruise: 22, burst: 44, turn: 2.2, minRadius: 0.2, hover: 0.5, tailHz: [1.2, 0.05] },
  },
  sergeant_major: {
    art: {
      half: curve([
        [0, 0.08],
        [0.1, 0.2],
        [0.38, 0.28],
        [0.75, 0.18],
        [1, 0.08],
      ]),
      back: "#c9c370",
      side: "#ece7a6",
      belly: "#f8f6dc",
      markings: [0.2, 0.34, 0.48, 0.62, 0.76].map((s) => ({ color: "#283141", pts: bar(s, s + 0.065, 0.02) })),
      caudal: { len: 0.28, span: 0.24, shape: "fork", color: "#d9d38a", opacity: 0.9 },
      dorsal: {
        from: 0.2,
        to: 0.88,
        height: curve([
          [0, 0.03],
          [0.3, 0.1],
          [0.85, 0.11],
          [1, 0.02],
        ]),
        color: "#d9d38a",
        opacity: 0.9,
      },
      anal: {
        from: 0.58,
        to: 0.88,
        height: curve([
          [0, 0.02],
          [0.4, 0.11],
          [1, 0.02],
        ]),
        color: "#d9d38a",
        opacity: 0.9,
      },
      pectoral: { s: 0.3, len: 0.15, width: 0.08, color: "#efeabf", opacity: 0.6 },
      eye: { s: 0.1, f: 0.3, r: 0.055, iris: "#8a8540" },
    },
    swim: { cruise: 28, burst: 54, turn: 2.2, minRadius: 0.2, hover: 0.2, tailHz: [1.2, 0.05], schools: true },
  },

  // ---- Uncommon ----
  clownfish: {
    art: {
      half: curve([
        [0, 0.07],
        [0.08, 0.16],
        [0.3, 0.25],
        [0.55, 0.22],
        [0.85, 0.12],
        [1, 0.09],
      ]),
      back: "#d9480f",
      side: "#f76707",
      belly: "#ffa94d",
      markings: [
        { color: "#fffaf3", pts: CLOWN_BAND(0.15, 0.25, -0.035), edge: INK, edgeWidth: 1.6 },
        { color: "#fffaf3", pts: CLOWN_BAND(0.46, 0.57, 0.06), edge: INK, edgeWidth: 1.6 },
        { color: "#fffaf3", pts: CLOWN_BAND(0.86, 0.93, 0), edge: INK, edgeWidth: 1.4 },
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
    },
    swim: { cruise: 22, burst: 42, turn: 1.9, minRadius: 0.2, hover: 0.55, tailHz: [0.9, 0.05], home: "anemone" },
  },
  pufferfish: {
    art: {
      half: curve([
        [0, 0.12],
        [0.08, 0.27],
        [0.35, 0.4],
        [0.62, 0.35],
        [0.85, 0.18],
        [1, 0.1],
      ]),
      back: "#c2aa6a",
      side: "#e8d9a8",
      belly: "#fbf6e4",
      markings: [
        [0.22, 0.55],
        [0.33, 0.7],
        [0.45, 0.6],
        [0.3, 0.38],
        [0.55, 0.42],
        [0.62, 0.66],
        [0.72, 0.4],
        [0.42, 0.2],
        [0.18, 0.3],
      ].map(([s, f]) => ({ color: "#6b5b3e", pts: spot(s, f, 0.022) })),
      caudal: { len: 0.2, span: 0.16, shape: "round", color: "#c9b47c", opacity: 0.9 },
      dorsal: {
        from: 0.62,
        to: 0.8,
        height: curve([
          [0, 0.02],
          [0.5, 0.1],
          [1, 0.02],
        ]),
        color: "#c9b47c",
        opacity: 0.9,
      },
      anal: {
        from: 0.64,
        to: 0.82,
        height: curve([
          [0, 0.02],
          [0.5, 0.09],
          [1, 0.02],
        ]),
        color: "#c9b47c",
        opacity: 0.9,
      },
      pectoral: { s: 0.32, len: 0.14, width: 0.1, color: "#dcca92", opacity: 0.75 },
      eye: { s: 0.14, f: 0.35, r: 0.075, iris: "#a37f2a" },
    },
    swim: { cruise: 14, burst: 26, turn: 1.6, minRadius: 0.25, hover: 0.5, tailHz: [1.6, 0.04] },
  },
  emperor_angelfish: {
    art: {
      half: curve([
        [0, 0.08],
        [0.1, 0.24],
        [0.4, 0.34],
        [0.7, 0.3],
        [0.9, 0.16],
        [1, 0.1],
      ]),
      back: "#1e3a8a",
      side: "#1e40af",
      belly: "#2b4fc0",
      markings: [
        // the light blue face and the dark mask over the eye
        { color: "#93c5fd", pts: bar(-0.2, 0.09) },
        { color: "#0f172a", pts: bar(0.09, 0.17, -0.02) },
        // the yellow stripes running back
        ...[0.26, 0.33, 0.4, 0.47, 0.54, 0.61, 0.68, 0.75, 0.82, 0.89].map((s) => ({
          color: "#fde047",
          pts: bar(s, s + 0.024, 0.12),
        })),
      ],
      caudal: { len: 0.2, span: 0.18, shape: "round", color: "#fde047", opacity: 0.95 },
      dorsal: {
        from: 0.18,
        to: 0.95,
        height: curve([
          [0, 0.03],
          [0.5, 0.1],
          [0.9, 0.12],
          [1, 0.03],
        ]),
        color: "#1e3a8a",
        edge: "#93c5fd",
        opacity: 0.95,
      },
      anal: {
        from: 0.5,
        to: 0.95,
        height: curve([
          [0, 0.03],
          [0.6, 0.11],
          [1, 0.03],
        ]),
        color: "#1e3a8a",
        edge: "#93c5fd",
        opacity: 0.95,
      },
      pectoral: { s: 0.3, len: 0.14, width: 0.08, color: "#fde047", opacity: 0.7 },
      eye: { s: 0.13, f: 0.25, r: 0.05, iris: "#1e293b" },
    },
    swim: { cruise: 22, burst: 44, turn: 1.4, minRadius: 0.24, hover: 0.3, tailHz: [0.8, 0.04] },
  },

  // ---- Rare ----
  lionfish: {
    art: {
      half: curve([
        [0, 0.08],
        [0.1, 0.18],
        [0.35, 0.22],
        [0.75, 0.15],
        [1, 0.08],
      ]),
      back: "#fda4af",
      side: "#fff1f2",
      belly: "#fff7f8",
      markings: [0.12, 0.22, 0.32, 0.42, 0.52, 0.62, 0.72, 0.82, 0.92].map((s) => ({
        color: "#b91c1c",
        pts: bar(s, s + 0.045, 0.04),
      })),
      caudal: { len: 0.24, span: 0.2, shape: "round", color: "#fecaca", edge: "#b91c1c", opacity: 0.8 },
      dorsal: {
        from: 0.15,
        to: 0.85,
        height: curve([
          [0, 0.2],
          [0.5, 0.3],
          [0.8, 0.22],
          [1, 0.06],
        ]),
        color: "#fca5a5",
        edge: "#b91c1c",
        opacity: 0.7,
        sweep: 0.3,
        spikes: 10,
      },
      anal: {
        from: 0.62,
        to: 0.85,
        height: curve([
          [0, 0.04],
          [0.5, 0.12],
          [1, 0.03],
        ]),
        color: "#fecaca",
        edge: "#b91c1c",
        opacity: 0.8,
      },
      pelvic: { s: 0.3, len: 0.18, color: "#fecaca", edge: "#b91c1c" },
      pectoral: { s: 0.3, len: 0.42, width: 0.2, color: "#fca5a5", opacity: 0.55 },
      eye: { s: 0.1, f: 0.3, r: 0.055, iris: "#b91c1c" },
    },
    swim: { cruise: 10, burst: 22, turn: 1.2, minRadius: 0.25, hover: 0.7, tailHz: [0.7, 0.03] },
  },
  mandarinfish: {
    art: {
      half: curve([
        [0, 0.09],
        [0.1, 0.18],
        [0.35, 0.22],
        [0.75, 0.15],
        [1, 0.08],
      ]),
      back: "#1d4ed8",
      side: "#2563eb",
      belly: "#3b82f6",
      markings: [
        { color: "#fb923c", pts: wave(0.55, 0.16, 0.12, 16) },
        { color: "#fb923c", pts: wave(0.05, 0.16, 0.14, 13) },
        { color: "#fb923c", pts: wave(-0.5, 0.16, 0.12, 15) },
        { color: "#34d399", pts: wave(0.3, 0.06, 0.1, 14, 0.2, 0.9) },
      ],
      caudal: { len: 0.24, span: 0.2, shape: "round", color: "#f97316", edge: "#2563eb", opacity: 0.9 },
      dorsal: {
        from: 0.2,
        to: 0.5,
        height: curve([
          [0, 0.05],
          [0.5, 0.15],
          [1, 0.05],
        ]),
        color: "#2563eb",
        edge: "#f97316",
        opacity: 0.95,
      },
      anal: {
        from: 0.5,
        to: 0.92,
        height: curve([
          [0, 0.04],
          [0.5, 0.1],
          [1, 0.03],
        ]),
        color: "#2563eb",
        edge: "#f97316",
        opacity: 0.95,
      },
      pectoral: { s: 0.3, len: 0.15, width: 0.09, color: "#f97316", opacity: 0.7 },
      eye: { s: 0.12, f: 0.3, r: 0.07, iris: "#f97316" },
    },
    swim: { cruise: 12, burst: 26, turn: 1.8, minRadius: 0.22, hover: 0.6, tailHz: [1.2, 0.04], home: "low" },
  },
  blue_tang: {
    art: {
      half: curve([
        [0, 0.08],
        [0.1, 0.2],
        [0.38, 0.3],
        [0.7, 0.24],
        [0.92, 0.1],
        [1, 0.07],
      ]),
      back: "#1c3fa8",
      side: "#2563eb",
      belly: "#5b8cf0",
      markings: [
        // the black "palette": from behind the eye, along the back to the tail
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
    },
    swim: { cruise: 30, burst: 55, turn: 1.4, minRadius: 0.26, hover: 0.18, tailHz: [0.6, 0.035] },
  },
  moorish_idol: {
    art: {
      half: curve([
        [0, 0.05],
        [0.08, 0.2],
        [0.35, 0.4],
        [0.6, 0.33],
        [0.85, 0.12],
        [1, 0.07],
      ]),
      back: "#e7ebef",
      side: "#f8fafc",
      belly: "#fefce8",
      markings: [
        { color: "#f97316", pts: bar(-0.2, 0.04) }, // the orange snout
        { color: "#111827", pts: bar(0.1, 0.28, 0.03) },
        { color: "#fde047", pts: bar(0.45, 0.6, 0.03) },
        { color: "#111827", pts: bar(0.6, 0.78, 0.02) },
        { color: "#fde047", pts: bar(0.86, 1.2) },
      ],
      caudal: { len: 0.22, span: 0.22, shape: "lunate", color: "#111827", opacity: 0.95 },
      // the long white streamer
      dorsal: {
        from: 0.22,
        to: 0.55,
        height: curve([
          [0, 0.12],
          [0.12, 0.62],
          [0.3, 0.32],
          [0.7, 0.12],
          [1, 0.02],
        ]),
        color: "#f8fafc",
        edge: "#cbd5e1",
        opacity: 0.95,
        sweep: 1.1,
      },
      anal: {
        from: 0.38,
        to: 0.8,
        height: curve([
          [0, 0.18],
          [0.5, 0.14],
          [1, 0.03],
        ]),
        color: "#111827",
        opacity: 0.95,
        sweep: 0.5,
      },
      pectoral: { s: 0.32, len: 0.14, width: 0.07, color: "#fde68a", opacity: 0.7 },
      eye: { s: 0.17, f: 0.18, r: 0.05, iris: "#facc15" },
    },
    swim: { cruise: 24, burst: 46, turn: 1.5, minRadius: 0.24, hover: 0.25, tailHz: [0.8, 0.04] },
  },

  // ---- Epic ----
  oarfish: {
    art: {
      half: curve([
        [0, 0.045],
        [0.04, 0.065],
        [0.2, 0.06],
        [0.7, 0.05],
        [1, 0.02],
      ]),
      back: "#aab6c4",
      side: "#d6dde6",
      belly: "#eef2f6",
      markings: [0.12, 0.24, 0.36, 0.48, 0.6, 0.72, 0.84].flatMap((s, i) => [
        { color: "#64748b", pts: spot(s, i % 2 ? 0.25 : -0.1, 0.008) },
        { color: "#94a3b8", pts: wave(0.5, 0.18, 0, 1, s - 0.03, s + 0.03) },
      ]),
      caudal: { len: 0.05, span: 0.02, shape: "point", color: "#dc2626", opacity: 0.9 },
      // the red crest along its whole back, with a plume on its head
      dorsal: {
        from: 0.0,
        to: 1.0,
        height: curve([
          [0, 0.13],
          [0.03, 0.08],
          [0.07, 0.025],
          [1, 0.022],
        ]),
        color: "#dc2626",
        opacity: 0.85,
        sweep: 0.25,
      },
      pectoral: { s: 0.06, len: 0.04, width: 0.02, color: "#f87171", opacity: 0.7 },
      eye: { s: 0.02, f: 0.2, r: 0.016, iris: "#e2e8f0" },
    },
    swim: { cruise: 14, burst: 24, turn: 0.9, minRadius: 0.35, hover: 0.15, tailHz: [0.45, 0.02] },
    wave: { amp: 0.035, waves: 1.6 },
  },
  sunfish: {
    art: {
      half: curve([
        [0, 0.2],
        [0.1, 0.42],
        [0.4, 0.55],
        [0.75, 0.5],
        [1, 0.38],
      ]),
      back: "#6f7b88",
      side: "#a7b2be",
      belly: "#d9dee4",
      markings: [
        {
          color: "#c3cbd4",
          pts: [
            [0.2, -0.2],
            [0.5, -0.1],
            [0.8, -0.3],
            [0.7, -0.6],
            [0.35, -0.6],
          ],
        },
      ],
      caudal: { len: 0.1, span: 0.38, shape: "clavus", color: "#8b97a4", opacity: 0.95 },
      dorsal: {
        from: 0.6,
        to: 0.82,
        height: curve([
          [0, 0.05],
          [0.6, 0.42],
          [1, 0.08],
        ]),
        color: "#7b8794",
        opacity: 0.95,
        sweep: 0.35,
      },
      anal: {
        from: 0.6,
        to: 0.82,
        height: curve([
          [0, 0.05],
          [0.6, 0.38],
          [1, 0.08],
        ]),
        color: "#7b8794",
        opacity: 0.95,
        sweep: 0.35,
      },
      pectoral: { s: 0.28, len: 0.09, width: 0.06, color: "#8b97a4", opacity: 0.85 },
      eye: { s: 0.13, f: 0.25, r: 0.04, iris: "#475569" },
    },
    swim: { cruise: 10, burst: 18, turn: 1.1, minRadius: 0.24, hover: 0.3, tailHz: [0.5, 0.02] },
  },

  // ---- Legendary ----
  coelacanth: {
    art: {
      half: curve([
        [0, 0.08],
        [0.1, 0.2],
        [0.4, 0.25],
        [0.75, 0.2],
        [1, 0.12],
      ]),
      back: "#1f3d5e",
      side: "#2f5a85",
      belly: "#4a77a3",
      markings: [
        [0.2, 0.45],
        [0.3, 0.1],
        [0.38, 0.6],
        [0.46, -0.3],
        [0.55, 0.35],
        [0.66, -0.05],
        [0.74, 0.5],
        [0.84, 0.1],
        [0.24, -0.4],
      ].map(([s, f]) => ({ color: "#d7e0ea", pts: spot(s, f, 0.022) })),
      caudal: { len: 0.24, span: 0.2, shape: "lobed", color: "#24476b", opacity: 0.95 },
      dorsal: {
        from: 0.25,
        to: 0.4,
        height: curve([
          [0, 0.05],
          [0.5, 0.14],
          [1, 0.03],
        ]),
        color: "#24476b",
        opacity: 0.95,
        sweep: 0.3,
      },
      anal: {
        from: 0.66,
        to: 0.78,
        height: curve([
          [0, 0.05],
          [0.5, 0.11],
          [1, 0.03],
        ]),
        color: "#24476b",
        opacity: 0.95,
        sweep: 0.3,
      },
      pelvic: { s: 0.45, len: 0.14, color: "#24476b" },
      pectoral: { s: 0.3, len: 0.17, width: 0.1, color: "#24476b", opacity: 0.95 },
      eye: { s: 0.1, f: 0.3, r: 0.06, iris: "#c3d9a5" },
    },
    swim: { cruise: 12, burst: 24, turn: 1.3, minRadius: 0.2, hover: 0.5, tailHz: [0.5, 0.02] },
  },
  dunkleosteus: {
    art: {
      half: curve([
        [0, 0.12],
        [0.08, 0.24],
        [0.3, 0.27],
        [0.6, 0.2],
        [1, 0.07],
      ]),
      back: "#4a4643",
      side: "#6b6560",
      belly: "#a8a29e",
      markings: [
        // the bony armour over the head, in plates
        { color: "#a8a29e", pts: bar(-0.2, 0.3, -0.03), edge: "#78716c", edgeWidth: 1.2 },
        { color: "#8f8984", pts: bar(0.12, 0.2, -0.03) },
        // the jaw blade
        {
          color: "#e7e5e4",
          pts: [
            [-0.05, -0.2],
            [0.12, -0.32],
            [0.14, -0.45],
            [-0.04, -0.38],
          ],
          edge: "#57534e",
          edgeWidth: 0.8,
        },
      ],
      caudal: { len: 0.28, span: 0.26, shape: "shark", color: "#57534e", opacity: 0.95 },
      dorsal: {
        from: 0.32,
        to: 0.5,
        height: curve([
          [0, 0.02],
          [0.45, 0.17],
          [1, 0.01],
        ]),
        color: "#57534e",
        opacity: 0.95,
        sweep: 0.5,
      },
      anal: {
        from: 0.74,
        to: 0.84,
        height: curve([
          [0, 0.02],
          [0.5, 0.07],
          [1, 0.01],
        ]),
        color: "#57534e",
        opacity: 0.95,
        sweep: 0.4,
      },
      pectoral: { s: 0.32, len: 0.2, width: 0.08, color: "#57534e", opacity: 0.95 },
      eye: { s: 0.09, f: 0.45, r: 0.045, iris: "#e0c97a" },
    },
    swim: { cruise: 18, burst: 34, turn: 1.4, minRadius: 0.2, hover: 0.15, tailHz: [0.55, 0.025] },
  },
  megalodon: {
    art: {
      half: curve([
        [0, 0.06],
        [0.08, 0.13],
        [0.3, 0.17],
        [0.65, 0.13],
        [1, 0.05],
      ]),
      back: "#4b5b70",
      side: "#64748b",
      belly: "#e2e8f0",
      markings: [
        ...[0.17, 0.2, 0.23].map((s) => ({ color: "#3b4859", pts: bar(s, s + 0.008, 0.01) })),
        // the mouth line
        {
          color: "#1e293b",
          pts: [
            [0.0, -0.35],
            [0.1, -0.5],
            [0.13, -0.47],
            [0.03, -0.3],
          ],
        },
      ],
      caudal: { len: 0.32, span: 0.3, shape: "shark", color: "#5b6b80", opacity: 0.95 },
      dorsal: {
        from: 0.3,
        to: 0.5,
        height: curve([
          [0, 0.02],
          [0.45, 0.28],
          [1, 0.01],
        ]),
        color: "#5b6b80",
        opacity: 0.95,
        sweep: 0.7,
      },
      anal: {
        from: 0.78,
        to: 0.86,
        height: curve([
          [0, 0.02],
          [0.5, 0.06],
          [1, 0.01],
        ]),
        color: "#5b6b80",
        opacity: 0.95,
        sweep: 0.5,
      },
      pelvic: { s: 0.62, len: 0.08, color: "#5b6b80" },
      pectoral: { s: 0.3, len: 0.26, width: 0.1, color: "#5b6b80", opacity: 0.95 },
      eye: { s: 0.07, f: 0.35, r: 0.025, iris: "#0f172a" },
    },
    swim: { cruise: 22, burst: 40, turn: 1.4, minRadius: 0.18, hover: 0.05, tailHz: [0.5, 0.02] },
  },
};

const HAND: Record<"seahorse" | "manta_ray", Temperament> = {
  seahorse: { cruise: 6, burst: 10, turn: 1.2, minRadius: 0.3, hover: 0.7, tailHz: [1.5, 0.05] },
  manta_ray: { cruise: 18, burst: 28, turn: 0.9, minRadius: 0.4, hover: 0, tailHz: [0.4, 0.02] },
};

// The nautilus drifts shell-first in slow jets.
export const NAUTILUS_SWIM: Temperament = { cruise: 8, burst: 16, turn: 0.9, minRadius: 0.3, hover: 0.3, tailHz: [0.6, 0.02], pulse: 3.2 };

const CUT: Partial<Record<SpeciesId, PuppetId>> = { pufferfish: "pufferfish", lionfish: "lionfish", sunfish: "sunfish" };

export function speciesArt(id: SpeciesId | "nautilus"): SpeciesArt {
  if (id === "nautilus") return { kind: "puppet", id, art: null, swim: NAUTILUS_SWIM };
  if (id === "seahorse" || id === "manta_ray") return { kind: "puppet", id, art: null, swim: HAND[id] };
  const cut = CUT[id];
  if (cut) return { kind: "puppet", id: cut, art: ART[id].art, swim: ART[id].swim };
  return { kind: "rope", ...ART[id] };
}

// The body length in the tank (world units; the tank is 400 wide) from a
// species' size, and half its tallest height (for keeping fish apart).
export const LENGTH_SCALE = 1.15;
export const lengthOf = (width: number) => width * LENGTH_SCALE;

export function girthOf(art: Art) {
  let max = 0;
  for (let i = 0; i <= 20; i++) max = Math.max(max, art.half(i / 20));
  return max;
}
