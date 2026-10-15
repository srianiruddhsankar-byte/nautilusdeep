"use client";

import { useRef, useState, type CSSProperties, type ReactNode } from "react";
import { FISH_SIZE_LABEL, TANK_CAPACITY, type Aquarium, type Fish, type FishSize } from "@/lib/fish";
import { fishLook } from "@/lib/fish-look";
import { plantLook } from "@/lib/plant-look";
import { MATURE_MINUTES, type MaturePlant, type Garden } from "@/lib/plants";
import { formatDuration } from "@/lib/stats";
import { FOCUS_MODE_LABEL } from "@/lib/timer";
import { Bone, FISH_WIDTH, FishSprite } from "./fish-sprite";
import { PlantSprite } from "./plant-sprite";
import { DEFAULT_SKIN, type TankSkin } from "./skins";

const MODE_LABEL = { timer: "Timer", stopwatch: "Stopwatch", cycle: "Cycle" };
// Bigger fish cruise a little slower.
const SPEED: Record<FishSize, number> = { small: 0.85, medium: 1, large: 1.15, rare: 1.3 };
const SWIPE_PX = 50;
// Plant spots along the sand (% from the left), one per slot. Low in the tank,
// below the fish lanes, so plants never crowd the fish.
const PLANT_SLOTS_X = [9, 25, 41, 58, 74, 90];

export function Tank({
  aquarium,
  garden,
  error,
  skin = DEFAULT_SKIN,
}: {
  aquarium: Aquarium | null; // null while loading
  garden: Garden | null;
  error?: string | null;
  skin?: TankSkin;
}) {
  const [picked, setPicked] = useState<number | null>(null); // null = newest tank
  // "fish:<id>" or "plant:<id>": what's tapped (its card is open).
  const [selected, setSelected] = useState<string | null>(null);
  const swipeStartX = useRef<number | null>(null);
  const justSwiped = useRef(false);

  // Plants can overflow into a tank that has no fish yet, so count both.
  const tankCount = Math.max(aquarium?.tanks.length ?? 1, garden?.tankCount ?? 1);
  const index = Math.min(picked ?? tankCount - 1, tankCount - 1);
  const fish = aquarium?.tanks[index] ?? [];
  const plants = garden?.matured.filter((p) => p.tank === index) ?? [];
  const selectedFish = fish.find((f) => `fish:${f.id}` === selected) ?? null;
  const selectedPlant = plants.find((p) => `plant:${p.id}` === selected) ?? null;
  const empty = aquarium !== null && aquarium.fishCount === 0 && (garden?.matured.length ?? 0) === 0;

  function go(delta: number) {
    const next = index + delta;
    if (next < 0 || next >= tankCount) return;
    setPicked(next);
    setSelected(null);
  }

  function tap(key: string) {
    if (!justSwiped.current) setSelected(key === selected ? null : key);
  }

  return (
    <section className="flex flex-col gap-2" aria-label="Your tank">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1">
          <NavButton label="Previous tank" disabled={index === 0} onClick={() => go(-1)}>
            ‹
          </NavButton>
          <h2 className="min-w-16 text-center font-semibold">Tank {index + 1}</h2>
          <NavButton label="Next tank" disabled={index === tankCount - 1} onClick={() => go(1)}>
            ›
          </NavButton>
        </div>
        <span className="text-sm text-zinc-500">
          {fish.length}/{TANK_CAPACITY} fish
          {plants.length > 0 && ` · ${plants.length} ${plants.length === 1 ? "plant" : "plants"}`}
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

        {plants.map((p) => (
          <PlantInTank key={p.id} plant={p} selected={`plant:${p.id}` === selected} onTap={() => tap(`plant:${p.id}`)} />
        ))}

        {fish.map((f) => (
          <SwimmingFish key={f.id} fish={f} selected={`fish:${f.id}` === selected} onTap={() => tap(`fish:${f.id}`)} />
        ))}

        {(aquarium === null || empty) && (
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
        {selectedPlant && <PlantCard plant={selectedPlant} onClose={() => setSelected(null)} />}
      </div>

      {tankCount > 1 && (
        <div className="flex justify-center gap-1.5" aria-hidden>
          {Array.from({ length: tankCount }, (_, i) => (
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

// A mature plant, standing in its own spot on the sand.
function PlantInTank({
  plant,
  selected,
  onTap,
}: {
  plant: MaturePlant;
  selected: boolean;
  onTap: () => void;
}) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onTap();
      }}
      aria-label={`Mature plant, matured ${shortDate(plant.maturedAt)}`}
      className={`absolute bottom-[3%] -translate-x-1/2 rounded-xl px-1 ${selected ? "bg-white/40 ring-2 ring-white" : ""}`}
      style={{ left: `${PLANT_SLOTS_X[plant.slot % PLANT_SLOTS_X.length]}%` }}
    >
      <PlantSprite look={plantLook(plant.id)} stage="mature" width={36} />
    </button>
  );
}

const shortDate = (iso: string) =>
  new Date(iso).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });

function PlantCard({ plant, onClose }: { plant: MaturePlant; onClose: () => void }) {
  return (
    <div
      className="absolute inset-x-2 bottom-2 flex items-start justify-between gap-3 rounded-xl bg-white/95 p-3 text-sm text-zinc-900 shadow-lg"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex flex-col gap-0.5">
        <p className="font-semibold">Mature plant</p>
        <p className="text-zinc-600">Matured {shortDate(plant.maturedAt)}</p>
        <p>
          {formatDuration(MATURE_MINUTES * 60)} of notes · {plant.sessions}{" "}
          {plant.sessions === 1 ? "session" : "sessions"} since {shortDate(plant.startedAt)}
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
