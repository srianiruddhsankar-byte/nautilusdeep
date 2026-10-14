"use client";

import { FISH_MIN_MINUTES, FISH_SIZE_LABEL, fishSizeFor, nextSize } from "@/lib/fish";
import { fishLook } from "@/lib/fish-look";
import { focusMsBetween, type Session } from "@/lib/timer";
import { Egg, FISH_WIDTH, FishSprite } from "./fish-sprite";
import { DEFAULT_SKIN, type TankSkin } from "./skins";

// The current session's fish, growing as focus minutes pass. It uses the
// session id for its look, so it's the same fish that later joins the tank.
export function LiveFish({
  session,
  now,
  skin = DEFAULT_SKIN,
}: {
  session: Session;
  now: number;
  skin?: TankSkin;
}) {
  const minutes = Math.floor(focusMsBetween(session, session.startedAt, now) / 60_000);
  const hatched = minutes >= FISH_MIN_MINUTES;
  const size = fishSizeFor(minutes);
  const next = nextSize(minutes);
  const look = fishLook(session.id ?? "legacy");

  const caption = !hatched
    ? `Your fish hatches at ${FISH_MIN_MINUTES} minutes of focus.`
    : next
      ? `${FISH_SIZE_LABEL[size]} fish · grows to ${FISH_SIZE_LABEL[next.size]} at ${next.atMinutes} min`
      : "Rare fish!";

  return (
    <div className="flex w-full flex-col items-center gap-2">
      <div className={`relative h-36 w-full overflow-hidden rounded-2xl ${skin.frame}`}>
        <skin.Scene />
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="tank-bob">
            {hatched ? (
              // key={size}: a new size remounts the fish, which replays the "pop".
              <div key={size} className="fish-grow">
                <FishSprite look={look} size={size} width={FISH_WIDTH[size] * 1.5} />
              </div>
            ) : (
              <Egg width={40} />
            )}
          </div>
        </div>
      </div>
      <p className="text-sm text-zinc-500">{caption}</p>
    </div>
  );
}
