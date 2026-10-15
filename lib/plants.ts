import { FISH_MIN_MINUTES, TANK_CAPACITY, earnsFish, focusMinutes, type SessionFacts } from "./fish.ts";

// Plants are DERIVED from the sessions table, like fish: never stored, so rule
// changes apply to the past too. Pure: no React, no Supabase, no clock.
//
// - Notes sessions grow ONE plant at a time from their focus minutes added up.
//   Study sessions never touch plants.
// - Only completed / partial notes sessions with 5+ focus minutes count.
// - At MATURE_MINUTES the plant matures, goes into the tank that is newest at that
//   moment, and a new seed starts with the leftover minutes of that session.
// - A failed notes session adds nothing; the growing plant looks a little wilted
//   until the next notes session that counts. Plants never die, and time passing
//   does nothing.

export type PlantStage = "seed" | "sprout" | "young" | "full" | "mature";

// Notes minutes at which each stage begins. Tune growth here and only here.
export const PLANT_STAGES: { stage: PlantStage; from: number }[] = [
  { stage: "seed", from: 0 },
  { stage: "sprout", from: 30 },
  { stage: "young", from: 90 },
  { stage: "full", from: 180 },
  { stage: "mature", from: 300 },
];
export const MATURE_MINUTES = PLANT_STAGES[PLANT_STAGES.length - 1].from;
export const PLANT_MIN_MINUTES = FISH_MIN_MINUTES;
export const PLANTS_PER_TANK = 6;

export const PLANT_STAGE_LABEL: Record<PlantStage, string> = {
  seed: "Seed",
  sprout: "Sprout",
  young: "Young plant",
  full: "Full plant",
  mature: "Mature plant",
};
// For "40 min to full".
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

// "40 min to full", or null once mature.
export function toNextStage(minutes: number): string | null {
  const next = nextPlantStage(minutes);
  return next ? `${next.atMinutes - minutes} min to ${PLANT_STAGE_SHORT[next.stage]}` : null;
}

// A notes session that adds growth.
export function growsPlant(row: SessionFacts): boolean {
  return row.session_type === "notes" && row.outcome !== "failed" && focusMinutes(row) >= PLANT_MIN_MINUTES;
}

export type MaturePlant = {
  id: string; // seeds its look: the session that started it (plus "#2"… if that session started several)
  startedAt: string; // when its first session started
  maturedAt: string; // when the session that finished it ended
  sessions: number; // notes sessions that grew it
  tank: number; // 0-based tank index
  slot: number; // 0…PLANTS_PER_TANK-1, its spot on that tank's floor
};

export type GrowingPlant = {
  id: string | null; // null = a fresh seed no session has grown yet
  minutes: number;
  stage: PlantStage;
  wilted: boolean;
};

// What one notes session did, for its result screen.
export type SessionGrowth = {
  counted: boolean; // false: failed, or under 5 minutes
  addedMinutes: number;
  matured: MaturePlant[]; // plants this session finished (usually 0 or 1)
};

export type Garden = {
  matured: MaturePlant[]; // oldest first
  growing: GrowingPlant;
  tankCount: number; // at least the fish tanks; more if plants overflowed
  bySession: Map<string, SessionGrowth>;
};

export function deriveGarden(rows: SessionFacts[]): Garden {
  // Same order as the tank: oldest end first (real times, ids break ties).
  const ordered = [...rows].sort(
    (a, b) => Date.parse(a.ended_at) - Date.parse(b.ended_at) || a.id.localeCompare(b.id),
  );

  const matured: MaturePlant[] = [];
  const bySession = new Map<string, SessionGrowth>();
  const plantsInTank: number[] = [];
  const seedsStartedBy = new Map<string, number>();
  let fishSoFar = 0;
  let wilted = false;
  let current: { id: string | null; startedAt: string; minutes: number; sessions: number } = {
    id: null,
    startedAt: "",
    minutes: 0,
    sessions: 0,
  };

  // The tank that's newest right now; if its plant slots are full, the next one.
  function place() {
    let tank = Math.max(0, Math.ceil(fishSoFar / TANK_CAPACITY) - 1);
    while ((plantsInTank[tank] ?? 0) >= PLANTS_PER_TANK) tank++;
    const slot = plantsInTank[tank] ?? 0;
    plantsInTank[tank] = slot + 1;
    return { tank, slot };
  }

  for (const row of ordered) {
    if (earnsFish(row)) fishSoFar++;
    if (row.session_type !== "notes") continue;

    if (row.outcome === "failed") {
      wilted = true;
      bySession.set(row.id, { counted: false, addedMinutes: 0, matured: [] });
      continue;
    }
    if (!growsPlant(row)) {
      bySession.set(row.id, { counted: false, addedMinutes: 0, matured: [] });
      continue;
    }

    wilted = false;
    const growth: SessionGrowth = { counted: true, addedMinutes: focusMinutes(row), matured: [] };
    let left = growth.addedMinutes;
    while (left > 0) {
      if (current.id === null) {
        const n = seedsStartedBy.get(row.id) ?? 0;
        seedsStartedBy.set(row.id, n + 1);
        current = { id: n === 0 ? row.id : `${row.id}#${n + 1}`, startedAt: row.started_at, minutes: 0, sessions: 0 };
      }
      const take = Math.min(left, MATURE_MINUTES - current.minutes);
      current.minutes += take;
      current.sessions++;
      left -= take;

      if (current.minutes >= MATURE_MINUTES) {
        const plant: MaturePlant = {
          id: current.id!,
          startedAt: current.startedAt,
          maturedAt: row.ended_at,
          sessions: current.sessions,
          ...place(),
        };
        matured.push(plant);
        growth.matured.push(plant);
        current = { id: null, startedAt: "", minutes: 0, sessions: 0 }; // leftover minutes seed the next one
      }
    }
    bySession.set(row.id, growth);
  }

  const fishTanks = Math.max(1, Math.ceil(fishSoFar / TANK_CAPACITY));
  return {
    matured,
    growing: { id: current.id, minutes: current.minutes, stage: plantStageFor(current.minutes), wilted },
    tankCount: Math.max(fishTanks, plantsInTank.length),
    bySession,
  };
}

// The growing plant with a running notes session's minutes added, for the live
// view. At MATURE_MINUTES or more it shows as mature (it matures when the
// session ends). The look comes from the running session if it starts the seed.
export function previewPlant(growing: GrowingPlant, sessionId: string, liveMinutes: number) {
  const minutes = Math.min(MATURE_MINUTES, growing.minutes + liveMinutes);
  return { id: growing.id ?? sessionId, minutes, stage: plantStageFor(minutes) };
}

// Has anything ever happened with plants? (Home stays quiet for study-only users.)
export function hasGarden(garden: Garden): boolean {
  return garden.matured.length > 0 || garden.growing.minutes > 0 || garden.growing.wilted;
}
