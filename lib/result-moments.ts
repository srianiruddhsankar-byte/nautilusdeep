import { creditedHours, type Aquarium, type SessionFacts } from "./fish.ts";
import { hasNautilus, type SpeciesId } from "./species.ts";
import { computeOverview } from "./stats.ts";

// The result screen's small moments: what THIS session changed. Pure, so the
// rules are tested (lib/result-moments.test.ts), and each is worked out by
// comparing your sessions without it and with it. That way it's right whether
// or not the row has reached the list yet (it may still be in the upload queue).

export type ResultMoments = {
  streak: { from: number; to: number } | null; // only when this session made it grow
  nautilus: boolean; // this session took you past 100 hours: the nautilus arrives
};

export function resultMoments(rows: SessionFacts[], row: SessionFacts, now: number, timeZone: string): ResultMoments {
  const before = rows.filter((r) => r.id !== row.id);
  const after = [...before, row];
  const from = computeOverview(before, now, timeZone).streak.current;
  const to = computeOverview(after, now, timeZone).streak.current;
  return {
    streak: to > from ? { from, to } : null,
    nautilus: hasNautilus(creditedHours(after)) && !hasNautilus(creditedHours(before)),
  };
}

// The first fish of its species: no other fish in the tanks is one.
export function isNewSpecies(aquarium: Aquarium, fishId: string, species: SpeciesId): boolean {
  return !aquarium.tanks.some((tank) => tank.some((f) => f.species === species && f.id !== fishId));
}
