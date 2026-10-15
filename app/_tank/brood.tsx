"use client";

import type { BroodStage } from "@/lib/brood";
import "./tank.css";

// A fish egg and the newly hatched fry, drawn after real ones (stages and timing
// in lib/brood.ts). Kept in one file so the realistic redesign can rework them.
// - Egg: ONE big translucent egg on a small rock, with an amber yolk. A bright
//   outline and a soft glow keep it clearly visible on every tank skin.
// - Eyed: two dark eye spots and the faint curl of the embryo inside.
// - Hatched: the shell split open, the cap tipped aside (the fry is out).
// - Fry: tiny and see-through, a big dark eye, an amber yolk sac under its belly.

export function Egg({
  eyed,
  hatched = false,
  width = 56,
}: {
  eyed: boolean;
  hatched?: boolean;
  width?: number;
}) {
  const shell = { fill: "rgba(255,251,235,0.55)", stroke: "#ffffff", strokeWidth: 1.4 };
  return (
    <svg width={width} height={(width * 40) / 44} viewBox="0 0 44 40" className="egg-glow" aria-hidden>
      {/* the rock it's stuck to */}
      <ellipse cx={22} cy={35} rx={19} ry={5} fill="#a8b5b3" />
      <ellipse cx={17} cy={33} rx={8} ry={1.8} fill="#c1ccca" />
      {hatched ? (
        <>
          {/* the bottom half of the shell, open… */}
          <path d="M11 22 Q11 33 22 33 Q33 33 33 22 L30 24 L27 21 L24 24 L21 21 L18 24 L15 21 Z" {...shell} />
          {/* …and its cap, tipped over beside it */}
          <path d="M33 16 Q38 8 44 12 L41 14 L40 11 L37 15 Z" {...shell} transform="rotate(25 38 13)" />
        </>
      ) : (
        <>
          <circle cx={22} cy={21} r={11.5} {...shell} />
          <circle cx={24} cy={24} r={5} fill="rgba(240,176,70,0.75)" />
          {eyed && (
            <>
              {/* the embryo curling around the yolk, and its two eyes */}
              <path d="M16 25 Q14 16 22 14 Q29 13 30 20" stroke="rgba(120,90,60,0.35)" strokeWidth={2.2} fill="none" strokeLinecap="round" />
              <circle cx={18.5} cy={17} r={1.7} fill="#111827" />
              <circle cx={21.8} cy={15.4} r={1.7} fill="#111827" />
            </>
          )}
          <ellipse cx={17.5} cy={14.5} rx={2.6} ry={1.6} fill="white" opacity={0.85} transform="rotate(-30 17.5 14.5)" />
        </>
      )}
    </svg>
  );
}

// A newly hatched fry, facing right.
export function Fry({ width = 26 }: { width?: number }) {
  return (
    <svg width={width} height={(width * 12) / 26} viewBox="0 0 26 12" aria-hidden>
      <path className="fish-tail" d="M4 6 L0.5 3.2 L1.2 6 L0.5 8.8 Z" fill="rgba(255,255,255,0.45)" />
      <path
        d="M3.5 6 Q8 2.6 16 3.8 Q21 4.8 23.5 6 Q21 7.2 16 8.2 Q8 9.4 3.5 6 Z"
        fill="rgba(255,255,255,0.35)"
        stroke="rgba(255,255,255,0.85)"
        strokeWidth={0.5}
      />
      <path d="M5 6 H19" stroke="rgba(255,255,255,0.5)" strokeWidth={0.4} />
      <ellipse cx={15} cy={7.6} rx={3} ry={1.8} fill="rgba(246,186,86,0.8)" />
      <circle cx={20.5} cy={5.5} r={1.35} fill="#111827" />
      <circle cx={20.9} cy={5.1} r={0.4} fill="white" />
    </svg>
  );
}

// The egg or fry in the tank while a study session runs (a tank overlay).
// From "small" on, the fish swims with the others instead (Tank's liveFish).
export function LiveBrood({ stage }: { stage: BroodStage }) {
  if (stage !== "eggs" && stage !== "eyed" && stage !== "fry") return null;
  return (
    <>
      <div className="pointer-events-none absolute bottom-[3%] left-[14%] -translate-x-1/2">
        <Egg eyed={stage !== "eggs"} hatched={stage === "fry"} />
      </div>
      {stage === "fry" && (
        <div className="pointer-events-none absolute bottom-[16%] left-[25%]">
          {/* key: the hatch plays once; then a gentle wiggle in place */}
          <div className="fry-hatch">
            <div className="fry-wiggle">
              <Fry />
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// After a failed session: the egg (or fry) fades and drifts gently away.
export function DriftingBrood({ stage }: { stage: "eggs" | "eyed" | "fry" }) {
  return (
    <div className="brood-drift">{stage === "fry" ? <Fry width={44} /> : <Egg eyed={stage === "eyed"} width={70} />}</div>
  );
}
