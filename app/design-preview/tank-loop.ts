"use client";

import { type RefObject, useEffect, useRef, useSyncExternalStore } from "react";

// One animation loop for every tank preview.
// - Runs on requestAnimationFrame, optionally capped (30 fps saves battery).
// - STOPS when the tab is hidden or the tank is off screen, and starts again
//   when it's back (time while stopped is skipped, not fast-forwarded).
// - Reduced motion: never runs; draws one still frame instead.
// - Measures itself: frames per second and the script time per frame.

export type LoopStats = { fps: number; ms: number; running: boolean };

type Probe = { frames: number; workMs: number; running: boolean; hiddenStops: number };

declare global {
  interface Window {
    __tanks?: Record<string, Probe>;
  }
}

type Options = {
  id: string;
  still: boolean;
  maxFps: number;
  onFrame: (dt: number, t: number) => void;
  onStill: () => void;
  onStats: (s: LoopStats) => void;
};

export function useTankLoop(host: RefObject<HTMLElement | null>, options: Options) {
  const latest = useRef(options);
  useEffect(() => {
    latest.current = options;
  });

  const { id, still, maxFps } = options;

  useEffect(() => {
    const el = host.current;
    if (!el) return;
    const probes = (window.__tanks ??= {});
    const probe: Probe = (probes[id] = { frames: 0, workMs: 0, running: false, hiddenStops: 0 });

    if (still) {
      latest.current.onStill();
      latest.current.onStats({ fps: 0, ms: 0, running: false });
      return;
    }

    let raf = 0;
    let last = 0;
    let onScreen = true;
    let winFrames = 0;
    let winWork = 0;
    let winStart = performance.now();
    const minGap = maxFps >= 60 ? 0 : 1000 / maxFps - 3;

    const tick = (now: number) => {
      raf = requestAnimationFrame(tick);
      if (minGap && now - last < minGap) return;
      const dt = Math.min(0.1, Math.max(0, (now - last) / 1000)); // a frame can be timestamped just before start
      last = now;
      const t0 = performance.now();
      latest.current.onFrame(dt, now / 1000);
      const work = performance.now() - t0;
      probe.frames++;
      probe.workMs += work;
      winFrames++;
      winWork += work;
      if (now - winStart >= 1000) {
        latest.current.onStats({ fps: (winFrames * 1000) / (now - winStart), ms: winWork / winFrames, running: true });
        winStart = now;
        winFrames = 0;
        winWork = 0;
      }
    };
    const start = () => {
      if (raf || document.hidden || !onScreen) return;
      last = performance.now();
      winStart = last;
      winFrames = 0;
      winWork = 0;
      probe.running = true;
      raf = requestAnimationFrame(tick);
    };
    const stop = () => {
      if (!raf) return;
      cancelAnimationFrame(raf);
      raf = 0;
      probe.running = false;
      latest.current.onStats({ fps: 0, ms: 0, running: false });
    };
    const onVisibility = () => {
      if (document.hidden) {
        probe.hiddenStops++;
        stop();
      } else start();
    };
    const io = new IntersectionObserver(([entry]) => {
      onScreen = entry.isIntersecting;
      if (onScreen) start();
      else stop();
    });
    io.observe(el);
    document.addEventListener("visibilitychange", onVisibility);
    latest.current.onFrame(0, performance.now() / 1000);
    start();
    return () => {
      stop();
      io.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [host, id, still, maxFps]);
}

const QUERY = "(prefers-reduced-motion: reduce)";

export function useReducedMotion() {
  return useSyncExternalStore(
    (cb) => {
      const m = window.matchMedia(QUERY);
      m.addEventListener("change", cb);
      return () => m.removeEventListener("change", cb);
    },
    () => window.matchMedia(QUERY).matches,
    () => false,
  );
}

// A seamless tile of caustic light (bright lines where light focuses), made
// once in the browser from cell noise. White on transparent.
export function causticTile(size: number, seed: number): HTMLCanvasElement {
  let a = seed >>> 0;
  const rnd = () => {
    a = (a * 1664525 + 1013904223) >>> 0;
    return a / 4294967296;
  };
  const cells = 6;
  const pts: [number, number][] = [];
  for (let y = 0; y < cells; y++) for (let x = 0; x < cells; x++) pts.push([(x + rnd()) / cells, (y + rnd()) / cells]);
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  const img = ctx.createImageData(size, size);
  for (let py = 0; py < size; py++) {
    for (let px = 0; px < size; px++) {
      const u = px / size;
      const v = py / size;
      let d1 = 9;
      let d2 = 9;
      for (const [cx, cy] of pts) {
        // wrap around so the tile repeats with no seam
        let dx = Math.abs(u - cx);
        let dy = Math.abs(v - cy);
        if (dx > 0.5) dx = 1 - dx;
        if (dy > 0.5) dy = 1 - dy;
        const d = dx * dx + dy * dy;
        if (d < d1) {
          d2 = d1;
          d1 = d;
        } else if (d < d2) d2 = d;
      }
      const edge = (Math.sqrt(d2) - Math.sqrt(d1)) * cells;
      const glow = Math.pow(Math.max(0, 1 - edge / 0.22), 2.6);
      const i = (py * size + px) * 4;
      img.data[i] = img.data[i + 1] = img.data[i + 2] = 255;
      img.data[i + 3] = Math.round(glow * 255);
    }
  }
  ctx.putImageData(img, 0, 0);
  return canvas;
}
