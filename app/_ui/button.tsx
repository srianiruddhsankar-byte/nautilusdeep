import Link from "next/link";
import type { ComponentProps } from "react";

// Paper Tide buttons. One `primary` per screen (the thing you came to do); the
// rest are secondary, outline or quiet. Every size is at least 44 px tall.
//   primary   — ink-blue with a paper edge that presses down
//   secondary — soft fill
//   outline   — hairline border (Give up / End session: calm, never red)
//   quiet     — text only, fill on hover

export type ButtonVariant = "primary" | "secondary" | "outline" | "quiet";
export type ButtonSize = "sm" | "md" | "lg";

const BASE =
  "inline-flex items-center justify-center gap-2 rounded-control font-semibold select-none " +
  "transition-[transform,box-shadow,background-color] duration-(--dur-fast) ease-snap " +
  "disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none " +
  "enabled:active:scale-[0.98]";

const VARIANTS: Record<ButtonVariant, string> = {
  primary:
    "bg-primary text-on-primary shadow-press enabled:active:translate-y-[3px] enabled:active:scale-100 enabled:active:shadow-none " +
    "[a&]:active:translate-y-[3px] [a&]:active:shadow-none",
  secondary: "bg-soft text-ink hover:bg-line",
  outline: "bg-transparent text-ink shadow-[inset_0_0_0_1.5px_var(--line)] hover:bg-soft",
  quiet: "bg-transparent text-muted hover:bg-soft hover:text-ink",
};

const SIZES: Record<ButtonSize, string> = {
  sm: "min-h-11 px-3.5 text-sm",
  md: "min-h-12 px-5",
  lg: "min-h-15 w-full px-5 text-[19px]",
};

export function buttonClass(variant: ButtonVariant = "secondary", size: ButtonSize = "md", extra = "") {
  return `${BASE} ${VARIANTS[variant]} ${SIZES[size]} ${extra}`;
}

type Style = { variant?: ButtonVariant; size?: ButtonSize };

export function Button({ variant, size, className = "", type = "button", ...rest }: ComponentProps<"button"> & Style) {
  return <button type={type} className={buttonClass(variant, size, className)} {...rest} />;
}

export function ButtonLink({ variant, size, className = "", ...rest }: ComponentProps<typeof Link> & Style) {
  return <Link className={buttonClass(variant, size, className)} {...rest} />;
}
