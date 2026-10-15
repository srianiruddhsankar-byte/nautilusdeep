import { describe, test } from "node:test";
import assert from "node:assert/strict";
import {
  AMBIENCE_CHOICES,
  AMBIENCE_DESCRIPTION,
  AMBIENCE_LABEL,
  DEFAULT_VOLUME,
  DUCK_LEVEL,
  ambienceTarget,
  cleanVolume,
  previewTap,
} from "./ambience-logic.ts";
import { sanitizePrefs } from "./setup-prefs.ts";

const playing = { sound: "waves" as const, running: true, paused: false, volume: 0.6, alerting: false };

describe("when ambience plays", () => {
  test("a running session with a sound chosen: playing at its volume", () => {
    assert.deepEqual(ambienceTarget(playing), { sound: "waves", gain: 0.6 });
  });

  test("Off, or no choice (sessions started before Phase 8): silent", () => {
    assert.equal(ambienceTarget({ ...playing, sound: "off" }), null);
    assert.equal(ambienceTarget({ ...playing, sound: undefined }), null);
  });

  test("paused from the running screen: silent", () => {
    assert.equal(ambienceTarget({ ...playing, paused: true }), null);
  });

  test("the session ended or was cancelled: silent", () => {
    assert.equal(ambienceTarget({ ...playing, running: false }), null);
  });

  test("an alarm or check-in: ducked, not stopped", () => {
    assert.deepEqual(ambienceTarget({ ...playing, alerting: true }), {
      sound: "waves",
      gain: 0.6 * DUCK_LEVEL,
    });
  });

  test("paused stays silent even while alerting (no surprise sound)", () => {
    assert.equal(ambienceTarget({ ...playing, paused: true, alerting: true }), null);
  });
});

describe("volume and preferences", () => {
  test("volume is kept to 0–1 in 5% steps", () => {
    assert.equal(cleanVolume(1.4), 1);
    assert.equal(cleanVolume(-1), 0);
    assert.equal(cleanVolume(0.62), 0.6);
    assert.equal(cleanVolume("loud"), DEFAULT_VOLUME);
  });

  test("Ambience is off by default and remembered when set", () => {
    assert.deepEqual(sanitizePrefs({}).ambience, { sound: "off", volume: DEFAULT_VOLUME });
    assert.deepEqual(sanitizePrefs({ ambience: { sound: "underwater", volume: 0.35 } }).ambience, {
      sound: "underwater",
      volume: 0.35,
    });
    assert.deepEqual(sanitizePrefs({ ambience: { sound: "thunder", volume: 9 } }).ambience, {
      sound: "off",
      volume: 1,
    });
  });
});

describe("previews in Session settings", () => {
  test("tapping a sound chooses it and previews it", () => {
    assert.deepEqual(previewTap(null, "rain"), { choose: "rain", preview: "rain" });
  });

  test("tapping a different sound switches the preview (only one plays)", () => {
    assert.deepEqual(previewTap("rain", "harbour"), { choose: "harbour", preview: "harbour" });
  });

  test("tapping the one that's playing stops it, and it stays chosen", () => {
    assert.deepEqual(previewTap("rain", "rain"), { choose: "rain", preview: null });
  });

  test("Off chooses off and stops any preview", () => {
    assert.deepEqual(previewTap("deep", "off"), { choose: "off", preview: null });
  });

  test("every sound has a name and a one-line description, and old choices still load", () => {
    for (const c of AMBIENCE_CHOICES) {
      assert.ok(AMBIENCE_LABEL[c]);
      assert.ok(AMBIENCE_DESCRIPTION[c].length < 60, c);
    }
    assert.equal(sanitizePrefs({ ambience: { sound: "calm", volume: 0.5 } }).ambience.sound, "calm");
    assert.equal(sanitizePrefs({ ambience: { sound: "rockpool", volume: 0.5 } }).ambience.sound, "rockpool");
  });
});
