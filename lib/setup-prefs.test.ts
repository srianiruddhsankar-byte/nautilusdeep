import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { DEFAULT_PREFS, sanitizePrefs, type SetupPrefs } from "./setup-prefs.ts";

describe("remembered setup", () => {
  test("nothing stored (first visit, private mode) → the defaults", () => {
    assert.deepEqual(sanitizePrefs(null), DEFAULT_PREFS);
    assert.deepEqual(sanitizePrefs("garbage"), DEFAULT_PREFS);
  });

  test("valid settings come back exactly as saved", () => {
    const saved: SetupPrefs = {
      sessionType: "notes",
      mode: "stopwatch",
      focusMode: "open",
      minutes: "45",
      target: "40",
      cycleChoice: "6f1c2a9e-1111-4222-8333-944455556666",
      custom: { focusMin: "50", shortBreakMin: "10", longBreakMin: "20", blocksPerSet: "3" },
    };
    assert.deepEqual(sanitizePrefs(JSON.parse(JSON.stringify(saved))), saved);
  });

  test("each bad field is reset on its own; the good ones are kept", () => {
    const prefs = sanitizePrefs({
      sessionType: "notes", // ok
      mode: "countdown", // unknown
      focusMode: "open", // ok
      minutes: "0", // too short
      target: "abc",
      cycleChoice: "",
      custom: { focusMin: "50", shortBreakMin: "-5", longBreakMin: "15", blocksPerSet: "13" },
    });
    assert.equal(prefs.sessionType, "notes");
    assert.equal(prefs.mode, "timer");
    assert.equal(prefs.focusMode, "open");
    assert.equal(prefs.minutes, "25");
    assert.equal(prefs.target, "");
    assert.equal(prefs.cycleChoice, "pomodoro");
    assert.deepEqual(prefs.custom, { focusMin: "50", shortBreakMin: "5", longBreakMin: "15", blocksPerSet: "4" });
  });
});
