// The decoration shop: every item, its price or the milestone that unlocks it,
// and how big it's drawn. Tune prices here and only here. Pure.

export type MilestoneId = "first-rare" | "ten-hours" | "week-streak" | "first-mature";

export const MILESTONE_LABEL: Record<MilestoneId, string> = {
  "first-rare": "Catch your first Rare fish (or rarer)",
  "ten-hours": "Reach 10 hours of focus",
  "week-streak": "Reach a 7-day streak",
  "first-mature": "Grow your first mature plant",
};

export type DecorationItem = {
  id: string; // stored on each owned row; never rename one that's been sold
  name: string;
  width: number; // px in the tank (height comes from the drawing)
} & ({ price: number; milestone?: never } | { milestone: MilestoneId; price?: never });

// Cheapest first, then the milestone items.
export const DECORATIONS: DecorationItem[] = [
  { id: "shell", name: "Shell", price: 30, width: 22 },
  { id: "pebbles", name: "Pebbles", price: 50, width: 34 },
  { id: "starfish", name: "Starfish", price: 80, width: 24 },
  { id: "driftwood", name: "Driftwood", price: 150, width: 62 },
  { id: "rock-arch", name: "Rock arch", price: 250, width: 64 },
  { id: "bubbler", name: "Bubbler", price: 300, width: 26 },
  { id: "treasure-chest", name: "Treasure chest", price: 450, width: 40 },
  { id: "shipwreck", name: "Little shipwreck", price: 600, width: 84 },
  { id: "pearl-clam", name: "Pearl clam", milestone: "first-rare", width: 30 },
  { id: "anchor", name: "Anchor", milestone: "ten-hours", width: 30 },
  { id: "bottle", name: "Message in a bottle", milestone: "week-streak", width: 30 },
  { id: "moss-ball", name: "Moss ball", milestone: "first-mature", width: 24 },
];

export function decorationById(id: string): DecorationItem | null {
  return DECORATIONS.find((d) => d.id === id) ?? null;
}
