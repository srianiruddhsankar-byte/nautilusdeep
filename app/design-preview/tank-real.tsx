"use client";

import { useRef, useState } from "react";
import type { SkinId } from "@/lib/economy";
import type { TankFish } from "../_tank/tank4/engine";
import { TankCanvas, type TankHandle } from "../_tank/tank4/tank-canvas";

// Tank 4 as it runs in the app (app/_tank/tank4/), with a demo tank: ten
// species of every rarity and the nautilus. Tap a fish to highlight it.
const DEMO: TankFish[] = (
  [
    ["green_chromis", "common"],
    ["green_chromis", "common"],
    ["sergeant_major", "common"],
    ["clownfish", "uncommon"],
    ["seahorse", "uncommon"],
    ["emperor_angelfish", "uncommon"],
    ["blue_tang", "rare"],
    ["moorish_idol", "rare"],
    ["manta_ray", "epic"],
    ["megalodon", "legendary"],
  ] as const
).map(([species, rarity], i) => {
  const id = `0000000${i}-demo-4000-8000-00000000000${i}`;
  return { key: `fish:${id}`, id, species, rarity };
});
const CAST: TankFish[] = [...DEMO, { key: "nautilus", id: "nautilus", species: "nautilus", rarity: null }];

const SKINS: SkinId[] = ["shallows", "pond", "river", "lake", "deep"];

export function TankReal({ id }: { id: string }) {
  const [selected, setSelected] = useState<string | null>(null);
  const [skin, setSkin] = useState<SkinId>("shallows");
  const ref = useRef<TankHandle>(null);
  return (
    <div
      className="absolute inset-0"
      data-selected={selected ?? ""}
      onClick={(e) => setSelected(ref.current?.hitTest(e.clientX, e.clientY) ?? null)}
    >
      <TankCanvas probe={id} fish={CAST} skin={skin} selected={selected} ref={ref} onStatus={() => {}} />
      <select
        aria-label="Skin"
        className="absolute left-2 top-2 rounded-control bg-white/80 px-2 py-1 text-sm"
        value={skin}
        onClick={(e) => e.stopPropagation()}
        onChange={(e) => setSkin(e.target.value as SkinId)}
      >
        {SKINS.map((s) => (
          <option key={s}>{s}</option>
        ))}
      </select>
    </div>
  );
}
