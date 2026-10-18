import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { deriveAquarium, type SessionFacts } from "./fish.ts";
import { isNewSpecies, resultMoments } from "./result-moments.ts";

const IST = "Asia/Kolkata";
const MIN = 60_000;
let nextId = 0;

function at(wall: string): number {
  return Date.parse(`${wall.replace(" ", "T")}:00+05:30`);
}

function session(startWall: string, minutes: number, overrides: Partial<SessionFacts> = {}): SessionFacts {
  const start = at(startWall);
  return {
    id: `00000000-0000-4000-8000-${String(nextId++).padStart(12, "0")}`,
    started_at: new Date(start).toISOString(),
    ended_at: new Date(start + minutes * MIN).toISOString(),
    mode: "timer",
    focus_mode: "deep",
    outcome: "completed",
    focus_seconds: minutes * 60,
    session_type: "study",
    task_name: null,
    target_minutes: null,
    cycle_name: null,
    ...overrides,
  };
}

const NOW = at("2026-10-14 12:00");

describe("streak moment", () => {
  test("the first study of the day grows the streak", () => {
    const rows = [session("2026-10-12 09:00", 30), session("2026-10-13 09:00", 30)];
    const today = session("2026-10-14 10:00", 30);
    assert.deepEqual(resultMoments([...rows, today], today, NOW, IST).streak, { from: 2, to: 3 });
  });

  test("works the same before the row is in the list (still in the upload queue)", () => {
    const rows = [session("2026-10-13 09:00", 30)];
    const today = session("2026-10-14 10:00", 30);
    assert.deepEqual(resultMoments(rows, today, NOW, IST).streak, { from: 1, to: 2 });
  });

  test("a second session on the same day changes nothing", () => {
    const first = session("2026-10-14 08:00", 30);
    const second = session("2026-10-14 10:00", 30);
    assert.equal(resultMoments([first, second], second, NOW, IST).streak, null);
  });

  test("under 5 minutes isn't a study day, and a failed session never counts", () => {
    const short = session("2026-10-14 10:00", 3);
    assert.equal(resultMoments([short], short, NOW, IST).streak, null);
    const failed = session("2026-10-14 10:00", 30, { outcome: "failed", focus_seconds: 0 });
    assert.equal(resultMoments([failed], failed, NOW, IST).streak, null);
  });

  test("starting a brand-new streak counts from 0", () => {
    const today = session("2026-10-14 10:00", 30);
    assert.deepEqual(resultMoments([today], today, NOW, IST).streak, { from: 0, to: 1 });
  });
});

describe("nautilus moment", () => {
  const hours = (n: number, wall = "2026-10-10 09:00") => session(wall, n * 60);

  test("only the session that crosses 100 hours brings it", () => {
    const past = hours(99.5);
    const crossing = session("2026-10-14 10:00", 40);
    assert.equal(resultMoments([past, crossing], crossing, NOW, IST).nautilus, true);
    const later = session("2026-10-14 11:00", 30);
    assert.equal(resultMoments([past, crossing, later], later, NOW, IST).nautilus, false);
  });

  test("notes time counts too; a failed session never brings it", () => {
    const past = hours(99.5);
    const notes = session("2026-10-14 10:00", 40, { session_type: "notes" });
    assert.equal(resultMoments([past, notes], notes, NOW, IST).nautilus, true);
    const failed = session("2026-10-14 10:00", 40, { outcome: "failed" });
    assert.equal(resultMoments([past, failed], failed, NOW, IST).nautilus, false);
  });
});

describe("new species", () => {
  test("new only when no OTHER fish is that species", () => {
    const a = session("2026-10-13 09:00", 30, { species: "clownfish" });
    const b = session("2026-10-14 09:00", 30, { species: "clownfish" });
    const c = session("2026-10-14 10:00", 30, { species: "royal_gramma" });
    const aquarium = deriveAquarium([a, b, c]);
    assert.equal(isNewSpecies(aquarium, b.id, "clownfish"), false);
    assert.equal(isNewSpecies(aquarium, c.id, "royal_gramma"), true);
    // The fish isn't in the tanks yet: still new if no one else is that species.
    assert.equal(isNewSpecies(deriveAquarium([a]), "not-yet", "royal_gramma"), true);
  });
});
