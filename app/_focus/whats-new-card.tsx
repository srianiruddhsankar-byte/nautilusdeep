"use client";

import { useEffect } from "react";
import { showWhatsNew } from "@/lib/whats-new";
import { WHATS_NEW, markWhatsNewSeen, useSeenWhatsNew } from "@/lib/whats-new-seen";
import { Button } from "../_ui/button";
import { Card } from "../_ui/card";

// Home's "What's new": the newest CHANGELOG.md entry, once per entry on this
// device. A brand-new user never sees it (nothing is new to them): the entry
// is quietly marked as seen, so only later updates show.
export function WhatsNewCard({ finishedSession, loaded }: { finishedSession: boolean; loaded: boolean }) {
  const seen = useSeenWhatsNew();
  const entry = WHATS_NEW;

  useEffect(() => {
    if (entry && loaded && !finishedSession && seen !== entry.id) markWhatsNewSeen(entry.id);
  }, [entry, loaded, finishedSession, seen]);

  if (!loaded || !showWhatsNew(entry, seen, finishedSession)) return null;
  return (
    <Card as="section" aria-labelledby="whats-new-title" className="rise-in gap-3">
      <div className="flex flex-col gap-0.5">
        <p className="eyebrow">What&apos;s new</p>
        <h2 id="whats-new-title" className="title-card">
          {entry!.name}
        </h2>
      </div>
      <ul className="flex list-disc flex-col gap-1.5 pl-5 text-sm leading-relaxed marker:text-muted">
        {entry!.bullets.map((b) => (
          <li key={b}>{b}</li>
        ))}
      </ul>
      <Button variant="quiet" size="sm" onClick={() => markWhatsNewSeen(entry!.id)} className="-ml-2 self-start text-primary">
        Got it
      </Button>
    </Card>
  );
}
