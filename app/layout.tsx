import type { Metadata, Viewport } from "next";
import { DM_Sans, Fraunces } from "next/font/google";
import { THEME_COLOR, THEME_SCRIPT } from "@/lib/theme-script";
import { SPLASHES } from "./_pwa/art";
import { PwaSetup } from "./_pwa/pwa-setup";
import { Toaster } from "./_ui/toast";
import "./globals.css";

// Paper Tide's two fonts, self-hosted by next/font. Fraunces for headings and the
// big numbers, DM Sans for everything else (see globals.css).
const fraunces = Fraunces({ subsets: ["latin"], variable: "--font-fraunces" });
const dmSans = DM_Sans({ subsets: ["latin"], variable: "--font-dm-sans" });

export const metadata: Metadata = {
  title: "Deep Nautilus",
  description: "An ocean-themed focus app.",
  // The installed app (app/manifest.ts is linked automatically). iPhone reads
  // these tags instead: its name under the icon, the status bar and splash screens.
  applicationName: "Deep Nautilus",
  icons: {
    icon: [{ url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" }],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180" }],
  },
  appleWebApp: {
    capable: true,
    title: "Nautilus",
    statusBarStyle: "default", // the bar takes the theme colour, with dark or light text to match
    startupImage: SPLASHES.map(({ file, media }) => ({ url: `/icons/${file}`, media })),
  },
};

export const viewport: Viewport = {
  // Draw edge to edge, so the notch and home bar areas can be padded on
  // purpose (env(safe-area-inset-*) in globals.css and the fixed screens).
  viewportFit: "cover",
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
        <PwaSetup />
      </body>
    </html>
  );
}
