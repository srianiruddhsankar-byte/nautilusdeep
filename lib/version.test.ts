import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { displayVersion } from "./version.ts";
import { newestVersion } from "./whats-new.ts";

describe("version", () => {
  test("a release drops the .0, a small fix keeps its number", () => {
    assert.equal(displayVersion("0.14.0"), "v0.14");
    assert.equal(displayVersion("0.14.1"), "v0.14.1");
    assert.equal(displayVersion("1.0.0"), "v1.0");
  });

  test("missing or odd values show nothing", () => {
    assert.equal(displayVersion(undefined), null);
    assert.equal(displayVersion(""), null);
    assert.equal(displayVersion("0.14"), null);
    assert.equal(displayVersion("1.0.0-beta"), null);
  });

  // The rule in CLAUDE.md: package.json matches the newest CHANGELOG.md entry.
  test("package.json matches the newest CHANGELOG.md entry", () => {
    const pkg = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8")) as { version: string };
    const changelog = readFileSync(new URL("../CHANGELOG.md", import.meta.url), "utf8");
    assert.equal(displayVersion(pkg.version), newestVersion(changelog));
  });
});
