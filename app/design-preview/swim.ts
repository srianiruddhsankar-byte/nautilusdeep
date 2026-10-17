// Shared fish swimming for the three tank previews. Pure maths: no React, no
// drawing, no clock (the caller passes dt).
//
// Every fish is simulated in 3D, even in the 2D tanks: x right, y UP, z toward
// the viewer. The head steers toward a target; a chain of spine points follows
// the head ("follow the leader"), so the body bends along the path it swam.
// A U-turn sweeps the heading THROUGH DEPTH (toward or away from you), the way
// real fish turn in a tank, so nothing is ever mirrored or flipped.

export type V3 = { x: number; y: number; z: number };

export const TANK = {
  w: 400,
  h: 300,
  floor: 62, // the sand's height (y up)
  // where fish swim
  x0: 40,
  x1: 360,
  y0: 104,
  y1: 245,
  z0: -34,
  z1: 34,
};

export const NODES = 10; // spine points, head first

export type SwimSpec = {
  length: number; // body length, world units (the tank is 400 wide)
  cruise: number; // units / s
  burst: number; // top speed
  turn: number; // fastest yaw rate, rad / s
  minRadius: number; // tightest turn, as a fraction of the length
  hover: number; // chance (0–1) to hover on arriving somewhere
  tailHz: [number, number]; // tail beats per second: base + per unit of speed
  girth: number; // half the body's height, as a fraction of the length (for keeping apart)
  home?: V3; // stays near this most of the time (a clownfish and its anemone)
  homeRange?: number;
};

export type Fish = {
  id: string;
  spec: SwimSpec;
  p: V3; // the head
  yaw: number; // 0 = facing +x, π/2 = facing the viewer
  pitch: number;
  v: number;
  yawRate: number;
  roll: number;
  target: V3;
  retarget: number; // s until a new target anyway
  hoverT: number; // s of hovering left
  gait: number; // slow speed changes ("burst and coast")
  gaitGoal: number;
  gaitT: number;
  turnDir: number; // a U-turn, once started, keeps its direction
  tail: number; // tail-beat phase
  tailAmp: number;
  fin: number; // pectoral-fin phase
  t: number;
  spine: V3[];
  avoid: V3; // steering away from nearby fish (set by separate())
  leader?: Fish; // a schooling buddy to follow
  offset: V3; // where to sit relative to the leader
  rng: () => number;
};

// Small seeded random generator (mulberry32), so each fish is the same every load.
export function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const wrap = (a: number) => Math.atan2(Math.sin(a), Math.cos(a));
const ease = (rate: number, dt: number) => 1 - Math.exp(-rate * dt);

export function createFish(id: string, spec: SwimSpec, seed: number, start: V3, yaw: number): Fish {
  const r = rng(seed);
  const seg = spec.length / (NODES - 1);
  const spine = Array.from({ length: NODES }, (_, i) => ({
    x: start.x - Math.cos(yaw) * seg * i,
    y: start.y,
    z: start.z - Math.sin(yaw) * seg * i,
  }));
  const f: Fish = {
    id,
    spec,
    p: { ...start },
    yaw,
    pitch: 0,
    v: spec.cruise * 0.6,
    yawRate: 0,
    roll: 0,
    target: { ...start },
    retarget: 0,
    hoverT: 0,
    gait: 1,
    gaitGoal: 1,
    gaitT: 0,
    turnDir: 0,
    tail: r() * 6.28,
    tailAmp: 0.08,
    fin: r() * 6.28,
    t: r() * 100,
    spine,
    avoid: { x: 0, y: 0, z: 0 },
    offset: { x: -spec.length * (0.6 + r()), y: (r() - 0.5) * 30, z: (r() - 0.5) * 30 },
    rng: r,
  };
  pickTarget(f);
  return f;
}

function pickTarget(f: Fish) {
  const r = f.rng;
  const { spec } = f;
  const zMid = () => ((r() + r() - 1) * (TANK.z1 - TANK.z0)) / 2; // bias toward the middle depth
  if (spec.home && r() < 0.75) {
    const range = spec.homeRange ?? 60;
    f.target = {
      x: clamp(spec.home.x + (r() - 0.5) * 2 * range, TANK.x0, TANK.x1),
      y: clamp(spec.home.y + r() * range * 0.8, TANK.y0, TANK.y1),
      z: clamp(spec.home.z + (r() - 0.5) * range * 0.6, TANK.z0, TANK.z1),
    };
  } else {
    // A few tries for somewhere a good distance away: fish patrol, they don't jitter.
    let best = f.target;
    let bestD = -1;
    for (let i = 0; i < 4; i++) {
      const c = { x: TANK.x0 + r() * (TANK.x1 - TANK.x0), y: TANK.y0 + r() * (TANK.y1 - TANK.y0), z: zMid() };
      const d = Math.hypot(c.x - f.p.x, c.y - f.p.y);
      if (d > bestD) {
        best = c;
        bestD = d;
      }
      if (d > spec.length * 3) break;
    }
    f.target = best;
  }
  f.retarget = 6 + r() * 8;
}

export function step(f: Fish, dt: number) {
  dt = Math.max(0, Math.min(dt, 0.05));
  const { spec, rng: r } = f;
  f.t += dt;

  // Where to go next.
  f.retarget -= dt;
  if (f.leader && f.hoverT <= 0) {
    const l = f.leader;
    const back = l.spine[NODES - 1];
    f.target = { x: back.x + f.offset.x * Math.cos(l.yaw), y: back.y + f.offset.y, z: back.z + f.offset.z };
    if (l.hoverT > 0 && f.v < spec.cruise * 0.5 && r() < dt) f.hoverT = l.hoverT;
  }
  const d = { x: f.target.x - f.p.x, y: f.target.y - f.p.y, z: f.target.z - f.p.z };
  const dist = Math.hypot(d.x, d.y, d.z);
  if (f.hoverT > 0) {
    f.hoverT -= dt;
  } else if (!f.leader && (dist < spec.length * 0.7 || f.retarget <= 0)) {
    if (r() < spec.hover) f.hoverT = 2 + r() * 5;
    pickTarget(f);
  }
  const hovering = f.hoverT > 0;

  // Gait: speed drifts between coasting and gentle bursts.
  f.gaitT -= dt;
  if (f.gaitT <= 0) {
    f.gaitGoal = 0.6 + r() * 0.65;
    f.gaitT = 1.5 + r() * 3;
  }
  f.gait += (f.gaitGoal - f.gait) * ease(0.8, dt);

  // Steering. A U-turn commits to one direction, chosen to head back toward the
  // middle depth, so the fish never dithers or swims out of the tank.
  let e = 0;
  let desiredPitch = 0;
  if (!hovering) {
    // head for the target, bent away from any fish close by
    const k = 1 / (dist || 1);
    const a = f.avoid;
    const gx = d.x * k + a.x * 1.6;
    const gy = d.y * k + a.y * 1.6;
    const gz = d.z * k + a.z * 1.6;
    e = wrap(Math.atan2(gz, gx) - f.yaw);
    desiredPitch = clamp(Math.atan2(gy, Math.hypot(gx, gz)), -0.32, 0.32);
  }
  // (hovering: no turning. Turning on the spot coils the spine.)
  if (Math.abs(e) > 2.3) {
    if (!f.turnDir) {
      const zSide = f.p.z === 0 ? (r() < 0.5 ? 1 : -1) : -Math.sign(f.p.z);
      f.turnDir = zSide * (Math.sign(Math.cos(f.yaw)) || 1);
    }
    if (Math.sign(e) !== f.turnDir) e += f.turnDir * 2 * Math.PI;
  } else if (Math.abs(e) < 1.2) {
    f.turnDir = 0;
  }

  // Speed: slows into a sharp turn, eases off near the target, nearly stops to hover.
  const turnSlow = 0.32 + 0.68 * Math.max(0, Math.cos(Math.min(Math.abs(e), Math.PI)));
  const arrive = clamp(dist / (spec.length * 1.6), 0.45, 1);
  const goal = hovering ? spec.cruise * 0.07 : Math.min(spec.burst, spec.cruise * f.gait * turnSlow * arrive);
  f.v += (goal - f.v) * ease(goal > f.v ? 1.6 : 1.1, dt);

  // Turning needs forward motion: a fish can't spin on the spot without its
  // body bending, so the tightest radius is a fraction of its length.
  const maxW = Math.min(spec.turn, Math.max(f.v, 2.5) / (spec.length * spec.minRadius));
  const wGoal = clamp(e * 2.4, -maxW, maxW);
  f.yawRate += (wGoal - f.yawRate) * ease(5, dt);
  f.yaw = wrap(f.yaw + f.yawRate * dt);
  f.pitch += (desiredPitch - f.pitch) * ease(1.4, dt);
  // Bank slightly into the turn.
  f.roll += (clamp(f.yawRate * 0.22, -0.3, 0.3) - f.roll) * ease(3, dt);

  // Move the head.
  const cp = Math.cos(f.pitch);
  f.p.x += Math.cos(f.yaw) * cp * f.v * dt;
  f.p.y += Math.sin(f.pitch) * f.v * dt;
  f.p.z += Math.sin(f.yaw) * cp * f.v * dt;
  if (hovering) f.p.y += Math.sin(f.t * 1.2) * 2.2 * dt; // gentle up/down drift
  f.p.x = clamp(f.p.x, TANK.x0 - 20, TANK.x1 + 20);
  f.p.y = clamp(f.p.y, TANK.y0 - 8, TANK.y1 + 10);
  f.p.z = clamp(f.p.z, TANK.z0 - 10, TANK.z1 + 10);

  // The body follows the head, and slowly relaxes straight behind it (a
  // gliding fish straightens out; faster when hovering).
  const seg = spec.length / (NODES - 1);
  f.spine[0] = { ...f.p };
  const relax = ease(hovering ? 1.4 : 0.5, dt);
  const fx = Math.cos(f.yaw) * cp;
  const fy = Math.sin(f.pitch);
  const fz = Math.sin(f.yaw) * cp;
  for (let i = 1; i < NODES; i++) {
    const n = f.spine[i];
    n.x += (f.p.x - fx * seg * i - n.x) * relax;
    n.y += (f.p.y - fy * seg * i - n.y) * relax;
    n.z += (f.p.z - fz * seg * i - n.z) * relax;
  }
  for (let i = 1; i < NODES; i++) {
    const a = f.spine[i - 1];
    const b = f.spine[i];
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const dz = b.z - a.z;
    const l = Math.hypot(dx, dy, dz) || 1;
    f.spine[i] = { x: a.x + (dx / l) * seg, y: a.y + (dy / l) * seg, z: a.z + (dz / l) * seg };
  }

  // Tail beat follows speed (and turning); pectoral fins flutter fastest when hovering.
  const hz = spec.tailHz[0] + spec.tailHz[1] * f.v;
  f.tail += 2 * Math.PI * hz * dt;
  const ampGoal = 0.04 + 0.13 * Math.min(1, f.v / spec.burst) + 0.07 * Math.min(1, Math.abs(f.yawRate));
  f.tailAmp += (ampGoal - f.tailAmp) * ease(2, dt);
  f.fin += 2 * Math.PI * (hovering ? 3.2 : 1.6 + f.v * 0.03) * dt;
}

// A resting pose for reduced motion: straight, side-on, not moving.
export function rest(f: Fish, at: V3, facingLeft: boolean) {
  f.yaw = facingLeft ? Math.PI : 0;
  f.p = { ...at };
  f.v = 0;
  f.yawRate = 0;
  f.roll = 0;
  f.pitch = 0;
  f.tailAmp = 0.03;
  const seg = f.spec.length / (NODES - 1);
  const dir = facingLeft ? -1 : 1;
  f.spine = Array.from({ length: NODES }, (_, i) => ({ x: at.x - dir * seg * i, y: at.y, z: at.z }));
}

// ---------- the bent body, ready to draw ----------

// Per spine point: position (with the swimming wave applied) and a frame:
// T forward, U the fish's "up" (dorsal), R its right side. Right-handed, so a
// fish built pointing along +x, up +y, right +z bends with no extra maths.
export type Frame = { P: V3[]; T: V3[]; U: V3[]; R: V3[]; L: number };

export function emptyFrame(): Frame {
  const z = () => Array.from({ length: NODES }, () => ({ x: 0, y: 0, z: 0 }));
  return { P: z(), T: z(), U: z(), R: z(), L: 0 };
}

function norm(v: V3) {
  const l = Math.hypot(v.x, v.y, v.z) || 1;
  v.x /= l;
  v.y /= l;
  v.z /= l;
  return v;
}

// Tangents by central differences; R is horizontal (T × up), U = R × T.
function tangents(P: V3[], T: V3[], R: V3[], U: V3[], roll: number) {
  const cr = Math.cos(roll);
  const sr = Math.sin(roll);
  for (let i = 0; i < NODES; i++) {
    const a = P[Math.max(0, i - 1)];
    const b = P[Math.min(NODES - 1, i + 1)];
    const t = norm({ x: a.x - b.x, y: a.y - b.y, z: a.z - b.z });
    const r = norm({ x: -t.z, y: 0, z: t.x });
    const u = { x: r.y * t.z - r.z * t.y, y: r.z * t.x - r.x * t.z, z: r.x * t.y - r.y * t.x };
    T[i] = t;
    U[i] = { x: u.x * cr + r.x * sr, y: u.y * cr + r.y * sr, z: u.z * cr + r.z * sr };
    R[i] = { x: r.x * cr - u.x * sr, y: r.y * cr - u.y * sr, z: r.z * cr - u.z * sr };
  }
}

export function frameOf(f: Fish, out: Frame) {
  const { P, T, U, R } = out;
  out.L = f.spec.length;
  for (let i = 0; i < NODES; i++) P[i] = f.spine[i];
  tangents(P, T, R, U, 0);
  // The swimming wave: travels head → tail, small at the head (recoil),
  // largest at the tail.
  const P2: V3[] = [];
  for (let i = 0; i < NODES; i++) {
    const s = i / (NODES - 1);
    const a = (0.18 - 0.5 * s + 1.32 * s * s) * f.tailAmp * f.spec.length;
    const off = a * Math.sin(f.tail - s * 2 * Math.PI * 0.95);
    P2.push({ x: P[i].x + R[i].x * off, y: P[i].y, z: P[i].z + R[i].z * off });
  }
  for (let i = 0; i < NODES; i++) P[i] = P2[i];
  tangents(P, T, R, U, f.roll);
}

// The caudal fin trails the tail's sideways motion (the wave's slope at the tip).
export function tailFlex(f: Fish) {
  return -f.tailAmp * 2.4 * Math.cos(f.tail - 2 * Math.PI * 0.95);
}

export type Sample = { p: V3; t: V3; u: V3; r: V3 };

// Position + frame at s (0 head … 1 tail root); outside 0–1 it extends along the end.
export function sample(fr: Frame, s: number): Sample {
  const n = NODES - 1;
  if (s <= 0 || s >= 1) {
    const i = s <= 0 ? 0 : n;
    const ext = (s <= 0 ? -s : -(s - 1)) * fr.L;
    const t = fr.T[i];
    const p = fr.P[i];
    return { p: { x: p.x + t.x * ext, y: p.y + t.y * ext, z: p.z + t.z * ext }, t, u: fr.U[i], r: fr.R[i] };
  }
  const fi = s * n;
  const i = Math.min(n - 1, Math.floor(fi));
  const k = fi - i;
  const lerp = (a: V3, b: V3) => ({ x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k, z: a.z + (b.z - a.z) * k });
  return {
    p: lerp(fr.P[i], fr.P[i + 1]),
    t: norm(lerp(fr.T[i], fr.T[i + 1])),
    u: norm(lerp(fr.U[i], fr.U[i + 1])),
    r: norm(lerp(fr.R[i], fr.R[i + 1])),
  };
}

// ---------- the camera of the 2D tanks ----------

// Looking into the tank from the front and a little above, with mild
// perspective. The 3D tank places its real camera to match.
export const CAM = { elev: 0.17, dist: 650, cx: 200, cy: 150 };
const CE = Math.cos(CAM.elev);
const SE = Math.sin(CAM.elev);
// Unit vector from the scene toward the camera.
export const TO_CAM: V3 = { x: 0, y: SE, z: CE };

export type P2 = { x: number; y: number; k: number };

export function project(p: V3, panX = 0): P2 {
  const dy = p.y - CAM.cy;
  const depth = p.z * CE + dy * SE;
  const k = CAM.dist / (CAM.dist - depth);
  const up = dy * CE - p.z * SE;
  return { x: CAM.cx + (p.x - CAM.cx + panX) * k, y: CAM.cy - up * k, k };
}

// ---------- keeping apart ----------

// Simple boids separation, for the whole cast after each step:
// 1. Steering: a fish within about two body-widths of another gets an "avoid"
//    direction that bends its course away (used by step() next frame).
// 2. A guarantee: if two bodies would still overlap in 3D, both are nudged
//    apart (smaller fish move more). Passing BEHIND another fish at a
//    different depth is fine: that's not overlapping, and it's drawn behind.
export function separate(fish: Fish[]) {
  const push = fish.map(() => ({ x: 0, y: 0, z: 0 }));
  for (const f of fish) f.avoid = { x: 0, y: 0, z: 0 };
  for (let i = 0; i < fish.length; i++) {
    for (let j = i + 1; j < fish.length; j++) {
      const a = fish[i];
      const b = fish[j];
      const ma = a.spec.length;
      const mb = b.spec.length;
      const shareA = mb / (ma + mb); // the smaller fish gives way more
      for (let ia = 0; ia < NODES; ia += 1) {
        const ra = a.spec.girth * ma * (1 - 0.55 * (ia / (NODES - 1)));
        const pa = a.spine[ia];
        for (let ib = 0; ib < NODES; ib += 1) {
          const rb = b.spec.girth * mb * (1 - 0.55 * (ib / (NODES - 1)));
          const pb = b.spine[ib];
          const dx = pa.x - pb.x;
          const dy = pa.y - pb.y;
          const dz = pa.z - pb.z;
          const d = Math.hypot(dx, dy, dz) || 0.001;
          const minD = ra + rb;
          const steerD = minD * 2.4;
          if (d >= steerD) continue;
          const ux = dx / d;
          const uy = dy / d;
          const uz = dz / d;
          const w = Math.pow(1 - d / steerD, 2) / NODES;
          a.avoid.x += ux * w * shareA * 2;
          a.avoid.y += uy * w * shareA * 2;
          a.avoid.z += uz * w * shareA * 2;
          b.avoid.x -= ux * w * (1 - shareA) * 2;
          b.avoid.y -= uy * w * (1 - shareA) * 2;
          b.avoid.z -= uz * w * (1 - shareA) * 2;
          if (d < minD) {
            const over = (minD - d) / 2; // split over both sides of the pair
            const pi = push[i];
            const pj = push[j];
            pi.x = maxAbs(pi.x, ux * over * shareA * 2);
            pi.y = maxAbs(pi.y, uy * over * shareA * 2);
            pi.z = maxAbs(pi.z, uz * over * shareA * 2);
            pj.x = maxAbs(pj.x, -ux * over * (1 - shareA) * 2);
            pj.y = maxAbs(pj.y, -uy * over * (1 - shareA) * 2);
            pj.z = maxAbs(pj.z, -uz * over * (1 - shareA) * 2);
          }
        }
      }
    }
  }
  fish.forEach((f, i) => {
    const q = push[i];
    if (!q.x && !q.y && !q.z) return;
    f.p.x += q.x;
    f.p.y += q.y;
    f.p.z += q.z;
    for (const n of f.spine) {
      n.x += q.x;
      n.y += q.y;
      n.z += q.z;
    }
  });
}

// keeps whichever push is bigger, so overlaps with several nodes don't add up
const maxAbs = (a: number, b: number) => (Math.abs(b) > Math.abs(a) ? b : a);
