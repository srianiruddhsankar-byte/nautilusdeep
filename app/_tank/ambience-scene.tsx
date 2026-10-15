"use client";

import { useState, type CSSProperties, type ReactElement } from "react";
import { useWhaleCalls } from "@/lib/ambience";
import type { AmbienceSound } from "@/lib/ambience-logic";
import "./ambience-scene.css";

// How the tank looks while an ambience plays (a session, or a preview). All the
// scene effects live here and in ambience-scene.css, so the realistic redesign
// can rework them in one place. Calm, subtle, never competing with the timer;
// reduced motion gets still versions. Two layers: "back" sits behind the fish
// and plants, "front" over them. Which scene shows when: sceneFor() in
// lib/ambience-logic.ts.

const v = (vars: Record<string, string>) => vars as CSSProperties;

// Fixed positions (not random), so the scene doesn't jump on every render.
const DROPS = [6, 14, 21, 29, 37, 44, 52, 60, 67, 75, 82, 90, 96].map((x, i) => ({
  x,
  dur: `${0.9 + (i % 4) * 0.18}s`,
  delay: `${-(i * 0.37) % 1.6}s`,
}));
const RIPPLES = [12, 33, 55, 71, 88].map((x, i) => ({ x, dur: "1.8s", delay: `${-i * 0.55}s` }));
const LIGHTS = [
  { left: "5%", dur: "11s", delay: "0s" },
  { left: "45%", dur: "14s", delay: "-6s" },
];
const CURRENTS = [22, 34, 47, 58, 69].map((top, i) => ({ top, dur: `${6 + (i % 3) * 2}s`, delay: `${-i * 2.3}s` }));
const DRIFTERS = [30, 45, 60, 38].map((top, i) => ({
  top,
  size: `${4 + (i % 3)}px`,
  dur: `${9 + i * 2}s`,
  delay: `${-i * 3.1}s`,
}));

export function AmbienceScene({ scene, layer }: { scene: AmbienceSound | null; layer: "back" | "front" }) {
  if (!scene) return null;
  const Layer = SCENES[scene][layer];
  return Layer ? (
    <div className="scene-fade pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      <Layer />
    </div>
  ) : null;
}

function RainFront() {
  return (
    <>
      {DROPS.map((d) => (
        <span key={d.x} className="scene-rain-drop" style={{ left: `${d.x}%`, ...v({ "--dur": d.dur, "--delay": d.delay }) }} />
      ))}
      {RIPPLES.map((r) => (
        <span key={r.x} className="scene-ripple" style={{ left: `${r.x}%`, ...v({ "--dur": r.dur, "--delay": r.delay }) }} />
      ))}
    </>
  );
}

function WavesBack() {
  return (
    <>
      {LIGHTS.map((l) => (
        <span key={l.left} className="scene-light" style={{ left: l.left, ...v({ "--dur": l.dur, "--delay": l.delay }) }} />
      ))}
    </>
  );
}

function WavesFront() {
  return (
    <svg className="absolute inset-x-0 top-0 h-[9%] w-[110%]" viewBox="0 0 440 24" preserveAspectRatio="none">
      <path
        className="scene-surface"
        d="M0 10 Q 27 2 55 10 T 110 10 T 165 10 T 220 10 T 275 10 T 330 10 T 385 10 T 440 10 V0 H0 Z"
        fill="rgb(255 255 255 / 0.28)"
      />
    </svg>
  );
}

// A whale passes once per call. Calls that happened before this tank appeared
// don't replay; each new one starts a fresh pass (keyed by the call count).
function WhalesBack() {
  const calls = useWhaleCalls();
  const [seen] = useState(calls);
  if (calls <= seen) return null;
  return (
    <svg key={calls} className="scene-whale" viewBox="0 0 200 70" aria-hidden>
      <path
        d="M8 38 Q 30 14 90 18 Q 150 20 172 36 L 194 22 L 188 40 L 196 56 L 172 44 Q 150 60 92 58 Q 40 58 22 50 Q 12 46 8 38 Z M 70 56 L 84 68 L 94 57 Z"
        fill="rgb(6 24 46 / 0.22)"
      />
    </svg>
  );
}

function StreamBack() {
  return (
    <>
      {CURRENTS.map((c) => (
        <span key={c.top} className="scene-current" style={{ top: `${c.top}%`, ...v({ "--dur": c.dur, "--delay": c.delay }) }} />
      ))}
    </>
  );
}

function StreamFront() {
  return (
    <div className="absolute inset-0" style={{ containerType: "inline-size" }}>
      {DRIFTERS.map((b) => (
        <span
          key={b.top}
          className="scene-drift-bubble"
          style={{ top: `${b.top}%`, ...v({ "--size": b.size, "--dur": b.dur, "--delay": b.delay }) }}
        />
      ))}
    </div>
  );
}

function NightFront() {
  return <div className="scene-night" />;
}

const SCENES: Record<AmbienceSound, { back?: () => ReactElement | null; front?: () => ReactElement | null }> = {
  rain: { front: RainFront },
  waves: { back: WavesBack, front: WavesFront },
  whales: { back: WhalesBack },
  stream: { back: StreamBack, front: StreamFront },
  night: { front: NightFront },
};
