import type { ReactNode } from "react";

// A number with its label: label on top (small, muted), the value in Fraunces,
// an optional note under it. Used in grids of 2–4 (<dl>), so each is a <div>
// holding <dt> + <dd>.
export function StatTile({ label, value, sub }: { label: string; value: ReactNode; sub?: string }) {
  return (
    <div className="flex min-w-0 flex-col gap-1 rounded-control bg-soft p-3">
      <dt className="text-xs text-muted">{label}</dt>
      <dd className="numeral text-[22px] leading-tight break-words">{value}</dd>
      {sub && <dd className="text-xs text-muted">{sub}</dd>}
    </div>
  );
}

// A 2-column grid of tiles (4 across on wide screens).
export function StatGrid({ children, cols = 2 }: { children: ReactNode; cols?: 2 | 3 }) {
  return <dl className={`grid gap-2 ${cols === 3 ? "grid-cols-3" : "grid-cols-2 sm:grid-cols-4"}`}>{children}</dl>;
}
