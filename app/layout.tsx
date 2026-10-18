import type { Metadata, Viewport } from "next";
import { DM_Sans, Fraunces } from "next/font/google";
import { THEME_COLOR, THEME_SCRIPT } from "@/lib/theme-script";
import { Toaster } from "./_ui/toast";
import "./globals.css";

// Paper Tide's two fonts, self-hosted by next/font. Fraunces for headings and the
// big numbers, DM Sans for everything else (see globals.css).
const fraunces = Fraunces({ subsets: ["latin"], variable: "--font-fraunces" });
const dmSans = DM_Sans({ subsets: ["latin"], variable: "--font-dm-sans" });

export const metadata: Metadata = {
  title: "Deep Nautilus",
  description: "An ocean-themed focus app.",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: THEME_COLOR.light },
    { media: "(prefers-color-scheme: dark)", color: THEME_COLOR.dark },
  ],
};

// suppressHydrationWarning on <html>: THEME_SCRIPT adds data-theme before React
// starts, so the server's <html> and the browser's differ on purpose.
export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" suppressHydrationWarning className={`${fraunces.variable} ${dmSans.variable} h-full antialiased`}>
      <head>
        {/* The saved Appearance (lib/theme.ts), applied before the first paint: no flash. */}
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body className="flex min-h-full flex-col">
        {children}
        <Toaster />
      </body>
    </html>
  );
}
