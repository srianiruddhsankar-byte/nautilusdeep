"use client";

import { type Ref, useEffect, useImperativeHandle, useRef, useState } from "react";
import type { BroodStage } from "@/lib/brood";
import type { SkinId } from "@/lib/economy";
import { startCanvas } from "@/lib/canvas-life";
import { plantLook } from "@/lib/plant-look";
import type { PlantStage } from "@/lib/plants";
import { DecorationSprite } from "../decoration-sprite";
import { PlantSprite } from "../plant-sprite";
import type { ArtSource, Engine, HitKinds, TankDecor, TankFish, TankPlant } from "./engine";
import { useReducedMotion, useTankLoop } from "./tank-loop";

// The Tank 4 canvas: water, scenery, every fish, plants, decorations and the
// session's egg / fry, drawn by engine.ts. Plants and decorations keep ONE
// drawing each (plant-sprite.tsx, decoration-sprite.tsx): they're rendered
// hidden here and read in as SVG, so the still picture and the index use the
// very same art.
// - Pixi is loaded only when a tank is on screen (its own chunk).
// - 30 fps, paused when the tab is hidden, the window loses focus or the tank
//   is off screen (tank-loop.ts). Reduced motion: the fish rest, nothing moves.
// - The GPU can drop the canvas (a "lost context", e.g. after sleep): if it
//   isn't back within 3 s the whole tank is rebuilt on a fresh canvas. Without
//   WebGL at all, or if it can't start, the Tank shows its still-image
//   fallback instead.
// - Every build gets its own new canvas, removed when the tank stops (also
//   when Next hides the page): never more than one live WebGL context.

export type TankStatus = "loading" | "ready" | "fallback";
export type TankHandle = { hitTest: (clientX: number, clientY: number, kinds?: HitKinds) => string | null };

// What the Tank passes in for plants and decorations (the canvas works out
// their drawings).
export type CanvasPlant = Omit<TankPlant, "art" | "sway"> & { lookId: string; stage: PlantStage };
export type CanvasDecor = Omit<TankDecor, "art" | "bubbles"> & { item: string };

const plantArt = (p: { lookId: string; stage: PlantStage; wilted: boolean }) => `plant:${p.lookId}:${p.stage}:${p.wilted ? 1 : 0}`;

const FPS = 30;
const REBUILD_AFTER_MS = 3000;
const MAX_REBUILDS = 3;

export function TankCanvas({
  probe,
  fish,
  plants = [],
  decorations = [],
  brood = null,
  skin,
  selected,
  ref,
  onStatus,
}: {
  probe: string; // the loop's name in window.__tanks (for measuring)
  fish: TankFish[];
  plants?: CanvasPlant[];
  decorations?: CanvasDecor[];
  brood?: BroodStage | null; // the running screen's egg → fry
  skin: SkinId;
  selected: string | null;
  ref: Ref<TankHandle>; // for hit testing taps
  onStatus: (status: TankStatus) => void;
}) {
  const host = useRef<HTMLDivElement>(null);
  const slot = useRef<HTMLDivElement>(null); // where each build's own canvas goes
  const engine = useRef<Engine | null>(null);
  const art = useRef<HTMLDivElement>(null);
  const [generation, setGeneration] = useState(0);
  const [lost, setLost] = useState(false); // the GPU dropped the canvas; the skin's picture shows meanwhile
  const still = useReducedMotion();

  // The newest props, for the async build and the effects below.
  // The engine's scenery, with each drawing named.
  const scenery = {
    plants: plants.map(
      (p): TankPlant => ({ ...p, art: plantArt(p), sway: { seconds: plantLook(p.lookId).swaySeconds, phase: plantLook(p.lookId).phase } }),
    ),
    decorations: decorations.map((d): TankDecor => ({ ...d, art: `decor:${d.item}`, bubbles: d.item === "bubbler" })),
  };
  const latest = useRef({ fish, brood, skin, selected, still, onStatus, scenery });
  useEffect(() => {
    latest.current = { fish, brood, skin, selected, still, onStatus, scenery };
  });

  // Build (and rebuild after a lost context), on a brand-new canvas every
  // time: Next hides a page you leave and shows the same DOM again when you
  // come back, and a canvas whose context was destroyed can't be reused
  // (lib/canvas-life.ts). The canvas goes into `slot`; leaving removes it.
  useEffect(() => {
    if (generation > MAX_REBUILDS) {
      latest.current.onStatus("fallback");
      return;
    }
    const where = slot.current;
    if (!where) return;
    let rebuild: ReturnType<typeof setTimeout> | undefined;
    latest.current.onStatus("loading"); // the still picture shows until it's drawn

    // The hidden drawings below, as SVG markup (the bubbler's bubbles are left
    // out: the engine makes real rising ones).
    const source: ArtSource = (key) => {
      const svg = art.current?.querySelector<SVGSVGElement>(`[data-art="${CSS.escape(key)}"] svg`);
      if (!svg) return null;
      const vb = svg.viewBox.baseVal;
      return {
        aspect: vb.width / (vb.height || 1),
        svg: (w, h, viewBox) => {
          const copy = svg.cloneNode(true) as SVGSVGElement;
          copy.setAttribute("width", String(w));
          copy.setAttribute("height", String(h));
          if (viewBox) copy.setAttribute("viewBox", viewBox);
          copy.removeAttribute("class");
          copy.querySelectorAll(".decor-bubble").forEach((b) => b.remove());
          return new XMLSerializer().serializeToString(copy);
        },
      };
    };

    const stop = startCanvas({
      create: () => {
        const c = document.createElement("canvas");
        c.className = "block h-full w-full";
        where.appendChild(c);
        return c;
      },
      remove: (c) => c.remove(),
      build: async (c, stopped) => {
        const [P, { createEngine }] = await Promise.all([import("pixi.js"), import("./engine")]);
        if (stopped() || !host.current) throw new Error("left before it started");
        const built = await createEngine(P, c, host.current, {
          skin: latest.current.skin,
          art: source,
          onContextLost: () => {
            setLost(true);
            latest.current.onStatus("loading");
            clearTimeout(rebuild);
            rebuild = setTimeout(() => setGeneration((g) => g + 1), REBUILD_AFTER_MS);
          },
          onContextRestored: () => {
            clearTimeout(rebuild);
            setLost(false);
            latest.current.onStatus("ready");
          },
        });
        try {
          await built.setFish(latest.current.fish);
          await built.setBrood(latest.current.brood);
          await built.setScenery(latest.current.scenery);
        } catch (error) {
          built.dispose();
          throw error;
        }
        return built;
      },
      ready: (built) => {
        built.setSelected(latest.current.selected);
        if (latest.current.still) built.still();
        engine.current = built;
        setLost(false);
        latest.current.onStatus("ready");
      },
      failed: (error) => {
        console.warn("Tank: using the still picture.", error);
        latest.current.onStatus("fallback");
      },
    });

    return () => {
      clearTimeout(rebuild);
      engine.current = null;
      stop();
    };
  }, [generation]);

  // Follow the props.
  const fishKey = fish.map((f) => `${f.key}:${f.species}`).join(",");
  useEffect(() => {
    void engine.current?.setFish(latest.current.fish);
  }, [fishKey]);
  useEffect(() => {
    void engine.current?.setBrood(brood);
  }, [brood]);
  const sceneryKey = JSON.stringify(scenery);
  useEffect(() => {
    void engine.current?.setScenery(latest.current.scenery);
  }, [sceneryKey]);
  useEffect(() => {
    void engine.current?.setLook(skin);
  }, [skin]);
  useEffect(() => {
    engine.current?.setSelected(selected);
  }, [selected]);
  useImperativeHandle(ref, () => ({ hitTest: (x, y, kinds) => engine.current?.hitTest(x, y, kinds) ?? null }), []);

  useTankLoop(host, {
    id: probe,
    still,
    maxFps: FPS,
    onFrame: (dt) => engine.current?.frame(dt),
    onStill: () => engine.current?.still(),
    onStats: () => {},
  });

  return (
    <div ref={host} className="pointer-events-none absolute inset-0" aria-hidden>
      <div ref={slot} className={`absolute inset-0 ${lost ? "invisible" : ""}`} />
      <div ref={art} hidden>
        {[...new Map(plants.map((p) => [plantArt(p), p])).entries()].map(([key, p]) => (
          <div key={key} data-art={key}>
            <PlantSprite look={plantLook(p.lookId)} stage={p.stage} wilted={p.wilted} width={40} />
          </div>
        ))}
        {[...new Set(decorations.map((d) => d.item))].map((item) => (
          <div key={item} data-art={`decor:${item}`}>
            <DecorationSprite item={item} />
          </div>
        ))}
      </div>
    </div>
  );
}
