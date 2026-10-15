// Notes sessions: target time vs actual. Pure.

export type TargetComparison = {
  actualMinutes: number;
  diffMinutes: number; // positive = over target, negative = under
  text: string; // "Took 52 min — 7 min over target"
};

// Whole minutes, rounded down like every other "focus minutes" in the app.
export function compareToTarget(focusSeconds: number, targetMinutes: number): TargetComparison {
  const actualMinutes = Math.floor(focusSeconds / 60);
  const diffMinutes = actualMinutes - targetMinutes;
  const verdict =
    diffMinutes > 0
      ? `${diffMinutes} min over target`
      : diffMinutes < 0
        ? `${-diffMinutes} min under target`
        : "right on target";
  return { actualMinutes, diffMinutes, text: `Took ${actualMinutes} min — ${verdict}` };
}
