// Turns a simulated fish (a bent 3D spine) into flat screen shapes for the SVG
// and Canvas tanks. Pure maths, shared by both.
//
// The body outline is the true SILHOUETTE of the fish: each slice of the body
// is an ellipse (tall and thin), and we take its two edge points as seen from
// the camera. Side-on that's the full height; head-on, mid-turn, it's the thin
// width. That's why a turn reads as the fish swinging round toward you, not a
// paper cut-out flipping.

import type { Art, Marking } from "./fish-art";
import { CAM, type Fish, type Frame, project, sample, tailFlex, TANK, TO_CAM, type V3 } from "./swim";

export type XY = { x: number; y: number };

export type Shape2D = {
  z: number;
  k: number;
  body: XY[];
  markings: { m: Marking; pts: XY[] }[];
  caudal: XY[];
  dorsal: XY[];
  anal: XY[];
  pelvic: XY[] | null;
  pecs: { pts: XY[]; near: boolean }[];
  eyes: { x: number; y: number; r: number; a: number }[];
  sheen: XY[];
  shade: { x1: number; y1: number; x2: number; y2: number };
  shadow: { x: number; y: number; rx: number; ry: number; a: number };
};

const add = (a: V3, b: V3, k = 1): V3 => ({ x: a.x + b.x * k, y: a.y + b.y * k, z: a.z + b.z * k });
const dot3 = (a: V3, b: V3) => a.x * b.x + a.y * b.y + a.z * b.z;
const smooth = (a: number, b: number, v: number) => {
  const k = Math.min(1, Math.max(0, (v - a) / (b - a)));
  return k * k * (3 - 2 * k);
};

type Slice = { c: XY; o: XY; pu: XY; H: number };

function slice(fr: Frame, art: Art, s: number, pan: number): Slice {
  const sm = sample(fr, s);
  const c = project(sm.p, pan);
  const L = fr.L;
  const pu = sub(project(add(sm.p, sm.u), pan), c);
  const pr = sub(project(add(sm.p, sm.r), pan), c);
  const pt = sub(project(add(sm.p, sm.t), pan), c);
  const tl = Math.hypot(pt.x, pt.y);
  let n: XY = tl > 0.12 ? { x: pt.y / tl, y: -pt.x / tl } : unit(pu);
  if (n.x * pu.x + n.y * pu.y < 0) n = { x: -n.x, y: -n.y };
  const ss = Math.min(1, Math.max(0, s));
  const H = art.half(ss) * L;
  const W = art.thick(ss) * L;
  const a = n.x * pu.x + n.y * pu.y;
  const b = n.x * pr.x + n.y * pr.y;
  const m = Math.sqrt(H * H * a * a + W * W * b * b) || 1e-6;
  return { c, o: { x: (H * H * a * pu.x + W * W * b * pr.x) / m, y: (H * H * a * pu.y + W * W * b * pr.y) / m }, pu, H };
}

function sub(a: { x: number; y: number }, b: { x: number; y: number }): XY {
  return { x: a.x - b.x, y: a.y - b.y };
}
function unit(v: XY): XY {
  const l = Math.hypot(v.x, v.y) || 1;
  return { x: v.x / l, y: v.y / l };
}
const at = (sl: Slice, f: number): XY => ({ x: sl.c.x + sl.o.x * f, y: sl.c.y + sl.o.y * f });

const BODY_SAMPLES = 16;
const S_BODY = Array.from({ length: BODY_SAMPLES }, (_, j) => (1 - Math.cos((Math.PI * j) / (BODY_SAMPLES - 1))) / 2);

export function shapeOf(f: Fish, fr: Frame, art: Art, pan = 0): Shape2D {
  const L = fr.L;
  const P = (p: V3) => {
    const q = project(p, pan);
    return { x: q.x, y: q.y };
  };

  // Body
  const slices = S_BODY.map((s) => slice(fr, art, s, pan));
  const snout = P(sample(fr, -0.03).p);
  const body: XY[] = [snout, ...slices.map((sl) => at(sl, 1)), ...slices.map((sl) => at(sl, -1)).reverse()];

  // Markings in body space
  const cache = new Map<number, Slice>();
  const sl = (s: number) => {
    const key = Math.round(s * 200);
    let v = cache.get(key);
    if (!v) {
      v = slice(fr, art, key / 200, pan);
      cache.set(key, v);
    }
    return v;
  };
  const markings = art.markings.map((m) => ({ m, pts: m.pts.map(([s, fv]) => at(sl(s), fv)) }));

  // Fins along the back and belly (thin, in the fish's up/down plane)
  const finRipple = (t: number) => 1 + 0.07 * Math.sin(f.fin * 0.5 + t * 9);
  const finAlong = (fin: Art["dorsal"], sign: 1 | -1) => {
    const base: XY[] = [];
    const tip: XY[] = [];
    for (let i = 0; i <= 8; i++) {
      const t = i / 8;
      const s = fin.from + (fin.to - fin.from) * t;
      const q = sl(s);
      base.push(at(q, sign * 0.9));
      const h = fin.height(t) * L * finRipple(t);
      const pu = unit(q.pu);
      const kk = Math.hypot(q.pu.x, q.pu.y);
      tip.push({ x: q.c.x + q.o.x * sign + pu.x * h * kk * sign, y: q.c.y + q.o.y * sign + pu.y * h * kk * sign });
    }
    return [...base, ...tip.reverse()];
  };
  const dorsal = finAlong(art.dorsal, 1);
  const anal = finAlong(art.anal, -1);

  // Tail fin: trails the tail's sideways motion, so it flexes as it beats.
  const tr = sample(fr, 1);
  const flex = tailFlex(f);
  const dir = (() => {
    const d = add({ x: -tr.t.x, y: -tr.t.y, z: -tr.t.z }, tr.r, flex);
    const l = Math.hypot(d.x, d.y, d.z) || 1;
    return { x: d.x / l, y: d.y / l, z: d.z / l };
  })();
  const c = art.caudal;
  const hr = art.half(1) * L * 0.85;
  const len = c.len * L;
  const span = c.span * L;
  const q3 = (along: number, upAmt: number) => P(add(add(tr.p, dir, along), tr.u, upAmt));
  let caudal: XY[];
  if (c.shape === "round") {
    caudal = [q3(0, hr)];
    for (let i = 0; i <= 8; i++) {
      const a = 1 - (2 * i) / 8;
      caudal.push(q3(len * (0.72 + 0.28 * Math.cos((a * Math.PI) / 2)), span * a));
    }
    caudal.push(q3(0, -hr));
  } else if (c.shape === "fork") {
    caudal = [
      q3(0, hr),
      q3(len * 0.55, span * 0.6),
      q3(len, span),
      q3(len * 0.92, span * 0.82),
      q3(len * 0.5, 0),
      q3(len * 0.92, -span * 0.82),
      q3(len, -span),
      q3(len * 0.55, -span * 0.6),
      q3(0, -hr),
    ];
  } else {
    caudal = [
      q3(0, hr),
      q3(len * 0.6, span * 0.75),
      q3(len * 1.02, span * 1.05),
      q3(len * 0.86, span * 0.55),
      q3(len * 0.78, 0),
      q3(len * 0.86, -span * 0.55),
      q3(len * 1.02, -span * 1.05),
      q3(len * 0.6, -span * 0.75),
      q3(0, -hr),
    ];
  }

  // Pectoral fins: one each side, fluttering open and closed. The near one is
  // drawn in front of the body, the far one behind.
  const pec = art.pectoral;
  const ps = sample(fr, pec.s);
  const pH = art.half(pec.s) * L;
  const pW = art.thick(pec.s) * L;
  const pecs = [1, -1].map((side) => {
    const phi = 0.35 + 0.55 * (0.5 + 0.5 * Math.sin(f.fin + side * 0.9));
    const out = { x: ps.r.x * side, y: ps.r.y * side, z: ps.r.z * side };
    const d = add({ x: -ps.t.x * Math.cos(phi), y: -ps.t.y * Math.cos(phi), z: -ps.t.z * Math.cos(phi) }, out, Math.sin(phi));
    const base = add(add(ps.p, ps.u, -0.15 * pH), out, pW * 0.9);
    const pl = pec.len * L;
    const w = pec.width * L;
    const pts = [
      P(add(base, ps.u, w * 0.5)),
      P(add(add(base, d, pl * 0.55), ps.u, w * 0.5)),
      P(add(add(base, d, pl), ps.u, -pl * 0.12)),
      P(add(add(base, d, pl * 0.55), ps.u, -w * 0.35)),
      P(add(base, ps.u, -w * 0.3)),
    ];
    return { pts, near: dot3(out, TO_CAM) > 0 };
  });

  // Pelvic fins (a small pair under the chest; drawn as one)
  let pelvic: XY[] | null = null;
  if (art.pelvic) {
    const pv = art.pelvic;
    const a = sample(fr, pv.s);
    const b = sample(fr, pv.s + 0.08);
    const ha = art.half(pv.s) * L;
    const hb = art.half(pv.s + 0.08) * L;
    const pl = pv.len * L;
    pelvic = [
      P(add(a.p, a.u, -ha * 0.85)),
      P(add(add(a.p, a.u, -ha - pl * 0.75), a.t, -pl * 0.55)),
      P(add(b.p, b.u, -hb * 0.85)),
    ];
  }

  // Eyes: both sides exist; each fades as it turns away from the camera.
  const es = sample(fr, art.eye.s);
  const eH = art.half(art.eye.s) * L;
  const eW = art.thick(art.eye.s) * L;
  const eyes = [1, -1].map((side) => {
    const out = { x: es.r.x * side, y: es.r.y * side, z: es.r.z * side };
    const e3 = add(add(es.p, es.u, art.eye.f * eH), out, eW * 0.85);
    const q = project(e3, pan);
    return { x: q.x, y: q.y, r: art.eye.r * L * q.k, a: smooth(-0.1, 0.35, dot3(out, TO_CAM)) };
  });

  const sheen = [0.12, 0.25, 0.4, 0.55, 0.7, 0.82].map((s) => at(sl(s), 0.55));
  const mid = sl(0.4);
  const shade = { x1: mid.c.x + mid.o.x, y1: mid.c.y + mid.o.y, x2: mid.c.x - mid.o.x, y2: mid.c.y - mid.o.y };

  const m3 = fr.P[3];
  const g = project({ x: m3.x, y: TANK.floor, z: m3.z }, pan);
  const height = Math.max(0, m3.y - TANK.floor);
  const shadow = { x: g.x, y: g.y, rx: L * 0.5 * g.k, ry: L * 0.11 * g.k, a: 0.2 * (1 - Math.min(1, height / 260)) };

  return {
    z: m3.z,
    k: project(m3, pan).k,
    body,
    markings,
    caudal,
    dorsal,
    anal,
    pelvic,
    pecs,
    eyes,
    sheen,
    shade,
    shadow,
  };
}

// A smooth closed (or open) path through points, as an SVG path string.
// Canvas uses the same string through Path2D.
export function smoothPath(pts: XY[], closed = true): string {
  const n = pts.length;
  if (n < 3) return "";
  const f = (v: number) => v.toFixed(1);
  const mid = (a: XY, b: XY) => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });
  if (!closed) {
    let d = `M${f(pts[0].x)} ${f(pts[0].y)}`;
    for (let i = 1; i < n - 1; i++) {
      const m = mid(pts[i], pts[i + 1]);
      d += `Q${f(pts[i].x)} ${f(pts[i].y)} ${f(m.x)} ${f(m.y)}`;
    }
    return d + `L${f(pts[n - 1].x)} ${f(pts[n - 1].y)}`;
  }
  const m0 = mid(pts[n - 1], pts[0]);
  let d = `M${f(m0.x)} ${f(m0.y)}`;
  for (let i = 0; i < n; i++) {
    const m = mid(pts[i], pts[(i + 1) % n]);
    d += `Q${f(pts[i].x)} ${f(pts[i].y)} ${f(m.x)} ${f(m.y)}`;
  }
  return d + "Z";
}

export { CAM };
