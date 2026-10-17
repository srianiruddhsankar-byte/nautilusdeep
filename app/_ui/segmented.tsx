import type { ReactNode } from "react";

// Pick one of a few options that sit side by side (Study / Notes, Timer /
// Stopwatch / Cycle). The chosen one is lifted onto a card-coloured tile.
export function Segmented<T extends string | number>({
  options,
  value,
  onChange,
  label,
}: {
  options: { id: T; label: ReactNode }[];
  value: T;
  onChange: (value: T) => void;
  label: string; // for screen readers: what this group chooses
}) {
  return (
    <div
      role="group"
      aria-label={label}
      className="grid gap-1 rounded-control bg-soft p-1"
      style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}
    >
      {options.map((o) => {
        const on = value === o.id;
        return (
          <button
            key={String(o.id)}
            type="button"
            onClick={() => onChange(o.id)}
            aria-pressed={on}
            className={`min-h-11 truncate rounded-[8px] px-2 font-semibold transition-[background-color,color,box-shadow] duration-(--dur) ease-snap ${
              on ? "bg-card text-ink shadow-[0_1px_0_var(--line)]" : "text-muted hover:text-ink"
            }`}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

// A small pill for picking from a longer list (minutes, cycles, open tasks).
export function Chip({
  on,
  onClick,
  children,
  className = "",
}: {
  on: boolean;
  onClick: () => void;
  children: ReactNode;
  className?: string;
}) {
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={onClick}
      className={`min-h-11 max-w-full truncate rounded-chip px-4 text-sm font-semibold transition-[background-color,color,box-shadow] duration-(--dur) ease-snap ${
        on
          ? "bg-primary text-on-primary"
          : "bg-card text-ink shadow-[inset_0_0_0_1.5px_var(--line)] hover:bg-soft"
      } ${className}`}
    >
      {children}
    </button>
  );
}
