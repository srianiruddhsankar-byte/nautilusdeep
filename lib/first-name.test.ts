import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { firstName } from "./first-name.ts";

describe("firstName", () => {
  test("prefers Google's given name", () => {
    assert.equal(firstName({ given_name: "Sri", full_name: "Sri Aniruddh Sankar" }), "Sri");
  });
  test("falls back to the first word of the full name", () => {
    assert.equal(firstName({ full_name: "  Ada   Lovelace " }), "Ada");
    assert.equal(firstName({ name: "Grace Hopper" }), "Grace");
  });
  test("never returns an email or an empty name", () => {
    assert.equal(firstName({ name: "someone@example.com" }), null);
    assert.equal(firstName({ full_name: "   " }), null);
    assert.equal(firstName({}), null);
    assert.equal(firstName(undefined), null);
  });
});
