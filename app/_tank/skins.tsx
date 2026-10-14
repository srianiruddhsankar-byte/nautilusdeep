"use client";

import { useId, type CSSProperties, type ReactElement } from "react";

// A tank's whole look lives in a skin. Later phases add deeper-water skins here
// (unlocked by study hours); the tank component itself never changes.
export type TankSkin = {
  id: string;
  name: string;
  Scene: () => ReactElement; // fills the tank, behind the fish
  frame: string; // Tailwind classes for the tank's border/edge
  emptyText: string; // colour of text drawn on top of the water
};

const BUBBLES: { x: number; r: number; dur: string; delay: string }[] = [
  { x: 70, r: 3, dur: "7s", delay: "0s" },
  { x: 78, r: 2, dur: "6s", delay: "-3s" },
  { x: 250, r: 2.5, dur: "8s", delay: "-1.5s" },
  { x: 345, r: 3, dur: "9s", delay: "-5s" },
  { x: 352, r: 1.8, dur: "6.5s", delay: "-2s" },
];

// Five-pointed starfish centred on (cx, cy).
function starPoints(cx: number, cy: number, outer: number, inner: number) {
  return Array.from({ length: 10 }, (_, i) => {
    const r = i % 2 === 0 ? outer : inner;
    const angle = (Math.PI / 5) * i - Math.PI / 2;
    return `${(cx + r * Math.cos(angle)).toFixed(1)},${(cy + r * Math.sin(angle)).toFixed(1)}`;
  }).join(" ");
}

// "Shallows": bright, calm shallow water over a sandy floor.
function ShallowsScene() {
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  return (
    <svg
      className="pointer-events-none absolute inset-0 h-full w-full"
      viewBox="0 0 400 300"
      preserveAspectRatio="xMidYMax slice"
      aria-hidden
    >
      <defs>
        <linearGradient id={`${uid}-water`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#e3f7fb" />
          <stop offset="0.55" stopColor="#ade2ed" />
          <stop offset="1" stopColor="#86d1e1" />
        </linearGradient>
        <linearGradient id={`${uid}-ray`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffffff" stopOpacity="0.55" />
          <stop offset="1" stopColor="#ffffff" stopOpacity="0" />
        </linearGradient>
      </defs>

      <rect width="400" height="300" fill={`url(#${uid}-water)`} />

      {/* sunlight from the surface */}
      <g className="tank-rays">
        <polygon points="60,0 110,0 170,240 90,240" fill={`url(#${uid}-ray)`} />
        <polygon points="190,0 225,0 270,230 210,230" fill={`url(#${uid}-ray)`} />
        <polygon points="300,0 340,0 390,220 320,220" fill={`url(#${uid}-ray)`} />
      </g>
      <path
        d="M0 12 Q 25 6 50 12 T 100 12 T 150 12 T 200 12 T 250 12 T 300 12 T 350 12 T 400 12"
        stroke="#ffffff"
        strokeOpacity="0.7"
        strokeWidth="2"
        fill="none"
      />

      {/* sandy floor, two layers */}
      <path d="M0 236 Q 70 222 140 234 T 280 230 T 400 226 V300 H0 Z" fill="#ecd9a6" />
      <path d="M0 256 Q 80 244 170 254 T 330 250 T 400 248 V300 H0 Z" fill="#f6e8c1" />
      <path
        d="M30 274 q 20 -5 40 0 M120 284 q 25 -6 50 0 M240 272 q 20 -5 40 0 M318 287 q 22 -5 44 0"
        stroke="#e3cd95"
        strokeWidth="2"
        fill="none"
        strokeLinecap="round"
      />

      {/* rocks, a shell and a starfish */}
      <ellipse cx="338" cy="252" rx="30" ry="15" fill="#b9c6c4" />
      <ellipse cx="364" cy="258" rx="18" ry="9" fill="#a5b3b1" />
      <ellipse cx="52" cy="262" rx="14" ry="6" fill="#cbd3d1" />
      <path d="M200 270 q 10 -18 20 0 z" fill="#f8cdbd" />
      <path d="M210 270 v -13 M205 269 l 3 -10 M215 269 l -3 -10" stroke="#eaa58f" strokeWidth="1" />
      <polygon points={starPoints(112, 268, 9, 4)} fill="#f59e7c" />

      {BUBBLES.map((b) => (
        <circle
          key={`${b.x}-${b.dur}`}
          className="tank-bubble"
          cx={b.x}
          cy={292}
          r={b.r}
          fill="none"
          stroke="#ffffff"
          strokeOpacity="0.85"
          style={{ "--dur": b.dur, "--delay": b.delay } as CSSProperties}
        />
      ))}
    </svg>
  );
}

export const SHALLOWS: TankSkin = {
  id: "shallows",
  name: "Shallows",
  Scene: ShallowsScene,
  frame: "border-2 border-sky-200 dark:border-sky-900",
  emptyText: "text-sky-900",
};

export const DEFAULT_SKIN = SHALLOWS;
