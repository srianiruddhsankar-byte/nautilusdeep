import { BUILD_ID } from "@/lib/build-id";

// /version: the deployed build's id, as plain text. Built once per deploy
// (nothing here reads the request), so it's a static file on the CDN.
// app/_pwa/pwa-setup.tsx asks for it to notice a new version.
export function GET() {
  return new Response(BUILD_ID, { headers: { "Content-Type": "text/plain" } });
}
