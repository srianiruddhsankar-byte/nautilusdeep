import { useEffect, useMemo, useSyncExternalStore } from "react";
import { clampPlacement, type Owned } from "./economy";
import { createClient } from "./supabase/client";

// The signed-in user's decorations (public.decorations) and each tank's chosen
// skin (public.tank_skins), loaded once and shared by Home, Decorate and Stats.
// RLS limits every query to your own rows. Changes need a connection.

type State = { owned: Owned[] | null; skins: [number, string][] | null; error: string | null };
const SERVER_STATE: State = { owned: null, skins: null, error: null };
let state: State = SERVER_STATE;
let loading = false;
const listeners = new Set<() => void>();

function setState(next: State) {
  state = next;
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

async function load() {
  loading = true;
  const supabase = createClient();
  const [decorations, skins] = await Promise.all([
    supabase.from("decorations").select("id, item, price, tank, x, y").order("created_at", { ascending: true }),
    supabase.from("tank_skins").select("tank, skin"),
  ]);
  loading = false;
  const error = decorations.error ?? skins.error;
  if (error || !decorations.data || !skins.data) {
    setState({ ...state, error: error?.message ?? "Couldn't load your decorations" });
    return;
  }
  setState({
    owned: decorations.data as Owned[],
    skins: (skins.data as { tank: number; skin: string }[]).map((s) => [s.tank, s.skin]),
    error: null,
  });
}

export function useOwned() {
  const { owned, skins, error } = useSyncExternalStore(subscribe, () => state, () => SERVER_STATE);

  useEffect(() => {
    if (state.owned === null && !loading) void load();
  }, []);

  const skinChoices = useMemo(() => new Map(skins ?? []), [skins]);
  return { owned, skinChoices, error };
}

// Each change returns an error message, or null if it worked, then reloads.
async function change(run: () => PromiseLike<{ error: { message: string } | null }>) {
  try {
    const { error } = await run();
    if (error) return error.message;
  } catch (e) {
    return e instanceof Error ? e.message : "Network error";
  }
  await load();
  return null;
}

// Buy (price > 0) or claim a milestone item (price 0). The caller checks the
// balance / milestone first (canGet in lib/economy.ts). Returns the new row's id
// so the Decorate page can go straight to placing it.
export async function getDecoration(
  item: string,
  price: number,
): Promise<{ id: string; error: null } | { id: null; error: string }> {
  try {
    const { data, error } = await createClient().from("decorations").insert({ item, price }).select("id").single();
    if (error || !data) {
      // 23505: the one-free-each index (a milestone item claimed twice, e.g. from two tabs).
      const message = error?.code === "23505" ? "That one's already yours." : (error?.message ?? "Couldn't get it");
      return { id: null, error: message };
    }
    await load();
    return { id: (data as { id: string }).id, error: null };
  } catch (e) {
    return { id: null, error: e instanceof Error ? e.message : "Network error" };
  }
}

export function placeDecoration(id: string, tank: number, x: number, y: number) {
  const spot = clampPlacement(x, y);
  // Show it straight away (placing should feel instant), then save.
  if (state.owned) {
    setState({ ...state, owned: state.owned.map((d) => (d.id === id ? { ...d, tank, ...spot } : d)) });
  }
  return change(() => createClient().from("decorations").update({ tank, ...spot }).eq("id", id));
}

// Back to the inventory. Still owned; no refund.
export function removeDecoration(id: string) {
  return change(() => createClient().from("decorations").update({ tank: null, x: null, y: null }).eq("id", id));
}

export function setTankSkin(tank: number, skin: string) {
  return change(() => createClient().from("tank_skins").upsert({ tank, skin }, { onConflict: "user_id,tank" }));
}
