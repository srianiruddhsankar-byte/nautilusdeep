"use client";

import { plantLook } from "@/lib/plant-look";
import { PLANT_STAGE_LABEL, hasGarden, toNextStage, type Garden } from "@/lib/plants";
import { PlantSprite } from "./plant-sprite";

// Home: one small line about the growing plant. Hidden until notes have been used.
export function SeedlingCard({ garden }: { garden: Garden | null }) {
  if (!garden || !hasGarden(garden)) return null;
  const { growing } = garden;
  const next = toNextStage(growing.minutes);
  return (
    <p className="flex h-10 items-center gap-2 rounded-xl bg-zinc-100 px-3 text-sm dark:bg-zinc-900">
      <span className="flex h-8 w-6 shrink-0 items-end justify-center overflow-visible">
        <PlantSprite
          look={plantLook(growing.id ?? "fresh-seed")}
          stage={growing.stage}
          wilted={growing.wilted}
          width={20}
        />
      </span>
      <span className="min-w-0 truncate">
        <span className="text-zinc-500">Growing: </span>
        <span className="font-medium">{PLANT_STAGE_LABEL[growing.stage].toLowerCase()}</span>
        {next && <span className="text-zinc-500"> · {next}</span>}
        {growing.wilted && <span className="text-zinc-500"> · a little wilted</span>}
      </span>
    </p>
  );
}
