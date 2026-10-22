import { hashString } from "./fish-look.ts";
import { NAUTILUS, SPECIES } from "./species.ts";

// A sea fact for a quiet moment: a break, or a result screen with no fish fact
// on it. Never during focus. Pure: the same seed always gives the same fact, so
// one break keeps one fact however often the screen redraws.
//
// The first version reuses the species facts (already checked); add new ones to
// EXTRA_FACTS, each checked as true before it goes in.

export type SeaFact = { name: string; fact: string };

const EXTRA_FACTS: SeaFact[] = [];

export const SEA_FACTS: SeaFact[] = [
  ...SPECIES.map((s) => ({ name: s.name, fact: s.fact })),
  { name: NAUTILUS.name, fact: NAUTILUS.fact },
  ...EXTRA_FACTS,
];

// The seed is a session id plus where it's shown (e.g. "<id>:break:3").
export function seaFact(seed: string, facts = SEA_FACTS): SeaFact {
  return facts[hashString(seed) % facts.length];
}
