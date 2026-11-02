// The app's version as people see it. package.json holds "0.14.0";
// next.config.ts passes it in as NEXT_PUBLIC_APP_VERSION at build time. A
// release is written "v0.14" (as in CHANGELOG.md), a small fix after it "v0.14.1".

export function displayVersion(semver: string | undefined): string | null {
  const match = /^(\d+)\.(\d+)\.(\d+)$/.exec(semver?.trim() ?? "");
  if (!match) return null;
  const [, major, minor, patch] = match;
  return patch === "0" ? `v${major}.${minor}` : `v${major}.${minor}.${patch}`;
}
