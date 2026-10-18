"use client";

import { useEffect, useState } from "react";
import { NautilusMoment } from "../_focus/result-moments";
import { SpeciesSprite } from "../_tank/fish-sprite";
import { RevealDemo, TankReal } from "./tank-real";
import "./preview.css";

// Phase 9 design preview (dev only, not in the nav): Paper Tide's UI around
// Tank 4, the tank the app uses (app/_tank/tank4/), with a demo tank. Stage A
// compared three tanks here; Tanks 1 (SVG) and 3 (Three.js) were removed once
// Tank 4 was in the app.

export function DesignPreview({ fontClasses }: { fontClasses: string }) {
  const [full, setFull] = useState(false);

  return (
    <main className={`pv dir-c ${fontClasses} flex min-h-full flex-1 flex-col gap-6 px-4 py-6`}>
      <header className="mx-auto flex w-full max-w-3xl flex-col gap-3">
        <p className="pv-eyebrow">Phase 9 · design preview</p>
        <h1 className="pv-title">Paper Tide and Tank 4</h1>
        <p className="pv-muted max-w-2xl">
          The real tank with a demo cast (every odd shape and the nautilus). The menus switch the skin and the
          session&apos;s egg. Dev only, not in the nav.
        </p>
      </header>

      <section aria-labelledby="tank-4-name" className="pv-dir mx-auto w-full max-w-3xl">
        <div className="flex flex-col gap-1">
          <p className="pv-eyebrow">Tank 4</p>
          <h2 id="tank-4-name" className="pv-title">
            Game-style (Pixi)
          </h2>
          <p className="pv-muted">Art drawn once into textures and moved on the GPU. Tap a fish to highlight it.</p>
        </div>
        <div className="flex flex-col gap-2">
          <div className="pv-tank">{!full && <TankReal id="t4" />}</div>
          <div className="flex justify-end">
            <button type="button" className="pv-btn pv-btn-secondary pv-btn-sm" onClick={() => setFull(true)}>
              Running screen
            </button>
          </div>
        </div>

        <Timer />

        <div className="flex flex-col gap-3">
          <p className="pv-eyebrow">Fish card</p>
          <div className="pv-card pv-fishcard">
            <div className="pv-fishframe">
              <SpeciesSprite species="clownfish" width={72} />
            </div>
            <div className="flex min-w-0 flex-col gap-1">
              <h3 className="pv-card-title">Clownfish</h3>
              <p className="pv-muted pv-small">All clownfish hatch male. The biggest in a group can become female.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto flex w-full max-w-3xl flex-col gap-2" aria-label="Result screen stage">
        <p className="pv-eyebrow">Tank 4 · result screen</p>
        <RevealDemo />
      </section>

      <NautilusPreview />

      {full && <RunningScreen onClose={() => setFull(false)} />}
    </main>
  );
}

// The result screen's one-time nautilus moment (100 hours), the real component.
// Replay re-mounts it, so its slow arrival and halo play again.
function NautilusPreview() {
  const [run, setRun] = useState(0);
  return (
    <section className="mx-auto flex w-full max-w-md flex-col gap-3" aria-label="Nautilus unlock moment">
      <div className="flex items-center justify-between gap-3">
        <p className="pv-eyebrow">Result screen · nautilus unlock (100 hours)</p>
        <button type="button" className="pv-btn pv-btn-secondary pv-btn-sm" onClick={() => setRun(run + 1)}>
          Replay
        </button>
      </div>
      <NautilusMoment key={run} delayMs={300} />
    </section>
  );
}

// The running screen at real size, with only this tank animating (the panel's
// tank is unmounted), so its cost can be judged on its own.
function RunningScreen({ onClose }: { onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  return (
    <div role="dialog" aria-modal="true" aria-label="Tank 4 running screen" className="pv-running">
      <div className="pv-running-tank">
        <div className="pv-tank pv-tank-fill">
          <TankReal id="t4-full" />
        </div>
      </div>
      <div className="pv-running-side">
        <div className="flex flex-col items-center gap-1 text-center">
          <span className="pv-eyebrow">Deep Focus · Biology notes</span>
          <span className="pv-time">18:42</span>
          <span className="pv-muted pv-small">Your fry hatches at 25 min</span>
        </div>
        <div className="flex w-full max-w-xs flex-col gap-2">
          <button type="button" className="pv-btn pv-btn-outline">
            Give up
          </button>
          <button type="button" className="pv-btn pv-btn-quiet" onClick={onClose}>
            Close preview
          </button>
        </div>
      </div>
    </div>
  );
}

function Timer() {
  const progress = 1 - (18 * 60 + 42) / (25 * 60);
  return (
    <div className="pv-timer">
      <div className="pv-timer-text">
        <span className="pv-eyebrow">Deep Focus · Study</span>
        <span className="pv-time">18:42</span>
        <span className="pv-muted pv-small">Your fry hatches at 25 min</span>
      </div>
      <div className="pv-bar" aria-hidden>
        <span style={{ width: `${progress * 100}%` }} />
      </div>
    </div>
  );
}
