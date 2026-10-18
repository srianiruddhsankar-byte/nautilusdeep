// The session's egg and fry for Tank 4, drawn after real ones (the same
// drawings as brood.tsx, which stays for the still-picture fallback). Stages
// and timing: lib/brood.ts.
// - Egg: ONE big translucent egg on a small rock, with an amber yolk.
// - Eyed: two dark eye spots and the faint curl of the embryo inside.
// - Hatched: the shell split open, its cap tipped aside (the fry is out).
// - Fry: tiny and see-through, a big dark eye, an amber yolk sac. A rope like
//   the fish: head at x = 0, tail root at x = −FRY_BODY, spine on y = 0.

import type { Box } from "./side-view";

export const EGG_BOX: Box = { x: 0, y: 0, w: 44, h: 40 };

const SHELL = `fill="rgba(255,251,235,0.55)" stroke="#ffffff" stroke-width="1.4"`;
const ROCK = `<ellipse cx="22" cy="35" rx="19" ry="5" fill="#a8b5b3"/><ellipse cx="17" cy="33" rx="8" ry="1.8" fill="#c1ccca"/>`;

export function eggSvg(stage: "eggs" | "eyed" | "hatched") {
  if (stage === "hatched") {
    return `${ROCK}<path d="M11 22 Q11 33 22 33 Q33 33 33 22 L30 24 L27 21 L24 24 L21 21 L18 24 L15 21 Z" ${SHELL}/>
<path d="M33 16 Q38 8 44 12 L41 14 L40 11 L37 15 Z" ${SHELL} transform="rotate(25 38 13)"/>`;
  }
  const eyed =
    stage === "eyed"
      ? `<path d="M16 25 Q14 16 22 14 Q29 13 30 20" stroke="rgba(120,90,60,0.35)" stroke-width="2.2" fill="none" stroke-linecap="round"/>
<circle cx="18.5" cy="17" r="1.7" fill="#111827"/><circle cx="21.8" cy="15.4" r="1.7" fill="#111827"/>`
      : "";
  return `${ROCK}<circle cx="22" cy="21" r="11.5" ${SHELL}/><circle cx="24" cy="24" r="5" fill="rgba(240,176,70,0.75)"/>${eyed}
<ellipse cx="17.5" cy="14.5" rx="2.6" ry="1.6" fill="white" opacity="0.85" transform="rotate(-30 17.5 14.5)"/>`;
}

// The fry, facing right, shifted so its head is at x = 0 and its spine on y = 0.
export const FRY_BODY = 17; // head → tail root, drawing units (= world units)
export const FRY = {
  x0: -21, // tail-fin tip
  x1: 3, // snout
  box: { x: -21, y: -4, w: 24, h: 8 } as Box,
  svg: `<g transform="translate(-20.5 -6)">
<path d="M4 6 L0.5 3.2 L1.2 6 L0.5 8.8 Z" fill="rgba(255,255,255,0.5)"/>
<path d="M3.5 6 Q8 2.6 16 3.8 Q21 4.8 23.5 6 Q21 7.2 16 8.2 Q8 9.4 3.5 6 Z" fill="rgba(255,255,255,0.38)" stroke="rgba(255,255,255,0.9)" stroke-width="0.5"/>
<path d="M5 6 H19" stroke="rgba(255,255,255,0.5)" stroke-width="0.4"/>
<ellipse cx="15" cy="7.6" rx="3" ry="1.8" fill="rgba(246,186,86,0.85)"/>
<circle cx="20.5" cy="5.5" r="1.35" fill="#111827"/><circle cx="20.9" cy="5.1" r="0.4" fill="white"/></g>`,
};
