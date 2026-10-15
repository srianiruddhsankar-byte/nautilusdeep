"use client";

import { useId, type CSSProperties, type ReactElement } from "react";
import type { PlantLook } from "@/lib/plant-look";
import type { PlantStage } from "@/lib/plants";
import "./tank.css";

// Hand-drawn SVG underwater plants in three shapes, growing through five stages.
// No flowers: a mature plant shows its age through size, fullness and colour
// (richer greens, and its newest growth at the top takes on a warm tint).
// Drawn in a 40 × 60 box with the base at the bottom centre (20, 58), on the sand.

const LEVEL: Record<PlantStage, number> = { seed: 0, sprout: 1, young: 2, full: 3, mature: 4 };
const BASE = { x: 20, y: 58 };

// leaf / leafLight: the two greens. tip: what the upper parts are painted with
// (a gradient into the warm tint once mature, otherwise just the light green).
type Colors = { leaf: string; leafLight: string; tip: string };

export function PlantSprite({
  look,
  stage,
  wilted = false,
  width = 40,
}: {
  look: PlantLook;
  stage: PlantStage;
  wilted?: boolean;
  width?: number;
}) {
  // SVG ids must be unique on the page; useId's ":" characters aren't safe in url(#…).
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const level = LEVEL[stage];
  const mature = level === 4;
  const colors: Colors = mature
    ? { leaf: `hsl(${look.leafHue} 55% 31%)`, leafLight: `hsl(${look.leafHue} 58% 43%)`, tip: `url(#${uid}-tip)` }
    : { leaf: `hsl(${look.leafHue} 45% 38%)`, leafLight: `hsl(${look.leafHue} 50% 52%)`, tip: `hsl(${look.leafHue} 50% 52%)` };
  const sway = {
    "--sway": `${look.swaySeconds.toFixed(1)}s`,
    "--sway-delay": `${(-look.phase * look.swaySeconds).toFixed(1)}s`,
  } as CSSProperties;
  const props = { level, look, colors };

  return (
    <svg width={width} height={width * 1.5} viewBox="0 0 40 60" overflow="visible" aria-hidden>
      {mature && (
        <defs>
          {/* Bottom to top: green, then the warm tint over the highest growth. */}
          <linearGradient id={`${uid}-tip`} gradientUnits="userSpaceOnUse" x1="0" y1="58" x2="0" y2="6">
            <stop offset="0.45" stopColor={`hsl(${look.leafHue} 58% 43%)`} />
            <stop offset="1" stopColor={`hsl(${look.tipHue} 55% 50%)`} />
          </linearGradient>
        </defs>
      )}
      <g className="plant-sway" style={sway}>
        {/* Wilted: a gentle droop and duller colours. Never dead. */}
        <g
          className={wilted ? "plant-wilted" : undefined}
          transform={wilted ? `rotate(${look.lean >= 0 ? 12 : -12} ${BASE.x} ${BASE.y})` : undefined}
        >
          {level === 0 ? (
            <Seed colors={colors} />
          ) : look.shape === "stem" ? (
            <Stem {...props} />
          ) : look.shape === "fern" ? (
            <Fern {...props} />
          ) : (
            <Grass {...props} />
          )}
        </g>
      </g>
    </svg>
  );
}

type ShapeProps = { level: number; look: PlantLook; colors: Colors };

function Seed({ colors }: { colors: Colors }) {
  return (
    <>
      <ellipse cx={BASE.x} cy={BASE.y - 1} rx={4.5} ry={3} fill="#9a7b4f" />
      <path d="M20 55.5 q1.5 -3 4 -3.5" stroke={colors.leafLight} strokeWidth={1.4} fill="none" strokeLinecap="round" />
    </>
  );
}

// A leafy stem; each stage adds height and leaves. Mature: tall and dense.
function Stem({ level, look, colors }: ShapeProps): ReactElement {
  const height = [0, 16, 30, 42, 50][level];
  const top = BASE.y - height;
  const bend = look.lean * 4;
  const leaves = [0, 2, 4, 6, 10][level];
  const size = [0, 5, 5, 7, 7.5][level];
  return (
    <>
      <path
        d={`M${BASE.x} ${BASE.y} Q ${BASE.x + bend} ${BASE.y - height / 2} ${BASE.x} ${top}`}
        stroke={colors.leaf}
        strokeWidth={level === 4 ? 2.4 : 2}
        fill="none"
        strokeLinecap="round"
      />
      {Array.from({ length: leaves }, (_, i) => {
        const y = BASE.y - height * (0.15 + (0.8 * i) / Math.max(1, leaves - 1));
        const side = i % 2 === 0 ? 1 : -1;
        // Leaves near the top are newer: they get the tip colour.
        const fill = i >= leaves - 3 ? colors.tip : i % 2 === 0 ? colors.leafLight : colors.leaf;
        return (
          <path
            key={i}
            d={`M${BASE.x} ${y} q ${side * size} ${-size * 0.9} ${side * size * 1.8} ${-size * 0.3} q ${-side * size} ${size * 0.8} ${-side * size * 1.8} ${size * 0.3} z`}
            fill={fill}
          />
        );
      })}
    </>
  );
}

// Curved fronds fanning out from the base; more, longer and thicker as it grows.
function Fern({ level, look, colors }: ShapeProps): ReactElement {
  const count = [0, 2, 3, 5, 7][level];
  const length = [0, 14, 24, 34, 42][level];
  const fronds = Array.from({ length: count }, (_, i) => {
    const spread = count === 1 ? 0 : -55 + (110 * i) / (count - 1);
    const a = ((spread + look.lean * 8) * Math.PI) / 180;
    const len = length * (Math.abs(i - (count - 1) / 2) < 1 ? 1 : 0.85);
    return {
      end: { x: BASE.x + Math.sin(a) * len, y: BASE.y - Math.cos(a) * len },
      ctrl: { x: BASE.x + Math.sin(a) * len * 0.15, y: BASE.y - Math.cos(a) * len * 0.75 },
    };
  });
  return (
    <>
      {fronds.map((f, i) => (
        <path
          key={i}
          d={`M${BASE.x} ${BASE.y} Q ${f.ctrl.x} ${f.ctrl.y} ${f.end.x} ${f.end.y}`}
          stroke={i % 2 === 0 ? colors.leaf : colors.tip}
          strokeWidth={[0, 2.6, 2.6, 3.4, 3.8][level]}
          fill="none"
          strokeLinecap="round"
        />
      ))}
    </>
  );
}

// Seagrass ribbons; more and taller blades as it grows.
function Grass({ level, look, colors }: ShapeProps): ReactElement {
  const count = [0, 2, 3, 5, 8][level];
  const height = [0, 16, 28, 40, 48][level];
  const blades = Array.from({ length: count }, (_, i) => {
    const x = BASE.x + (i - (count - 1) / 2) * (level === 4 ? 2.6 : 3.2);
    const h = height * (0.75 + 0.25 * (((i * 7) % 4) / 3));
    const bend = (look.lean + (i % 2 === 0 ? 0.6 : -0.6)) * 5;
    return { x, top: { x: x + bend, y: BASE.y - h }, ctrl: { x: x - bend * 0.3, y: BASE.y - h * 0.55 } };
  });
  return (
    <>
      {blades.map((b, i) => (
        <path
          key={i}
          d={`M${b.x} ${BASE.y} Q ${b.ctrl.x} ${b.ctrl.y} ${b.top.x} ${b.top.y}`}
          stroke={i % 2 === 0 ? colors.tip : colors.leaf}
          strokeWidth={level === 4 ? 2.8 : 2.6}
          fill="none"
          strokeLinecap="round"
        />
      ))}
    </>
  );
}
