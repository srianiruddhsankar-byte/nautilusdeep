import type { ComponentProps, ReactNode } from "react";

// Loading, empty and progress states, shared so every page waits and explains
// itself the same way.

// A placeholder block the size of what's loading, so nothing jumps when it arrives.
export function Skeleton({ className = "", ...rest }: ComponentProps<"div">) {
  return <div aria-hidden className={`skeleton ${className}`} {...rest} />;
}

// When a list or view has nothing in it yet: what it is, and the next step.
// Encouraging, never a telling-off.
export function EmptyState({ title, children, action }: { title: ReactNode; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-2 px-4 py-6 text-center">
      <p className="title-card">{title}</p>
      {children && <p className="max-w-xs text-sm text-muted">{children}</p>}
      {action && <div className="pt-2">{action}</div>}
    </div>
  );
}

// A thin progress bar (0–1). `steps` > 1 splits it into that many segments
// (cycle blocks), with `index` the current one; segments before it are full.
export function ProgressBar({
  value,
  steps = 1,
  index = 0,
  label,
  muted = false,
}: {
  value: number;
  steps?: number;
  index?: number;
  label: string;
  muted?: boolean; // paused: greyed, still visible
}) {
  const clamped = Math.min(1, Math.max(0, value));
  const fill = muted ? "bg-muted" : "bg-primary";
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(clamped * 100)}
      className="flex w-full gap-1"
    >
      {Array.from({ length: steps }, (_, i) => {
        const part = i < index ? 1 : i > index ? 0 : clamped;
        return (
          // The fill is scaled, not resized (transform only), and glides between
          // the clock's quarter-second ticks.
          <span key={i} className="h-1 flex-1 overflow-hidden rounded-full bg-line">
            <span
              className={`block h-full w-full origin-left rounded-full transition-[transform,background-color] duration-(--dur-screen) ease-linear ${fill}`}
              style={{ transform: `scaleX(${part})` }}
            />
          </span>
        );
      })}
    </div>
  );
}
