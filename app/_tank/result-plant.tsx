"use client";

import { plantLook } from "@/lib/plant-look";
import { MATURE_MINUTES, PLANT_MIN_MINUTES, PLANT_STAGE_LABEL, nextPlantStage, type Garden } from "@/lib/plants";
import { formatDuration } from "@/lib/stats";
import type { Result } from "@/lib/timer";
import { step } from "../_ui/motion";
import { PlantSprite } from "./plant-sprite";

// The plant this notes session grew, shown on its result screen: one plant per
// session, as big as the session was long. The garden already includes this
// session (it's queued before the result shows).
export function ResultPlant({ result, garden }: { result: Result; garden: Garden | null }) {
  if (result.outcome === "failed") {
    return <p className="max-w-xs text-sm text-muted">No plant this time. The next notes session starts fresh.</p>;
  }
  const minutes = Math.floor(result.focusMs / 60_000);
  if (minutes < PLANT_MIN_MINUTES) {
    return (
      <p className="max-w-xs text-sm text-muted">
        Under {PLANT_MIN_MINUTES} minutes, so no plant this time. Your minutes and coins still count. A plant grows
        from {PLANT_MIN_MINUTES} minutes of notes.
      </p>
    );
  }
  if (!garden) return <p className="text-sm text-muted">Planting…</p>;
  const plant = result.id ? garden.bySession.get(result.id) : undefined;
  if (!plant) return null;

  const next = nextPlantStage(plant.minutes);
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="tank-bob">
        <div className="fish-grow">
          <PlantSprite look={plantLook(plant.id)} stage={plant.stage} width={52} />
        </div>
      </div>
      <p className="rise-in title-card" style={step(3)}>
        {PLANT_STAGE_LABEL[plant.stage]}
      </p>
      <p className="rise-in max-w-xs text-sm" style={step(4)}>
        Planted in Tank {plant.tank + 1}.{" "}
        {next ? (
          <span className="text-muted">
            Longer sessions grow bigger plants: {formatDuration(MATURE_MINUTES * 60)} grows a mature one.
          </span>
        ) : (
          <span className="font-semibold text-success">Fully grown.</span>
        )}
      </p>
    </div>
  );
}
