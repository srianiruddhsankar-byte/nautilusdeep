"use client";

import { useId, type ReactNode } from "react";
import { NAUTILUS, speciesById, type SpeciesId } from "@/lib/species";
import "./tank.css";

// Simple hand-drawn SVG species, the nautilus, and the bone. Everything faces
// right; the tank flips them. (Eggs and fry: brood.tsx.) The realistic redesign
// will replace these drawings; the rest of the app only uses SpeciesSprite.
//
// Every drawing paints through `c(colour)`, so a silhouette is the same drawing
// with every colour swapped for `currentColor` (and no eye).

type Paint = (colour: string) => string;
type Drawing = { view: [number, number]; draw: (c: Paint, uid: string) => ReactNode };

const eye = (c: Paint, x: number, y: number, r = 2.2) =>
  c("eye") === "currentColor" ? null : (
    <>
      <circle cx={x} cy={y} r={r} fill="white" />
      <circle cx={x + 0.4} cy={y} r={r * 0.55} fill="#0f172a" />
    </>
  );

const DRAWINGS: Record<SpeciesId, Drawing> = {
  green_chromis: {
    view: [64, 40],
    draw: (c) => (
      <>
        <path className="fish-tail" d="M13 20 L2 8 L7 20 L2 32 Z" fill={c("#5cc8b8")} />
        <path d="M24 11 Q34 3 46 12 Z" fill={c("#5cc8b8")} />
        <path d="M10 20 C18 9, 40 8, 54 16 C58 18, 58 22, 54 24 C40 32, 18 31, 10 20 Z" fill={c("#8fe3d2")} />
        <path d="M14 22 C26 28, 42 28, 54 23 C42 30, 22 31, 14 22 Z" fill={c("#d5f7ef")} />
        <path d="M32 24 Q28 31 24 26 Z" fill={c("#5cc8b8")} />
        {eye(c, 49, 17)}
      </>
    ),
  },
  blue_damselfish: {
    view: [64, 40],
    draw: (c) => (
      <>
        <path className="fish-tail" d="M13 20 L3 9 Q7 20 3 31 Z" fill={c("#1d4ed8")} />
        <path d="M20 10 Q34 0 48 11 Z" fill={c("#1d4ed8")} />
        <path d="M22 30 Q32 38 42 30 Z" fill={c("#1d4ed8")} />
        <path d="M10 20 C16 7, 40 5, 52 15 C57 18, 57 23, 52 26 C40 34, 16 33, 10 20 Z" fill={c("#2f6bff")} />
        <ellipse cx={34} cy={15} rx={12} ry={3} fill={c("#7aa7ff")} opacity={0.6} />
        {eye(c, 48, 17)}
      </>
    ),
  },
  royal_gramma: {
    view: [64, 40],
    draw: (c, uid) => (
      <>
        <defs>
          <clipPath id={`${uid}-gramma`}>
            <path d="M10 20 C18 10, 40 9, 54 16 C58 18, 58 22, 54 24 C40 31, 18 30, 10 20 Z" />
          </clipPath>
        </defs>
        <path className="fish-tail" d="M12 20 C4 10, 1 13, 2 20 C1 27, 4 30, 12 20 Z" fill={c("#facc15")} />
        <path d="M18 13 Q34 5 50 14 Z" fill={c("#a855f7")} />
        <path d="M10 20 C18 10, 40 9, 54 16 C58 18, 58 22, 54 24 C40 31, 18 30, 10 20 Z" fill={c("#facc15")} />
        <rect x={31} y={0} width={34} height={40} fill={c("#9333ea")} clipPath={`url(#${uid}-gramma)`} />
        <path d="M50 17 L57 15" stroke={c("#1f2937")} strokeWidth={1} />
        {eye(c, 49, 18)}
      </>
    ),
  },
  sergeant_major: {
    view: [64, 40],
    draw: (c, uid) => (
      <>
        <defs>
          <clipPath id={`${uid}-sgt`}>
            <path d="M10 20 C16 6, 40 4, 52 14 C57 18, 57 23, 52 26 C40 35, 16 34, 10 20 Z" />
          </clipPath>
        </defs>
        <path className="fish-tail" d="M13 20 L2 8 L7 20 L2 32 Z" fill={c("#d9d38a")} />
        <path d="M18 10 Q32 -1 48 10 Z" fill={c("#d9d38a")} />
        <path d="M10 20 C16 6, 40 4, 52 14 C57 18, 57 23, 52 26 C40 35, 16 34, 10 20 Z" fill={c("#ece7a6")} />
        <g clipPath={`url(#${uid}-sgt)`} fill={c("#1f2937")} opacity={0.8}>
          {[17, 25, 33, 41].map((x) => (
            <rect key={x} x={x} y={0} width={3.2} height={40} />
          ))}
        </g>
        {eye(c, 48, 17)}
      </>
    ),
  },
  clownfish: {
    view: [64, 40],
    draw: (c, uid) => (
      <>
        <defs>
          <clipPath id={`${uid}-clown`}>
            <path d="M10 20 C15 8, 40 6, 52 15 C57 18, 57 23, 52 26 C40 34, 15 32, 10 20 Z" />
          </clipPath>
        </defs>
        <path className="fish-tail" d="M12 20 C3 8, 0 12, 1 20 C0 28, 3 32, 12 20 Z" fill={c("#f97316")} stroke={c("#111827")} strokeWidth={1} />
        <path d="M20 11 Q26 2 32 9 Q38 3 46 12 Z" fill={c("#f97316")} stroke={c("#111827")} strokeWidth={1} />
        <path d="M10 20 C15 8, 40 6, 52 15 C57 18, 57 23, 52 26 C40 34, 15 32, 10 20 Z" fill={c("#fb7a1d")} />
        <g clipPath={`url(#${uid}-clown)`}>
          {[
            [42, 5],
            [28, 5],
            [14, 4],
          ].map(([x, w]) => (
            <rect key={x} x={x} y={0} width={w} height={40} fill={c("#ffffff")} stroke={c("#111827")} strokeWidth={1.2} />
          ))}
        </g>
        <path d="M34 25 Q30 33 25 28 Z" fill={c("#f97316")} stroke={c("#111827")} strokeWidth={0.8} />
        {eye(c, 50, 17)}
      </>
    ),
  },
  pufferfish: {
    view: [64, 40],
    draw: (c) => (
      <>
        <path className="fish-tail" d="M16 20 L6 13 Q9 20 6 27 Z" fill={c("#c9b47c")} />
        <path d="M28 6 Q32 2 36 6 Z" fill={c("#c9b47c")} />
        <circle cx={34} cy={21} r={16} fill={c("#e8d9a8")} />
        <path d="M20 26 C26 36, 44 37, 49 27 C44 34, 26 34, 20 26 Z" fill={c("#fbf6e4")} />
        {[
          [26, 14],
          [33, 11],
          [40, 14],
          [29, 20],
          [37, 19],
          [24, 22],
          [44, 21],
        ].map(([x, y]) => (
          <circle key={`${x}-${y}`} cx={x} cy={y} r={1.6} fill={c("#6b5b3e")} />
        ))}
        <path d="M38 24 Q35 30 31 26 Z" fill={c("#c9b47c")} />
        <path d="M49 25 Q51 26 49 27" stroke={c("#6b5b3e")} strokeWidth={1} fill="none" />
        {eye(c, 45, 16, 2.8)}
      </>
    ),
  },
  seahorse: {
    view: [34, 48],
    draw: (c) => (
      <>
        <path
          d="M17 31 C17 38, 12 41, 14 45 C16 48, 22 46, 20 42 C19 40, 16 41, 17 43"
          stroke={c("#f59e0b")}
          strokeWidth={3.2}
          fill="none"
          strokeLinecap="round"
        />
        <path d="M12 18 Q6 22 11 27 Z" fill={c("#fbbf24")} className="fish-tail" />
        <path
          d="M13 9 C14 3, 22 2, 25 7 L32 9 L32 12.5 L24.5 13 C25 18, 24 24, 21 30 C19 34, 15 34, 13 30 C11 25, 14 20, 13 15 Z"
          fill={c("#f59e0b")}
        />
        {[18, 22, 26].map((y) => (
          <path key={y} d={`M15 ${y} Q19 ${y + 1.5} 23 ${y}`} stroke={c("#d97706")} strokeWidth={0.9} fill="none" />
        ))}
        <path d="M15 4 L14 0 L18 3 Z" fill={c("#d97706")} />
        {eye(c, 21, 8, 1.8)}
      </>
    ),
  },
  emperor_angelfish: {
    view: [64, 40],
    draw: (c, uid) => (
      <>
        <defs>
          <clipPath id={`${uid}-emp`}>
            <path d="M10 20 C14 5, 40 3, 52 14 C57 18, 57 23, 52 26 C40 37, 14 35, 10 20 Z" />
          </clipPath>
        </defs>
        <path className="fish-tail" d="M12 20 C4 8, 0 12, 1 20 C0 28, 4 32, 12 20 Z" fill={c("#fde047")} />
        <path d="M14 13 Q30 -2 46 10 Z" fill={c("#1e3a8a")} />
        <path d="M10 20 C14 5, 40 3, 52 14 C57 18, 57 23, 52 26 C40 37, 14 35, 10 20 Z" fill={c("#1e40af")} />
        <g clipPath={`url(#${uid}-emp)`} stroke={c("#fde047")} strokeWidth={1.8}>
          {[-8, -2, 4, 10, 16, 22, 28].map((o) => (
            <path key={o} d={`M${o} 40 L${o + 34} 0`} />
          ))}
          {/* the dark mask over the eye */}
          <rect x={44} y={0} width={5} height={40} fill={c("#0f172a")} stroke="none" />
          <rect x={49} y={0} width={10} height={40} fill={c("#93c5fd")} stroke="none" />
        </g>
        {eye(c, 50, 17)}
      </>
    ),
  },
  lionfish: {
    view: [64, 44],
    draw: (c, uid) => (
      <>
        <defs>
          <clipPath id={`${uid}-lion`}>
            <path d="M10 24 C18 14, 40 12, 54 19 C58 21, 58 26, 54 28 C40 35, 18 34, 10 24 Z" />
          </clipPath>
        </defs>
        {/* the tall venomous spines */}
        <g stroke={c("#b91c1c")} strokeWidth={1.1} strokeLinecap="round">
          {[18, 23, 28, 33, 38, 43].map((x, i) => (
            <path key={x} d={`M${x} 17 L${x - 6 + i} ${2 + (i % 2) * 3}`} />
          ))}
        </g>
        {/* the feathery fan of pectoral fins */}
        <g stroke={c("#fca5a5")} strokeWidth={1.2} strokeLinecap="round">
          {[0, 1, 2, 3, 4].map((i) => (
            <path key={i} d={`M34 28 L${18 + i * 4} ${42 - (i % 2) * 2}`} />
          ))}
        </g>
        <path className="fish-tail" d="M12 24 L2 15 Q6 24 2 33 Z" fill={c("#fecaca")} />
        <path d="M10 24 C18 14, 40 12, 54 19 C58 21, 58 26, 54 28 C40 35, 18 34, 10 24 Z" fill={c("#fff1f2")} />
        <g clipPath={`url(#${uid}-lion)`} fill={c("#b91c1c")}>
          {[14, 21, 28, 35, 42, 49].map((x) => (
            <rect key={x} x={x} y={0} width={3.4} height={44} />
          ))}
        </g>
        {eye(c, 50, 21)}
      </>
    ),
  },
  mandarinfish: {
    view: [64, 40],
    draw: (c, uid) => (
      <>
        <defs>
          <clipPath id={`${uid}-mand`}>
            <path d="M10 22 C16 11, 40 9, 52 16 C57 19, 57 24, 52 27 C40 34, 16 33, 10 22 Z" />
          </clipPath>
        </defs>
        <path className="fish-tail" d="M12 22 C3 11, 0 15, 1 22 C0 29, 3 33, 12 22 Z" fill={c("#f97316")} />
        <path d="M22 12 Q30 2 40 12 Z" fill={c("#2563eb")} stroke={c("#f97316")} strokeWidth={1} />
        <path d="M10 22 C16 11, 40 9, 52 16 C57 19, 57 24, 52 27 C40 34, 16 33, 10 22 Z" fill={c("#2563eb")} />
        <g clipPath={`url(#${uid}-mand)`} stroke={c("#fb923c")} strokeWidth={2} fill="none" strokeLinecap="round">
          <path d="M14 18 Q20 13 24 19 T34 18 T44 16" />
          <path d="M14 26 Q20 21 25 27 T36 25 T48 24" />
          <path d="M20 31 Q28 28 34 32" />
        </g>
        <path d="M34 26 Q30 34 24 29 Z" fill={c("#f97316")} />
        {eye(c, 48, 19, 2.6)}
      </>
    ),
  },
  blue_tang: {
    view: [64, 40],
    draw: (c) => (
      <>
        <path className="fish-tail" d="M13 20 L2 7 Q6 20 2 33 Z" fill={c("#facc15")} />
        <path d="M14 13 Q32 0 50 12 Z" fill={c("#1e3a8a")} />
        <path d="M14 27 Q30 38 46 28 Z" fill={c("#1e3a8a")} />
        <path d="M10 20 C14 6, 40 4, 52 14 C57 18, 57 23, 52 26 C40 36, 14 34, 10 20 Z" fill={c("#2563eb")} />
        {/* the dark "palette" swoosh */}
        <path d="M14 18 C22 10, 38 10, 46 16 C40 14, 32 16, 30 20 C28 24, 20 27, 14 18 Z" fill={c("#0f172a")} opacity={0.85} />
        <path d="M14 20 L11 21" stroke={c("#facc15")} strokeWidth={1.6} />
        {eye(c, 49, 17)}
      </>
    ),
  },
  moorish_idol: {
    view: [64, 48],
    draw: (c, uid) => (
      <>
        <defs>
          <clipPath id={`${uid}-idol`}>
            <path d="M12 28 C14 12, 32 8, 44 16 C50 20, 54 25, 58 28 C54 30, 50 34, 44 38 C32 46, 14 42, 12 28 Z" />
          </clipPath>
        </defs>
        {/* the long white streamer */}
        <path d="M30 12 C26 4, 14 2, 4 6" stroke={c("#f8fafc")} strokeWidth={2.2} fill="none" strokeLinecap="round" />
        <path className="fish-tail" d="M13 28 L4 21 Q7 28 4 35 Z" fill={c("#111827")} />
        <path d="M24 10 Q30 6 36 12 Z" fill={c("#f8fafc")} />
        <path d="M12 28 C14 12, 32 8, 44 16 C50 20, 54 25, 58 28 C54 30, 50 34, 44 38 C32 46, 14 42, 12 28 Z" fill={c("#f8fafc")} />
        <g clipPath={`url(#${uid}-idol)`}>
          <rect x={10} y={0} width={10} height={48} fill={c("#fde047")} />
          <rect x={20} y={0} width={9} height={48} fill={c("#111827")} />
          <rect x={38} y={0} width={7} height={48} fill={c("#111827")} />
          <rect x={45} y={0} width={4} height={48} fill={c("#fde047")} />
        </g>
        <path d="M56 27.5 L60 28" stroke={c("#f97316")} strokeWidth={1.6} strokeLinecap="round" />
        {eye(c, 49, 23, 2)}
      </>
    ),
  },
  oarfish: {
    view: [120, 28],
    draw: (c) => (
      <>
        {/* the red crest running along its whole back */}
        <path
          d="M8 15 C22 9, 38 19, 58 13 C78 7, 96 15, 110 10"
          stroke={c("#dc2626")}
          strokeWidth={3}
          fill="none"
          strokeLinecap="round"
        />
        <path
          d="M4 17 C20 11, 36 21, 56 15 C76 9, 96 17, 112 12 C118 11, 119 16, 115 18 C98 23, 78 15, 58 21 C38 27, 20 19, 4 19 Z"
          fill={c("#d6dde6")}
        />
        {[20, 34, 48, 64, 80, 94].map((x, i) => (
          <circle key={x} cx={x} cy={i % 2 ? 17 : 18.5} r={1} fill={c("#64748b")} />
        ))}
        {/* the plume on its head */}
        <g stroke={c("#dc2626")} strokeWidth={1.4} strokeLinecap="round">
          <path d="M110 10 L104 2" />
          <path d="M111 10 L108 1" />
          <path d="M112 10 L113 2" />
        </g>
        {eye(c, 113, 14, 1.6)}
      </>
    ),
  },
  sunfish: {
    view: [56, 56],
    draw: (c) => (
      <>
        <path d="M20 16 L15 1 L27 13 Z" fill={c("#7b8794")} className="fish-tail" />
        <path d="M20 40 L15 55 L27 43 Z" fill={c("#7b8794")} />
        {/* the wavy "clavus" where a tail would be */}
        <path d="M11 18 Q5 22 8 26 Q4 30 8 34 Q6 38 11 39 L14 28 Z" fill={c("#8b97a4")} />
        <ellipse cx={30} cy={28} rx={20} ry={17} fill={c("#a7b2be")} />
        <path d="M14 32 C22 44, 40 44, 48 34 C40 40, 22 40, 14 32 Z" fill={c("#d9dee4")} />
        <path d="M34 28 Q31 33 28 29 Z" fill={c("#7b8794")} />
        <path d="M48 30 Q50 31 48 32" stroke={c("#475569")} strokeWidth={1} fill="none" />
        {eye(c, 43, 24, 2.4)}
      </>
    ),
  },
  manta_ray: {
    view: [64, 40],
    draw: (c) => (
      <>
        {/* seen from above, gliding right */}
        <path d="M12 20 L0 20.6" stroke={c("#334155")} strokeWidth={1.2} strokeLinecap="round" />
        <path d="M58 20 C50 16, 44 13, 36 2 C30 12, 20 16, 12 20 C20 24, 30 28, 36 38 C44 27, 50 24, 58 20 Z" fill={c("#334155")} />
        <path d="M44 14 C40 12, 37 9, 35 6 C36 11, 40 14, 44 14 Z" fill={c("#e2e8f0")} />
        <path d="M44 26 C40 28, 37 31, 35 34 C36 29, 40 26, 44 26 Z" fill={c("#e2e8f0")} />
        {/* the two head fins */}
        <path d="M56 17 Q62 15 61 18 Z" fill={c("#334155")} />
        <path d="M56 23 Q62 25 61 22 Z" fill={c("#334155")} />
        {c("eye") === "currentColor" ? null : (
          <>
            <circle cx={55} cy={17.5} r={0.9} fill="#e2e8f0" />
            <circle cx={55} cy={22.5} r={0.9} fill="#e2e8f0" />
          </>
        )}
      </>
    ),
  },
  coelacanth: {
    view: [64, 40],
    draw: (c) => (
      <>
        {/* the three-lobed tail, with its little extra middle lobe */}
        <path className="fish-tail" d="M12 20 L3 9 L6 20 L3 31 Z M6 20 L0 18 L0 22 Z" fill={c("#24476b")} />
        {/* stalked, limb-like lobe fins */}
        <ellipse cx={24} cy={8} rx={4} ry={2.4} fill={c("#24476b")} transform="rotate(-25 24 8)" />
        <ellipse cx={22} cy={33} rx={4} ry={2.4} fill={c("#24476b")} transform="rotate(25 22 33)" />
        <ellipse cx={38} cy={31} rx={4.5} ry={2.4} fill={c("#24476b")} transform="rotate(35 38 31)" />
        <path d="M10 20 C16 7, 40 6, 54 15 C59 18, 59 23, 54 26 C40 34, 16 33, 10 20 Z" fill={c("#2f5a85")} />
        {[
          [20, 15],
          [28, 12],
          [34, 19],
          [24, 24],
          [42, 14],
          [44, 24],
          [31, 27],
        ].map(([x, y]) => (
          <circle key={`${x}-${y}`} cx={x} cy={y} r={1.3} fill={c("#e2e8f0")} opacity={0.85} />
        ))}
        {eye(c, 50, 17, 2.4)}
      </>
    ),
  },
  dunkleosteus: {
    view: [72, 40],
    draw: (c) => (
      <>
        <path className="fish-tail" d="M14 20 L2 6 Q8 18 4 30 Z" fill={c("#57534e")} />
        <path d="M26 12 Q32 2 40 12 Z" fill={c("#57534e")} />
        <path d="M10 20 C16 10, 34 8, 46 12 L46 30 C34 32, 16 30, 10 20 Z" fill={c("#6b6560")} />
        {/* the bony armour plates on its head */}
        <path d="M44 10 C54 8, 64 12, 68 18 L68 24 C62 30, 52 32, 44 31 Z" fill={c("#a8a29e")} />
        <path d="M50 10 L52 31 M58 12 L58 29" stroke={c("#78716c")} strokeWidth={1} />
        {/* the jaw: bony blades instead of teeth */}
        <path d="M54 25 L68 23 L66 26 L56 28 Z" fill={c("#e7e5e4")} />
        {eye(c, 62, 16, 2)}
      </>
    ),
  },
  megalodon: {
    view: [80, 40],
    draw: (c) => (
      <>
        <path className="fish-tail" d="M16 19 L2 2 Q6 14 8 20 L3 34 Z" fill={c("#5b6b80")} />
        <path d="M30 11 L38 0 L44 12 Z" fill={c("#5b6b80")} />
        <path d="M12 20 C24 9, 52 8, 70 14 C77 16, 79 20, 74 23 C58 31, 28 32, 12 20 Z" fill={c("#64748b")} />
        <path d="M18 23 C32 30, 58 30, 74 23 C58 28, 30 28, 18 23 Z" fill={c("#e2e8f0")} />
        <path d="M44 25 L36 36 L50 27 Z" fill={c("#5b6b80")} />
        {[52, 55, 58].map((x) => (
          <path key={x} d={`M${x} 16 Q${x - 1} 20 ${x} 23`} stroke={c("#475569")} strokeWidth={0.9} fill="none" />
        ))}
        <path d="M66 22 Q71 24 75 22" stroke={c("#1e293b")} strokeWidth={1} fill="none" />
        {c("eye") === "currentColor" ? null : <circle cx={68} cy={16.5} r={1.4} fill="#0f172a" />}
      </>
    ),
  },
};

const viewOf = (species: SpeciesId) => DRAWINGS[species].view;
export const spriteHeight = (species: SpeciesId, width: number) =>
  (width * viewOf(species)[1]) / viewOf(species)[0];

const SPARKLE = "M0 -4 L1 -1 L4 0 L1 1 L0 4 L-1 1 L-4 0 L-1 -1 Z";

export function SpeciesSprite({
  species,
  width,
  silhouette = false,
}: {
  species: SpeciesId;
  width?: number; // defaults to its size in the tank
  silhouette?: boolean; // the index's "???": one flat colour (currentColor)
}) {
  // SVG ids must be unique on the page; useId's ":" characters aren't safe in url(#…).
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const { rarity } = speciesById(species);
  const w = width ?? speciesById(species).width;
  const [vw, vh] = viewOf(species);
  const paint: Paint = silhouette ? () => "currentColor" : (colour) => colour;
  const legendary = rarity === "legendary" && !silhouette;
  const glow = legendary ? "fish-legendary" : rarity === "epic" && !silhouette ? "fish-epic" : undefined;

  return (
    <svg width={w} height={spriteHeight(species, w)} viewBox={`-3 -3 ${vw + 6} ${vh + 6}`} className={glow} aria-hidden>
      {DRAWINGS[species].draw(paint, uid)}
      {legendary &&
        [
          [vw - 4, 2, "0s"],
          [6, 1, "0.5s"],
          [vw / 2, vh - 1, "1s"],
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

// The namesake: a chambered nautilus (a mollusc, not a fish), facing right.
export function NautilusSprite({ width = NAUTILUS.width, silhouette = false }: { width?: number; silhouette?: boolean }) {
  const c: Paint = silhouette ? () => "currentColor" : (colour) => colour;
  return (
    <svg width={width} height={(width * 46) / 54} viewBox="-3 -3 54 46" aria-hidden>
      {/* tentacles */}
      <g stroke={c("#e9c9a6")} strokeWidth={1.4} strokeLinecap="round" fill="none" className="fish-tail">
        <path d="M34 22 Q41 22 46 25" />
        <path d="M34 24 Q40 27 44 31" />
        <path d="M33 26 Q37 31 40 35" />
        <path d="M34 20 Q41 18 45 19" />
      </g>
      {/* the hood */}
      <path d="M30 12 Q40 13 39 21 Q38 27 32 28 Z" fill={c("#b98b5e")} />
      <circle cx={19} cy={20} r={17} fill={c("#f5ebe0")} />
      {/* tiger stripes on the shell */}
      <g stroke={c("#b45309")} strokeWidth={2.4} strokeLinecap="round" fill="none">
        <path d="M8 8 Q12 14 10 20" />
        <path d="M15 4 Q18 11 16 18" />
        <path d="M23 4 Q24 10 21 16" />
        <path d="M4 16 Q9 20 8 26" />
      </g>
      {/* the spiral of chambers */}
      <path d="M19 20 m-6 0 a6 6 0 1 0 12 0 a9 9 0 1 0 -18 0" stroke={c("#d6b896")} strokeWidth={1} fill="none" />
      {!silhouette && <circle cx={34} cy={17} r={1.5} fill="#1f2937" />}
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
