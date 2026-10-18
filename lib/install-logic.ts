// Pure: should Home offer "Get Nautilus as an app", and which install steps fit
// this browser? No browser APIs here (lib/install.ts reads them), so it's tested
// in lib/install-logic.test.ts.

// The browsers on an iPhone / iPad. They can all add a page to the home screen
// (since iOS 16.4), but none fires an install event, so each gets written steps.
export type IosBrowser = "safari" | "chrome" | "firefox" | "edge" | "other";

// null = not an iPhone / iPad. Newer iPads say "Macintosh" like a Mac; a Mac has
// no touch screen, which tells them apart.
export function iosBrowser(userAgent: string, maxTouchPoints: number): IosBrowser | null {
  const ios = /iPhone|iPad|iPod/.test(userAgent) || (/Macintosh/.test(userAgent) && maxTouchPoints > 1);
  if (!ios) return null;
  if (/CriOS\//.test(userAgent)) return "chrome";
  if (/FxiOS\//.test(userAgent)) return "firefox";
  if (/EdgiOS\//.test(userAgent)) return "edge";
  // Safari says "Version/… Safari/…". Other apps (Google app, DuckDuckGo, Opera,
  // the browsers inside Instagram etc.) add their own token or drop "Safari".
  const otherApp = /GSA\/|OPiOS\/|OPT\/|DuckDuckGo|Ddg\/|YaBrowser|FBAN|FBAV|Instagram|Line\/|Snapchat|TikTok/;
  if (/Version\/[\d.]+.*Safari\//.test(userAgent) && !otherApp.test(userAgent)) return "safari";
  return "other";
}

// Has the user finished at least one session (completed or partial: it kept
// its fish / plant)? null = still loading, which counts as no.
export function hasFinishedSession(rows: readonly { outcome: string }[] | null): boolean {
  return rows !== null && rows.some((r) => r.outcome !== "failed");
}

export type InstallFacts = {
  installed: boolean; // running as the installed app, or installed from here before
  dismissed: boolean; // the card's × was tapped (forever)
  finishedSession: boolean;
  canPrompt: boolean; // Chrome / Edge offered its install dialog (beforeinstallprompt)
  ios: IosBrowser | null;
};

// Never on first launch (a finished session first), never again once dismissed
// or installed, and only where installing works: a real install dialog, or an
// iPhone / iPad (written steps). Anywhere else (Firefox on a laptop, or Chrome
// when the app is already installed, so it offers no dialog) it stays hidden.
export function showInstallCard(f: InstallFacts): boolean {
  if (f.installed || f.dismissed || !f.finishedSession) return false;
  return f.canPrompt || f.ios !== null;
}
