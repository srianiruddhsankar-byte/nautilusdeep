// Every drawing becomes a texture here, once: species (ropes and puppets),
// paintings, the brood, silhouettes and the small glows. Shared by the tank
// (engine.ts) and the result screen's small stage (mini.ts).

import type * as PX from "pixi.js";
import { hashString } from "@/lib/fish-look";
import { NAUTILUS, speciesById, type SpeciesId } from "@/lib/species";
import { hasPainting, PAINTED_BODY, paintingUrl } from "./art-files";
import { EGG_BOX, eggSvg, FRY, FRY_BODY } from "./brood-art";
import { girthOf, lengthOf, speciesArt, type Temperament, type Wave } from "./fish-art";
import { type Puppet, type PuppetPart, puppetFor, puppetPicture } from "./puppets";
import { type Box, sideView } from "./side-view";

type Pixi = typeof PX;
export type Swimmer = SpeciesId | "nautilus";

export type RopeTex = {
  kind: "rope";
  A: PX.Texture; // facing right
  B: PX.Texture; // its mirror, for facing left (upside down: on a left-going rope it reads upright)
  pec: PX.Texture | null; // the near pectoral fin (none on a painting)
  x0: number; // texture left edge (tail-fin tip), with the head at x = 0
  x1: number; // right edge (snout)
  L: number;
  girth: number;
  swim: Temperament;
  wave?: Wave;
};
export type PuppetTex = {
  kind: "puppet";
  puppet: Puppet;
  parts: { part: PuppetPart; tex: PX.Texture }[];
  tentacle: PX.Texture | null;
  L: number; // swimming length (world units)
  w: number; // drawn size (world units)
  h: number;
  girth: number;
  swim: Temperament;
};
export type FishTex = RopeTex | PuppetTex;
export type Picture = { tex: PX.Texture; box: Box }; // box in world units

export function createBank(P: Pixi, res: number) {
  const owned = new Set<PX.Texture>();
  const keep = (t: PX.Texture) => (owned.add(t), t);
  const cache = new Map<string, Promise<unknown>>();
  const once = <T>(key: string, make: () => Promise<T>): Promise<T> => {
    let p = cache.get(key) as Promise<T> | undefined;
    if (!p) {
      p = make();
      cache.set(key, p);
    }
    return p;
  };

  const svg = async (body: string, box: Box, r = res, opts: TexOptions = {}) =>
    keep(await imageTexture(P, svgUrl(body, box, r), box, r, opts));

  async function makeFish(sp: Swimmer): Promise<FishTex> {
    const width = sp === "nautilus" ? NAUTILUS.width : speciesById(sp).width;
    const L = lengthOf(width);
    const a = speciesArt(sp);
    const painting = sp !== "nautilus" && hasPainting(sp) ? await loadImage(paintingUrl(sp)) : null;

    if (a.kind === "puppet") {
      if (painting) {
        // a painting moves as one piece (with a gentle bob)
        const h = (L * painting.naturalHeight) / painting.naturalWidth;
        const box = { x: 0, y: 0, w: L, h };
        const part = { name: "body", svg: "", box, pivot: { x: L / 2, y: h / 2 }, at: { x: L / 2, y: h / 2 }, z: 0 };
        const puppet: Puppet = {
          unit: 1,
          parts: [part],
          centre: part.at,
          box,
          minFlip: 0.2,
          tilt: 0.12,
          animate: (pose, s) => {
            if (!s.still) pose.all.dy = 0.8 * Math.sin(s.t * 0.8 + s.seed * 6);
          },
        };
        return { kind: "puppet", puppet, parts: [{ part, tex: keep(await imageTexture(P, painting, box, res)) }], tentacle: null, L, w: L, h, girth: (0.5 * h) / L, swim: a.swim };
      }
      const puppet = puppetFor(a.id, a.art, L);
      const parts = await Promise.all(puppet.parts.map(async (part) => ({ part, tex: await svg(part.svg, part.box, res / puppet.unit) })));
      const tentacle = puppet.tentacles ? await svg(puppet.tentacles.svg, puppet.tentacles.box, res / puppet.unit) : null;
      const w = puppet.box.w * puppet.unit;
      const h = puppet.box.h * puppet.unit;
      return { kind: "puppet", puppet, parts, tentacle, L, w, h, girth: a.art ? girthOf(a.art) : (0.4 * h) / L, swim: a.swim };
    }

    if (painting) {
      // A painting spans tail-fin tip → snout; the body is its right PAINTED_BODY.
      const x1 = 0.02 * L;
      const W = (L + x1) / PAINTED_BODY;
      const H = (W * painting.naturalHeight) / painting.naturalWidth;
      const box = { x: x1 - W, y: -H / 2, w: W, h: H };
      return {
        kind: "rope",
        A: keep(await imageTexture(P, painting, box, res)),
        B: keep(await imageTexture(P, painting, box, res, { flip: true })),
        pec: null,
        x0: box.x,
        x1,
        L,
        girth: (0.4 * H) / L,
        swim: a.swim,
        wave: a.wave,
      };
    }

    const v = sideView(a.art, L);
    return {
      kind: "rope",
      A: await svg(v.svg, v.box),
      B: await svg(v.svg, v.box, res, { flip: true }),
      pec: await svg(v.pec.svg, v.pec.box),
      x0: v.x0,
      x1: v.x1,
      L,
      girth: girthOf(a.art),
      swim: a.swim,
      wave: a.wave,
    };
  }

  // The whole animal at rest, as one flat shape (white: tint it any colour).
  async function makeSilhouette(sp: Swimmer): Promise<Picture> {
    const t = await fish(sp);
    if (t.kind === "rope") {
      const box = { x: t.x0, y: -t.A.height / 2, w: t.x1 - t.x0, h: t.A.height };
      if (sp !== "nautilus" && hasPainting(sp)) return { tex: keep(await imageTexture(P, await loadImage(paintingUrl(sp)), box, res, { solid: true })), box };
      const a = speciesArt(sp);
      if (a.kind !== "rope") throw new Error("unreachable");
      const v = sideView(a.art, t.L);
      return { tex: await svg(v.svg, v.box, res, { solid: true }), box: v.box };
    }
    const u = t.puppet.unit;
    const pic = puppetPicture(t.puppet);
    const world = { x: (pic.box.x - t.puppet.centre.x) * u, y: (pic.box.y - t.puppet.centre.y) * u, w: pic.box.w * u, h: pic.box.h * u };
    if (!t.parts[0].part.svg) return { tex: keep(await imageTexture(P, await loadImage(paintingUrl(sp as SpeciesId)), world, res, { solid: true })), box: world };
    return { tex: await svg(pic.svg, pic.box, res / u, { solid: true }), box: world };
  }

  const fish = (sp: Swimmer) => once(`fish:${sp}`, () => makeFish(sp));

  return {
    res,
    // any image (an SVG data URL or a painting) → a texture covering `box`
    image: async (src: string, box: Box, r = res) => keep(await imageTexture(P, src, box, r)),
    fish,
    silhouette: (sp: Swimmer) => once(`sil:${sp}`, () => makeSilhouette(sp)),
    egg: (stage: "eggs" | "eyed" | "hatched") => once(`egg:${stage}`, () => svg(eggSvg(stage), EGG_BOX)),
    fry: () =>
      once(
        "fry",
        async (): Promise<RopeTex> => ({
          kind: "rope",
          A: await svg(FRY.svg, FRY.box, res * 1.5),
          B: await svg(FRY.svg, FRY.box, res * 1.5, { flip: true }),
          pec: null,
          x0: FRY.x0,
          x1: FRY.x1,
          L: FRY_BODY,
          girth: 0.25,
          swim: { cruise: 7, burst: 12, turn: 2.5, minRadius: 0.2, hover: 0.55, tailHz: [2.2, 0.08] },
        }),
      ),
    // soft round dots: shadows and glows (white, tinted where used)
    dot: (color: string) =>
      once(`dot:${color}`, () =>
        svg(
          `<defs><radialGradient id="s"><stop offset="0" stop-color="${color}"/><stop offset="1" stop-color="${color}" stop-opacity="0"/></radialGradient></defs><ellipse cx="0" cy="0" rx="10" ry="10" fill="url(#s)"/>`,
          { x: -10, y: -10, w: 20, h: 20 },
          3,
        ),
      ),
    sparkle: () => once("sparkle", () => svg(`<path d="M0 -4 L1 -1 L4 0 L1 1 L0 4 L-1 1 L-4 0 L-1 -1 Z" fill="#fef9c3"/>`, { x: -4.5, y: -4.5, w: 9, h: 9 }, 4)),
    svg,
    keep,
    drop: (t: PX.Texture | null | undefined) => {
      if (t && owned.delete(t)) t.destroy(true);
    },
    destroy: () => {
      owned.forEach((t) => t.destroy(true));
      owned.clear();
      cache.clear();
    },
  };
}

export type Bank = ReturnType<typeof createBank>;

// ---------------- canvas helpers ----------------

// Sharpness vs battery: up to 2 device pixels per CSS pixel, but never more
// than ~1.4 million canvas pixels (a big landscape tank drops a little).
const MAX_DPR = 2;
const MAX_PIXELS = 1_400_000;
export const dprFor = (w: number, h: number) =>
  Math.max(1, Math.min(window.devicePixelRatio || 1, MAX_DPR, Math.sqrt(MAX_PIXELS / Math.max(1, w * h))));

export class NoWebGL extends Error {}

// The WebGL context for a tank, made here rather than by Pixi so a dead one
// is caught first: on a lost context Pixi's start-up shader test loops forever
// and freezes the whole app. Lost or missing → NoWebGL (the still picture).
// The attributes are the ones Pixi would ask for itself.
// Every context opened here is released with closeContext (after Pixi's
// destroy, or when a build fails), so `open` is the live count.
const open = new Set<WebGLRenderingContext | WebGL2RenderingContext>();

export function openContext(canvas: HTMLCanvasElement, alpha: boolean): WebGL2RenderingContext {
  const attrs: WebGLContextAttributes = { alpha, premultipliedAlpha: true, antialias: false, stencil: true, powerPreference: "low-power" };
  const gl = canvas.getContext("webgl2", attrs) ?? canvas.getContext("webgl", attrs);
  if (!gl || gl.isContextLost()) throw new NoWebGL("No live WebGL context");
  open.add(gl);
  logLive();
  return gl as WebGL2RenderingContext; // Pixi takes WebGL 1 here too (its type just says 2)
}

export function closeContext(gl: WebGLRenderingContext | WebGL2RenderingContext) {
  if (!open.delete(gl)) return;
  if (!gl.isContextLost()) gl.getExtension("WEBGL_lose_context")?.loseContext(); // frees the GPU's slot now
  logLive();
}

// Dev only: how many tank WebGL contexts are live (the tank's and the result
// screen's together). It should never be above 1. Also on window.__tankContexts.
function logLive() {
  if (process.env.NODE_ENV === "production") return;
  (window as { __tankContexts?: number }).__tankContexts = open.size;
  console.info(`Tank: ${open.size} live WebGL context${open.size === 1 ? "" : "s"}`);
}

// 0 … 1 from an id, so two of a kind don't flap in step.
export const seedOf = (id: string) => (hashString(`${id}:pose`) % 1000) / 1000;

// ---------------- image → texture ----------------

type TexOptions = { flip?: boolean; solid?: boolean };

export const svgDataUrl = (svg: string) => "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);

// An SVG body drawn at `res` pixels per unit (rendered at that size, so it's crisp).
export const svgUrl = (body: string, box: Box, res: number) =>
  svgDataUrl(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${box.x} ${box.y} ${box.w} ${box.h}" width="${Math.ceil(box.w * res)}" height="${Math.ceil(box.h * res)}">${body}</svg>`,
  );

export function loadImage(src: string): Promise<HTMLImageElement> {
  const img = new Image();
  return new Promise((done, fail) => {
    img.onload = () => done(img);
    img.onerror = () => fail(new Error(`Couldn't load ${src.slice(0, 40)}`));
    img.src = src;
  });
}

// Any image → a texture covering `box`, `res` pixels per unit. `flip` turns it
// upside down; `solid` makes every visible pixel white (a silhouette).
export async function imageTexture(P: Pixi, src: string | HTMLImageElement, box: Box, res: number, opts: TexOptions = {}) {
  const img = typeof src === "string" ? await loadImage(src) : src;
  const W = Math.max(1, Math.ceil(box.w * res));
  const H = Math.max(1, Math.ceil(box.h * res));
  const c = document.createElement("canvas");
  c.width = W;
  c.height = H;
  const ctx = c.getContext("2d")!;
  if (opts.flip) {
    ctx.translate(0, H);
    ctx.scale(1, -1);
  }
  ctx.drawImage(img, 0, 0, W, H);
  if (opts.solid) {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalCompositeOperation = "source-in";
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, W, H);
  }
  // Made at resolution 1 first, so its pixel size is exactly the canvas size;
  // then told how many pixels make one unit. (Passing `res` straight in lets
  // Pixi compute 291.99999… pixels for a 292 px canvas, "resize" it, and that
  // clears the drawing.)
  const source = new P.CanvasSource({ resource: c, resolution: 1 });
  source.resolution = res;
  return new P.Texture({ source });
}
