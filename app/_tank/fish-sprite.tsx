"use client";

import { useId } from "react";
import type { FishSize } from "@/lib/fish";
import type { FishLook } from "@/lib/fish-look";
import "./tank.css";

// Hand-drawn SVG fish and bone. Fish face right; the tank flips them. (Eggs and fry: brood.tsx.)

export const FISH_WIDTH: Record<FishSize, number> = {
  small: 30,
  medium: 42,
  large: 58,
  rare: 70,
};

// Drawing area (64 × 40) plus 4 units of padding so fins and sparkles aren't clipped.
const PAD = 4;
const VIEW = { x: -PAD, y: -PAD, w: 64 + 2 * PAD, h: 40 + 2 * PAD };
export const fishHeight = (width: number) => (width * VIEW.h) / VIEW.w;

const BODY = "M9 20 C 16 7, 38 5, 52 13 C 58 16, 59 24, 52 27 C 38 35, 16 33, 9 20 Z";
const TAILS = {
  fork: "M11 20 L1 7 L5 20 L1 33 Z",
  round: "M12 20 C 3 9, 0 13, 1 20 C 0 27, 3 31, 12 20 Z",
  fan: "M12 20 L2 5 Q 6 20 2 35 Z",
};
const RARE_TAIL = "M12 20 C 4 2, -4 0, -2 12 Q 3 20 -2 28 C -4 40, 4 38, 12 20 Z";
const SPOTS: [number, number, number][] = [
  [24, 15, 2.6],
  [33, 22, 2.2],
  [41, 14, 1.8],
  [29, 27, 1.6],
  [45, 22, 1.5],
];
const SPARKLE = "M0 -4 L1 -1 L4 0 L1 1 L0 4 L-1 1 L-4 0 L-1 -1 Z";

export function FishSprite({
  look,
  size,
  width,
  dead = false,
}: {
  look: FishLook;
  size: FishSize;
  width?: number;
  dead?: boolean;
}) {
  // SVG ids must be unique on the page; useId's ":" characters aren't safe in url(#…).
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const w = width ?? FISH_WIDTH[size];
  const rare = size === "rare";

  const bodyFill = rare ? `url(#${uid}-rare)` : `hsl(${look.hue} 75% 58%)`;
  const accent = `hsl(${look.accentHue} 80% 45%)`;
  const fin = rare ? "hsl(285 80% 82% / 0.85)" : `hsl(${look.hue} 70% 46%)`;

  return (
    <svg
      width={w}
      height={fishHeight(w)}
      viewBox={`${VIEW.x} ${VIEW.y} ${VIEW.w} ${VIEW.h}`}
      className={rare && !dead ? "fish-rare" : undefined}
      aria-hidden
    >
      <defs>
        <clipPath id={`${uid}-body`}>
          <path d={BODY} />
        </clipPath>
        {rare && (
          <linearGradient id={`${uid}-rare`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#fde68a" />
            <stop offset="0.4" stopColor="#fbbf24" />
            <stop offset="0.75" stopColor="#f472b6" />
            <stop offset="1" stopColor="#a78bfa" />
          </linearGradient>
        )}
      </defs>

      <path className="fish-tail" d={rare ? RARE_TAIL : TAILS[look.tail]} fill={fin} />
      {/* dorsal fin (rare fish get a tall sail) */}
      <path d={rare ? "M18 11 Q 28 -6 48 11 Z" : "M24 9 Q 32 1 42 9 Z"} fill={fin} />
      <path d={BODY} fill={bodyFill} />

      <g clipPath={`url(#${uid}-body)`}>
        {!rare && look.pattern === "stripes" &&
          [22, 31, 40].map((x) => (
            <rect key={x} x={x} y={0} width={3.5} height={40} fill={accent} opacity={0.85} />
          ))}
        {!rare && look.pattern === "spots" &&
          SPOTS.map(([cx, cy, r]) => (
            <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r={r} fill={accent} opacity={0.85} />
          ))}
        {!rare && look.pattern === "twoTone" && (
          <path d="M0 21 H64 V40 H0 Z" fill={`hsl(${look.accentHue} 85% 82%)`} />
        )}
        {/* soft belly highlight on every fish */}
        <ellipse cx={32} cy={26} rx={16} ry={4} fill="white" opacity={0.25} />
      </g>

      {/* pectoral fin */}
      <path d="M34 24 Q 30 32 25 27 Z" fill={fin} opacity={0.9} />

      {/* eye */}
      {dead ? (
        <path d="M47 15 l4 4 m0 -4 l-4 4" stroke="#334155" strokeWidth={1.4} strokeLinecap="round" />
      ) : (
        <>
          <circle cx={49} cy={17} r={2.6} fill="white" />
          <circle cx={49.6} cy={17} r={1.4} fill="#0f172a" />
        </>
      )}

      {rare && !dead &&
        [
          [58, 4, "0s"],
          [6, 0, "0.5s"],
          [34, 38, "1s"],
        ].map(([x, y, delay]) => (
          <path
            key={`${x}`}
            className="fish-sparkle"
            d={SPARKLE}
            transform={`translate(${x} ${y})`}
            fill="#fef9c3"
            style={{ animationDelay: delay as string }}
          />
        ))}
    </svg>
  );
}

export function Bone({ width = 20 }: { width?: number }) {
  return (
    <svg width={width} height={(width * 16) / 40} viewBox="0 0 40 16" aria-hidden>
      <g fill="#d6d3d1" transform="translate(0.8 1)">
        <circle cx={5} cy={4} r={4} />
        <circle cx={5} cy={11} r={4} />
        <circle cx={34} cy={4} r={4} />
        <circle cx={34} cy={11} r={4} />
        <rect x={5} y={4} width={29} height={7} />
      </g>
      <g fill="#f5f5f4">
        <circle cx={5} cy={4} r={4} />
        <circle cx={5} cy={11} r={4} />
        <circle cx={34} cy={4} r={4} />
        <circle cx={34} cy={11} r={4} />
        <rect x={5} y={4} width={29} height={7} />
      </g>
    </svg>
  );
}
