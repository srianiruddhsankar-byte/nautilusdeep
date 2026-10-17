import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { DECORATIONS, decorationById } from "./decorations.ts";
import {
  canGet,
  clampPlacement,
  coinBalance,
  coinsFor,
  earnedCoins,
  formatHours,
  inTank,
  inventory,
  nextSkin,
  placeIn,
  reachedMilestones,
  removeFromTank,
  skinForTank,
  skinUnlocked,
  type Owned,
} from "./economy.ts";
import type { SessionFacts } from "./fish.ts";
import { toRow } from "./session-record.ts";
import { checkSession, confirmCheckIn, startStopwatch, withDetails, type Result } from "./timer.ts";

const IST = "Asia/Kolkata";
const T0 = Date.UTC(2026, 9, 1, 3, 30); // 1 Oct 2026, 09:00 in India
const DAY = 86_400_000;
const NOW = T0 + 20 * DAY;
let nextId = 0;

function row(minutes: number, overrides: Partial<SessionFacts> & { day?: number } = {}): SessionFacts {
  const { day = 0, ...rest } = overrides;
  const start = T0 + day * DAY;
  return {
    id: `00000000-0000-4000-8000-${String(nextId++).padStart(12, "0")}`,
    started_at: new Date(start).toISOString(),
    ended_at: new Date(start + minutes * 60_000).toISOString(),
    mode: "timer",
    focus_mode: "deep",
    outcome: "completed",
    focus_seconds: minutes * 60,
    session_type: "study",
    task_name: null,
    target_minutes: null,
    cycle_name: null,
    ...rest,
  };
}

describe("earning coins", () => {
  test("Deep Focus: 1 coin per credited minute", () => {
    assert.equal(coinsFor(row(25)), 25);
  });

  test("Open Focus: half, rounded down", () => {
    assert.equal(coinsFor(row(25, { focus_mode: "open" })), 12);
    assert.equal(coinsFor(row(5, { focus_mode: "open" })), 2);
  });

  test("the 5-minute minimum: 4 min 59 s earns nothing", () => {
    assert.equal(coinsFor(row(0, { focus_seconds: 299 })), 0);
    assert.equal(coinsFor(row(5)), 5);
  });

  test("failed sessions earn nothing; partial cycles earn their banked minutes", () => {
    assert.equal(coinsFor(row(30, { outcome: "failed", focus_seconds: 0 })), 0);
    assert.equal(coinsFor(row(50, { mode: "cycle", outcome: "partial" })), 50);
  });

  test("notes sessions earn like study (both are studying)", () => {
    assert.equal(coinsFor(row(40, { session_type: "notes" })), 40);
  });

  test("Night mode: only the credited minutes", () => {
    const s = withDetails(
      { ...startStopwatch(T0, "deep"), id: "x" },
      { sessionType: "study", task: "", targetMinutes: null, checkIn: { intervalMs: 30 * 60_000, style: "chime" } },
    );
    const asleep = confirmCheckIn(s, T0 + 30 * 60_000);
    const check = checkSession(asleep, T0 + 3 * 60 * 60_000);
    assert.equal(check.status, "ended");
    const r = toRow((check as { status: "ended"; result: Result }).result, "x", null);
    assert.equal(coinsFor(r), 30); // not 180
  });

  test("balance = earned − spent", () => {
    const rows = [row(100), row(60, { focus_mode: "open" })];
    assert.equal(earnedCoins(rows), 130);
    assert.equal(coinBalance(rows, [{ price: 50 }, { price: 30 }, { price: 0 }]), 50);
  });
});

describe("buying and claiming", () => {
  const shell = decorationById("shell")!; // 30 coins
  const clam = decorationById("pearl-clam")!; // first rare fish
  const none = new Set<never>();

  test("you can't buy with too few coins (and it says how many more)", () => {
    assert.deepEqual(canGet(shell, { balance: 29, reached: none, ownedItems: [] }), {
      ok: false,
      reason: "Need 1 more coins",
    });
    assert.deepEqual(canGet(shell, { balance: 30, reached: none, ownedItems: [] }), { ok: true, price: 30 });
  });

  test("coin items can be bought again (another shell)", () => {
    assert.equal(canGet(shell, { balance: 100, reached: none, ownedItems: ["shell"] }).ok, true);
  });

  test("milestone items: locked until reached, then free, once", () => {
    assert.deepEqual(canGet(clam, { balance: 999, reached: none, ownedItems: [] }), { ok: false, reason: "Locked" });
    const reached = new Set(["first-rare" as const]);
    assert.deepEqual(canGet(clam, { balance: 0, reached, ownedItems: [] }), { ok: true, price: 0 });
    assert.deepEqual(canGet(clam, { balance: 0, reached, ownedItems: ["pearl-clam"] }), {
      ok: false,
      reason: "Already yours",
    });
  });

  test("every shop item has a price (30–600) or a milestone, and unique ids", () => {
    assert.equal(new Set(DECORATIONS.map((d) => d.id)).size, DECORATIONS.length);
    for (const d of DECORATIONS) {
      if (d.milestone) continue;
      assert.ok(d.price >= 30 && d.price <= 600, d.id);
    }
  });
});

describe("milestones", () => {
  test("nothing yet", () => {
    assert.equal(reachedMilestones([row(20)], NOW, IST).size, 0);
  });

  test("first rare fish = your first Rare-or-better catch, however long the session", () => {
    assert.ok(reachedMilestones([row(30, { species: "lionfish" })], NOW, IST).has("first-rare")); // Rare
    assert.ok(reachedMilestones([row(30, { species: "oarfish" })], NOW, IST).has("first-rare")); // Epic
    assert.ok(reachedMilestones([row(30, { species: "megalodon" })], NOW, IST).has("first-rare")); // Legendary
    // A long session that hatched an Uncommon fish doesn't count, and notes make no fish.
    assert.ok(!reachedMilestones([row(120, { species: "seahorse" })], NOW, IST).has("first-rare"));
    assert.ok(!reachedMilestones([row(90, { session_type: "notes" })], NOW, IST).has("first-rare"));
  });

  test("10 hours of credited focus, study and notes together", () => {
    const rows = [...Array.from({ length: 5 }, (_, i) => row(60, { day: i })), row(300, { session_type: "notes", day: 6 })];
    assert.ok(reachedMilestones(rows, NOW, IST).has("ten-hours"));
    assert.ok(!reachedMilestones(rows.slice(1), NOW, IST).has("ten-hours"));
  });

  test("a 7-day streak (longest ever, so it stays unlocked)", () => {
    const week = Array.from({ length: 7 }, (_, i) => row(10, { day: i }));
    assert.ok(reachedMilestones(week, NOW, IST).has("week-streak"));
    assert.ok(!reachedMilestones(week.slice(1), NOW, IST).has("week-streak"));
  });

  test("first mature plant = 300 notes minutes", () => {
    assert.ok(reachedMilestones([row(300, { session_type: "notes" })], NOW, IST).has("first-mature"));
  });
});

describe("skins", () => {
  test("unlock thresholds in hours", () => {
    assert.ok(skinUnlocked("shallows", 0));
    assert.ok(!skinUnlocked("pond", 9.9));
    assert.ok(skinUnlocked("pond", 10));
    assert.ok(!skinUnlocked("deep", 149));
    assert.ok(skinUnlocked("deep", 150));
    assert.deepEqual(nextSkin(12), { id: "river", name: "River", hours: 30 });
    assert.equal(nextSkin(200), null);
    assert.equal(formatHours(12.46), "12.4h");
    assert.equal(formatHours(30), "30h");
  });

  test("a tank shows its chosen skin only while unlocked; otherwise Shallows", () => {
    const choices = new Map([
      [0, "pond"],
      [1, "deep"],
      [2, "volcano"],
    ]);
    assert.equal(skinForTank(choices, 0, 12), "pond");
    assert.equal(skinForTank(choices, 1, 12), "shallows"); // Deep isn't unlocked yet
    assert.equal(skinForTank(choices, 2, 999), "shallows"); // unknown skin
    assert.equal(skinForTank(choices, 5, 999), "shallows"); // never chosen
  });
});

describe("placing decorations", () => {
  const owned: Owned[] = [
    { id: "a", item: "shell", price: 30, tank: null, x: null, y: null },
    { id: "b", item: "driftwood", price: 150, tank: null, x: null, y: null },
  ];

  test("place on the sand: kept inside the tank", () => {
    assert.deepEqual(clampPlacement(-20, 1.7), { x: 4, y: 1 });
    const placed = placeIn(owned, "a", 1, 50.04, 0.333);
    assert.deepEqual(placed[0], { ...owned[0], tank: 1, x: 50, y: 0.33 });
    assert.deepEqual(inventory(placed).map((d) => d.id), ["b"]);
    assert.deepEqual(inTank(placed, 1).map((d) => d.id), ["a"]);
    assert.deepEqual(inTank(placed, 0), []);
  });

  test("move = place again; back-row items are drawn first", () => {
    let placed = placeIn(owned, "a", 0, 20, 0.2);
    placed = placeIn(placed, "b", 0, 60, 0.9);
    placed = placeIn(placed, "a", 0, 80, 0.5); // moved
    assert.deepEqual(inTank(placed, 0).map((d) => [d.id, d.x]), [
      ["b", 60],
      ["a", 80],
    ]);
  });

  test("remove: back to the inventory, still owned, no refund", () => {
    const removed = removeFromTank(placeIn(owned, "a", 0, 50, 0.5), "a");
    assert.deepEqual(removed[0], owned[0]);
    assert.equal(removed.length, 2);
    assert.equal(coinBalance([row(100)], removed), 100 - 180); // spending doesn't change
  });
});
