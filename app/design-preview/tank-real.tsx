"use client";

import { useRef, useState } from "react";
import type { BroodStage } from "@/lib/brood";
import type { SkinId } from "@/lib/economy";
import { SPECIES } from "@/lib/species";
import type { TankFish } from "../_tank/tank4/engine";
import type { MiniScene } from "../_tank/tank4/mini";
import { MiniCanvas } from "../_tank/tank4/mini-canvas";
import { type CanvasDecor, type CanvasPlant, TankCanvas, type TankHandle } from "../_tank/tank4/tank-canvas";

// Tank 4 as it runs in the app (app/_tank/tank4/), with a demo tank: ten
// animals including every odd shape, and the nautilus. Tap a fish to
// highlight it. The menus pick the skin and the session's egg / fry.
const DEMO: TankFish[] = (
  [
    ["green_chromis", "common"],
    ["clownfish", "uncommon"],
    ["pufferfish", "uncommon"],
    ["seahorse", "uncommon"],
    ["lionfish", "rare"],
    ["blue_tang", "rare"],
    ["manta_ray", "epic"],
    ["sunfish", "epic"],
    ["oarfish", "epic"],
    ["megalodon", "legendary"],
  ] as const
).map(([species, rarity], i) => {
  const id = `0000000${i}-demo-4000-8000-00000000000${i}`;
  return { key: `fish:${id}`, id, species, rarity };
});
const CAST: TankFish[] = [...DEMO, { key: "nautilus", id: "nautilus", species: "nautilus", rarity: null }];

// Mature plants in three spots, one still growing, and some decorations.
const PLANTS: CanvasPlant[] = [
  { key: "plant:a", lookId: "demo-plant-a", stage: "mature", wilted: false, slot: 0, width: 36, tappable: true, pop: "mature" },
  { key: "plant:b", lookId: "demo-plant-b", stage: "mature", wilted: false, slot: 3, width: 36, tappable: true, pop: "mature" },
  { key: "plant:c", lookId: "demo-plant-d", stage: "mature", wilted: false, slot: 5, width: 36, tappable: true, pop: "mature" },
  { key: "growing", lookId: "demo-plant-c", stage: "young", wilted: true, slot: 2, width: 40, tappable: false, pop: "young" },
];
const DECOR: CanvasDecor[] = [
  { key: "decor:1", item: "shipwreck", x: 70, y: 0.9, width: 84, selected: false },
  { key: "decor:2", item: "treasure-chest", x: 30, y: 0.4, width: 40, selected: false },
  { key: "decor:3", item: "bubbler", x: 52, y: 0.6, width: 26, selected: false },
  { key: "decor:4", item: "starfish", x: 84, y: 0.1, width: 24, selected: true },
];

const SKINS: SkinId[] = ["shallows", "pond", "river", "lake", "deep"];
const BROOD = ["none", "eggs", "eyed", "fry"] as const;

export function TankReal({ id }: { id: string }) {
  const [selected, setSelected] = useState<string | null>(null);
  const [skin, setSkin] = useState<SkinId>("shallows");
  const [brood, setBrood] = useState<(typeof BROOD)[number]>("none");
  const ref = useRef<TankHandle>(null);
  return (
    <div
      className="absolute inset-0"
      data-selected={selected ?? ""}
      onClick={(e) => setSelected(ref.current?.hitTest(e.clientX, e.clientY) ?? null)}
    >
      <TankCanvas
        probe={id}
        fish={CAST}
        plants={PLANTS}
        decorations={DECOR}
        brood={brood === "none" ? null : (brood as BroodStage)}
        skin={skin}
        selected={selected}
        ref={ref}
        onStatus={() => {}}
      />
      <div className="absolute left-2 top-2 flex gap-1" onClick={(e) => e.stopPropagation()}>
        <select aria-label="Skin" className="rounded-control bg-white/80 px-2 py-1 text-sm" value={skin} onChange={(e) => setSkin(e.target.value as SkinId)}>
          {SKINS.map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
        <select aria-label="Egg" className="rounded-control bg-white/80 px-2 py-1 text-sm" value={brood} onChange={(e) => setBrood(e.target.value as (typeof BROOD)[number])}>
          {BROOD.map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
      </div>
    </div>
  );
}

// The result screen's stage: pick a species and see its silhouette, the
// caught fish, or a drifting egg / fry.
export function RevealDemo() {
  const [species, setSpecies] = useState<string>("pufferfish");
  const [mode, setMode] = useState<"fish" | "silhouette" | "drift-eggs" | "drift-fry">("fish");
  const s = SPECIES.find((x) => x.id === species)!;
  const scene: MiniScene =
    mode === "fish"
      ? { kind: "fish", species: s.id, rarity: s.rarity, id: `demo-${s.id}` }
      : mode === "silhouette"
        ? { kind: "silhouette", species: s.id, key: 0 }
        : { kind: "drift", stage: mode === "drift-fry" ? "fry" : "eggs" };
  return (
    <div className="pv-card flex flex-col items-center gap-2" id="reveal-demo">
      <div className="flex gap-2">
        <select aria-label="Species" value={species} onChange={(e) => setSpecies(e.target.value)}>
          {SPECIES.map((x) => (
            <option key={x.id} value={x.id}>
              {x.name}
            </option>
          ))}
        </select>
        <select aria-label="Mode" value={mode} onChange={(e) => setMode(e.target.value as typeof mode)}>
          {["fish", "silhouette", "drift-eggs", "drift-fry"].map((m) => (
            <option key={m}>{m}</option>
          ))}
        </select>
      </div>
      <MiniCanvas key={mode.startsWith("drift") ? mode : "reveal"} className="relative h-28 w-48" scene={scene} fallback={null} />
    </div>
  );
}
