"use client";

import type { KeyboardEvent, ReactNode } from "react";

// Tabs switch between VIEWS of a page (Segmented chooses a SETTING). Ink
// underline on the current tab (it grows from the centre when chosen); Left /
// Right arrows move between tabs. The page renders the panel (id
// `${idPrefix}-panel`), keyed by the tab with `swap-in`, so a new view swaps in.
export function Tabs<T extends string>({
  tabs,
  value,
  onChange,
  label,
  idPrefix,
}: {
  tabs: { id: T; label: ReactNode }[];
  value: T;
  onChange: (value: T) => void;
  label: string;
  idPrefix: string;
}) {
  function onKey(e: KeyboardEvent<HTMLDivElement>) {
    if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
    e.preventDefault();
    const i = tabs.findIndex((t) => t.id === value);
    const next = tabs[(i + (e.key === "ArrowRight" ? 1 : tabs.length - 1)) % tabs.length];
    onChange(next.id);
    document.getElementById(`${idPrefix}-tab-${next.id}`)?.focus();
  }

  return (
    <div role="tablist" aria-label={label} onKeyDown={onKey} className="flex gap-1 border-b border-line">
      {tabs.map((t) => {
        const on = t.id === value;
        return (
          <button
            key={t.id}
            id={`${idPrefix}-tab-${t.id}`}
            type="button"
            role="tab"
            aria-selected={on}
            aria-controls={`${idPrefix}-panel`}
            tabIndex={on ? 0 : -1}
            onClick={() => onChange(t.id)}
            className={`relative min-h-11 px-3 font-semibold transition-colors duration-(--dur) ease-snap ${
              on ? "text-ink" : "text-muted hover:text-ink"
            }`}
          >
            {t.label}
            <span
              aria-hidden
              className={`absolute inset-x-0 -bottom-px h-0.5 bg-ink transition-transform duration-(--dur-slow) ease-snap ${
                on ? "scale-x-100" : "scale-x-0"
              }`}
            />
          </button>
        );
      })}
    </div>
  );
}

