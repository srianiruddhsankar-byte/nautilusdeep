import { getSnapshot, subscribe } from "./focus-storage";
import { timesUpIsOn, subscribePush } from "./push";
import { pushPlan, type PushAlert } from "./push-schedule";
import { createClient } from "./supabase/client";

// Keeps the server's list of "Time's up" alerts (public.timer_pushes) in step
// with the running session. The list itself is pure (pushPlan in
// lib/push-schedule.ts); this file only notices changes and sends it.
//
// - Whatever changes (Start, pause / resume, Continue, Give up, Cancel, the
//   end, a check-in, leaving / coming back), the session in localStorage
//   changes, and the WHOLE list is rewritten in one request
//   (replace_timer_pushes). The session ending or being cancelled sends an
//   empty list. A cycle's later breaks are on the list from the start, so they
//   still ring with the app fully closed.
// - Requests use fetch keepalive, so one sent as the page is hidden still
//   arrives after the page is frozen or closed.
// - Only while "Time's up" is on for this device. Offline or failing: it just
//   tries again a few seconds later; the in-app alarm works either way.

const EVERY_MS = 5_000; // re-check: an alert coming within 30 s of an on-screen Home leaves the list
const EMPTY = "[]";

let token: string | null = null; // the signed-in user's access token, kept fresh
let onHome = false; // Home (with its in-app alarm) is mounted
let sent: { sessionId: string; signature: string } | null = null; // what the server has
let sending: { sessionId: string; signature: string } | null = null;
let again = false;
let seq = 0;

type Want = { sessionId: string; alerts: PushAlert[]; signature: string };

const signature = (alerts: PushAlert[]) => JSON.stringify(alerts.map((a) => [a.key, a.at]));

// What the server should have next, or null if it already does.
function wanted(): Want | null {
  const session = getSnapshot().session;
  const visible = onHome && document.visibilityState === "visible";
  const current =
    session?.id && timesUpIsOn()
      ? { sessionId: session.id, alerts: pushPlan(session, Date.now(), { visible }) }
      : null;
  // A different (or no) session now: clear the old one's list first.
  if (sent && sent.signature !== EMPTY && sent.sessionId !== current?.sessionId) {
    return { sessionId: sent.sessionId, alerts: [], signature: EMPTY };
  }
  if (!current) return null;
  const sig = signature(current.alerts);
  const known = sent?.sessionId === current.sessionId ? sent.signature : EMPTY; // a new session starts empty
  return sig === known ? null : { ...current, signature: sig };
}

// `urgent`: the page is being hidden, so send now even if a request is still on
// its way (both use keepalive; the server takes them in turn).
function sync(urgent = false) {
  const next = wanted();
  if (!next) return;
  if (sending && sending.sessionId === next.sessionId && sending.signature === next.signature) return;
  if (sending && !urgent) {
    again = true;
    return;
  }
  if (!token || !navigator.onLine) return; // the interval tries again

  const mine = ++seq;
  sending = { sessionId: next.sessionId, signature: next.signature };
  send(next)
    .then((ok) => {
      if (ok && mine === seq) sent = { sessionId: next.sessionId, signature: next.signature };
    })
    .finally(() => {
      if (mine !== seq) return;
      sending = null;
      if (again) {
        again = false;
        sync();
      }
    });
}

async function send(want: Want): Promise<boolean> {
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/rpc/replace_timer_pushes`, {
      method: "POST",
      keepalive: true,
      headers: {
        apikey: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        p_session_id: want.sessionId,
        p_pushes: want.alerts.map((a) => ({
          key: a.key,
          send_at: new Date(a.at).toISOString(),
          title: a.title,
          body: a.body,
        })),
      }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

// Started by Home (app/_focus/focus-screen.tsx) while it's mounted.
export function startTimerPushSync(): () => void {
  onHome = true;
  const supabase = createClient();
  // The token is read ahead of time: when the page is being hidden there's no
  // time to wait for it.
  void supabase.auth.getSession().then(({ data }) => {
    token = data.session?.access_token ?? null;
    sync();
  });
  const { data: auth } = supabase.auth.onAuthStateChange((_event, session) => {
    token = session?.access_token ?? null;
  });

  const onChange = () => sync();
  const onVisibility = () => sync(document.visibilityState === "hidden");
  const onPageHide = () => sync(true);
  const stopSession = subscribe(onChange);
  const stopPush = subscribePush(onChange);
  document.addEventListener("visibilitychange", onVisibility);
  window.addEventListener("pagehide", onPageHide);
  const interval = setInterval(onChange, EVERY_MS);

  return () => {
    onHome = false;
    sync(); // leaving Home: alerts it would have rung go back on the list
    auth.subscription.unsubscribe();
    stopSession();
    stopPush();
    document.removeEventListener("visibilitychange", onVisibility);
    window.removeEventListener("pagehide", onPageHide);
    clearInterval(interval);
  };
}
