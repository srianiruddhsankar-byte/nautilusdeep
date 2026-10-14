import type { SessionRow } from "./session-record";

// Fish are DERIVED from the sessions table, never stored: this file is the only
// place that decides which sessions become fish, how big they are, and which
// tank they live in. Pure: no React, no Supabase, no clock.

export const FISH_MIN_MINUTES = 5; // below this, no fish (stops stopwatch farming)
export const TANK_CAPACITY = 10;

export type FishSize = "small" | "medium" | "large" | "rare";

export const FISH_SIZE_LABEL: Record<FishSize, string> = {
  small: "Small",
  medium: "Medium",
  large: "Large",
  rare: "Rare",
};

// Smallest focus minutes for each size, in order.
const SIZE_STEPS: { size: FishSize; from: number }[] = [
  { size: "small", from: 0 },
  { size: "medium", from: 25 },
  { size: "large", from: 50 },
  { size: "rare", from: 90 },
];

export function fishSizeFor(minutes: number): FishSize {
  let size: FishSize = "small";
  for (const step of SIZE_STEPS) if (minutes >= step.from) size = step.size;
  return size;
}

// The next size up and when it's reached, or null for a rare fish.
export function nextSize(minutes: number): { size: FishSize; atMinutes: number } | null {
  const step = SIZE_STEPS.find((s) => s.from > minutes);
  return step ? { size: step.size, atMinutes: step.from } : null;
}

// Only the columns fish need.
export type SessionFacts = Pick<
  SessionRow,
  "id" | "started_at" | "ended_at" | "mode" | "focus_mode" | "outcome" | "focus_seconds"
>;

export type Fish = {
  id: string; // = the session id
  size: FishSize;
  minutes: number;
  startedAt: string;
  mode: SessionRow["mode"];
  focusMode: SessionRow["focus_mode"];
};

export type Aquarium = {
  tanks: Fish[][]; // always at least one (possibly empty) tank
  fishCount: number;
  bones: number; // one per failed session
};

// focus_seconds already holds only the minutes that count: for a partial
// cycle that's the banked blocks, so the fish is sized by banked minutes.
export function focusMinutes(row: SessionFacts): number {
  return Math.floor(row.focus_seconds / 60);
}

// Completed or partial, with at least 5 focus minutes. Deep and Open Focus alike.
export function earnsFish(row: SessionFacts): boolean {
  return row.outcome !== "failed" && focusMinutes(row) >= FISH_MIN_MINUTES;
}

export function deriveAquarium(rows: SessionFacts[]): Aquarium {
  // Oldest first, so fish keep their tank and order as new ones arrive.
  // Compare real times: Postgres returns "+00:00" while queued rows use "Z".
  const ordered = [...rows].sort(
    (a, b) => Date.parse(a.ended_at) - Date.parse(b.ended_at) || a.id.localeCompare(b.id),
  );

  const fish: Fish[] = ordered.filter(earnsFish).map((row) => ({
    id: row.id,
    size: fishSizeFor(focusMinutes(row)),
    minutes: focusMinutes(row),
    startedAt: row.started_at,
    mode: row.mode,
    focusMode: row.focus_mode,
  }));

  const tanks: Fish[][] = [];
  for (let i = 0; i < fish.length; i += TANK_CAPACITY) {
    tanks.push(fish.slice(i, i + TANK_CAPACITY));
  }
  if (tanks.length === 0) tanks.push([]);

  return {
    tanks,
    fishCount: fish.length,
    bones: rows.filter((row) => row.outcome === "failed").length,
  };
}

// 0-based tank index holding this fish, or -1.
export function tankIndexOf(aquarium: Aquarium, fishId: string): number {
  return aquarium.tanks.findIndex((tank) => tank.some((f) => f.id === fishId));
}

// Saved rows plus rows still waiting in the offline queue (same id = same session).
export function mergeSessions(saved: SessionFacts[], pending: SessionFacts[]): SessionFacts[] {
  const ids = new Set(saved.map((row) => row.id));
  return [...saved, ...pending.filter((row) => !ids.has(row.id))];
}
