import { FISH_MIN_MINUTES, FISH_SIZE_LABEL, fishSizeFor, nextSize, type FishSize } from "./fish.ts";

// What the running screen shows for a study session's fish, minute by minute,
// modelled on how real fish eggs develop. Pure; the drawings live in
// app/_tank/brood.tsx so the realistic redesign can rework them in one place.
//
// - eggs (0–2 min): one translucent, round egg stuck to a rock.
// - eyed (2–5 min): the "eyed" stage: two dark eye spots show inside it.
// - fry (5–10 min): it hatches. A fry is tiny and see-through, still carrying its yolk sac.
// - then it grows live through the normal fish sizes, swimming with the others.
// The fish it becomes is decided by the usual rules (lib/fish.ts): 5 minutes = a fish.

export const EYED_AT = 2;
export const HATCH_AT = FISH_MIN_MINUTES; // 5
export const FRY_UNTIL = 10;

export type BroodStage = "eggs" | "eyed" | "fry" | FishSize;

export function broodStage(minutes: number): BroodStage {
  if (minutes < EYED_AT) return "eggs";
  if (minutes < HATCH_AT) return "eyed";
  if (minutes < FRY_UNTIL) return "fry";
  return fishSizeFor(minutes);
}

// The caption under the tank while it grows.
export function broodCaption(minutes: number): string {
  const stage = broodStage(minutes);
  if (stage === "eggs") return `A fish egg · its eyes appear at ${EYED_AT} min`;
  if (stage === "eyed") return `An eyed egg · it hatches at ${HATCH_AT} min`;
  if (stage === "fry") return `It hatched! A fry · it grows into a small fish at ${FRY_UNTIL} min`;
  const next = nextSize(minutes);
  return next
    ? `${FISH_SIZE_LABEL[stage]} fish · grows to ${FISH_SIZE_LABEL[next.size]} at ${next.atMinutes} min`
    : "Rare fish!";
}
