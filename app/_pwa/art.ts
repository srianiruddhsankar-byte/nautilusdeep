import { THEME_COLOR } from "@/lib/theme-script";

// The installed app's pictures: home screen icons and iPhone splash screens.
// They are drawn here as SVG and turned into PNGs by app/icons/[file]/route.tsx
// at build time, so there are no image files to keep in sync. The nautilus is
// the tank's own (NautilusSprite in app/_tank/fish-sprite.tsx), on deep water.

// "any": full-bleed square (Android may round it). "maskable": the shell
// smaller, inside the safe circle Android crops to (80 % of the width).
// "apple": iOS rounds the corners itself and wants no transparency.
export type IconKind = "any" | "maskable" | "apple";

// How big the nautilus is drawn (sprite units → px in a 512 px square).
const SCALE: Record<IconKind, number> = { any: 7, maskable: 5.2, apple: 6.6 };

export function iconSvg(kind: IconKind) {
  const s = SCALE[kind];
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
<defs>
<linearGradient id="sea" x1="0" y1="0" x2="0" y2="1">
<stop offset="0" stop-color="#2f5f8f"/><stop offset="1" stop-color="#142c45"/>
</linearGradient>
<radialGradient id="glow" cx="0.5" cy="0.38" r="0.55">
<stop offset="0" stop-color="#9cc0e6" stop-opacity="0.35"/><stop offset="1" stop-color="#9cc0e6" stop-opacity="0"/>
</radialGradient>
</defs>
<rect width="512" height="512" fill="url(#sea)"/>
<rect width="512" height="512" fill="url(#glow)"/>
<g transform="translate(256 262) scale(${s}) translate(-24 -20)">
<g stroke="#e9c9a6" stroke-width="1.6" stroke-linecap="round" fill="none">
<path d="M34 22 Q41 22 46 25"/><path d="M34 24 Q40 27 44 31"/><path d="M33 26 Q37 31 40 35"/><path d="M34 20 Q41 18 45 19"/>
</g>
<path d="M30 12 Q40 13 39 21 Q38 27 32 28 Z" fill="#b98b5e"/>
<circle cx="19" cy="20" r="17" fill="#f5ebe0"/>
<g stroke="#b45309" stroke-width="2.4" stroke-linecap="round" fill="none">
<path d="M8 8 Q12 14 10 20"/><path d="M15 4 Q18 11 16 18"/><path d="M23 4 Q24 10 21 16"/><path d="M4 16 Q9 20 8 26"/>
</g>
<path d="M19 20 m-6 0 a6 6 0 1 0 12 0 a9 9 0 1 0 -18 0" stroke="#d6b896" stroke-width="1" fill="none"/>
<circle cx="34" cy="17" r="1.5" fill="#1f2937"/>
</g>
</svg>`;
}

// Every home screen icon: the file name (served at /icons/<file>), its kind and size.
export const ICONS = [
  { file: "icon-192.png", kind: "any", size: 192 },
  { file: "icon-512.png", kind: "any", size: 512 },
  { file: "maskable-192.png", kind: "maskable", size: 192 },
  { file: "maskable-512.png", kind: "maskable", size: 512 },
  { file: "apple-touch-icon.png", kind: "apple", size: 180 },
] as const satisfies readonly { file: string; kind: IconKind; size: number }[];

// iPhone splash screens (shown while the installed app opens). iOS only uses
// one whose size matches the screen exactly, so each iPhone shape is listed:
// width × height in points, and the pixel ratio. Missing a model just means a
// plain paper screen on it. Portrait only; light and dark each.
const IPHONES = [
  [440, 956, 3], // 16 Pro Max, 17 Pro Max
  [402, 874, 3], // 16 Pro, 17, 17 Pro
  [420, 912, 3], // Air
  [430, 932, 3], // 14 Pro Max, 15 Plus / Pro Max, 16 Plus
  [393, 852, 3], // 14 Pro, 15, 15 Pro, 16, 16e
  [428, 926, 3], // 12 / 13 Pro Max, 14 Plus
  [390, 844, 3], // 12, 13, 14, 12 / 13 Pro
  [360, 780, 3], // 12 / 13 mini
  [375, 812, 3], // X, XS, 11 Pro
  [414, 896, 3], // XS Max, 11 Pro Max
  [414, 896, 2], // XR, 11
  [414, 736, 3], // 8 Plus
  [375, 667, 2], // SE 2nd / 3rd gen, 8
] as const;

export type Mode = keyof typeof THEME_COLOR;

export const SPLASHES = IPHONES.flatMap(([w, h, ratio]) =>
  (["light", "dark"] as const).map((mode) => ({
    file: `splash-${w * ratio}x${h * ratio}-${mode}.png`,
    width: w * ratio,
    height: h * ratio,
    mode,
    media:
      `(device-width: ${w}px) and (device-height: ${h}px) and (-webkit-device-pixel-ratio: ${ratio})` +
      ` and (orientation: portrait) and (prefers-color-scheme: ${mode})`,
  })),
);
