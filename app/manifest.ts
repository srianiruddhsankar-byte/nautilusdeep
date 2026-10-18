import type { MetadataRoute } from "next";
import { THEME_COLOR } from "@/lib/theme-script";
import { ICONS } from "./_pwa/art";

// The web app manifest (/manifest.webmanifest): what the phone needs to install
// Deep Nautilus as an app. A manifest has only ONE theme colour, so it uses the
// light paper; the <meta name="theme-color"> tags in app/layout.tsx switch the
// bar to dark paper once the app is open in dark mode.
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "Deep Nautilus",
    short_name: "Nautilus",
    description: "A calm, ocean-themed focus and study app.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: THEME_COLOR.light,
    theme_color: THEME_COLOR.light,
    categories: ["education", "productivity"],
    icons: ICONS.filter((i) => i.kind !== "apple").map((i) => ({
      src: `/icons/${i.file}`,
      sizes: `${i.size}x${i.size}`,
      type: "image/png",
      purpose: i.kind,
    })),
  };
}
