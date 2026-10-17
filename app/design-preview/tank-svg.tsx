"use client";

import { useEffect, useRef } from "react";
import type { Art } from "./fish-art";
import { type Shape2D, shapeOf, smoothPath } from "./fish-2d";
import {
  ANEMONE_BASE,
  artOf,
  BLADES,
  bladePts,
  createCast,
  stepAll,
  makeParticles,
  restCast,
  SAND_TOP,
  stepParticles,
  TENTACLES,
  tentacle,
} from "./scenery";
import { emptyFrame, type Fish, frameOf } from "./swim";
import { causticTile, type LoopStats, useTankLoop } from "./tank-loop";

// Tank 1: detailed SVG. React draws the scene once; the loop then updates the
// moving shapes' attributes directly. Fish are rigged on the shared spine.

type FishEls = {
  g: SVGGElement;
  shadow: SVGEllipseElement;
  farPec: SVGPathElement;
  nearPec: SVGPathElement;
  caudal: SVGPathElement;
  dorsal: SVGPathElement;
  anal: SVGPathElement;
  pelvic: SVGPathElement | null;
  body: SVGPathElement;
  clip: SVGPathElement;
  marks: SVGPathElement[];
  sheen: SVGPathElement;
  eyes: SVGGElement[];
  grad: SVGLinearGradientElement;
};

const PARTICLES = 26;

type Sim = {
  fish: Fish[];
  els: FishEls[];
  t: number;
  parts: ReturnType<typeof makeParticles>;
  order: string;
  layers: SVGGElement[];
  blades: { el: SVGPathElement; b: (typeof BLADES)[number] }[];
  tentacles: SVGPathElement[];
  tips: SVGCircleElement[];
  rays: SVGPathElement[];
  caustics: SVGRectElement[];
  surface: SVGPathElement;
  particles: SVGCircleElement[];
};

export function TankSvg({ id, still, maxFps, onStats }: { id: string; still: boolean; maxFps: number; onStats: (s: LoopStats) => void }) {
  const host = useRef<HTMLDivElement>(null);
  const svg = useRef<SVGSVGElement>(null);
  const sim = useRef<Sim | null>(null);
  const frame = useRef(emptyFrame());

  // Find the moving elements once, and make the caustic texture.
  useEffect(() => {
    const root = svg.current!;
    const q = <T extends Element>(el: Element, sel: string) => el.querySelector(sel) as T;
    const fish = createCast();
    for (let i = 0; i < 90; i++) stepAll(fish, 1 / 30); // a few seconds in, so they're mid-swim
    const els = fish.map((f) => {
      const g = q<SVGGElement>(root, `[data-fish="${f.id}"]`);
      return {
        g,
        shadow: q<SVGEllipseElement>(root, `[data-shadow="${f.id}"]`),
        farPec: q<SVGPathElement>(g, ".far-pec"),
        nearPec: q<SVGPathElement>(g, ".near-pec"),
        caudal: q<SVGPathElement>(g, ".caudal"),
        dorsal: q<SVGPathElement>(g, ".dorsal"),
        anal: q<SVGPathElement>(g, ".anal"),
        pelvic: g.querySelector<SVGPathElement>(".pelvic"),
        body: q<SVGPathElement>(g, ".body"),
        clip: q<SVGPathElement>(root, `#${id}-${f.id}-clip path`),
        marks: Array.from(g.querySelectorAll<SVGPathElement>(".mark")),
        sheen: q<SVGPathElement>(g, ".sheen"),
        eyes: Array.from(g.querySelectorAll<SVGGElement>(".eye")),
        grad: q<SVGLinearGradientElement>(root, `#${id}-${f.id}-grad`),
      };
    });
    const all = <T extends Element>(sel: string) => Array.from(root.querySelectorAll<T>(sel));
    sim.current = {
      fish,
      els,
      t: 0,
      parts: makeParticles(PARTICLES, 7),
      order: "",
      layers: all<SVGGElement>(".far, .mid, .front"),
      blades: all<SVGPathElement>("[data-blade]").map((el) => ({ el, b: BLADES[Number(el.dataset.blade)] })),
      tentacles: all<SVGPathElement>(".tentacle"),
      tips: all<SVGCircleElement>(".tentacle-tip"),
      rays: all<SVGPathElement>(".ray"),
      caustics: all<SVGRectElement>(".caustic-a, .caustic-b"),
      surface: root.querySelector<SVGPathElement>(".surface")!,
      particles: all<SVGCircleElement>(".particle"),
    };
    const tile = causticTile(160, 3).toDataURL();
    root.querySelectorAll("image.caustic-img").forEach((im) => im.setAttribute("href", tile));
  }, [id]);

  const paint = (t: number) => {
    const s = sim.current;
    if (!s) return;
    const pan = Math.sin(t * 0.07) * 5; // a slow camera drift for parallax
    // fish, nearest last
    const shapes: { sh: Shape2D; i: number }[] = s.fish.map((f, i) => {
      frameOf(f, frame.current);
      return { sh: shapeOf(f, frame.current, artOf(f.id), pan), i };
    });
    shapes.forEach(({ sh, i }) => paintFish(s.els[i], sh));
    const order = [...shapes].sort((a, b) => a.sh.z - b.sh.z);
    const key = order.map((o) => o.i).join();
    if (key !== s.order) {
      s.order = key;
      for (const { i } of order) s.els[i].g.parentNode!.appendChild(s.els[i].g);
    }

    // parallax layers
    [0.35, 0.8, 1.5].forEach((k, i) => s.layers[i].setAttribute("transform", `translate(${(pan * k).toFixed(2)} 0)`));

    // plants and anemone
    for (const { el, b } of s.blades) el.setAttribute("d", smoothPath(bladePts(b, t)));
    TENTACLES.forEach((tn, i) => {
      const { base, ctrl, tip } = tentacle(tn, t);
      s.tentacles[i].setAttribute("d", `M${base.x.toFixed(1)} ${base.y.toFixed(1)}Q${ctrl.x.toFixed(1)} ${ctrl.y.toFixed(1)} ${tip.x.toFixed(1)} ${tip.y.toFixed(1)}`);
      s.tips[i].setAttribute("cx", tip.x.toFixed(1));
      s.tips[i].setAttribute("cy", tip.y.toFixed(1));
    });

    // light: rays breathe, caustics slide in two directions and interfere
    s.rays.forEach((el, i) => {
      el.setAttribute("opacity", (0.45 + 0.35 * Math.sin(t * 0.25 + i * 1.7)).toFixed(3));
      el.setAttribute("transform", `translate(${(Math.sin(t * 0.11 + i) * 8).toFixed(1)} 0)`);
    });
    s.caustics[0].setAttribute("transform", `translate(${((t * 7) % 160).toFixed(1)} ${((t * 3) % 160).toFixed(1)})`);
    s.caustics[1].setAttribute("transform", `translate(${(-(t * 5) % 160).toFixed(1)} ${((t * 4.5) % 160).toFixed(1)}) rotate(31 200 150)`);
    s.surface.setAttribute("d", surfacePath(t));
    s.particles.forEach((el, i) => {
      const p = s.parts[i];
      el.setAttribute("cx", (p.x + pan * (0.3 + p.d)).toFixed(1));
      el.setAttribute("cy", p.y.toFixed(1));
    });
  };

  useTankLoop(host, {
    id,
    still,
    maxFps,
    onStats,
    onFrame: (dt) => {
      const s = sim.current;
      if (!s) return;
      s.t += dt;
      stepAll(s.fish, dt);
      stepParticles(s.parts, dt, s.t);
      paint(s.t);
    },
    onStill: () => {
      const s = sim.current;
      if (!s) return;
      restCast(s.fish);
      paint(0);
    },
  });

  return (
    <div ref={host} className="absolute inset-0">
      <svg ref={svg} viewBox="0 0 400 300" preserveAspectRatio="xMidYMid slice" className="h-full w-full" aria-hidden>
        <defs>
          <linearGradient id={`${id}-water`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#b9e3e3" />
            <stop offset=".35" stopColor="#6fb4c2" />
            <stop offset=".75" stopColor="#3c839a" />
            <stop offset="1" stopColor="#2d6c82" />
          </linearGradient>
          <linearGradient id={`${id}-haze`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#8fc6cc" stopOpacity="0" />
            <stop offset=".7" stopColor="#8fc6cc" stopOpacity=".55" />
            <stop offset="1" stopColor="#a7d2d0" stopOpacity=".85" />
          </linearGradient>
          <linearGradient id={`${id}-ray`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#fffbe8" stopOpacity=".55" />
            <stop offset=".6" stopColor="#fffbe8" stopOpacity=".12" />
            <stop offset="1" stopColor="#fffbe8" stopOpacity="0" />
          </linearGradient>
          <linearGradient id={`${id}-sand`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#c9c09d" />
            <stop offset=".25" stopColor="#ddcfa6" />
            <stop offset="1" stopColor="#c7ad7c" />
          </linearGradient>
          <linearGradient id={`${id}-rock`} x1="0" y1="0" x2=".3" y2="1">
            <stop offset="0" stopColor="#9aa9a6" />
            <stop offset=".55" stopColor="#6d7f80" />
            <stop offset="1" stopColor="#4a5a5f" />
          </linearGradient>
          <linearGradient id={`${id}-tent`} x1="0" y1="1" x2="0" y2="0">
            <stop offset="0" stopColor="#a8577a" />
            <stop offset="1" stopColor="#f2b6c8" />
          </linearGradient>
          <radialGradient id={`${id}-shadow`}>
            <stop offset="0" stopColor="#1d3a3f" stopOpacity="1" />
            <stop offset="1" stopColor="#1d3a3f" stopOpacity="0" />
          </radialGradient>
          <radialGradient id={`${id}-vignette`} cx=".5" cy=".45" r=".75">
            <stop offset=".6" stopColor="#0b2a36" stopOpacity="0" />
            <stop offset="1" stopColor="#0b2a36" stopOpacity=".38" />
          </radialGradient>
          <pattern id={`${id}-caustic`} width="160" height="160" patternUnits="userSpaceOnUse">
            <image className="caustic-img" width="160" height="160" />
          </pattern>
          <clipPath id={`${id}-sandclip`}>
            <path d={SAND_D} />
          </clipPath>
          {["clown", "tang", "chromis-a", "chromis-b"].map((f) => (
            <FishDefs key={f} uid={`${id}-${f}`} art={artOf(f)} />
          ))}
        </defs>

        <rect width="400" height="300" fill={`url(#${id}-water)`} />

        {/* far: hazy reef and kelp, low contrast for depth */}
        <g className="far">
          <path d="M-20 222 C10 196 40 200 60 208 C80 186 120 190 140 204 C170 194 190 200 205 210 C230 188 270 192 290 206 C320 190 360 196 420 204 V240 H-20Z" fill="#6aa7b3" opacity=".55" />
          <path d="M236 214 C232 170 244 140 238 100 C250 140 252 176 246 214Z M252 214 C254 180 266 160 268 130 C272 166 262 192 260 214Z" fill="#5e9eaa" opacity=".5" />
          <path d="M20 214 C18 182 30 166 26 140 C36 168 36 192 30 214Z" fill="#5e9eaa" opacity=".45" />
        </g>

        <g className="rays" style={{ mixBlendMode: "screen" }}>
          <path className="ray" d="M70 -10h46l60 250h-80z" fill={`url(#${id}-ray)`} />
          <path className="ray" d="M180 -10h30l52 230h-58z" fill={`url(#${id}-ray)`} />
          <path className="ray" d="M262 -10h40l58 240h-70z" fill={`url(#${id}-ray)`} />
          <path className="ray" d="M335 -10h24l40 210h-42z" fill={`url(#${id}-ray)`} />
        </g>
        <path className="surface" d={surfacePath(0)} fill="#e9f7f4" opacity=".45" />

        {/* sand, with caustic light sliding over it */}
        <path d={SAND_D} fill={`url(#${id}-sand)`} />
        <g clipPath={`url(#${id}-sandclip)`} style={{ mixBlendMode: "screen" }} opacity=".45">
          <g transform="translate(0 150) scale(1 .45) translate(0 -150)">
            <rect className="caustic-a" x="-160" y="-160" width="720" height="620" fill={`url(#${id}-caustic)`} />
            <rect className="caustic-b" x="-200" y="-200" width="800" height="700" fill={`url(#${id}-caustic)`} opacity=".8" />
          </g>
        </g>
        <g fill="none" strokeLinecap="round">
          <path d="M20 262 C70 254 120 262 170 256" stroke="#f2e6c4" strokeWidth="1.4" opacity=".6" />
          <path d="M200 270 C250 262 300 270 360 262" stroke="#f2e6c4" strokeWidth="1.4" opacity=".5" />
          <path d="M60 284 C120 276 190 286 250 280" stroke="#a88f62" strokeWidth="1.2" opacity=".4" />
        </g>
        <g fill="#b39a72">
          <ellipse cx="160" cy="268" rx="4" ry="2.2" />
          <ellipse cx="236" cy="252" rx="3" ry="1.6" fill="#9a876a" />
          <ellipse cx="280" cy="286" rx="5" ry="2.6" fill="#a99474" />
        </g>
        <rect width="400" height="300" fill={`url(#${id}-haze)`} opacity=".55" />

        <g className="mid">
          {/* rocks */}
          <path d="M52 250 C50 232 66 220 86 222 C100 214 124 218 136 230 C146 238 148 248 144 254 Z" fill={`url(#${id}-rock)`} />
          <path d="M66 230 C76 224 90 223 100 226" stroke="#b9c6c2" strokeWidth="2" strokeLinecap="round" fill="none" opacity=".6" />
          <path d="M222 250 C222 238 236 230 252 232 C266 228 280 236 282 250 Z" fill={`url(#${id}-rock)`} />
          {/* the anemone */}
          <ellipse cx={ANEMONE_BASE.x} cy={ANEMONE_BASE.y + 2} rx="30" ry="6" fill="#7a3a57" />
          <g fill="none" stroke={`url(#${id}-tent)`} strokeWidth="4.2" strokeLinecap="round">
            {TENTACLES.map((_, i) => (
              <path key={i} className="tentacle" />
            ))}
          </g>
          <g fill="#f8cfdb">
            {TENTACLES.map((_, i) => (
              <circle key={i} className="tentacle-tip" r="2.3" />
            ))}
          </g>
          {BLADES.map((b, i) =>
            b.layer === "back" ? <path key={i} data-blade={i} fill={b.color} stroke={b.tip} strokeWidth=".6" strokeOpacity=".7" /> : null,
          )}
        </g>

        <g>
          {["clown", "tang", "chromis-a", "chromis-b"].map((f) => (
            <ellipse key={f} data-shadow={f} fill={`url(#${id}-shadow)`} />
          ))}
        </g>
        <g>
          {["clown", "tang", "chromis-a", "chromis-b"].map((f) => (
            <FishSvg key={f} fishId={f} uid={`${id}-${f}`} art={artOf(f)} />
          ))}
        </g>

        <g fill="#f4fbfa">
          {Array.from({ length: PARTICLES }, (_, i) => (
            <circle key={i} className="particle" r={(0.5 + ((i * 37) % 10) / 8).toFixed(2)} opacity=".55" />
          ))}
        </g>

        <g className="front">
          {BLADES.map((b, i) =>
            b.layer === "front" ? <path key={i} data-blade={i} fill={b.color} stroke={b.tip} strokeWidth=".8" strokeOpacity=".6" /> : null,
          )}
        </g>
        <rect width="400" height="300" fill={`url(#${id}-vignette)`} pointerEvents="none" />
      </svg>
    </div>
  );
}

const SAND_D = `M-20 ${SAND_TOP} C40 ${SAND_TOP - 8} 110 ${SAND_TOP + 6} 190 ${SAND_TOP - 2} S330 ${SAND_TOP - 6} 420 ${SAND_TOP + 2} V320 H-20Z`;

function surfacePath(t: number) {
  let d = "M-10 0 V8";
  for (let x = -10; x <= 410; x += 20) {
    const y = 9 + Math.sin(x * 0.04 + t * 0.9) * 2.2 + Math.sin(x * 0.11 - t * 1.3) * 1.2;
    d += `L${x} ${y.toFixed(1)}`;
  }
  return d + "V0Z";
}

function FishDefs({ uid, art }: { uid: string; art: Art }) {
  return (
    <>
      <linearGradient id={`${uid}-grad`} gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor={art.back} />
        <stop offset=".45" stopColor={art.side} />
        <stop offset="1" stopColor={art.belly} />
      </linearGradient>
      <clipPath id={`${uid}-clip`}>
        <path />
      </clipPath>
    </>
  );
}

// One fish's elements, back to front. Shapes are filled in by paintFish.
function FishSvg({ fishId, uid, art }: { fishId: string; uid: string; art: Art }) {
  const fin = (f: { color: string; edge?: string; opacity: number }) => ({
    fill: f.color,
    fillOpacity: f.opacity,
    stroke: f.edge ?? "none",
    strokeWidth: 0.9,
    strokeLinejoin: "round" as const,
  });
  return (
    <g data-fish={fishId}>
      <path className="far-pec" {...fin({ ...art.pectoral, opacity: art.pectoral.opacity * 0.7 })} />
      <path className="caudal" {...fin(art.caudal)} />
      <path className="dorsal" {...fin(art.dorsal)} />
      <path className="anal" {...fin(art.anal)} />
      {art.pelvic && <path className="pelvic" {...fin({ ...art.pelvic, opacity: 0.95 })} />}
      <path className="body" fill={`url(#${uid}-grad)`} stroke="#1b1a1f" strokeOpacity=".35" strokeWidth=".7" />
      <g clipPath={`url(#${uid}-clip)`}>
        {art.markings.map((m, i) => (
          <path key={i} className="mark" fill={m.color} stroke={m.edge ?? "none"} strokeWidth={m.edgeWidth ?? 0} strokeLinejoin="round" />
        ))}
        <path className="sheen" fill="none" stroke="#fff" strokeOpacity=".28" strokeWidth="2.2" strokeLinecap="round" />
      </g>
      <path className="near-pec" {...fin(art.pectoral)} />
      {[0, 1].map((i) => (
        <g key={i} className="eye">
          <circle r="1" fill={art.eye.iris} />
          <circle r=".62" fill="#0b0b10" />
          <circle cx="-.3" cy="-.32" r=".22" fill="#fff" opacity=".9" />
        </g>
      ))}
    </g>
  );
}

function paintFish(els: FishEls, sh: Shape2D) {
  const body = smoothPath(sh.body);
  els.body.setAttribute("d", body);
  els.clip.setAttribute("d", body);
  sh.markings.forEach((m, i) => els.marks[i]?.setAttribute("d", smoothPath(m.pts)));
  els.sheen.setAttribute("d", smoothPath(sh.sheen, false));
  els.caudal.setAttribute("d", smoothPath(sh.caudal));
  els.dorsal.setAttribute("d", smoothPath(sh.dorsal));
  els.anal.setAttribute("d", smoothPath(sh.anal));
  if (els.pelvic && sh.pelvic) els.pelvic.setAttribute("d", smoothPath(sh.pelvic));
  const near = sh.pecs.find((p) => p.near) ?? sh.pecs[0];
  const far = sh.pecs.find((p) => p !== near)!;
  els.nearPec.setAttribute("d", smoothPath(near.pts));
  els.farPec.setAttribute("d", smoothPath(far.pts));
  sh.eyes.forEach((e, i) => {
    const g = els.eyes[i];
    g.setAttribute("transform", `translate(${e.x.toFixed(1)} ${e.y.toFixed(1)}) scale(${e.r.toFixed(2)})`);
    g.setAttribute("opacity", e.a.toFixed(2));
  });
  const { x1, y1, x2, y2 } = sh.shade;
  els.grad.setAttribute("x1", x1.toFixed(1));
  els.grad.setAttribute("y1", y1.toFixed(1));
  els.grad.setAttribute("x2", x2.toFixed(1));
  els.grad.setAttribute("y2", y2.toFixed(1));
  // far fish sit behind more water
  const haze = Math.min(1, Math.max(0, -sh.z / 34));
  els.g.setAttribute("opacity", (1 - haze * 0.28).toFixed(2));
  els.shadow.setAttribute("cx", sh.shadow.x.toFixed(1));
  els.shadow.setAttribute("cy", sh.shadow.y.toFixed(1));
  els.shadow.setAttribute("rx", sh.shadow.rx.toFixed(1));
  els.shadow.setAttribute("ry", sh.shadow.ry.toFixed(1));
  els.shadow.setAttribute("opacity", sh.shadow.a.toFixed(2));
}

// The fish card's picture: the same rig, resting side-on, drawn once.
export function StaticFish({ art, fish, uid }: { art: Art; fish: Fish; uid: string }) {
  const fr = emptyFrame();
  frameOf(fish, fr);
  const sh = shapeOf(fish, fr, art);
  const near = sh.pecs.find((p) => p.near) ?? sh.pecs[0];
  const far = sh.pecs.find((p) => p !== near)!;
  const fin = (f: { color: string; edge?: string; opacity: number }) => ({ fill: f.color, fillOpacity: f.opacity, stroke: f.edge ?? "none", strokeWidth: 0.9 });
  const body = smoothPath(sh.body);
  const xs = sh.body.map((p) => p.x).concat(sh.caudal.map((p) => p.x));
  const ys = sh.body.map((p) => p.y).concat(sh.dorsal.map((p) => p.y), sh.anal.map((p) => p.y), sh.caudal.map((p) => p.y));
  const x0 = Math.min(...xs) - 3;
  const y0 = Math.min(...ys) - 3;
  const vb = `${x0.toFixed(1)} ${y0.toFixed(1)} ${(Math.max(...xs) - x0 + 3).toFixed(1)} ${(Math.max(...ys) - y0 + 3).toFixed(1)}`;
  return (
    <svg viewBox={vb} className="h-full w-full" aria-hidden>
      <defs>
        <linearGradient id={`${uid}-g`} gradientUnits="userSpaceOnUse" x1={sh.shade.x1} y1={sh.shade.y1} x2={sh.shade.x2} y2={sh.shade.y2}>
          <stop offset="0" stopColor={art.back} />
          <stop offset=".45" stopColor={art.side} />
          <stop offset="1" stopColor={art.belly} />
        </linearGradient>
        <clipPath id={`${uid}-c`}>
          <path d={body} />
        </clipPath>
      </defs>
      <path d={smoothPath(far.pts)} {...fin({ ...art.pectoral, opacity: art.pectoral.opacity * 0.7 })} />
      <path d={smoothPath(sh.caudal)} {...fin(art.caudal)} />
      <path d={smoothPath(sh.dorsal)} {...fin(art.dorsal)} />
      <path d={smoothPath(sh.anal)} {...fin(art.anal)} />
      {art.pelvic && sh.pelvic && <path d={smoothPath(sh.pelvic)} {...fin({ ...art.pelvic, opacity: 0.95 })} />}
      <path d={body} fill={`url(#${uid}-g)`} stroke="#1b1a1f" strokeOpacity=".35" strokeWidth=".7" />
      <g clipPath={`url(#${uid}-c)`}>
        {sh.markings.map((m, i) => (
          <path key={i} d={smoothPath(m.pts)} fill={m.m.color} stroke={m.m.edge ?? "none"} strokeWidth={m.m.edgeWidth ?? 0} />
        ))}
        <path d={smoothPath(sh.sheen, false)} fill="none" stroke="#fff" strokeOpacity=".28" strokeWidth="2.2" strokeLinecap="round" />
      </g>
      <path d={smoothPath(near.pts)} {...fin(art.pectoral)} />
      {sh.eyes
        .filter((e) => e.a > 0.05)
        .map((e, i) => (
          <g key={i} transform={`translate(${e.x.toFixed(1)} ${e.y.toFixed(1)}) scale(${e.r.toFixed(2)})`} opacity={e.a}>
            <circle r="1" fill={art.eye.iris} />
            <circle r=".62" fill="#0b0b10" />
            <circle cx="-.3" cy="-.32" r=".22" fill="#fff" opacity=".9" />
          </g>
        ))}
    </svg>
  );
}

