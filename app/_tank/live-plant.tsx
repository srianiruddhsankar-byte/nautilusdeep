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
    <p className="flex min-h-11 items-center gap-2 rounded-control bg-soft px-3 text-sm">
      <span className="flex h-8 w-6 shrink-0 items-end justify-center overflow-visible">
        <PlantSprite
          look={plantLook(growing.id ?? "fresh-seed")}
          stage={growing.stage}
          wilted={growing.wilted}
          width={20}
        />
      </span>
      <span className="min-w-0 truncate">
        <span className="text-muted">Growing: </span>
        <span className="font-semibold">{PLANT_STAGE_LABEL[growing.stage].toLowerCase()}</span>
        {next && <span className="text-muted"> · {next}</span>}
        {growing.wilted && <span className="text-muted"> · a little wilted</span>}
      </span>
    </p>
  );
}
