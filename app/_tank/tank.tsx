"use client";

import Link from "next/link";
import { useRef, useState, type CSSProperties, type MouseEvent, type ReactNode } from "react";
import type { AmbienceSound } from "@/lib/ambience-logic";
import type { BroodStage } from "@/lib/brood";
import { inTank, type Owned } from "@/lib/economy";
import { TANK_CAPACITY, type Aquarium, type Fish } from "@/lib/fish";
import { fishLook, type FishLook } from "@/lib/fish-look";
import { plantLook } from "@/lib/plant-look";
import { PLANT_STAGE_LABEL, type Garden, type Plant } from "@/lib/plants";
import { NAUTILUS, RARITY_LABEL, speciesById } from "@/lib/species";
import { formatDuration } from "@/lib/stats";
import { FOCUS_MODE_LABEL } from "@/lib/timer";
import { Bone, NautilusSprite, SpeciesSprite } from "./fish-sprite";
import { PlantSprite } from "./plant-sprite";
import { AmbienceScene } from "./ambience-scene";
import { LiveBrood } from "./brood";
import { DecorationSprite } from "./decoration-sprite";
import { CountUp } from "../_ui/count-up";
import { DEFAULT_SKIN, type TankSkin } from "./skins";
import { LOOKS } from "./tank4/scenery";
import type { TankFish } from "./tank4/engine";
import { type CanvasDecor, type CanvasPlant, TankCanvas, type TankHandle, type TankStatus } from "./tank4/tank-canvas";
import { decorationById } from "@/lib/decorations";
import type { PlantStage } from "@/lib/plants";

const MODE_LABEL = { timer: "Timer", stopwatch: "Stopwatch", cycle: "Cycle" };
// Bigger fish cruise a little slower (a lap's length, scaled by width in px).
const speedFor = (width: number) => 0.75 + width / 120;
// The nautilus drifts slowly through the middle of the tank, the same on every visit.
const NAUTILUS_LOOK: FishLook = {
  hue: 0,
  accentHue: 0,
  pattern: "plain",
  tail: "round",
  swimSeconds: 34,
  bobSeconds: 4.2,
  lane: 0.45,
  phase: 0.3,
};
const SWIPE_PX = 50;
// Plant spots along the sand (% from the left), one per slot. Low in the tank,
// below the fish lanes, so plants never crowd the fish. (The same as Tank 4's.)
export const PLANT_SLOTS_X = [9, 25, 41, 58, 74, 90];

// The running screen's growing plant (notes): drawn in its spot by the tank.
export type GrowingInTank = { lookId: string; stage: PlantStage; wilted: boolean; slot: number };
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
  settlingId?: string | null; // just placed or moved: it settles onto the sand
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
  brood = null,
  growing = null,
}: {
  aquarium: Aquarium | null; // null while loading
  garden: Garden | null;
  error?: string | null;
  skinOf?: (tank: number) => TankSkin;
  decorations?: Owned[] | null;
  coins?: number | null; // shown in the header (a link to Decorate) when given
  edit?: TankEdit;
  // The running screen: just the tank (no header, swiping, tapping or cards),
  // showing `fixedIndex`, with the session's egg / fry / plant (`overlay`).
  bare?: boolean;
  fixedIndex?: number;
  scene?: AmbienceSound | null; // the ambience scene (rain, waves…), or none
  overlay?: ReactNode;
  brood?: BroodStage | null; // the running screen's egg → fry (study sessions)
  growing?: GrowingInTank | null; // …or its growing plant (notes)
}) {
  const [ownPick, setOwnPick] = useState<number | null>(null); // null = newest tank
  const picked = fixedIndex ?? (edit ? edit.index : ownPick);
  // "fish:<id>", "plant:<id>" or "nautilus": what's tapped (its card is open).
  const [selected, setSelected] = useState<string | null>(null);
  const swipeStartX = useRef<number | null>(null);
  const justSwiped = useRef(false);
  // Tank 4 draws the water and every fish; until it's ready (or if WebGL is
  // missing) the skin's picture shows instead, with still fish on top.
  const [status, setStatus] = useState<TankStatus>("loading");
  const canvas = useRef<TankHandle | null>(null);

  // Plants can overflow into a tank that has no fish yet, so count both.
  // (A session's new fish may be heading for a tank that doesn't exist yet.)
  const tankCount = Math.max(aquarium?.tanks.length ?? 1, garden?.tankCount ?? 1, (fixedIndex ?? 0) + 1);
  const index = Math.min(picked ?? tankCount - 1, tankCount - 1);
  const skin = skinOf(index);
  const decor = decorations ? inTank(decorations, index) : [];
  const fish = aquarium?.tanks[index] ?? [];
  // The namesake lives in the newest tank once you reach 100 credited hours.
  const nautilus = (aquarium?.nautilus ?? false) && index === tankCount - 1;
  const plants = garden?.plants.filter((p) => p.tank === index) ?? [];
  const selectedFish = fish.find((f) => `fish:${f.id}` === selected) ?? null;
  const selectedPlant = plants.find((p) => `plant:${p.id}` === selected) ?? null;
  const empty = aquarium !== null && aquarium.fishCount === 0 && (garden?.plants.length ?? 0) === 0;
  const swimmers: TankFish[] = [
    ...fish.map((f) => ({ key: `fish:${f.id}`, id: f.id, species: f.species, rarity: f.rarity })),
    ...(nautilus ? [{ key: "nautilus", id: "nautilus", species: "nautilus" as const, rarity: null }] : []),
  ];
  const fallback = status === "fallback";
  const tappable = !edit && !bare;
  const canvasPlants: CanvasPlant[] = [
    ...plants.map((p) => ({
      key: `plant:${p.id}`,
      lookId: p.id,
      stage: p.stage,
      wilted: false,
      slot: p.slot,
      width: 36,
      tappable,
      pop: p.stage,
    })),
    ...(growing
      ? [{ key: "growing", lookId: growing.lookId, stage: growing.stage, wilted: growing.wilted, slot: growing.slot, width: 40, tappable: false, pop: growing.stage }]
      : []),
  ];
  const canvasDecor: CanvasDecor[] = decor.map((d) => ({
    key: `decor:${d.id}`,
    item: d.item,
    x: d.x ?? 50,
    y: d.y ?? 0,
    width: decorationById(d.item)?.width ?? 30,
    selected: edit?.selectedId === d.id,
    settle: edit?.settlingId === d.id,
  }));

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

  // open (or close) a card
  const toggle = (key: string) => setSelected((open) => (open === key ? null : key));
  // a tap on the tank: not the end of a swipe
  function tap(key: string) {
    if (!justSwiped.current) toggle(key);
  }

  return (
    <section className="flex flex-col gap-2" aria-label="Your tank">
      {!bare && (
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1">
          <NavButton label="Previous tank" disabled={index === 0} onClick={() => go(-1)}>
            ‹
          </NavButton>
          <h2 className="title-card min-w-16 text-center">Tank {index + 1}</h2>
          <NavButton label="Next tank" disabled={index === tankCount - 1} onClick={() => go(1)}>
            ›
          </NavButton>
        </div>
        <span className="text-sm text-muted">
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
              className="-my-1 flex min-h-11 items-center gap-1 rounded-control px-2 font-semibold text-coin hover:bg-soft"
              aria-label={`${coins} coins. Decorate your tank`}
            >
              <Coin />
              {/* Counts to the new balance when it changes (after buying). */}
              <CountUp value={coins} duration={600} />
            </Link>
          )}
        </span>
      </div>
      )}

      <div
        className={`relative aspect-[4/3] w-full touch-pan-y overflow-hidden rounded-tank shadow-[0_0_0_1px_var(--line),0_4px_0_var(--line)] select-none ${skin.frame}`}
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
            // a decoration under the finger is picked; otherwise the sand is the spot
            const hit = !fallback ? canvas.current?.hitTest(e.clientX, e.clientY, { decorations: true }) : null;
            if (hit?.startsWith("decor:")) return edit.onDecorationTap(hit.slice("decor:".length));
            const spot = sandSpot(e);
            edit.onSandTap(spot.x, spot.y);
          } else {
            // a fish or plant under the finger opens its card; the water closes it
            const hit = tappable && !fallback ? canvas.current?.hitTest(e.clientX, e.clientY, { fish: true, plants: true }) : null;
            if (hit) tap(hit);
            else setSelected(null);
          }
        }}
      >
        {status !== "ready" && <skin.Scene />}
        {!fallback && (
          <TankCanvas
            probe={bare ? "running" : edit ? "shop" : "home"}
            fish={swimmers}
            plants={canvasPlants}
            decorations={canvasDecor}
            brood={brood}
            skin={skin.id}
            selected={selected}
            ref={canvas}
            onStatus={setStatus}
          />
        )}
        <AmbienceScene scene={scene} layer="back" />

        {/* The still picture (no WebGL) draws these itself. */}
        {fallback && decor.map((d) => (
          <PlacedDecoration
            key={d.id}
            decoration={d}
            selected={edit?.selectedId === d.id}
            settle={edit?.settlingId === d.id}
            onTap={
              edit
                ? () => {
                    if (!justSwiped.current) edit.onDecorationTap(d.id);
                  }
                : undefined
            }
          />
        ))}

        {fallback && plants.map((p) => (
          <PlantInTank
            key={p.id}
            plant={p}
            selected={`plant:${p.id}` === selected}
            onTap={tappable ? () => tap(`plant:${p.id}`) : undefined}
          />
        ))}

        {overlay}
        {fallback && brood && <LiveBrood stage={brood} />}
        {fallback && growing && (
          <div className="pointer-events-none absolute bottom-[3%] -translate-x-1/2" style={{ left: `${PLANT_SLOTS_X[growing.slot]}%` }}>
            <PlantSprite look={plantLook(growing.lookId)} stage={growing.stage} wilted={growing.wilted} width={40} />
          </div>
        )}

        {fallback && nautilus && (
          <Swimmer
            look={NAUTILUS_LOOK}
            width={NAUTILUS.width}
            label="Nautilus, the namesake"
            selected={selected === "nautilus"}
            onTap={tappable ? () => tap("nautilus") : undefined}
          >
            <NautilusSprite />
          </Swimmer>
        )}

        {fallback && fish.map((f) => (
          <Swimmer
            key={f.id}
            look={fishLook(f.id)}
            width={speciesById(f.species).width}
            label={`${speciesById(f.species).name}, ${RARITY_LABEL[f.rarity]}`}
            selected={`fish:${f.id}` === selected}
            onTap={tappable ? () => tap(`fish:${f.id}`) : undefined}
          >
            <SpeciesSprite species={f.species} />
          </Swimmer>
        ))}

        <AmbienceScene scene={scene} layer="front" />
        {!fallback && <div className="tank-vignette pointer-events-none absolute inset-0" style={{ "--vignette": LOOKS[skin.id].vignette } as CSSProperties} />}

        {/* The canvas can't be focused, so keyboard and screen-reader users get
            a button per fish (visible while focused). */}
        {!fallback && (tappable || edit) && (
          <div className="absolute inset-x-2 top-2 flex flex-wrap gap-1">
            {edit &&
              decor.map((d) => (
                <button
                  key={d.id}
                  type="button"
                  aria-pressed={edit.selectedId === d.id}
                  onClick={(e) => {
                    e.stopPropagation();
                    edit.onDecorationTap(d.id);
                  }}
                  className="sr-only rounded-chip bg-[#fffcf6] px-3 text-sm text-[#1e2b38] focus:not-sr-only focus:min-h-11"
                >
                  {decorationById(d.item)?.name ?? d.item}
                </button>
              ))}
            {tappable &&
              plants.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    toggle(`plant:${p.id}`); // a key press is never a swipe
                  }}
                  className="sr-only rounded-chip bg-[#fffcf6] px-3 text-sm text-[#1e2b38] focus:not-sr-only focus:min-h-11"
                >
                  {plantLabel(p)}
                </button>
              ))}
            {tappable && swimmers.map((f) => (
              <button
                key={f.key}
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  toggle(f.key);
                }}
                className="sr-only rounded-chip bg-[#fffcf6] px-3 text-sm text-[#1e2b38] focus:not-sr-only focus:min-h-11"
              >
                {f.species === "nautilus" ? "Nautilus, the namesake" : `${speciesById(f.species).name}, ${RARITY_LABEL[f.rarity!]}`}
              </button>
            ))}
          </div>
        )}

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

        {selectedFish && <FishCard key={selectedFish.id} fish={selectedFish} onClose={() => setSelected(null)} />}
        {selected === "nautilus" && nautilus && <NautilusCard onClose={() => setSelected(null)} />}
        {selectedPlant && <PlantCard key={selectedPlant.id} plant={selectedPlant} onClose={() => setSelected(null)} />}
      </div>

      {tankCount > 1 && !bare && (
        <div className="flex justify-center gap-1.5" aria-hidden>
          {Array.from({ length: tankCount }, (_, i) => (
            <span
              key={i}
              className={`h-1.5 w-1.5 rounded-full ${i === index ? "bg-primary" : "bg-line"}`}
            />
          ))}
        </div>
      )}
    </section>
  );
}

// The still-picture fallback (no WebGL): a fish or the nautilus, frozen in its
// lane (tank-paused). Its place comes from its seeded look.
function Swimmer({
  look,
  width,
  label,
  selected,
  onTap,
  children,
}: {
  look: FishLook;
  width: number;
  label: string;
  selected: boolean;
  onTap?: () => void; // none in decorate mode or on the running screen
  children: ReactNode;
}) {
  const style = {
    "--fish-w": `${width}px`,
    "--swim": `${(look.swimSeconds * speedFor(width)).toFixed(1)}s`,
    "--bob": `${look.bobSeconds.toFixed(1)}s`,
    "--phase": look.phase.toFixed(3),
    "--lane": `${(6 + look.lane * 56).toFixed(1)}%`, // stays above the sand
  } as CSSProperties;

  return (
    <div className="tank-swim tank-paused" style={style}>
      <div className="tank-face">
        <div className="tank-bob">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onTap?.();
            }}
            aria-label={label}
            tabIndex={onTap ? undefined : -1}
            className={`${onTap ? "pointer-events-auto" : "pointer-events-none"} -m-2 block rounded-full p-2 ${
              selected ? "bg-white/40 ring-2 ring-white" : ""
            }`}
          >
            {children}
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
  plant: Plant;
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
      aria-label={plantLabel(plant)}
      className={`absolute bottom-[3%] -translate-x-1/2 rounded-control px-1 ${selected ? "bg-white/40 ring-2 ring-white" : ""} ${
        onTap ? "" : "pointer-events-none"
      }`}
      style={{ left: `${PLANT_SLOTS_X[plant.slot % PLANT_SLOTS_X.length]}%` }}
    >
      <PlantSprite look={plantLook(plant.id)} stage={plant.stage} width={36} />
    </button>
  );
}

// A placed decoration on the sand. Further back = a little higher and smaller.
// Only tappable in decorate mode.
function PlacedDecoration({
  decoration,
  selected,
  settle = false,
  onTap,
}: {
  decoration: Owned;
  selected: boolean;
  settle?: boolean; // just placed or moved: settles onto the sand (tank.css)
  onTap?: () => void;
}) {
  const y = decoration.y ?? 0;
  const style: CSSProperties = {
    left: `${decoration.x}%`,
    bottom: `${SAND_BOTTOM + y * SAND_DEPTH}%`,
    transform: `translateX(-50%) scale(${(1 - 0.2 * y).toFixed(2)})`,
    transformOrigin: "50% 100%",
  };
  // Keyed by the spot, so moving it settles again.
  const sprite = (
    <span key={`${decoration.x},${y}`} className={`block ${settle ? "decor-settle" : ""}`}>
      <DecorationSprite item={decoration.item} />
    </span>
  );
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
      className={`absolute block rounded-chip leading-none ${selected ? "bg-white/50 ring-2 ring-[#23466b]" : ""}`}
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

const plantLabel = (p: Plant) => `${PLANT_STAGE_LABEL[p.stage]}, planted ${shortDate(p.plantedAt)}`;

function PlantCard({ plant, onClose }: { plant: Plant; onClose: () => void }) {
  return (
    <TankCard onClose={onClose}>
      <p className="font-semibold">{PLANT_STAGE_LABEL[plant.stage]}</p>
      <p>Grown in one notes session of {formatDuration(plant.minutes * 60)}</p>
      <p className="text-[#5f6977]">Planted {shortDate(plant.plantedAt)}</p>
    </TankCard>
  );
}

function FishCard({ fish, onClose }: { fish: Fish; onClose: () => void }) {
  const species = speciesById(fish.species);
  const date = new Date(fish.caughtAt).toLocaleString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
  return (
    <TankCard onClose={onClose}>
      <p>
        <span className="font-semibold">{species.name}</span>
        <span className="text-[#5f6977]"> · {RARITY_LABEL[fish.rarity]}</span>
      </p>
      <p>{species.fact}</p>
      <p className="text-[#5f6977]">
        Caught {date} · {fish.minutes} focus min · {MODE_LABEL[fish.mode]} · {FOCUS_MODE_LABEL[fish.focusMode]}
      </p>
      <Link href="/sea-life" className="inline-flex min-h-11 items-center font-semibold text-[#23466b]">
        Sea life index ›
      </Link>
    </TankCard>
  );
}

function NautilusCard({ onClose }: { onClose: () => void }) {
  return (
    <TankCard onClose={onClose}>
      <p>
        <span className="font-semibold">{NAUTILUS.name}</span>
        <span className="text-[#5f6977]"> · The namesake</span>
      </p>
      <p>{NAUTILUS.fact}</p>
      <p className="text-[#5f6977]">Joined at {NAUTILUS.hours} hours of focus.</p>
    </TankCard>
  );
}

// The card at the bottom of the tank for a tapped fish, plant or the nautilus.
// It floats on the water, which looks the same in light and dark mode, so it uses
// fixed light Paper Tide colours (card / ink / muted / primary) instead of tokens.
function TankCard({ onClose, children }: { onClose: () => void; children: ReactNode }) {
  return (
    <div
      className="swap-in absolute inset-x-2 bottom-2 flex items-start justify-between gap-3 rounded-card bg-[#fffcf6]/95 p-3 text-sm text-[#1e2b38] shadow-[0_0_0_1px_#e3dacb,0_2px_0_#e3dacb]"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex flex-col gap-0.5">{children}</div>
      <button
        type="button"
        onClick={onClose}
        aria-label="Close"
        className="-m-2 flex h-11 w-11 shrink-0 items-center justify-center rounded-control text-xl leading-none text-[#5f6977]"
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
      className="h-11 w-11 rounded-control text-2xl leading-none hover:bg-soft disabled:opacity-25"
    >
      {children}
    </button>
  );
}
