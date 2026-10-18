// Deep Nautilus service worker: makes the app open fast by keeping its build
// files on the phone. Registered by app/_pwa/pwa-setup.tsx as /sw.js?v=<build>,
// so every deploy installs a fresh copy.
//
// What it caches, and what it never touches:
// - /_next/static/... (JS, CSS, fonts): cache first. Their names contain a hash
//   of their contents, so a cached copy is never out of date.
// - /icons/... and /fish/... (pictures): served from the cache, refreshed in
//   the background.
// - Everything else goes straight to the network, untouched: the pages (they
//   are made per signed-in user, and always fresh pages mean the app can never
//   get stuck on an old version), /auth, /version, and every other site,
//   including Supabase (data + sign-in) and Google. The offline save queue
//   (lib/save-queue.ts) keeps working exactly as before.

const STATIC = "dn-static-v1";
const PICTURES = "dn-pictures-v1";
const KEEP = [STATIC, PICTURES];
const MAX_STATIC = 400; // old builds' files pile up; keep the newest this many

self.addEventListener("install", () => {
  // Nothing to prepare, so the new version takes over straight away.
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      for (const name of await caches.keys()) {
        if (!KEEP.includes(name)) await caches.delete(name);
      }
      await trim(STATIC, MAX_STATIC);
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET" || request.headers.has("range")) return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return; // Supabase, Google, …: the network

  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(cacheFirst(request));
  } else if (url.pathname.startsWith("/icons/") || url.pathname.startsWith("/fish/")) {
    event.respondWith(refreshInBackground(event, request));
  }
  // Anything else: not handled here, so the browser fetches it as normal.
});

async function cacheFirst(request) {
  const cache = await caches.open(STATIC);
  const hit = await cache.match(request);
  if (hit) return hit;
  const response = await fetch(request);
  if (response.ok && response.type === "basic") await cache.put(request, response.clone());
  return response;
}

async function refreshInBackground(event, request) {
  const cache = await caches.open(PICTURES);
  const hit = await cache.match(request);
  const fresh = fetch(request).then(async (response) => {
    if (response.ok && response.type === "basic") await cache.put(request, response.clone());
    return response;
  });
  if (hit) {
    event.waitUntil(fresh.catch(() => {}));
    return hit;
  }
  return fresh;
}

// Deletes the oldest entries (a cache lists them in the order they were added).
async function trim(name, max) {
  const cache = await caches.open(name);
  const keys = await cache.keys();
  for (const key of keys.slice(0, Math.max(0, keys.length - max))) await cache.delete(key);
}
