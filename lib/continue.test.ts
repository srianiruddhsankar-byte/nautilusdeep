import { test } from "node:test";
import assert from "node:assert/strict";
import {
  canContinue,
  checkSession,
  CONTINUE_WINDOW_MS,
  continueSession,
  continueWindowRemainingMs,
  getStatus,
  pressStop,
  startCycleBlocks,
  startStopwatch,
  startTimer,
  withChain,
  withDetails,
  type Check,
  type Session,
} from "./timer.ts";
import { outcomeOf } from "./session-record.ts";

const MIN = 60_000;
const T0 = 1_700_000_000_000;

const timer = (minutes: number, task = "Biology") =>
  withChain(withDetails({ ...startTimer(minutes, T0), id: "s1" }, { sessionType: "study", task, targetMinutes: null }));

function ended(check: Check) {
  assert.equal(check.status, "ended");
  return (check as Extract<Check, { status: "ended" }>).result;
}

test("a session without a chain still ends when its time is up", () => {
  const plain = startTimer(10, T0);
  assert.equal(checkSession(plain, T0 + 10 * MIN).status, "ended");
});

test("when time is up it waits in a break, then ends by itself at the last block", () => {
  const s = timer(12);
  const atEnd = T0 + 12 * MIN;
  assert.equal(checkSession(s, atEnd).status, "running");
  const status = getStatus(s, atEnd + MIN);
  assert.equal(status.waiting, true);
  assert.equal(canContinue(s, atEnd + MIN), true);
  assert.equal(continueWindowRemainingMs(s, atEnd + MIN), CONTINUE_WINDOW_MS - MIN);

  const result = ended(checkSession(s, atEnd + CONTINUE_WINDOW_MS));
  assert.equal(result.outcome, "completed");
  assert.equal(result.focusMs, 12 * MIN);
  assert.equal(result.endedAt, atEnd); // the break after it never counts
  assert.equal(result.parts, null); // one plain part
});

test("Finish in the break ends it at the last block", () => {
  const s = timer(12);
  const stop = pressStop(s, T0 + 20 * MIN);
  assert.equal(stop.status, "ended");
  const result = (stop as Extract<typeof stop, { status: "ended" }>).result;
  assert.equal(result.focusMs, 12 * MIN);
  assert.equal(result.endedAt, T0 + 12 * MIN);
  assert.equal(result.endedBy, "finished");
});

test("continuing: study, break, study — only study counts", () => {
  let s = timer(12);
  s = continueSession(s, T0 + 22 * MIN); // a 10 min break
  assert.equal(getStatus(s, T0 + 23 * MIN).kind, "focus");
  const result = ended(checkSession(s, T0 + 34 * MIN + CONTINUE_WINDOW_MS));
  assert.equal(result.focusMs, 24 * MIN);
  assert.equal(result.outcome, "completed");
  assert.equal(result.blocksCompleted, 2);
  assert.equal(result.endedAt, T0 + 34 * MIN);
  assert.deepEqual(result.parts, [
    { type: "focus", seconds: 720, task: "Biology" },
    { type: "break", seconds: 600 },
    { type: "focus", seconds: 720, task: "Biology" },
  ]);
});

test("a continuation can change its length and task", () => {
  let s = timer(12);
  s = continueSession(s, T0 + 15 * MIN, { minutes: 20, task: "  Maths " });
  assert.equal(s.task, "Maths");
  const result = ended(pressStop(s, T0 + 35 * MIN + MIN));
  assert.equal(result.focusMs, 32 * MIN);
  assert.equal(result.task, "Maths");
  assert.deepEqual(
    result.parts?.map((p) => [p.type, p.seconds, p.task ?? null]),
    [
      ["focus", 720, "Biology"],
      ["break", 180, null],
      ["focus", 1200, "Maths"],
    ],
  );
});

test("can't continue after the window, or before every block is done", () => {
  const s = timer(12);
  assert.equal(canContinue(s, T0 + 5 * MIN), false);
  assert.equal(continueSession(s, T0 + 12 * MIN + CONTINUE_WINDOW_MS + 1), s);
});

test("giving up a continuation loses only that part (partial, no bone)", () => {
  let s = timer(12);
  s = continueSession(s, T0 + 14 * MIN);
  const stop = pressStop(s, T0 + 20 * MIN); // 6 min into the second part
  const result = (stop as Extract<typeof stop, { status: "ended" }>).result;
  assert.equal(result.focusMs, 12 * MIN);
  assert.equal(result.lostMs, 6 * MIN);
  assert.equal(outcomeOf(result), "partial");
  assert.deepEqual(result.parts?.length, 1); // the lost part and the break aren't kept
});

test("giving up the first part still fails the session", () => {
  const s = timer(12);
  const stop = pressStop(s, T0 + 5 * MIN);
  assert.equal((stop as Extract<typeof stop, { status: "ended" }>).result.outcome, "failed");
});

test("cancelling a continuation in its first 10 s goes back to the break", () => {
  const s = timer(12);
  const c = continueSession(s, T0 + 14 * MIN);
  const stop = pressStop(c, T0 + 14 * MIN + 4000);
  assert.equal(stop.status, "updated");
  const back = (stop as Extract<typeof stop, { status: "updated" }>).session;
  assert.deepEqual(back.phases, s.phases);
  assert.equal(back.chain?.parts.length, 1);
  assert.equal(getStatus(back, T0 + 15 * MIN).waiting, true);
});

test("leaving in a continuation's first 10 s also goes back to the break", () => {
  const c = { ...continueSession(timer(12), T0 + 14 * MIN), awaySince: T0 + 14 * MIN + 2000 };
  assert.equal(checkSession(c, T0 + 14 * MIN + 30_000).status, "updated");
});

test("leaving during the break is safe; leaving a continuation loses only it", () => {
  const s = { ...timer(12), awaySince: T0 + 13 * MIN };
  assert.equal(checkSession(s, T0 + 20 * MIN).status, "running");
  const c = { ...continueSession(timer(12), T0 + 14 * MIN), awaySince: T0 + 16 * MIN };
  // Away longer than the pause that takes over (5 min) + 15 s.
  const result = ended(checkSession(c, T0 + 22 * MIN));
  assert.equal(result.endedBy, "left");
  assert.equal(result.focusMs, 12 * MIN);
  assert.equal(outcomeOf(result), "partial");
});

test("a stopwatch part's Stop starts the break; Finish keeps its time", () => {
  let s = withChain(startStopwatch(T0));
  const stop = pressStop(s, T0 + 9 * MIN);
  assert.equal(stop.status, "updated");
  s = (stop as Extract<typeof stop, { status: "updated" }>).session;
  assert.equal(getStatus(s, T0 + 10 * MIN).waiting, true);
  s = continueSession(s, T0 + 11 * MIN);
  assert.equal(s.phases[s.phases.length - 1].ms, null); // another stopwatch
  s = (pressStop(s, T0 + 16 * MIN) as Extract<Check, { status: "updated" }>).session;
  const result = ended(pressStop(s, T0 + 17 * MIN) as Check);
  assert.equal(result.focusMs, 14 * MIN);
  assert.equal(result.outcome, "completed");
});

test("a cycle continues with its whole set; continuing ends the final long break", () => {
  const blocks = [
    { type: "focus" as const, minutes: 25 },
    { type: "break" as const, minutes: 5 },
    { type: "focus" as const, minutes: 25 },
    { type: "longBreak" as const, minutes: 15 },
  ];
  let s: Session = withChain(startCycleBlocks(blocks, T0, "deep", "Mine"));
  const inLongBreak = T0 + 60 * MIN;
  assert.equal(canContinue(s, inLongBreak), true);
  s = continueSession(s, inLongBreak);
  assert.equal(s.phases.length, 8);
  assert.equal(s.phases[3].ms, 5 * MIN); // the long break ended when you continued
  const result = ended(pressStop(s, inLongBreak + 55 * MIN) as Check); // in the second set's long break: Finish
  assert.equal(result.focusMs, 100 * MIN);
  assert.equal(result.blocksCompleted, 4);
  assert.equal(result.parts?.filter((p) => p.type === "focus").length, 4);
});
