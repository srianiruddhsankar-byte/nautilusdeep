"use client";

import type { AmbienceSound } from "@/lib/ambience-logic";
import { broodCaption, broodStage, type BroodStage } from "@/lib/brood";
import { TANK_CAPACITY, type Aquarium } from "@/lib/fish";
import { growingSpot, PLANT_MIN_MINUTES, PLANTS_PER_TANK, PLANT_STAGE_LABEL, plantStageFor, toNextStage, type Garden } from "@/lib/plants";
import { focusMsBetween, isNotes, type Session } from "@/lib/timer";
import type { Owned } from "@/lib/economy";
import type { TankSkin } from "./skins";
import { type GrowingInTank, Tank } from "./tank";


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
  let growingPlant: GrowingInTank | null = null;
  let brood: BroodStage | null = null;
  let caption: string;

  if (isNotes(session)) {
    // This session's own plant, growing through the stages as the minutes
    // pass, in the spot it's planted in when the session ends.
    const spot = growingSpot(garden, fishCount);
    index = spot.tank;
    const stage = plantStageFor(minutes);
    growingPlant = { lookId: session.id ?? "legacy", stage, wilted: false, slot: spot.slot % PLANTS_PER_TANK };
    const next = toNextStage(minutes);
    caption =
      minutes < PLANT_MIN_MINUTES
        ? `A seed in the sand. It sprouts at ${PLANT_MIN_MINUTES} minutes.`
        : `${PLANT_STAGE_LABEL[stage]} · ${next ?? "it's planted when you finish!"}`;
  } else {
    // The new fish joins the tank that has room: the newest, or a new one if it's full.
    index = Math.floor(fishCount / TANK_CAPACITY);
    brood = broodStage(minutes); // drawn by the tank: egg → eyed egg → fry
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
          growing={growingPlant}
          brood={brood}
        />
      </div>
      <p className="text-center text-sm text-muted">{caption}</p>
      {note && <p className="text-center text-sm font-semibold">{note}</p>}
    </div>
  );
}
