import { describe, test } from "node:test";
import assert from "node:assert/strict";
import {
  TANK_CAPACITY,
  catchLog,
  creditedHours,
  deriveAquarium,
  mergeSessions,
  speciesOf,
  tankIndexOf,
  type SessionFacts,
} from "./fish.ts";
import { fishLook } from "./fish-look.ts";
import { hatch } from "./species.ts";

const T0 = Date.UTC(2026, 9, 14, 9, 0, 0);
let nextId = 0;
let nextEnd = 0;

// A session row ending `n` minutes after T0 (so tests control the order).
function row(overrides: Partial<SessionFacts> & { minutes?: number; endsAt?: number } = {}) {
  const { minutes = 25, endsAt = nextEnd++, ...rest } = overrides;
  const end = T0 + endsAt * 60_000;
  return {
    id: `00000000-0000-4000-8000-${String(nextId++).padStart(12, "0")}`,
    started_at: new Date(end - minutes * 60_000).toISOString(),
    ended_at: new Date(end).toISOString(),
    mode: "timer",
    focus_mode: "deep",
    outcome: "completed",
    focus_seconds: minutes * 60,
    session_type: "study",
    task_name: null,
    target_minutes: null,
    cycle_name: null,
    ...rest,
  } satisfies SessionFacts;
}

describe("5-minute minimum", () => {
  test("4 min 59 s earns no fish, 5 min does", () => {
    const aq = deriveAquarium([
      row({ focus_seconds: 299, mode: "stopwatch" }),
      row({ focus_seconds: 300, mode: "stopwatch" }),
    ]);
    assert.equal(aq.fishCount, 1);
    assert.equal(aq.tanks[0][0].minutes, 5);
  });

  test("Open Focus earns fish exactly like Deep Focus (same odds, full minutes)", () => {
    const deep = row({ minutes: 60 });
    const open = { ...deep, focus_mode: "open" as const };
    assert.equal(deriveAquarium([open]).tanks[0][0].species, deriveAquarium([deep]).tanks[0][0].species);
    assert.equal(deriveAquarium([open]).tanks[0][0].focusMode, "open");
  });
});

// An id whose tier roll is 80.1%: uncommon under 50 min, rare from 50, epic
// from 90 (see lib/species.test.ts).
const ROLL_80 = "cd000000-0000-4000-8000-000000000001";

describe("species", () => {
  test("a saved species is used as it is, whatever the odds say", () => {
    // 10 minutes with this roll would hatch an uncommon fish; the saved one wins.
    const aq = deriveAquarium([row({ id: ROLL_80, minutes: 10, species: "megalodon" })]);
    assert.equal(aq.tanks[0][0].species, "megalodon");
    assert.equal(aq.tanks[0][0].rarity, "legendary");
  });

  test("saved species never change when the odds change", () => {
    const saved = row({ id: ROLL_80, minutes: 10, species: hatch(ROLL_80, 10) });
    const generous = [{ from: 5, odds: { common: 0, uncommon: 0, rare: 0, epic: 0, legendary: 100 } }];
    assert.notEqual(hatch(ROLL_80, 10, generous), saved.species); // new odds would pick differently…
    assert.equal(speciesOf(saved), "pufferfish"); // …but the saved fish stays
  });

  test("a row without a species (queued before species existed) gets the deterministic pick", () => {
    const old = row({ id: ROLL_80, minutes: 30 });
    assert.equal(speciesOf(old), hatch(ROLL_80, 30));
    assert.equal(speciesOf(old), "pufferfish"); // 80.1% at 30 min: uncommon
  });

  test("an unknown saved value falls back to the pick", () => {
    assert.equal(speciesOf(row({ id: ROLL_80, minutes: 30, species: "kraken" })), "pufferfish");
  });

  test("partial cycles hatch by banked minutes, not time spent", () => {
    // 2 blocks of 25 banked (50 min): this roll is rare from 50 min.
    const aq = deriveAquarium([row({ id: ROLL_80, mode: "cycle", outcome: "partial", minutes: 50 })]);
    assert.equal(aq.tanks[0][0].rarity, "rare");
  });

  test("Night mode: only credited minutes count (focus_seconds stops at the last check-in)", () => {
    // Ran 2 hours, but the last confirmed check-in was at 45 min: odds of 25–49 min.
    const aq = deriveAquarium([row({ id: ROLL_80, minutes: 120, focus_seconds: 45 * 60 })]);
    assert.equal(aq.tanks[0][0].minutes, 45);
    assert.equal(aq.tanks[0][0].rarity, "uncommon");
  });
});

describe("Sea life index", () => {
  test("counts per species and the first-caught date", () => {
    const aq = deriveAquarium([
      row({ endsAt: 30, species: "clownfish" }),
      row({ endsAt: 10, species: "clownfish" }),
      row({ endsAt: 20, species: "oarfish" }),
      row({ endsAt: 40, outcome: "failed", focus_seconds: 0 }), // no fish
      row({ endsAt: 50, session_type: "notes", species: null }), // no fish
    ]);
    const log = catchLog(aq);
    assert.equal(log.size, 2);
    assert.equal(log.get("clownfish")!.count, 2);
    assert.equal(log.get("clownfish")!.firstCaughtAt, new Date(T0 + 10 * 60_000).toISOString());
    assert.equal(log.get("oarfish")!.count, 1);
    assert.equal(log.has("megalodon"), false);
  });

  test("counts across every tank", () => {
    const rows = Array.from({ length: 12 }, (_, i) => row({ endsAt: 2000 + i, species: "seahorse" }));
    assert.equal(catchLog(deriveAquarium(rows)).get("seahorse")!.count, 12);
  });
});

describe("the nautilus", () => {
  test("joins at 100 credited hours of study + notes; failed time doesn't count", () => {
    const hour = (n: number, extra: Partial<SessionFacts> = {}) =>
      Array.from({ length: n }, () => row({ minutes: 60, ...extra }));
    assert.equal(deriveAquarium(hour(99)).nautilus, false);
    assert.equal(deriveAquarium([...hour(60), ...hour(40, { session_type: "notes" })]).nautilus, true);
    assert.equal(creditedHours(hour(5, { outcome: "failed" })), 0);
  });
});

describe("bones", () => {
  test("every failed session is one bone and never a fish", () => {
    const aq = deriveAquarium([
      row({ outcome: "failed", focus_seconds: 0 }),
      row({ outcome: "failed", focus_seconds: 10 }), // gave up after 10 s: still a bone
      row({ outcome: "completed", minutes: 30 }),
      row({ outcome: "partial", mode: "cycle", minutes: 25 }), // partial is not a bone
    ]);
    assert.equal(aq.bones, 2);
    assert.equal(aq.fishCount, 2);
  });
});

describe("notes sessions never create fish", () => {
  test("a long completed notes session: no fish, nothing in the tank", () => {
    const aq = deriveAquarium([row({ session_type: "notes", minutes: 95 })]);
    assert.equal(aq.fishCount, 0);
    assert.deepEqual(aq.tanks, [[]]);
  });

  test("notes in every mode and focus mode: still no fish", () => {
    const aq = deriveAquarium([
      row({ session_type: "notes", mode: "stopwatch", minutes: 52, target_minutes: 45 }),
      row({ session_type: "notes", mode: "cycle", outcome: "partial", minutes: 50 }),
      row({ session_type: "notes", focus_mode: "open", minutes: 30 }),
    ]);
    assert.equal(aq.fishCount, 0);
  });

  test("a failed notes session leaves no bone (bones = fish lost)", () => {
    const aq = deriveAquarium([
      row({ session_type: "notes", outcome: "failed", focus_seconds: 0 }),
      row({ session_type: "study", outcome: "failed", focus_seconds: 0 }),
    ]);
    assert.equal(aq.bones, 1);
  });

  test("study sessions next to notes ones still get their fish", () => {
    const aq = deriveAquarium([row({ session_type: "notes", minutes: 30 }), row({ minutes: 30 })]);
    assert.equal(aq.fishCount, 1);
  });
});

describe("tanks", () => {
  const many = (n: number) => Array.from({ length: n }, (_, i) => row({ endsAt: 1000 + i }));

  test("no fish → one empty Tank 1", () => {
    assert.deepEqual(deriveAquarium([]).tanks, [[]]);
  });

  test("10 fish fill exactly one tank", () => {
    const aq = deriveAquarium(many(TANK_CAPACITY));
    assert.equal(aq.tanks.length, 1);
    assert.equal(aq.tanks[0].length, 10);
  });

  test("the 11th fish starts Tank 2", () => {
    const rows = many(11);
    const aq = deriveAquarium(rows);
    assert.equal(aq.tanks.length, 2);
    assert.equal(aq.tanks[1].length, 1);
    assert.equal(tankIndexOf(aq, rows[10].id), 1);
  });

  test("tanks fill oldest first, whatever order rows arrive in", () => {
    const rows = many(11);
    const aq = deriveAquarium([...rows].reverse());
    assert.equal(aq.tanks[0][0].id, rows[0].id);
    assert.equal(aq.tanks[1][0].id, rows[10].id);
  });

  test("mixed timestamp formats still sort by real time", () => {
    const later = row({ endsAt: 5000 });
    const earlier = { ...row({ endsAt: 4000 }) };
    earlier.ended_at = earlier.ended_at.replace(".000Z", "+00:00"); // Postgres style
    const aq = deriveAquarium([later, earlier]);
    assert.equal(aq.tanks[0][0].id, earlier.id);
  });

  test("a queued (unsaved) session counts once, even if it's also saved", () => {
    const saved = row();
    const queued = row();
    const merged = mergeSessions([saved], [saved, queued]);
    assert.equal(merged.length, 2);
  });
});

describe("fish look", () => {
  test("same session id → same fish, every time", () => {
    const id = "6f1c2a9e-1111-4222-8333-944455556666";
    assert.deepEqual(fishLook(id), fishLook(id));
  });

  test("different ids → different fish", () => {
    const a = fishLook("6f1c2a9e-1111-4222-8333-944455556666");
    const b = fishLook("6f1c2a9e-1111-4222-8333-944455556667");
    assert.notDeepEqual(a, b);
  });
});
