"use client";

import Link from "next/link";
import { useRef, useState, type CSSProperties, type MouseEvent, type ReactNode } from "react";
import type { AmbienceSound } from "@/lib/ambience-logic";
import { inTank, type Owned } from "@/lib/economy";
import { FISH_SIZE_LABEL, TANK_CAPACITY, type Aquarium, type Fish, type FishSize } from "@/lib/fish";
import { fishLook } from "@/lib/fish-look";
import { plantLook } from "@/lib/plant-look";
import { MATURE_MINUTES, type MaturePlant, type Garden } from "@/lib/plants";
import { formatDuration } from "@/lib/stats";
import { FOCUS_MODE_LABEL } from "@/lib/timer";
import { Bone, FISH_WIDTH, FishSprite } from "./fish-sprite";
import { PlantSprite } from "./plant-sprite";
import { AmbienceScene } from "./ambience-scene";
import { DecorationSprite } from "./decoration-sprite";
import { DEFAULT_SKIN, type TankSkin } from "./skins";

const MODE_LABEL = { timer: "Timer", stopwatch: "Stopwatch", cycle: "Cycle" };
// Bigger fish cruise a little slower.
const SPEED: Record<FishSize, number> = { small: 0.85, medium: 1, large: 1.15, rare: 1.3 };
const SWIPE_PX = 50;
// Plant spots along the sand (% from the left), one per slot. Low in the tank,
// below the fish lanes, so plants never crowd the fish.
export const PLANT_SLOTS_X = [9, 25, 41, 58, 74, 90];
// Decorations stand on the sand: y = 0 (front) … 1 (back) maps to this band,
// as % up from the bottom. Drawn behind plants and fish, so they never block them.
const SAND_BOTTOM = 2;
const SAND_DEPTH = 14;

// Decorate mode: the tank is controlled by the Decorate page. Taps go to the
// sand (placing / moving) and to decorations; fish and plants ignore taps.
export type TankEdit = {
  index: number;
  onIndexChange: (index: number) => void;
  selectedId: string | null;
  onSandTap: (x: number, y: number) => void;
  onDecorationTap: (id: string) => void;
};

export function Tank({
  aquarium,
  garden,
  error,
  skinOf = () => DEFAULT_SKIN,
  decorations = null,
  coins = null,
  edit,
  bare = false,
  fixedIndex,
  scene = null,
  overlay = null,
  liveFish = null,
}: {
  aquarium: Aquarium | null; // null while loading
  garden: Garden | null;
  error?: string | null;
  skinOf?: (tank: number) => TankSkin;
  decorations?: Owned[] | null;
  coins?: number | null; // shown in the header (a link to Decorate) when given
  edit?: TankEdit;
  // The running screen: just the tank (no header, swiping, tapping or cards),
  // showing `fixedIndex`, with the session's eggs / plant (`overlay`) and, once
  // grown past a fry, its fish (`liveFish`) swimming with the rest.
  bare?: boolean;
  fixedIndex?: number;
  scene?: AmbienceSound | null; // the ambience scene (rain, waves…), or none
  overlay?: ReactNode;
  liveFish?: Fish | null;
}) {
  const [ownPick, setOwnPick] = useState<number | null>(null); // null = newest tank
  const picked = fixedIndex ?? (edit ? edit.index : ownPick);
  // "fish:<id>" or "plant:<id>": what's tapped (its card is open).
  const [selected, setSelected] = useState<string | null>(null);
  const swipeStartX = useRef<number | null>(null);
  const justSwiped = useRef(false);

  // Plants can overflow into a tank that has no fish yet, so count both.
  // (A session's new fish may be heading for a tank that doesn't exist yet.)
  const tankCount = Math.max(aquarium?.tanks.length ?? 1, garden?.tankCount ?? 1, (fixedIndex ?? 0) + 1);
  const index = Math.min(picked ?? tankCount - 1, tankCount - 1);
  const skin = skinOf(index);
  const decor = decorations ? inTank(decorations, index) : [];
  const fish = [...(aquarium?.tanks[index] ?? []), ...(liveFish ? [liveFish] : [])];
  const plants = garden?.matured.filter((p) => p.tank === index) ?? [];
  const selectedFish = fish.find((f) => `fish:${f.id}` === selected) ?? null;
  const selectedPlant = plants.find((p) => `plant:${p.id}` === selected) ?? null;
  const empty = aquarium !== null && aquarium.fishCount === 0 && (garden?.matured.length ?? 0) === 0;

  function go(delta: number) {
    const next = index + delta;
    if (next < 0 || next >= tankCount) return;
    if (edit) edit.onIndexChange(next);
    else setOwnPick(next);
    setSelected(null);
  }

  // Where on the sand a tap landed: x as % across, y as 0 (front) … 1 (back).
  function sandSpot(e: MouseEvent<HTMLDivElement>) {
    const box = e.currentTarget.getBoundingClientRect();
    const fromBottom = ((box.bottom - e.clientY) / box.height) * 100;
    return { x: ((e.clientX - box.left) / box.width) * 100, y: (fromBottom - SAND_BOTTOM) / SAND_DEPTH };
  }

  function tap(key: string) {
    if (!justSwiped.current) setSelected(key === selected ? null : key);
  }
  const tappable = !edit && !bare;

  return (
    <section className="flex flex-col gap-2" aria-label="Your tank">
      {!bare && (
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
        <span className="flex items-center gap-3 text-sm">
          <span className="flex items-center gap-1.5" title="Bones: fish lost">
            <Bone />
            <span className="tabular-nums">{aquarium?.bones ?? "–"}</span>
            <span className="sr-only">bones</span>
          </span>
          {coins !== null && (
            <Link
              href="/decorate"
              className="-my-1 flex items-center gap-1 rounded-full px-2 py-1 hover:bg-zinc-100 dark:hover:bg-zinc-900"
              aria-label={`${coins} coins. Decorate your tank`}
            >
              <Coin />
              <span className="tabular-nums">{coins}</span>
            </Link>
          )}
        </span>
      </div>
      )}

      <div
        className={`relative aspect-[4/3] w-full touch-pan-y overflow-hidden rounded-2xl select-none ${skin.frame}`}
        onPointerDown={(e) => {
          swipeStartX.current = e.clientX;
          justSwiped.current = false;
        }}
        onPointerUp={(e) => {
          if (swipeStartX.current === null || fixedIndex !== undefined) return;
          const dx = e.clientX - swipeStartX.current;
          swipeStartX.current = null;
          if (Math.abs(dx) > SWIPE_PX) {
            justSwiped.current = true; // so the click that follows isn't a "tap"
            go(dx < 0 ? 1 : -1);
          }
        }}
        onClick={(e) => {
          if (justSwiped.current) return;
          if (edit) {
            const spot = sandSpot(e);
            edit.onSandTap(spot.x, spot.y);
          } else {
            setSelected(null); // tap the water to close the card
          }
        }}
      >
        <skin.Scene />
        <AmbienceScene scene={scene} layer="back" />

        {decor.map((d) => (
          <PlacedDecoration
            key={d.id}
            decoration={d}
            selected={edit?.selectedId === d.id}
            onTap={
              edit
                ? () => {
                    if (!justSwiped.current) edit.onDecorationTap(d.id);
                  }
                : undefined
            }
          />
        ))}

        {plants.map((p) => (
          <PlantInTank
            key={p.id}
            plant={p}
            selected={`plant:${p.id}` === selected}
            onTap={tappable ? () => tap(`plant:${p.id}`) : undefined}
          />
        ))}

        {overlay}

        {fish.map((f) => (
          <SwimmingFish
            // The live fish remounts on each new size, which replays the "pop".
            key={f === liveFish ? `${f.id}-${f.size}` : f.id}
            fish={f}
            selected={`fish:${f.id}` === selected}
            onTap={tappable ? () => tap(`fish:${f.id}`) : undefined}
            grows={f === liveFish}
          />
        ))}

        <AmbienceScene scene={scene} layer="front" />

        {(aquarium === null || empty) && !bare && (
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

      {tankCount > 1 && !bare && (
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
  grows = false,
}: {
  fish: Fish;
  selected: boolean;
  onTap?: () => void; // none in decorate mode or on the running screen
  grows?: boolean; // the session's own fish: pops in at each new size
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
              onTap?.();
            }}
            aria-label={`${FISH_SIZE_LABEL[fish.size]} fish, ${fish.minutes} focus minutes`}
            tabIndex={onTap ? undefined : -1}
            className={`${onTap ? "pointer-events-auto" : "pointer-events-none"} -m-2 block rounded-full p-2 ${
              selected ? "bg-white/40 ring-2 ring-white" : ""
            }`}
          >
            {grows ? (
              <div className="fish-grow">
                <FishSprite look={look} size={fish.size} />
              </div>
            ) : (
              <FishSprite look={look} size={fish.size} />
            )}
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
  onTap?: () => void; // none in decorate mode
}) {
  return (
    <button
      type="button"
      tabIndex={onTap ? undefined : -1}
      onClick={(e) => {
        e.stopPropagation();
        onTap?.();
      }}
      aria-label={`Mature plant, matured ${shortDate(plant.maturedAt)}`}
      className={`absolute bottom-[3%] -translate-x-1/2 rounded-xl px-1 ${selected ? "bg-white/40 ring-2 ring-white" : ""} ${
        onTap ? "" : "pointer-events-none"
      }`}
      style={{ left: `${PLANT_SLOTS_X[plant.slot % PLANT_SLOTS_X.length]}%` }}
    >
      <PlantSprite look={plantLook(plant.id)} stage="mature" width={36} />
    </button>
  );
}

// A placed decoration on the sand. Further back = a little higher and smaller.
// Only tappable in decorate mode.
function PlacedDecoration({
  decoration,
  selected,
  onTap,
}: {
  decoration: Owned;
  selected: boolean;
  onTap?: () => void;
}) {
  const y = decoration.y ?? 0;
  const style: CSSProperties = {
    left: `${decoration.x}%`,
    bottom: `${SAND_BOTTOM + y * SAND_DEPTH}%`,
    transform: `translateX(-50%) scale(${(1 - 0.2 * y).toFixed(2)})`,
    transformOrigin: "50% 100%",
  };
  const sprite = <DecorationSprite item={decoration.item} />;
  if (!onTap) {
    return (
      <span className="pointer-events-none absolute block leading-none" style={style}>
        {sprite}
      </span>
    );
  }
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onTap();
      }}
      aria-label={`${decoration.item.replace("-", " ")}${selected ? ", selected" : ""}`}
      aria-pressed={selected}
      className={`absolute block rounded-lg leading-none ${selected ? "bg-white/50 ring-2 ring-sky-700" : ""}`}
      style={style}
    >
      {sprite}
    </button>
  );
}

// A small gold coin, for the balance.
export function Coin({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" aria-hidden>
      <circle cx="8" cy="8" r="7" fill="#f5c542" />
      <circle cx="8" cy="8" r="4.6" fill="none" stroke="#d9a520" strokeWidth="1.4" />
    </svg>
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
