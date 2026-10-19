import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { VISIBLE_LOOKAHEAD_MS, pushPlan, pushSupport, sessionAlerts, showPushOffer, type PushAlert } from "./push-schedule.ts";
import {
  DEFAULT_CYCLE,
  confirmCheckIn,
  continueSession,
  endPause,
  pressStop,
  startCycle,
  startPause,
  startStopwatch,
  startTimer,
  withChain,
  type Session,
} from "./timer.ts";

const SEC = 1000;
const MIN = 60 * SEC;
const T0 = 1_700_000_000_000;
const hidden = { visible: false };
const visible = { visible: true };

const brief = (alerts: PushAlert[]) => alerts.map((a) => `${a.key} @${(a.at - T0) / MIN} ${a.title}`);
// Pomodoro (25/5 × 4 + 15), continuable like every session started today.
const pomodoro = (focusMode: "deep" | "open") => withChain(startCycle(DEFAULT_CYCLE, T0, focusMode));

describe("a timer", () => {
  test("Open Focus, app in the background: Time's up when it reaches zero", () => {
    const s = withChain(startTimer(25, T0, "open"));
    assert.deepEqual(brief(pushPlan(s, T0 + MIN, hidden)), ["end:0 @25 Time's up"]);
    assert.match(pushPlan(s, T0 + MIN, hidden)[0].body, /continue within 15 minutes/);
  });

  test("on screen, the last 30 s are left to the in-app alarm", () => {
    const s = withChain(startTimer(25, T0, "open"));
    const now = T0 + 25 * MIN - 20 * SEC;
    assert.deepEqual(pushPlan(s, now, visible), []);
    assert.equal(pushPlan(s, now, hidden).length, 1); // hiding puts it back
    assert.equal(pushPlan(s, T0 + 25 * MIN - VISIBLE_LOOKAHEAD_MS - SEC, visible).length, 1);
  });

  test("nothing once its moment has passed", () => {
    const s = withChain(startTimer(25, T0, "open"));
    assert.deepEqual(pushPlan(s, T0 + 25 * MIN, hidden), []);
  });

  test("a session started before Continue existed says Session complete", () => {
    assert.deepEqual(brief(pushPlan(startTimer(25, T0, "open"), T0, hidden)), ["end:0 @25 Session complete"]);
  });
});

describe("Deep Focus: never announce a block that leaving has lost", () => {
  test("during focus the server holds nothing (leaving would end it first)", () => {
    const s = withChain(startTimer(25, T0, "deep"));
    assert.deepEqual(pushPlan(s, T0 + MIN, hidden), []);
    assert.deepEqual(pushPlan({ ...s, awaySince: T0 + MIN }, T0 + MIN, hidden), []);
  });

  test("leaving in the last 15 s still finishes the block, so it rings", () => {
    const s = withChain(startTimer(25, T0, "deep"));
    const now = T0 + 25 * MIN - 10 * SEC;
    assert.deepEqual(brief(pushPlan({ ...s, awaySince: now }, now, hidden)), ["end:0 @25 Time's up"]);
  });

  test("in a cycle's break: only Break's over (the next focus block would fail)", () => {
    const now = T0 + 27 * MIN;
    assert.deepEqual(brief(pushPlan(pomodoro("deep"), now, hidden)), ["end:1 @30 Break's over"]);
  });

  test("a leave that has already run out of grace: nothing at all", () => {
    const s = { ...withChain(startTimer(25, T0, "deep")), awaySince: T0 + MIN };
    assert.deepEqual(pushPlan(s, T0 + 2 * MIN, hidden), []);
  });
});

describe("cycles", () => {
  test("Open Focus: every phase end, and the final long break ends quietly", () => {
    assert.deepEqual(brief(pushPlan(pomodoro("open"), T0 + MIN, hidden)), [
      "end:0 @25 Focus block done",
      "end:1 @30 Break's over",
      "end:2 @55 Focus block done",
      "end:3 @60 Break's over",
      "end:4 @85 Focus block done",
      "end:5 @90 Break's over",
      "end:6 @115 Focus block done",
    ]);
    const plan = pushPlan(pomodoro("open"), T0 + MIN, hidden);
    assert.equal(plan[1].body, "Focus 2 of 4 has started.");
    assert.equal(plan[6].body, "Long break. Every block is banked.");
  });

  test("a cycle ending with a focus block (50/10 × 2) says Time's up at the end", () => {
    const base = startTimer(50, T0, "open");
    const s = withChain({
      ...base,
      mode: "cycle",
      phases: [
        { kind: "focus", ms: 50 * MIN },
        { kind: "shortBreak", ms: 10 * MIN },
        { kind: "focus", ms: 50 * MIN },
      ],
    });
    assert.deepEqual(brief(pushPlan(s, T0, hidden)), [
      "end:0 @50 Focus block done",
      "end:1 @60 Break's over",
      "end:2 @110 Time's up",
    ]);
  });

  test("a continued cycle: the new set's ends, with stable keys", () => {
    const s = withChain(startTimer(10, T0, "open"));
    const next = continueSession(s, T0 + 12 * MIN, { minutes: 20 });
    // phases: focus 10, the 2-minute break so far, focus 20
    assert.deepEqual(brief(pushPlan(next, T0 + 12 * MIN, hidden)), ["end:2 @32 Time's up"]);
  });
});

describe("pause", () => {
  test("Pause over when it runs out, and later ends move by the full 5 minutes", () => {
    const s = startPause(withChain(startTimer(25, T0, "deep")), T0 + 10 * MIN);
    const now = T0 + 11 * MIN;
    assert.deepEqual(brief(sessionAlerts(s, now)), ["pause @15 Pause over", "end:0 @30 Time's up"]);
    // Deep Focus: the end itself is left out (leaving after the pause would fail it).
    assert.deepEqual(brief(pushPlan(s, now, hidden)), ["pause @15 Pause over"]);
  });

  test("Resume early: no Pause over, ends moved by the real pause", () => {
    const s = endPause(startPause(withChain(startTimer(25, T0, "deep")), T0 + 10 * MIN), T0 + 12 * MIN);
    assert.deepEqual(brief(sessionAlerts(s, T0 + 13 * MIN)), ["end:0 @27 Time's up"]);
  });
});

describe("Night mode", () => {
  // A check-in every 30 min of focus: due 30 min into focus (5 min into block 2,
  // at 35), unanswered by 37 the session would end at the start.
  const night = (): Session => ({ ...pomodoro("open"), checkIn: { intervalMs: 30 * MIN, style: "chime" } });

  test("nothing after a missed check-in's deadline", () => {
    assert.deepEqual(brief(pushPlan(night(), T0 + MIN, hidden)), ["end:0 @25 Focus block done", "end:1 @30 Break's over"]);
  });

  test("confirming one brings the next stretch back", () => {
    const s = confirmCheckIn(night(), T0 + 35 * MIN);
    // next due after 30 more focus minutes: 20 in block 2, 10 in block 3 (at 70), deadline 72
    assert.deepEqual(brief(pushPlan(s, T0 + 35 * MIN, hidden)), [
      "end:2 @55 Focus block done",
      "end:3 @60 Break's over",
    ]);
  });
});

describe("stopwatch", () => {
  test("no end, so nothing; stopping into its break doesn't ring either", () => {
    const s = withChain(startStopwatch(T0, "open"));
    assert.deepEqual(pushPlan(s, T0 + MIN, hidden), []);
    const stopped = pressStop(s, T0 + 20 * MIN);
    assert.equal(stopped.status, "updated");
    if (stopped.status === "updated") assert.deepEqual(pushPlan(stopped.session, T0 + 20 * MIN, hidden), []);
  });
});

describe("can this device get them?", () => {
  const base = { hasPush: true, ios: false, standalone: false, permission: "default" as const };
  test("support", () => {
    assert.equal(pushSupport(base), "ready");
    assert.equal(pushSupport({ ...base, permission: "granted" }), "ready");
    assert.equal(pushSupport({ ...base, permission: "denied" }), "blocked");
    assert.equal(pushSupport({ ...base, hasPush: false }), "unsupported");
    assert.equal(pushSupport({ ...base, permission: null }), "unsupported");
    // iPhone in Safari: install first (Safari has no push outside the installed app)
    assert.equal(pushSupport({ ...base, ios: true, hasPush: false, permission: null }), "install-first");
    assert.equal(pushSupport({ ...base, ios: true, standalone: true }), "ready");
  });

  test("the running screen's offer", () => {
    const offer = { support: "ready" as const, on: false, notNow: false, cancelWindow: false };
    assert.equal(showPushOffer(offer), true);
    assert.equal(showPushOffer({ ...offer, support: "install-first" }), true);
    assert.equal(showPushOffer({ ...offer, on: true }), false);
    assert.equal(showPushOffer({ ...offer, notNow: true }), false);
    assert.equal(showPushOffer({ ...offer, cancelWindow: true }), false);
    assert.equal(showPushOffer({ ...offer, support: "blocked" }), false);
    assert.equal(showPushOffer({ ...offer, support: "unsupported" }), false);
  });
});
