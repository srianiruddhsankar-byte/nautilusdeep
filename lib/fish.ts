import type { SessionRow } from "./session-record";
import { hasNautilus, hatch, isSpeciesId, speciesById, type Rarity, type SpeciesId } from "./species.ts";

// Fish are DERIVED from the sessions table, never stored: this file is the only
// place that decides which sessions become fish, which species they are, and
// which tank they live in. The species itself is saved on the session when it
// hatches (lib/species.ts), so tuning the odds never changes old fish.
// Pure: no React, no Supabase, no clock.

export const FISH_MIN_MINUTES = 5; // below this, no fish (stops stopwatch farming)
export const TANK_CAPACITY = 10;

// The columns the app reads back (fish, stats, recent list). `species` and
// `parts` are missing on rows queued in this browser before they existed;
// `parts` is read with readParts (lib/session-parts.ts), never trusted as is.
export type SessionFacts = Pick<
  SessionRow,
  | "id"
  | "started_at"
  | "ended_at"
  | "mode"
  | "focus_mode"
  | "outcome"
  | "focus_seconds"
  | "session_type"
  | "task_name"
  | "target_minutes"
  | "cycle_name"
> & { species?: string | null; parts?: unknown };

export type Fish = {
  id: string; // = the session id
  species: SpeciesId;
  rarity: Rarity;
  minutes: number;
  startedAt: string;
  caughtAt: string; // = the session's end, when it hatched
  mode: SessionRow["mode"];
  focusMode: SessionRow["focus_mode"];
};

export type Aquarium = {
  tanks: Fish[][]; // always at least one (possibly empty) tank
  fishCount: number;
  bones: number; // one per failed study session
  nautilus: boolean; // the namesake lives in the newest tank (100 credited hours)
};

// focus_seconds already holds only the minutes that count: for a partial
// cycle that's the banked blocks; for Night mode, up to the last check-in.
export function focusMinutes(row: SessionFacts): number {
  return Math.floor(row.focus_seconds / 60);
}

// A study session, completed or partial, with at least 5 focus minutes. Deep and
// Open Focus alike. Notes sessions never make fish (they grow plants instead).
export function earnsFish(row: SessionFacts): boolean {
  return (
    row.session_type === "study" && row.outcome !== "failed" && focusMinutes(row) >= FISH_MIN_MINUTES
  );
}

// The saved species, or (for a row saved without one) the same pick the app
// and the migration make from its id and minutes.
export function speciesOf(row: SessionFacts): SpeciesId {
  return isSpeciesId(row.species) ? row.species : hatch(row.id, focusMinutes(row));
}

// A bone = a fish lost, so only failed study sessions leave one.
export function leavesBone(row: SessionFacts): boolean {
  return row.session_type === "study" && row.outcome === "failed";
}

// Total credited focus (completed + partial, study + notes), in hours.
export function creditedHours(rows: SessionFacts[]): number {
  const seconds = rows.reduce((sum, row) => sum + (row.outcome === "failed" ? 0 : row.focus_seconds), 0);
  return seconds / 3600;
}

export function deriveAquarium(rows: SessionFacts[]): Aquarium {
  // Oldest first, so fish keep their tank and order as new ones arrive.
  // Compare real times: Postgres returns "+00:00" while queued rows use "Z".
  const ordered = [...rows].sort(
    (a, b) => Date.parse(a.ended_at) - Date.parse(b.ended_at) || a.id.localeCompare(b.id),
  );

  const fish: Fish[] = ordered.filter(earnsFish).map((row) => {
    const species = speciesOf(row);
    return {
      id: row.id,
      species,
      rarity: speciesById(species).rarity,
      minutes: focusMinutes(row),
      startedAt: row.started_at,
      caughtAt: row.ended_at,
      mode: row.mode,
      focusMode: row.focus_mode,
    };
  });

  const tanks: Fish[][] = [];
  for (let i = 0; i < fish.length; i += TANK_CAPACITY) {
    tanks.push(fish.slice(i, i + TANK_CAPACITY));
  }
  if (tanks.length === 0) tanks.push([]);

  return {
    tanks,
    fishCount: fish.length,
    bones: rows.filter(leavesBone).length,
    nautilus: hasNautilus(creditedHours(rows)),
  };
}

// 0-based tank index holding this fish, or -1.
export function tankIndexOf(aquarium: Aquarium, fishId: string): number {
  return aquarium.tanks.findIndex((tank) => tank.some((f) => f.id === fishId));
}

export function findFish(aquarium: Aquarium, fishId: string): Fish | null {
  for (const tank of aquarium.tanks) {
    const found = tank.find((f) => f.id === fishId);
    if (found) return found;
  }
  return null;
}

// The Sea life index: how many of each species you have and when you first
// caught one. Species you haven't caught are simply missing from the map.
export type Catch = { count: number; firstCaughtAt: string };

export function catchLog(aquarium: Aquarium): Map<SpeciesId, Catch> {
  const log = new Map<SpeciesId, Catch>();
  // Tanks are oldest first, so the first one seen is the first caught.
  for (const fish of aquarium.tanks.flat()) {
    const entry = log.get(fish.species);
    if (entry) entry.count++;
    else log.set(fish.species, { count: 1, firstCaughtAt: fish.caughtAt });
  }
  return log;
}

// Saved rows plus rows still waiting in the offline queue (same id = same session).
export function mergeSessions(saved: SessionFacts[], pending: SessionFacts[]): SessionFacts[] {
  const ids = new Set(saved.map((row) => row.id));
  return [...saved, ...pending.filter((row) => !ids.has(row.id))];
}
