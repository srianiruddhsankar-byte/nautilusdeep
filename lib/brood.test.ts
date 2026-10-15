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
    [10, "small"],
    [24, "small"],
    [25, "medium"],
    [50, "large"],
    [90, "rare"],
  ];
  for (const [minutes, stage] of cases) {
    test(`${minutes} min → ${stage}`, () => assert.equal(broodStage(minutes), stage));
  }

  test("captions say what's next", () => {
    assert.equal(broodCaption(0), "A fish egg · its eyes appear at 2 min");
    assert.equal(broodCaption(3), "An eyed egg · it hatches at 5 min");
    assert.equal(broodCaption(6), "It hatched! A fry · it grows into a small fish at 10 min");
    assert.equal(broodCaption(12), "Small fish · grows to Medium at 25 min");
    assert.equal(broodCaption(95), "Rare fish!");
  });
});
