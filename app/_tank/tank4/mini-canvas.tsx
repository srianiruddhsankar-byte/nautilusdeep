"use client";

import { type ReactNode, useEffect, useRef, useState } from "react";
import { startCanvas } from "@/lib/canvas-life";
import type { Mini, MiniScene } from "./mini";
import { useReducedMotion, useTankLoop } from "./tank-loop";

// The result screen's small Pixi stage (mini.ts): the hatching reveal and the
// drifting egg, in the tank's art. Until it's ready, and for good if WebGL is
// missing or the GPU drops it, `fallback` (the old drawing) shows instead.
// Silhouettes take the text colour (`text-ink` here), so dark mode works.
// `className` must position it (relative or absolute) and size it.

export function MiniCanvas({ scene, className, fallback }: { scene: MiniScene; className: string; fallback: ReactNode }) {
  const host = useRef<HTMLDivElement>(null);
  const slot = useRef<HTMLDivElement>(null); // where each build's own canvas goes
  const mini = useRef<Mini | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "fallback">("loading");
  const still = useReducedMotion();
  const latest = useRef({ scene, still });
  useEffect(() => {
    latest.current = { scene, still };
  });

  // A brand-new canvas every time it starts (also when Next shows a hidden
  // page again): a canvas whose context was destroyed can't be reused
  // (lib/canvas-life.ts). It goes into `slot`; stopping removes it.
  useEffect(() => {
    const where = slot.current;
    const h = host.current;
    if (!where || !h) return;
    setStatus("loading");
    const stop = startCanvas({
      create: () => {
        const c = document.createElement("canvas");
        c.className = "absolute inset-0 block h-full w-full";
        where.appendChild(c);
        return c;
      },
      remove: (c) => c.remove(),
      build: async (c, stopped) => {
        const [P, { createMini }] = await Promise.all([import("pixi.js"), import("./mini")]);
        if (stopped()) throw new Error("left before it started");
        const built = await createMini(P, c, h, {
          ink: () => colourOf(getComputedStyle(h).color),
          onContextLost: () => setStatus("fallback"),
        });
        try {
          await built.show(latest.current.scene);
        } catch (error) {
          built.dispose();
          throw error;
        }
        return built;
      },
      ready: (built) => {
        if (latest.current.still) built.still();
        mini.current = built;
        setStatus("ready");
      },
      failed: (error) => {
        console.warn("Result: using the plain drawing.", error);
        setStatus("fallback");
      },
    });
    return () => {
      mini.current = null;
      stop();
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
      <div ref={slot} className={`absolute inset-0 ${status === "ready" ? "" : "invisible"}`} />
      {status !== "ready" && <div className="absolute inset-0 flex items-center justify-center">{fallback}</div>}
    </div>
  );
}

// "rgb(30, 43, 56)" → 0x1e2b38
function colourOf(css: string) {
  const [r = 30, g = 43, b = 56] = (css.match(/\d+(\.\d+)?/g) ?? []).map(Number);
  return (Math.round(r) << 16) | (Math.round(g) << 8) | Math.round(b);
}
