"use client";

import type { ReactNode } from "react";
import { plantLook } from "@/lib/plant-look";
import { PLANT_MIN_MINUTES, PLANT_STAGE_LABEL, toNextStage, type Garden } from "@/lib/plants";
import type { Result } from "@/lib/timer";
import { PlantSprite } from "./plant-sprite";

// What this notes session did for the plant, shown on its result screen. The
// garden already includes this session (it's queued before the result shows).
export function ResultPlant({ result, garden }: { result: Result; garden: Garden | null }) {
  if (!garden) return <p className="text-sm text-zinc-500">Checking on your plant…</p>;
  const { growing } = garden;
  const growth = result.id ? garden.bySession.get(result.id) : undefined;

  if (result.outcome === "failed") {
    return (
      <Shown id={growing.id} stage={growing.stage} wilted>
        No growth this time, and your plant is a little wilted. Your next notes session perks it up.
      </Shown>
    );
  }

  if (!growth?.counted) {
    return (
      <p className="text-sm text-zinc-500">
        Under {PLANT_MIN_MINUTES} minutes, so no growth this time. Plants grow from {PLANT_MIN_MINUTES} minutes of notes.
      </p>
    );
  }

  const matured = growth.matured[growth.matured.length - 1];
  if (matured) {
    return (
      <Shown id={matured.id} stage="mature">
        <span className="font-semibold text-emerald-700 dark:text-emerald-400">
          Your plant matured! It&apos;s in Tank {matured.tank + 1}.
        </span>
        {growing.minutes > 0 && <> A new seed has started with {growing.minutes} min.</>}
      </Shown>
    );
  }

  const next = toNextStage(growing.minutes);
  return (
    <Shown id={growing.id} stage={growing.stage}>
      <span className="font-semibold">+{growth.addedMinutes} min of growth</span>
      {next && <> · {next}</>}
      <span className="block text-zinc-500">{PLANT_STAGE_LABEL[growing.stage]}</span>
    </Shown>
  );
}

function Shown({
  id,
  stage,
  wilted = false,
  children,
}: {
  id: string | null;
  stage: Parameters<typeof PlantSprite>[0]["stage"];
  wilted?: boolean;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="tank-bob">
        <PlantSprite look={plantLook(id ?? "fresh-seed")} stage={stage} wilted={wilted} width={52} />
      </div>
      <p className="max-w-xs text-sm">{children}</p>
    </div>
  );
}
