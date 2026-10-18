import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { hasFinishedSession, iosBrowser, showInstallCard, type InstallFacts } from "./install-logic.ts";

const UA = {
  iphoneSafari:
    "Mozilla/5.0 (iPhone; CPU iPhone OS 18_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.0 Mobile/15E148 Safari/604.1",
  ipadSafari:
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.0 Safari/605.1.15",
  iphoneChrome:
    "Mozilla/5.0 (iPhone; CPU iPhone OS 18_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/141.0.7390.41 Mobile/15E148 Safari/604.1",
  iphoneFirefox:
    "Mozilla/5.0 (iPhone; CPU iPhone OS 18_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) FxiOS/143.0 Mobile/15E148 Safari/605.1.15",
  iphoneEdge:
    "Mozilla/5.0 (iPhone; CPU iPhone OS 18_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.0 EdgiOS/141.0.3537.52 Mobile/15E148 Safari/605.1.15",
  iphoneGoogleApp:
    "Mozilla/5.0 (iPhone; CPU iPhone OS 18_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) GSA/390.0.794 Mobile/15E148 Safari/604.1",
  iphoneInstagram:
    "Mozilla/5.0 (iPhone; CPU iPhone OS 18_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Instagram 400.0.0",
  macSafari:
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.0 Safari/605.1.15",
  androidChrome:
    "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Mobile Safari/537.36",
};

describe("iosBrowser", () => {
  test("tells the iPhone browsers apart", () => {
    assert.equal(iosBrowser(UA.iphoneSafari, 5), "safari");
    assert.equal(iosBrowser(UA.iphoneChrome, 5), "chrome");
    assert.equal(iosBrowser(UA.iphoneFirefox, 5), "firefox");
    assert.equal(iosBrowser(UA.iphoneEdge, 5), "edge");
  });
  test("apps with their own browser inside are 'other'", () => {
    assert.equal(iosBrowser(UA.iphoneGoogleApp, 5), "other");
    assert.equal(iosBrowser(UA.iphoneInstagram, 5), "other");
  });
  test("an iPad that says Macintosh is still an iPad; a Mac is not", () => {
    assert.equal(iosBrowser(UA.ipadSafari, 5), "safari");
    assert.equal(iosBrowser(UA.macSafari, 0), null);
  });
  test("Android is not iOS", () => {
    assert.equal(iosBrowser(UA.androidChrome, 5), null);
  });
});

describe("hasFinishedSession", () => {
  test("needs a completed or partial session", () => {
    assert.equal(hasFinishedSession(null), false);
    assert.equal(hasFinishedSession([]), false);
    assert.equal(hasFinishedSession([{ outcome: "failed" }]), false);
    assert.equal(hasFinishedSession([{ outcome: "failed" }, { outcome: "partial" }]), true);
    assert.equal(hasFinishedSession([{ outcome: "completed" }]), true);
  });
});

describe("showInstallCard", () => {
  const ready: InstallFacts = { installed: false, dismissed: false, finishedSession: true, canPrompt: true, ios: null };

  test("shows with an install dialog, or on an iPhone", () => {
    assert.equal(showInstallCard(ready), true);
    assert.equal(showInstallCard({ ...ready, canPrompt: false, ios: "safari" }), true);
    assert.equal(showInstallCard({ ...ready, canPrompt: false, ios: "other" }), true);
  });
  test("never before the first finished session", () => {
    assert.equal(showInstallCard({ ...ready, finishedSession: false }), false);
  });
  test("never again once dismissed or installed", () => {
    assert.equal(showInstallCard({ ...ready, dismissed: true }), false);
    assert.equal(showInstallCard({ ...ready, installed: true }), false);
    assert.equal(showInstallCard({ ...ready, installed: true, ios: "safari" }), false);
  });
  test("hidden where installing doesn't work", () => {
    assert.equal(showInstallCard({ ...ready, canPrompt: false, ios: null }), false);
  });
});
