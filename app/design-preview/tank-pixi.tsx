"use client";

import { useEffect, useRef } from "react";
import type * as PX from "pixi.js";
import type { Art } from "./fish-art";
import { shapeOf, smoothPath, type XY } from "./fish-2d";
import {
  ANEMONE_BASE,
  artOf,
  BLADES,
  bladeLine,
  createCast,
  makeParticles,
  restCast,
  restingFish,
  SAND_TOP,
  stepAll,
  stepParticles,
  TENTACLES,
  tentacle,
} from "./scenery";
import { emptyFrame, type Fish, frameOf, NODES, project, TANK } from "./swim";
import { causticTile, type LoopStats, useTankLoop } from "./tank-loop";

// Tank 4: PixiJS (WebGL), the way 2D games like Fishdom draw fish.
// - Every piece of art (fish, plants, sand, rocks) is drawn ONCE as SVG from
//   the same sources as Tank 1, turned into a high-res texture, then only
//   moved and bent on the GPU. No SVG repainting per frame.
// - A fish's side drawing is bent along its spine as a rope mesh. The rope
//   always keeps the body's full length, so a fish never squashes.
// - Every turn is a visible sideways U-curl. At the tip of the curl the side
//   drawing swaps to its mirror image (so the fish ends upright) in a short
//   dissolve that keeps the outgoing drawing fully opaque underneath, so a
//   fish never looks see-through.
// - Depth: farther fish are smaller, a little bluer, and drawn behind.

type Pixi = typeof PX;
type Api = { frame: (dt: number) => void; still: () => void; dispose: () => void };

const MAX_DPR = 1.5; // same cap as Tank 3: sharper costs battery

export function TankPixi({ id, still, maxFps, onStats }: { id: string; still: boolean; maxFps: number; onStats: (s: LoopStats) => void }) {
  const host = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const api = useRef<Api | null>(null);
  const stillRef = useRef(still);
  useEffect(() => {
    stillRef.current = still;
  }, [still]);

  useEffect(() => {
    let gone = false;
    let built: Api | null = null;
    import("pixi.js").then(async (P) => {
      if (gone || !canvas.current || !host.current) return;
      built = await build(P, canvas.current, host.current);
      if (gone) {
        built.dispose();
        return;
      }
      api.current = built;
      if (stillRef.current) built.still();
    });
    return () => {
      gone = true;
      built?.dispose();
      api.current = null;
    };
  }, []);

  useTankLoop(host, {
    id,
    still,
    maxFps,
    onStats,
    onFrame: (dt) => api.current?.frame(dt),
    onStill: () => api.current?.still(),
  });

  return (
    <div ref={host} className="absolute inset-0">
      <canvas ref={canvas} className="block h-full w-full" aria-hidden />
    </div>
  );
}

// ---------------- textures from SVG ----------------

async function svgTexture(P: Pixi, body: string, box: { x: number; y: number; w: number; h: number }, R: number) {
  const W = Math.ceil(box.w * R);
  const H = Math.ceil(box.h * R);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${box.x} ${box.y} ${box.w} ${box.h}" width="${W}" height="${H}">${body}</svg>`;
  const img = new Image();
  await new Promise<void>((done, fail) => {
    img.onload = () => done();
    img.onerror = () => fail(new Error("SVG texture failed to load"));
    img.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
  });
  const c = document.createElement("canvas");
  c.width = W;
  c.height = H;
  c.getContext("2d")!.drawImage(img, 0, 0, W, H);
  return new P.Texture({ source: new P.CanvasSource({ resource: c, resolution: R }) });
}

const WORLD = { x: -20, y: -12, w: 440, h: 324 };
const SAND_D = `M-20 ${SAND_TOP} C40 ${SAND_TOP - 8} 110 ${SAND_TOP + 6} 190 ${SAND_TOP - 2} S330 ${SAND_TOP - 6} 420 ${SAND_TOP + 2} V320 H-20Z`;

// The same static art as Tank 1, split into layers.
const FAR_SVG = `
<defs><linearGradient id="w" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#b9e3e3"/><stop offset=".35" stop-color="#6fb4c2"/><stop offset=".75" stop-color="#3c839a"/><stop offset="1" stop-color="#2d6c82"/></linearGradient></defs>
<rect x="-20" y="-12" width="440" height="324" fill="url(#w)"/>
<path d="M-20 222 C10 196 40 200 60 208 C80 186 120 190 140 204 C170 194 190 200 205 210 C230 188 270 192 290 206 C320 190 360 196 420 204 V240 H-20Z" fill="#6aa7b3" opacity=".55"/>
<path d="M236 214 C232 170 244 140 238 100 C250 140 252 176 246 214Z M252 214 C254 180 266 160 268 130 C272 166 262 192 260 214Z" fill="#5e9eaa" opacity=".5"/>
<path d="M20 214 C18 182 30 166 26 140 C36 168 36 192 30 214Z" fill="#5e9eaa" opacity=".45"/>`;

const SAND_SVG = `
<defs><linearGradient id="s" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#c9c09d"/><stop offset=".25" stop-color="#ddcfa6"/><stop offset="1" stop-color="#c7ad7c"/></linearGradient></defs>
<path d="${SAND_D}" fill="url(#s)"/>
<g fill="none" stroke-linecap="round">
<path d="M20 262 C70 254 120 262 170 256" stroke="#f2e6c4" stroke-width="1.4" opacity=".6"/>
<path d="M200 270 C250 262 300 270 360 262" stroke="#f2e6c4" stroke-width="1.4" opacity=".5"/>
<path d="M60 284 C120 276 190 286 250 280" stroke="#a88f62" stroke-width="1.2" opacity=".4"/></g>
<ellipse cx="160" cy="268" rx="4" ry="2.2" fill="#b39a72"/><ellipse cx="236" cy="252" rx="3" ry="1.6" fill="#9a876a"/><ellipse cx="280" cy="286" rx="5" ry="2.6" fill="#a99474"/>`;

const HAZE_SVG = `
<defs><linearGradient id="h" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#8fc6cc" stop-opacity="0"/><stop offset=".7" stop-color="#8fc6cc" stop-opacity=".55"/><stop offset="1" stop-color="#a7d2d0" stop-opacity=".85"/></linearGradient></defs>
<rect x="-20" y="-12" width="440" height="324" fill="url(#h)" opacity=".55"/>`;

const ROCKS_SVG = `
<defs><linearGradient id="r" x1="0" y1="0" x2=".3" y2="1"><stop offset="0" stop-color="#9aa9a6"/><stop offset=".55" stop-color="#6d7f80"/><stop offset="1" stop-color="#4a5a5f"/></linearGradient></defs>
<path d="M52 250 C50 232 66 220 86 222 C100 214 124 218 136 230 C146 238 148 248 144 254 Z" fill="url(#r)"/>
<path d="M66 230 C76 224 90 223 100 226" stroke="#b9c6c2" stroke-width="2" stroke-linecap="round" fill="none" opacity=".6"/>
<path d="M222 250 C222 238 236 230 252 232 C266 228 280 236 282 250 Z" fill="url(#r)"/>
<ellipse cx="${ANEMONE_BASE.x}" cy="${ANEMONE_BASE.y + 2}" rx="30" ry="6" fill="#7a3a57"/>`;

const RAYS: string[] = ["M70 -10h46l60 250h-80z", "M180 -10h30l52 230h-58z", "M262 -10h40l58 240h-70z", "M335 -10h24l40 210h-42z"];
const RAY_DEFS = `<defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fffbe8" stop-opacity=".55"/><stop offset=".6" stop-color="#fffbe8" stop-opacity=".12"/><stop offset="1" stop-color="#fffbe8" stop-opacity="0"/></linearGradient></defs>`;

const VIGNETTE_SVG = `<defs><radialGradient id="v" cx=".5" cy=".45" r=".75"><stop offset=".6" stop-color="#0b2a36" stop-opacity="0"/><stop offset="1" stop-color="#0b2a36" stop-opacity=".38"/></radialGradient></defs><rect x="-20" y="-12" width="440" height="324" fill="url(#v)"/>`;

function surfaceSvg() {
  let d = "M-30 -12 V8";
  for (let x = -30; x <= 430; x += 20) d += `L${x} ${(9 + Math.sin(x * 0.04) * 2.2 + Math.sin(x * 0.11) * 1.2).toFixed(1)}`;
  return `<path d="${d}V-12Z" fill="#e9f7f4" opacity=".45"/>`;
}

// A plant blade lying along x (base at 0, tip at h), tapered like Tank 1's.
function bladeSvg(b: (typeof BLADES)[number]) {
  const n = 12;
  const top: XY[] = [];
  const bot: XY[] = [];
  for (let j = 0; j <= n; j++) {
    const k = j / n;
    const w = b.w * Math.pow(1 - k, 0.55) * 0.5 + 0.2;
    top.push({ x: k * b.h, y: -w });
    bot.push({ x: k * b.h, y: w });
  }
  const d = smoothPath([...top, ...bot.reverse()]);
  return `<defs><linearGradient id="b" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="${b.color}"/><stop offset="1" stop-color="${b.tip}"/></linearGradient></defs><path d="${d}" fill="url(#b)" stroke="${b.tip}" stroke-width=".6" stroke-opacity=".7"/>`;
}

const TENTACLE_SVG = `<defs><linearGradient id="t" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#a8577a"/><stop offset="1" stop-color="#f2b6c8"/></linearGradient></defs>
<path d="M0 -2.1 L28 -2.1 A2.1 2.1 0 0 1 28 2.1 L0 2.1Z" fill="url(#t)"/><circle cx="28.4" cy="0" r="2.3" fill="#f8cfdb"/>`;

// ---------------- fish drawings ----------------

type FishTex = {
  sideA: PX.Texture; // facing right
  sideB: PX.Texture; // the same, upside down: on a left-going rope it reads upright
  pec: PX.Texture;
  x0: number; // texture left edge (tail-fin tip), in rest-pose world x
  x1: number; // right edge (snout)
};

const REST_HEAD_X = 200;
const REST_Y = 150;

async function fishTextures(P: Pixi, art: Art, id: string, R: number): Promise<FishTex> {
  const f = restingFish(id);
  const fr = emptyFrame();
  frameOf(f, fr);
  const sh = shapeOf(f, fr, art);
  const fin = (c: { color: string; edge?: string; opacity: number }) =>
    `fill="${c.color}" fill-opacity="${c.opacity}" stroke="${c.edge ?? "none"}" stroke-width=".9" stroke-linejoin="round"`;
  const far = sh.pecs.find((p) => !p.near) ?? sh.pecs[1];
  const body = smoothPath(sh.body);
  const eye = sh.eyes.find((e) => e.a > 0.5);
  const side = `
<defs><linearGradient id="g" gradientUnits="userSpaceOnUse" x1="${sh.shade.x1}" y1="${sh.shade.y1}" x2="${sh.shade.x2}" y2="${sh.shade.y2}">
<stop offset="0" stop-color="${art.back}"/><stop offset=".45" stop-color="${art.side}"/><stop offset="1" stop-color="${art.belly}"/></linearGradient>
<clipPath id="c"><path d="${body}"/></clipPath></defs>
<path d="${smoothPath(far.pts)}" ${fin({ ...art.pectoral, opacity: art.pectoral.opacity * 0.7 })}/>
<path d="${smoothPath(sh.caudal)}" ${fin(art.caudal)}/>
<path d="${smoothPath(sh.dorsal)}" ${fin(art.dorsal)}/>
<path d="${smoothPath(sh.anal)}" ${fin(art.anal)}/>
${art.pelvic && sh.pelvic ? `<path d="${smoothPath(sh.pelvic)}" ${fin({ ...art.pelvic, opacity: 0.95 })}/>` : ""}
<path d="${body}" fill="url(#g)" stroke="#1b1a1f" stroke-opacity=".35" stroke-width=".7"/>
<g clip-path="url(#c)">
${sh.markings.map((m) => `<path d="${smoothPath(m.pts)}" fill="${m.m.color}" stroke="${m.m.edge ?? "none"}" stroke-width="${m.m.edgeWidth ?? 0}" stroke-linejoin="round"/>`).join("")}
<path d="${smoothPath(sh.sheen, false)}" fill="none" stroke="#fff" stroke-opacity=".28" stroke-width="2.2" stroke-linecap="round"/></g>
${eye ? eyeSvg(eye.x, eye.y, eye.r, art.eye.iris) : ""}`;

  // A box that is symmetric about the spine, so the rope's centre line is the spine.
  const ys = [...sh.body, ...sh.dorsal, ...sh.anal, ...sh.caudal, ...far.pts].map((p) => p.y);
  const xs = [...sh.body, ...sh.caudal].map((p) => p.x);
  const half = Math.max(REST_Y - Math.min(...ys), Math.max(...ys) - REST_Y) + 1.5;
  const x0 = Math.min(...xs) - 1.5;
  const x1 = Math.max(...xs) + 1.5;
  const box = { x: x0, y: REST_Y - half, w: x1 - x0, h: half * 2 };
  const sideA = await svgTexture(P, side, box, R);
  const sideB = await svgTexture(P, `<g transform="translate(0 ${REST_Y * 2}) scale(1 -1)">${side}</g>`, box, R);

  const L = f.spec.length;
  const pl = art.pectoral.len * L;

  // The near pectoral fin, drawn pointing along +x from its base, so it can flap.
  const pw = art.pectoral.width * L;
  const pecSvg = `<path d="M0 ${-pw * 0.45} Q${pl * 0.6} ${-pw * 0.55} ${pl} 0 Q${pl * 0.55} ${pw * 0.45} 0 ${pw * 0.35}Z" ${fin(art.pectoral)}/>`;

  return {
    sideA,
    sideB,
    pec: await svgTexture(P, pecSvg, { x: -1, y: -pw * 0.6 - 1, w: pl + 2, h: pw * 1.2 + 2 }, R),
    x0,
    x1,
  };
}

function eyeSvg(x: number, y: number, r: number, iris: string) {
  return `<g transform="translate(${x.toFixed(2)} ${y.toFixed(2)}) scale(${r.toFixed(3)})"><circle r="1" fill="${iris}"/><circle r=".62" fill="#0b0b10"/><circle cx="-.3" cy="-.32" r=".22" fill="#fff" opacity=".9"/></g>`;
}

// ---------------- the scene ----------------

type View = "A" | "B"; // side drawing facing right / its mirror for facing left

type FishRig = {
  f: Fish;
  tex: FishTex;
  group: PX.Container;
  views: Record<View, PX.Container>;
  ropes: { A: PX.MeshRope; B: PX.MeshRope };
  points: PX.Point[];
  pec: PX.Sprite;
  shadow: PX.Sprite;
  // the curl and the current/previous drawing
  m: number; // which way a curl bends on screen (+1 down, −1 up)
  c: number; // how much depth motion shows as on-screen curl (0.3 → 1 in a turn)
  lastTurn: number;
  facing: 1 | -1;
  view: View;
  prev: View | null;
  mix: number;
};

const ROPE_POINTS = 28;

async function build(P: Pixi, canvas: HTMLCanvasElement, host: HTMLElement): Promise<Api> {
  const app = new P.Application();
  const rect = host.getBoundingClientRect();
  const dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR);
  await app.init({
    canvas,
    width: Math.max(1, rect.width),
    height: Math.max(1, rect.height),
    resolution: dpr,
    autoDensity: true,
    antialias: true,
    background: "#6fb4c2",
    autoStart: false,
    sharedTicker: false,
    preference: "webgl",
    powerPreference: "low-power",
  });
  app.ticker.stop();

  // Texture sharpness: enough pixels for this tank's size on screen.
  const fit = () => {
    const r = host.getBoundingClientRect();
    return Math.max(r.width / 400, r.height / 300);
  };
  // Resolutions are powers of two: Pixi resizes a texture's canvas to
  // width × resolution, and any rounding there would clear the canvas.
  // Full-tank layers match the screen's pixels (rounded DOWN: huge textures
  // shrunk every frame are slow on laptop GPUs); small drawings like fish and
  // plants get extra sharpness because they're cheap.
  const screenR = fit() * dpr;
  const R = pow2floor(Math.min(4, Math.max(1, screenR)));
  const RS = pow2floor(Math.min(8, Math.max(2, screenR * 1.5)));
  const soft = R / 4; // blurry layers can be low-res

  const world = new P.Container();
  app.stage.addChild(world);
  const textures: PX.Texture[] = [];
  const tex = async (body: string, box = WORLD, res = R) => {
    const t = await svgTexture(P, body, box, res);
    textures.push(t);
    return t;
  };
  const sprite = (t: PX.Texture, box = WORLD) => {
    const s = new P.Sprite(t);
    s.position.set(box.x, box.y);
    return s;
  };

  // far: water + distant reef (soft = low res, which also blurs it a little)
  const far = new P.Container();
  far.addChild(sprite(await tex(FAR_SVG, WORLD, soft)));
  world.addChild(far);

  const rays = await Promise.all(RAYS.map((d) => tex(`${RAY_DEFS}<path d="${d}" fill="url(#g)"/>`, WORLD, 0.5)));
  const rayLayer = new P.Container();
  const raySprites = rays.map((t) => {
    const s = sprite(t);
    s.blendMode = "add";
    rayLayer.addChild(s);
    return s;
  });
  world.addChild(rayLayer);
  const surface = sprite(await tex(surfaceSvg(), WORLD, Math.min(R, 2)));
  world.addChild(surface);

  // sand, caustics on it (masked to the sand), haze
  world.addChild(sprite(await tex(SAND_SVG)));
  const causticTex = P.Texture.from(causticTile(160, 3));
  textures.push(causticTex);
  const caustics = new P.Container();
  const mask = new P.Graphics().svg(`<svg><path d="${SAND_D}" fill="#fff"/></svg>`);
  caustics.addChild(mask);
  caustics.mask = mask;
  const cA = new P.TilingSprite({ texture: causticTex, width: 440, height: 120 });
  const cB = new P.TilingSprite({ texture: causticTex, width: 440, height: 120 });
  for (const c of [cA, cB]) {
    c.position.set(-20, SAND_TOP - 12);
    c.tileScale.set(1, 0.45);
    c.blendMode = "add";
    caustics.addChild(c);
  }
  cA.alpha = 0.2;
  cB.alpha = 0.14;
  cB.tileRotation = 0.54;
  world.addChild(caustics);
  world.addChild(sprite(await tex(HAZE_SVG, WORLD, soft)));

  // middle: rocks, anemone, back plants
  const mid = new P.Container();
  mid.addChild(sprite(await tex(ROCKS_SVG)));
  const tentTex = await tex(TENTACLE_SVG, { x: 0, y: -2.6, w: 31, h: 5.2 }, RS);
  const tentacles = TENTACLES.map(() => {
    const pts = Array.from({ length: 6 }, () => new P.Point());
    const rope = new P.MeshRope({ texture: tentTex, points: pts });
    mid.addChild(rope);
    return { rope, pts };
  });
  const bladeRopes = await Promise.all(
    BLADES.map(async (b) => {
      const half = b.w / 2 + 1;
      const t = await tex(bladeSvg(b), { x: 0, y: -half, w: b.h, h: half * 2 }, RS);
      const pts = Array.from({ length: 12 }, () => new P.Point());
      return { b, pts, rope: new P.MeshRope({ texture: t, points: pts }) };
    }),
  );
  for (const r of bladeRopes) if (r.b.layer === "back") mid.addChild(r.rope);
  world.addChild(mid);

  // shadows, fish, particles
  const shadowTex = await tex(
    `<defs><radialGradient id="s"><stop offset="0" stop-color="#1d3a3f"/><stop offset="1" stop-color="#1d3a3f" stop-opacity="0"/></radialGradient></defs><ellipse cx="0" cy="0" rx="10" ry="10" fill="url(#s)"/>`,
    { x: -10, y: -10, w: 20, h: 20 },
    2,
  );
  const shadowLayer = new P.Container();
  world.addChild(shadowLayer);
  const fishLayer = new P.Container();
  fishLayer.sortableChildren = true;
  world.addChild(fishLayer);

  const fish = createCast();
  for (let i = 0; i < 90; i++) stepAll(fish, 1 / 30);
  const rigs: FishRig[] = [];
  for (const f of fish) {
    const ft = await fishTextures(P, artOf(f.id), f.id, RS);
    textures.push(ft.sideA, ft.sideB, ft.pec);
    const group = new P.Container();
    group.sortableChildren = true;
    const points = Array.from({ length: ROPE_POINTS }, () => new P.Point());
    const ropeA = new P.MeshRope({ texture: ft.sideA, points });
    const ropeB = new P.MeshRope({ texture: ft.sideB, points });
    const pec = new P.Sprite(ft.pec);
    pec.anchor.set(1 / (ft.pec.width || 1), 0.5); // the fin's base
    const vA = new P.Container();
    vA.addChild(ropeA);
    const vB = new P.Container();
    vB.addChild(ropeB);
    group.addChild(vA, vB, pec);
    fishLayer.addChild(group);
    const shadow = new P.Sprite(shadowTex);
    shadow.anchor.set(0.5);
    shadowLayer.addChild(shadow);
    rigs.push({
      f,
      tex: ft,
      group,
      views: { A: vA, B: vB },
      ropes: { A: ropeA, B: ropeB },
      points,
      pec,
      shadow,
      m: 1,
      c: 0.3,
      lastTurn: 0,
      facing: Math.cos(f.yaw) >= 0 ? 1 : -1,
      view: Math.cos(f.yaw) >= 0 ? "A" : "B",
      prev: null,
      mix: 1,
    });
  }

  const parts = makeParticles(26, 7);
  const dotTex = await tex(
    `<defs><radialGradient id="d"><stop offset=".4" stop-color="#f4fbfa"/><stop offset="1" stop-color="#f4fbfa" stop-opacity="0"/></radialGradient></defs><circle r="2" fill="url(#d)"/>`,
    { x: -2, y: -2, w: 4, h: 4 },
    4,
  );
  const dots = parts.map((p) => {
    const s = new P.Sprite(dotTex);
    s.anchor.set(0.5);
    s.scale.set(p.r / 1.3);
    s.alpha = 0.6;
    world.addChild(s);
    return s;
  });

  const front = new P.Container();
  for (const r of bladeRopes) if (r.b.layer === "front") front.addChild(r.rope);
  world.addChild(front);
  world.addChild(sprite(await tex(VIGNETTE_SVG, WORLD, soft)));

  // ---------------- per frame ----------------
  let t = 0;

  const layout = () => {
    const r = host.getBoundingClientRect();
    const w = Math.max(1, r.width);
    const h = Math.max(1, r.height);
    app.renderer.resize(w, h);
    const s = Math.max(w / 400, h / 300); // cover, like SVG "slice"
    world.scale.set(s);
    world.position.set((w - 400 * s) / 2, (h - 300 * s) / 2);
  };

  const ropeAlong = (b: { pts: PX.Point[] }, line: XY[]) => resample(line, b.pts);

  const scenery = (pan: number) => {
    far.x = pan * 0.35;
    mid.x = pan * 0.8;
    front.x = pan * 1.5;
    raySprites.forEach((s, i) => {
      s.alpha = (0.45 + 0.35 * Math.sin(t * 0.25 + i * 1.7)) * 0.75;
      s.x = WORLD.x + Math.sin(t * 0.11 + i) * 8;
    });
    surface.x = WORLD.x + Math.sin(t * 0.5) * 6;
    cA.tilePosition.set((t * 7) % 160, (t * 3) % 160);
    cB.tilePosition.set(-(t * 5) % 160, (t * 4.5) % 160);
    TENTACLES.forEach((tn, i) => {
      const { base, ctrl, tip } = tentacle(tn, t);
      const line: XY[] = [];
      for (let j = 0; j <= 8; j++) {
        const k = j / 8;
        const a = (1 - k) * (1 - k);
        const b = 2 * k * (1 - k);
        const c = k * k;
        line.push({ x: a * base.x + b * ctrl.x + c * tip.x, y: a * base.y + b * ctrl.y + c * tip.y });
      }
      resample(line, tentacles[i].pts);
    });
    for (const r of bladeRopes) ropeAlong(r, bladeLine(r.b, t, 10));
    parts.forEach((p, i) => {
      dots[i].x = p.x + pan * (0.3 + p.d);
      dots[i].y = p.y;
    });
  };

  const frameFish = (dt: number, pan: number) => {
    for (const rig of rigs) drawFish(rig, dt, pan);
  };

  const render = (dt: number) => {
    const pan = Math.sin(t * 0.07) * 5;
    scenery(pan);
    frameFish(dt, pan);
    app.renderer.render(app.stage);
  };

  const ro = new ResizeObserver(() => {
    layout();
    app.renderer.render(app.stage);
  });
  ro.observe(host);
  layout();
  render(0);

  return {
    frame: (dt) => {
      t += dt;
      stepAll(fish, dt);
      stepParticles(parts, dt, t);
      render(dt);
    },
    still: () => {
      restCast(fish);
      t = 0;
      for (const rig of rigs) {
        rig.c = 0.3;
        rig.facing = Math.cos(rig.f.yaw) >= 0 ? 1 : -1;
        rig.view = rig.facing > 0 ? "A" : "B";
        rig.prev = null;
        rig.mix = 1;
      }
      render(0);
    },
    dispose: () => {
      ro.disconnect();
      app.destroy({ removeView: false }, { children: true });
      textures.forEach((tx) => tx.destroy(true));
    },
  };
}

// Points spaced evenly along a polyline. Pixi's rope spreads the texture by
// point INDEX, so even spacing is what keeps the art undistorted.
function resample(line: XY[], out: { x: number; y: number }[]) {
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

const HAZE_TINT = [0xb6, 0xd3, 0xde];

function drawFish(rig: FishRig, dt: number, pan: number) {
  const { f, tex } = rig;
  const L = f.spec.length;
  const seg = L / (NODES - 1);
  const sp = f.spine;
  const head = project(sp[0], pan);
  const k = head.k;

  // A new turn: a sideways U-curl, bending away from the nearer edge (low in
  // the tank it curls upward, high up it curls downward).
  if (f.turnDir !== 0 && rig.lastTurn === 0) {
    const zSign = f.turnDir * (Math.sign(Math.cos(f.yaw)) || 1);
    const curlUp = f.p.y < (TANK.y0 + TANK.y1) / 2; // low in the tank: curl upward
    rig.m = curlUp ? -zSign : zSign;
  }
  rig.lastTurn = f.turnDir;
  const turning = f.turnDir !== 0;
  rig.c += ((turning ? 1 : 0.3) - rig.c) * (1 - Math.exp(-4 * dt));

  // The on-screen spine, head first, every segment at full length (no squash).
  const halfTall = tex.sideA.height / 2; // world units, before depth scaling
  const maxBend = seg / (halfTall * 1.3);
  const nodes: XY[] = [{ x: head.x, y: head.y }];
  const dirs: XY[] = [];
  for (let i = 1; i < NODES; i++) {
    const a = sp[i - 1];
    const b = sp[i];
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    const dz = a.z - b.z;
    // depth motion shows as an on-screen curl
    const vx = dx;
    const vy = -dy + rig.m * rig.c * dz;
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

  // A gentle in-plane tail beat (bigger toward the tail), on top of the curl.
  for (let i = 1; i < NODES; i++) {
    const s = i / (NODES - 1);
    const off = f.tailAmp * L * 0.3 * k * s * s * Math.sin(f.tail - s * 2 * Math.PI * 0.95);
    nodes[i].x += -dirs[i].y * off;
    nodes[i].y += dirs[i].x * off;
  }

  // Which side drawing: the one that keeps the fish upright for the way it faces.
  const hx = dirs[1].x;
  if (Math.abs(hx) > 0.25) rig.facing = hx > 0 ? 1 : -1;
  const want: View = rig.facing > 0 ? "A" : "B";
  if (want !== rig.view) {
    rig.prev = rig.view;
    rig.view = want;
    rig.mix = 0;
  }
  rig.mix = Math.min(1, rig.mix + dt / 0.16);
  if (dt === 0) rig.mix = 1;

  // Rope: tail-fin tip → spine (tail to head) → snout, spaced evenly.
  const tail = nodes[NODES - 1];
  const td = dirs[NODES - 1];
  const tailLen = (REST_HEAD_X - seg * (NODES - 1) - tex.x0) * k;
  const snoutLen = (tex.x1 - REST_HEAD_X) * k;
  const line: XY[] = [{ x: tail.x - td.x * tailLen, y: tail.y - td.y * tailLen }];
  for (let i = NODES - 1; i >= 0; i--) line.push(nodes[i]);
  line.push({ x: head.x + dirs[0].x * snoutLen, y: head.y + dirs[0].y * snoutLen });
  resample(
    line.map((p) => ({ x: p.x / k, y: p.y / k })),
    rig.points,
  );
  rig.ropes.A.scale.set(k);
  rig.ropes.B.scale.set(k);

  // Dissolve: the incoming drawing fades in ON TOP of the outgoing one, which
  // stays fully opaque until it's covered. Never see-through.
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
  {
    const flip = rig.view === "A" ? 1 : -1;
    const i = 3; // ≈ s 0.3
    const d = dirs[i];
    const H = L * 0.04 * k;
    rig.pec.position.set(nodes[i].x - d.y * H * flip, nodes[i].y + d.x * H * flip);
    const ang = Math.atan2(d.y, d.x) + Math.PI - flip * (0.35 + 0.25 * Math.sin(f.fin));
    rig.pec.rotation = ang;
    rig.pec.scale.set(k);
    rig.pec.alpha = rig.mix;
    rig.pec.zIndex = 3;
  }

  // Depth: farther = smaller (k), bluer, behind.
  const mz = sp[3].z;
  const haze = Math.min(1, Math.max(0, -mz / 34)) * 0.55;
  const tint = HAZE_TINT.map((c) => Math.round(255 + (c - 255) * haze));
  rig.group.tint = (tint[0] << 16) | (tint[1] << 8) | tint[2];
  rig.group.zIndex = mz;

  const g = project({ x: sp[3].x, y: TANK.floor, z: sp[3].z }, pan);
  const height = Math.max(0, sp[3].y - TANK.floor);
  rig.shadow.position.set(g.x, g.y);
  rig.shadow.scale.set((L * 0.5 * g.k) / 10, (L * 0.11 * g.k) / 10);
  rig.shadow.alpha = 0.2 * (1 - Math.min(1, height / 260));
}

const pow2floor = (v: number) => 2 ** Math.floor(Math.log2(v));
