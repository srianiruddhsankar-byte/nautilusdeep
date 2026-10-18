import { decorationById, type DecorationItem, type MilestoneId } from "./decorations.ts";
import { creditedHours, deriveAquarium, focusMinutes, type SessionFacts } from "./fish.ts";
import { deriveGarden } from "./plants.ts";
import { rarityRank } from "./species.ts";
import { computeOverview } from "./stats.ts";

// Coins, milestones, skins and decoration placement. Coins earned are DERIVED
// from sessions (like fish); only spending is stored (the price on each owned
// decoration). Pure: the clock and time zone are arguments.

export const COIN_MIN_MINUTES = 5;

// Credited focus minutes → coins. Study and Notes alike (both are studying).
// Deep Focus 1 per minute; Open Focus half, rounded down; failed or under 5 min: 0.
// Night mode needs nothing special: focus_seconds already holds only credited time.
export function coinsFor(row: SessionFacts): number {
  if (row.outcome === "failed") return 0;
  const minutes = focusMinutes(row);
  if (minutes < COIN_MIN_MINUTES) return 0;
  return row.focus_mode === "open" ? Math.floor(minutes / 2) : minutes;
}

export function earnedCoins(rows: SessionFacts[]): number {
  return rows.reduce((sum, row) => sum + coinsFor(row), 0);
}

export function spentCoins(owned: { price: number }[]): number {
  return owned.reduce((sum, d) => sum + d.price, 0);
}

export function coinBalance(rows: SessionFacts[], owned: { price: number }[]): number {
  return earnedCoins(rows) - spentCoins(owned);
}

// Total credited focus hours lives in fish.ts (the nautilus needs it too).
export { creditedHours };

// ---------- Milestones ----------

export function reachedMilestones(rows: SessionFacts[], now: number, timeZone: string): Set<MilestoneId> {
  const reached = new Set<MilestoneId>();
  // "first-rare" = your first Rare-or-better catch (Rare, Epic or Legendary).
  const fish = deriveAquarium(rows).tanks.flat();
  if (fish.some((f) => rarityRank(f.rarity) >= rarityRank("rare"))) reached.add("first-rare");
  if (creditedHours(rows) >= 10) reached.add("ten-hours");
  if (computeOverview(rows, now, timeZone).streak.longest >= 7) reached.add("week-streak");
  if (deriveGarden(rows).plants.some((p) => p.stage === "mature")) reached.add("first-mature");
  return reached;
}

// ---------- Getting a decoration ----------

export type GetCheck = { ok: true; price: number } | { ok: false; reason: string };

// Can you buy (coins) or claim (milestone) this item right now?
export function canGet(
  item: DecorationItem,
  { balance, reached, ownedItems }: { balance: number; reached: Set<MilestoneId>; ownedItems: string[] },
): GetCheck {
  if (item.milestone) {
    if (ownedItems.includes(item.id)) return { ok: false, reason: "Already yours" };
    return reached.has(item.milestone) ? { ok: true, price: 0 } : { ok: false, reason: "Locked" };
  }
  if (item.price > balance) return { ok: false, reason: `Need ${item.price - balance} more coins` };
  return { ok: true, price: item.price };
}

// ---------- Placing ----------

export type Owned = {
  id: string;
  item: string;
  price: number;
  tank: number | null; // null = in your inventory
  x: number | null;
  y: number | null;
};

// Keep a decoration on the sand and fully inside the tank: x is % across
// (4–96 so it isn't cut off), y is 0 (front of the sand) to 1 (back).
export function clampPlacement(x: number, y: number) {
  return {
    x: Math.round(Math.min(96, Math.max(4, x)) * 10) / 10,
    y: Math.round(Math.min(1, Math.max(0, y)) * 100) / 100,
  };
}

export function placeIn(owned: Owned[], id: string, tank: number, x: number, y: number): Owned[] {
  const spot = clampPlacement(x, y);
  return owned.map((d) => (d.id === id ? { ...d, tank, ...spot } : d));
}

// Back to the inventory: still owned, never refunded.
export function removeFromTank(owned: Owned[], id: string): Owned[] {
  return owned.map((d) => (d.id === id ? { ...d, tank: null, x: null, y: null } : d));
}

export function inventory(owned: Owned[]): Owned[] {
  return owned.filter((d) => d.tank === null && decorationById(d.item) !== null);
}

// A tank's decorations, back row first so nearer ones are drawn on top.
export function inTank(owned: Owned[], tank: number): Owned[] {
  return owned
    .filter((d) => d.tank === tank && decorationById(d.item) !== null)
    .sort((a, b) => b.y! - a.y! || a.id.localeCompare(b.id));
}

// ---------- Skins ----------

export type SkinId = "shallows" | "pond" | "river" | "lake" | "deep";

// Total credited hours that unlock each tank look. Tune here and only here.
export const SKIN_UNLOCKS: { id: SkinId; name: string; hours: number }[] = [
  { id: "shallows", name: "Shallows", hours: 0 },
  { id: "pond", name: "Pond", hours: 10 },
  { id: "river", name: "River", hours: 30 },
  { id: "lake", name: "Lake", hours: 75 },
  { id: "deep", name: "Deep", hours: 150 },
];

export function isSkinId(value: string): value is SkinId {
  return SKIN_UNLOCKS.some((s) => s.id === value);
}

export function skinUnlocked(id: SkinId, hours: number): boolean {
  return hours >= (SKIN_UNLOCKS.find((s) => s.id === id)?.hours ?? Infinity);
}

// The next locked skin, or null once every skin is unlocked.
export function nextSkin(hours: number) {
  return SKIN_UNLOCKS.find((s) => hours < s.hours) ?? null;
}

// The skin a tank shows: its choice if still unlocked, otherwise the default.
export function skinForTank(choices: Map<number, string>, tank: number, hours: number): SkinId {
  const chosen = choices.get(tank);
  return chosen && isSkinId(chosen) && skinUnlocked(chosen, hours) ? chosen : "shallows";
}

// "12h" or "12.5h", for "Unlocks at 30h · you're at 12h".
export function formatHours(hours: number): string {
  const rounded = Math.floor(hours * 10) / 10;
  return `${Number.isInteger(rounded) ? rounded : rounded.toFixed(1)}h`;
}
