import { describe, test } from "node:test";
import assert from "node:assert/strict";
import type { SessionFacts } from "./fish.ts";
import { plantLook } from "./plant-look.ts";
import {
  MATURE_MINUTES,
  PLANTS_PER_TANK,
  deriveGarden,
  nextPlantStage,
  plantStageFor,
  previewPlant,
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

describe("stages", () => {
  const cases: [number, string][] = [
    [0, "seed"],
    [29, "seed"],
    [30, "sprout"],
    [89, "sprout"],
    [90, "young"],
    [179, "young"],
    [180, "full"],
    [299, "full"],
    [300, "mature"],
  ];
  for (const [minutes, stage] of cases) {
    test(`${minutes} min → ${stage}`, () => assert.equal(plantStageFor(minutes), stage));
  }

  test("next stage and the home-card wording", () => {
    assert.deepEqual(nextPlantStage(140), { stage: "full", atMinutes: 180 });
    assert.equal(toNextStage(140), "40 min to full");
    assert.equal(nextPlantStage(300), null);
    assert.equal(MATURE_MINUTES, 300);
  });
});

describe("growing", () => {
  test("notes minutes add up across sessions into one plant", () => {
    const g = deriveGarden([notes(60), notes(45)]);
    assert.equal(g.growing.minutes, 105);
    assert.equal(g.growing.stage, "young");
    assert.equal(g.matured.length, 0);
  });

  test("the 5-minute minimum: 4 minutes adds nothing, 5 minutes counts", () => {
    assert.equal(deriveGarden([notes(4)]).growing.minutes, 0);
    assert.equal(deriveGarden([notes(5)]).growing.minutes, 5);
  });

  test("partial notes cycles count their banked minutes", () => {
    const g = deriveGarden([notes(50, { mode: "cycle", outcome: "partial" })]);
    assert.equal(g.growing.minutes, 50);
  });

  test("study sessions never touch plants (any length, any outcome)", () => {
    const g = deriveGarden([study(300), study(90, { outcome: "failed", focus_seconds: 0 }), notes(30)]);
    assert.equal(g.growing.minutes, 30);
    assert.equal(g.growing.wilted, false);
    assert.equal(g.matured.length, 0);
  });
});

describe("failed notes sessions", () => {
  test("add no growth and wilt the plant until the next notes session that counts", () => {
    // Built in time order (each row ends after the one before).
    const first = notes(60);
    const failed = notes(40, { outcome: "failed", focus_seconds: 0 });
    const short = notes(3);
    const real = notes(20);

    const wilted = deriveGarden([first, failed]);
    assert.equal(wilted.growing.minutes, 60);
    assert.equal(wilted.growing.wilted, true);
    assert.deepEqual(wilted.bySession.get(failed.id), { counted: false, addedMinutes: 0, matured: [] });

    // A short (under 5 min) session doesn't revive it; a real one does.
    assert.equal(deriveGarden([first, failed, short]).growing.wilted, true);
    const revived = deriveGarden([first, failed, real]);
    assert.equal(revived.growing.wilted, false);
    assert.equal(revived.growing.minutes, 80);
  });

  test("a failed STUDY session doesn't wilt the plant", () => {
    const g = deriveGarden([notes(60), study(30, { outcome: "failed", focus_seconds: 0 })]);
    assert.equal(g.growing.wilted, false);
  });
});

describe("maturing and carry-over", () => {
  test("reaching 300 minutes matures the plant; extra minutes start the next seed", () => {
    const a = notes(200);
    const b = notes(130); // 100 to finish, 30 carry over
    const g = deriveGarden([a, b]);
    assert.equal(g.matured.length, 1);
    assert.equal(g.matured[0].id, a.id); // looks come from the session that started it
    assert.equal(g.matured[0].maturedAt, b.ended_at);
    assert.equal(g.matured[0].sessions, 2);
    assert.equal(g.growing.id, b.id); // the next seed was started by b
    assert.equal(g.growing.minutes, 30);
    assert.equal(g.growing.stage, "sprout");
    assert.deepEqual(g.bySession.get(b.id), { counted: true, addedMinutes: 130, matured: [g.matured[0]] });
  });

  test("exactly 300: matures with nothing left over (a fresh, empty seed)", () => {
    const g = deriveGarden([notes(300)]);
    assert.equal(g.matured.length, 1);
    assert.deepEqual(g.growing, { id: null, minutes: 0, stage: "seed", wilted: false });
  });

  test("one very long session can finish one plant and start the next (unique ids)", () => {
    const marathon = notes(650); // 300 + 300 + 50
    const g = deriveGarden([marathon]);
    assert.deepEqual(
      g.matured.map((p) => p.id),
      [marathon.id, `${marathon.id}#2`],
    );
    assert.equal(g.growing.id, `${marathon.id}#3`);
    assert.equal(g.growing.minutes, 50);
  });

  test("the live view: a running session's minutes on top, capped at mature", () => {
    const growing = deriveGarden([notes(250)]).growing;
    assert.deepEqual(previewPlant(growing, "running", 20), { id: growing.id, minutes: 270, stage: "full" });
    assert.equal(previewPlant(growing, "running", 80).stage, "mature");
    const fresh = deriveGarden([]).growing;
    assert.equal(previewPlant(fresh, "running", 10).id, "running"); // this session starts the seed
  });
});

describe("which tank a plant goes in", () => {
  const fishes = (n: number) => Array.from({ length: n }, () => study(25));

  test("the tank that was newest when it matured", () => {
    // 10 fish (Tank 1 full) → plant A matures in Tank 1. Then fish 11 starts Tank 2 → plant B goes there.
    const g = deriveGarden([...fishes(10), notes(300), study(25), notes(300)]);
    assert.deepEqual(
      g.matured.map((p) => [p.tank, p.slot]),
      [
        [0, 0],
        [1, 0],
      ],
    );
    assert.equal(g.tankCount, 2);
  });

  test("a plant stays in its tank when later fish start new tanks", () => {
    const g = deriveGarden([notes(300), ...fishes(25)]);
    assert.equal(g.matured[0].tank, 0);
    assert.equal(g.tankCount, 3);
  });

  test("a tank's plant slots fill up, then plants move on to the next tank", () => {
    const g = deriveGarden(Array.from({ length: PLANTS_PER_TANK + 1 }, () => notes(300)));
    assert.deepEqual(
      g.matured.map((p) => p.tank),
      [0, 0, 0, 0, 0, 0, 1],
    );
    assert.equal(g.matured[5].slot, 5);
    assert.equal(g.tankCount, 2); // a plant-only Tank 2; the 11th fish would join it
  });

  test("arrival order doesn't matter: sorted by end time", () => {
    const rows = [...fishes(10), notes(300), study(25), notes(300)];
    const shuffled = [rows[11], rows[3], rows[12], rows[10], ...rows.slice(0, 3), ...rows.slice(4, 10)];
    assert.deepEqual(deriveGarden(shuffled).matured, deriveGarden(rows).matured);
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
