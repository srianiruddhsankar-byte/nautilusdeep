"use client";

import { useSyncExternalStore } from "react";
import { ringOnce } from "@/lib/alarm";
import { ALARM_LABEL, ALARM_STYLES, type AlarmStyle } from "@/lib/alarm-text";
import { loadPrefs, subscribePrefs, updatePrefs } from "@/lib/prefs-store";
import { Card } from "../_ui/card";
import { Segmented } from "../_ui/segmented";

// Settings → Alarm: how "time's up" sounds in every session. Saved with the
// setup prefs on this device (lib/alarm.ts reads it when an alarm starts).
// Tapping a style plays a sample, so you know what you picked.
export function AlarmSetting() {
  const alarm = useSyncExternalStore(subscribePrefs, () => loadPrefs().alarm, () => "gentle" as AlarmStyle);
  return (
    <Card as="section" id="alarm" aria-labelledby="alarm-title" className="scroll-mt-6 gap-3">
      <h2 id="alarm-title" className="title-card">
        Alarm
      </h2>
      <p className="text-sm text-muted">When a block or break ends. Tap a style to hear it.</p>
      <Segmented
        label="Alarm sound"
        options={ALARM_STYLES.map((id) => ({ id, label: ALARM_LABEL[id] }))}
        value={alarm}
        onChange={(next) => {
          updatePrefs({ alarm: next });
          ringOnce(next);
        }}
      />
      <p className="text-sm text-muted">
        {alarm === "gentle"
          ? "One soft chime, quiet enough for a library."
          : alarm === "chime"
            ? "Three bright chimes, for when you might not hear it."
            : "Vibration and a pulsing screen. iPhones can't vibrate from a web app."}
      </p>
    </Card>
  );
}
