"use client";

import type { AmbienceSound } from "@/lib/ambience-logic";
import { broodCaption, broodStage } from "@/lib/brood";
import { TANK_CAPACITY, type Aquarium } from "@/lib/fish";
import { plantLook } from "@/lib/plant-look";
import {
  PLANT_MIN_MINUTES,
  PLANT_STAGE_LABEL,
  PLANTS_PER_TANK,
  previewPlant,
  toNextStage,
  type Garden,
  type GrowingPlant,
} from "@/lib/plants";
import { focusMsBetween, isNotes, type Session } from "@/lib/timer";
import type { Owned } from "@/lib/economy";
import { LiveBrood } from "./brood";
import { PlantSprite } from "./plant-sprite";
import type { TankSkin } from "./skins";
import { PLANT_SLOTS_X, Tank } from "./tank";

const FRESH_SEED: GrowingPlant = { id: null, minutes: 0, stage: "seed", wilted: false };

// The running screen's picture: your real tank (fish, plants, decorations, skin
// and the ambience scene), with this session's egg → fry (study; it becomes a
// species when the session ends) or its growing plant (notes) in it. Kept in one place for the realistic redesign.
export function RunningTank({
  session,
  now,
  aquarium,
  garden,
  skinOf,
  decorations,
  scene,
  note,
}: {
  session: Session;
  now: number;
  aquarium: Aquarium | null;
  garden: Garden | null;
  skinOf: (tank: number) => TankSkin;
  decorations: Owned[] | null;
  scene: AmbienceSound | null;
  note: string | null; // e.g. a notes target line
}) {
  const minutes = Math.floor(focusMsBetween(session, session.startedAt, now) / 60_000);
  const fishCount = aquarium?.fishCount ?? 0;

  let index: number;
  let overlay = null;
  let caption: string;

  if (isNotes(session)) {
    // The plant grows where mature plants go: the newest tank's next free spot.
    index = Math.max(0, Math.ceil(fishCount / TANK_CAPACITY) - 1);
    const growing = garden?.growing ?? FRESH_SEED;
    const counts = minutes >= PLANT_MIN_MINUTES;
    const plant = previewPlant(growing, session.id ?? "legacy", counts ? minutes : 0);
    const slot = (garden?.matured.filter((p) => p.tank === index).length ?? 0) % PLANTS_PER_TANK;
    overlay = (
      <div className="pointer-events-none absolute bottom-[3%] -translate-x-1/2" style={{ left: `${PLANT_SLOTS_X[slot]}%` }}>
        {/* key={stage}: a new stage remounts it, which replays the "pop". */}
        <div key={plant.stage} className="fish-grow">
          <PlantSprite look={plantLook(plant.id)} stage={plant.stage} wilted={growing.wilted && !counts} width={40} />
        </div>
      </div>
    );
    const next = toNextStage(plant.minutes);
    caption = !counts
      ? `Growth counts from ${PLANT_MIN_MINUTES} minutes of notes.`
      : `${PLANT_STAGE_LABEL[plant.stage]} · ${next ?? "it matures when you finish!"}`;
  } else {
    // The new fish joins the tank that has room: the newest, or a new one if it's full.
    index = Math.floor(fishCount / TANK_CAPACITY);
    overlay = <LiveBrood stage={broodStage(minutes)} />;
    caption = broodCaption(minutes);
  }

  return (
    <div className="flex w-full flex-col items-center gap-2">
      <div className="w-full">
        <Tank
          aquarium={aquarium}
          garden={garden}
          bare
          fixedIndex={index}
          skinOf={skinOf}
          decorations={decorations}
          scene={scene}
          overlay={overlay}
        />
      </div>
      <p className="text-center text-sm text-muted">{caption}</p>
      {note && <p className="text-center text-sm font-semibold">{note}</p>}
    </div>
  );
}
