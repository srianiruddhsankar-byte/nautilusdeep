import { useEffect } from "react";

// Keeps the screen awake while `active` is true (during focus phases).
// The browser drops the lock whenever the page is hidden, so we re-request it
// each time the page becomes visible again. Browsers without the Screen Wake
// Lock API just skip it.
export function useWakeLock(active: boolean) {
  useEffect(() => {
    if (!active || !("wakeLock" in navigator)) return;

    let lock: WakeLockSentinel | null = null;
    let requesting = false;
    let stopped = false;

    async function acquire() {
      if (stopped || lock || requesting || document.visibilityState !== "visible") return;
      requesting = true;
      try {
        const sentinel = await navigator.wakeLock.request("screen");
        if (stopped) {
          void sentinel.release();
        } else {
          lock = sentinel;
          sentinel.addEventListener("release", () => {
            if (lock === sentinel) lock = null;
          });
        }
      } catch {
        // Denied (e.g. battery saver). The timer still works, the screen may just dim.
      } finally {
        requesting = false;
      }
    }

    void acquire();
    document.addEventListener("visibilitychange", acquire);
    return () => {
      stopped = true;
      document.removeEventListener("visibilitychange", acquire);
      lock?.release().catch(() => {});
      lock = null;
    };
  }, [active]);
}
