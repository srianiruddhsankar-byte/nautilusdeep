// Puppets: the odd shapes that don't bend like a fish. Each is a few pieces
// (drawn once as SVG, then turned and stretched around their joints every
// frame) plus, for the nautilus, tentacles that are little ropes.
// - Cut from body-space art (fish-art.ts): the pufferfish (now and then it
//   puffs up), the lionfish (long fins that sway) and the ocean sunfish
//   (sculls with its tall fins).
// - Drawn here: the manta ray (wing flaps), the seahorse (upright, slow) and
//   the nautilus (drifts shell-first in slow jets).
// Every puppet faces right; the engine mirrors it, and a turn swings it round
// (a flat animal is seen edge-on mid-turn, so `minFlip` sets how thin it gets).
// Pure: strings and maths only.

import type { Art, PuppetId } from "./fish-art";
import { type Box, boxOf, type Part, sideView, type XY } from "./side-view";

export type PuppetPart = Omit<Part, "name"> & { name: string };

export type Pose = { rot: number; sx: number; sy: number; dx: number; dy: number; alpha: number };
export type PuppetState = {
  t: number; // seconds
  fin: number; // the fish's fin phase (radians)
  tail: number; // its tail-beat phase
  push: number; // 0 … 1, how hard a jet is pushing (the nautilus)
  seed: number; // 0 … 1, so two of a kind don't move in step
  still: boolean; // reduced motion: rest
};

export type Tentacles = {
  svg: string; // one tentacle, lying along +x from x = 0
  box: Box;
  z: number;
  count: number;
  points: number; // per tentacle
  lines: (s: PuppetState, out: XY[][]) => void; // base → tip, in drawing units
};

export type Puppet = {
  unit: number; // world units per drawing unit
  parts: PuppetPart[];
  tentacles?: Tentacles;
  centre: XY; // where the swimming body's middle is, in drawing units
  box: Box; // the whole puppet at rest, drawing units
  minFlip: number; // mid-turn width (0 … 1)
  tilt: number; // the most it noses up or down
  backwards?: boolean; // swims tail-first (the nautilus)
  animate: (pose: Record<string, Pose>, s: PuppetState) => void; // "all" moves the whole puppet
};

const ease = (k: number) => k * k * (3 - 2 * k);
const sin = Math.sin;

export function puppetFor(id: PuppetId, art: Art | null, L: number): Puppet {
  switch (id) {
    case "manta_ray":
      return manta(L);
    case "seahorse":
      return seahorse(L);
    case "nautilus":
      return nautilus(L);
    default:
      return cutFrom(id, art!, L);
  }
}

// The whole puppet at rest as one drawing (for silhouettes).
export function puppetPicture(p: Puppet): { svg: string; box: Box } {
  const parts = [...p.parts].sort((a, b) => a.z - b.z);
  let svg = parts
    .map((part) => {
      const dx = part.at.x - part.pivot.x;
      const dy = part.at.y - part.pivot.y;
      return dx || dy ? `<g transform="translate(${dx} ${dy})${part.name === "pec" ? ` rotate(160 ${part.pivot.x} ${part.pivot.y})` : ""}">${part.svg}</g>` : part.svg;
    })
    .join("");
  if (p.tentacles) {
    const lines = Array.from({ length: p.tentacles.count }, () => [] as XY[]);
    p.tentacles.lines({ t: 0, fin: 0, tail: 0, push: 0, seed: 0, still: true }, lines);
    svg =
      lines
        .map((l) => `<path d="M${l.map((q) => `${q.x.toFixed(1)} ${q.y.toFixed(1)}`).join("L")}" stroke="#e9c9a6" stroke-width="1.3" fill="none" stroke-linecap="round"/>`)
        .join("") + svg;
  }
  return { svg, box: p.box };
}

// ---------- cut from art: pufferfish, lionfish, sunfish ----------

function cutFrom(id: PuppetId, art: Art, L: number): Puppet {
  const v = sideView(art, L);
  const parts: PuppetPart[] = [...v.parts];
  const centre = { x: -L / 2, y: 0 };
  let box = v.box;

  if (id === "pufferfish") {
    // the spines that stand up when it puffs
    const H = (s: number) => art.half(s) * L;
    const pts: XY[] = [];
    let d = "";
    for (let s = 0.1; s <= 0.86; s += 0.065) {
      for (const sign of [1, -1]) {
        const base = { x: -s * L, y: -sign * H(s) * 0.95 };
        const tip = { x: base.x - 0.03 * L, y: base.y - sign * 0.075 * L };
        const w = 0.016 * L;
        d += `M${(base.x - w).toFixed(1)} ${base.y.toFixed(1)}L${tip.x.toFixed(1)} ${tip.y.toFixed(1)}L${(base.x + w).toFixed(1)} ${base.y.toFixed(1)}Z`;
        pts.push(base, tip);
      }
    }
    const spines = { name: "spines", svg: `<path d="${d}" fill="#b39758" stroke="#6b5b3e" stroke-width=".4"/>`, box: boxOf(pts), pivot: centre, at: centre, z: 1.5 };
    parts.push(spines);
    box = boxOf([...pts, { x: v.box.x, y: v.box.y }, { x: v.box.x + v.box.w, y: v.box.y + v.box.h }].map((q) => ({ x: centre.x + (q.x - centre.x) * 1.4, y: q.y * 1.4 })), 0);
  }

  const fins = parts.filter((p) => p.name !== "body" && p.name !== "spines");
  return {
    unit: 1,
    parts,
    centre,
    box,
    minFlip: id === "pufferfish" ? 0.4 : id === "lionfish" ? 0.25 : 0.08,
    tilt: 0.15,
    animate: (pose, s) => {
      const wag = s.still ? 0 : 1;
      if (id === "pufferfish") {
        const a = s.still ? 0 : puffAmount(s.t, s.seed);
        const g = 1 + 0.38 * a;
        pose.body.sx = pose.body.sy = g;
        pose.spines.sx = pose.spines.sy = g;
        pose.spines.alpha = a;
        for (const f of fins) {
          pose[f.name].dx = (f.at.x - centre.x) * (g - 1);
          pose[f.name].dy = f.at.y * (g - 1);
        }
        pose.caudal.sx = 0.7 + 0.3 * Math.cos(s.tail) * wag;
        pose.dorsal.sx = 0.85 + 0.15 * sin(s.fin * 2.2) * wag;
        if (pose.anal) pose.anal.sx = 0.85 + 0.15 * sin(s.fin * 2.2 + 1) * wag;
        pose.pec.rot = Math.PI - (0.4 + 0.35 * sin(s.fin * 2) * wag);
      } else if (id === "lionfish") {
        const k = s.t * 0.9 + s.seed * 6;
        pose.pec.rot = Math.PI - (0.55 + 0.16 * sin(k) * wag);
        pose.pec.sx = 0.95 + 0.05 * sin(k) * wag;
        pose.dorsal.sy = 0.97 + 0.05 * sin(s.t * 0.7 + s.seed * 4) * wag;
        pose.dorsal.rot = 0.03 * sin(s.t * 0.7) * wag;
        pose.caudal.sx = 0.82 + 0.18 * Math.cos(s.tail) * wag;
        if (pose.anal) pose.anal.sy = 0.95 + 0.05 * sin(s.t * 0.7 + 1) * wag;
      } else {
        // the sunfish sculls: its tall fins sweep together, the frill ripples
        pose.dorsal.rot = 0.16 * sin(s.tail) * wag;
        pose.dorsal.sy = 0.94 + 0.06 * Math.cos(s.tail) * wag;
        if (pose.anal) {
          pose.anal.rot = -0.16 * sin(s.tail) * wag;
          pose.anal.sy = 0.94 + 0.06 * Math.cos(s.tail) * wag;
        }
        pose.caudal.sx = 0.9 + 0.1 * sin(s.tail * 2) * wag;
        pose.pec.rot = Math.PI - (0.3 + 0.3 * sin(s.fin * 2) * wag);
      }
    },
  };
}

// Now and then (every 45–75 s, different for each puffer) it puffs up for a
// few seconds, slowly: never a jump-scare.
export function puffAmount(t: number, seed: number) {
  const period = 45 + seed * 30;
  const local = (t + seed * 37) % period;
  if (local < 1.6) return ease(local / 1.6);
  if (local < 5) return 1;
  if (local < 7.5) return 1 - ease((local - 5) / 2.5);
  return 0;
}

// ---------- the manta ray ----------
// A three-quarter view from a little above: the far wing up, the near wing
// down, both beating together on slow strokes. Drawing units: 100 wide.

function manta(L: number): Puppet {
  return {
    unit: L / 100,
    centre: { x: 60, y: 50 },
    box: { x: 0, y: 4, w: 100, h: 94 },
    minFlip: 0.12,
    tilt: 0.25,
    parts: [
      {
        name: "farWing",
        svg: `<path d="M65 46 C58 34 50 18 40 7 C42 22 40 36 33 47 Z" fill="#3d4e63" stroke="#2b3a4f" stroke-width=".6"/>`,
        box: { x: 31, y: 5, w: 36, h: 44 },
        pivot: { x: 50, y: 46.5 },
        at: { x: 50, y: 46.5 },
        z: 0,
      },
      {
        name: "tail",
        svg: `<path d="M36 50 Q18 51 2 53" stroke="#1f2937" stroke-width="1.6" fill="none" stroke-linecap="round"/>`,
        box: { x: 0, y: 47, w: 38, h: 8 },
        pivot: { x: 36, y: 50 },
        at: { x: 36, y: 50 },
        z: 0.5,
      },
      {
        name: "body",
        svg: `<defs><linearGradient id="mb" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2b3a4f"/><stop offset="1" stop-color="#46596f"/></linearGradient></defs>
<ellipse cx="60" cy="50" rx="27" ry="9" fill="url(#mb)"/>
<path d="M68 45 q6 -2.5 11 1 q-6 1 -11 -1z" fill="#e2e8f0" opacity=".8"/>
<path d="M84 45 q12 -4.5 12 2 q-6 0 -10 2z M84 55 q12 4.5 12 -2 q-6 0 -10 -2z" fill="#2b3a4f"/>
<circle cx="84" cy="47.5" r="1.1" fill="#e2e8f0"/>`,
        box: { x: 31, y: 39, w: 67, h: 22 },
        pivot: { x: 60, y: 50 },
        at: { x: 60, y: 50 },
        z: 1,
      },
      {
        name: "nearWing",
        svg: `<path d="M65 54 C58 66 50 82 40 95 C42 78 40 64 33 53 Z" fill="#334155" stroke="#5b6b80" stroke-width=".6"/>
<path d="M40 95 C42 78 40 64 33 53 L37 53 C43 64 44 78 40 95Z" fill="#cbd5e1" opacity=".55"/>`,
        box: { x: 31, y: 51, w: 36, h: 46 },
        pivot: { x: 50, y: 53.5 },
        at: { x: 50, y: 53.5 },
        z: 2,
      },
    ],
    animate: (pose, s) => {
      if (s.still) return;
      const phi = (2 * Math.PI * s.t) / 3.4 + s.seed * 6.28;
      const raise = sin(phi);
      pose.farWing.sy = 0.78 + 0.32 * raise;
      pose.farWing.rot = -0.04 * raise;
      pose.nearWing.sy = Math.max(0.22, 0.72 - 0.42 * raise);
      pose.nearWing.rot = 0.04 * raise;
      pose.tail.rot = 0.05 * sin(phi * 0.5);
      pose.all.dy = -1.4 * sin(phi + Math.PI);
    },
  };
}

// ---------- the seahorse ----------
// Upright and slow: it bobs, its tail curls, its little back fin flutters.
// Drawing units: 34 wide (as its index drawing).

function seahorse(L: number): Puppet {
  return {
    unit: L / 34,
    centre: { x: 19, y: 24 },
    box: { x: 4, y: -1, w: 30, h: 50 },
    minFlip: 0.25,
    tilt: 0.12,
    parts: [
      {
        name: "tail",
        svg: `<path d="M17 31 C17 38, 12 41, 14 45 C16 48, 22 46, 20 42 C19 40, 16 41, 17 43" stroke="#e08a0b" stroke-width="3.2" fill="none" stroke-linecap="round"/>`,
        box: { x: 10, y: 29, w: 14, h: 20 },
        pivot: { x: 17, y: 31 },
        at: { x: 17, y: 31 },
        z: 0,
      },
      {
        name: "dorsal",
        svg: `<path d="M13.5 16 Q4.5 20.5 11.5 28 Z" fill="#fbbf24" fill-opacity=".85" stroke="#d97706" stroke-width=".6"/>`,
        box: { x: 4, y: 14.5, w: 11, h: 15 },
        pivot: { x: 13, y: 22 },
        at: { x: 13, y: 22 },
        z: 1,
      },
      {
        name: "body",
        svg: `<defs><linearGradient id="sb" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#c76a08"/><stop offset=".6" stop-color="#f59e0b"/><stop offset="1" stop-color="#fcc94a"/></linearGradient></defs>
<path d="M13 9 C14 3, 22 2, 25 7 L32 9 L32 12.5 L24.5 13 C25 18, 24 24, 21 30 C19 34, 15 34, 13 30 C11 25, 14 20, 13 15 Z" fill="url(#sb)" stroke="#9a5206" stroke-opacity=".4" stroke-width=".5"/>
<path d="M15 18 Q19 19.5 23 18 M15 22 Q19 23.5 23 22 M15 26 Q18.5 27.5 22 26" stroke="#c2650a" stroke-width=".9" fill="none"/>
<path d="M15 4 L14 0 L18 3 Z" fill="#d97706"/>
<circle cx="21" cy="8" r="1.8" fill="#fff"/><circle cx="21.4" cy="8" r="1" fill="#0f172a"/>`,
        box: { x: 10, y: -1, w: 23, h: 36 },
        pivot: { x: 19, y: 20 },
        at: { x: 19, y: 20 },
        z: 2,
      },
      {
        name: "pec",
        svg: `<path d="M0 -1.4 Q3.5 -1.7 4.2 0 Q3 1.5 0 1.2Z" fill="#fde68a" fill-opacity=".9"/>`,
        box: { x: -0.5, y: -2, w: 5.2, h: 4 },
        pivot: { x: 0, y: 0 },
        at: { x: 21.5, y: 15 },
        z: 3,
      },
    ],
    animate: (pose, s) => {
      if (s.still) return;
      pose.all.dy = 1.1 * sin(s.t * 0.9 + s.seed * 6);
      pose.all.rot = 0.04 * sin(s.t * 0.5 + s.seed * 3);
      pose.tail.rot = 0.14 * sin(s.t * 0.7 + s.seed * 5);
      pose.dorsal.sx = 0.55 + 0.45 * sin(s.fin * 3.5);
      pose.pec.sx = 0.6 + 0.4 * sin(s.fin * 4 + 1);
    },
  };
}

// ---------- the nautilus ----------
// Shell first, tentacles trailing, in slow jets: the tentacles bunch up on
// each push and stream out in the glide. Drawing units: 54 wide.

const TENTACLE_ANGLES = [-0.55, -0.35, -0.15, 0.05, 0.25, 0.45, 0.65];

function nautilus(L: number): Puppet {
  return {
    unit: L / 54,
    centre: { x: 21, y: 20 },
    box: { x: 0, y: 1, w: 52, h: 40 },
    minFlip: 0.3,
    tilt: 0.1,
    backwards: true,
    parts: [
      {
        name: "shell",
        svg: `<defs><radialGradient id="ns" cx=".4" cy=".35" r=".7"><stop offset="0" stop-color="#fbf5ec"/><stop offset="1" stop-color="#e6d3bb"/></radialGradient></defs>
<circle cx="19" cy="20" r="17" fill="url(#ns)" stroke="#b98b5e" stroke-opacity=".5" stroke-width=".6"/>
<g stroke="#b45309" stroke-width="2.4" stroke-linecap="round" fill="none"><path d="M8 8 Q12 14 10 20"/><path d="M15 4 Q18 11 16 18"/><path d="M23 4 Q24 10 21 16"/><path d="M4 16 Q9 20 8 26"/></g>
<path d="M19 20 m-6 0 a6 6 0 1 0 12 0 a9 9 0 1 0 -18 0" stroke="#d6b896" stroke-width="1" fill="none"/>`,
        box: { x: 1, y: 2, w: 36, h: 36 },
        pivot: { x: 19, y: 20 },
        at: { x: 19, y: 20 },
        z: 0,
      },
      {
        name: "hood",
        svg: `<path d="M30 12 Q40 13 39 21 Q38 27 32 28 Z" fill="#b98b5e"/><circle cx="34" cy="17" r="1.5" fill="#1f2937"/><circle cx="33.6" cy="16.6" r=".45" fill="#fff"/>`,
        box: { x: 29, y: 11, w: 11, h: 18 },
        pivot: { x: 34, y: 20 },
        at: { x: 34, y: 20 },
        z: 2,
      },
    ],
    tentacles: {
      svg: `<path d="M0 -0.8 L14 -0.3 L14 0.3 L0 0.8Z" fill="#e9c9a6"/>`,
      box: { x: 0, y: -1, w: 14, h: 2 },
      z: 1,
      count: TENTACLE_ANGLES.length,
      points: 6,
      lines: (s, out) => {
        const reach = 1 - 0.3 * s.push; // bunched on a push, streaming in the glide
        TENTACLE_ANGLES.forEach((a0, i) => {
          const line = out[i];
          line.length = 0;
          const len = (11 + ((i * 5) % 4)) * reach;
          const wave = s.still ? 0 : 0.18 * sin(s.t * 1.3 + i * 1.1 + s.seed * 6);
          let x = 35;
          let y = 15.5 + i * 1.8;
          let a = a0 * (0.6 + 0.4 * reach);
          for (let j = 0; j < 6; j++) {
            line.push({ x, y });
            a += wave / 3;
            x += (Math.cos(a) * len) / 5;
            y += (Math.sin(a) * len) / 5;
          }
        });
      },
    },
    animate: (pose, s) => {
      if (s.still) return;
      pose.all.rot = 0.05 * sin(s.t * 0.6 + s.seed * 4) - 0.06 * s.push;
      pose.all.dy = 0.8 * sin(s.t * 0.7 + s.seed * 2);
    },
  };
}
