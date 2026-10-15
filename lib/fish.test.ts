import { describe, test } from "node:test";
import assert from "node:assert/strict";
import {
  TANK_CAPACITY,
  deriveAquarium,
  fishSizeFor,
  mergeSessions,
  nextSize,
  tankIndexOf,
  type SessionFacts,
} from "./fish.ts";
import { fishLook } from "./fish-look.ts";

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

  test("Open Focus earns fish exactly like Deep Focus", () => {
    const aq = deriveAquarium([row({ focus_mode: "open", minutes: 30 })]);
    assert.equal(aq.tanks[0][0].size, "medium");
    assert.equal(aq.tanks[0][0].focusMode, "open");
  });
});

describe("size thresholds", () => {
  const cases: [number, string][] = [
    [5, "small"],
    [24, "small"],
    [25, "medium"],
    [49, "medium"],
    [50, "large"],
    [89, "large"],
    [90, "rare"],
    [240, "rare"],
  ];
  for (const [minutes, size] of cases) {
    test(`${minutes} min → ${size}`, () => assert.equal(fishSizeFor(minutes), size));
  }

  test("24 min 59 s is still small (minutes round down)", () => {
    const aq = deriveAquarium([row({ focus_seconds: 25 * 60 - 1 })]);
    assert.equal(aq.tanks[0][0].size, "small");
  });

  test("next size hint", () => {
    assert.deepEqual(nextSize(10), { size: "medium", atMinutes: 25 });
    assert.deepEqual(nextSize(89), { size: "rare", atMinutes: 90 });
    assert.equal(nextSize(90), null);
  });
});

describe("partial cycles", () => {
  test("sized by banked minutes, not time spent", () => {
    // 2 blocks of 25 banked (50 min) → large, even though more time passed.
    const aq = deriveAquarium([row({ mode: "cycle", outcome: "partial", minutes: 50 })]);
    assert.equal(aq.tanks[0][0].size, "large");
  });

  test("a partial cycle under 5 banked minutes earns no fish", () => {
    const aq = deriveAquarium([row({ mode: "cycle", outcome: "partial", minutes: 4 })]);
    assert.equal(aq.fishCount, 0);
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
