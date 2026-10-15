"use client";

import type { CSSProperties, ReactElement } from "react";
import { decorationById } from "@/lib/decorations";
import "./tank.css";

// Hand-drawn SVG decorations, in the same flat, soft style as the Shallows
// scenery. Each sits on the sand with its base at the bottom of its box.

type Drawing = { w: number; h: number; art: () => ReactElement };

function star(cx: number, cy: number, outer: number, inner: number) {
  return Array.from({ length: 10 }, (_, i) => {
    const r = i % 2 === 0 ? outer : inner;
    const a = (Math.PI / 5) * i - Math.PI / 2;
    return `${(cx + r * Math.cos(a)).toFixed(1)},${(cy + r * Math.sin(a)).toFixed(1)}`;
  }).join(" ");
}

const DRAWINGS: Record<string, Drawing> = {
  shell: {
    w: 30,
    h: 22,
    art: () => (
      <>
        <path d="M15 21 L3 10 Q15 -3 27 10 Z" fill="#f8cdbd" />
        <path d="M15 21 L9 5 M15 21 V2.5 M15 21 L21 5 M15 21 L5 9 M15 21 L25 9" stroke="#eaa58f" strokeWidth="1" />
        <ellipse cx="15" cy="20.5" rx="3.5" ry="1.5" fill="#eaa58f" />
      </>
    ),
  },
  pebbles: {
    w: 40,
    h: 16,
    art: () => (
      <>
        <ellipse cx="10" cy="11" rx="8" ry="5" fill="#b9c6c4" />
        <ellipse cx="24" cy="12" rx="7" ry="4" fill="#d6dedc" />
        <ellipse cx="33" cy="12.5" rx="5" ry="3.5" fill="#a5b3b1" />
        <ellipse cx="18" cy="7" rx="5" ry="3.5" fill="#cbd3d1" />
      </>
    ),
  },
  starfish: {
    w: 30,
    h: 28,
    art: () => (
      <>
        <polygon points={star(15, 15, 13, 5.5)} fill="#f59e7c" />
        <circle cx="15" cy="15" r="1.4" fill="#fbd0bd" />
        <circle cx="15" cy="8" r="0.9" fill="#fbd0bd" />
        <circle cx="21.5" cy="13" r="0.9" fill="#fbd0bd" />
        <circle cx="8.5" cy="13" r="0.9" fill="#fbd0bd" />
      </>
    ),
  },
  driftwood: {
    w: 70,
    h: 26,
    art: () => (
      <>
        <path d="M2 22 Q20 14 40 17 T68 12 L69 16 Q50 20 38 22 T3 26 Z" fill="#a47c55" />
        <path d="M34 18 Q40 8 50 3 L52 5 Q44 10 39 18 Z" fill="#8f6a46" />
        <path d="M10 22 Q25 18 40 20 M44 18 Q55 15 64 14" stroke="#c49c72" strokeWidth="1" fill="none" />
      </>
    ),
  },
  "rock-arch": {
    w: 70,
    h: 46,
    art: () => (
      <>
        <path d="M2 46 Q2 4 35 4 Q68 4 68 46 H52 Q52 20 35 20 Q18 20 18 46 Z" fill="#9fb0ae" />
        <path d="M8 40 Q10 14 30 9" stroke="#c3cfcd" strokeWidth="3" fill="none" strokeLinecap="round" />
        <ellipse cx="60" cy="44" rx="9" ry="3" fill="#8a9b99" />
      </>
    ),
  },
  bubbler: {
    w: 26,
    h: 70,
    art: () => (
      <>
        {[0, 1, 2].map((i) => (
          <circle
            key={i}
            className="decor-bubble"
            cx={13 + (i - 1) * 2}
            cy={58}
            r={2.5 - i * 0.4}
            fill="none"
            stroke="#ffffff"
            strokeOpacity="0.9"
            style={{ "--delay": `${-i * 0.7}s` } as CSSProperties}
          />
        ))}
        <ellipse cx="13" cy="64" rx="11" ry="6" fill="#8a9b99" />
        <ellipse cx="13" cy="62" rx="3" ry="1.5" fill="#5e6d6b" />
      </>
    ),
  },
  "treasure-chest": {
    w: 40,
    h: 32,
    art: () => (
      <>
        <rect x="3" y="14" width="34" height="17" rx="2" fill="#a0693a" />
        <path d="M3 15 Q3 3 20 3 Q37 3 37 15 Z" fill="#b57b45" />
        <path d="M5 13 L35 13" stroke="#ffd36b" strokeWidth="3" />
        <rect x="17" y="12" width="6" height="9" rx="1" fill="#ffd36b" />
        <path d="M9 14 V31 M31 14 V31" stroke="#8a5a30" strokeWidth="2" />
      </>
    ),
  },
  shipwreck: {
    w: 90,
    h: 52,
    art: () => (
      <>
        <path d="M4 40 Q20 50 70 46 L86 30 L80 28 L66 38 Q30 40 8 32 Z" fill="#7b5a3f" />
        <path d="M8 34 Q30 41 66 38" stroke="#5f442f" strokeWidth="2" fill="none" />
        <path d="M40 40 L48 6" stroke="#6b4e36" strokeWidth="3" strokeLinecap="round" />
        <path d="M47 11 L60 16 L45 19 Z" fill="#d9d2c0" opacity="0.7" />
        {[24, 38, 52].map((x) => (
          <circle key={x} cx={x} cy={43 - (x - 24) * 0.05} r="2.4" fill="#3e2e20" />
        ))}
      </>
    ),
  },
  "pearl-clam": {
    w: 32,
    h: 24,
    art: () => (
      <>
        <path d="M3 22 Q16 26 29 22 Q28 14 16 14 Q4 14 3 22 Z" fill="#c9b6d8" />
        <path d="M4 15 Q8 2 20 4 Q30 6 28 14 Q16 10 4 15 Z" fill="#dccbe8" />
        <circle cx="16" cy="16.5" r="3.6" fill="#ffffff" />
        <circle cx="15" cy="15.4" r="1.2" fill="#f0e8ff" />
      </>
    ),
  },
  anchor: {
    w: 30,
    h: 38,
    art: () => (
      <g stroke="#5b6b7a" strokeWidth="3" fill="none" strokeLinecap="round">
        <circle cx="15" cy="5" r="3" />
        <path d="M15 8 V34 M8 13 H22" />
        <path d="M3 25 Q5 35 15 35 Q25 35 27 25" />
      </g>
    ),
  },
  bottle: {
    w: 32,
    h: 20,
    art: () => (
      <>
        <path d="M2 10 Q2 4 8 4 H20 L25 7 H28 V13 H25 L20 16 H8 Q2 16 2 10 Z" fill="#7fc8a9" opacity="0.85" />
        <rect x="27" y="7.5" width="4" height="5" rx="1" fill="#b08a5a" />
        <rect x="7" y="7" width="11" height="6" rx="1.5" fill="#f3ead2" />
      </>
    ),
  },
  "moss-ball": {
    w: 24,
    h: 22,
    art: () => (
      <>
        <circle cx="12" cy="12" r="10" fill="#4f8f3a" />
        <circle cx="9" cy="9" r="4" fill="#65a84d" />
        {[
          [14, 7],
          [17, 13],
          [8, 15],
          [12, 17],
          [5, 11],
        ].map(([x, y]) => (
          <circle key={`${x}-${y}`} cx={x} cy={y} r="1" fill="#3d7a2c" />
        ))}
      </>
    ),
  },
};

export function DecorationSprite({ item, width }: { item: string; width?: number }) {
  const drawing = DRAWINGS[item];
  if (!drawing) return null;
  const w = width ?? decorationById(item)?.width ?? drawing.w;
  return (
    <svg width={w} height={(w * drawing.h) / drawing.w} viewBox={`0 0 ${drawing.w} ${drawing.h}`} aria-hidden>
      <drawing.art />
    </svg>
  );
}
