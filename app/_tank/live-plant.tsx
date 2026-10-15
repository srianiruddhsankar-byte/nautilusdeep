"use client";

import { plantLook } from "@/lib/plant-look";
import {
  PLANT_MIN_MINUTES,
  PLANT_STAGE_LABEL,
  hasGarden,
  previewPlant,
  toNextStage,
  type Garden,
  type GrowingPlant,
} from "@/lib/plants";
import { focusMsBetween, type Session } from "@/lib/timer";
import { PlantSprite } from "./plant-sprite";
import { DEFAULT_SKIN, type TankSkin } from "./skins";

const FRESH_SEED: GrowingPlant = { id: null, minutes: 0, stage: "seed", wilted: false };

// The plant growing during a notes session, like LiveFish for study. It shows the
// running session's minutes on top of the plant's growth so far.
export function LivePlant({
  session,
  now,
  garden,
  note,
  skin = DEFAULT_SKIN,
}: {
  session: Session;
  now: number;
  garden: Garden | null;
  note: string | null; // e.g. the target line
  skin?: TankSkin;
}) {
  const growing = garden?.growing ?? FRESH_SEED;
  const live = Math.floor(focusMsBetween(session, session.startedAt, now) / 60_000);
  const counts = live >= PLANT_MIN_MINUTES;
  // Growth only counts from 5 minutes, so show the plant as it is until then.
  const plant = previewPlant(growing, session.id ?? "legacy", counts ? live : 0);
  const next = toNextStage(plant.minutes);

  const caption = !counts
    ? `Growth counts from ${PLANT_MIN_MINUTES} minutes of notes.`
    : `${PLANT_STAGE_LABEL[plant.stage]} · ${next ?? "it matures when you finish!"}`;

  return (
    <div className="flex w-full flex-col items-center gap-2">
      <div className={`relative h-36 w-full overflow-hidden rounded-2xl ${skin.frame}`}>
        <skin.Scene />
        <div className="absolute inset-x-0 bottom-[4%] flex justify-center">
          {/* key={stage}: a new stage remounts it, which replays the "pop". */}
          <div key={plant.stage} className="fish-grow">
            <PlantSprite
              look={plantLook(plant.id)}
              stage={plant.stage}
              wilted={growing.wilted && !counts}
              width={52}
            />
          </div>
        </div>
      </div>
      <p className="text-center text-sm text-zinc-500">{caption}</p>
      {note && <p className="text-center text-sm font-medium">{note}</p>}
    </div>
  );
}

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
