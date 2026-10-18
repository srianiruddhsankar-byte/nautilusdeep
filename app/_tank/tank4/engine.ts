// Tank 4's renderer: PixiJS (WebGL), the way 2D aquarium games draw fish.
// Plain TypeScript (no React); tank-canvas.tsx owns its lifecycle.
//
// - Every drawing is made ONCE into a texture (textures.ts), then only moved
//   and bent on the GPU. How each animal moves: rigs.ts and puppets.ts.
// - Everything that never moves is ONE texture (backgroundSvg), so a frame
//   fills the screen about twice instead of ~10 times (Stage A's prototype).
//   Rays, the surface and the caustics are small cropped strips on top.
// - A full tank spreads out: each fish mostly patrols its own stretch.
// - The running screen's egg → eyed egg → fry sits on the sand; the fry
//   swims out of its shell and stays close by.
// - Taps: hitTest() checks the fish's current on-screen body, with at least a
//   44 px wide target.

import type * as PX from "pixi.js";
import type { BroodStage } from "@/lib/brood";
import type { SkinId } from "@/lib/economy";
import { hashString } from "@/lib/fish-look";
import type { Rarity, SpeciesId } from "@/lib/species";
import { createFish, type Fish, rest, rng, stepAll, type SwimSpec, TANK } from "@/lib/swim";
import { EGG_BOX } from "./brood-art";
import { type Common, destroyRig, drawExtras, drawRig, makeRig, type Rig, type RopeRig, settle } from "./rigs";
import {
  ANEMONE_AT,
  backgroundSvg,
  BLADES,
  bladeLine,
  bladeSvg,
  CAUSTIC_TOP,
  causticTile,
  LIP,
  lipSvg,
  LOOKS,
  makeParticles,
  RAYS,
  raySvg,
  resample,
  stepParticles,
  SURFACE_BOX,
  surfaceSvg,
  TENTACLE_SVG,
  TENTACLES,
  tentacleLine,
  WORLD,
  type XY,
} from "./scenery";
import { type Box, smoothPath } from "./side-view";
import { createBank, dprFor, type FishTex, NoWebGL, seedOf } from "./textures";

type Pixi = typeof PX;

// What lives in the tank. `key` is what a tap reports ("fish:<id>", "nautilus").
export type TankFish = { key: string; id: string; species: SpeciesId | "nautilus"; rarity: Rarity | null };

export type Engine = {
  frame: (dt: number) => void;
  still: () => void;
  setFish: (list: TankFish[]) => Promise<void>;
  setBrood: (stage: BroodStage | null) => Promise<void>;
  setLook: (skin: SkinId) => Promise<void>;
  setSelected: (key: string | null) => void;
  hitTest: (clientX: number, clientY: number) => string | null;
  dispose: () => void;
};

const TAP_RADIUS_PX = 22; // a 44 px wide target, at least
const GOLDEN = 0.618034;

// The egg's rock on the sand (front left), and where the fry stays.
const EGG_AT = { x: 62, y: 272 };
const EGG_WIDTH = 52;
const FRY_HOME = { x: 74, y: TANK.y0 + 4, z: 22 };

export async function createEngine(
  P: Pixi,
  canvas: HTMLCanvasElement,
  host: HTMLElement,
  options: { skin: SkinId; onContextLost: () => void; onContextRestored: () => void },
): Promise<Engine> {
  if (!P.isWebGLSupported()) throw new NoWebGL("WebGL isn't available");

  const app = new P.Application();
  const size = () => {
    const r = host.getBoundingClientRect();
    return { w: Math.max(1, r.width), h: Math.max(1, r.height) };
  };
  const first = size();
  let dpr = dprFor(first.w, first.h);
  await app.init({
    canvas,
    width: first.w,
    height: first.h,
    resolution: dpr,
    autoDensity: true,
    antialias: false, // every drawing has soft transparent edges already; MSAA would only cost
    background: LOOKS[options.skin].water[1],
    autoStart: false,
    sharedTicker: false,
    preference: "webgl",
    powerPreference: "low-power",
  });
  app.ticker.stop();

  // ---------- context loss ----------
  // Pixi keeps every texture's source canvas and re-uploads after a restore;
  // while the context is gone we just don't draw. tank-canvas.tsx rebuilds the
  // whole tank if it doesn't come back.
  let lost = false;
  let gone = false; // disposed
  const onLost = () => {
    lost = true;
    options.onContextLost();
  };
  const onRestored = () => {
    lost = false;
    options.onContextRestored();
    render();
  };
  canvas.addEventListener("webglcontextlost", onLost);
  canvas.addEventListener("webglcontextrestored", onRestored);

  // How many texture pixels per world unit: enough for this tank on screen.
  const pxPerUnit = () => {
    const { w, h } = size();
    return Math.max(w / 400, h / 300) * dpr;
  };
  let R = clamp(pxPerUnit(), 1, 4); // big layers
  const bank = createBank(P, clamp(pxPerUnit() * 1.5, 2, 6)); // small drawings (cheap, so extra sharp)
  const big = (body: string, box: Box, res = R) => bank.svg(body, box, res);

  // ---------- the scene ----------
  const world = new P.Container();
  app.stage.addChild(world);
  const at = (s: PX.Sprite, box: Box) => (s.position.set(box.x, box.y), s);

  let look = LOOKS[options.skin];
  const bg = at(new P.Sprite(await big(backgroundSvg(look), WORLD)), WORLD);
  world.addChild(bg);

  const causticTex = bank.keep(P.Texture.from(causticTile(160, 3)));
  const strips = [0.2, 0.14].map((alpha, i) => {
    const s = new P.TilingSprite({ texture: causticTex, width: WORLD.w, height: 300 - CAUSTIC_TOP + 12 });
    s.position.set(WORLD.x, CAUSTIC_TOP);
    s.tileScale.set(i ? 0.8 : 1, i ? 0.36 : 0.45);
    s.blendMode = "add";
    s.alpha = alpha;
    world.addChild(s);
    return { s, alpha };
  });
  const lip = at(new P.Sprite(await big(lipSvg(look), LIP)), LIP);
  world.addChild(lip);

  const rays = await Promise.all(
    RAYS.map(async (r) => {
      const s = at(new P.Sprite(await big(raySvg(r.d), r.box, 0.5)), r.box);
      s.blendMode = "add";
      world.addChild(s);
      return { s, x: r.box.x };
    }),
  );
  const surface = at(new P.Sprite(await big(surfaceSvg(look.surface), SURFACE_BOX, Math.min(R, 2))), SURFACE_BOX);
  world.addChild(surface);

  // anemone + back seagrass
  const mid = new P.Container();
  world.addChild(mid);
  const tentTex = await bank.svg(TENTACLE_SVG, { x: 0, y: -2.6, w: 31, h: 5.2 });
  const tentacles = TENTACLES.map(() => {
    const pts = Array.from({ length: 6 }, () => new P.Point());
    mid.addChild(new P.MeshRope({ texture: tentTex, points: pts }));
    return pts;
  });
  const blades = await Promise.all(
    BLADES.map(async (b) => {
      const half = b.w / 2 + 1;
      const t = await bank.svg(bladeSvg(b, smoothPath), { x: 0, y: -half, w: b.h, h: half * 2 });
      const pts = Array.from({ length: 12 }, () => new P.Point());
      return { b, pts, rope: new P.MeshRope({ texture: t, points: pts }) };
    }),
  );
  for (const r of blades) if (r.b.layer === "back") mid.addChild(r.rope);

  // the session's egg, on the sand
  const broodLayer = new P.Container();
  world.addChild(broodLayer);
  const shadowLayer = new P.Container();
  world.addChild(shadowLayer);
  const fishLayer = new P.Container();
  fishLayer.sortableChildren = true;
  world.addChild(fishLayer);

  const common: Common = { shadow: await bank.dot("#1d3a3f"), glow: await bank.dot("#ffffff"), sparkle: await bank.sparkle() };

  const parts = makeParticles(26, 7);
  const dotTex = await bank.svg(
    `<defs><radialGradient id="d"><stop offset=".4" stop-color="#fff"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient></defs><circle r="2" fill="url(#d)"/>`,
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
  for (const r of blades) if (r.b.layer === "front") front.addChild(r.rope);
  world.addChild(front);

  const applyLook = () => {
    for (const { s, alpha } of strips) s.alpha = alpha * look.caustics;
    for (const r of blades) r.rope.tint = look.plantTint;
    for (const d of dots) d.tint = look.speck;
    for (const r of rays) r.s.visible = look.rays > 0;
    app.renderer.background.color = look.water[1];
  };
  applyLook();

  // ---------- fish ----------
  let rigs: Rig[] = [];
  let fishToken = 0;
  let selected: string | null = null;
  let resting = false;
  let t = 0;

  async function setFish(list: TankFish[]) {
    const token = ++fishToken;
    const texs = await Promise.all(list.map((f) => bank.fish(f.species)));
    if (token !== fishToken || gone) return;
    rigs.forEach(destroyRig);
    const sims = list.map((item, i) => simFor(item, texs[i], i, list.length));
    // schooling species follow the one before them of their kind
    list.forEach((item, i) => {
      if (!texs[i].swim.schools) return;
      for (let j = i - 1; j >= 0; j--) {
        if (list[j].species === item.species) {
          sims[i].leader = sims[j];
          break;
        }
      }
    });
    for (let i = 0; i < 60; i++) stepAll(sims, 1 / 30); // a moment of swimming, so they don't start in a line
    rigs = list.map((item, i) =>
      makeRig(P, common, { fish: fishLayer, shadow: shadowLayer }, { key: item.key, rarity: item.rarity, seed: seedOf(item.id) }, texs[i], sims[i]),
    );
    if (resting) restAll();
    render();
  }

  function simFor(item: TankFish, tex: FishTex, i: number, n: number): Fish {
    const seed = hashString(item.id);
    const r = rng(seed);
    const swim = tex.swim;
    // Its own stretch of the tank: spread evenly (golden-ratio steps), so a
    // full tank doesn't all cross through the middle.
    const zone = TANK.x0 + 40 + ((0.5 + i * GOLDEN) % 1) * (TANK.x1 - TANK.x0 - 80);
    const spec: SwimSpec = {
      length: tex.L,
      cruise: swim.cruise,
      burst: swim.burst,
      turn: swim.turn,
      minRadius: swim.minRadius,
      hover: swim.hover,
      tailHz: swim.tailHz,
      girth: tex.girth,
      pulse: swim.pulse,
      ...(n > 3 && { roam: { x: zone, range: 85 } }),
      ...(swim.home === "anemone" && { home: ANEMONE_AT, homeRange: 70 }),
      ...(swim.home === "low" && { home: { x: zone, y: TANK.y0 + 6, z: 0 }, homeRange: 120 }),
    };
    const start = {
      x: n > 3 ? clamp(zone + (r() - 0.5) * 120, TANK.x0, TANK.x1) : TANK.x0 + r() * (TANK.x1 - TANK.x0),
      y: TANK.y0 + r() * (TANK.y1 - TANK.y0),
      z: (r() - 0.5) * (TANK.z1 - TANK.z0) * 0.8,
    };
    return createFish(item.key, spec, seed, start, r() < 0.5 ? 0 : Math.PI);
  }

  // Reduced motion: every fish rests, side-on, spread over the tank.
  function restAll() {
    const n = rigs.length;
    const cols = Math.max(1, Math.ceil(n / 3));
    const rows = [222, 176, 130]; // y up
    rigs.forEach((rig, i) => {
      const col = Math.floor(i / 3);
      const span = (TANK.x1 - TANK.x0) / cols;
      const left = (i + col) % 2 === 1;
      const cx = TANK.x0 + span * (col + 0.5) + ((i % 3) - 1) * span * 0.18;
      const L = rig.f.spec.length;
      rest(rig.f, { x: cx + (left ? -L / 2 : L / 2), y: rows[i % 3], z: ((i % 4) - 1.5) * 9 }, left);
      settle(rig);
    });
    if (brood.fry) {
      rest(brood.fry.f, { x: FRY_HOME.x + 8, y: FRY_HOME.y + 8, z: FRY_HOME.z }, false);
      settle(brood.fry);
    }
  }

  // ---------- the brood (running screen) ----------
  const eggScale = EGG_WIDTH / EGG_BOX.w;
  const eggGlow = new P.Sprite(common.glow);
  eggGlow.anchor.set(0.5);
  eggGlow.position.set(EGG_AT.x, EGG_AT.y - 14 * eggScale);
  eggGlow.scale.set(2.6, 2.4);
  const egg = new P.Sprite();
  egg.anchor.set(0.5, 35 / EGG_BOX.h); // the rock's base
  egg.position.set(EGG_AT.x, EGG_AT.y);
  egg.scale.set(eggScale);
  broodLayer.addChild(eggGlow, egg);
  broodLayer.visible = false;
  const brood: { stage: BroodStage | null; wobble: number; fry: RopeRig | null; spawn: number; token: number } = {
    stage: null,
    wobble: 0,
    fry: null,
    spawn: 1,
    token: 0,
  };

  async function setBrood(stage: BroodStage | null) {
    if (stage === brood.stage) return;
    const token = ++brood.token;
    const before = brood.stage;
    if (!stage) {
      brood.stage = null;
      broodLayer.visible = false;
      if (brood.fry) destroyRig(brood.fry);
      brood.fry = null;
      render();
      return;
    }
    const tex = await bank.egg(stage === "fry" ? "hatched" : stage);
    const fryTex = stage === "fry" ? await bank.fry() : null;
    if (token !== brood.token || gone) return;
    brood.stage = stage;
    egg.texture = tex;
    broodLayer.visible = true;
    if (before && before !== stage) brood.wobble = 1; // a little wobble as it changes
    if (fryTex && !brood.fry) {
      const spec: SwimSpec = { ...fryTex.swim, length: fryTex.L, girth: fryTex.girth, home: FRY_HOME, homeRange: 34 };
      const f = createFish("fry", spec, 7, { x: EGG_AT.x + 4, y: TANK.y0 - 6, z: FRY_HOME.z }, 0);
      brood.fry = makeRig(P, common, { fish: fishLayer, shadow: null }, { key: "fry", rarity: null, seed: 0.3 }, fryTex, f) as RopeRig;
      brood.spawn = before ? 0 : 1; // swims out of the shell (straight in after a refresh)
      if (resting) restAll();
    }
    render();
  }

  // ---------- per frame ----------
  const scenery = () => {
    rays.forEach((r, i) => {
      r.s.alpha = (0.45 + 0.35 * Math.sin(t * 0.25 + i * 1.7)) * 0.75 * look.rays;
      r.s.x = r.x + Math.sin(t * 0.11 + i) * 8;
    });
    surface.x = SURFACE_BOX.x + Math.sin(t * 0.5) * 6;
    strips[0].s.tilePosition.set((t * 7) % 160, (t * 3) % 160);
    strips[1].s.tilePosition.set(-(t * 5) % 128, (t * 1.5) % 160);
    TENTACLES.forEach((tn, i) => resample(tentacleLine(tn, t), tentacles[i]));
    for (const r of blades) resample(bladeLine(r.b, t, 10), r.pts);
    parts.forEach((p, i) => {
      dots[i].x = p.x;
      dots[i].y = p.y;
    });
    if (brood.stage) {
      egg.rotation = 0.08 * brood.wobble * Math.sin(t * 9);
      eggGlow.alpha = 0.4 + (resting ? 0 : 0.1 * Math.sin(t * 1.5));
    }
  };

  function render(dt = 0) {
    if (lost || gone) return;
    scenery();
    for (const rig of rigs) {
      drawRig(rig, dt, t, resting);
      drawExtras(rig, t, rig.key === selected);
    }
    if (brood.fry) {
      drawRig(brood.fry, dt, t, resting);
      brood.fry.group.alpha = 0.9 * Math.min(1, brood.spawn);
    }
    app.renderer.render(app.stage);
  }

  // ---------- layout ----------
  let lastW = 0;
  let lastH = 0;
  const layout = async () => {
    const { w, h } = size();
    if (w === lastW && h === lastH) return;
    lastW = w;
    lastH = h;
    dpr = dprFor(w, h);
    app.renderer.resize(w, h, dpr);
    const s = Math.max(w / 400, h / 300); // cover, like SVG "slice"
    world.scale.set(s);
    world.position.set((w - 400 * s) / 2, (h - 300 * s) / 2);
    // Much bigger than when the background was drawn (a phone turned to
    // landscape): redraw it sharper.
    const want = clamp(pxPerUnit(), 1, 4);
    if (want > R * 1.4) {
      R = want;
      await redrawBackground();
    }
  };

  async function redrawBackground() {
    const [b, l] = await Promise.all([big(backgroundSvg(look), WORLD), big(lipSvg(look), LIP)]);
    if (gone) return;
    const old = [bg.texture, lip.texture];
    bg.texture = b;
    lip.texture = l;
    old.forEach(bank.drop);
    render();
  }

  const ro = new ResizeObserver(() => {
    void layout().then(() => render());
  });
  ro.observe(host);
  await layout();
  await setFish([]);

  return {
    frame: (dt) => {
      if (lost) return;
      resting = false;
      t += dt;
      for (const rig of rigs) if (rig.key === selected) rig.f.hoverT = Math.max(rig.f.hoverT, 0.4); // a tapped fish waits
      const all = rigs.map((r) => r.f);
      if (brood.fry) all.push(brood.fry.f);
      stepAll(all, dt);
      stepParticles(parts, dt, t);
      brood.wobble *= Math.exp(-1.5 * dt);
      brood.spawn = Math.min(1, brood.spawn + dt / 0.8);
      render(dt);
    },
    still: () => {
      resting = true;
      t = 0;
      brood.wobble = 0;
      brood.spawn = 1;
      restAll();
      render();
    },
    setFish,
    setBrood,
    setLook: async (skin) => {
      look = LOOKS[skin];
      const s = await big(surfaceSvg(look.surface), SURFACE_BOX, Math.min(R, 2));
      if (gone) return;
      bank.drop(surface.texture);
      surface.texture = s;
      applyLook();
      await redrawBackground();
    },
    setSelected: (key) => {
      selected = key;
      render();
    },
    hitTest: (clientX, clientY) => {
      const r = host.getBoundingClientRect();
      const s = world.scale.x || 1;
      const p = { x: (clientX - r.left - world.x) / s, y: (clientY - r.top - world.y) / s };
      const min = TAP_RADIUS_PX / s;
      // front-most first; the first one within reach wins
      const order = [...rigs].sort((a, b) => b.group.zIndex - a.group.zIndex);
      let best: { key: string; d: number } | null = null;
      for (const rig of order) {
        const d = distToLine(p, rig.hit) - Math.max(min, rig.hitR);
        if (d <= 0 && (!best || d < best.d - min)) best = { key: rig.key, d };
      }
      return best?.key ?? null;
    },
    dispose: () => {
      gone = true;
      ro.disconnect();
      canvas.removeEventListener("webglcontextlost", onLost);
      canvas.removeEventListener("webglcontextrestored", onRestored);
      app.destroy({ removeView: false }, { children: true });
      bank.destroy();
    },
  };
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

function distToLine(p: XY, line: XY[]) {
  if (!line.length) return Infinity;
  if (line.length === 1) return Math.hypot(p.x - line[0].x, p.y - line[0].y);
  let best = Infinity;
  for (let i = 1; i < line.length; i++) {
    const a = line[i - 1];
    const b = line[i];
    const vx = b.x - a.x;
    const vy = b.y - a.y;
    const l2 = vx * vx + vy * vy || 1;
    const u = clamp(((p.x - a.x) * vx + (p.y - a.y) * vy) / l2, 0, 1);
    best = Math.min(best, Math.hypot(p.x - a.x - vx * u, p.y - a.y - vy * u));
  }
  return best;
}
