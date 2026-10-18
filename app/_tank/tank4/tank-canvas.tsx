"use client";

import { type Ref, useEffect, useImperativeHandle, useRef, useState } from "react";
import type { BroodStage } from "@/lib/brood";
import type { SkinId } from "@/lib/economy";
import type { Engine, TankFish } from "./engine";
import { useReducedMotion, useTankLoop } from "./tank-loop";

// The Tank 4 canvas: water, scenery, every fish and the session's egg / fry,
// drawn by engine.ts.
// - Pixi is loaded only when a tank is on screen (its own chunk).
// - 30 fps, paused when the tab is hidden, the window loses focus or the tank
//   is off screen (tank-loop.ts). Reduced motion: the fish rest, nothing moves.
// - The GPU can drop the canvas (a "lost context", e.g. after sleep): if it
//   isn't back within 3 s the whole tank is rebuilt on a fresh canvas. Without
//   WebGL at all, the Tank shows its still-image fallback instead.

export type TankStatus = "loading" | "ready" | "fallback";
export type TankHandle = { hitTest: (clientX: number, clientY: number) => string | null };

const FPS = 30;
const REBUILD_AFTER_MS = 3000;
const MAX_REBUILDS = 3;

export function TankCanvas({
  probe,
  fish,
  brood = null,
  skin,
  selected,
  ref,
  onStatus,
}: {
  probe: string; // the loop's name in window.__tanks (for measuring)
  fish: TankFish[];
  brood?: BroodStage | null; // the running screen's egg → fry
  skin: SkinId;
  selected: string | null;
  ref: Ref<TankHandle>; // for hit testing taps
  onStatus: (status: TankStatus) => void;
}) {
  const host = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const engine = useRef<Engine | null>(null);
  const [generation, setGeneration] = useState(0);
  const [lost, setLost] = useState(false); // the GPU dropped the canvas; the skin's picture shows meanwhile
  const still = useReducedMotion();

  // The newest props, for the async build and the effects below.
  const latest = useRef({ fish, brood, skin, selected, still, onStatus });
  useEffect(() => {
    latest.current = { fish, brood, skin, selected, still, onStatus };
  });

  // Build (and rebuild after a lost context).
  useEffect(() => {
    if (generation > MAX_REBUILDS) {
      latest.current.onStatus("fallback");
      return;
    }
    let gone = false;
    let built: Engine | null = null;
    let rebuild: ReturnType<typeof setTimeout> | undefined;

    (async () => {
      const [P, { createEngine }] = await Promise.all([import("pixi.js"), import("./engine")]);
      if (gone || !canvas.current || !host.current) return;
      try {
        built = await createEngine(P, canvas.current, host.current, {
          skin: latest.current.skin,
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
        if (gone) return built.dispose();
        await built.setFish(latest.current.fish);
        await built.setBrood(latest.current.brood);
        if (gone) return;
        built.setSelected(latest.current.selected);
        if (latest.current.still) built.still();
        engine.current = built;
        setLost(false);
        latest.current.onStatus("ready");
      } catch (error) {
        if (gone) return;
        console.warn("Tank: using the still picture.", error);
        built?.dispose();
        built = null;
        latest.current.onStatus("fallback");
      }
    })();

    return () => {
      gone = true;
      clearTimeout(rebuild);
      built?.dispose();
      engine.current = null;
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
  useEffect(() => {
    void engine.current?.setLook(skin);
  }, [skin]);
  useEffect(() => {
    engine.current?.setSelected(selected);
  }, [selected]);
  useImperativeHandle(ref, () => ({ hitTest: (x, y) => engine.current?.hitTest(x, y) ?? null }), []);

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
      <canvas key={generation} ref={canvas} className={`block h-full w-full ${lost ? "invisible" : ""}`} />
    </div>
  );
}
