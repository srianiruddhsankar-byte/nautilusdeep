// A small transparent stage for the result screen, drawn with the tank's own
// art and rigs (no water, no scenery):
// - "silhouette": the hatching reveal's flicking shapes, in the text colour.
// - "fish": the fish you caught, hovering in place (with its glow, if any).
// - "drift": a lost egg or fry fading and drifting away.
// Plain TypeScript; mini-canvas.tsx owns its lifecycle.

import type * as PX from "pixi.js";
import type { BroodStage } from "@/lib/brood";
import { speciesById, NAUTILUS, type Rarity } from "@/lib/species";
import { createFish, rest, step, type SwimSpec } from "@/lib/swim";
import { EGG_BOX, FRY } from "./brood-art";
import { type Common, destroyRig, drawExtras, drawRig, makeRig, type Rig, settle } from "./rigs";
import { createBank, dprFor, NoWebGL, seedOf, type Swimmer } from "./textures";

type Pixi = typeof PX;

export type MiniScene =
  | { kind: "silhouette"; species: Swimmer; key: number } // a new key replays the flick
  | { kind: "fish"; species: Swimmer; rarity: Rarity; id: string }
  | { kind: "drift"; stage: BroodStage };

export type Mini = {
  show: (scene: MiniScene) => Promise<void>;
  frame: (dt: number) => void;
  still: () => void;
  dispose: () => void;
};

const ease = (k: number) => k * k * (3 - 2 * k);
// the reveal's "pop": overshoots a little, like cubic-bezier(.34, 1.56, .64, 1)
const pop = (k: number) => 1 + 2.2 * Math.pow(k - 1, 3) + 1.2 * Math.pow(k - 1, 2);

export async function createMini(
  P: Pixi,
  canvas: HTMLCanvasElement,
  host: HTMLElement,
  options: { ink: () => number; onContextLost: () => void },
): Promise<Mini> {
  if (!P.isWebGLSupported()) throw new NoWebGL("WebGL isn't available");
  const app = new P.Application();
  const r0 = host.getBoundingClientRect();
  const dpr = dprFor(r0.width, r0.height);
  await app.init({
    canvas,
    width: Math.max(1, r0.width),
    height: Math.max(1, r0.height),
    resolution: dpr,
    autoDensity: true,
    antialias: false,
    backgroundAlpha: 0,
    autoStart: false,
    sharedTicker: false,
    preference: "webgl",
    powerPreference: "low-power",
  });
  app.ticker.stop();
  let lost = false;
  const onLost = () => {
    lost = true;
    options.onContextLost();
  };
  canvas.addEventListener("webglcontextlost", onLost);

  const bank = createBank(P, Math.min(8, Math.max(2, 3 * dpr)));
  const common: Common = { shadow: await bank.dot("#1d3a3f"), glow: await bank.dot("#ffffff"), sparkle: await bank.sparkle() };
  const stage = new P.Container(); // centred on the host, scaled to the shown thing
  const layer = new P.Container();
  layer.sortableChildren = true;
  stage.addChild(layer);
  app.stage.addChild(stage);

  let t = 0;
  let since = 0; // seconds since the current scene appeared
  let resting = false;
  let current: MiniScene | null = null;
  let rig: Rig | null = null;
  let sprite: PX.Sprite | null = null;
  let pool: PX.Sprite | null = null; // a little water behind a drifting egg / fry
  let scale = 1;
  let token = 0;

  const centre = () => {
    const r = host.getBoundingClientRect();
    return { x: r.width / 2, y: r.height / 2 };
  };
  // The old reveal drew a fish 1.5 × its tank size, at most 150 px wide (and
  // never taller than the stage, for the tall sunfish).
  const scaleFor = (sp: Swimmer, box: { w: number; h: number }) => {
    const px = Math.min((sp === "nautilus" ? NAUTILUS.width : speciesById(sp).width) * 1.5, 150);
    return Math.min(px / box.w, (host.getBoundingClientRect().height * 0.85) / box.h);
  };

  function clear() {
    if (rig) destroyRig(rig);
    rig = null;
    sprite?.destroy();
    sprite = null;
    pool?.destroy();
    pool = null;
  }

  async function show(scene: MiniScene) {
    const mine = ++token;
    if (scene.kind === "silhouette") {
      const pic = await bank.silhouette(scene.species);
      if (mine !== token) return;
      clear();
      sprite = new P.Sprite(pic.tex);
      sprite.position.set(pic.box.x, pic.box.y);
      sprite.width = pic.box.w;
      sprite.height = pic.box.h;
      sprite.tint = options.ink();
      layer.addChild(sprite);
      scale = scaleFor(scene.species, pic.box);
      // centre the shape
      stage.pivot.set(pic.box.x + pic.box.w / 2, pic.box.y + pic.box.h / 2);
    } else if (scene.kind === "fish") {
      const tex = await bank.fish(scene.species);
      const pic = await bank.silhouette(scene.species); // for its size
      if (mine !== token) return;
      clear();
      const { cruise, burst, turn, minRadius, tailHz, pulse } = tex.swim;
      const spec: SwimSpec = { cruise, burst, turn, minRadius, tailHz, pulse, length: tex.L, girth: tex.girth, hover: 1 };
      const f = createFish(scene.id, spec, 11, { x: 200, y: 170, z: 0 }, 0);
      rest(f, { x: 200, y: 170, z: 0 }, false);
      f.hoverT = 1e9; // it stays, gently finning
      rig = makeRig(P, common, { fish: layer, shadow: null }, { key: scene.id, rarity: scene.rarity, seed: seedOf(scene.id) }, tex, f);
      settle(rig);
      scale = scaleFor(scene.species, pic.box);
    } else {
      const fry = scene.stage === "fry";
      const tex = scene.stage === "fry" ? (await bank.fry()).A : await bank.egg(scene.stage);
      if (mine !== token) return;
      const water = await bank.dot("#5fa8bb");
      if (mine !== token) return;
      clear();
      // The egg and fry are see-through white: on the light result card they'd
      // vanish, so they drift in a soft pool of tank water.
      const box = fry ? FRY.box : EGG_BOX;
      pool = new P.Sprite(water);
      pool.anchor.set(0.5);
      pool.scale.set((box.w * 0.85) / 10, (box.h * (fry ? 1.6 : 0.85)) / 10);
      layer.addChild(pool);
      sprite = new P.Sprite(tex);
      sprite.anchor.set(0.5);
      layer.addChild(sprite);
      scale = (fry ? 44 : 70) / box.w; // the old drawing's size
      stage.pivot.set(0, 0);
    }
    current = scene;
    since = 0;
    render();
  }

  function render(dt = 0) {
    if (lost || !current) return;
    const c = centre();
    stage.position.set(c.x, c.y);
    const k = resting ? 1 : Math.min(1, since / (current.kind === "silhouette" ? 0.25 : current.kind === "fish" ? 0.7 : 3));
    if (current.kind === "silhouette" && sprite) {
      stage.scale.set(scale * (0.92 + 0.08 * ease(k)));
      sprite.alpha = 0.3 * (0.3 + 0.7 * ease(k)); // the text colour at 30 %, like the drawings it replaces
    } else if (current.kind === "fish" && rig) {
      drawRig(rig, dt, t, resting);
      drawExtras(rig, t, false);
      // the camera follows the fish's middle, so it hovers in place
      const line = rig.hit;
      const m = line[Math.floor(line.length / 2)] ?? { x: 200, y: 150 };
      stage.pivot.set(m.x, m.y);
      stage.scale.set(scale * (resting ? 1 : pop(k)));
    } else if (current.kind === "drift" && sprite) {
      const e = resting ? 0 : k * k; // ease-in
      stage.scale.set(scale);
      sprite.position.set((10 * e) / scale, (-40 * e) / scale);
      if (pool) {
        pool.position.copyFrom(sprite.position);
        pool.alpha = (resting ? 0.35 : 1 - e) * 0.8;
      }
      sprite.alpha = resting ? 0.35 : 1 - e;
    }
    app.renderer.render(app.stage);
  }

  const ro = new ResizeObserver(() => {
    const r = host.getBoundingClientRect();
    app.renderer.resize(Math.max(1, r.width), Math.max(1, r.height), dprFor(r.width, r.height));
    render();
  });
  ro.observe(host);

  return {
    show,
    frame: (dt) => {
      if (lost) return;
      resting = false;
      t += dt;
      since += dt;
      if (rig) {
        // alone and hovering: it only fins and bobs (the camera follows it)
        rig.f.hoverT = 1e9;
        step(rig.f, dt);
      }
      render(dt);
    },
    still: () => {
      resting = true;
      if (rig) {
        rest(rig.f, { x: 200, y: 170, z: 0 }, false);
        settle(rig);
      }
      render();
    },
    dispose: () => {
      token++;
      ro.disconnect();
      canvas.removeEventListener("webglcontextlost", onLost);
      app.destroy({ removeView: false }, { children: true });
      bank.destroy();
    },
  };
}

