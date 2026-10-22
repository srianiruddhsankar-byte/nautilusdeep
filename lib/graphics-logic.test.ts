import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { autoGraphics, effectiveGraphics, isGraphics } from "./graphics-logic.ts";

describe("graphics", () => {
  test("weak devices start on Low", () => {
    assert.equal(autoGraphics({ deviceMemory: 2, hardwareConcurrency: 8 }), "low");
    assert.equal(autoGraphics({ deviceMemory: 1 }), "low");
    assert.equal(autoGraphics({ hardwareConcurrency: 2 }), "low");
  });

  test("everything else starts on High", () => {
    assert.equal(autoGraphics({ deviceMemory: 4, hardwareConcurrency: 8 }), "high");
    assert.equal(autoGraphics({ hardwareConcurrency: 6 }), "high"); // an iPhone: no memory hint
    assert.equal(autoGraphics({}), "high");
    assert.equal(autoGraphics({ deviceMemory: 0, hardwareConcurrency: 0 }), "high"); // nonsense = unknown
  });

  test("a saved choice wins over the guess", () => {
    assert.equal(effectiveGraphics("high", { deviceMemory: 1 }), "high");
    assert.equal(effectiveGraphics("low", { deviceMemory: 8 }), "low");
    assert.equal(effectiveGraphics(null, { deviceMemory: 1 }), "low");
  });

  test("only the two ids are valid", () => {
    assert.ok(isGraphics("high"));
    assert.ok(isGraphics("low"));
    assert.ok(!isGraphics("medium"));
    assert.ok(!isGraphics(null));
  });
});
