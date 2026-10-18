// Which deploy this code belongs to. next.config.ts sets it at build time (the
// same value in the browser and on the server). The open app compares its own
// with /version (app/version/route.ts): different = a new version is out.
export const BUILD_ID = process.env.NEXT_PUBLIC_BUILD_ID || "local";
