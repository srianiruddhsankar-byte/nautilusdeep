import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { broodCaption, broodStage } from "./brood.ts";

describe("egg stages", () => {
  const cases: [number, string][] = [
    [0, "eggs"],
    [1, "eggs"],
    [2, "eyed"],
    [4, "eyed"],
    [5, "fry"], // hatches at 5 min: the same moment it starts counting as a fish
    [9, "fry"],
    [50, "fry"], // stays a fry until the session ends, however long
    [240, "fry"],
  ];
  for (const [minutes, stage] of cases) {
    test(`${minutes} min → ${stage}`, () => assert.equal(broodStage(minutes), stage));
  }

  test("captions say what's next", () => {
    assert.equal(broodCaption(0), "A fish egg · its eyes appear at 2 min");
    assert.equal(broodCaption(3), "An eyed egg · it hatches at 5 min");
    assert.equal(broodCaption(6), "A fry · rarer fish get likelier at 25 min");
    assert.equal(broodCaption(60), "A fry · rarer fish get likelier at 90 min");
    assert.equal(broodCaption(95), "A fry · the best odds for a rare fish");
  });
});
