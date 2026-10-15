import type { CycleSettings, Phase } from "./timer.ts";

// A cycle is stored as an ordered list of BLOCKS, like Scratch blocks:
//
//   repeat × 4 [ focus 25, break 5 ]
//   long break 15
//
// A "step" is one timed block (focus, break or long break). A "repeat" holds
// steps and plays them N times. A future drag-and-drop builder only has to
// produce this list; the data doesn't change. Pure: no React, no clock.

export type StepBlock = { type: "focus" | "break" | "longBreak"; minutes: number };
export type RepeatBlock = { type: "repeat"; times: number; blocks: StepBlock[] };
export type CycleBlock = StepBlock | RepeatBlock;

export type CycleTemplate = {
  id: string; // premade: a fixed slug; saved: the database row id
  name: string;
  blocks: CycleBlock[];
  premade: boolean;
};

export const MAX_BLOCKS = 20;
export const MAX_REPEAT = 12;
export const MAX_PHASES = 60;
const MAX_MINUTES = 600;
const MINUTE = 60_000;

const focus = (minutes: number): StepBlock => ({ type: "focus", minutes });
const pause = (minutes: number): StepBlock => ({ type: "break", minutes });

export const PREMADE_CYCLES: CycleTemplate[] = [
  {
    id: "pomodoro",
    name: "Pomodoro",
    premade: true,
    blocks: [{ type: "repeat", times: 4, blocks: [focus(25), pause(5)] }, { type: "longBreak", minutes: 15 }],
  },
  {
    id: "50-10",
    name: "50/10",
    premade: true,
    blocks: [{ type: "repeat", times: 2, blocks: [focus(50), pause(10)] }],
  },
  { id: "deep-work", name: "Deep work", premade: true, blocks: [focus(90)] },
];

// The four "Custom" fields as blocks: N × (focus, break), then a long break.
export function blocksFromSettings(s: CycleSettings): CycleBlock[] {
  return [
    { type: "repeat", times: s.blocksPerSet, blocks: [focus(s.focusMin), pause(s.shortBreakMin)] },
    { type: "longBreak", minutes: s.longBreakMin },
  ];
}

const KIND = { focus: "focus", break: "shortBreak", longBreak: "longBreak" } as const;

// Blocks → the phase list the timer runs. Three tidy-up rules, so any
// arrangement of blocks makes a sensible timeline:
// 1. A cycle starts with focus: breaks before the first focus are skipped.
// 2. Breaks next to each other collapse into the last one, so the 4th
//    "break 5" followed by "long break 15" is just the long break.
// 3. A short break at the very end is dropped (there's nothing left to rest for).
export function expandBlocks(blocks: CycleBlock[]): Phase[] {
  const steps: StepBlock[] = [];
  for (const block of blocks) {
    if (block.type === "repeat") {
      for (let i = 0; i < block.times; i++) steps.push(...block.blocks);
    } else {
      steps.push(block);
    }
  }

  const phases: Phase[] = [];
  for (const step of steps) {
    const phase: Phase = { kind: KIND[step.type], ms: step.minutes * MINUTE };
    const last = phases[phases.length - 1];
    if (phase.kind !== "focus") {
      if (!last) continue; // rule 1
      if (last.kind !== "focus") {
        phases[phases.length - 1] = phase; // rule 2
        continue;
      }
    }
    phases.push(phase);
  }
  if (phases[phases.length - 1]?.kind === "shortBreak") phases.pop(); // rule 3
  return phases;
}

// ---------- Checking blocks that come from the database ----------

const isMinutes = (n: unknown): n is number =>
  typeof n === "number" && Number.isInteger(n) && n >= 1 && n <= MAX_MINUTES;

function parseStep(data: unknown): StepBlock | null {
  if (typeof data !== "object" || data === null) return null;
  const { type, minutes } = data as Record<string, unknown>;
  if ((type === "focus" || type === "break" || type === "longBreak") && isMinutes(minutes)) {
    return { type, minutes };
  }
  return null;
}

// Returns clean blocks, or null if anything is off (unknown types, bad numbers,
// a repeat inside a repeat, no focus at all, or too long).
export function parseBlocks(data: unknown): CycleBlock[] | null {
  if (!Array.isArray(data) || data.length < 1 || data.length > MAX_BLOCKS) return null;
  const blocks: CycleBlock[] = [];
  for (const item of data) {
    const step = parseStep(item);
    if (step) {
      blocks.push(step);
      continue;
    }
    const { type, times, blocks: inner } = (item ?? {}) as Record<string, unknown>;
    if (type !== "repeat" || typeof times !== "number" || !Number.isInteger(times)) return null;
    if (times < 1 || times > MAX_REPEAT || !Array.isArray(inner) || inner.length < 1) return null;
    const steps = inner.map(parseStep);
    if (steps.some((s) => s === null)) return null;
    blocks.push({ type: "repeat", times, blocks: steps as StepBlock[] });
  }
  const phases = expandBlocks(blocks);
  if (!phases.some((p) => p.kind === "focus") || phases.length > MAX_PHASES) return null;
  return blocks;
}

// ---------- Display ----------

const STEP_LABEL = { focus: "Focus", break: "Break", longBreak: "Long break" } as const;

// "(Focus 25 → Break 5) × 4 → Long break 15"
export function describeBlocks(blocks: CycleBlock[]): string {
  return blocks
    .map((b) =>
      b.type === "repeat"
        ? `(${b.blocks.map((s) => `${STEP_LABEL[s.type]} ${s.minutes}`).join(" → ")}) × ${b.times}`
        : `${STEP_LABEL[b.type]} ${b.minutes}`,
    )
    .join(" → ");
}

// Total length in minutes, after the tidy-up rules.
export function totalMinutes(blocks: CycleBlock[]): number {
  return expandBlocks(blocks).reduce((sum, p) => sum + (p.ms ?? 0), 0) / MINUTE;
}
