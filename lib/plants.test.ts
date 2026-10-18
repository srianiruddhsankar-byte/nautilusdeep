import { describe, test } from "node:test";
import assert from "node:assert/strict";
import type { SessionFacts } from "./fish.ts";
import { plantLook } from "./plant-look.ts";
import {
  PLANT_MIN_MINUTES,
  PLANTS_PER_TANK,
  deriveGarden,
  growingSpot,
  nextPlantStage,
  plantStageFor,
  toNextStage,
} from "./plants.ts";

const T0 = Date.UTC(2026, 9, 1, 9, 0, 0);
let nextId = 0;
let nextEnd = 0;

// A session ending `endsAt` minutes after T0 (each new row ends later, so order is under control).
function row(overrides: Partial<SessionFacts> & { minutes?: number; endsAt?: number } = {}): SessionFacts {
  const { minutes = 60, endsAt = (nextEnd += 1000), ...rest } = overrides;
  const end = T0 + endsAt * 60_000;
  return {
    id: `00000000-0000-4000-8000-${String(nextId++).padStart(12, "0")}`,
    started_at: new Date(end - minutes * 60_000).toISOString(),
    ended_at: new Date(end).toISOString(),
    mode: "stopwatch",
    focus_mode: "deep",
    outcome: "completed",
    focus_seconds: minutes * 60,
    session_type: "notes",
    task_name: null,
    target_minutes: null,
    cycle_name: null,
    ...rest,
  };
}
const notes = (minutes: number, overrides: Partial<SessionFacts> = {}) => row({ minutes, ...overrides });
const study = (minutes: number, overrides: Partial<SessionFacts> = {}) =>
  row({ minutes, session_type: "study", mode: "timer", ...overrides });

const fishes = (n: number) => Array.from({ length: n }, () => study(25));

describe("stages", () => {
  const cases: [number, string][] = [
    [0, "seed"],
    [14, "seed"],
    [15, "sprout"],
    [29, "sprout"],
    [30, "young"],
    [59, "young"],
    [60, "full"],
    [119, "full"],
    [120, "mature"],
    [400, "mature"],
  ];
  for (const [minutes, stage] of cases) {
    test(`${minutes} min → ${stage}`, () => assert.equal(plantStageFor(minutes), stage));
  }

  test("next stage and the live wording", () => {
    assert.equal(PLANT_MIN_MINUTES, 15);
    assert.deepEqual(nextPlantStage(40), { stage: "full", atMinutes: 60 });
    assert.equal(toNextStage(40), "20 min to full");
    assert.equal(toNextStage(130), null);
  });
});

describe("one plant per notes session", () => {
  test("its length sets how far it grew", () => {
    const g = deriveGarden([notes(20), notes(45), notes(90), notes(150)]);
    assert.deepEqual(
      g.plants.map((p) => [p.stage, p.minutes]),
      [
        ["sprout", 20],
        ["young", 45],
        ["full", 90],
        ["mature", 150],
      ],
    );
  });

  test("under 15 minutes, failed sessions and study sessions leave no plant", () => {
    const g = deriveGarden([notes(14), notes(60, { outcome: "failed", focus_seconds: 0 }), study(60)]);
    assert.equal(g.plants.length, 0);
  });

  test("minutes never add up across sessions", () => {
    const g = deriveGarden([notes(10), notes(10), notes(10)]);
    assert.equal(g.plants.length, 0);
  });

  test("partial sessions count their credited minutes", () => {
    const g = deriveGarden([notes(35, { outcome: "partial", mode: "cycle" })]);
    assert.equal(g.plants[0].stage, "young");
  });

  test("each plant is its session (id, times) and bySession finds it", () => {
    const r = notes(30);
    const g = deriveGarden([r]);
    assert.equal(g.plants[0].id, r.id);
    assert.equal(g.plants[0].plantedAt, r.ended_at);
    assert.equal(g.bySession.get(r.id), g.plants[0]);
  });
});

describe("where plants go", () => {
  test("into the newest tank at the time, in the next free spot", () => {
    const rows = [notes(20), ...fishes(11), notes(20), notes(20)];
    const g = deriveGarden(rows);
    assert.deepEqual(
      g.plants.map((p) => [p.tank, p.slot]),
      [
        [0, 0],
        [1, 0],
        [1, 1],
      ],
    );
  });

  test("a full tank's plants overflow into the next tank", () => {
    const g = deriveGarden(Array.from({ length: PLANTS_PER_TANK + 1 }, () => notes(20)));
    assert.equal(g.plants[PLANTS_PER_TANK].tank, 1);
    assert.equal(g.tankCount, 2);
  });

  test("a running session's plant grows where it will be planted", () => {
    const g = deriveGarden([notes(20), notes(20)]);
    assert.deepEqual(growingSpot(g, 0), { tank: 0, slot: 2 });
    assert.deepEqual(growingSpot(g, 15), { tank: 1, slot: 0 }); // more fish now: a newer tank
    assert.deepEqual(growingSpot(null, 0), { tank: 0, slot: 0 });
  });

  test("arrival order doesn't matter: sorted by end time", () => {
    const rows = [...fishes(10), notes(130), study(25), notes(20)];
    const shuffled = [rows[11], rows[3], rows[12], rows[10], ...rows.slice(0, 3), ...rows.slice(4, 10)];
    assert.deepEqual(deriveGarden(shuffled).plants, deriveGarden(rows).plants);
  });
});

describe("plant looks", () => {
  test("same id → same plant, every time", () => {
    const id = "6f1c2a9e-1111-4222-8333-944455556666";
    assert.deepEqual(plantLook(id), plantLook(id));
  });

  test("different ids → different plants, and every look is in range", () => {
    const looks = Array.from({ length: 50 }, (_, i) => plantLook(`session-${i}`));
    assert.ok(new Set(looks.map((l) => JSON.stringify(l))).size > 45);
    assert.ok(new Set(looks.map((l) => l.shape)).size === 3); // all shapes turn up
    for (const l of looks) {
      assert.ok(l.leafHue >= 95 && l.leafHue < 150);
      assert.ok(l.lean >= -1 && l.lean <= 1);
    }
  });
});
