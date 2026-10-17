"use client";

import { useMemo, type ReactNode } from "react";
import { formatHours } from "@/lib/economy";
import { catchLog, creditedHours, deriveAquarium, type Catch } from "@/lib/fish";
import { useSessions } from "@/lib/sessions-data";
import { NAUTILUS, RARITIES, RARITY_LABEL, SPECIES, hasNautilus, poolOf, type Species, type SpeciesId } from "@/lib/species";
import { NautilusSprite, SpeciesSprite } from "../_tank/fish-sprite";

// Every species, grouped by rarity. Caught ones in colour with their fact,
// uncaught ones as dark "???" silhouettes. All derived from your sessions.
export function SeaLifeView() {
  const { rows, error } = useSessions();
  const data = useMemo(() => {
    if (!rows) return null;
    return { log: catchLog(deriveAquarium(rows)), hours: creditedHours(rows) };
  }, [rows]);

  if (!data) {
    return <p className="py-6 text-center text-zinc-500">{error ? `Couldn't load: ${error}` : "Loading…"}</p>;
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-zinc-600 dark:text-zinc-400">
        {data.log.size} of {SPECIES.length} species caught. Longer sessions make rarer fish more likely.
      </p>

      <Group title="The namesake">
        <Namesake hours={data.hours} />
      </Group>

      {RARITIES.map((rarity) => {
        const pool = poolOf(rarity);
        const caught = pool.filter((s) => data.log.has(s.id as SpeciesId)).length;
        return (
          <Group key={rarity} title={RARITY_LABEL[rarity]} count={`${caught}/${pool.length}`}>
            <ul className="grid grid-cols-2 gap-2">
              {pool.map((s) => (
                <SpeciesCard key={s.id} species={s} caught={data.log.get(s.id as SpeciesId) ?? null} />
              ))}
            </ul>
          </Group>
        );
      })}
    </div>
  );
}

function Group({ title, count, children }: { title: string; count?: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-3 rounded-2xl border border-zinc-200 p-4 dark:border-zinc-800">
      <h2 className="flex items-baseline justify-between font-semibold">
        {title}
        {count && <span className="text-sm font-normal text-zinc-500">{count}</span>}
      </h2>
      {children}
    </section>
  );
}

const firstDate = (iso: string) =>
  new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });

function SpeciesCard({ species, caught }: { species: Species; caught: Catch | null }) {
  const width = Math.min(species.width * 1.3, 130);
  return (
    <li className="flex flex-col gap-1 rounded-xl bg-zinc-100 p-3 text-sm dark:bg-zinc-900">
      <div className="flex h-16 items-center justify-center text-zinc-300 dark:text-zinc-700">
        <SpeciesSprite species={species.id as SpeciesId} width={width} silhouette={!caught} />
      </div>
      {caught ? (
        <>
          <p className="font-semibold">{species.name}</p>
          <p className="text-zinc-600 dark:text-zinc-400">{species.fact}</p>
          <p className="text-xs text-zinc-500">
            ×{caught.count} · first {firstDate(caught.firstCaughtAt)}
          </p>
        </>
      ) : (
        <>
          <p className="font-semibold text-zinc-400 dark:text-zinc-600">???</p>
          <p className="text-xs text-zinc-500">Not caught yet</p>
        </>
      )}
    </li>
  );
}

// The nautilus isn't in the roulette: it joins your newest tank once, at 100 hours.
function Namesake({ hours }: { hours: number }) {
  const unlocked = hasNautilus(hours);
  return (
    <div className="flex items-center gap-4 text-sm">
      <div className="shrink-0 text-zinc-300 dark:text-zinc-700">
        <NautilusSprite width={64} silhouette={!unlocked} />
      </div>
      {unlocked ? (
        <div className="flex flex-col gap-1">
          <p className="font-semibold">{NAUTILUS.name}</p>
          <p className="text-zinc-600 dark:text-zinc-400">{NAUTILUS.fact}</p>
          <p className="text-xs text-zinc-500">Lives in your newest tank.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-1">
          <p className="font-semibold text-zinc-400 dark:text-zinc-600">???</p>
          <p>Reach {NAUTILUS.hours} hours of study and notes.</p>
          <p className="text-xs text-zinc-500">You&apos;re at {formatHours(hours)}.</p>
        </div>
      )}
    </div>
  );
}
