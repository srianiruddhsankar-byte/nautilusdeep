"use client";

import { setGraphics, useGraphics } from "@/lib/graphics";
import { GRAPHICS, GRAPHICS_LABEL } from "@/lib/graphics-logic";
import { Card } from "../_ui/card";
import { Segmented } from "../_ui/segmented";

// Settings → Graphics: High (the full tank) or Low (15 fps, pixel ratio 1, no
// ambience effects over the water), saved on this device. With nothing chosen
// it's a guess from the device, and says so.
export function GraphicsSetting() {
  const { graphics, guessed } = useGraphics();
  return (
    <Card as="section" aria-labelledby="graphics-title" className="gap-3">
      <h2 id="graphics-title" className="title-card">
        Graphics
      </h2>
      <Segmented
        label="Graphics"
        options={GRAPHICS.map((id) => ({ id, label: GRAPHICS_LABEL[id] }))}
        value={graphics}
        onChange={setGraphics}
      />
      <p className="text-sm text-muted">
        {graphics === "high"
          ? "The full tank. Pick Low if it stutters or your phone gets warm."
          : "A slower, simpler tank that saves battery. Your fish still swim."}
        {guessed && graphics === "low" && " Picked for this device; change it any time."}
      </p>
    </Card>
  );
}
