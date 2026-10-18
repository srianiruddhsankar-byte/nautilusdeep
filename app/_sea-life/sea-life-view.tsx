"use client";

import { useMemo, type ReactNode } from "react";
import { formatHours } from "@/lib/economy";
import { catchLog, creditedHours, deriveAquarium, type Catch } from "@/lib/fish";
import { useSessions } from "@/lib/sessions-data";
import {
  NAUTILUS,
  RARITIES,
  RARITY_LABEL,
  SPECIES,
  hasNautilus,
  poolOf,
  type Rarity,
  type Species,
  type SpeciesId,
} from "@/lib/species";
import { NautilusSprite, SpeciesSprite } from "../_tank/fish-sprite";
import { Card } from "../_ui/card";
import { ProgressBar, Skeleton } from "../_ui/feedback";
import { useLoadFade } from "../_ui/motion";

// Every species, grouped by rarity. Caught ones in colour with their fact,
// uncaught ones as dark "???" silhouettes. All derived from your sessions.
export function SeaLifeView() {
  const { rows, error } = useSessions();
  const data = useMemo(() => {
    if (!rows) return null;
    return { log: catchLog(deriveAquarium(rows)), hours: creditedHours(rows) };
  }, [rows]);
  const fade = useLoadFade(data !== null);

  if (!data) {
    if (error) return <p role="alert" className="text-sm text-danger">Couldn&apos;t load: {error}</p>;
    return (
      <div className="flex flex-col gap-5" aria-busy="true" aria-label="Loading the index">
        <Skeleton className="h-12" />
        <Skeleton className="h-28 rounded-card" />
        <Skeleton className="h-72 rounded-card" />
      </div>
    );
  }

  return (
    <div className={`flex flex-col gap-5 ${fade}`}>
      <div className="flex flex-col gap-2">
        <p>
          <b className="font-semibold tabular-nums">
            {data.log.size} of {SPECIES.length}
          </b>{" "}
          species caught. Longer sessions make rarer fish more likely.
        </p>
        <ProgressBar value={data.log.size / SPECIES.length} label="Species caught" />
      </div>

      <Group title="The namesake">
        <Namesake hours={data.hours} />
      </Group>

      {RARITIES.map((rarity) => {
        const pool = poolOf(rarity);
        const caught = pool.filter((s) => data.log.has(s.id as SpeciesId)).length;
        return (
          <Group key={rarity} title={RARITY_LABEL[rarity]} rarity={rarity} count={`${caught}/${pool.length}`}>
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

function Group({
  title,
  rarity,
  count,
  children,
}: {
  title: string;
  rarity?: Rarity;
  count?: string;
  children: ReactNode;
}) {
  return (
    <Card as="section" aria-label={title} className="gap-3">
      <h2 className="flex items-center justify-between gap-3">
        <span className="flex items-center gap-2.5">
          {rarity && <Pips rarity={rarity} />}
          <span className="title-card">{title}</span>
        </span>
        {count && <span className="text-sm text-muted tabular-nums">{count}</span>}
      </h2>
      {children}
    </Card>
  );
}

// Rarity is never colour alone: the number of filled pips (1–5) AND the word.
function Pips({ rarity }: { rarity: Rarity }) {
  const rank = RARITIES.indexOf(rarity) + 1;
  return (
    <span aria-hidden className="inline-flex gap-[3px]">
      {RARITIES.map((r, i) => (
        <span
          key={r}
          className={`h-2 w-2 rounded-[1px] ${i < rank ? "bg-primary" : "shadow-[inset_0_0_0_1.5px_var(--muted)]"}`}
        />
      ))}
    </span>
  );
}

const firstDate = (iso: string) =>
  new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });

function SpeciesCard({ species, caught }: { species: Species; caught: Catch | null }) {
  const width = Math.min(species.width * 1.3, 130);
  return (
    <li className="flex flex-col gap-1 rounded-control bg-soft p-3 text-sm">
      <div className="flex h-16 items-center justify-center text-muted/40">
        <SpeciesSprite species={species.id as SpeciesId} width={width} silhouette={!caught} />
      </div>
      {caught ? (
        <>
          <p className="font-semibold">{species.name}</p>
          <p>{species.fact}</p>
          <p className="text-xs text-muted">
            ×{caught.count} · first {firstDate(caught.firstCaughtAt)}
          </p>
        </>
      ) : (
        <>
          <p className="font-semibold text-muted">???</p>
          <p className="text-xs text-muted">Not caught yet</p>
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
      <div className="shrink-0 text-muted/40">
        <NautilusSprite width={64} silhouette={!unlocked} />
      </div>
      {unlocked ? (
        <div className="flex flex-col gap-1">
          <p className="font-semibold">{NAUTILUS.name}</p>
          <p>{NAUTILUS.fact}</p>
          <p className="text-xs text-muted">Lives in your newest tank.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-1.5">
          <p className="font-semibold text-muted">???</p>
          <p>Reach {NAUTILUS.hours} hours of study and notes.</p>
          <ProgressBar value={hours / NAUTILUS.hours} label="Hours toward the nautilus" />
          <p className="text-xs text-muted">You&apos;re at {formatHours(hours)}.</p>
        </div>
      )}
    </div>
  );
}
