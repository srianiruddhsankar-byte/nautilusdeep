"use client";

import { useEffect, useRef } from "react";
import type * as T3 from "three";
import { type Art, ANEMONE_AT } from "./fish-art";
import { smoothPath } from "./fish-2d";
import { artOf, createCast, restCast, stepAll } from "./scenery";
import { CAM, emptyFrame, type Fish, type Frame, frameOf, NODES, tailFlex, TANK } from "./swim";
import { type LoopStats, useTankLoop } from "./tank-loop";

// Tank 3: real 3D (Three.js, no downloaded models). Each fish is a mesh built
// in code from its body-space art (fish-art.ts), in a straight rest pose. A
// vertex shader bends it along the simulated spine every frame, so a turn is a
// genuine 3D turn. Water: fog, light rays, caustics (computed on the GPU),
// drifting particles. Three.js is loaded only when this tank mounts.

type THREE = typeof T3;
type Api = { frame: (dt: number) => void; still: () => void; dispose: () => void };

const MAX_DPR = 1.5;

export function Tank3D({ id, still, maxFps, onStats }: { id: string; still: boolean; maxFps: number; onStats: (s: LoopStats) => void }) {
  const host = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const api = useRef<Api | null>(null);
  const stillRef = useRef(still);
  useEffect(() => {
    stillRef.current = still;
  }, [still]);

  useEffect(() => {
    let gone = false;
    import("three").then((THREE) => {
      if (gone || !canvas.current || !host.current) return;
      api.current = build(THREE, canvas.current, host.current);
      if (stillRef.current) api.current.still();
    });
    return () => {
      gone = true;
      api.current?.dispose();
      api.current = null;
    };
  }, []);

  useTankLoop(host, {
    id,
    still,
    maxFps,
    onStats,
    onFrame: (dt) => api.current?.frame(dt),
    onStill: () => api.current?.still(),
  });

  return (
    <div ref={host} className="absolute inset-0">
      <canvas ref={canvas} className="block h-full w-full" aria-hidden />
    </div>
  );
}

// ---------------- shader pieces ----------------

const CAUSTIC_GLSL = /* glsl */ `
uniform float uCTime;
varying vec3 vCWorld;
varying vec3 vCNormal;
vec2 cHash(vec2 p) {
  p = vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)));
  return fract(sin(p) * 43758.5453);
}
float cEdge(vec2 p, float t) {
  vec2 g = floor(p), f = fract(p);
  float d1 = 8.0, d2 = 8.0;
  for (int y = -1; y <= 1; y++)
    for (int x = -1; x <= 1; x++) {
      vec2 o = vec2(float(x), float(y));
      vec2 h = cHash(g + o);
      h = 0.5 + 0.42 * sin(t + 6.2831 * h);
      vec2 r = o + h - f;
      float d = dot(r, r);
      if (d < d1) { d2 = d1; d1 = d; } else if (d < d2) { d2 = d; }
    }
  return sqrt(d2) - sqrt(d1);
}
float causticAt(vec3 w) {
  vec2 p = w.xz * 0.05 + vec2(w.y * 0.012);
  float a = cEdge(p, uCTime * 0.55);
  float b = cEdge(p * 1.35 + vec2(3.1, 1.7), uCTime * 0.42 + 2.0);
  return pow(1.0 - smoothstep(0.0, 0.2, a), 2.4) * 0.6 + pow(1.0 - smoothstep(0.0, 0.16, b), 2.4) * 0.45;
}
`;

// Adds caustic light (from above) to a standard material.
function withCaustics(m: T3.MeshStandardMaterial, time: { value: number }, strength: number, extra?: (s: T3.WebGLProgramParametersWithUniforms) => void) {
  m.onBeforeCompile = (s) => {
    s.uniforms.uCTime = time;
    extra?.(s);
    s.vertexShader = s.vertexShader
      .replace("#include <common>", "#include <common>\nvarying vec3 vCWorld;\nvarying vec3 vCNormal;")
      .replace(
        "#include <project_vertex>",
        "#include <project_vertex>\nvCWorld = (modelMatrix * vec4(transformed, 1.0)).xyz;\nvCNormal = normalize(mat3(modelMatrix) * objectNormal);",
      );
    s.fragmentShader = s.fragmentShader
      .replace("#include <common>", "#include <common>\n" + CAUSTIC_GLSL)
      .replace(
        "#include <opaque_fragment>",
        `outgoingLight += vec3(1.0, 0.97, 0.86) * ${strength.toFixed(2)} * causticAt(vCWorld) * smoothstep(0.0, 0.7, vCNormal.y);\n#include <opaque_fragment>`,
      );
  };
}

// Bends a rest-pose fish mesh along the spine. Body and fins: rest x = −s·L
// (s from snout to tail root), y = up, z = right. Pectoral fins (kind 2/3)
// are rebuilt from their fin coordinates so they can flap.
const BEND_HEAD = /* glsl */ `
uniform vec3 uP[${NODES}];
uniform vec3 uT[${NODES}];
uniform vec3 uU[${NODES}];
uniform vec3 uR[${NODES}];
uniform float uL;
uniform float uFlex;
uniform float uFin;
attribute float aKind;
attribute vec3 aFin;
void frameAt(float s, out vec3 P, out vec3 T, out vec3 U, out vec3 R) {
  float fs = clamp(s, 0.0, 1.0) * ${(NODES - 1).toFixed(1)};
  int i = int(min(floor(fs), ${(NODES - 2).toFixed(1)}));
  float k = fs - float(i);
  P = mix(uP[i], uP[i + 1], k);
  T = normalize(mix(uT[i], uT[i + 1], k));
  U = normalize(mix(uU[i], uU[i + 1], k));
  R = normalize(mix(uR[i], uR[i + 1], k));
  if (s < 0.0) P += T * (-s) * uL;
  if (s > 1.0) P -= T * (s - 1.0) * uL;
}
`;

const BEND_BODY = /* glsl */ `
vec3 bP, bT, bU, bR, bendPos, objectNormal;
if (aKind < 1.5) {
  float s = -position.x / uL;
  frameAt(s, bP, bT, bU, bR);
  vec3 lat = bR * position.z;
  if (aKind > 0.5) lat += bR * uFlex * max(0.0, s - 1.0) * uL;
  bendPos = bP + bU * position.y + lat;
  objectNormal = normalize(bT * normal.x + bU * normal.y + bR * normal.z);
} else {
  float side = aKind > 2.5 ? -1.0 : 1.0;
  frameAt(aFin.x, bP, bT, bU, bR);
  float phi = 0.35 + 0.55 * (0.5 + 0.5 * sin(uFin + side * 0.9));
  vec3 ov = bR * side;
  vec3 d = -bT * cos(phi) + ov * sin(phi);
  bendPos = bP + bU * position.y + ov * position.z + d * aFin.y + bU * aFin.z;
  objectNormal = normalize(cross(d, bU)) * side;
}
`;

type FishUniforms = {
  uP: { value: T3.Vector3[] };
  uT: { value: T3.Vector3[] };
  uU: { value: T3.Vector3[] };
  uR: { value: T3.Vector3[] };
  uL: { value: number };
  uFlex: { value: number };
  uFin: { value: number };
};

function bend(m: T3.MeshStandardMaterial, u: FishUniforms, time: { value: number }, caustic: number) {
  withCaustics(m, time, caustic, (s) => {
    Object.assign(s.uniforms, u);
    s.vertexShader = s.vertexShader
      .replace("#include <common>", "#include <common>\n" + BEND_HEAD)
      .replace("#include <beginnormal_vertex>", BEND_BODY)
      .replace("#include <begin_vertex>", "vec3 transformed = bendPos;");
  });
  m.customProgramCacheKey = () => `bend-fish-${caustic}`;
}

// Sway for plants and anemone tentacles (instanced): more toward the tip.
function sway(m: T3.MeshStandardMaterial, time: { value: number }, amount: number, height: number) {
  m.onBeforeCompile = (s) => {
    s.uniforms.uTime = time;
    s.vertexShader = s.vertexShader
      .replace("#include <common>", "#include <common>\nuniform float uTime;\nattribute float aPhase;")
      .replace(
        "#include <begin_vertex>",
        `#include <begin_vertex>
float h = clamp(position.y / ${height.toFixed(1)}, 0.0, 1.0);
float cur = sin(uTime * 0.35) + 0.6 * sin(uTime * 0.13 + 1.0);
transformed.x += (sin(uTime * 0.8 + aPhase) * 0.6 + cur * 0.8) * h * h * ${amount.toFixed(1)};
transformed.z += cos(uTime * 0.6 + aPhase * 1.3) * h * h * ${(amount * 0.5).toFixed(1)};`,
      );
  };
}

// ---------------- the scene ----------------

function build(THREE: THREE, canvas: HTMLCanvasElement, host: HTMLElement): Api {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: "low-power" });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, MAX_DPR));
  const scene = new THREE.Scene();
  const fogColor = new THREE.Color("#5c9fb0");
  scene.background = fogColor;
  scene.fog = new THREE.Fog(fogColor, 560, 1000);
  const camera = new THREE.PerspectiveCamera(26, 4 / 3, 10, 4000);
  const camBase = new THREE.Vector3(CAM.cx, CAM.cy + CAM.dist * Math.sin(CAM.elev), CAM.dist * Math.cos(CAM.elev));
  const look = new THREE.Vector3(CAM.cx, CAM.cy, 0);

  const time = { value: 0 };
  const disposables: { dispose: () => void }[] = [];
  const keep = <D extends { dispose: () => void }>(d: D) => (disposables.push(d), d);

  scene.add(new THREE.HemisphereLight("#d4f1f4", "#3d5b52", 1.5));
  const sun = new THREE.DirectionalLight("#fff3dc", 2.2);
  sun.position.set(120, 500, 200);
  scene.add(sun);

  // backdrop: a vertical gradient, far behind everything
  {
    const g = keep(new THREE.PlaneGeometry(3000, 1400));
    const m = keep(
      new THREE.ShaderMaterial({
        depthWrite: false,
        uniforms: { top: { value: new THREE.Color("#b3dfe0") }, bottom: { value: new THREE.Color("#5c9fb0") } },
        vertexShader: "varying float vy; void main(){ vy = uv.y; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }",
        fragmentShader:
          "uniform vec3 top; uniform vec3 bottom; varying float vy; void main(){ gl_FragColor = vec4(mix(bottom, top, smoothstep(0.3, 0.75, vy)), 1.0); \n#include <colorspace_fragment>\n }",
      }),
    );
    const mesh = new THREE.Mesh(g, m);
    mesh.position.set(200, 150, -420);
    mesh.renderOrder = -1;
    scene.add(mesh);
  }

  // sand: gentle dunes, grain texture, caustics
  {
    const g = keep(new THREE.PlaneGeometry(1600, 1400, 120, 100));
    g.rotateX(-Math.PI / 2);
    const pos = g.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const z = pos.getZ(i);
      pos.setY(i, Math.sin(x * 0.03) * 1.6 + Math.sin(z * 0.06 + x * 0.012) * 1.4 + Math.max(0, -z - 60) * 0.12);
    }
    g.computeVertexNormals();
    const tex = keep(grainTexture(THREE));
    tex.repeat.set(24, 12);
    const m = keep(new THREE.MeshStandardMaterial({ color: "#dccb9e", map: tex, roughness: 1 }));
    withCaustics(m, time, 0.55);
    const sand = new THREE.Mesh(g, m);
    sand.position.set(200, TANK.floor, 0);
    scene.add(sand);
  }

  // rocks (one carries the anemone), plus faraway reef lumps lost in the fog
  const rockMat = keep(new THREE.MeshStandardMaterial({ color: "#7d8d8c", roughness: 0.95, flatShading: false }));
  withCaustics(rockMat, time, 0.45);
  const rock = (x: number, y: number, z: number, sx: number, sy: number, sz: number, seed: number) => {
    const g = keep(new THREE.IcosahedronGeometry(1, 4));
    const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const v = new THREE.Vector3().fromBufferAttribute(p, i);
      const n = 1 + 0.18 * Math.sin(v.x * 3.1 + seed) * Math.sin(v.y * 2.7 + seed * 2) + 0.08 * Math.sin(v.z * 7 + seed);
      v.multiplyScalar(n);
      p.setXYZ(i, v.x, v.y, v.z);
    }
    g.computeVertexNormals();
    const mesh = new THREE.Mesh(g, rockMat);
    mesh.position.set(x, y, z);
    mesh.scale.set(sx, sy, sz);
    scene.add(mesh);
  };
  rock(ANEMONE_AT.x, TANK.floor - 2, ANEMONE_AT.z - 4, 44, 16, 26, 1);
  rock(252, TANK.floor - 4, -14, 30, 14, 20, 2);
  rock(30, TANK.floor + 6, -150, 70, 40, 40, 3);
  rock(150, TANK.floor + 2, -190, 90, 34, 40, 4);
  rock(330, TANK.floor + 8, -170, 80, 50, 40, 5);

  // anemone: instanced tentacles that sway on the GPU
  {
    const len = 22;
    const g = keep(new THREE.CylinderGeometry(1.3, 2.1, len, 6, 6));
    g.translate(0, len / 2, 0);
    const m = keep(new THREE.MeshStandardMaterial({ map: keep(gradientTexture(THREE, "#9b4d70", "#f6c2d1")), roughness: 0.6 }));
    sway(m, time, 4, len);
    const n = 46;
    const inst = new THREE.InstancedMesh(g, m, n);
    const phase = new Float32Array(n);
    const o = new THREE.Object3D();
    for (let i = 0; i < n; i++) {
      const a = i * 2.39996;
      const r = 4 + Math.sqrt(i / n) * 20;
      o.position.set(ANEMONE_AT.x + Math.cos(a) * r, TANK.floor + 10, ANEMONE_AT.z + Math.sin(a) * r * 0.7);
      o.rotation.set(Math.sin(a) * (r / 60), 0, -Math.cos(a) * (r / 50));
      o.scale.setScalar(0.8 + ((i * 7) % 5) * 0.1);
      o.updateMatrix();
      inst.setMatrixAt(i, o.matrix);
      phase[i] = (i * 1.7) % 6.28;
    }
    g.setAttribute("aPhase", new THREE.InstancedBufferAttribute(phase, 1));
    scene.add(inst);
  }

  // seagrass: instanced blades
  {
    const h = 1;
    const g = keep(new THREE.PlaneGeometry(1, h, 1, 8));
    g.translate(0, h / 2, 0);
    // taper toward the tip
    const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) p.setX(i, p.getX(i) * (1 - p.getY(i) * 0.85));
    const m = keep(
      new THREE.MeshStandardMaterial({ map: keep(gradientTexture(THREE, "#2f6a4d", "#86bc84")), side: THREE.DoubleSide, roughness: 0.8 }),
    );
    sway(m, time, 1.1, h);
    const blades: [number, number, number, number, number][] = [
      // x, z, height, width, lean
      [300, -20, 120, 7, 0.05],
      [309, -24, 152, 8, -0.04],
      [318, -18, 104, 6, 0.1],
      [328, -22, 132, 7, -0.08],
      [338, -16, 90, 6, 0.12],
      [345, -26, 112, 6, -0.05],
      [176, 10, 54, 5, 0.1],
      [183, 12, 70, 5.5, -0.05],
      [190, 8, 46, 5, 0.15],
      [384, 90, 120, 12, 0.08],
      [398, 96, 92, 11, -0.06],
    ];
    const inst = new THREE.InstancedMesh(g, m, blades.length);
    const phase = new Float32Array(blades.length);
    const o = new THREE.Object3D();
    blades.forEach(([x, z, bh, bw, lean], i) => {
      o.position.set(x, TANK.floor, z);
      o.rotation.set(0, (i * 0.9) % 1.2, lean);
      o.scale.set(bw, bh, 1);
      o.updateMatrix();
      inst.setMatrixAt(i, o.matrix);
      phase[i] = i * 0.8;
    });
    g.setAttribute("aPhase", new THREE.InstancedBufferAttribute(phase, 1));
    scene.add(inst);
  }

  // light rays: soft additive planes that breathe
  const rays: T3.ShaderMaterial[] = [];
  {
    const g = keep(new THREE.PlaneGeometry(1, 1));
    g.translate(0, -0.5, 0);
    (
      [
        [90, -20, 60, 300, 0.22],
        [200, -40, 40, 280, -0.15],
        [285, -10, 55, 300, 0.2],
        [350, -50, 34, 260, 0.25],
      ] as const
    ).forEach(([x, z, w, h, lean], i) => {
      const m = keep(
        new THREE.ShaderMaterial({
          transparent: true,
          depthWrite: false,
          blending: THREE.AdditiveBlending,
          uniforms: { uTime: time, uPhase: { value: i * 1.7 } },
          vertexShader: "varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }",
          fragmentShader:
            "uniform float uTime; uniform float uPhase; varying vec2 vUv; void main(){ float edge = pow(1.0 - abs(vUv.x - 0.5) * 2.0, 1.6); float fall = pow(vUv.y, 1.4); float a = (0.14 + 0.09 * sin(uTime * 0.25 + uPhase)) * edge * fall; gl_FragColor = vec4(vec3(1.0, 0.97, 0.86) * a, a); }",
        }),
      );
      rays.push(m);
      const mesh = new THREE.Mesh(g, m);
      mesh.position.set(x, 320, z);
      mesh.scale.set(w, h, 1);
      mesh.rotation.z = lean;
      mesh.renderOrder = 5;
      scene.add(mesh);
    });
  }

  // the water surface, seen from below: a bright moving shimmer
  {
    const g = keep(new THREE.PlaneGeometry(1600, 900, 1, 1));
    g.rotateX(Math.PI / 2);
    const m = keep(
      new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        uniforms: { uTime: time },
        vertexShader:
          "varying vec3 vW; void main(){ vec4 w = modelMatrix * vec4(position,1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }",
        fragmentShader:
          "uniform float uTime; varying vec3 vW; void main(){ float w = sin(vW.x*0.05 + uTime*0.9) * sin(vW.z*0.07 - uTime*0.7) + 0.5*sin((vW.x+vW.z)*0.11 + uTime*1.3); float a = 0.16 + 0.1 * w; gl_FragColor = vec4(vec3(1.0) * a, a); }",
      }),
    );
    const mesh = new THREE.Mesh(g, m);
    mesh.position.set(200, 292, -100);
    scene.add(mesh);
  }

  // marine snow, moved entirely in the shader (no per-frame CPU work)
  {
    const n = 260;
    const pos = new Float32Array(n * 3);
    const seed = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      pos[i * 3] = Math.random() * 520 - 60;
      pos[i * 3 + 1] = Math.random() * 300;
      pos[i * 3 + 2] = Math.random() * 260 - 160;
      seed[i] = Math.random() * 6.28;
    }
    const g = keep(new THREE.BufferGeometry());
    g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    g.setAttribute("aSeed", new THREE.BufferAttribute(seed, 1));
    const m = keep(
      new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        uniforms: { uTime: time, uScale: { value: 1 } },
        vertexShader: `uniform float uTime; uniform float uScale; attribute float aSeed; varying float vA;
          void main(){ vec3 p = position; p.y = mod(p.y + uTime * (2.0 + aSeed * 0.5), 300.0);
          p.x += sin(uTime * 0.4 + aSeed) * 4.0 + sin(uTime*0.35)*6.0;
          vec4 mv = modelViewMatrix * vec4(p, 1.0); gl_Position = projectionMatrix * mv;
          gl_PointSize = uScale * (1.0 + mod(aSeed, 1.0) * 1.6) * 650.0 / -mv.z; vA = 0.35 + 0.3 * sin(aSeed * 3.0); }`,
        fragmentShader:
          "varying float vA; void main(){ float d = length(gl_PointCoord - 0.5); float a = smoothstep(0.5, 0.1, d) * vA; gl_FragColor = vec4(vec3(0.95, 0.99, 0.98) * a, a); }",
      }),
    );
    const pts = new THREE.Points(g, m);
    pts.frustumCulled = false;
    pts.renderOrder = 6;
    scene.add(pts);
    (scene.userData as { snow?: T3.ShaderMaterial }).snow = m;
  }

  // ---------------- fish ----------------
  const fish = createCast();
  for (let i = 0; i < 90; i++) stepAll(fish, 1 / 30);
  const frame = emptyFrame();
  const shadowTex = keep(radialTexture(THREE));
  const rigs = fish.map((f) => buildFish(THREE, f, artOf(f.id), time, keep, shadowTex, scene));

  const sync = () => {
    for (let i = 0; i < fish.length; i++) {
      const f = fish[i];
      frameOf(f, frame);
      rigs[i].update(f, frame);
    }
  };

  // ---------------- sizing ----------------
  const resize = () => {
    const r = host.getBoundingClientRect();
    const w = Math.max(1, r.width);
    const h = Math.max(1, r.height);
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    // cover the 400 × 300 tank like the SVG "slice": fit whichever side is tighter
    const visibleH = Math.min(300, 400 / camera.aspect);
    camera.fov = (2 * Math.atan(visibleH / 2 / CAM.dist) * 180) / Math.PI;
    camera.updateProjectionMatrix();
    const snow = (scene.userData as { snow?: T3.ShaderMaterial }).snow;
    if (snow) snow.uniforms.uScale.value = (h / visibleH) * renderer.getPixelRatio() * 0.5;
    render();
  };
  let t = 0;
  const render = () => {
    const pan = Math.sin(t * 0.07) * 9;
    camera.position.set(camBase.x + pan, camBase.y, camBase.z);
    camera.lookAt(look);
    renderer.render(scene, camera);
  };
  const ro = new ResizeObserver(resize);
  ro.observe(host);
  sync();
  resize();

  return {
    frame: (dt) => {
      t += dt;
      time.value = t;
      stepAll(fish, dt);
      sync();
      render();
    },
    still: () => {
      restCast(fish);
      t = 0;
      time.value = 0;
      sync();
      render();
    },
    dispose: () => {
      ro.disconnect();
      disposables.forEach((d) => d.dispose());
      renderer.dispose();
      renderer.forceContextLoss();
    },
  };
}

// One fish: body (textured), fins (vertex-coloured, see-through), eyes and a
// soft shadow on the sand. All bent by the same spine uniforms.
function buildFish(
  THREE: THREE,
  f: Fish,
  art: Art,
  time: { value: number },
  keep: <D extends { dispose: () => void }>(d: D) => D,
  shadowTex: T3.Texture,
  scene: T3.Scene,
) {
  const L = f.spec.length;
  const u: FishUniforms = {
    uP: { value: Array.from({ length: NODES }, () => new THREE.Vector3()) },
    uT: { value: Array.from({ length: NODES }, () => new THREE.Vector3()) },
    uU: { value: Array.from({ length: NODES }, () => new THREE.Vector3()) },
    uR: { value: Array.from({ length: NODES }, () => new THREE.Vector3()) },
    uL: { value: L },
    uFlex: { value: 0 },
    uFin: { value: 0 },
  };

  // body: rings of ellipses along s; uv = (s, f) so the texture IS body space
  const rings = 30;
  const segs = 20;
  const pos: number[] = [];
  const uv: number[] = [];
  const idx: number[] = [];
  for (let j = 0; j <= rings; j++) {
    const k = j / rings;
    const s = -0.035 + (1.035 * (1 - Math.cos(Math.PI * k))) / 2;
    const ss = Math.max(0, s);
    const tip = s < 0 ? 0.35 : 1;
    const H = art.half(ss) * L * (j === 0 ? 0 : tip);
    const Wd = art.thick(ss) * L * (j === 0 ? 0 : tip);
    for (let i = 0; i <= segs; i++) {
      const a = (i / segs) * Math.PI * 2;
      pos.push(-s * L, Math.cos(a) * H, Math.sin(a) * Wd);
      uv.push(ss, (Math.cos(a) + 1) / 2);
    }
  }
  for (let j = 0; j < rings; j++)
    for (let i = 0; i < segs; i++) {
      const a = j * (segs + 1) + i;
      const b = a + segs + 1;
      idx.push(a, a + 1, b, b, a + 1, b + 1);
    }
  const body = keep(new THREE.BufferGeometry());
  body.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  body.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
  body.setIndex(idx);
  body.computeVertexNormals();
  body.setAttribute("aKind", new THREE.Float32BufferAttribute(new Array(pos.length / 3).fill(0), 1));
  body.setAttribute("aFin", new THREE.Float32BufferAttribute(new Array(pos.length).fill(0), 3));
  const bodyMat = keep(new THREE.MeshStandardMaterial({ map: keep(bodyTexture(THREE, art)), roughness: 0.38, metalness: 0.05 }));
  bend(bodyMat, u, time, 0.35);
  const bodyMesh = new THREE.Mesh(body, bodyMat);
  bodyMesh.frustumCulled = false;
  scene.add(bodyMesh);

  // fins: flat, in the fish's up/down plane, coloured toward the edge
  const fp: number[] = [];
  const fc: number[] = [];
  const fk: number[] = [];
  const ff: number[] = [];
  const fi: number[] = [];
  const col = (c: string) => new THREE.Color(c);
  const vert = (x: number, y: number, z: number, c: T3.Color, kind: number, fin: [number, number, number] = [0, 0, 0]) => {
    fp.push(x, y, z);
    fc.push(c.r, c.g, c.b);
    fk.push(kind);
    ff.push(...fin);
    return fp.length / 3 - 1;
  };
  const strip = (fin: Art["dorsal"], sign: 1 | -1) => {
    const base = col(fin.color);
    const edge = col(fin.edge ?? fin.color);
    let prev: [number, number] | null = null;
    for (let i = 0; i <= 10; i++) {
      const t = i / 10;
      const s = fin.from + (fin.to - fin.from) * t;
      const h = art.half(s) * L;
      const a = vert(-s * L, sign * h * 0.85, 0, base, 0);
      const b = vert(-s * L, sign * (h + fin.height(t) * L), 0, edge, 0);
      if (prev) fi.push(prev[0], prev[1], a, a, prev[1], b);
      prev = [a, b];
    }
  };
  strip(art.dorsal, 1);
  strip(art.anal, -1);
  {
    // caudal fan, from the tail root
    const c = art.caudal;
    const base = col(c.color);
    const edge = col(c.edge ?? c.color);
    const len = c.len * L;
    const span = c.span * L;
    const hr = art.half(1) * L * 0.85;
    let outline: [number, number][];
    if (c.shape === "round") {
      outline = Array.from({ length: 11 }, (_, i) => {
        const a = 1 - (2 * i) / 10;
        return [len * (0.72 + 0.28 * Math.cos((a * Math.PI) / 2)), span * a];
      });
    } else if (c.shape === "fork") {
      outline = [
        [len * 0.55, span * 0.6],
        [len, span],
        [len * 0.92, span * 0.82],
        [len * 0.5, 0],
        [len * 0.92, -span * 0.82],
        [len, -span],
        [len * 0.55, -span * 0.6],
      ];
    } else {
      outline = [
        [len * 0.6, span * 0.75],
        [len * 1.02, span * 1.05],
        [len * 0.86, span * 0.55],
        [len * 0.78, 0],
        [len * 0.86, -span * 0.55],
        [len * 1.02, -span * 1.05],
        [len * 0.6, -span * 0.75],
      ];
    }
    const all: [number, number][] = [[0, hr], ...outline, [0, -hr]];
    const centre = vert(-L, 0, 0, base, 1);
    const ids = all.map(([a, b], i) => vert(-L - a, b, 0, i === 0 || i === all.length - 1 ? base : edge, 1));
    for (let i = 0; i < ids.length - 1; i++) fi.push(centre, ids[i], ids[i + 1]);
  }
  if (art.pelvic) {
    const pv = art.pelvic;
    const base = col(pv.color);
    const edge = col(pv.edge ?? pv.color);
    const ha = art.half(pv.s) * L;
    const hb = art.half(pv.s + 0.08) * L;
    for (const z of [art.thick(pv.s) * L * 0.6, -art.thick(pv.s) * L * 0.6]) {
      const a = vert(-pv.s * L, -ha * 0.85, z, base, 0);
      const b = vert(-(pv.s + 0.08) * L, -hb * 0.85, z, base, 0);
      const tip = vert(-(pv.s + pv.len * 0.55) * L, -ha - pv.len * L * 0.75, z * 1.6, edge, 0);
      fi.push(a, b, tip);
    }
  }
  {
    // pectoral fins: kind 2 (right) / 3 (left); position holds the base offset,
    // aFin = (s, distance along the fin, up/down within it)
    const pec = art.pectoral;
    const base = col(pec.color);
    const pl = pec.len * L;
    const w = pec.width * L;
    const ph = art.half(pec.s) * L;
    const pw = art.thick(pec.s) * L;
    for (const kind of [2, 3]) {
      const v = (a: number, b: number) => vert(0, -0.15 * ph, pw * 0.9, base, kind, [pec.s, a, b]);
      const c = v(pl * 0.35, 0);
      const ring = [v(0, w * 0.5), v(pl * 0.55, w * 0.5), v(pl, -pl * 0.12), v(pl * 0.55, -w * 0.35), v(0, -w * 0.3)];
      for (let i = 0; i < ring.length; i++) fi.push(c, ring[i], ring[(i + 1) % ring.length]);
    }
  }
  const fins = keep(new THREE.BufferGeometry());
  fins.setAttribute("position", new THREE.Float32BufferAttribute(fp, 3));
  fins.setAttribute("color", new THREE.Float32BufferAttribute(fc, 3));
  fins.setAttribute("aKind", new THREE.Float32BufferAttribute(fk, 1));
  fins.setAttribute("aFin", new THREE.Float32BufferAttribute(ff, 3));
  fins.setAttribute("normal", new THREE.Float32BufferAttribute(new Array(fp.length).fill(0).map((_, i) => (i % 3 === 2 ? 1 : 0)), 3));
  fins.setIndex(fi);
  const finMat = keep(
    new THREE.MeshStandardMaterial({
      vertexColors: true,
      transparent: true,
      opacity: Math.min(art.caudal.opacity, art.dorsal.opacity) * 0.92,
      side: THREE.DoubleSide,
      roughness: 0.55,
      depthWrite: false,
    }),
  );
  bend(finMat, u, time, 0.2);
  const finMesh = new THREE.Mesh(fins, finMat);
  finMesh.frustumCulled = false;
  scene.add(finMesh);

  // eyes: an iris sphere and a glossy pupil on each side
  const eyeG = keep(new THREE.SphereGeometry(1, 14, 10));
  const eyes = new THREE.Group();
  const eyeH = art.half(art.eye.s) * L;
  const eyeW = art.thick(art.eye.s) * L;
  const r = art.eye.r * L;
  const irisMat = keep(new THREE.MeshStandardMaterial({ color: art.eye.iris, roughness: 0.3 }));
  const pupilMat = keep(new THREE.MeshStandardMaterial({ color: "#07070a", roughness: 0.08, metalness: 0.2 }));
  // eyes follow the head frame (node 0–1), set each frame
  const eyeParts: { mesh: T3.Mesh; side: number; out: number; size: number }[] = [];
  for (const side of [1, -1]) {
    const iris = new THREE.Mesh(eyeG, irisMat);
    const pupil = new THREE.Mesh(eyeG, pupilMat);
    eyes.add(iris, pupil);
    eyeParts.push({ mesh: iris, side, out: eyeW * 0.78, size: r });
    eyeParts.push({ mesh: pupil, side, out: eyeW * 0.78 + r * 0.42, size: r * 0.66 });
  }
  scene.add(eyes);

  // soft shadow on the sand
  const shadow = new THREE.Mesh(
    keep(new THREE.PlaneGeometry(1, 1)),
    keep(new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, depthWrite: false, color: "#1d3a3f" })),
  );
  shadow.rotation.x = -Math.PI / 2;
  scene.add(shadow);

  const v3 = new THREE.Vector3();
  return {
    update: (fish: Fish, fr: Frame) => {
      for (let i = 0; i < NODES; i++) {
        u.uP.value[i].set(fr.P[i].x, fr.P[i].y, fr.P[i].z);
        u.uT.value[i].set(fr.T[i].x, fr.T[i].y, fr.T[i].z);
        u.uU.value[i].set(fr.U[i].x, fr.U[i].y, fr.U[i].z);
        u.uR.value[i].set(fr.R[i].x, fr.R[i].y, fr.R[i].z);
      }
      u.uFlex.value = tailFlex(fish);
      u.uFin.value = fish.fin;
      // eyes on the head: interpolate the frame at the eye's s
      const fs = art.eye.s * (NODES - 1);
      const i0 = Math.floor(fs);
      const k = fs - i0;
      const lerp = (a: { x: number; y: number; z: number }[]) => v3.set(a[i0].x + (a[i0 + 1].x - a[i0].x) * k, a[i0].y + (a[i0 + 1].y - a[i0].y) * k, a[i0].z + (a[i0 + 1].z - a[i0].z) * k).clone();
      const P = lerp(fr.P);
      const U = lerp(fr.U).normalize();
      const R = lerp(fr.R).normalize();
      for (const e of eyeParts) {
        e.mesh.position.copy(P).addScaledVector(U, art.eye.f * eyeH).addScaledVector(R, e.side * e.out);
        e.mesh.scale.setScalar(e.size);
      }
      // shadow under the middle of the body; fainter the higher the fish is
      const m = fr.P[3];
      const height = Math.max(0, m.y - TANK.floor);
      shadow.position.set(m.x, TANK.floor + 1.2, m.z);
      shadow.scale.set(L * 1.1, L * 0.5, 1);
      (shadow.material as T3.MeshBasicMaterial).opacity = 0.32 * (1 - Math.min(1, height / 260));
      finMesh.renderOrder = 2 + (m.z + 100) / 1000; // see-through fins: nearer fish draw later
    },
  };
}

// ---------------- textures made in code ----------------

// The body texture: x = s (snout → tail root), y = f (back at the top, belly at the bottom).
function bodyTexture(THREE: THREE, art: Art) {
  const w = 512;
  const h = 256;
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const ctx = c.getContext("2d")!;
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, art.back);
  g.addColorStop(0.3, art.side);
  g.addColorStop(0.62, art.side);
  g.addColorStop(1, art.belly);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  const map = (s: number, f: number) => ({ x: s * w, y: ((1 - f) / 2) * h });
  for (const m of art.markings) {
    const p = new Path2D(smoothPath(m.pts.map(([s, f]) => map(s, f))));
    ctx.fillStyle = m.color;
    ctx.fill(p);
    if (m.edge) {
      ctx.strokeStyle = m.edge;
      ctx.lineWidth = (m.edgeWidth ?? 1) * 3.2;
      ctx.stroke(p);
    }
  }
  // fine scale texture: faint diagonal cross-hatch
  ctx.globalAlpha = 0.06;
  ctx.strokeStyle = "#000";
  ctx.lineWidth = 1;
  for (let x = -h; x < w; x += 7) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x + h * 0.6, h);
    ctx.moveTo(x + h * 0.6, 0);
    ctx.lineTo(x, h);
    ctx.stroke();
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

function gradientTexture(THREE: THREE, bottom: string, top: string) {
  const c = document.createElement("canvas");
  c.width = 4;
  c.height = 64;
  const ctx = c.getContext("2d")!;
  const g = ctx.createLinearGradient(0, 64, 0, 0);
  g.addColorStop(0, bottom);
  g.addColorStop(1, top);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 4, 64);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function grainTexture(THREE: THREE) {
  const c = document.createElement("canvas");
  c.width = c.height = 128;
  const ctx = c.getContext("2d")!;
  const img = ctx.createImageData(128, 128);
  for (let i = 0; i < img.data.length; i += 4) {
    const v = 225 + Math.random() * 30;
    img.data[i] = v;
    img.data[i + 1] = v * 0.97;
    img.data[i + 2] = v * 0.9;
    img.data[i + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function radialTexture(THREE: THREE) {
  const c = document.createElement("canvas");
  c.width = c.height = 64;
  const ctx = c.getContext("2d")!;
  const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, "rgba(255,255,255,1)");
  g.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(c);
}
