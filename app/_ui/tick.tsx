// The 22 px tick box used by task lists (Tasks, Home's Today card). Pass
// `animate` when it has just been ticked by a tap: the box pops a little and
// the check draws itself (globals.css, "tick-pop" / "tick-draw"). Without it the
// tick just shows, so lists that load already ticked never animate.
export function TickBox({ checked, animate = false, className = "" }: { checked: boolean; animate?: boolean; className?: string }) {
  return (
    <span
      aria-hidden
      className={`flex h-5.5 w-5.5 shrink-0 items-center justify-center rounded-[6px] transition-colors duration-(--dur) ${
        checked ? `bg-primary text-on-primary ${animate ? "tick-pop" : ""}` : "shadow-[inset_0_0_0_2px_var(--line)]"
      } ${className}`}
    >
      {checked && <TickMark animate={animate} />}
    </span>
  );
}

export function TickMark({ animate = false, className = "h-3.5 w-3.5" }: { animate?: boolean; className?: string }) {
  return (
    <svg viewBox="0 0 16 16" className={className} fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M3.5 8.5 6.5 11.5 12.5 4.5" className={animate ? "tick-draw" : undefined} />
    </svg>
  );
}
