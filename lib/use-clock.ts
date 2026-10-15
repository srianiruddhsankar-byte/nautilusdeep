import { useEffect, useState } from "react";

export type Clock = { now: number; timeZone: string };

// The current time and the browser's time zone, for date-based stats.
// Read in an effect (never during render) and refreshed every minute and when
// the tab is shown again, so "today" rolls over at midnight. null until mounted.
export function useClock(intervalMs = 60_000): Clock | null {
  const [clock, setClock] = useState<Clock | null>(null);

  useEffect(() => {
    const update = () =>
      setClock({ now: Date.now(), timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone });
    const onVisible = () => {
      if (document.visibilityState === "visible") update();
    };
    const frame = requestAnimationFrame(update);
    const interval = setInterval(update, intervalMs);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      cancelAnimationFrame(frame);
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [intervalMs]);

  return clock;
}
