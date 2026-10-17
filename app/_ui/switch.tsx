import type { ReactNode } from "react";

// An on/off setting: the whole row is the switch (a big tap target), with a
// title, an optional explanation, and the track on the right.
export function Switch({
  checked,
  onChange,
  label,
  description,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: ReactNode;
  description?: ReactNode;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="-mx-2 flex min-h-11 items-center justify-between gap-4 rounded-control px-2 py-1 text-left"
    >
      <span className="flex flex-col">
        <span className="font-semibold">{label}</span>
        {description && <span className="text-sm text-muted">{description}</span>}
      </span>
      <span
        aria-hidden
        className={`relative h-7 w-12 shrink-0 rounded-full transition-colors duration-(--dur) ease-snap ${
          checked ? "bg-primary" : "bg-line"
        }`}
      >
        <span
          className={`absolute top-1 left-1 h-5 w-5 rounded-full bg-card shadow-[0_1px_0_var(--primary-edge)] transition-transform duration-(--dur) ease-snap ${
            checked ? "translate-x-5" : ""
          }`}
        />
      </span>
    </button>
  );
}
