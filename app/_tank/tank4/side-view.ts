// A species' side drawing, built once from its body-space art (fish-art.ts):
// the fish lying straight, facing right, its spine along y = 0, the head at
// x = 0 and the tail root at x = −L. The engine turns this SVG into a texture
// and bends it along the swimming spine. Pure: strings only, no DOM.
//
// The near pectoral fin is a separate small drawing (it flaps on its own).

import type { Art, FinShape } from "./fish-art";

export type XY = { x: number; y: number };
export type Box = { x: number; y: number; w: number; h: number };

export type SideView = {
  svg: string; // SVG body (no <svg> wrapper), in the units of `box`
  box: Box; // symmetric about y = 0, so the rope's centre line is the spine
  x0: number; // left edge: the tail-fin tip
  x1: number; // right edge: the snout
  pec: { svg: string; box: Box }; // the near pectoral fin, pointing along +x from its base
  parts: Part[]; // the same fish in separate pieces, for puppets (puppets.ts)
};

// One piece of a puppet. `svg` and `box` are in the piece's own units; it
// turns and stretches around `pivot`, which sits at `at` in the fish's units
// (head at x = 0, tail root at x = −L, spine along y = 0).
export type PartName = "body" | "caudal" | "dorsal" | "anal" | "pec";
export type Part = { name: PartName; svg: string; box: Box; pivot: XY; at: XY; z: number };

export function boxOf(pts: XY[], pad = 1.5): Box {
  const xs = pts.map((p) => p.x);
  const ys = pts.map((p) => p.y);
  const x = Math.min(...xs) - pad;
  const y = Math.min(...ys) - pad;
  return { x, y, w: Math.max(...xs) + pad - x, h: Math.max(...ys) + pad - y };
}

const BODY_SAMPLES = 16;
const S_BODY = Array.from({ length: BODY_SAMPLES }, (_, j) => (1 - Math.cos((Math.PI * j) / (BODY_SAMPLES - 1))) / 2);

export function sideView(art: Art, L: number): SideView {
  const X = (s: number) => -s * L;
  const H = (s: number) => art.half(Math.min(1, Math.max(0, s))) * L;
  const at = (s: number, f: number): XY => ({ x: X(s), y: -f * H(s) });

  // Body: the snout, then along the back, then back along the belly.
  const snout = { x: 0.03 * L, y: 0 };
  const body = [snout, ...S_BODY.map((s) => at(s, 1)), ...S_BODY.map((s) => at(s, -1)).reverse()];

  const markings = art.markings.map((m) => ({ m, pts: m.pts.map(([s, f]) => at(s, f)) }));

  const dorsal = finAlong(art.dorsal, 1, X, H, L);
  const anal = art.anal ? finAlong(art.anal, -1, X, H, L) : null;
  const caudal = caudalOf(art, L);

  // The far pectoral fin, half open, behind the body.
  const pec = art.pectoral;
  const pl = pec.len * L;
  const pw = pec.width * L;
  const phi = 0.6;
  const base = { x: X(pec.s), y: 0.15 * H(pec.s) };
  const back = -Math.cos(phi);
  const farPec = [
    { x: base.x, y: base.y - pw * 0.5 },
    { x: base.x + back * pl * 0.55, y: base.y - pw * 0.5 },
    { x: base.x + back * pl, y: base.y + pl * 0.12 },
    { x: base.x + back * pl * 0.55, y: base.y + pw * 0.35 },
    { x: base.x, y: base.y + pw * 0.3 },
  ];

  let pelvic: XY[] | null = null;
  if (art.pelvic) {
    const pv = art.pelvic;
    const plv = pv.len * L;
    pelvic = [
      { x: X(pv.s), y: H(pv.s) * 0.85 },
      { x: X(pv.s) - plv * 0.55, y: H(pv.s) + plv * 0.75 },
      { x: X(pv.s + 0.08), y: H(pv.s + 0.08) * 0.85 },
    ];
  }

  const eye = at(art.eye.s, art.eye.f);
  const sheen = [0.12, 0.25, 0.4, 0.55, 0.7, 0.82].map((s) => at(s, 0.55));
  const shade = { y1: -H(0.4), y2: H(0.4) };

  const fin = (c: { color: string; edge?: string; opacity: number }) =>
    `fill="${c.color}" fill-opacity="${c.opacity}" stroke="${c.edge ?? "none"}" stroke-width=".9" stroke-linejoin="round"`;
  const bodyD = smoothPath(body);
  const farPecS = `<path d="${smoothPath(farPec)}" ${fin({ ...pec, opacity: pec.opacity * 0.7 })}/>`;
  const caudalS = `<path d="${smoothPath(caudal)}" ${fin(art.caudal)}/>`;
  const dorsalS = `<path d="${smoothPath(dorsal, true, art.dorsal.spikes ? 0 : 1)}" ${fin(art.dorsal)}/>`;
  const analS = anal && art.anal ? `<path d="${smoothPath(anal, true, art.anal.spikes ? 0 : 1)}" ${fin(art.anal)}/>` : "";
  const pelvicS = pelvic && art.pelvic ? `<path d="${smoothPath(pelvic)}" ${fin({ ...art.pelvic, opacity: 0.95 })}/>` : "";
  const bodyS = `
<defs><linearGradient id="g" gradientUnits="userSpaceOnUse" x1="0" y1="${f1(shade.y1)}" x2="0" y2="${f1(shade.y2)}">
<stop offset="0" stop-color="${art.back}"/><stop offset=".45" stop-color="${art.side}"/><stop offset="1" stop-color="${art.belly}"/></linearGradient>
<clipPath id="c"><path d="${bodyD}"/></clipPath></defs>
<path d="${bodyD}" fill="url(#g)" stroke="#1b1a1f" stroke-opacity=".35" stroke-width=".7"/>
<g clip-path="url(#c)">
${markings.map((m) => `<path d="${smoothPath(m.pts)}" fill="${m.m.color}" stroke="${m.m.edge ?? "none"}" stroke-width="${m.m.edgeWidth ?? 0}" stroke-linejoin="round"/>`).join("")}
<path d="${smoothPath(sheen, false)}" fill="none" stroke="#fff" stroke-opacity=".28" stroke-width="${f1(Math.min(2.6, Math.max(1, L * 0.04)))}" stroke-linecap="round"/></g>
${eyeSvg(eye.x, eye.y, art.eye.r * L, art.eye.iris)}`;
  const svg = farPecS + caudalS + dorsalS + analS + pelvicS + bodyS;

  // A box symmetric about the spine, so the rope's centre line is the spine.
  const all = [...body, ...dorsal, ...(anal ?? []), ...caudal, ...farPec, ...(pelvic ?? [])];
  const half = Math.max(...all.map((p) => Math.abs(p.y))) + 1.5;
  const x0 = Math.min(...all.map((p) => p.x)) - 1.5;
  const x1 = Math.max(...all.map((p) => p.x)) + 1.5;

  // The near pectoral fin, pointing along +x from its base, so it can flap.
  const pecSvg = `<path d="M0 ${f1(-pw * 0.45)} Q${f1(pl * 0.6)} ${f1(-pw * 0.55)} ${f1(pl)} 0 Q${f1(pl * 0.55)} ${f1(pw * 0.45)} 0 ${f1(pw * 0.35)}Z" ${fin(pec)}/>`;

  const pecBox = { x: -1, y: -pw * 0.6 - 1, w: pl + 2, h: pw * 1.2 + 2 };
  const finBase = (f: FinShape, sign: 1 | -1) => at((f.from + f.to) / 2, sign * 0.9);
  const parts: Part[] = [
    { name: "caudal", svg: caudalS, box: boxOf(caudal), pivot: { x: -L, y: 0 }, at: { x: -L, y: 0 }, z: 0 },
    { name: "dorsal", svg: dorsalS, box: boxOf(dorsal), pivot: finBase(art.dorsal, 1), at: finBase(art.dorsal, 1), z: 1 },
    ...(anal && art.anal
      ? [{ name: "anal" as const, svg: analS, box: boxOf(anal), pivot: finBase(art.anal, -1), at: finBase(art.anal, -1), z: 1 }]
      : []),
    {
      name: "body",
      svg: farPecS + pelvicS + bodyS,
      box: boxOf([...body, ...farPec, ...(pelvic ?? [])]),
      pivot: { x: -L / 2, y: 0 },
      at: { x: -L / 2, y: 0 },
      z: 2,
    },
    { name: "pec", svg: pecSvg, box: pecBox, pivot: { x: 0, y: 0 }, at: base, z: 3 },
  ];

  return { svg, box: { x: x0, y: -half, w: x1 - x0, h: half * 2 }, x0, x1, pec: { svg: pecSvg, box: pecBox }, parts };
}

// A fin along the back (sign 1) or belly (−1): its base on the body, its tip
// `height` out, leaning back by `sweep`. A spiny fin's tip is a zigzag.
function finAlong(fin: FinShape, sign: 1 | -1, X: (s: number) => number, H: (s: number) => number, L: number): XY[] {
  const n = fin.spikes ? fin.spikes * 2 : 8;
  const base: XY[] = [];
  const tip: XY[] = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const s = fin.from + (fin.to - fin.from) * t;
    const h = fin.height(t) * L * (fin.spikes && i % 2 ? 0.45 : 1);
    base.push({ x: X(s), y: -sign * H(s) * 0.9 });
    tip.push({ x: X(s) - (fin.sweep ?? 0) * h, y: -sign * (H(s) + h) });
  }
  return [...base, ...tip.reverse()];
}

// The tail fin, at the tail root, pointing back (−x).
function caudalOf(art: Art, L: number): XY[] {
  const c = art.caudal;
  const hr = art.half(1) * L * 0.85;
  const len = c.len * L;
  const span = c.span * L;
  const q = (along: number, up: number): XY => ({ x: -L - along, y: -up });
  switch (c.shape) {
    case "round": {
      const pts = [q(0, hr)];
      for (let i = 0; i <= 8; i++) {
        const a = 1 - (2 * i) / 8;
        pts.push(q(len * (0.72 + 0.28 * Math.cos((a * Math.PI) / 2)), span * a));
      }
      pts.push(q(0, -hr));
      return pts;
    }
    case "fork":
      return [
        q(0, hr),
        q(len * 0.55, span * 0.6),
        q(len, span),
        q(len * 0.92, span * 0.82),
        q(len * 0.5, 0),
        q(len * 0.92, -span * 0.82),
        q(len, -span),
        q(len * 0.55, -span * 0.6),
        q(0, -hr),
      ];
    case "lunate":
      return [
        q(0, hr),
        q(len * 0.6, span * 0.75),
        q(len * 1.02, span * 1.05),
        q(len * 0.86, span * 0.55),
        q(len * 0.78, 0),
        q(len * 0.86, -span * 0.55),
        q(len * 1.02, -span * 1.05),
        q(len * 0.6, -span * 0.75),
        q(0, -hr),
      ];
    case "point":
      return [q(0, hr), q(len * 0.6, hr * 0.5), q(len, 0), q(len * 0.6, -hr * 0.5), q(0, -hr)];
    case "shark": // the upper lobe is the long one
      return [
        q(0, hr),
        q(len * 0.55, span * 0.55),
        q(len, span * 1.05),
        q(len * 0.88, span * 0.85),
        q(len * 0.5, span * 0.1),
        q(len * 0.62, -span * 0.5),
        q(len * 0.48, -span * 0.48),
        q(len * 0.2, -hr * 0.6),
        q(0, -hr),
      ];
    case "lobed": // the coelacanth's: three lobes, with a little extra one in the middle
      return [
        q(0, hr),
        q(len * 0.5, span * 0.75),
        q(len * 0.8, span * 0.32),
        q(len * 1.08, span * 0.16),
        q(len * 1.22, 0),
        q(len * 1.08, -span * 0.16),
        q(len * 0.8, -span * 0.32),
        q(len * 0.5, -span * 0.75),
        q(0, -hr),
      ];
    case "clavus": {
      // the sunfish's wavy frill where a tail would be
      const pts = [q(0, span)];
      for (let i = 0; i <= 10; i++) {
        const a = Math.PI / 2 - (Math.PI * i) / 10;
        const r = len * (i % 2 ? 1.25 : 0.85);
        pts.push(q(Math.cos(a) * r, Math.sin(a) * span));
      }
      pts.push(q(0, -span));
      return pts;
    }
  }
}

function eyeSvg(x: number, y: number, r: number, iris: string) {
  return `<g transform="translate(${f2(x)} ${f2(y)}) scale(${r.toFixed(3)})"><circle r="1" fill="${iris}"/><circle r=".62" fill="#0b0b10"/><circle cx="-.3" cy="-.32" r=".22" fill="#fff" opacity=".9"/></g>`;
}

const f1 = (v: number) => v.toFixed(1);
const f2 = (v: number) => v.toFixed(2);

// A smooth closed (or open) path through points, as an SVG path string.
// `round` 0 keeps sharp corners (spiny fins).
export function smoothPath(pts: XY[], closed = true, round = 1): string {
  const n = pts.length;
  if (n < 3) return "";
  if (!round) return `M${pts.map((p) => `${f1(p.x)} ${f1(p.y)}`).join("L")}${closed ? "Z" : ""}`;
  const mid = (a: XY, b: XY) => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });
  if (!closed) {
    let d = `M${f1(pts[0].x)} ${f1(pts[0].y)}`;
    for (let i = 1; i < n - 1; i++) {
      const m = mid(pts[i], pts[i + 1]);
      d += `Q${f1(pts[i].x)} ${f1(pts[i].y)} ${f1(m.x)} ${f1(m.y)}`;
    }
    return d + `L${f1(pts[n - 1].x)} ${f1(pts[n - 1].y)}`;
  }
  const m0 = mid(pts[n - 1], pts[0]);
  let d = `M${f1(m0.x)} ${f1(m0.y)}`;
  for (let i = 0; i < n; i++) {
    const m = mid(pts[i], pts[(i + 1) % n]);
    d += `Q${f1(pts[i].x)} ${f1(pts[i].y)} ${f1(m.x)} ${f1(m.y)}`;
  }
  return d + "Z";
}
