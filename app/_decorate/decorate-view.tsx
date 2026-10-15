"use client";

import { useMemo, useState, type ReactNode } from "react";
import {
  DECORATIONS,
  MILESTONE_LABEL,
  decorationById,
  type DecorationItem,
  type MilestoneId,
} from "@/lib/decorations";
import { SKIN_UNLOCKS, canGet, formatHours, inTank, inventory, skinUnlocked, type Owned } from "@/lib/economy";
import { deriveAquarium } from "@/lib/fish";
import { getDecoration, placeDecoration, removeDecoration, setTankSkin } from "@/lib/owned";
import { deriveGarden } from "@/lib/plants";
import { useSessions } from "@/lib/sessions-data";
import { useEconomy } from "@/lib/use-economy";
import { DecorationSprite } from "../_tank/decoration-sprite";
import { SKINS } from "../_tank/skins";
import { Coin, Tank } from "../_tank/tank";

type Mode = { kind: "idle" } | { kind: "placing"; id: string } | { kind: "selected"; id: string };
type TabId = "items" | "shop" | "skins";

// Decorating, kept quick: tap an item, tap the sand. Tap a placed item to move
// it (tap a new spot) or put it back in your items.
export function DecorateView() {
  const { rows, error: sessionsError } = useSessions();
  const economy = useEconomy();
  const aquarium = useMemo(() => (rows ? deriveAquarium(rows) : null), [rows]);
  const garden = useMemo(() => (rows ? deriveGarden(rows) : null), [rows]);
  const tankCount = Math.max(aquarium?.tanks.length ?? 1, garden?.tankCount ?? 1);

  const [picked, setPicked] = useState<number | null>(null); // null = newest tank
  const index = Math.min(picked ?? tankCount - 1, tankCount - 1);
  const [mode, setMode] = useState<Mode>({ kind: "idle" });
  const [tab, setTab] = useState<TabId>("shop");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const owned = economy.owned ?? [];
  const activeId = mode.kind === "idle" ? null : mode.id;
  const active = owned.find((d) => d.id === activeId) ?? null;
  const activeName = active ? (decorationById(active.item)?.name ?? "item") : "";

  async function run(action: () => Promise<string | null>) {
    setBusy(true);
    const error = await action();
    setBusy(false);
    setMessage(error);
    return error === null;
  }

  async function onSandTap(x: number, y: number) {
    if (!active) return;
    setMode({ kind: "idle" });
    await run(() => placeDecoration(active.id, index, x, y));
  }

  async function get(item: DecorationItem, price: number) {
    setBusy(true);
    const result = await getDecoration(item.id, price);
    setBusy(false);
    setMessage(result.error);
    if (result.id) {
      // Straight to placing: the quickest path from shop to tank.
      setMode({ kind: "placing", id: result.id });
      setTab("items");
    }
  }

  if (!rows || economy.balance === null) {
    const error = sessionsError ?? economy.error;
    return <p className="text-center text-zinc-500">{error ? `Couldn't load: ${error}` : "Loading…"}</p>;
  }

  return (
    <div className="flex flex-col gap-4">
      <Tank
        aquarium={aquarium}
        garden={garden}
        skinOf={(t) => SKINS[economy.skinIdOf(t)]}
        decorations={owned}
        edit={{
          index,
          onIndexChange: (i) => {
            setPicked(i);
            if (mode.kind === "selected") setMode({ kind: "idle" });
          },
          selectedId: mode.kind === "selected" ? mode.id : null,
          onSandTap,
          onDecorationTap: (id) =>
            setMode(mode.kind === "selected" && mode.id === id ? { kind: "idle" } : { kind: "selected", id }),
        }}
      />

      {/* One line that always says what a tap will do. */}
      <div className="flex min-h-12 items-center justify-between gap-3 rounded-xl bg-zinc-100 px-4 py-2 text-sm dark:bg-zinc-900">
        {mode.kind === "idle" && (
          <p className="text-zinc-600 dark:text-zinc-400">
            {inventory(owned).length > 0
              ? "Tap an item below, then tap the sand. Tap a placed item to move it."
              : inTank(owned, index).length > 0
                ? "Tap a placed item to move it or put it away."
                : "Get something from the Shop to start."}
          </p>
        )}
        {mode.kind === "placing" && (
          <>
            <p>
              Tap the sand to place your <b>{activeName}</b>.
            </p>
            <SmallButton onClick={() => setMode({ kind: "idle" })}>Cancel</SmallButton>
          </>
        )}
        {mode.kind === "selected" && active && (
          <>
            <p>
              <b>{activeName}</b>: tap the sand to move it.
            </p>
            <span className="flex shrink-0 gap-1">
              <SmallButton
                disabled={busy}
                onClick={async () => {
                  setMode({ kind: "idle" });
                  await run(() => removeDecoration(active.id));
                }}
              >
                Put away
              </SmallButton>
              <SmallButton onClick={() => setMode({ kind: "idle" })}>Done</SmallButton>
            </span>
          </>
        )}
      </div>
      {message && <p className="text-sm text-red-600">{message}</p>}

      <div className="grid grid-cols-3 gap-1 rounded-xl bg-zinc-100 p-1 dark:bg-zinc-900" role="tablist">
        {(
          [
            ["shop", "Shop"],
            ["items", "Your items"],
            ["skins", "Skins"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            role="tab"
            aria-selected={tab === id}
            onClick={() => setTab(id)}
            className={`rounded-lg py-2.5 font-medium ${tab === id ? "bg-white shadow dark:bg-zinc-700" : "text-zinc-500"}`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "items" && (
        <Items owned={owned} activeId={activeId} onPick={(id) => setMode({ kind: "placing", id })} />
      )}
      {tab === "shop" && (
        <Shop owned={owned} balance={economy.balance} reached={economy.reached} busy={busy} onGet={get} />
      )}
      {tab === "skins" && (
        <Skins
          hours={economy.hours}
          current={economy.skinIdOf(index)}
          tank={index}
          busy={busy}
          onUse={(skin) => run(() => setTankSkin(index, skin))}
        />
      )}
    </div>
  );
}

// Items you own that aren't in a tank, grouped (two shells = one card "× 2").
function Items({
  owned,
  activeId,
  onPick,
}: {
  owned: Owned[];
  activeId: string | null;
  onPick: (id: string) => void;
}) {
  const groups = new Map<string, Owned[]>();
  for (const d of inventory(owned)) groups.set(d.item, [...(groups.get(d.item) ?? []), d]);
  if (groups.size === 0) {
    return (
      <p className="py-4 text-center text-zinc-500">
        {owned.length > 0 ? "Everything you own is in a tank." : "Nothing here yet. Visit the Shop."}
      </p>
    );
  }
  return (
    <ul className="grid grid-cols-3 gap-2">
      {[...groups].map(([item, copies]) => {
        const picking = copies.some((c) => c.id === activeId);
        return (
          <li key={item}>
            <button
              type="button"
              onClick={() => onPick(copies[0].id)}
              aria-pressed={picking}
              className={`flex h-28 w-full flex-col items-center justify-end gap-1 rounded-xl border p-2 text-sm ${
                picking ? "border-sky-700 bg-sky-50 dark:bg-sky-950" : "border-zinc-200 dark:border-zinc-800"
              }`}
            >
              <span className="flex flex-1 items-end">
                <DecorationSprite item={item} width={Math.min(56, (decorationById(item)?.width ?? 30) * 1.2)} />
              </span>
              <span className="truncate">
                {decorationById(item)?.name}
                {copies.length > 1 && <span className="text-zinc-500"> × {copies.length}</span>}
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}

function Shop({
  owned,
  balance,
  reached,
  busy,
  onGet,
}: {
  owned: Owned[];
  balance: number;
  reached: Set<MilestoneId>;
  busy: boolean;
  onGet: (item: DecorationItem, price: number) => void;
}) {
  const ownedItems = owned.map((d) => d.item);
  return (
    <div className="flex flex-col gap-2">
      <p className="flex items-center gap-1.5 text-sm text-zinc-500">
        You have <Coin /> <b className="text-foreground tabular-nums">{balance}</b> coins. Bought items are yours forever.
      </p>
      <ul className="flex flex-col divide-y divide-zinc-200 dark:divide-zinc-800">
        {DECORATIONS.map((item) => {
          const check = canGet(item, { balance, reached, ownedItems });
          const count = ownedItems.filter((i) => i === item.id).length;
          return (
            <li key={item.id} className="flex items-center gap-3 py-2">
              <span className="flex h-12 w-14 shrink-0 items-end justify-center">
                <DecorationSprite item={item.id} width={Math.min(52, item.width)} />
              </span>
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="font-medium">
                  {item.name}
                  {count > 0 && !item.milestone && <span className="font-normal text-zinc-500"> · you have {count}</span>}
                </span>
                <span className="text-sm text-zinc-500">
                  {item.milestone ? (
                    reached.has(item.milestone) ? (
                      "Milestone reached"
                    ) : (
                      <>🔒 {MILESTONE_LABEL[item.milestone]}</>
                    )
                  ) : (
                    <span className="flex items-center gap-1">
                      <Coin size={12} /> {item.price}
                    </span>
                  )}
                </span>
              </span>
              {check.ok ? (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => onGet(item, check.price)}
                  className="shrink-0 rounded-lg bg-sky-700 px-3 py-2 text-sm font-semibold text-white hover:bg-sky-800 disabled:opacity-40"
                >
                  {check.price === 0 ? "Get · free" : "Buy"}
                </button>
              ) : (
                <span className="shrink-0 text-right text-xs text-zinc-500">
                  {check.reason === "Locked" ? "" : check.reason}
                </span>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function Skins({
  hours,
  current,
  tank,
  busy,
  onUse,
}: {
  hours: number;
  current: string;
  tank: number;
  busy: boolean;
  onUse: (skin: string) => void;
}) {
  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm text-zinc-500">
        Skins unlock with total focus time (study + notes). Each tank can use its own. You&apos;re at{" "}
        <b className="text-foreground">{formatHours(hours)}</b>.
      </p>
      <ul className="flex flex-col gap-2">
        {SKIN_UNLOCKS.map((s) => {
          const unlocked = skinUnlocked(s.id, hours);
          const Scene = SKINS[s.id].Scene;
          return (
            <li key={s.id} className="flex items-center gap-3 rounded-xl border border-zinc-200 p-2 dark:border-zinc-800">
              <span
                className={`relative h-14 w-20 shrink-0 overflow-hidden rounded-lg ${SKINS[s.id].frame} ${
                  unlocked ? "" : "opacity-40 grayscale"
                }`}
              >
                <Scene />
              </span>
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="font-medium">{s.name}</span>
                <span className="text-sm text-zinc-500">
                  {unlocked
                    ? current === s.id
                      ? `In use in Tank ${tank + 1}`
                      : "Unlocked"
                    : `Unlocks at ${s.hours}h · you're at ${formatHours(hours)}`}
                </span>
              </span>
              {unlocked && current !== s.id && (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => onUse(s.id)}
                  className="shrink-0 rounded-lg border border-sky-700 px-3 py-2 text-sm font-medium text-sky-700 disabled:opacity-40 dark:text-sky-400"
                >
                  Use here
                </button>
              )}
              {current === s.id && <span className="shrink-0 px-2 text-emerald-600">✓</span>}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function SmallButton({
  onClick,
  disabled,
  children,
}: {
  onClick: () => void;
  disabled?: boolean;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="shrink-0 rounded-lg px-2.5 py-1.5 font-medium text-sky-700 hover:bg-zinc-200 disabled:opacity-40 dark:text-sky-400 dark:hover:bg-zinc-800"
    >
      {children}
    </button>
  );
}
