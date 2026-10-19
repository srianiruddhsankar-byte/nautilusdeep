// Supabase Edge Function "send-push" (Deno). Paste this whole file into the
// Supabase dashboard → Edge Functions → send-push, with "Verify JWT" OFF: it
// checks its own secret instead, because only the 15-second check
// (migration 20261021120100_push_schedule.sql) calls it.
//
// Each call: claim every due "Time's up" alert (claim_due_pushes marks them
// sent in one step, so overlapping calls never double-send), send each one to
// the devices that want it, and delete devices the browser says are gone.
//
// Secrets (Edge Functions → Secrets): VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY (from
// `npx web-push generate-vapid-keys`), VAPID_SUBJECT (mailto:you@example.com),
// CRON_SECRET (any long random string; the same one goes in Vault).
// SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are provided by Supabase.
//
// The Web Push library lives only here; the Next app has no push dependency.

import { createClient } from "jsr:@supabase/supabase-js@2";
import * as webpush from "jsr:@negrel/webpush@0.5.0";

type Due = { endpoint: string; p256dh: string; auth: string; title: string; body: string; session_id: string };

const env = (name: string) => {
  const value = Deno.env.get(name);
  if (!value) throw new Error(`Missing secret ${name}`);
  return value;
};

// base64url → bytes → back, for turning the raw VAPID keys into JWKs.
function fromB64url(s: string): Uint8Array {
  const b64 = s.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat((4 - (s.length % 4)) % 4);
  return Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
}
function toB64url(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

// `web-push generate-vapid-keys` prints raw keys: the public one is the curve
// point (0x04 ‖ x ‖ y), the private one is d. Web Crypto wants them as JWKs.
async function vapidKeys(): Promise<CryptoKeyPair> {
  const point = fromB64url(env("VAPID_PUBLIC_KEY"));
  if (point.length !== 65 || point[0] !== 4) throw new Error("VAPID_PUBLIC_KEY doesn't look right");
  const jwk = { kty: "EC", crv: "P-256", x: toB64url(point.slice(1, 33)), y: toB64url(point.slice(33)) };
  const algorithm = { name: "ECDSA", namedCurve: "P-256" };
  const publicKey = await crypto.subtle.importKey("jwk", jwk, algorithm, true, ["verify"]);
  const privateKey = await crypto.subtle.importKey("jwk", { ...jwk, d: env("VAPID_PRIVATE_KEY") }, algorithm, false, ["sign"]);
  return { publicKey, privateKey };
}

let server: webpush.ApplicationServer | null = null;
async function appServer() {
  server ??= await webpush.ApplicationServer.new({
    contactInformation: env("VAPID_SUBJECT"),
    vapidKeys: await vapidKeys(),
  });
  return server;
}

Deno.serve(async (req) => {
  if (req.headers.get("x-cron-secret") !== env("CRON_SECRET")) {
    return new Response("Forbidden", { status: 403 });
  }

  const db = createClient(env("SUPABASE_URL"), env("SUPABASE_SERVICE_ROLE_KEY"), {
    auth: { persistSession: false },
  });
  const { data, error } = await db.rpc("claim_due_pushes");
  if (error) return new Response(`claim failed: ${error.message}`, { status: 500 });
  const due = (data ?? []) as Due[];

  const pusher = await appServer();
  const gone: string[] = [];
  let sent = 0;

  await Promise.all(
    due.map(async (d) => {
      const subscriber = pusher.subscribe({ endpoint: d.endpoint, keys: { p256dh: d.p256dh, auth: d.auth } });
      // tag: a newer alert for the same session replaces the older one on screen.
      const payload = JSON.stringify({ title: d.title, body: d.body, tag: `session-${d.session_id}`, url: "/" });
      try {
        await subscriber.pushTextMessage(payload, {
          urgency: webpush.Urgency.High, // ask Android to deliver now, even in battery saving
          ttl: 600, // a "time's up" more than 10 minutes late isn't worth showing
          topic: d.session_id.replace(/-/g, ""), // replaces an undelivered older one for this session
        });
        sent++;
      } catch (e) {
        if (e instanceof webpush.PushMessageError && e.isGone()) gone.push(d.endpoint);
        else console.error("push failed", d.endpoint.slice(0, 60), String(e));
      }
    }),
  );

  // The browser says these devices unsubscribed (or the app was uninstalled).
  if (gone.length) await db.from("push_subscriptions").delete().in("endpoint", gone);

  return Response.json({ due: due.length, sent, gone: gone.length });
});
