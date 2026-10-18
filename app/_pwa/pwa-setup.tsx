"use client";

import { useEffect } from "react";
import { BUILD_ID } from "@/lib/build-id";
import { getSnapshot, subscribe } from "@/lib/focus-storage";
import "@/lib/install"; // starts listening for Chrome's install event on every page
import { isToastShowing, toast } from "../_ui/toast";

// Rendered once, in the root layout. Two jobs:
// 1. Register the service worker (public/sw.js), which keeps the build files on
//    the phone so the app opens fast. Production only: in development it would
//    serve stale code, so any old one is removed instead.
// 2. Notice a new deploy while the app is open (an installed app can stay open
//    for days) and offer "Refresh". Never while a session is running: it waits
//    until the session has ended.

const CHECK_EVERY_MS = 30 * 60_000;

export function PwaSetup() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    if (process.env.NODE_ENV !== "production") {
      navigator.serviceWorker.getRegistrations().then((all) => all.forEach((r) => r.unregister()));
      return;
    }
    // A new build id = a new script URL, which installs the new worker.
    // updateViaCache "none": the browser never uses a cached sw.js.
    navigator.serviceWorker
      .register(`/sw.js?v=${encodeURIComponent(BUILD_ID)}`, { scope: "/", updateViaCache: "none" })
      .catch(() => {}); // no service worker = the app still works, just loads a bit slower
  }, []);

  useEffect(() => {
    let newer = false;
    let shownId: number | null = null;

    const offer = () => {
      if (!newer || getSnapshot().session) return; // a running session is never interrupted
      if (shownId !== null && isToastShowing(shownId)) return;
      shownId = toast("New version available", {
        sticky: true,
        action: { label: "Refresh", onClick: () => window.location.reload() },
      });
    };

    const check = async () => {
      if (document.visibilityState !== "visible") return;
      if (!newer) {
        try {
          const res = await fetch("/version", { cache: "no-store" });
          const deployed = res.ok ? (await res.text()).trim() : "";
          newer = deployed !== "" && deployed !== BUILD_ID;
        } catch {
          return; // offline: ask again later
        }
      }
      offer();
    };

    check();
    const interval = setInterval(check, CHECK_EVERY_MS);
    document.addEventListener("visibilitychange", check);
    const unsubscribe = subscribe(offer); // a session ending can show it
    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", check);
      unsubscribe();
    };
  }, []);

  return null;
}
