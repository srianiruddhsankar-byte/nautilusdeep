import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { newestEntry, newestVersion, parseWhatsNew, showWhatsNew } from "./whats-new.ts";

const SAMPLE = `# Changelog

Intro text.

## v0.14 · 2026-10-23 · Quick wins 4: stats and safety

### What's new
- Stats start with a sentence or two, like **"More than last week"**.
- A stopwatch asks \`Still going?\` after 3 hours, so forgotten time
  doesn't count.

Ideas built: I-005, I-098

### Small fixes
- Not shown.

## v0.13 · 2026-10-22 · Quick wins 3

### What's new
- Older.
`;

describe("what's new", () => {
  test("the newest entry: name, id and plain-word bullets (wrapped lines joined)", () => {
    assert.deepEqual(newestEntry(SAMPLE), {
      id: "v0.14 · 2026-10-23 · Quick wins 4: stats and safety",
      name: "Quick wins 4: stats and safety",
      bullets: [
        'Stats start with a sentence or two, like "More than last week".',
        "A stopwatch asks Still going? after 3 hours, so forgotten time doesn't count.",
      ],
    });
  });

  test("no entries, or no What's new list: nothing to show", () => {
    assert.equal(newestEntry("# Changelog\n"), null);
    assert.equal(newestEntry("## v0.14 · 2026-10-23 · X\n\nIdeas built: none\n"), null);
  });

  test("a heading without a version isn't an entry", () => {
    assert.equal(newestEntry("## 2026-10-23 · Old style\n\n### What's new\n- Hidden.\n"), null);
    assert.equal(newestVersion("## 2026-10-23 · Old style\n"), null);
    assert.equal(newestVersion(SAMPLE), "v0.14");
  });

  test("the real CHANGELOG.md has a newest entry with bullets", () => {
    const entry = newestEntry(readFileSync(new URL("../CHANGELOG.md", import.meta.url), "utf8"));
    assert.ok(entry && entry.bullets.length > 0);
  });

  test("round trip through the env value; broken values are ignored", () => {
    const entry = newestEntry(SAMPLE)!;
    assert.deepEqual(parseWhatsNew(JSON.stringify(entry)), entry);
    assert.equal(parseWhatsNew(undefined), null);
    assert.equal(parseWhatsNew("{oops"), null);
    assert.equal(parseWhatsNew('{"id":1}'), null);
  });

  test("shown once, and never to a brand-new user", () => {
    const entry = newestEntry(SAMPLE)!;
    assert.equal(showWhatsNew(entry, null, true), true);
    assert.equal(showWhatsNew(entry, entry.id, true), false); // seen
    assert.equal(showWhatsNew(entry, "v0.13 · 2026-10-22 · Quick wins 3", true), true); // an older one was seen
    assert.equal(showWhatsNew(entry, null, false), false); // new here: nothing is "new"
    assert.equal(showWhatsNew(null, null, true), false);
  });
});
