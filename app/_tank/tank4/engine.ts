// Tank 4's renderer: PixiJS (WebGL), the way 2D aquarium games draw fish.
// Plain TypeScript (no React); tank-canvas.tsx owns its lifecycle.
//
// - Every drawing (fish, seagrass, scenery) is made ONCE as SVG (or a painted
//   PNG), turned into a texture, then only moved and bent on the GPU.
// - Everything that never moves is ONE texture (backgroundSvg), so a frame
//   fills the screen about twice instead of ~10 times (Stage A's prototype).
//   Rays, the surface and the caustics are small cropped strips on top.
// - A fish's side drawing bends along its swimming spine as a rope mesh, always
//   at full length (never squashed). Every turn is a sideways U-curl; at the
//   tip of the curl the drawing swaps to its mirror image in a short dissolve
//   that keeps the outgoing drawing opaque underneath (never see-through).
// - Depth: farther fish are smaller, a little bluer, and drawn behind.
// - Taps: hitTest() checks the fish's current on-screen body, with at least a
//   44 px wide target.

import type * as PX from "pixi.js";
import type { SkinId } from "@/lib/economy";
import { hashString } from "@/lib/fish-look";
import { NAUTILUS, speciesById, type Rarity, type SpeciesId } from "@/lib/species";
import { createFish, type Fish, NODES, project, rest, rng, stepAll, type SwimSpec, TANK } from "@/lib/swim";
import { hasPainting, PAINTED_BODY, paintingUrl } from "./art-files";
import { girthOf, lengthOf, NAUTILUS_SWIM, speciesArt, type Temperament } from "./fish-art";
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
import { type Box, sideView, smoothPath } from "./side-view";

type Pixi = typeof PX;

// What lives in the tank. `key` is what a tap reports ("fish:<id>", "nautilus").
export type TankFish = { key: string; id: string; species: SpeciesId | "nautilus"; rarity: Rarity | null };

// The drawings that move as one piece (until their own rigs in Batch C2).
export type RigidName = "seahorse" | "manta_ray" | "nautilus";
export type Markup = (name: RigidName) => { aspect: number; svg: (w: number, h: number) => string } | null;

export type Engine = {
  frame: (dt: number) => void;
  still: () => void;
  setFish: (list: TankFish[]) => Promise<void>;
  setLook: (skin: SkinId) => Promise<void>;
  setSelected: (key: string | null) => void;
  hitTest: (clientX: number, clientY: number) => string | null;
  dispose: () => void;
};

// Sharpness vs battery: up to 2 device pixels per CSS pixel, but never more
// than ~1.4 million canvas pixels (a big landscape tank drops a little).
const MAX_DPR = 2;
const MAX_PIXELS = 1_400_000;
const ROPE_POINTS = 28;
const TAP_RADIUS_PX = 22; // a 44 px wide target, at least
const HAZE_TINT = [0xb6, 0xd3, 0xde];

const dprFor = (w: number, h: number) =>
  Math.max(1, Math.min(window.devicePixelRatio || 1, MAX_DPR, Math.sqrt(MAX_PIXELS / Math.max(1, w * h))));

export class NoWebGL extends Error {}

export async function createEngine(
  P: Pixi,
  canvas: HTMLCanvasElement,
  host: HTMLElement,
  options: { skin: SkinId; markup: Markup; onContextLost: () => void; onContextRestored: () => void },
): Promise<Engine> {
  if (!P.isWebGLSupported()) throw new NoWebGL("WebGL isn't available");

  const app = new P.Application();
  const rect = host.getBoundingClientRect();
  const size = () => {
    const r = host.getBoundingClientRect();
    return { w: Math.max(1, r.width), h: Math.max(1, r.height) };
  };
  let dpr = dprFor(rect.width, rect.height);
  await app.init({
    canvas,
    width: Math.max(1, rect.width),
    height: Math.max(1, rect.height),
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

  // ---------- textures ----------
  const owned = new Set<PX.Texture>();
  const keep = (t: PX.Texture) => (owned.add(t), t);
  const drop = (t: PX.Texture | null | undefined) => {
    if (t && owned.delete(t)) t.destroy(true);
  };

  // How many texture pixels per world unit: enough for this tank on screen.
  const pxPerUnit = () => {
    const { w, h } = size();
    return Math.max(w / 400, h / 300) * dpr;
  };
  let R = clamp(pxPerUnit(), 1, 4); // big layers
  const RS = clamp(pxPerUnit() * 1.5, 2, 6); // small drawings (cheap, so extra sharp)

  const svgTex = async (body: string, box: Box, res: number, flip = false) =>
    keep(await imageTexture(P, svgUrl(body, box, res), box, res, flip));

  // ---------- the scene ----------
  const world = new P.Container();
  app.stage.addChild(world);
  const at = (s: PX.Sprite, box: Box) => (s.position.set(box.x, box.y), s);

  let look = LOOKS[options.skin];
  const bg = at(new P.Sprite(await svgTex(backgroundSvg(look), WORLD, R)), WORLD);
  world.addChild(bg);

  const causticTex = keep(P.Texture.from(causticTile(160, 3)));
  const strips = [0.2, 0.14].map((alpha, i) => {
    const s = new P.TilingSprite({ texture: causticTex, width: WORLD.w, height: 300 - CAUSTIC_TOP + 12 });
    s.position.set(WORLD.x, CAUSTIC_TOP);
    s.tileScale.set(i ? 0.8 : 1, i ? 0.36 : 0.45);
    s.blendMode = "add";
    s.alpha = alpha;
    world.addChild(s);
    return { s, alpha };
  });
  const lip = at(new P.Sprite(await svgTex(lipSvg(look), LIP, R)), LIP);
  world.addChild(lip);

  const rays = await Promise.all(
    RAYS.map(async (r) => {
      const s = at(new P.Sprite(await svgTex(raySvg(r.d), r.box, 0.5)), r.box);
      s.blendMode = "add";
      world.addChild(s);
      return { s, x: r.box.x };
    }),
  );
  const surface = at(new P.Sprite(await svgTex(surfaceSvg(look.surface), SURFACE_BOX, Math.min(R, 2))), SURFACE_BOX);
  world.addChild(surface);

  // anemone + back seagrass
  const mid = new P.Container();
  world.addChild(mid);
  const tentTex = await svgTex(TENTACLE_SVG, { x: 0, y: -2.6, w: 31, h: 5.2 }, RS);
  const tentacles = TENTACLES.map(() => {
    const pts = Array.from({ length: 6 }, () => new P.Point());
    mid.addChild(new P.MeshRope({ texture: tentTex, points: pts }));
    return pts;
  });
  const blades = await Promise.all(
    BLADES.map(async (b) => {
      const half = b.w / 2 + 1;
      const t = await svgTex(bladeSvg(b, smoothPath), { x: 0, y: -half, w: b.h, h: half * 2 }, RS);
      const pts = Array.from({ length: 12 }, () => new P.Point());
      return { b, pts, rope: new P.MeshRope({ texture: t, points: pts }) };
    }),
  );
  for (const r of blades) if (r.b.layer === "back") mid.addChild(r.rope);

  const shadowLayer = new P.Container();
  world.addChild(shadowLayer);
  const fishLayer = new P.Container();
  fishLayer.sortableChildren = true;
  world.addChild(fishLayer);

  const softDot = (color: string) =>
    `<defs><radialGradient id="s"><stop offset="0" stop-color="${color}"/><stop offset="1" stop-color="${color}" stop-opacity="0"/></radialGradient></defs><ellipse cx="0" cy="0" rx="10" ry="10" fill="url(#s)"/>`;
  const DOT_BOX = { x: -10, y: -10, w: 20, h: 20 };
  const shadowTex = await svgTex(softDot("#1d3a3f"), DOT_BOX, 2);
  const glowTex = await svgTex(softDot("#ffffff"), DOT_BOX, 3);
  const sparkleTex = await svgTex(
    `<path d="M0 -4 L1 -1 L4 0 L1 1 L0 4 L-1 1 L-4 0 L-1 -1 Z" fill="#fef9c3"/>`,
    { x: -4.5, y: -4.5, w: 9, h: 9 },
    4,
  );

  const parts = makeParticles(26, 7);
  const dotTex = await svgTex(
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
  const fishTex = new Map<string, Promise<FishTex>>();
  const texturesFor = (sp: TankFish["species"]) => {
    let t = fishTex.get(sp);
    if (!t) {
      t = makeFishTex(sp);
      fishTex.set(sp, t);
    }
    return t;
  };

  async function makeFishTex(sp: TankFish["species"]): Promise<FishTex> {
    const width = sp === "nautilus" ? NAUTILUS.width : speciesById(sp).width;
    const L = lengthOf(width);
    const art = sp === "nautilus" ? null : speciesArt(sp);
    const painted = sp !== "nautilus" && hasPainting(sp);

    if (!art || art.kind === "rigid") {
      // one rigid piece: the painting, or the existing drawing
      let tex: PX.Texture;
      let h: number;
      if (painted) {
        const img = await loadImage(paintingUrl(sp as SpeciesId));
        h = (L * img.naturalHeight) / img.naturalWidth;
        tex = keep(await imageTexture(P, img, { x: 0, y: 0, w: L, h }, RS));
      } else {
        const m = options.markup(sp as RigidName);
        if (!m) throw new Error(`No drawing for ${sp}`);
        h = L / m.aspect;
        const box = { x: 0, y: 0, w: L, h };
        tex = keep(await imageTexture(P, svgDataUrl(m.svg(Math.ceil(L * RS), Math.ceil(h * RS))), box, RS));
      }
      return { kind: "rigid", A: tex, w: L, h, girth: (0.5 * h) / L, swim: art?.swim ?? NAUTILUS_SWIM };
    }

    if (painted) {
      // A painting spans tail-fin tip → snout; the body is its right PAINTED_BODY.
      const img = await loadImage(paintingUrl(sp as SpeciesId));
      const x1 = 0.02 * L;
      const W = (L + x1) / PAINTED_BODY;
      const H = (W * img.naturalHeight) / img.naturalWidth;
      const box = { x: x1 - W, y: -H / 2, w: W, h: H };
      return {
        kind: "rope",
        A: keep(await imageTexture(P, img, box, RS)),
        B: keep(await imageTexture(P, img, box, RS, true)),
        pec: null,
        x0: box.x,
        x1,
        L,
        girth: (0.4 * H) / L,
        swim: art.swim,
        pecLen: 0,
      };
    }

    const v = sideView(art.art, L);
    const url = svgUrl(v.svg, v.box, RS);
    return {
      kind: "rope",
      A: keep(await imageTexture(P, url, v.box, RS)),
      // the same, upside down: on a left-going rope it reads upright
      B: keep(await imageTexture(P, url, v.box, RS, true)),
      pec: await svgTex(v.pec.svg, v.pec.box, RS),
      x0: v.x0,
      x1: v.x1,
      L,
      girth: girthOf(art.art),
      swim: art.swim,
      pecLen: v.pec.box.w,
    };
  }

  let rigs: Rig[] = [];
  let fishToken = 0;
  let selected: string | null = null;
  let resting = false;
  let t = 0;

  async function setFish(list: TankFish[]) {
    const token = ++fishToken;
    const texs = await Promise.all(list.map((f) => texturesFor(f.species)));
    if (token !== fishToken || gone) return;
    for (const r of rigs) {
      r.group.destroy({ children: true });
      r.shadow.destroy();
    }
    const sims = list.map((item, i) => simFor(item, texs[i]));
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
    rigs = list.map((item, i) => makeRig(item, texs[i], sims[i]));
    if (resting) restAll();
    render();
  }

  function simFor(item: TankFish, tex: FishTex): Fish {
    const seed = hashString(item.id);
    const r = rng(seed);
    const swim: Temperament = tex.swim;
    const spec: SwimSpec = {
      length: tex.kind === "rope" ? tex.L : tex.w,
      cruise: swim.cruise,
      burst: swim.burst,
      turn: swim.turn,
      minRadius: swim.minRadius,
      hover: swim.hover,
      tailHz: swim.tailHz,
      girth: tex.girth,
      ...(swim.home === "anemone" && { home: ANEMONE_AT, homeRange: 70 }),
      ...(swim.home === "low" && { home: { x: 200, y: TANK.y0 + 6, z: 0 }, homeRange: 150 }),
    };
    const start = {
      x: TANK.x0 + r() * (TANK.x1 - TANK.x0),
      y: TANK.y0 + r() * (TANK.y1 - TANK.y0),
      z: (r() - 0.5) * (TANK.z1 - TANK.z0) * 0.8,
    };
    return createFish(item.key, spec, seed, start, r() < 0.5 ? 0 : Math.PI);
  }

  function makeRig(item: TankFish, tex: FishTex, f: Fish): Rig {
    const group = new P.Container();
    group.sortableChildren = true;
    fishLayer.addChild(group);
    const shadow = new P.Sprite(shadowTex);
    shadow.anchor.set(0.5);
    shadowLayer.addChild(shadow);

    const glow = new P.Sprite(glowTex);
    glow.anchor.set(0.5);
    glow.zIndex = 0;
    glow.visible = false;
    group.addChild(glow);
    const sparkles =
      item.rarity === "legendary"
        ? [0, 1, 2].map(() => {
            const s = new P.Sprite(sparkleTex);
            s.anchor.set(0.5);
            s.zIndex = 4;
            group.addChild(s);
            return s;
          })
        : [];

    const base = { key: item.key, f, rarity: item.rarity, group, shadow, glow, sparkles, hit: [] as XY[], hitR: 0 };
    if (tex.kind === "rigid") {
      const sprite = new P.Sprite(tex.A);
      sprite.anchor.set(0.5);
      sprite.zIndex = 2;
      group.addChild(sprite);
      const facing = Math.cos(f.yaw) >= 0 ? 1 : -1;
      return { ...base, kind: "rigid", tex, sprite, facing, flip: facing, species: item.species };
    }
    const points = Array.from({ length: ROPE_POINTS }, () => new P.Point());
    const ropeA = new P.MeshRope({ texture: tex.A, points });
    const ropeB = new P.MeshRope({ texture: tex.B, points });
    const vA = new P.Container();
    vA.addChild(ropeA);
    const vB = new P.Container();
    vB.addChild(ropeB);
    group.addChild(vA, vB);
    let pec: PX.Sprite | null = null;
    if (tex.pec) {
      pec = new P.Sprite(tex.pec);
      pec.anchor.set(1 / (tex.pec.width || 1), 0.5); // the fin's base
      group.addChild(pec);
    }
    const facing = Math.cos(f.yaw) >= 0 ? 1 : -1;
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
      facing,
      view: facing > 0 ? "A" : "B",
      prev: null,
      mix: 1,
    };
  }

  // Reduced motion: every fish rests, side-on, spread over the tank.
  function restAll() {
    const n = rigs.length;
    const cols = Math.max(1, Math.ceil(n / 3));
    const rows = [222, 176, 130]; // y up
    rigs.forEach((rig, i) => {
      const f = rig.f;
      const col = Math.floor(i / 3);
      const span = (TANK.x1 - TANK.x0) / cols;
      const left = (i + col) % 2 === 1;
      const cx = TANK.x0 + span * (col + 0.5) + ((i % 3) - 1) * span * 0.18;
      const L = f.spec.length;
      rest(f, { x: cx + (left ? -L / 2 : L / 2), y: rows[i % 3], z: ((i % 4) - 1.5) * 9 }, left);
      if (rig.kind === "rope") {
        rig.c = 0.3;
        rig.facing = left ? -1 : 1;
        rig.view = left ? "B" : "A";
        rig.prev = null;
        rig.mix = 1;
      } else {
        rig.facing = left ? -1 : 1;
        rig.flip = rig.facing;
      }
    });
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
  };

  function render(dt = 0) {
    if (lost || gone) return;
    scenery();
    for (const rig of rigs) {
      if (rig.kind === "rope") drawRope(rig, dt);
      else drawRigid(rig, dt, t);
      drawExtras(rig, t, rig.key === selected);
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
    const [b, l] = await Promise.all([svgTex(backgroundSvg(look), WORLD, R), svgTex(lipSvg(look), LIP, R)]);
    if (gone) return;
    const old = [bg.texture, lip.texture];
    bg.texture = b;
    lip.texture = l;
    old.forEach(drop);
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
      stepAll(
        rigs.map((r) => r.f),
        dt,
      );
      stepParticles(parts, dt, t);
      render(dt);
    },
    still: () => {
      resting = true;
      t = 0;
      restAll();
      render();
    },
    setFish,
    setLook: async (skin) => {
      look = LOOKS[skin];
      const s = await svgTex(surfaceSvg(look.surface), SURFACE_BOX, Math.min(R, 2));
      if (gone) return;
      drop(surface.texture);
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
      owned.forEach((tx) => tx.destroy(true));
      owned.clear();
    },
  };
}

// ---------------- rigs ----------------

type RopeTex = {
  kind: "rope";
  A: PX.Texture; // facing right
  B: PX.Texture; // its mirror, for facing left
  pec: PX.Texture | null; // the near pectoral fin (none on a painting)
  x0: number; // texture left edge (tail-fin tip), with the head at x = 0
  x1: number; // right edge (snout)
  L: number;
  girth: number;
  swim: Temperament;
  pecLen: number;
};
type RigidTex = { kind: "rigid"; A: PX.Texture; w: number; h: number; girth: number; swim: Temperament };
type FishTex = RopeTex | RigidTex;

type View = "A" | "B";

type RigBase = {
  key: string;
  f: Fish;
  rarity: Rarity | null;
  group: PX.Container;
  shadow: PX.Sprite;
  glow: PX.Sprite;
  sparkles: PX.Sprite[];
  hit: XY[]; // the body's centre line on screen (world units), for taps
  hitR: number;
};

type RopeRig = RigBase & {
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

type RigidRig = RigBase & {
  kind: "rigid";
  tex: RigidTex;
  sprite: PX.Sprite;
  facing: 1 | -1;
  flip: number; // −1 … 1, eases toward `facing`
  species: TankFish["species"];
};

type Rig = RopeRig | RigidRig;

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

  // A gentle in-plane tail beat (bigger toward the tail), on top of the curl.
  for (let i = 1; i < NODES; i++) {
    const s = i / (NODES - 1);
    const off = f.tailAmp * L * 0.3 * k * s * s * Math.sin(f.tail - s * 2 * Math.PI * 0.95);
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

  // Rope: tail-fin tip → spine (tail to head) → snout, spaced evenly.
  const tail = nodes[NODES - 1];
  const td = dirs[NODES - 1];
  const tailLen = (-L - tex.x0) * k;
  const snoutLen = tex.x1 * k;
  const line: XY[] = [{ x: tail.x - td.x * tailLen, y: tail.y - td.y * tailLen }];
  for (let i = NODES - 1; i >= 0; i--) line.push(nodes[i]);
  line.push({ x: head.x + dirs[0].x * snoutLen, y: head.y + dirs[0].y * snoutLen });
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

  depth(rig, k);
  rig.hit = line;
  rig.hitR = halfTall * 0.7 * k;
}

function drawRigid(rig: RigidRig, dt: number, t: number) {
  const { f, tex } = rig;
  const sp = f.spine;
  const head = project(sp[0]);
  const back = project(sp[Math.min(NODES - 1, 5)]);
  const mid = project(sp[2]);
  const k = mid.k;
  const dx = head.x - back.x;
  const dy = head.y - back.y;
  if (Math.abs(dx) > Math.hypot(dx, dy) * 0.3) rig.facing = dx > 0 ? 1 : -1;
  // a quick swing round when it changes direction (its own rig comes in C2)
  rig.flip = dt === 0 ? rig.facing : rig.flip + (rig.facing - rig.flip) * (1 - Math.exp(-9 * dt));
  const tilt = rig.species === "seahorse" ? 0.12 : rig.species === "manta_ray" ? 0.3 : 0.15;
  const s = rig.sprite;
  s.position.set(mid.x, mid.y);
  s.rotation = clamp(Math.atan2(dy, Math.abs(dx) || 1) * rig.facing, -tilt, tilt);
  const wing = rig.species === "manta_ray" ? 1 + 0.05 * Math.sin(t * 1.6 + f.fin) : 1;
  const sx = (tex.w / (s.texture.width || 1)) * k;
  s.scale.set(sx * (Math.abs(rig.flip) < 0.08 ? 0.08 * Math.sign(rig.flip || 1) : rig.flip), (tex.h / (s.texture.height || 1)) * k * wing);
  depth(rig, k);
  rig.hit = [{ x: mid.x, y: mid.y }];
  rig.hitR = (Math.max(tex.w, tex.h) / 2) * k * 0.8;
}

// Depth (farther = bluer and behind) and the shadow on the sand.
function depth(rig: Rig, k: number) {
  const sp = rig.f.spine;
  const mz = sp[3].z;
  const haze = Math.min(1, Math.max(0, -mz / 34)) * 0.55;
  const tint = HAZE_TINT.map((c) => Math.round(255 + (c - 255) * haze));
  rig.group.tint = (tint[0] << 16) | (tint[1] << 8) | tint[2];
  rig.group.zIndex = mz;
  const L = rig.f.spec.length;
  const g = project({ x: sp[3].x, y: TANK.floor, z: sp[3].z });
  const height = Math.max(0, sp[3].y - TANK.floor);
  rig.shadow.position.set(g.x, g.y);
  rig.shadow.scale.set((L * 0.5 * g.k) / 10, (L * 0.11 * g.k) / 10);
  rig.shadow.alpha = 0.2 * (1 - Math.min(1, height / 260)) * k;
}

// Epic: a soft white glow. Legendary: a gold glow and twinkling sparkles.
// A tapped fish glows brighter while its card is open.
function drawExtras(rig: Rig, t: number, isSelected: boolean) {
  const line = rig.hit;
  const n = line.length;
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
    s.position.set(p.x, p.y - rig.hitR * 1.2 + Math.abs(off) * 0.4);
    const tw = 0.5 + 0.5 * Math.sin(t * 2.4 + i * 2.1);
    s.alpha = 0.3 + 0.7 * tw;
    s.scale.set(0.6 + 0.4 * tw);
  });
}

// ---------------- helpers ----------------

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

function distToLine(p: XY, line: XY[]) {
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

const svgDataUrl = (svg: string) => "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);

// An SVG body drawn at `res` pixels per unit (rendered at that size, so it's crisp).
const svgUrl = (body: string, box: Box, res: number) =>
  svgDataUrl(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${box.x} ${box.y} ${box.w} ${box.h}" width="${Math.ceil(box.w * res)}" height="${Math.ceil(box.h * res)}">${body}</svg>`,
  );

function loadImage(src: string): Promise<HTMLImageElement> {
  const img = new Image();
  return new Promise((done, fail) => {
    img.onload = () => done(img);
    img.onerror = () => fail(new Error(`Couldn't load ${src.slice(0, 40)}`));
    img.src = src;
  });
}

// Any image → a texture covering `box` (world units), `res` pixels per unit.
// `flip` turns it upside down.
async function imageTexture(P: Pixi, src: string | HTMLImageElement, box: Box, res: number, flip = false) {
  const img = typeof src === "string" ? await loadImage(src) : src;
  const W = Math.ceil(box.w * res);
  const H = Math.ceil(box.h * res);
  const c = document.createElement("canvas");
  c.width = W;
  c.height = H;
  const ctx = c.getContext("2d")!;
  if (flip) {
    ctx.translate(0, H);
    ctx.scale(1, -1);
  }
  ctx.drawImage(img, 0, 0, W, H);
  return new P.Texture({ source: new P.CanvasSource({ resource: c, resolution: res }) });
}
