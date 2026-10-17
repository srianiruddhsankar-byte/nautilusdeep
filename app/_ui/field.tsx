import type { ComponentProps, ReactNode } from "react";

// Inputs: card-coloured, hairline border, 48 px tall, 16 px+ text (smaller text
// makes iPhones zoom in on focus).
export const inputClass =
  "min-h-12 w-full rounded-control bg-card px-3 text-base text-ink shadow-[inset_0_0_0_1.5px_var(--line)] " +
  "placeholder:text-muted/70 transition-shadow duration-(--dur-fast) focus-visible:shadow-[inset_0_0_0_1.5px_var(--primary)]";

// A labelled input. The label sits above, in the muted small style.
export function Field({
  label,
  hint,
  className = "",
  ...input
}: ComponentProps<"input"> & { label: ReactNode; hint?: ReactNode }) {
  return (
    <label className={`flex flex-col gap-1.5 text-sm text-muted ${className}`}>
      {label}
      <input className={inputClass} {...input} />
      {hint}
    </label>
  );
}

// Whole minutes and counts: a numeric keypad on phones.
export function NumberField({
  label,
  value,
  placeholder,
  onChange,
}: {
  label: ReactNode;
  value: string;
  placeholder?: string;
  onChange: (value: string) => void;
}) {
  return (
    <Field
      label={label}
      type="number"
      inputMode="numeric"
      min={1}
      value={value}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
    />
  );
}
