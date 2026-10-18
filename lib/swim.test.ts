import { test } from "node:test";
import assert from "node:assert/strict";
import { createFish, NODES, rest, stepAll, TANK, type Fish, type SwimSpec } from "./swim.ts";

const SPEC: SwimSpec = {
  length: 40,
  cruise: 26,
  burst: 50,
  turn: 2,
  minRadius: 0.22,
  hover: 0.3,
  tailHz: [1, 0.05],
  girth: 0.25,
};

function cast(n: number): Fish[] {
  return Array.from({ length: n }, (_, i) =>
    createFish(`f${i}`, SPEC, 100 + i, { x: 80 + i * 30, y: 150 + (i % 3) * 25, z: (i % 2) * 10 - 5 }, i % 2 ? Math.PI : 0),
  );
}

const run = (fish: Fish[], seconds: number) => {
  for (let t = 0; t < seconds; t += 1 / 30) stepAll(fish, 1 / 30);
};

test("fish stay inside the tank", () => {
  const fish = cast(10);
  run(fish, 120);
  for (const f of fish) {
    assert.ok(f.p.x >= TANK.x0 - 20 && f.p.x <= TANK.x1 + 20, `x ${f.p.x}`);
    assert.ok(f.p.y >= TANK.y0 - 8 && f.p.y <= TANK.y1 + 10, `y ${f.p.y}`);
    assert.ok(f.p.z >= TANK.z0 - 10 && f.p.z <= TANK.z1 + 10, `z ${f.p.z}`);
  }
});

test("the same seeds swim the same way", () => {
  const a = cast(4);
  const b = cast(4);
  run(a, 20);
  run(b, 20);
  assert.deepEqual(
    a.map((f) => f.p),
    b.map((f) => f.p),
  );
});

test("the spine always keeps the body's full length", () => {
  const fish = cast(6);
  run(fish, 30);
  const seg = SPEC.length / (NODES - 1);
  for (const f of fish) {
    for (let i = 1; i < NODES; i++) {
      const a = f.spine[i - 1];
      const b = f.spine[i];
      assert.ok(Math.abs(Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z) - seg) < 1e-6);
    }
  }
});

test("fish don't overlap", () => {
  const fish = cast(10);
  run(fish, 60);
  // heads never sit inside each other (bodies are at least ~2 girths apart)
  for (let i = 0; i < fish.length; i++) {
    for (let j = i + 1; j < fish.length; j++) {
      const a = fish[i].p;
      const b = fish[j].p;
      assert.ok(Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z) > SPEC.girth * SPEC.length, `${i} and ${j}`);
    }
  }
});

test("a resting fish is straight, side-on and still", () => {
  const [f] = cast(1);
  rest(f, { x: 200, y: 150, z: 0 }, true);
  assert.equal(f.v, 0);
  assert.equal(f.yaw, Math.PI);
  for (const n of f.spine) assert.equal(n.y, 150);
  assert.ok(f.spine[NODES - 1].x > f.spine[0].x); // facing left: the tail is to the right
});

test("a fish with a roaming stretch mostly stays in it", () => {
  const zones = [80, 200, 320];
  const fish = zones.map((x, i) =>
    createFish(`r${i}`, { ...SPEC, roam: { x, range: 60 } }, 300 + i, { x, y: 170, z: 0 }, 0),
  );
  const sum = zones.map(() => 0);
  let n = 0;
  for (let t = 0; t < 180; t += 1 / 30) {
    stepAll(fish, 1 / 30);
    fish.forEach((f, i) => (sum[i] += f.p.x));
    n++;
  }
  zones.forEach((x, i) => assert.ok(Math.abs(sum[i] / n - x) < 50, `zone ${x}: average ${sum[i] / n}`));
});

test("a pulsing swimmer surges and glides", () => {
  const [f] = [createFish("p", { ...SPEC, hover: 0, pulse: 3 }, 9, { x: 100, y: 170, z: 0 }, 0)];
  const speeds: number[] = [];
  for (let t = 0; t < 30; t += 1 / 30) {
    stepAll([f], 1 / 30);
    speeds.push(f.v);
  }
  const late = speeds.slice(150);
  assert.ok(Math.max(...late) > Math.min(...late) * 1.6, "speed should rise and fall with each jet");
});
