"use client";

import { type ComponentType, memo, type ReactNode, useEffect, useState } from "react";
import { CLOWN } from "./fish-art";
import { restingFish } from "./scenery";
import { Tank3D } from "./tank-3d";
import { TankReal } from "./tank-real";
import { type LoopStats, useReducedMotion } from "./tank-loop";
import { StaticFish, TankSvg } from "./tank-svg";
import "./preview.css";

// Phase 9 Stage A, round 3: Paper Tide (C) for the whole UI, three ways to
// build a realistic tank (Tank 2, Canvas, was dropped in round 2's review). Everything except the tank is identical.
// All three tanks share one swim simulation (swim.ts) and one set of species
// art (fish-art.ts), so only the rendering differs.
// Only ONE tank runs at a time (the others aren't mounted, so they cost
// nothing), each at 30 fps unless switched to 60, and the loop pauses when the
// tab is hidden or the window loses focus (tank-loop.ts).

const DEFAULT_FPS = 30;

type TankProps = { id: string; still: boolean; maxFps: number; onStats: (s: LoopStats) => void };

type Option = {
  n: 1 | 3 | 4;
  name: string;
  tagline: string;
  Tank: ComponentType<TankProps>;
  tech: string;
  rig: string;
};

const OPTIONS: Option[] = [
  {
    n: 1,
    name: "Detailed SVG",
    tagline: "Illustrated vector art with gradients, shading, haze and caustics. Fish rigged on a bending spine.",
    Tank: memo(TankSvg),
    tech: "SVG drawn once by React; the loop rewrites path shapes directly (no re-render per frame). No libraries.",
    rig: "Body = true silhouette of a bending 3D spine, so turns swing through depth. Stripes and fins ride along.",
  },
  {
    n: 3,
    name: "Real 3D",
    tagline: "Three.js: 3D fish meshes made in code, fog, light rays, GPU caustics on sand, rocks and fish.",
    Tank: memo(Tank3D),
    tech: "Three.js (about 180 kB gzipped extra), loaded only with this tank. No downloaded models.",
    rig: "Rest-pose meshes bent along the same spine by a vertex shader: a genuinely 3D turn.",
  },
  {
    n: 4,
    name: "Game-style (Pixi)",
    tagline: "The real app's Tank 4 (app/_tank/tank4/) with a demo tank of ten species and the nautilus. Tap a fish.",
    Tank: memo(TankReal),
    tech: "PixiJS (WebGL), always 30 fps. All art is drawn once into textures; static layers are one texture.",
    rig: "The side drawing bends along the spine as a rope, always at full length. Every turn is a sideways U-curl.",
  },
];

export function DesignPreview({ fontClasses }: { fontClasses: string }) {
  const osReduced = useReducedMotion();
  const [forceStill, setForceStill] = useState(false);
  const [full, setFull] = useState<Option | null>(null);
  // The one tank that's running; Tank 4 (the chosen one) to begin with.
  const [playing, setPlaying] = useState<Option["n"] | null>(4);
  const still = osReduced || forceStill;

  return (
    <main className={`pv dir-c ${fontClasses} flex min-h-full flex-1 flex-col gap-6 px-4 py-6`}>
      <header className="mx-auto flex w-full max-w-6xl flex-col gap-3">
        <p className="pv-eyebrow">Phase 9 · Stage A · round 3</p>
        <h1 className="pv-title">Paper Tide, Tanks 1, 3 and 4</h1>
        <p className="pv-muted max-w-2xl">
          The UI is C (Paper Tide) everywhere. Only the tank differs. All three share the same swimming, and fish now
          steer around each other. Tank 4 combines Tank 1&rsquo;s look with GPU drawing and sideways U-turns. Dev only,
          not in the nav.
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <label className="pv-toggle">
            <input type="checkbox" checked={still} disabled={osReduced} onChange={(e) => setForceStill(e.target.checked)} />
            <span>Reduced motion{osReduced ? " (on in your system settings)" : ""}</span>
          </label>
          <nav aria-label="Tanks" className="flex gap-2 lg:hidden">
            {OPTIONS.map((o) => (
              <a key={o.n} href={`#tank-${o.n}`} className="pv-btn pv-btn-quiet">
                Tank {o.n}
              </a>
            ))}
          </nav>
        </div>
      </header>

      <div className="mx-auto grid w-full max-w-6xl gap-6 lg:grid-cols-3">
        {OPTIONS.map((o) => (
          <Panel
            key={o.n}
            o={o}
            still={still}
            live={!full && playing === o.n}
            onPlay={() => setPlaying(o.n)}
            onFull={() => setFull(o)}
          />
        ))}
      </div>

      {full && <RunningScreen o={full} still={still} onClose={() => setFull(null)} />}
    </main>
  );
}

function Panel({
  o,
  still,
  live,
  onPlay,
  onFull,
}: {
  o: Option;
  still: boolean;
  live: boolean;
  onPlay: () => void;
  onFull: () => void;
}) {
  const [maxFps, setMaxFps] = useState(DEFAULT_FPS);
  const [stats, setStats] = useState<LoopStats>({ fps: 0, ms: 0, running: false });
  const { Tank } = o;
  return (
    <section id={`tank-${o.n}`} aria-labelledby={`tank-${o.n}-name`} className="pv-dir">
      <div className="flex flex-col gap-1">
        <p className="pv-eyebrow">Tank {o.n}</p>
        <h2 id={`tank-${o.n}-name`} className="pv-title">
          {o.name}
        </h2>
        <p className="pv-muted">{o.tagline}</p>
      </div>

      <div className="flex flex-col gap-2">
        <div className="pv-tank">
          {live ? (
            <Tank id={`t${o.n}`} still={still} maxFps={maxFps} onStats={setStats} />
          ) : (
            <div className="pv-tank-idle">
              <button type="button" className="pv-btn pv-btn-primary" onClick={onPlay}>
                <PlayIcon /> Play Tank {o.n}
              </button>
            </div>
          )}
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2">
          {live ? <Meter stats={stats} still={still} /> : <p className="pv-meter">Not running</p>}
          <div className="flex items-center gap-2">
            <Segmented value={maxFps} onChange={setMaxFps} />
            <button type="button" className="pv-btn pv-btn-secondary pv-btn-sm" onClick={onFull}>
              Running screen
            </button>
          </div>
        </div>
      </div>

      <Timer />

      <div className="flex flex-col gap-3">
        <Label>Buttons</Label>
        <button type="button" className="pv-btn pv-btn-primary pv-btn-lg">
          <PlayIcon /> Start · Biology notes
        </button>
        <div className="flex flex-wrap gap-2">
          <button type="button" className="pv-btn pv-btn-secondary">
            Change
          </button>
          <button type="button" className="pv-btn pv-btn-quiet">
            Pause
          </button>
          <button type="button" className="pv-btn pv-btn-outline">
            Give up
          </button>
          <button type="button" className="pv-btn pv-btn-primary" disabled>
            Disabled
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <Label>Card</Label>
        <TodayCard />
      </div>

      <div className="flex flex-col gap-3">
        <Label>Fish card</Label>
        <FishCard uid={`fc${o.n}`} />
      </div>

      <dl className="pv-spec">
        <Spec term="How it's built" value={o.tech} />
        <Spec term="The fish" value={o.rig} />
      </dl>
    </section>
  );
}

// The running screen at real size, with only this tank animating (the panels'
// tanks are unmounted), so its cost can be judged on its own.
function RunningScreen({ o, still, onClose }: { o: Option; still: boolean; onClose: () => void }) {
  const [maxFps, setMaxFps] = useState(DEFAULT_FPS);
  const [stats, setStats] = useState<LoopStats>({ fps: 0, ms: 0, running: false });
  const { Tank } = o;
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  return (
    <div role="dialog" aria-modal="true" aria-label={`Tank ${o.n} running screen`} className="pv-running">
      <div className="pv-running-tank">
        <div className="pv-tank pv-tank-fill">
          <Tank id={`t${o.n}-full`} still={still} maxFps={maxFps} onStats={setStats} />
        </div>
      </div>
      <div className="pv-running-side">
        <div className="flex flex-col items-center gap-1 text-center">
          <span className="pv-eyebrow">Deep Focus · Biology notes</span>
          <span className="pv-time">18:42</span>
          <span className="pv-muted pv-small">Your fry hatches at 25 min</span>
        </div>
        <div className="flex flex-col items-center gap-2">
          <Meter stats={stats} still={still} />
          <Segmented value={maxFps} onChange={setMaxFps} />
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

function Meter({ stats, still }: { stats: LoopStats; still: boolean }) {
  return (
    <p className="pv-meter" aria-live="off">
      {still
        ? "Resting (reduced motion): 0 fps"
        : stats.running
          ? `${Math.round(stats.fps)} fps · ${stats.ms.toFixed(1)} ms script / frame`
          : "Paused (off screen, tab hidden or window not focused)"}
    </p>
  );
}

function Segmented({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div className="pv-seg" role="group" aria-label="Frame rate">
      {[60, 30].map((v) => (
        <button key={v} type="button" aria-pressed={value === v} onClick={() => onChange(v)}>
          {v} fps
        </button>
      ))}
    </div>
  );
}

function Label({ children }: { children: ReactNode }) {
  return <p className="pv-eyebrow">{children}</p>;
}

function Spec({ term, value }: { term: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="pv-eyebrow">{term}</dt>
      <dd className="pv-small">{value}</dd>
    </div>
  );
}

function TodayCard() {
  return (
    <div className="pv-card">
      <div className="pv-statline">
        <span>
          Today <b>1h 20m</b>
        </span>
        <span className="pv-streak">
          <FlameIcon /> <b>4-day</b> streak
        </span>
      </div>
      <div className="flex items-center justify-between pt-1">
        <h3 className="pv-card-title">Today</h3>
        <a href="#" className="pv-link">
          All tasks
        </a>
      </div>
      <ul className="pv-list">
        {[
          { name: "Biology: cell transport notes", meta: "Today" },
          { name: "Maths past paper 3", meta: "Yesterday" },
        ].map((t) => (
          <li key={t.name}>
            <button type="button" className="pv-row">
              <span className="pv-check" aria-hidden />
              <span className="flex min-w-0 flex-1 flex-col text-left">
                <span className="truncate">{t.name}</span>
                <span className="pv-muted pv-small">{t.meta}</span>
              </span>
              <span className="pv-link">Start</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

const CARD_FISH = restingFish("clown");

function FishCard({ uid }: { uid: string }) {
  return (
    <div className="pv-card pv-fishcard">
      <div className="pv-fishframe">
        <StaticFish art={CLOWN} fish={CARD_FISH} uid={uid} />
      </div>
      <div className="flex min-w-0 flex-col gap-1">
        <h3 className="pv-card-title">Clownfish</h3>
        <Rarity rank={2} label="Uncommon" />
        <p className="pv-muted pv-small">All clownfish hatch male. The biggest in a group can become female.</p>
      </div>
    </div>
  );
}

// Rarity is never colour alone: a count of pips AND the word.
function Rarity({ rank, label }: { rank: number; label: string }) {
  return (
    <p className="pv-rarity">
      <span aria-hidden className="pv-pips">
        {Array.from({ length: 5 }, (_, i) => (
          <span key={i} className={i < rank ? "pv-pip pv-pip-on" : "pv-pip"} />
        ))}
      </span>
      {label}
    </p>
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

function PlayIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor" aria-hidden>
      <path d="M8 5.5v13a1 1 0 0 0 1.5.86l10.4-6.5a1 1 0 0 0 0-1.72L9.5 4.64A1 1 0 0 0 8 5.5z" />
    </svg>
  );
}

function FlameIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M12 3c1 3.5 5 5.5 5 10a5 5 0 0 1-10 0c0-2 1-3.5 2-4.5.3 1.5 1 2.5 2 2.5-1-3 0-6 1-8z" />
    </svg>
  );
}
