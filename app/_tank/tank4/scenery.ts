// Tank 4's scenery: the colours of each skin, the one merged background
// drawing, and the things that move (seagrass, the anemone, drifting specks).
// World units: the tank is 400 × 300, y DOWN (screen space). Pure strings and
// maths, except causticTile (which draws on a canvas).
//
// Batch C1 gives every skin its own colours on one shared layout; C3 gives
// each skin its own scenery (reeds, lily pads, stones…).

import type { SkinId } from "@/lib/economy";

export type XY = { x: number; y: number };

export const WORLD = { x: -20, y: -12, w: 440, h: 324 };
export const SAND_TOP = 212; // the back edge of the sand on screen

export type Look = {
  water: [string, string, string, string]; // top → bottom
  reef: string; // the faint far reef
  sand: [string, string, string];
  sandLight: string;
  sandDark: string;
  haze: string;
  rock: [string, string, string];
  rays: number; // sunlight, 0 = none
  surface: string;
  caustics: number; // light on the sand, 0 = none
  plantTint: number; // multiplies the seagrass (0xffffff = as drawn)
  speck: number; // drifting specks' colour
  vignette: string;
};

export const LOOKS: Record<SkinId, Look> = {
  shallows: {
    water: ["#b9e3e3", "#6fb4c2", "#3c839a", "#2d6c82"],
    reef: "#6aa7b3",
    sand: ["#c9c09d", "#ddcfa6", "#c7ad7c"],
    sandLight: "#f2e6c4",
    sandDark: "#a88f62",
    haze: "#8fc6cc",
    rock: ["#9aa9a6", "#6d7f80", "#4a5a5f"],
    rays: 1,
    surface: "#e9f7f4",
    caustics: 1,
    plantTint: 0xffffff,
    speck: 0xf4fbfa,
    vignette: "rgb(11 42 54 / 0.38)",
  },
  pond: {
    water: ["#dcebc6", "#a3c78f", "#6f9a66", "#56805a"],
    reef: "#7fa66e",
    sand: ["#a8956c", "#bba77d", "#9c8660"],
    sandLight: "#d8c79c",
    sandDark: "#7f6c4a",
    haze: "#a9c99a",
    rock: ["#a3a68c", "#7c8068", "#5b5f4c"],
    rays: 0.6,
    surface: "#f1f8e4",
    caustics: 0.6,
    plantTint: 0xe8f2d8,
    speck: 0xf4f8e8,
    vignette: "rgb(28 46 20 / 0.36)",
  },
  river: {
    water: ["#d7f0f3", "#94d0dc", "#5ea9bb", "#4790a4"],
    reef: "#7fbccb",
    sand: ["#bfb69c", "#d2c9ae", "#b1a68a"],
    sandLight: "#ece5cf",
    sandDark: "#958a6e",
    haze: "#a5d6dd",
    rock: ["#aab4b0", "#848f8b", "#5f6a67"],
    rays: 0.9,
    surface: "#ffffff",
    caustics: 1.1,
    plantTint: 0xf2fff6,
    speck: 0xffffff,
    vignette: "rgb(14 46 58 / 0.32)",
  },
  lake: {
    water: ["#c2e0e5", "#6aa3b2", "#3f7a8e", "#2f6275"],
    reef: "#55899a",
    sand: ["#9d8f6f", "#b0a281", "#8f8163"],
    sandLight: "#cfc2a0",
    sandDark: "#76694d",
    haze: "#7fb0bc",
    rock: ["#8e9a98", "#687675", "#475454"],
    rays: 0.55,
    surface: "#eef8fa",
    caustics: 0.6,
    plantTint: 0xd6e6de,
    speck: 0xeef8fa,
    vignette: "rgb(10 34 44 / 0.42)",
  },
  deep: {
    water: ["#2a5279", "#173a5e", "#0e2742", "#081a2e"],
    reef: "#1d3b58",
    sand: ["#2f3f50", "#3a4d61", "#2a394a"],
    sandLight: "#4f6478",
    sandDark: "#1f2b38",
    haze: "#24486b",
    rock: ["#3d4c5c", "#2b3846", "#1c2632"],
    rays: 0,
    surface: "#5f86ad",
    caustics: 0.15,
    plantTint: 0x7f9bb0,
    speck: 0x9cc3e6,
    vignette: "rgb(2 10 20 / 0.5)",
  },
};

export const SAND_D = `M-20 ${SAND_TOP} C40 ${SAND_TOP - 8} 110 ${SAND_TOP + 6} 190 ${SAND_TOP - 2} S330 ${SAND_TOP - 6} 420 ${SAND_TOP + 2} V320 H-20Z`;

// Everything that never moves, as ONE drawing: water, far reef, sand, haze,
// rocks and the anemone's foot. Drawn into one texture, so the GPU fills the
// screen once for all of it.
export function backgroundSvg(l: Look) {
  return `
<defs>
<linearGradient id="w" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${l.water[0]}"/><stop offset=".35" stop-color="${l.water[1]}"/><stop offset=".75" stop-color="${l.water[2]}"/><stop offset="1" stop-color="${l.water[3]}"/></linearGradient>
<linearGradient id="s" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${l.sand[0]}"/><stop offset=".25" stop-color="${l.sand[1]}"/><stop offset="1" stop-color="${l.sand[2]}"/></linearGradient>
<linearGradient id="h" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${l.haze}" stop-opacity="0"/><stop offset=".7" stop-color="${l.haze}" stop-opacity=".55"/><stop offset="1" stop-color="${l.haze}" stop-opacity=".85"/></linearGradient>
<linearGradient id="r" x1="0" y1="0" x2=".3" y2="1"><stop offset="0" stop-color="${l.rock[0]}"/><stop offset=".55" stop-color="${l.rock[1]}"/><stop offset="1" stop-color="${l.rock[2]}"/></linearGradient>
</defs>
<rect x="-20" y="-12" width="440" height="324" fill="url(#w)"/>
<path d="M-20 222 C10 196 40 200 60 208 C80 186 120 190 140 204 C170 194 190 200 205 210 C230 188 270 192 290 206 C320 190 360 196 420 204 V240 H-20Z" fill="${l.reef}" opacity=".55"/>
<path d="M236 214 C232 170 244 140 238 100 C250 140 252 176 246 214Z M252 214 C254 180 266 160 268 130 C272 166 262 192 260 214Z" fill="${l.reef}" opacity=".5"/>
<path d="M20 214 C18 182 30 166 26 140 C36 168 36 192 30 214Z" fill="${l.reef}" opacity=".45"/>
<path d="${SAND_D}" fill="url(#s)"/>
<g fill="none" stroke-linecap="round">
<path d="M20 262 C70 254 120 262 170 256" stroke="${l.sandLight}" stroke-width="1.4" opacity=".6"/>
<path d="M200 270 C250 262 300 270 360 262" stroke="${l.sandLight}" stroke-width="1.4" opacity=".5"/>
<path d="M60 284 C120 276 190 286 250 280" stroke="${l.sandDark}" stroke-width="1.2" opacity=".4"/></g>
<ellipse cx="160" cy="268" rx="4" ry="2.2" fill="${l.sandDark}" opacity=".7"/><ellipse cx="236" cy="252" rx="3" ry="1.6" fill="${l.sandDark}" opacity=".8"/><ellipse cx="280" cy="286" rx="5" ry="2.6" fill="${l.sandDark}" opacity=".7"/>
<rect x="-20" y="-12" width="440" height="324" fill="url(#h)" opacity=".55"/>
<path d="M52 250 C50 232 66 220 86 222 C100 214 124 218 136 230 C146 238 148 248 144 254 Z" fill="url(#r)"/>
<path d="M66 230 C76 224 90 223 100 226" stroke="${l.rock[0]}" stroke-width="2" stroke-linecap="round" fill="none" opacity=".6"/>
<path d="M222 250 C222 238 236 230 252 232 C266 228 280 236 282 250 Z" fill="url(#r)"/>
<ellipse cx="${ANEMONE_BASE.x}" cy="${ANEMONE_BASE.y + 2}" rx="30" ry="6" fill="#7a3a57"/>`;
}

// The caustics are a strip over the sand. LIP is a slice of the background
// drawn back over the strip's top edge: solid over the water, fading out over
// the sand, so the light seems to start at the sand's edge (no mask needed).
export const CAUSTIC_TOP = SAND_TOP - 12;
export const LIP = { x: WORLD.x, y: CAUSTIC_TOP - 2, w: WORLD.w, h: 46 };
export function lipSvg(l: Look) {
  return `<defs><linearGradient id="lf" x1="0" y1="${SAND_TOP - 8}" x2="0" y2="${LIP.y + LIP.h}" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#fff"/><stop offset="1" stop-color="#000"/></linearGradient>
<mask id="lm" maskUnits="userSpaceOnUse" x="-20" y="-12" width="440" height="324"><rect x="-20" y="-12" width="440" height="324" fill="#fff"/><path d="${SAND_D}" fill="url(#lf)"/></mask></defs>
<g mask="url(#lm)">${backgroundSvg(l)}</g>`;
}

// Sunlight from the surface: each ray is its own small texture (cropped to its
// own box, so it doesn't cost a full-screen fill).
export const RAYS = [
  { d: "M70 -10h46l60 250h-80z", box: { x: 70, y: -10, w: 106, h: 250 } },
  { d: "M180 -10h30l52 230h-58z", box: { x: 180, y: -10, w: 82, h: 230 } },
  { d: "M262 -10h40l58 240h-70z", box: { x: 262, y: -10, w: 98, h: 240 } },
  { d: "M335 -10h24l40 210h-42z", box: { x: 335, y: -10, w: 64, h: 210 } },
];
export const raySvg = (d: string) =>
  `<defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fffbe8" stop-opacity=".55"/><stop offset=".6" stop-color="#fffbe8" stop-opacity=".12"/><stop offset="1" stop-color="#fffbe8" stop-opacity="0"/></linearGradient></defs><path d="${d}" fill="url(#g)"/>`;

export const SURFACE_BOX = { x: -40, y: -12, w: 480, h: 26 };
export function surfaceSvg(color: string) {
  let d = "M-40 -12 V8";
  for (let x = -40; x <= 440; x += 20) d += `L${x} ${(9 + Math.sin(x * 0.04) * 2.2 + Math.sin(x * 0.11) * 1.2).toFixed(1)}`;
  return `<path d="${d}V-12Z" fill="${color}" opacity=".45"/>`;
}

// The water's slow sway: plants and specks all lean with it.
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

// A blade's centreline, base to tip: it sways more toward the tip.
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

// A blade lying along x (base at 0, tip at h), tapered, for its texture.
export function bladeSvg(b: Blade, smooth: (pts: XY[]) => string) {
  const n = 12;
  const top: XY[] = [];
  const bot: XY[] = [];
  for (let j = 0; j <= n; j++) {
    const k = j / n;
    const w = b.w * Math.pow(1 - k, 0.55) * 0.5 + 0.2;
    top.push({ x: k * b.h, y: -w });
    bot.push({ x: k * b.h, y: w });
  }
  return `<defs><linearGradient id="b" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="${b.color}"/><stop offset="1" stop-color="${b.tip}"/></linearGradient></defs><path d="${smooth([...top, ...bot.reverse()])}" fill="url(#b)" stroke="${b.tip}" stroke-width=".6" stroke-opacity=".7"/>`;
}

// The clownfish's anemone, on the rock at the left.
export const ANEMONE_BASE = { x: 99, y: 226 };
// …and where that is in the swim simulation's space (y up).
export const ANEMONE_AT = { x: 98, y: 118, z: 6 };

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

export const TENTACLE_SVG = `<defs><linearGradient id="t" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#a8577a"/><stop offset="1" stop-color="#f2b6c8"/></linearGradient></defs>
<path d="M0 -2.1 L28 -2.1 A2.1 2.1 0 0 1 28 2.1 L0 2.1Z" fill="url(#t)"/><circle cx="28.4" cy="0" r="2.3" fill="#f8cfdb"/>`;

// One tentacle's curve (a gently waving quadratic), as points base → tip.
export function tentacleLine(tn: Tentacle, t: number, n = 8): XY[] {
  const cur = current(t);
  const wave = Math.sin(t * 1.1 + tn.phase) * 0.25 + cur * 0.12;
  const a = tn.angle + wave;
  const base = { x: tn.x, y: ANEMONE_BASE.y };
  const tip = { x: base.x + Math.sin(a) * tn.len, y: base.y - Math.cos(a) * tn.len };
  const ctrl = { x: base.x + Math.sin(tn.angle * 0.6) * tn.len * 0.5, y: base.y - tn.len * 0.6 };
  const line: XY[] = [];
  for (let j = 0; j <= n; j++) {
    const k = j / n;
    const p = (1 - k) * (1 - k);
    const q = 2 * k * (1 - k);
    const r = k * k;
    line.push({ x: p * base.x + q * ctrl.x + r * tip.x, y: p * base.y + q * ctrl.y + r * tip.y });
  }
  return line;
}

// Marine snow and tiny bubbles; depth 0 (far) … 1 (near) sets size and speed.
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

// Points spaced evenly along a polyline. Pixi's rope spreads its texture by
// point INDEX, so even spacing is what keeps the art undistorted.
export function resample(line: XY[], out: XY[]) {
  const seg: number[] = [0];
  for (let i = 1; i < line.length; i++) seg.push(seg[i - 1] + Math.hypot(line[i].x - line[i - 1].x, line[i].y - line[i - 1].y));
  const total = seg[seg.length - 1] || 1;
  let j = 1;
  for (let i = 0; i < out.length; i++) {
    const d = (total * i) / (out.length - 1);
    while (j < line.length - 1 && seg[j] < d) j++;
    const a = line[j - 1];
    const b = line[j];
    const k = (d - seg[j - 1]) / (seg[j] - seg[j - 1] || 1);
    out[i].x = a.x + (b.x - a.x) * k;
    out[i].y = a.y + (b.y - a.y) * k;
  }
}

// A caustic tile (bright lines where light focuses), made once in the browser
// from cell noise. White on transparent, seamless.
export function causticTile(size: number, seed: number): HTMLCanvasElement {
  let a = seed >>> 0;
  const rnd = () => {
    a = (a * 1664525 + 1013904223) >>> 0;
    return a / 4294967296;
  };
  const cells = 6;
  const pts: [number, number][] = [];
  for (let y = 0; y < cells; y++) for (let x = 0; x < cells; x++) pts.push([(x + rnd()) / cells, (y + rnd()) / cells]);
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  const img = ctx.createImageData(size, size);
  for (let py = 0; py < size; py++) {
    for (let px = 0; px < size; px++) {
      const u = px / size;
      const v = py / size;
      let d1 = 9;
      let d2 = 9;
      for (const [cx, cy] of pts) {
        let dx = Math.abs(u - cx);
        let dy = Math.abs(v - cy);
        if (dx > 0.5) dx = 1 - dx;
        if (dy > 0.5) dy = 1 - dy;
        const d = dx * dx + dy * dy;
        if (d < d1) {
          d2 = d1;
          d1 = d;
        } else if (d < d2) d2 = d;
      }
      const edge = (Math.sqrt(d2) - Math.sqrt(d1)) * cells;
      const glow = Math.pow(Math.max(0, 1 - edge / 0.22), 2.6);
      const i = (py * size + px) * 4;
      img.data[i] = img.data[i + 1] = img.data[i + 2] = 255;
      img.data[i + 3] = Math.round(glow * 255);
    }
  }
  ctx.putImageData(img, 0, 0);
  return canvas;
}
