"use client";

import {
  FISH_MIN_MINUTES,
  FISH_SIZE_LABEL,
  earnsFish,
  fishSizeFor,
  focusMinutes,
  tankIndexOf,
  type Aquarium,
} from "@/lib/fish";
import { fishLook } from "@/lib/fish-look";
import { toRow } from "@/lib/session-record";
import type { Result } from "@/lib/timer";
import { Bone, Egg, FISH_WIDTH, FishSprite } from "./fish-sprite";

// What happened to this session's fish, shown on the result screen.
export function ResultFish({ result, aquarium }: { result: Result; aquarium: Aquarium | null }) {
  const id = result.id ?? "legacy";
  const look = fishLook(id);

  if (result.outcome === "failed") {
    // The fish it would have been (all focus time, including what was lost).
    const minutes = Math.floor((result.focusMs + result.lostMs) / 60_000);
    const hadFish = minutes >= FISH_MIN_MINUTES;
    const size = fishSizeFor(minutes);
    return (
      <div className="flex flex-col items-center gap-2">
        <div className="relative flex h-28 w-40 items-center justify-center">
          <div className="fish-dying">
            {hadFish ? (
              <FishSprite look={look} size={size} width={FISH_WIDTH[size] * 1.5} dead />
            ) : (
              <Egg width={40} />
            )}
          </div>
          <div className="bone-appear absolute">
            <Bone width={48} />
          </div>
        </div>
        <p className="text-sm text-zinc-500">
          {hadFish ? "Your fish didn't make it." : "Your egg didn't hatch."}{" "}
          {aquarium && (
            <span className="bone-appear inline-block font-semibold text-zinc-700 dark:text-zinc-300">
              Bones: {aquarium.bones} (+1)
            </span>
          )}
        </p>
      </div>
    );
  }

  // Same rules the tank uses, applied to the row this result was saved as.
  const row = toRow(result, id, null);
  if (!earnsFish(row)) {
    return (
      <p className="text-sm text-zinc-500">
        Under {FISH_MIN_MINUTES} focus minutes, so no fish this time. Fish hatch at {FISH_MIN_MINUTES}{" "}
        minutes.
      </p>
    );
  }

  const size = fishSizeFor(focusMinutes(row));
  const tank = aquarium ? tankIndexOf(aquarium, id) + 1 : 0;
  return (
    <div className="flex flex-col items-center gap-2">
      {/* Two wrappers: one element can only run one of these animations. */}
      <div className="tank-bob">
        <div className="fish-grow">
          <FishSprite look={look} size={size} width={FISH_WIDTH[size] * 1.5} />
        </div>
      </div>
      <p className="text-sm text-zinc-500">
        {size === "rare" ? "A rare fish" : `A ${FISH_SIZE_LABEL[size].toLowerCase()} fish`} joined{" "}
        {tank > 0 ? `Tank ${tank}` : "your tank"}.
      </p>
    </div>
  );
}
