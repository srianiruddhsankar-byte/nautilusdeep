import { FISH_MIN_MINUTES } from "./fish.ts";
import { nextOddsAt } from "./species.ts";

// What the running screen shows for a study session's fish, minute by minute,
// modelled on how real fish eggs develop. Pure; the drawings live in
// app/_tank/brood.tsx so the realistic redesign can rework them in one place.
//
// - eggs (0–2 min): one translucent, round egg stuck to a rock.
// - eyed (2–5 min): the "eyed" stage: two dark eye spots show inside it.
// - fry (5 min → the end): it hatches. A fry is tiny and see-through, still
//   carrying its yolk sac, and stays a fry until the session ends.
// When the session ends the fry becomes a species (lib/species.ts): the longer
// you focused, the better the odds of a rare one.

export const EYED_AT = 2;
export const HATCH_AT = FISH_MIN_MINUTES; // 5

export type BroodStage = "eggs" | "eyed" | "fry";

export function broodStage(minutes: number): BroodStage {
  if (minutes < EYED_AT) return "eggs";
  if (minutes < HATCH_AT) return "eyed";
  return "fry";
}

// The caption under the tank while it grows.
export function broodCaption(minutes: number): string {
  const stage = broodStage(minutes);
  if (stage === "eggs") return `A fish egg · its eyes appear at ${EYED_AT} min`;
  if (stage === "eyed") return `An eyed egg · it hatches at ${HATCH_AT} min`;
  const next = nextOddsAt(minutes);
  return next
    ? `A fry · rarer fish get likelier at ${next} min`
    : "A fry · the best odds for a rare fish";
}
