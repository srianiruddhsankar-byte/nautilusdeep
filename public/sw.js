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
//
// It also shows the "Time's up" push notifications (sent by the Supabase Edge
// Function supabase/functions/send-push), and opens Home when one is tapped.

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

// ---------- Push notifications ----------

// A push: { title, body, tag, url }. If Home is on screen, its own alarm is
// already ringing, so no notification. (The app also takes alerts off the
// server while Home is visible; this covers the moments in between.)
self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { body: event.data ? event.data.text() : "" };
  }
  event.waitUntil(
    (async () => {
      const windows = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      const homeOnScreen = windows.some((w) => w.visibilityState === "visible" && new URL(w.url).pathname === "/");
      if (homeOnScreen) return;
      const tag = data.tag || "deep-nautilus";
      // An older alert for this session is closed first: Android treats an
      // update to a notification already in the shade as quiet (it buzzes but
      // doesn't pop on screen), while a new one can pop.
      for (const old of await self.registration.getNotifications({ tag })) old.close();
      await self.registration.showNotification(data.title || "Deep Nautilus", {
        body: data.body || "",
        tag,
        renotify: true, // buzzes even if one with this tag is still showing
        icon: "/icons/icon-192.png", // the large picture, in colour
        badge: "/icons/badge-96.png", // the status bar: Android uses only its shape (white on transparent)
        data: { url: data.url || "/" },
      });
    })(),
  );
});

// Tapping it opens Home: an open window is brought forward, else a new one.
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = new URL(event.notification.data?.url || "/", self.location.origin).href;
  event.waitUntil(
    (async () => {
      const windows = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      const open = windows.find((w) => new URL(w.url).origin === self.location.origin);
      if (open) {
        if (new URL(open.url).pathname !== "/" && "navigate" in open) await open.navigate(url).catch(() => {});
        return open.focus();
      }
      return self.clients.openWindow(url);
    })(),
  );
});

// Deletes the oldest entries (a cache lists them in the order they were added).
async function trim(name, max) {
  const cache = await caches.open(name);
  const keys = await cache.keys();
  for (const key of keys.slice(0, Math.max(0, keys.length - max))) await cache.delete(key);
}
