// One GPU canvas's life, for the tanks (tank-canvas.tsx, mini-canvas.tsx).
// No React, Pixi or DOM: the caller says how to make and remove a canvas and
// how to build on it, so the rules are tested in canvas-life.test.ts.
//
// Why: Next hides a page you leave instead of removing it (React <Activity>),
// so a component's effects stop and start again on the SAME DOM. A canvas
// whose WebGL context was destroyed can never be used again (Pixi loops
// forever on it and the whole app freezes). So:
// - every start makes a brand-new canvas,
// - every stop disposes the build and removes its canvas, even if the build
//   is still loading (then it's disposed the moment it finishes),
// - a failed build removes its canvas too.
// `liveCanvases()` counts canvases not yet removed (for the tests; the live
// WebGL context count is in app/_tank/tank4/textures.ts).

export type Disposable = { dispose: () => void };

let live = 0;
export const liveCanvases = () => live;

export function startCanvas<C, T extends Disposable>(steps: {
  create: () => C;
  remove: (canvas: C) => void;
  build: (canvas: C, stopped: () => boolean) => Promise<T>;
  ready: (built: T) => void;
  failed: (error: unknown) => void;
}): () => void {
  let stopped = false;
  let built: T | null = null;
  let released = false;
  const canvas = steps.create();
  live++;

  const release = () => {
    if (released) return;
    released = true;
    try {
      built?.dispose();
    } finally {
      built = null;
      steps.remove(canvas);
      live--;
    }
  };

  steps.build(canvas, () => stopped).then(
    (b) => {
      built = b;
      if (stopped) release();
      else steps.ready(b);
    },
    (error) => {
      release();
      if (!stopped) steps.failed(error);
    },
  );

  return () => {
    stopped = true;
    if (built) release(); // still building: released when it finishes
  };
}
