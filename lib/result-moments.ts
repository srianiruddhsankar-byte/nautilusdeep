import { COIN_MIN_MINUTES, coinsFor } from "./economy.ts";
import { creditedHours, FISH_MIN_MINUTES, focusMinutes, type Aquarium, type SessionFacts } from "./fish.ts";
import { PLANT_MIN_MINUTES } from "./plants.ts";
import { hasNautilus, type SpeciesId } from "./species.ts";
import { computeOverview, dayKey, STUDY_DAY_MIN_SECONDS } from "./stats.ts";

// The result screen's small moments: what THIS session changed. Pure, so the
// rules are tested (lib/result-moments.test.ts), and each is worked out by
// comparing your sessions without it and with it. That way it's right whether
// or not the row has reached the list yet (it may still be in the upload queue).

export type ResultMoments = {
  streak: { from: number; to: number } | null; // only when this session made it grow
  nautilus: boolean; // this session took you past 100 hours: the nautilus arrives
};

export function resultMoments(rows: SessionFacts[], row: SessionFacts, now: number, timeZone: string): ResultMoments {
  const before = rows.filter((r) => r.id !== row.id);
  const after = [...before, row];
  const from = computeOverview(before, now, timeZone).streak.current;
  const to = computeOverview(after, now, timeZone).streak.current;
  return {
    streak: to > from ? { from, to } : null,
    nautilus: hasNautilus(creditedHours(after)) && !hasNautilus(creditedHours(before)),
  };
}

// The first fish of its species: no other fish in the tanks is one.
export function isNewSpecies(aquarium: Aquarium, fishId: string, species: SpeciesId): boolean {
  return !aquarium.tanks.some((tank) => tank.some((f) => f.species === species && f.id !== fishId));
}

// ---------- A session too short for a fish or plant ----------

// What it still did: its credited minutes, the coins it actually earned (Open
// Focus earns half, rounded down) and whether its day is now a study day.
// A session counts toward the day it STARTED on, like every stat.
export type ShortSession = { minutes: number; coins: number; studyDay: boolean; today: boolean };

export function shortSession(rows: SessionFacts[], row: SessionFacts, now: number, timeZone: string): ShortSession {
  const day = dayKey(Date.parse(row.started_at), timeZone);
  const seconds = [...rows.filter((r) => r.id !== row.id), row]
    .filter((r) => r.outcome !== "failed" && dayKey(Date.parse(r.started_at), timeZone) === day)
    .reduce((sum, r) => sum + r.focus_seconds, 0);
  return {
    minutes: focusMinutes(row),
    coins: coinsFor(row),
    studyDay: seconds >= STUDY_DAY_MIN_SECONDS,
    today: day === dayKey(now, timeZone),
  };
}

// "12 min counted · +6 coins · today's streak day. Plants start at 15 min."
// Honest and kind: what counted first, then when the fish / plant starts.
export function shortSessionText(s: ShortSession, kind: "study" | "notes"): string {
  const counted = s.minutes < 1 ? "Under a minute counted" : `${s.minutes} min counted`;
  const parts = [counted];
  if (s.coins > 0) parts.push(`+${s.coins} ${s.coins === 1 ? "coin" : "coins"}`);
  if (s.studyDay) parts.push(s.today ? "today's streak day" : "a streak day");
  const noCoins = s.minutes < COIN_MIN_MINUTES;
  const next =
    kind === "study"
      ? noCoins
        ? `Fish and coins start at ${FISH_MIN_MINUTES} min.`
        : `Fish hatch at ${FISH_MIN_MINUTES} min.`
      : noCoins
        ? `Coins start at ${COIN_MIN_MINUTES} min, plants at ${PLANT_MIN_MINUTES}.`
        : `Plants start at ${PLANT_MIN_MINUTES} min.`;
  return `${parts.join(" · ")}. ${next}`;
}
