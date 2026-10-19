import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { liveCanvases, startCanvas } from "./canvas-life.ts";

// A fake tank: "canvases" are plain objects, a build takes a few ticks (like
// loading Pixi) and can fail, like a real one with no WebGL.
type FakeCanvas = { id: number; inPage: boolean; used: boolean };

function harness() {
  let next = 0;
  const canvases: FakeCanvas[] = [];
  const disposed = new Map<number, number>(); // canvas id → times its build was disposed
  let maxLive = 0;
  let ready = 0;
  let failed = 0;

  const mount = (ticks: number, fails = false) =>
    startCanvas<FakeCanvas, { dispose: () => void }>({
      create: () => {
        const c = { id: next++, inPage: true, used: false };
        canvases.push(c);
        maxLive = Math.max(maxLive, liveCanvases() + 1); // this one is counted just after
        return c;
      },
      remove: (c) => {
        assert.ok(c.inPage, "a canvas is removed once");
        c.inPage = false;
      },
      build: async (c) => {
        assert.ok(!c.used, "a canvas is never built on twice");
        c.used = true;
        for (let i = 0; i < ticks; i++) await Promise.resolve();
        if (fails) throw new Error("no WebGL");
        return { dispose: () => disposed.set(c.id, (disposed.get(c.id) ?? 0) + 1) };
      },
      ready: () => ready++,
      failed: () => failed++,
    });

  const settle = async () => {
    for (let i = 0; i < 50; i++) await Promise.resolve();
  };
  return { mount, settle, canvases, disposed, stats: () => ({ maxLive, ready, failed }) };
}

describe("canvas life", () => {
  test("mount and unmount 200 times: one live canvas at most, nothing left behind", async () => {
    const h = harness();
    let seed = 7;
    const rand = () => ((seed = (seed * 1103515245 + 12345) % 2 ** 31) / 2 ** 31);
    for (let i = 0; i < 200; i++) {
      const stop = h.mount(Math.floor(rand() * 4), rand() < 0.1);
      // leave mid-build sometimes, after it's ready other times (a page switch)
      const wait = Math.floor(rand() * 8);
      for (let j = 0; j < wait; j++) await Promise.resolve();
      stop();
      await h.settle(); // the old tank is fully gone before the next page shows
    }
    await h.settle();
    assert.equal(liveCanvases(), 0);
    assert.equal(h.stats().maxLive, 1);
    assert.equal(h.canvases.length, 200, "every start gets a brand-new canvas");
    assert.ok(h.canvases.every((c) => !c.inPage), "every canvas is removed");
    for (const n of h.disposed.values()) assert.equal(n, 1, "each build is disposed exactly once");
  });

  test("stopping during the build disposes it when it finishes, never shows it", async () => {
    const h = harness();
    const stop = h.mount(3);
    stop();
    assert.equal(h.canvases[0].inPage, true, "kept until the build finishes");
    await h.settle();
    assert.equal(h.canvases[0].inPage, false);
    assert.equal(h.disposed.get(0), 1);
    assert.equal(h.stats().ready, 0);
    assert.equal(liveCanvases(), 0);
  });

  test("a failed build removes its canvas and reports it (the fallback shows)", async () => {
    const h = harness();
    const stop = h.mount(1, true);
    await h.settle();
    assert.equal(h.stats().failed, 1);
    assert.equal(h.canvases[0].inPage, false);
    assert.equal(liveCanvases(), 0);
    stop(); // stopping afterwards is harmless
    assert.equal(liveCanvases(), 0);
  });

  test("leaving and coming back quickly: the old one is gone before the new one counts", async () => {
    const h = harness();
    for (let i = 0; i < 20; i++) {
      const stop = h.mount(0);
      await h.settle();
      stop();
    }
    assert.equal(h.stats().maxLive, 1);
    assert.equal(h.stats().ready, 20);
    assert.equal(liveCanvases(), 0);
  });
});
