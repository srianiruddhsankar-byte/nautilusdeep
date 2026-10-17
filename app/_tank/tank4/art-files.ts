// Painted art that replaces a drawing, just by adding a file:
//   public/fish/<species id>.png   (e.g. public/fish/clownfish.png)
// next.config.ts lists that folder when the dev server starts and at build
// time, so restart `npm run dev` (or deploy) after adding one.
//
// How to paint one so it bends well:
// - Side view, facing RIGHT, on a transparent background, upright.
// - The image spans the whole fish: tail-fin tip at the left edge, snout at
//   the right edge, the spine along the image's horizontal middle.
// - The body (snout to where the tail fin starts) takes the right 77 % of the
//   width; the tail fin is the left 23 %. Any height. About 600 px wide or
//   more stays sharp.
// - Include every fin you want to see (no separate flapping fin is added).
// Seahorse and manta ray use the PNG as one rigid piece (until their rigs).

import type { SpeciesId } from "@/lib/species";

const FILES = new Set((process.env.NEXT_PUBLIC_FISH_ART ?? "").split(",").filter(Boolean));

export const hasPainting = (id: SpeciesId) => FILES.has(id);
export const paintingUrl = (id: SpeciesId) => `/fish/${id}.png`;

// The share of a painting's width that is body (the rest is tail fin).
export const PAINTED_BODY = 0.77;
