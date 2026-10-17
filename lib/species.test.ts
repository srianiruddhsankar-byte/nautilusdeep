import { describe, test } from "node:test";
import assert from "node:assert/strict";
import {
  NAUTILUS,
  ODDS,
  RARITIES,
  SPECIES,
  hasNautilus,
  hatch,
  isSpeciesId,
  nextOddsAt,
  oddsFor,
  poolOf,
  rarityFor,
  rollsFromId,
  speciesById,
  type Odds,
} from "./species.ts";

const TWO_32 = 2 ** 32;
// A tier roll at fraction p of the way through 0 … 2³²−1.
const at = (p: number) => Math.floor(p * TWO_32);

describe("catalogue", () => {
  test("18 species, ids unique, every tier has some", () => {
    assert.equal(SPECIES.length, 18);
    assert.equal(new Set(SPECIES.map((s) => s.id)).size, SPECIES.length);
    for (const rarity of RARITIES) assert.ok(poolOf(rarity).length >= 3, rarity);
  });

  test("every band's odds add up to 100", () => {
    for (const band of ODDS) {
      assert.equal(
        RARITIES.reduce((sum, r) => sum + band.odds[r], 0),
        100,
        `band from ${band.from}`,
      );
    }
  });

  test("the nautilus isn't in the roulette", () => {
    assert.ok(!isSpeciesId("nautilus"));
    assert.ok(SPECIES.every((s) => !s.name.toLowerCase().includes("nautilus")));
  });
});

describe("odds per time band", () => {
  const cases: [number, Odds][] = [
    [5, { common: 80, uncommon: 18, rare: 2, epic: 0, legendary: 0 }],
    [24, { common: 80, uncommon: 18, rare: 2, epic: 0, legendary: 0 }],
    [25, { common: 50, uncommon: 35, rare: 13, epic: 2, legendary: 0 }],
    [49, { common: 50, uncommon: 35, rare: 13, epic: 2, legendary: 0 }],
    [50, { common: 25, uncommon: 35, rare: 28, epic: 10, legendary: 2 }],
    [89, { common: 25, uncommon: 35, rare: 28, epic: 10, legendary: 2 }],
    [90, { common: 10, uncommon: 25, rare: 35, epic: 22, legendary: 8 }],
    [300, { common: 10, uncommon: 25, rare: 35, epic: 22, legendary: 8 }],
  ];
  for (const [minutes, odds] of cases) {
    test(`${minutes} min`, () => assert.deepEqual(oddsFor(minutes), odds));
  }

  test("next band hint", () => {
    assert.equal(nextOddsAt(5), 25);
    assert.equal(nextOddsAt(49), 50);
    assert.equal(nextOddsAt(89), 90);
    assert.equal(nextOddsAt(90), null);
  });
});

describe("the tier roll", () => {
  test("lands in each tier exactly at its edges (5–24 min band)", () => {
    const odds = oddsFor(10); // 80 / 18 / 2
    assert.equal(rarityFor(0, odds), "common");
    assert.equal(rarityFor(at(0.8) - 1, odds), "common");
    assert.equal(rarityFor(at(0.8) + 1, odds), "uncommon");
    assert.equal(rarityFor(at(0.98) - 1, odds), "uncommon");
    assert.equal(rarityFor(at(0.98) + 1, odds), "rare");
    assert.equal(rarityFor(TWO_32 - 1, odds), "rare"); // never epic or legendary under 25 min
  });

  test("90+ minutes can be legendary (the top 8%)", () => {
    const odds = oddsFor(95);
    assert.equal(rarityFor(at(0.91), odds), "epic");
    assert.equal(rarityFor(at(0.93), odds), "legendary");
    assert.equal(rarityFor(TWO_32 - 1, odds), "legendary");
  });

  test("the same roll is never LESS rare with more minutes", () => {
    const rank = (r: string) => RARITIES.indexOf(r as (typeof RARITIES)[number]);
    for (let i = 0; i < 200; i++) {
      const roll = at(i / 200);
      let previous = -1;
      for (const band of ODDS) {
        const now = rank(rarityFor(roll, band.odds));
        assert.ok(now >= previous, `roll ${i / 200} at ${band.from} min`);
        previous = now;
      }
    }
  });

  test("over many sessions, the shares match the odds", () => {
    // 10,000 evenly spread rolls: each tier's share is its percentage.
    for (const band of ODDS) {
      const counts = Object.fromEntries(RARITIES.map((r) => [r, 0]));
      for (let i = 0; i < 10_000; i++) counts[rarityFor(at((i + 0.5) / 10_000), band.odds)]++;
      for (const r of RARITIES) assert.equal(counts[r], band.odds[r] * 100, `${r} from ${band.from}`);
    }
  });
});

describe("deterministic picks (what the migration also computes)", () => {
  test("reads the first and last 8 hex digits of the id", () => {
    assert.deepEqual(rollsFromId("ffffffff-0000-4000-8000-0000000000aa"), { tier: TWO_32 - 1, pick: 0xaa });
    assert.deepEqual(rollsFromId("00000001-AAAA-4BBB-8CCC-DDDD00000003"), { tier: 1, pick: 3 });
  });

  // The same ids and answers are in the migration's check query (see the test
  // SQL), so the database's backfill and the app are known to agree.
  const KNOWN: [string, number, string][] = [
    ["00000000-0000-4000-8000-000000000000", 10, "green_chromis"], // roll 0: common, pick 0
    ["00000000-0000-4000-8000-000000000003", 10, "sergeant_major"], // common, pick 3
    ["cccccccc-0000-4000-8000-000000000001", 10, "blue_damselfish"], // just under 80%: still common, pick 1
    ["cd000000-0000-4000-8000-000000000001", 10, "pufferfish"], // 80.1%: uncommon, pick 1
    ["cd000000-0000-4000-8000-000000000001", 95, "sunfish"], // same id at 95 min: epic, pick 1
    ["fd000000-0000-4000-8000-000000000002", 10, "blue_tang"], // 98.8%: rare (the best under 25 min), pick 2
    ["fd000000-0000-4000-8000-000000000002", 95, "megalodon"], // same id at 95 min: legendary, pick 2
    ["f0000000-0000-4000-8000-000000000004", 95, "dunkleosteus"], // 93.75%: legendary, 4 mod 3 = 1
    ["a1b2c3d4-e5f6-4789-8abc-def012345678", 30, "clownfish"], // 63%: uncommon, 0x12345678 mod 4 = 0
  ];
  for (const [id, minutes, species] of KNOWN) {
    test(`${id.slice(0, 8)}… at ${minutes} min → ${species}`, () => assert.equal(hatch(id, minutes), species));
  }

  test("same id + minutes → same species, every time", () => {
    const id = "6f1c2a9e-1111-4222-8333-944455556666";
    assert.equal(hatch(id, 42), hatch(id, 42));
  });

  test("always a real species", () => {
    for (let i = 0; i < 300; i++) {
      const id = `${(i * 14316557).toString(16).padStart(8, "0").slice(-8)}-0000-4000-8000-${String(i).padStart(12, "0")}`;
      assert.ok(isSpeciesId(hatch(id, 5 + (i % 120))));
    }
  });

  test("tuning the odds changes NEW picks only through the table passed in", () => {
    const id = "cd000000-0000-4000-8000-000000000001"; // an 80.1% roll
    const generous = [{ from: 5, odds: { common: 0, uncommon: 0, rare: 0, epic: 0, legendary: 100 } }];
    assert.equal(speciesById(hatch(id, 10)).rarity, "uncommon");
    assert.equal(speciesById(hatch(id, 10, generous)).rarity, "legendary");
  });
});

describe("the namesake", () => {
  test(`joins at ${NAUTILUS.hours} credited hours`, () => {
    assert.ok(!hasNautilus(99.99));
    assert.ok(hasNautilus(100));
  });
});
