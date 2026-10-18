import { readdirSync } from "node:fs";
import { join } from "node:path";
import type { NextConfig } from "next";

// Painted fish art: any public/fish/<species id>.png replaces that species'
// drawing in the tank (app/_tank/tank4/art-files.ts). The list is read when
// the dev server starts and at build time, so adding a file needs a restart
// (or a deploy), never a code change.
function fishArtFiles() {
  try {
    return readdirSync(join(process.cwd(), "public", "fish"))
      .filter((f) => /^[a-z_]+\.png$/.test(f))
      .map((f) => f.slice(0, -4))
      .join(",");
  } catch {
    return "";
  }
}

// Which deploy this is (lib/build-id.ts): Vercel's deployment id, else the
// commit. BUILD_ID=… overrides it, to test the "New version" toast locally.
const buildId =
  process.env.BUILD_ID || process.env.VERCEL_DEPLOYMENT_ID || process.env.VERCEL_GIT_COMMIT_SHA || "local";

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  env: {
    NEXT_PUBLIC_FISH_ART: fishArtFiles(),
    NEXT_PUBLIC_BUILD_ID: buildId,
  },
  // The service worker must never come from a cache, or updates would stall.
  async headers() {
    return [{ source: "/sw.js", headers: [{ key: "Cache-Control", value: "no-cache, no-store, must-revalidate" }] }];
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
