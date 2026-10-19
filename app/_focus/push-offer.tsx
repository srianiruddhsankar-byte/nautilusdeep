"use client";

import { useState } from "react";
import { dismissPushOffer, usePush } from "@/lib/push";
import { showPushOffer } from "@/lib/push-schedule";
import { PushSheet } from "../_pwa/push-sheet";
import { Button } from "../_ui/button";

// The running screen's quiet offer: "Get a notification when time's up?"
// Never before a first Start (it only lives on the running screen), not in the
// 10-second cancel window, and never again after Not now. Turn on opens the
// short note first; the browser's own prompt comes after it.
export function PushOffer({ cancelWindow }: { cancelWindow: boolean }) {
  const push = usePush();
  const [open, setOpen] = useState(false);
  const show = showPushOffer({ support: push.support, on: push.timesUp, notNow: push.notNow, cancelWindow });

  return (
    <>
      {show && !open && (
        <div className="swap-in flex w-full flex-col gap-2 rounded-card bg-card px-4 py-3 text-left shadow-card">
          <p className="text-sm">Get a notification when time&apos;s up?</p>
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" onClick={() => setOpen(true)}>
              Turn on
            </Button>
            <Button variant="quiet" size="sm" onClick={dismissPushOffer}>
              Not now
            </Button>
          </div>
        </div>
      )}
      <PushSheet open={open} onClose={() => setOpen(false)} support={push.support} />
    </>
  );
}
