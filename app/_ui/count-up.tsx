"use client";

import { useEffect, useRef, useState } from "react";
import { prefersReducedMotion } from "./motion";

// A number that counts to its value (coins earned, the balance after buying).
// It starts at `from` (default: the value itself, so nothing moves on first
// show), and counts from whatever it shows to each new value. Only the text
// changes, straight in the DOM, so React doesn't re-render every frame.
// Screen readers get the final number at once; reduced motion shows it at once.
export function CountUp({
  value,
  from,
  delay = 0,
  duration = 900,
  className,
}: {
  value: number;
  from?: number;
  delay?: number; // ms before it starts counting
  duration?: number; // ms
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  // What React first renders; after that the effect owns the text.
  const [initial] = useState(from ?? value);
  const shown = useRef(initial);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const start = shown.current;
    const set = (n: number) => {
      shown.current = n;
      el.textContent = String(n);
    };
    if (start === value || prefersReducedMotion()) return set(value);

    let raf = 0;
    let began = 0;
    const tick = (t: number) => {
      began ||= t;
      const k = Math.min(1, (t - began) / duration);
      set(Math.round(start + (value - start) * (1 - Math.pow(1 - k, 3)))); // ease-out: slows into the number
      if (k < 1) raf = requestAnimationFrame(tick);
    };
    const timer = setTimeout(() => (raf = requestAnimationFrame(tick)), delay);
    return () => {
      clearTimeout(timer);
      cancelAnimationFrame(raf); // a new value carries on from the number shown now
    };
  }, [value, delay, duration]);

  return (
    <span className={`tabular-nums ${className ?? ""}`}>
      <span ref={ref} aria-hidden>
        {initial}
      </span>
      <span className="sr-only">{value}</span>
    </span>
  );
}
