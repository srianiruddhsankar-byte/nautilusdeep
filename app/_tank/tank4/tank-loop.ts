"use client";

import { type RefObject, useEffect, useRef, useSyncExternalStore } from "react";

// The tank's animation loop.
// - Runs on requestAnimationFrame, optionally capped (30 fps saves battery).
// - STOPS when the tab is hidden, the window loses focus (you're in another
//   app) or the tank is off screen, and starts again when it's back (time while
//   stopped is skipped, not fast-forwarded).
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
    let focused = document.hasFocus();
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
      if (raf || document.hidden || !onScreen || !focused) return;
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
    const onFocus = () => {
      focused = true;
      start();
    };
    const onBlur = () => {
      focused = false;
      stop();
    };
    io.observe(el);
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("focus", onFocus);
    window.addEventListener("blur", onBlur);
    latest.current.onFrame(0, performance.now() / 1000);
    start();
    return () => {
      stop();
      io.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("blur", onBlur);
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
