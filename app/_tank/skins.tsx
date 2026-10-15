"use client";

import { useId, type CSSProperties, type ReactElement } from "react";
import type { SkinId } from "@/lib/economy";

// A tank's whole look lives in a skin; the tank component itself never changes.
// Skins are unlocked by total focus hours (SKIN_UNLOCKS in lib/economy.ts) and
// chosen per tank. All of them share one scene builder below: water gradient,
// light rays, the surface line, two layers of floor and rising bubbles, plus
// each skin's own scenery. Cosmetic only (water types and species come later).
export type TankSkin = {
  id: SkinId;
  name: string;
  Scene: () => ReactElement; // fills the tank, behind everything
  frame: string; // Tailwind classes for the tank's border/edge
  emptyText: string; // colour of text drawn on top of the water
};

type Palette = {
  water: [string, string, string]; // top → bottom
  rays: number; // sunlight strength, 0 = none
  surface: string;
  floorBack: string;
  floorFront: string;
  floorLines: string;
  bubble: string;
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

function WaterScene({ p, children }: { p: Palette; children?: ReactElement }) {
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
          <stop offset="0" stopColor={p.water[0]} />
          <stop offset="0.55" stopColor={p.water[1]} />
          <stop offset="1" stopColor={p.water[2]} />
        </linearGradient>
        <linearGradient id={`${uid}-ray`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffffff" stopOpacity={p.rays} />
          <stop offset="1" stopColor="#ffffff" stopOpacity="0" />
        </linearGradient>
      </defs>

      <rect width="400" height="300" fill={`url(#${uid}-water)`} />

      {/* sunlight from the surface */}
      {p.rays > 0 && (
        <g className="tank-rays">
          <polygon points="60,0 110,0 170,240 90,240" fill={`url(#${uid}-ray)`} />
          <polygon points="190,0 225,0 270,230 210,230" fill={`url(#${uid}-ray)`} />
          <polygon points="300,0 340,0 390,220 320,220" fill={`url(#${uid}-ray)`} />
        </g>
      )}
      <path
        d="M0 12 Q 25 6 50 12 T 100 12 T 150 12 T 200 12 T 250 12 T 300 12 T 350 12 T 400 12"
        stroke={p.surface}
        strokeOpacity="0.7"
        strokeWidth="2"
        fill="none"
      />

      {/* the floor, two layers */}
      <path d="M0 236 Q 70 222 140 234 T 280 230 T 400 226 V300 H0 Z" fill={p.floorBack} />
      <path d="M0 256 Q 80 244 170 254 T 330 250 T 400 248 V300 H0 Z" fill={p.floorFront} />
      <path
        d="M30 274 q 20 -5 40 0 M120 284 q 25 -6 50 0 M240 272 q 20 -5 40 0 M318 287 q 22 -5 44 0"
        stroke={p.floorLines}
        strokeWidth="2"
        fill="none"
        strokeLinecap="round"
      />

      {children}

      {BUBBLES.map((b) => (
        <circle
          key={`${b.x}-${b.dur}`}
          className="tank-bubble"
          cx={b.x}
          cy={292}
          r={b.r}
          fill="none"
          stroke={p.bubble}
          strokeOpacity="0.85"
          style={{ "--dur": b.dur, "--delay": b.delay } as CSSProperties}
        />
      ))}
    </svg>
  );
}

// ---------- Shallows (default): bright, calm shallow water over a sandy floor ----------

const SHALLOWS_PALETTE: Palette = {
  water: ["#e3f7fb", "#ade2ed", "#86d1e1"],
  rays: 0.55,
  surface: "#ffffff",
  floorBack: "#ecd9a6",
  floorFront: "#f6e8c1",
  floorLines: "#e3cd95",
  bubble: "#ffffff",
};

function ShallowsScene() {
  return (
    <WaterScene p={SHALLOWS_PALETTE}>
      {/* rocks, a shell and a starfish */}
      <g>
        <ellipse cx="338" cy="252" rx="30" ry="15" fill="#b9c6c4" />
        <ellipse cx="364" cy="258" rx="18" ry="9" fill="#a5b3b1" />
        <ellipse cx="52" cy="262" rx="14" ry="6" fill="#cbd3d1" />
        <path d="M200 270 q 10 -18 20 0 z" fill="#f8cdbd" />
        <path d="M210 270 v -13 M205 269 l 3 -10 M215 269 l -3 -10" stroke="#eaa58f" strokeWidth="1" />
        <polygon points={starPoints(112, 268, 9, 4)} fill="#f59e7c" />
      </g>
    </WaterScene>
  );
}

// ---------- Pond: green, still water; reeds at the back, lily pads overhead ----------

function PondScene() {
  return (
    <WaterScene
      p={{
        water: ["#e7f3d8", "#b9d9a8", "#93c08a"],
        rays: 0.35,
        surface: "#f4fbe9",
        floorBack: "#b8a27a",
        floorFront: "#cdb98f",
        floorLines: "#a8916a",
        bubble: "#f4fbe9",
      }}
    >
      <g>
        {[30, 44, 58, 300, 316, 372].map((x, i) => (
          <path
            key={x}
            d={`M${x} 240 Q ${x + (i % 2 ? 6 : -6)} ${170 - (i % 3) * 15} ${x + (i % 2 ? 3 : -3)} ${110 - (i % 3) * 20}`}
            stroke="#6f9a55"
            strokeWidth="3"
            fill="none"
            strokeLinecap="round"
            opacity="0.7"
          />
        ))}
        {/* lily pads seen from below: soft shadows at the surface */}
        <ellipse cx="120" cy="14" rx="34" ry="6" fill="#5f8a45" opacity="0.45" />
        <ellipse cx="270" cy="12" rx="26" ry="5" fill="#5f8a45" opacity="0.4" />
        <ellipse cx="350" cy="258" rx="22" ry="9" fill="#8f8a6a" />
      </g>
    </WaterScene>
  );
}

// ---------- River: clear, cool water over a bed of round stones ----------

function RiverScene() {
  const stones: [number, number, number, number, string][] = [
    [40, 262, 16, 8, "#9ca7a3"],
    [78, 270, 11, 6, "#b6bfbb"],
    [150, 266, 14, 7, "#8c9894"],
    [230, 272, 12, 6, "#a8b2ae"],
    [300, 262, 18, 9, "#97a29e"],
    [356, 270, 13, 7, "#b2bbb7"],
  ];
  return (
    <WaterScene
      p={{
        water: ["#e6f6f8", "#a9dbe3", "#7fc3d1"],
        rays: 0.5,
        surface: "#ffffff",
        floorBack: "#c9bfa4",
        floorFront: "#d9d0b8",
        floorLines: "#bfb497",
        bubble: "#ffffff",
      }}
    >
      <g>
        {/* the current: faint streaks */}
        {[60, 110, 165].map((y, i) => (
          <path
            key={y}
            d={`M${20 + i * 40} ${y} q 40 -6 80 0 t 80 0`}
            stroke="#ffffff"
            strokeOpacity="0.35"
            strokeWidth="2"
            fill="none"
            strokeLinecap="round"
          />
        ))}
        {stones.map(([cx, cy, rx, ry, fill]) => (
          <ellipse key={`${cx}-${cy}`} cx={cx} cy={cy} rx={rx} ry={ry} fill={fill} />
        ))}
      </g>
    </WaterScene>
  );
}

// ---------- Lake: deeper blue-green, a rocky slope fading into the distance ----------

function LakeScene() {
  return (
    <WaterScene
      p={{
        water: ["#d3ebee", "#7fb7c4", "#4f8fa3"],
        rays: 0.3,
        surface: "#eef8fa",
        floorBack: "#a99a78",
        floorFront: "#bcae8a",
        floorLines: "#9c8d6c",
        bubble: "#eef8fa",
      }}
    >
      <g>
        <path d="M0 236 L60 170 L120 205 L170 160 L240 214 V240 H0 Z" fill="#5e8e9b" opacity="0.45" />
        <ellipse cx="320" cy="256" rx="34" ry="14" fill="#7f8e8c" />
        <ellipse cx="350" cy="262" rx="16" ry="8" fill="#6d7c7a" />
      </g>
    </WaterScene>
  );
}

// ---------- Deep: dark water, no sunlight, soft glowing specks ----------

const SPECKS: [number, number, number, string][] = [
  [40, 60, 1.6, "0s"],
  [120, 110, 1.2, "-1.2s"],
  [190, 50, 1.4, "-2.4s"],
  [260, 140, 1.1, "-0.6s"],
  [330, 80, 1.5, "-1.8s"],
  [370, 170, 1.2, "-3s"],
  [80, 190, 1.3, "-2s"],
];

function DeepScene() {
  return (
    <WaterScene
      p={{
        water: ["#21456b", "#132f4f", "#0a1d33"],
        rays: 0,
        surface: "#5f86ad",
        floorBack: "#2c3c4d",
        floorFront: "#364a5e",
        floorLines: "#26364a",
        bubble: "#9cc3e6",
      }}
    >
      <g>
        {SPECKS.map(([cx, cy, r, delay]) => (
          <circle
            key={`${cx}-${cy}`}
            className="deep-glow"
            cx={cx}
            cy={cy}
            r={r}
            fill="#bfe3ff"
            style={{ "--delay": delay } as CSSProperties}
          />
        ))}
        <ellipse cx="330" cy="254" rx="30" ry="13" fill="#24323f" />
      </g>
    </WaterScene>
  );
}

export const SKINS: Record<SkinId, TankSkin> = {
  shallows: {
    id: "shallows",
    name: "Shallows",
    Scene: ShallowsScene,
    frame: "border-2 border-sky-200 dark:border-sky-900",
    emptyText: "text-sky-900",
  },
  pond: {
    id: "pond",
    name: "Pond",
    Scene: PondScene,
    frame: "border-2 border-lime-200 dark:border-lime-900",
    emptyText: "text-lime-950",
  },
  river: {
    id: "river",
    name: "River",
    Scene: RiverScene,
    frame: "border-2 border-cyan-200 dark:border-cyan-900",
    emptyText: "text-cyan-950",
  },
  lake: {
    id: "lake",
    name: "Lake",
    Scene: LakeScene,
    frame: "border-2 border-teal-300 dark:border-teal-900",
    emptyText: "text-teal-950",
  },
  deep: {
    id: "deep",
    name: "Deep",
    Scene: DeepScene,
    frame: "border-2 border-slate-600 dark:border-slate-700",
    emptyText: "text-sky-100",
  },
};

export const SHALLOWS = SKINS.shallows;
export const DEFAULT_SKIN = SHALLOWS;
