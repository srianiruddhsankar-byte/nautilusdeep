"use client";

import { type ReactNode, useEffect, useRef, useState } from "react";
import type { Mini, MiniScene } from "./mini";
import { useReducedMotion, useTankLoop } from "./tank-loop";

// The result screen's small Pixi stage (mini.ts): the hatching reveal and the
// drifting egg, in the tank's art. Until it's ready, and for good if WebGL is
// missing or the GPU drops it, `fallback` (the old drawing) shows instead.
// Silhouettes take the text colour (`text-ink` here), so dark mode works.
// `className` must position it (relative or absolute) and size it.

export function MiniCanvas({ scene, className, fallback }: { scene: MiniScene; className: string; fallback: ReactNode }) {
  const host = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const mini = useRef<Mini | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "fallback">("loading");
  const still = useReducedMotion();
  const latest = useRef({ scene, still });
  useEffect(() => {
    latest.current = { scene, still };
  });

  useEffect(() => {
    let gone = false;
    let built: Mini | null = null;
    (async () => {
      const [P, { createMini }] = await Promise.all([import("pixi.js"), import("./mini")]);
      if (gone || !canvas.current || !host.current) return;
      try {
        const h = host.current;
        built = await createMini(P, canvas.current, h, {
          ink: () => colourOf(getComputedStyle(h).color),
          onContextLost: () => setStatus("fallback"),
        });
        if (gone) return built.dispose();
        await built.show(latest.current.scene);
        if (gone) return;
        if (latest.current.still) built.still();
        mini.current = built;
        setStatus("ready");
      } catch (error) {
        if (gone) return;
        console.warn("Result: using the plain drawing.", error);
        built?.dispose();
        built = null;
        setStatus("fallback");
      }
    })();
    return () => {
      gone = true;
      built?.dispose();
      mini.current = null;
    };
  }, []);

  const sceneKey = JSON.stringify(scene);
  useEffect(() => {
    void mini.current?.show(latest.current.scene);
  }, [sceneKey]);

  useTankLoop(host, {
    id: "result",
    still,
    maxFps: 30,
    onFrame: (dt) => mini.current?.frame(dt),
    onStill: () => mini.current?.still(),
    onStats: () => {},
  });

  return (
    <div ref={host} className={`text-ink ${className}`} aria-hidden>
      {status !== "fallback" && <canvas ref={canvas} className={`absolute inset-0 block h-full w-full ${status === "ready" ? "" : "invisible"}`} />}
      {status !== "ready" && <div className="absolute inset-0 flex items-center justify-center">{fallback}</div>}
    </div>
  );
}

// "rgb(30, 43, 56)" → 0x1e2b38
function colourOf(css: string) {
  const [r = 30, g = 43, b = 56] = (css.match(/\d+(\.\d+)?/g) ?? []).map(Number);
  return (Math.round(r) << 16) | (Math.round(g) << 8) | Math.round(b);
}
