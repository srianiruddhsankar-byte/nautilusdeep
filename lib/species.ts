// Fish species, rarity tiers and the hatching roll. Pure: no React, no clock.
//
// When a study session ends (completed or partial, 5+ credited minutes) its fry
// hatches into a species. The session's length sets the ODDS of each tier; the
// session's id is the "dice". The species is then SAVED on the session row, so
// tuning the odds later never changes a fish you already caught.
//
// The roll is made only from hex digits of the session id and whole numbers,
// so the database migration can compute exactly the same pick in SQL
// (supabase/migrations/20261019120000_fish_species.sql). If you change ODDS,
// saved fish stay as they are; only new sessions use the new odds.

export type Rarity = "common" | "uncommon" | "rare" | "epic" | "legendary";

export const RARITIES: Rarity[] = ["common", "uncommon", "rare", "epic", "legendary"];

export const RARITY_LABEL: Record<Rarity, string> = {
  common: "Common",
  uncommon: "Uncommon",
  rare: "Rare",
  epic: "Epic",
  legendary: "Legendary",
};

export type Species = {
  id: string; // stored on sessions: never rename one, only add
  name: string;
  rarity: Rarity;
  width: number; // px in the tank (height comes from the drawing)
  fact: string;
};

// All saltwater for now (tanks don't have water types yet; on the ideas list).
// ORDER MATTERS inside each tier: the roll picks by position. Add new species at
// the end of their tier (and to the migration's check constraint), never reorder.
export const SPECIES = [
  // Common
  {
    id: "green_chromis",
    name: "Green chromis",
    rarity: "common",
    width: 30,
    fact: "Lives in big shimmering schools around coral, darting into the branches for safety.",
  },
  {
    id: "blue_damselfish",
    name: "Blue damselfish",
    rarity: "common",
    width: 28,
    fact: "Only a few centimetres long, but fiercely territorial: it will chase off much bigger fish.",
  },
  {
    id: "royal_gramma",
    name: "Royal gramma",
    rarity: "common",
    width: 30,
    fact: "Often swims upside down under ledges, keeping its belly towards the nearest surface.",
  },
  {
    id: "sergeant_major",
    name: "Sergeant major",
    rarity: "common",
    width: 32,
    fact: "Named after its stripes, like a military rank. Males guard the eggs and turn darker blue while doing it.",
  },
  // Uncommon
  {
    id: "clownfish",
    name: "Clownfish",
    rarity: "uncommon",
    width: 34,
    fact: "All clownfish hatch male. The biggest in a group can become female.",
  },
  {
    id: "pufferfish",
    name: "Pufferfish",
    rarity: "uncommon",
    width: 36,
    fact: "Puffs up by gulping water, and many species carry a powerful poison.",
  },
  {
    id: "seahorse",
    name: "Seahorse",
    rarity: "uncommon",
    width: 22,
    fact: "The male carries the eggs in a pouch and gives birth.",
  },
  {
    id: "emperor_angelfish",
    name: "Emperor angelfish",
    rarity: "uncommon",
    width: 40,
    fact: "Young ones have blue-and-white rings and look so different from adults that they were once thought to be a separate species.",
  },
  // Rare
  {
    id: "lionfish",
    name: "Lionfish",
    rarity: "rare",
    width: 44,
    fact: "Its spines are venomous, and it has spread far beyond its home as an invasive species.",
  },
  {
    id: "mandarinfish",
    name: "Mandarinfish",
    rarity: "rare",
    width: 34,
    fact: "One of very few animals that makes real blue pigment.",
  },
  {
    id: "blue_tang",
    name: "Blue tang",
    rarity: "rare",
    width: 40,
    fact: "It's a surgeonfish, with a scalpel-sharp spine at the base of its tail.",
  },
  {
    id: "moorish_idol",
    name: "Moorish idol",
    rarity: "rare",
    width: 42,
    fact: "The only member of its entire fish family.",
  },
  // Epic
  {
    id: "oarfish",
    name: "Oarfish",
    rarity: "epic",
    width: 100,
    fact: "The longest bony fish alive, over 8 metres. It probably inspired sea-serpent tales.",
  },
  {
    id: "sunfish",
    name: "Ocean sunfish",
    rarity: "epic",
    width: 54,
    fact: "Among the heaviest bony fish in the world. Some weigh over 2 tonnes.",
  },
  {
    id: "manta_ray",
    name: "Manta ray",
    rarity: "epic",
    width: 60,
    fact: "Has one of the largest brains, for its body size, of any fish.",
  },
  // Legendary
  {
    id: "coelacanth",
    name: "Coelacanth",
    rarity: "legendary",
    width: 58,
    fact: "Thought extinct for 66 million years until one was caught off South Africa in 1938.",
  },
  {
    id: "dunkleosteus",
    name: "Dunkleosteus",
    rarity: "legendary",
    width: 66,
    fact: "Lived about 360 million years ago and had self-sharpening bony blades instead of teeth.",
  },
  {
    id: "megalodon",
    name: "Megalodon",
    rarity: "legendary",
    width: 80,
    fact: "An extinct giant shark with teeth up to about 18 cm long. It died out around 3.6 million years ago.",
  },
] as const satisfies readonly Species[];

export type SpeciesId = (typeof SPECIES)[number]["id"];

export function isSpeciesId(value: unknown): value is SpeciesId {
  return typeof value === "string" && SPECIES.some((s) => s.id === value);
}

export function speciesById(id: SpeciesId): Species {
  return SPECIES.find((s) => s.id === id)!;
}

export function poolOf(rarity: Rarity): Species[] {
  return SPECIES.filter((s) => s.rarity === rarity);
}

// Higher = rarer. For "rarest catch" and the "first Rare or better" milestone.
export const rarityRank = (rarity: Rarity) => RARITIES.indexOf(rarity);

// ---------- Odds ----------

export type Odds = Record<Rarity, number>; // whole percentages, adding up to 100

// Credited focus minutes → odds of each tier. Tune here (and in a new
// migration only if old sessions still need backfilling, which they don't).
export const ODDS: { from: number; odds: Odds }[] = [
  { from: 5, odds: { common: 80, uncommon: 18, rare: 2, epic: 0, legendary: 0 } },
  { from: 25, odds: { common: 50, uncommon: 35, rare: 13, epic: 2, legendary: 0 } },
  { from: 50, odds: { common: 25, uncommon: 35, rare: 28, epic: 10, legendary: 2 } },
  { from: 90, odds: { common: 10, uncommon: 25, rare: 35, epic: 22, legendary: 8 } },
];

// The band for these minutes (the first band for anything under 5; callers
// only hatch sessions that earn a fish anyway).
export function oddsFor(minutes: number, table = ODDS): Odds {
  let odds = table[0].odds;
  for (const band of table) if (minutes >= band.from) odds = band.odds;
  return odds;
}

// The next band up and when it starts, or null in the top band. For the
// running screen's "better odds at 25 min".
export function nextOddsAt(minutes: number, table = ODDS): number | null {
  return table.find((band) => band.from > minutes)?.from ?? null;
}

// ---------- The roll ----------

const TWO_32 = 2 ** 32;

// Two whole numbers 0 … 2³²−1 from the session id: the first 8 hex digits roll
// the tier, the last 8 pick the species. Session ids are random UUIDs, so these
// are fair dice, and the same id always gives the same numbers.
export function rollsFromId(id: string): { tier: number; pick: number } {
  const hex = id.replace(/-/g, "").toLowerCase();
  const read = (part: string) => {
    const n = parseInt(part, 16);
    return /^[0-9a-f]{8}$/.test(part) && Number.isFinite(n) ? n : 0;
  };
  return { tier: read(hex.slice(0, 8)), pick: read(hex.slice(-8)) };
}

// The tier for a roll: walk the tiers, adding up their percentages, until the
// roll falls under the running total. Compared as roll × 100 < total × 2³²
// (whole numbers), exactly like the SQL, so no rounding can disagree.
export function rarityFor(tierRoll: number, odds: Odds): Rarity {
  let total = 0;
  for (const rarity of RARITIES) {
    total += odds[rarity];
    if (tierRoll * 100 < total * TWO_32) return rarity;
  }
  return "legendary"; // only if the odds add up to less than 100
}

// The species a fry hatches into. Same id + minutes (+ odds) → same species.
export function hatch(id: string, minutes: number, table = ODDS): SpeciesId {
  const rolls = rollsFromId(id);
  const rarity = rarityFor(rolls.tier, oddsFor(minutes, table));
  const pool = poolOf(rarity);
  return pool[rolls.pick % pool.length].id as SpeciesId;
}

// ---------- The namesake ----------

// Not part of the roulette: it joins your newest tank once, at 100 credited hours.
export const NAUTILUS = {
  name: "Nautilus",
  hours: 100,
  width: 44,
  fact: "Not a fish: it's a mollusc, a cousin of the octopus. It floats by adjusting gas in its shell's chambers. It's also this app's namesake.",
};

export function hasNautilus(creditedHours: number): boolean {
  return creditedHours >= NAUTILUS.hours;
}
