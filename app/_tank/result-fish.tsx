"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { FISH_MIN_MINUTES, earnsFish, findFish, speciesOf, tankIndexOf, type Aquarium } from "@/lib/fish";
import { hashString, seededRandom } from "@/lib/fish-look";
import { toRow } from "@/lib/session-record";
import { RARITY_LABEL, SPECIES, speciesById, type SpeciesId } from "@/lib/species";
import type { Result } from "@/lib/timer";
import { broodStage } from "@/lib/brood";
import { DriftingBrood } from "./brood";
import { Bone, SpeciesSprite } from "./fish-sprite";

// What happened to this session's fish, shown on the result screen.
export function ResultFish({ result, aquarium }: { result: Result; aquarium: Aquarium | null }) {
  const id = result.id ?? "legacy";

  if (result.outcome === "failed") {
    // How far it got (all focus time, including what was lost): an egg or a fry.
    // A fish only becomes a species when its session ends well, so it's never more.
    const minutes = Math.floor((result.focusMs + result.lostMs) / 60_000);
    const stage = broodStage(minutes);
    return (
      <div className="flex flex-col items-center gap-2">
        <div className="relative flex h-28 w-40 items-center justify-center">
          <DriftingBrood stage={stage} />
          <div className="bone-appear absolute">
            <Bone width={48} />
          </div>
        </div>
        <p className="text-sm text-zinc-500">
          {stage === "fry" ? "Your fry didn't make it." : "Your egg didn't hatch."}{" "}
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

  // The species saved with the session (the tank's copy once it has loaded).
  const species = (aquarium && findFish(aquarium, id)?.species) || speciesOf(row);
  const tank = aquarium ? tankIndexOf(aquarium, id) + 1 : 0;
  return <HatchReveal key={id} id={id} species={species} tank={tank} />;
}

// How long each silhouette stays before the next: quick at first, then slowing
// down, like a wheel coming to rest. About 2.5 s in all.
const FLICK_MS = [110, 120, 140, 170, 210, 260, 320, 400, 520];

// The silhouettes shown before the real fish: a shuffled run of other species
// (seeded by the session, so a replay looks the same), ending on the catch.
function revealSequence(id: string, species: SpeciesId): SpeciesId[] {
  const rand = seededRandom(hashString(`${id}:reveal`));
  const others = SPECIES.map((s) => s.id as SpeciesId).filter((s) => s !== species);
  for (let i = others.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [others[i], others[j]] = [others[j], others[i]];
  }
  return [...others.slice(0, FLICK_MS.length), species];
}

// The calm "hatching" moment: silhouettes flick past, slow down, and the fry
// becomes its species. Tap to skip; reduced motion shows the fish straight away.
function HatchReveal({ id, species, tank }: { id: string; species: SpeciesId; tank: number }) {
  const sequence = useMemo(() => revealSequence(id, species), [id, species]);
  const last = sequence.length - 1;
  const [step, setStep] = useState(0);
  const done = step >= last;

  useEffect(() => {
    if (done) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const timer = setTimeout(() => setStep(reduce ? last : step + 1), reduce ? 0 : FLICK_MS[step]);
    return () => clearTimeout(timer);
  }, [step, done, last]);

  const shown = sequence[Math.min(step, last)];
  const info = speciesById(species);
  const width = Math.min(speciesById(shown).width * 1.5, 150);

  return (
    <div className="flex w-full flex-col items-center gap-2">
      <button
        type="button"
        onClick={() => setStep(last)}
        disabled={done}
        aria-label={done ? undefined : "Skip the hatching"}
        className="flex h-28 w-48 items-center justify-center text-sky-900/35 dark:text-sky-200/30"
      >
        {done ? (
          <div className="tank-bob">
            <div className="fish-grow">
              <SpeciesSprite species={species} width={width} />
            </div>
          </div>
        ) : (
          <div key={step} className="hatch-flick">
            <SpeciesSprite species={shown} width={width} silhouette />
          </div>
        )}
      </button>
      {done ? (
        <div className="flex flex-col items-center gap-1" aria-live="polite">
          <p>
            <span className="font-semibold">{info.name}</span>
            <span className="text-zinc-500"> · {RARITY_LABEL[info.rarity]}</span>
          </p>
          <p className="max-w-xs text-sm text-zinc-600 dark:text-zinc-400">{info.fact}</p>
          <p className="text-sm text-zinc-500">
            Joined {tank > 0 ? `Tank ${tank}` : "your tank"} ·{" "}
            <Link href="/sea-life" className="font-medium text-sky-700 dark:text-sky-400">
              Sea life index
            </Link>
          </p>
        </div>
      ) : (
        <p className="text-sm text-zinc-500">Your fry is hatching… (tap to skip)</p>
      )}
    </div>
  );
}
