import { describe, test } from "node:test";
import assert from "node:assert/strict";
import {
  PREMADE_CYCLES,
  blocksFromSettings,
  describeBlocks,
  expandBlocks,
  parseBlocks,
  totalMinutes,
  type CycleBlock,
} from "./cycle-blocks.ts";
import {
  DEFAULT_CYCLE,
  endSession,
  getStatus,
  isFinalBreak,
  pressStop,
  startCycleBlocks,
  type Phase,
} from "./timer.ts";

const MIN = 60_000;
const T0 = 1_700_000_000_000;
const F = (m: number): Phase => ({ kind: "focus", ms: m * MIN });
const B = (m: number): Phase => ({ kind: "shortBreak", ms: m * MIN });
const L = (m: number): Phase => ({ kind: "longBreak", ms: m * MIN });
const premade = (id: string) => PREMADE_CYCLES.find((c) => c.id === id)!.blocks;

describe("blocks → phases", () => {
  test("Pomodoro: 4 × (25 focus, 5 break), the last break becomes the 15-minute long break", () => {
    assert.deepEqual(expandBlocks(premade("pomodoro")), [F(25), B(5), F(25), B(5), F(25), B(5), F(25), L(15)]);
    assert.equal(totalMinutes(premade("pomodoro")), 130);
  });

  test("50/10 × 2 ends after the second focus (no break left to rest for)", () => {
    assert.deepEqual(expandBlocks(premade("50-10")), [F(50), B(10), F(50)]);
  });

  test("Deep work is a single 90-minute focus block", () => {
    assert.deepEqual(expandBlocks(premade("deep-work")), [F(90)]);
  });

  test("Custom settings give the same timeline the old cycle mode built", () => {
    assert.deepEqual(expandBlocks(blocksFromSettings(DEFAULT_CYCLE)), expandBlocks(premade("pomodoro")));
    const one = blocksFromSettings({ focusMin: 40, shortBreakMin: 5, longBreakMin: 20, blocksPerSet: 1 });
    assert.deepEqual(expandBlocks(one), [F(40), L(20)]);
  });

  test("tidy-up rules: no leading break, neighbouring breaks collapse to the last", () => {
    const blocks: CycleBlock[] = [
      { type: "break", minutes: 5 },
      { type: "focus", minutes: 30 },
      { type: "break", minutes: 5 },
      { type: "break", minutes: 10 },
      { type: "focus", minutes: 30 },
      { type: "longBreak", minutes: 20 },
    ];
    assert.deepEqual(expandBlocks(blocks), [F(30), B(10), F(30), L(20)]);
  });

  test("a long break in the middle stays where it is", () => {
    const blocks: CycleBlock[] = [
      { type: "focus", minutes: 45 },
      { type: "longBreak", minutes: 20 },
      { type: "focus", minutes: 45 },
    ];
    assert.deepEqual(expandBlocks(blocks), [F(45), L(20), F(45)]);
  });

  test("describe for the setup screen", () => {
    assert.equal(describeBlocks(premade("pomodoro")), "(Focus 25 → Break 5) × 4 → Long break 15");
    assert.equal(describeBlocks(premade("deep-work")), "Focus 90");
  });
});

describe("checking blocks from the database", () => {
  test("valid blocks come back unchanged", () => {
    const json = JSON.parse(JSON.stringify(premade("pomodoro")));
    assert.deepEqual(parseBlocks(json), premade("pomodoro"));
  });

  test("anything malformed is rejected", () => {
    const bad: unknown[] = [
      null,
      [],
      [{ type: "focus", minutes: 0 }],
      [{ type: "focus", minutes: 601 }],
      [{ type: "focus", minutes: 2.5 }],
      [{ type: "nap", minutes: 20 }],
      [{ type: "break", minutes: 5 }], // no focus at all
      [{ type: "repeat", times: 13, blocks: [{ type: "focus", minutes: 25 }] }],
      [{ type: "repeat", times: 2, blocks: [] }],
      [{ type: "repeat", times: 2, blocks: [{ type: "repeat", times: 2, blocks: [] }] }], // nested repeat
      [{ type: "repeat", times: 12, blocks: Array(6).fill({ type: "focus", minutes: 5 }) }], // 72 phases: too long
    ];
    for (const data of bad) assert.equal(parseBlocks(data), null, JSON.stringify(data));
  });
});

describe("running a cycle built from blocks", () => {
  test("the session keeps the cycle's name", () => {
    const s = startCycleBlocks(premade("50-10"), T0, "deep", "50/10");
    assert.equal(s.cycleName, "50/10");
    assert.equal(endSession(s, "finished", T0 + 110 * MIN).cycleName, "50/10");
  });

  test("Deep work: one block, done after 90 minutes", () => {
    const s = startCycleBlocks(premade("deep-work"), T0, "deep", "Deep work");
    const r = endSession(s, "finished", T0 + 90 * MIN);
    assert.equal(r.outcome, "completed");
    assert.equal(r.blocksCompleted, 1);
    assert.equal(r.totalBlocks, 1);
  });

  test("Finish only on a FINAL long break: a mid-cycle long break isn't a free finish", () => {
    const blocks: CycleBlock[] = [
      { type: "focus", minutes: 45 },
      { type: "longBreak", minutes: 20 },
      { type: "focus", minutes: 45 },
    ];
    const s = startCycleBlocks(blocks, T0);
    const midBreak = T0 + 50 * MIN;
    assert.equal(getStatus(s, midBreak).kind, "longBreak");
    assert.equal(isFinalBreak(s, midBreak), false);
    const end = pressStop(s, midBreak);
    assert.equal(end.status === "ended" && end.result.endedBy, "stopped"); // ended early, partial

    const pomodoro = startCycleBlocks(premade("pomodoro"), T0);
    assert.equal(isFinalBreak(pomodoro, T0 + 120 * MIN), true);
  });
});
