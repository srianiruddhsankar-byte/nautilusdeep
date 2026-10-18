import { TANK_CAPACITY, earnsFish, focusMinutes, type SessionFacts } from "./fish.ts";

// Plants are DERIVED from the sessions table, like fish: never stored, so rule
// changes apply to the past too. Pure: no React, no Supabase, no clock.
//
// - ONE plant per notes session, like a fish per study session (a continued
//   session is one session). Study sessions never touch plants.
// - The session's credited minutes set how far it grew: under 15 no plant (its
//   minutes and coins still count), then sprout, young, full, mature
//   (PLANT_STAGES). During the session it grows through the stages live.
// - Completed / partial sessions only; a failed notes session grows nothing.
// - When the session ends its plant goes into the tank that is newest at that
//   moment (by fish count then), in the next free spot (6 per tank; if full,
//   the next tank). Plants never die, and time passing does nothing.

export type PlantStage = "seed" | "sprout" | "young" | "full" | "mature";

// A session's credited minutes at which each stage begins. Tune here and only
// here. "seed" is only ever seen live: a session that ends as a seed (under
// PLANT_MIN_MINUTES) leaves no plant.
export const PLANT_STAGES: { stage: PlantStage; from: number }[] = [
  { stage: "seed", from: 0 },
  { stage: "sprout", from: 15 },
  { stage: "young", from: 30 },
  { stage: "full", from: 60 },
  { stage: "mature", from: 120 },
];
export const PLANT_MIN_MINUTES = PLANT_STAGES[1].from;
export const MATURE_MINUTES = PLANT_STAGES[PLANT_STAGES.length - 1].from;
export const PLANTS_PER_TANK = 6;

export const PLANT_STAGE_LABEL: Record<PlantStage, string> = {
  seed: "Seed",
  sprout: "Sprout",
  young: "Young plant",
  full: "Full plant",
  mature: "Mature plant",
};
// For "15 min to young".
export const PLANT_STAGE_SHORT: Record<PlantStage, string> = {
  seed: "seed",
  sprout: "sprout",
  young: "young",
  full: "full",
  mature: "mature",
};

export function plantStageFor(minutes: number): PlantStage {
  let stage: PlantStage = "seed";
  for (const step of PLANT_STAGES) if (minutes >= step.from) stage = step.stage;
  return stage;
}

// The next stage and when it's reached, or null once mature.
export function nextPlantStage(minutes: number): { stage: PlantStage; atMinutes: number } | null {
  const step = PLANT_STAGES.find((s) => s.from > minutes);
  return step ? { stage: step.stage, atMinutes: step.from } : null;
}

// "15 min to young", or null once mature.
export function toNextStage(minutes: number): string | null {
  const next = nextPlantStage(minutes);
  return next ? `${next.atMinutes - minutes} min to ${PLANT_STAGE_SHORT[next.stage]}` : null;
}

// A notes session that leaves a plant.
export function growsPlant(row: SessionFacts): boolean {
  return row.session_type === "notes" && row.outcome !== "failed" && focusMinutes(row) >= PLANT_MIN_MINUTES;
}

export type Plant = {
  id: string; // = the session id; also seeds its look
  stage: PlantStage; // never "seed"
  minutes: number; // the session's credited notes minutes
  startedAt: string;
  plantedAt: string; // = the session's end
  tank: number; // 0-based tank index
  slot: number; // 0…PLANTS_PER_TANK-1, its spot on that tank's floor
};

export type Garden = {
  plants: Plant[]; // oldest first
  tankCount: number; // at least the fish tanks; more if plants overflowed
  bySession: Map<string, Plant>; // the plant each notes session left
};

// Where the next plant goes: the newest tank (by fish count), or the next one
// if its spots are full. `plantsInTank[i]` = plants already in tank i.
export function nextPlantSpot(plantsInTank: number[], fishCount: number) {
  let tank = Math.max(0, Math.ceil(fishCount / TANK_CAPACITY) - 1);
  while ((plantsInTank[tank] ?? 0) >= PLANTS_PER_TANK) tank++;
  return { tank, slot: plantsInTank[tank] ?? 0 };
}

export function deriveGarden(rows: SessionFacts[]): Garden {
  // Same order as the tank: oldest end first (real times, ids break ties).
  const ordered = [...rows].sort(
    (a, b) => Date.parse(a.ended_at) - Date.parse(b.ended_at) || a.id.localeCompare(b.id),
  );

  const plants: Plant[] = [];
  const bySession = new Map<string, Plant>();
  const plantsInTank: number[] = [];
  let fishSoFar = 0;

  for (const row of ordered) {
    if (earnsFish(row)) fishSoFar++;
    if (!growsPlant(row)) continue;
    const spot = nextPlantSpot(plantsInTank, fishSoFar);
    plantsInTank[spot.tank] = spot.slot + 1;
    const minutes = focusMinutes(row);
    const plant: Plant = {
      id: row.id,
      stage: plantStageFor(minutes),
      minutes,
      startedAt: row.started_at,
      plantedAt: row.ended_at,
      ...spot,
    };
    plants.push(plant);
    bySession.set(row.id, plant);
  }

  const fishTanks = Math.max(1, Math.ceil(fishSoFar / TANK_CAPACITY));
  return { plants, tankCount: Math.max(fishTanks, plantsInTank.length), bySession };
}

// Where a running notes session's plant is growing (it's planted there when
// the session ends): the same rule as deriveGarden, with today's tanks.
export function growingSpot(garden: Garden | null, fishCount: number) {
  const plantsInTank: number[] = [];
  for (const p of garden?.plants ?? []) plantsInTank[p.tank] = Math.max(plantsInTank[p.tank] ?? 0, p.slot + 1);
  return nextPlantSpot(plantsInTank, fishCount);
}
