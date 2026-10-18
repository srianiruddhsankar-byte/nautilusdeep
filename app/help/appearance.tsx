"use client";

import { THEME_LABEL, THEMES, setTheme, useTheme } from "@/lib/theme";
import { changeScreen } from "../_ui/motion";
import { Segmented } from "../_ui/segmented";

// Help → Account: System / Light / Dark, saved on this device. Switching
// cross-fades the colours (instant with reduced motion).
export function AppearanceSetting() {
  const theme = useTheme();
  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm font-semibold">Appearance</p>
      <Segmented
        label="Appearance"
        value={theme}
        onChange={(next) => changeScreen(() => setTheme(next))}
        options={THEMES.map((t) => ({ id: t, label: THEME_LABEL[t] }))}
      />
      <p className="text-sm text-muted">
        {theme === "system" ? "Follows your device's light or dark setting." : "Saved on this device."}
      </p>
    </div>
  );
}
