import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { DM_Sans, Fraunces } from "next/font/google";
import { DesignPreview } from "./preview";

// Phase 9 Stage A, round 2: Paper Tide's UI with three candidate tanks.
// Development only (404 in production) and not linked from the nav.

const fraunces = Fraunces({ subsets: ["latin"], variable: "--pv-fraunces" });
const dmSans = DM_Sans({ subsets: ["latin"], variable: "--pv-dmsans" });

export const metadata: Metadata = {
  title: "Design preview – Deep Nautilus",
  robots: { index: false },
};

export default function DesignPreviewPage() {
  if (process.env.NODE_ENV === "production") notFound();
  return <DesignPreview fontClasses={`${fraunces.variable} ${dmSans.variable}`} />;
}
