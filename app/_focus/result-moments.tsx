import Link from "next/link";
import type { CSSProperties } from "react";
import { NAUTILUS } from "@/lib/species";
import { FlameIcon } from "../_stats/stats-line";
import { NautilusSprite } from "../_tank/fish-sprite";
import { CountUp } from "../_ui/count-up";
import { step } from "../_ui/motion";

// The result screen's one-off moments (which ones show: lib/result-moments.ts).
// Also shown on /design-preview, so they can be seen without 100 hours of study.

// This session grew the streak: the line arrives, then gets a small soft
// highlight as the number ticks up. Only shown when it grew, so it always means something.
export function StreakMoment({ from, to }: { from: number; to: number }) {
  const delay = { "--delay": "700ms" } as CSSProperties;
  return (
    <p className="rise-in -mt-3 flex justify-center text-sm" style={step(3)}>
      <span className="glow-once inline-flex items-center gap-1.5 px-1 py-0.5" style={delay}>
        <FlameIcon className="pop-once" />
        <span>
          <b className="font-semibold">
            <CountUp value={to} from={from} delay={700} duration={400} />
            -day streak
          </b>
          {from === 0 ? " · started today" : " · today counts"}
        </span>
      </span>
    </p>
  );
}

// 100 credited hours: the namesake arrives, once (only the session that crossed
// the line shows this). Slow and calm: a soft halo opens behind it while it floats.
export function NautilusMoment({ delayMs }: { delayMs: number }) {
  const slow = { animationDelay: `${delayMs}ms`, animationDuration: "var(--dur-calm)" };
  return (
    <section
      aria-label="The nautilus has arrived"
      className="rise-in flex w-full flex-col items-center gap-2 overflow-hidden rounded-card bg-card p-4 shadow-card"
      style={slow}
    >
      <div className="relative flex h-24 w-36 items-center justify-center">
        <span aria-hidden className="halo-once" style={{ animationDelay: `${delayMs + 300}ms` }} />
        <div className="tank-bob">
          <NautilusSprite width={72} />
        </div>
      </div>
      <p className="eyebrow">The namesake · {NAUTILUS.hours} hours</p>
      <p className="title-card">The nautilus has joined your tank</p>
      <p className="max-w-xs text-sm text-muted">
        A hundred hours of real focus. It lives in your newest tank from now on.
      </p>
      <Link href="/sea-life" className="-my-1 inline-flex min-h-11 items-center text-sm font-semibold text-primary">
        See it in the Sea life index
      </Link>
    </section>
  );
}
