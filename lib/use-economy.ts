import { useMemo } from "react";
import type { MilestoneId } from "./decorations";
import {
  coinBalance,
  creditedHours,
  earnedCoins,
  reachedMilestones,
  skinForTank,
  spentCoins,
  type SkinId,
} from "./economy";
import { useOwned } from "./owned";
import { useSessions } from "./sessions-data";
import { useClock } from "./use-clock";

// Everything the coin / decoration / skin screens need, worked out once from
// your sessions (earned) and your decorations (spent). Numbers are null until
// both have loaded, so nothing flashes a wrong balance.
export function useEconomy() {
  const { rows } = useSessions();
  const { owned, skinChoices, error } = useOwned();
  const clock = useClock();

  return useMemo(() => {
    const hours = rows ? creditedHours(rows) : 0;
    return {
      owned,
      error,
      hours,
      earned: rows ? earnedCoins(rows) : null,
      spent: owned ? spentCoins(owned) : null,
      balance: rows && owned ? coinBalance(rows, owned) : null,
      reached: rows && clock ? reachedMilestones(rows, clock.now, clock.timeZone) : new Set<MilestoneId>(),
      skinIdOf: (tank: number): SkinId => skinForTank(skinChoices, tank, hours),
      skinChoices,
    };
  }, [rows, owned, skinChoices, error, clock]);
}
