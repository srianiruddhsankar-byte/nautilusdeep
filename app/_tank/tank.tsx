"use client";

import { useRef, useState, type CSSProperties, type ReactNode } from "react";
import { FISH_SIZE_LABEL, TANK_CAPACITY, type Aquarium, type Fish, type FishSize } from "@/lib/fish";
import { fishLook } from "@/lib/fish-look";
import { FOCUS_MODE_LABEL } from "@/lib/timer";
import { Bone, FISH_WIDTH, FishSprite } from "./fish-sprite";
import { DEFAULT_SKIN, type TankSkin } from "./skins";

const MODE_LABEL = { timer: "Timer", stopwatch: "Stopwatch", cycle: "Cycle" };
// Bigger fish cruise a little slower.
const SPEED: Record<FishSize, number> = { small: 0.85, medium: 1, large: 1.15, rare: 1.3 };
const SWIPE_PX = 50;

export function Tank({
  aquarium,
  error,
  skin = DEFAULT_SKIN,
}: {
  aquarium: Aquarium | null; // null while loading
  error?: string | null;
  skin?: TankSkin;
}) {
  const [picked, setPicked] = useState<number | null>(null); // null = newest tank
  const [selected, setSelected] = useState<string | null>(null);
  const swipeStartX = useRef<number | null>(null);
  const justSwiped = useRef(false);

  const tanks = aquarium?.tanks ?? [[]];
  const index = Math.min(picked ?? tanks.length - 1, tanks.length - 1);
  const fish = tanks[index];
  const selectedFish = fish.find((f) => f.id === selected) ?? null;

  function go(delta: number) {
    const next = index + delta;
    if (next < 0 || next >= tanks.length) return;
    setPicked(next);
    setSelected(null);
  }

  return (
    <section className="flex flex-col gap-2" aria-label="Your tank">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1">
          <NavButton label="Previous tank" disabled={index === 0} onClick={() => go(-1)}>
            ‹
          </NavButton>
          <h2 className="min-w-16 text-center font-semibold">Tank {index + 1}</h2>
          <NavButton label="Next tank" disabled={index === tanks.length - 1} onClick={() => go(1)}>
            ›
          </NavButton>
        </div>
        <span className="text-sm text-zinc-500">
          {fish.length}/{TANK_CAPACITY} fish
        </span>
        <span className="flex items-center gap-1.5 text-sm" title="Bones: fish lost">
          <Bone />
          <span className="tabular-nums">{aquarium?.bones ?? "–"}</span>
          <span className="sr-only">bones</span>
        </span>
      </div>

      <div
        className={`relative aspect-[4/3] w-full touch-pan-y overflow-hidden rounded-2xl select-none ${skin.frame}`}
        onPointerDown={(e) => {
          swipeStartX.current = e.clientX;
          justSwiped.current = false;
        }}
        onPointerUp={(e) => {
          if (swipeStartX.current === null) return;
          const dx = e.clientX - swipeStartX.current;
          swipeStartX.current = null;
          if (Math.abs(dx) > SWIPE_PX) {
            justSwiped.current = true; // so the click that follows isn't a "tap"
            go(dx < 0 ? 1 : -1);
          }
        }}
        onClick={() => {
          if (!justSwiped.current) setSelected(null); // tap the water to close the card
        }}
      >
        <skin.Scene />

        {fish.map((f) => (
          <SwimmingFish
            key={f.id}
            fish={f}
            selected={f.id === selected}
            onTap={() => {
              if (!justSwiped.current) setSelected(f.id === selected ? null : f.id);
            }}
          />
        ))}

        {(aquarium === null || aquarium.fishCount === 0) && (
          <p
            className={`absolute inset-x-6 top-1/3 text-center text-sm font-medium ${skin.emptyText}`}
          >
            {aquarium === null
              ? error
                ? `Couldn't load your tank: ${error}`
                : "Filling the tank…"
              : "Finish a session of 5+ focus minutes to hatch your first fish."}
          </p>
        )}

        {selectedFish && <FishCard fish={selectedFish} onClose={() => setSelected(null)} />}
      </div>

      {tanks.length > 1 && (
        <div className="flex justify-center gap-1.5" aria-hidden>
          {tanks.map((_, i) => (
            <span
              key={i}
              className={`h-1.5 w-1.5 rounded-full ${i === index ? "bg-sky-700" : "bg-zinc-300 dark:bg-zinc-700"}`}
            />
          ))}
        </div>
      )}
    </section>
  );
}

function SwimmingFish({
  fish,
  selected,
  onTap,
}: {
  fish: Fish;
  selected: boolean;
  onTap: () => void;
}) {
  const look = fishLook(fish.id);
  const width = FISH_WIDTH[fish.size];
  const style = {
    "--fish-w": `${width}px`,
    "--swim": `${(look.swimSeconds * SPEED[fish.size]).toFixed(1)}s`,
    "--bob": `${look.bobSeconds.toFixed(1)}s`,
    "--phase": look.phase.toFixed(3),
    "--lane": `${(6 + look.lane * 56).toFixed(1)}%`, // stays above the sand
  } as CSSProperties;

  return (
    <div className={`tank-swim ${selected ? "tank-paused" : ""}`} style={style}>
      <div className="tank-face">
        <div className="tank-bob">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onTap();
            }}
            aria-label={`${FISH_SIZE_LABEL[fish.size]} fish, ${fish.minutes} focus minutes`}
            className={`pointer-events-auto -m-2 block rounded-full p-2 ${
              selected ? "bg-white/40 ring-2 ring-white" : ""
            }`}
          >
            <FishSprite look={look} size={fish.size} />
          </button>
        </div>
      </div>
    </div>
  );
}

function FishCard({ fish, onClose }: { fish: Fish; onClose: () => void }) {
  const date = new Date(fish.startedAt).toLocaleString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
  return (
    <div
      className="absolute inset-x-2 bottom-2 flex items-start justify-between gap-3 rounded-xl bg-white/95 p-3 text-sm text-zinc-900 shadow-lg"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex flex-col gap-0.5">
        <p className="font-semibold">
          {FISH_SIZE_LABEL[fish.size]} fish{fish.size === "rare" ? " ✦" : ""}
        </p>
        <p className="text-zinc-600">{date}</p>
        <p>
          {fish.minutes} focus minutes · {MODE_LABEL[fish.mode]} · {FOCUS_MODE_LABEL[fish.focusMode]}
        </p>
      </div>
      <button
        type="button"
        onClick={onClose}
        aria-label="Close"
        className="-m-1 rounded-full px-2 text-lg leading-none text-zinc-500"
      >
        ×
      </button>
    </div>
  );
}

function NavButton({
  label,
  disabled,
  onClick,
  children,
}: {
  label: string;
  disabled: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className="h-9 w-9 rounded-full text-2xl leading-none hover:bg-zinc-100 disabled:opacity-25 dark:hover:bg-zinc-900"
    >
      {children}
    </button>
  );
}
