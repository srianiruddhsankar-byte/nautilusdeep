import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { SEA_FACTS, seaFact } from "./sea-facts.ts";
import { SPECIES } from "./species.ts";

describe("sea facts", () => {
  test("every species fact plus the nautilus", () => {
    assert.equal(SEA_FACTS.length, SPECIES.length + 1);
    assert.ok(SEA_FACTS.some((f) => f.name === "Nautilus"));
  });

  test("the same seed always gives the same fact", () => {
    assert.deepEqual(seaFact("abc:break:3"), seaFact("abc:break:3"));
  });

  test("different seeds spread over the list", () => {
    const seen = new Set(Array.from({ length: 200 }, (_, i) => seaFact(`session-${i}`).name));
    assert.ok(seen.size > SEA_FACTS.length / 2);
  });

  test("works with any list", () => {
    const only = [{ name: "Octopus", fact: "Has three hearts." }];
    assert.deepEqual(seaFact("anything", only), only[0]);
  });
});
