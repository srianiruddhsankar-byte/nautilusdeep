"use client";

import { THEME_LABEL, THEMES, setTheme, useTheme } from "@/lib/theme";
import { Card } from "../_ui/card";
import { changeScreen } from "../_ui/motion";
import { Segmented } from "../_ui/segmented";

// Settings → Appearance: System / Light / Dark, saved on this device. Switching
// cross-fades the colours (instant with reduced motion).
export function AppearanceSetting() {
  const theme = useTheme();
  return (
    <Card as="section" aria-labelledby="appearance-title" className="gap-3">
      <h2 id="appearance-title" className="title-card">
        Appearance
      </h2>
      <Segmented
        label="Appearance"
        value={theme}
        onChange={(next) => changeScreen(() => setTheme(next))}
        options={THEMES.map((t) => ({ id: t, label: THEME_LABEL[t] }))}
      />
      <p className="text-sm text-muted">
        {theme === "system" ? "Follows your device's light or dark setting." : "Saved on this device."}
      </p>
    </Card>
  );
}
