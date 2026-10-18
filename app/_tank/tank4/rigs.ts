// How each animal is put together and moved every frame, from its swimming
// simulation (lib/swim.ts). Shared by the tank and the result screen.
// - ROPE: the side drawing bent along the spine at full length (never
//   squashed). Every turn is a sideways U-curl; at the tip of the curl the
//   drawing swaps to its mirror in a short dissolve that keeps the outgoing one
//   opaque underneath (never see-through).
// - PUPPET (puppets.ts): pieces turning around their joints, the whole
//   swinging round when it changes direction.
// Depth: farther = smaller, a little bluer, drawn behind; a soft shadow below.

import type * as PX from "pixi.js";
import type { Rarity } from "@/lib/species";
import { type Fish, jetPush, NODES, project, TANK } from "@/lib/swim";
import type { Pose, PuppetState } from "./puppets";
import { resample, type XY } from "./scenery";
import type { FishTex, PuppetTex, RopeTex } from "./textures";

type Pixi = typeof PX;

export type Common = { shadow: PX.Texture; glow: PX.Texture; sparkle: PX.Texture };

type View = "A" | "B";

type RigBase = {
  key: string;
  f: Fish;
  rarity: Rarity | null;
  group: PX.Container;
  shadow: PX.Sprite | null;
  glow: PX.Sprite;
  sparkles: PX.Sprite[];
  hit: XY[]; // the body's centre line on screen (world units), for taps and glows
  hitR: number;
  seed: number; // 0 … 1
};

export type RopeRig = RigBase & {
  kind: "rope";
  tex: RopeTex;
  views: Record<View, PX.Container>;
  ropes: Record<View, PX.MeshRope>;
  points: PX.Point[];
  pec: PX.Sprite | null;
  m: number; // which way a curl bends on screen (+1 down, −1 up)
  c: number; // how much depth motion shows as on-screen curl (0.3 → 1 in a turn)
  lastTurn: number;
  facing: 1 | -1;
  view: View;
  prev: View | null;
  mix: number;
};

export type PuppetRig = RigBase & {
  kind: "puppet";
  tex: PuppetTex;
  holder: PX.Container; // turns and mirrors (in world space)
  inner: PX.Container; // the drawing, moved by the "all" pose
  sprites: Record<string, PX.Sprite>;
  tentacles: { pts: PX.Point[] }[];
  lines: XY[][];
  pose: Record<string, Pose>;
  facing: 1 | -1;
  flip: number; // −1 … 1, eases toward `facing`
};

export type Rig = RopeRig | PuppetRig;

const HAZE_TINT = [0xb6, 0xd3, 0xde];

export function makeRig(
  P: Pixi,
  common: Common,
  layers: { fish: PX.Container; shadow: PX.Container | null },
  item: { key: string; rarity: Rarity | null; seed: number },
  tex: FishTex,
  f: Fish,
): Rig {
  const group = new P.Container();
  group.sortableChildren = true;
  layers.fish.addChild(group);
  let shadow: PX.Sprite | null = null;
  if (layers.shadow) {
    shadow = new P.Sprite(common.shadow);
    shadow.anchor.set(0.5);
    layers.shadow.addChild(shadow);
  }
  const glow = new P.Sprite(common.glow);
  glow.anchor.set(0.5);
  glow.zIndex = -1;
  glow.visible = false;
  const sparkles =
    item.rarity === "legendary"
      ? [0, 1, 2].map(() => {
          const s = new P.Sprite(common.sparkle);
          s.anchor.set(0.5);
          s.zIndex = 9;
          return s;
        })
      : [];
  const base = { key: item.key, f, rarity: item.rarity, group, shadow, glow, sparkles, hit: [] as XY[], hitR: 0, seed: item.seed };
  const heading: 1 | -1 = Math.cos(f.yaw) >= 0 ? 1 : -1;

  if (tex.kind === "puppet") {
    // glows and sparkles live in world space, the puppet in its own (mirrored) frame
    const holder = new P.Container();
    holder.sortableChildren = true;
    group.addChild(glow, ...sparkles, holder);
    const inner = new P.Container();
    inner.sortableChildren = true;
    inner.pivot.set(tex.puppet.centre.x, tex.puppet.centre.y);
    holder.addChild(inner);
    const sprites: Record<string, PX.Sprite> = {};
    const pose: Record<string, Pose> = { all: rest() };
    for (const { part, tex: t } of tex.parts) {
      const s = new P.Sprite(t);
      s.anchor.set((part.pivot.x - part.box.x) / part.box.w, (part.pivot.y - part.box.y) / part.box.h);
      s.position.set(part.at.x, part.at.y);
      s.zIndex = part.z;
      inner.addChild(s);
      sprites[part.name] = s;
      pose[part.name] = rest();
    }
    const tl = tex.puppet.tentacles;
    const tentacles = tl
      ? Array.from({ length: tl.count }, () => {
          const pts = Array.from({ length: tl.points }, () => new P.Point());
          const rope = new P.MeshRope({ texture: tex.tentacle!, points: pts });
          rope.zIndex = tl.z;
          inner.addChild(rope);
          return { pts };
        })
      : [];
    const facing: 1 | -1 = tex.puppet.backwards ? (-heading as 1 | -1) : heading;
    return { ...base, kind: "puppet", tex, holder, inner, sprites, tentacles, lines: tentacles.map(() => []), pose, facing, flip: facing };
  }

  const points = Array.from({ length: tex.wave ? 48 : 28 }, () => new P.Point());
  const ropeA = new P.MeshRope({ texture: tex.A, points });
  const ropeB = new P.MeshRope({ texture: tex.B, points });
  const vA = new P.Container();
  vA.addChild(ropeA);
  const vB = new P.Container();
  vB.addChild(ropeB);
  group.addChild(glow, ...sparkles, vA, vB);
  let pec: PX.Sprite | null = null;
  if (tex.pec) {
    pec = new P.Sprite(tex.pec);
    pec.anchor.set(1 / (tex.pec.width || 1), 0.5); // the fin's base
    group.addChild(pec);
  }
  return {
    ...base,
    kind: "rope",
    tex,
    views: { A: vA, B: vB },
    ropes: { A: ropeA, B: ropeB },
    points,
    pec,
    m: 1,
    c: 0.3,
    lastTurn: 0,
    facing: heading,
    view: heading > 0 ? "A" : "B",
    prev: null,
    mix: 1,
  };
}

const rest = (): Pose => ({ rot: 0, sx: 1, sy: 1, dx: 0, dy: 0, alpha: 1 });

// After a fish is put somewhere new (reduced motion's resting pose): face the way it rests, no dissolve.
export function settle(rig: Rig) {
  const heading: 1 | -1 = Math.cos(rig.f.yaw) >= 0 ? 1 : -1;
  if (rig.kind === "rope") {
    rig.c = 0.3;
    rig.facing = heading;
    rig.view = heading > 0 ? "A" : "B";
    rig.prev = null;
    rig.mix = 1;
  } else {
    rig.facing = rig.tex.puppet.backwards ? (-heading as 1 | -1) : heading;
    rig.flip = rig.facing;
  }
}

export function drawRig(rig: Rig, dt: number, t: number, still: boolean) {
  if (rig.kind === "rope") drawRope(rig, dt);
  else drawPuppet(rig, dt, t, still);
  depth(rig);
}

function drawRope(rig: RopeRig, dt: number) {
  const { f, tex } = rig;
  const L = f.spec.length;
  const seg = L / (NODES - 1);
  const sp = f.spine;
  const head = project(sp[0]);
  const k = head.k;

  // A new turn: a sideways U-curl, bending away from the nearer edge (low in
  // the tank it curls upward, high up it curls downward).
  if (f.turnDir !== 0 && rig.lastTurn === 0) {
    const zSign = f.turnDir * (Math.sign(Math.cos(f.yaw)) || 1);
    const curlUp = f.p.y < (TANK.y0 + TANK.y1) / 2;
    rig.m = curlUp ? -zSign : zSign;
  }
  rig.lastTurn = f.turnDir;
  rig.c += ((f.turnDir !== 0 ? 1 : 0.3) - rig.c) * (1 - Math.exp(-4 * dt));

  // The on-screen spine, head first, every segment at full length (no squash).
  const halfTall = tex.A.height / 2;
  const maxBend = seg / (halfTall * 1.3);
  const nodes: XY[] = [{ x: head.x, y: head.y }];
  const dirs: XY[] = [];
  for (let i = 1; i < NODES; i++) {
    const a = sp[i - 1];
    const b = sp[i];
    const vx = a.x - b.x;
    const vy = -(a.y - b.y) + rig.m * rig.c * (a.z - b.z); // depth motion shows as an on-screen curl
    const l = Math.hypot(vx, vy) || 1;
    let d = { x: vx / l, y: vy / l };
    // Never bend tighter than the drawing is tall, or the rope's inner edge
    // folds over itself. The tail lags a little more instead.
    if (dirs.length) {
      const prev = dirs[dirs.length - 1];
      let turn = Math.atan2(prev.x * d.y - prev.y * d.x, prev.x * d.x + prev.y * d.y);
      turn = Math.max(-maxBend, Math.min(maxBend, turn));
      const pa = Math.atan2(prev.y, prev.x) + turn;
      d = { x: Math.cos(pa), y: Math.sin(pa) };
    }
    dirs.push(d);
    const p = nodes[i - 1];
    nodes.push({ x: p.x - d.x * seg * k, y: p.y - d.y * seg * k });
  }
  dirs.unshift(dirs[0]);

  // The swimming wave on top of the curl: a tail beat (bigger toward the
  // tail), or the oarfish's long ripple down its whole body.
  const w = tex.wave;
  for (let i = 1; i < NODES; i++) {
    const s = i / (NODES - 1);
    const off = w
      ? w.amp * L * k * (0.3 + 0.7 * s) * Math.sin(f.tail - s * 2 * Math.PI * w.waves)
      : f.tailAmp * L * 0.3 * k * s * s * Math.sin(f.tail - s * 2 * Math.PI * 0.95);
    nodes[i].x += -dirs[i].y * off;
    nodes[i].y += dirs[i].x * off;
  }

  // Which drawing keeps the fish upright for the way it faces.
  const hx = dirs[1].x;
  if (Math.abs(hx) > 0.25) rig.facing = hx > 0 ? 1 : -1;
  const want: View = rig.facing > 0 ? "A" : "B";
  if (want !== rig.view) {
    rig.prev = rig.view;
    rig.view = want;
    rig.mix = 0;
  }
  rig.mix = dt === 0 ? 1 : Math.min(1, rig.mix + dt / 0.16);

  // Rope: tail-fin tip → spine (tail to head, smoothed) → snout, spaced evenly.
  const tail = nodes[NODES - 1];
  const td = dirs[NODES - 1];
  const tailLen = (-L - tex.x0) * k;
  const snoutLen = tex.x1 * k;
  const spine: XY[] = [];
  for (let i = NODES - 1; i >= 0; i--) spine.push(nodes[i]);
  const line: XY[] = [{ x: tail.x - td.x * tailLen, y: tail.y - td.y * tailLen }, ...smooth(spine), { x: head.x + dirs[0].x * snoutLen, y: head.y + dirs[0].y * snoutLen }];
  resample(
    line.map((p) => ({ x: p.x / k, y: p.y / k })),
    rig.points,
  );
  rig.ropes.A.scale.set(k);
  rig.ropes.B.scale.set(k);

  // Dissolve: the incoming drawing fades in ON TOP of the outgoing one.
  for (const v of ["A", "B"] as View[]) {
    const c = rig.views[v];
    if (v === rig.view) {
      c.visible = true;
      c.alpha = rig.mix;
      c.zIndex = 2;
    } else if (v === rig.prev && rig.mix < 1) {
      c.visible = true;
      c.alpha = 1;
      c.zIndex = 1;
    } else c.visible = false;
  }

  // The near pectoral fin flaps at its base.
  if (rig.pec) {
    const flip = rig.view === "A" ? 1 : -1;
    const i = 3; // ≈ s 0.3
    const d = dirs[i];
    const H = L * 0.04 * k;
    rig.pec.position.set(nodes[i].x - d.y * H * flip, nodes[i].y + d.x * H * flip);
    rig.pec.rotation = Math.atan2(d.y, d.x) + Math.PI - flip * (0.35 + 0.25 * Math.sin(f.fin));
    rig.pec.scale.set(k);
    rig.pec.alpha = rig.mix;
    rig.pec.zIndex = 3;
  }

  rig.hit = line;
  rig.hitR = halfTall * 0.7 * k;
}

function drawPuppet(rig: PuppetRig, dt: number, t: number, still: boolean) {
  const { f, tex } = rig;
  const pp = tex.puppet;
  const sp = f.spine;
  const head = project(sp[0]);
  const back = project(sp[6]);
  const mid = project(sp[4]);
  const k = mid.k;
  const dx = head.x - back.x;
  const dy = head.y - back.y;
  if (Math.abs(dx) > Math.hypot(dx, dy) * 0.3) {
    const heading = dx > 0 ? 1 : -1;
    rig.facing = (pp.backwards ? -heading : heading) as 1 | -1;
  }
  // Changing direction: it swings round (seen edge-on for a moment if it's flat).
  rig.flip = dt === 0 ? rig.facing : rig.flip + (rig.facing - rig.flip) * (1 - Math.exp(-5 * dt));
  const shown = Math.sign(rig.flip || rig.facing) * Math.max(pp.minFlip, Math.abs(rig.flip));

  const holder = rig.holder;
  holder.position.set(mid.x, mid.y);
  // nose (or shell) dips toward where it's heading; Pixi turns after mirroring, so this is screen space
  holder.rotation = clamp(Math.atan2(dy, Math.abs(dx) || 1) * Math.sign(dx || 1), -pp.tilt, pp.tilt);
  holder.scale.set(shown * k * pp.unit, k * pp.unit);

  for (const p of Object.values(rig.pose)) Object.assign(p, rest());
  const state: PuppetState = {
    t,
    fin: f.fin,
    tail: f.tail,
    push: f.spec.pulse ? jetPush(f.t, f.spec.pulse) : 0,
    seed: rig.seed,
    still,
  };
  pp.animate(rig.pose, state);
  const all = rig.pose.all;
  rig.inner.position.set(all.dx, all.dy); // its pivot is the puppet's centre
  rig.inner.rotation = all.rot;
  for (const { part } of tex.parts) {
    const s = rig.sprites[part.name];
    const p = rig.pose[part.name];
    s.position.set(part.at.x + p.dx, part.at.y + p.dy);
    s.rotation = p.rot;
    s.scale.set(p.sx, p.sy);
    s.alpha = p.alpha;
    s.visible = p.alpha > 0.01;
  }
  if (pp.tentacles) {
    pp.tentacles.lines(state, rig.lines);
    rig.tentacles.forEach((tn, i) => resample(rig.lines[i], tn.pts));
  }

  rig.hit = [{ x: mid.x, y: mid.y + all.dy * k * pp.unit }];
  rig.hitR = (Math.max(tex.w * Math.abs(shown), tex.h) / 2) * k * 0.75;
}

// Depth (farther = bluer and behind) and the shadow on the sand.
function depth(rig: Rig) {
  const sp = rig.f.spine;
  const mz = sp[3].z;
  const haze = Math.min(1, Math.max(0, -mz / 34)) * 0.55;
  const tint = HAZE_TINT.map((c) => Math.round(255 + (c - 255) * haze));
  rig.group.tint = (tint[0] << 16) | (tint[1] << 8) | tint[2];
  rig.group.zIndex = mz;
  if (!rig.shadow) return;
  const L = rig.f.spec.length;
  const g = project({ x: sp[3].x, y: TANK.floor, z: sp[3].z });
  const height = Math.max(0, sp[3].y - TANK.floor);
  rig.shadow.position.set(g.x, g.y);
  rig.shadow.scale.set((L * 0.5 * g.k) / 10, (L * 0.11 * g.k) / 10);
  rig.shadow.alpha = 0.2 * (1 - Math.min(1, height / 260));
}

// Epic: a soft white glow. Legendary: a gold glow and twinkling sparkles.
// A tapped fish glows brighter while its card is open.
export function drawExtras(rig: Rig, t: number, isSelected: boolean) {
  const line = rig.hit;
  const n = line.length;
  if (!n) return;
  const a = line[Math.floor(n * 0.25)] ?? line[0];
  const b = line[Math.floor(n * 0.75)] ?? line[0];
  const c = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
  const len = n > 1 ? Math.hypot(line[n - 1].x - line[0].x, line[n - 1].y - line[0].y) : rig.hitR * 2;
  const g = rig.glow;
  const glowing = isSelected || rig.rarity === "epic" || rig.rarity === "legendary";
  g.visible = glowing;
  if (glowing) {
    g.position.set(c.x, c.y);
    g.rotation = n > 1 ? Math.atan2(b.y - a.y, b.x - a.x) : 0;
    g.scale.set((len * 0.62) / 10, (rig.hitR * 1.9) / 10);
    g.tint = rig.rarity === "legendary" ? 0xffd75e : 0xffffff;
    const base = rig.rarity === "legendary" ? 0.3 + 0.08 * Math.sin(t * 2) : rig.rarity === "epic" ? 0.2 : 0;
    g.alpha = isSelected ? 0.75 : base;
  }
  rig.sparkles.forEach((s, i) => {
    const p = line[Math.floor(((i + 0.5) / 3) * n)] ?? c;
    const off = (i - 1) * rig.hitR * 1.4;
    s.position.set(p.x + (n === 1 ? off : 0), p.y - rig.hitR * 1.2 + Math.abs(off) * 0.4);
    const tw = 0.5 + 0.5 * Math.sin(t * 2.4 + i * 2.1);
    s.alpha = 0.3 + 0.7 * tw;
    s.scale.set(0.6 + 0.4 * tw);
  });
}

export function destroyRig(rig: Rig) {
  rig.group.destroy({ children: true });
  rig.shadow?.destroy();
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

// A smooth curve through the spine points (Catmull-Rom, 3 steps per segment),
// so long bodies bend in curves, not corners.
function smooth(pts: XY[]): XY[] {
  const out: XY[] = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[Math.min(pts.length - 1, i + 2)];
    for (let j = 0; j < 3; j++) {
      const u = j / 3;
      const u2 = u * u;
      const u3 = u2 * u;
      out.push({
        x: 0.5 * (2 * p1.x + (-p0.x + p2.x) * u + (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * u2 + (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * u3),
        y: 0.5 * (2 * p1.y + (-p0.y + p2.y) * u + (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * u2 + (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * u3),
      });
    }
  }
  out.push(pts[pts.length - 1]);
  return out;
}
