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
      night: { on: true, intervalMin: 45, style: "pulse" },
      ambience: { sound: "stream", volume: 0.4 },
      alarm: "silent",
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
      night: { on: "yes", intervalMin: 7, style: "siren" },
    });
    assert.equal(prefs.sessionType, "notes");
    assert.equal(prefs.mode, "timer");
    assert.equal(prefs.focusMode, "open");
    assert.equal(prefs.minutes, "25");
    assert.equal(prefs.target, "");
    assert.equal(prefs.cycleChoice, "pomodoro");
    assert.deepEqual(prefs.custom, { focusMin: "50", shortBreakMin: "5", longBreakMin: "15", blocksPerSet: "4" });
    assert.deepEqual(prefs.night, { on: false, intervalMin: 30, style: "chime" }); // Night mode stays off
  });

  test("the alarm is gentle unless another style was chosen (people who saved before it existed too)", () => {
    assert.equal(sanitizePrefs({}).alarm, "gentle");
    assert.equal(sanitizePrefs({ alarm: "chime" }).alarm, "chime");
    assert.equal(sanitizePrefs({ alarm: "siren" }).alarm, "gentle");
  });

  test("Night mode is off unless it was turned on, and the 1-minute test interval survives a reload", () => {
    assert.equal(sanitizePrefs({}).night.on, false);
    assert.equal(sanitizePrefs({ night: { on: true, intervalMin: 1, style: "vibrate" } }).night.intervalMin, 1);
  });

  test("a Custom interval is any whole number of minutes from 10 to 120", () => {
    const night = (intervalMin: unknown) => sanitizePrefs({ night: { on: true, intervalMin, style: "alarm" } }).night;
    assert.equal(night(10).intervalMin, 10);
    assert.equal(night(75).intervalMin, 75);
    assert.equal(night(120).intervalMin, 120);
    assert.equal(night(9).intervalMin, 30); // too short → the default
    assert.equal(night(121).intervalMin, 30);
    assert.equal(night(12.5).intervalMin, 30);
    assert.equal(night(75).style, "alarm");
  });
});
