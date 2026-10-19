import { useSyncExternalStore } from "react";
import { isStandalone } from "./install";
import { iosBrowser } from "./install-logic";
import { createLocalStore } from "./local-store";
import { pushSupport, type PushSupport } from "./push-schedule";
import { createClient } from "./supabase/client";

// This device's push notifications: asking permission, subscribing, and the
// per-device "Time's up" switch (Help → Account → Notifications).
//
// The switch lives in this browser (so it shows instantly) and is mirrored to
// public.push_subscriptions, which the server reads when sending. Saving goes
// through save_push_subscription, which files the device under whoever is
// signed in now. Signing out removes the device (forgetThisDevice).
//
// Only in production: the service worker that receives pushes (public/sw.js)
// isn't registered in development.

type Device = { timesUp: boolean; notNow: boolean };
const EMPTY: Device = { timesUp: false, notNow: false };
const device = createLocalStore<Device>(
  "deep-nautilus:push:v1",
  EMPTY,
  (d) => typeof d === "object" && d !== null && "timesUp" in d && "notNow" in d,
);

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((listener) => listener());

function permission(): NotificationPermission | null {
  return typeof Notification === "undefined" ? null : Notification.permission;
}

function support(): PushSupport {
  const hasPush =
    process.env.NODE_ENV === "production" &&
    VAPID_PUBLIC_KEY !== "" &&
    "serviceWorker" in navigator &&
    "PushManager" in window;
  return pushSupport({
    hasPush,
    ios: iosBrowser(navigator.userAgent, navigator.maxTouchPoints) !== null,
    standalone: isStandalone(),
    permission: permission(),
  });
}

// "Time's up" is on for this device: switched on here, and still allowed.
export function timesUpIsOn(): boolean {
  return device.get().timesUp && permission() === "granted";
}

export type PushState = { support: PushSupport; timesUp: boolean; notNow: boolean };
const SERVER_STATE: PushState = { support: "unsupported", timesUp: false, notNow: true };

let cached: PushState = SERVER_STATE;
function getSnapshot(): PushState {
  const next: PushState = { support: support(), timesUp: timesUpIsOn(), notNow: device.get().notNow };
  if (next.support !== cached.support || next.timesUp !== cached.timesUp || next.notNow !== cached.notNow) cached = next;
  return cached;
}

export function subscribePush(listener: () => void) {
  listeners.add(listener);
  const stop = device.subscribe(listener);
  // Permission can change in the browser's settings while the app is away.
  document.addEventListener("visibilitychange", listener);
  return () => {
    listeners.delete(listener);
    stop();
    document.removeEventListener("visibilitychange", listener);
  };
}

export function usePush(): PushState {
  return useSyncExternalStore(subscribePush, getSnapshot, () => SERVER_STATE);
}

// The running screen's offer: "Not now" hides it for good on this device.
export function dismissPushOffer() {
  device.set({ ...device.get(), notNow: true });
}

// ---------- Subscribing ----------

function keyBytes(base64url: string): Uint8Array<ArrayBuffer> {
  const b64 = base64url.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat((4 - (base64url.length % 4)) % 4);
  return Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
}

function sameKey(a: ArrayBuffer | null, b: Uint8Array): boolean {
  if (!a || a.byteLength !== b.length) return false;
  const bytes = new Uint8Array(a);
  return bytes.every((x, i) => x === b[i]);
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([promise, new Promise<T>((_, reject) => setTimeout(() => reject(new Error("timeout")), ms))]);
}

// This browser's push subscription for our key (made if needed).
async function subscription(): Promise<PushSubscription> {
  const registration = await withTimeout(navigator.serviceWorker.ready, 10_000);
  const key = keyBytes(VAPID_PUBLIC_KEY);
  const existing = await registration.pushManager.getSubscription();
  if (existing && sameKey(existing.options.applicationServerKey, key)) return existing;
  await existing?.unsubscribe(); // made with an old key: start over
  return registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: key });
}

async function save(sub: PushSubscription, timesUp: boolean): Promise<string | null> {
  const json = sub.toJSON();
  const { error } = await createClient().rpc("save_push_subscription", {
    p_endpoint: sub.endpoint,
    p_p256dh: json.keys?.p256dh ?? "",
    p_auth: json.keys?.auth ?? "",
    p_times_up: timesUp,
  });
  return error ? "Couldn't save this device. Check your connection and try again." : null;
}

// Turning "Time's up" on. Call it straight from a tap (iPhones only show the
// permission prompt then). Returns an error message, or null if it worked.
export async function turnOnTimesUp(): Promise<string | null> {
  try {
    const answer = permission() === "granted" ? "granted" : await Notification.requestPermission();
    emit();
    if (answer === "denied") return "Notifications are blocked for Deep Nautilus. Help → Notifications says how to allow them.";
    if (answer !== "granted") return "Notifications weren't allowed this time.";
    const error = await save(await subscription(), true);
    if (error) return error;
    device.set({ timesUp: true, notNow: false });
    return null;
  } catch {
    return "Couldn't turn on notifications on this device. Try again in a moment.";
  }
}

export async function turnOffTimesUp(): Promise<string | null> {
  device.set({ ...device.get(), timesUp: false }); // stops sending lists straight away
  try {
    const sub = await (await withTimeout(navigator.serviceWorker.ready, 5_000)).pushManager.getSubscription();
    if (!sub) return null;
    const { error } = await createClient().from("push_subscriptions").update({ times_up: false }).eq("endpoint", sub.endpoint);
    return error ? "Turned off here, but the server didn't hear it yet. It will next time you turn it on or off." : null;
  } catch {
    return null;
  }
}

// Once per app open (Home): if it's on here, re-save the device. This files it
// under whoever is signed in now and replaces a subscription the browser has
// renewed. If permission was taken away in the settings, the switch turns off.
let refreshed = false;
export async function refreshThisDevice() {
  if (refreshed || !device.get().timesUp || support() === "unsupported") return;
  refreshed = true;
  if (permission() !== "granted") {
    device.set({ ...device.get(), timesUp: false });
    return;
  }
  try {
    await save(await subscription(), true);
  } catch {
    refreshed = false; // try again next time Home opens
  }
}

// Signing out: remove this device from your account and stop its pushes, so a
// friend who signs in on this phone never gets yours. Never takes more than a
// few seconds (sign-out must not hang on a bad connection).
export async function forgetThisDevice() {
  try {
    if (!("serviceWorker" in navigator)) return;
    const registration = await navigator.serviceWorker.getRegistration();
    const sub = await registration?.pushManager.getSubscription();
    if (sub) {
      await withTimeout(
        Promise.resolve(createClient().from("push_subscriptions").delete().eq("endpoint", sub.endpoint)),
        3_000,
      ).catch(() => {});
      await sub.unsubscribe().catch(() => false);
    }
  } catch {
    // signing out still goes ahead
  } finally {
    device.set(EMPTY);
  }
}
