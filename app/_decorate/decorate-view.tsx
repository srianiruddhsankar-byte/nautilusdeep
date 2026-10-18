"use client";

import { useMemo, useRef, useState } from "react";
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
import { Button } from "../_ui/button";
import { Card } from "../_ui/card";
import { EmptyState, Skeleton } from "../_ui/feedback";
import { prefersReducedMotion, useLoadFade } from "../_ui/motion";
import { TickMark } from "../_ui/tick";
import { Tabs } from "../_ui/tabs";
import { toast } from "../_ui/toast";

type Mode = { kind: "idle" } | { kind: "placing"; id: string } | { kind: "selected"; id: string };
type TabId = "items" | "shop" | "skins";

// After buying: how long "✓ Yours" shows on the row before it goes to placing.
const BOUGHT_MS = 650;

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
  const [bought, setBought] = useState<string | null>(null); // the item just bought, for its "✓ Yours"
  const [settlingId, setSettlingId] = useState<string | null>(null); // just placed / moved: it settles
  const tankRef = useRef<HTMLDivElement>(null);
  const fade = useLoadFade(rows !== null && economy.balance !== null);

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
    setSettlingId(active.id);
    await run(() => placeDecoration(active.id, index, x, y));
  }

  async function get(item: DecorationItem, price: number) {
    setBusy(true);
    const result = await getDecoration(item.id, price);
    setMessage(result.error);
    if (!result.id) return setBusy(false);
    const id = result.id;
    // A moment of "✓ Yours" on the row (still busy, so nothing else can be
    // bought meanwhile), then straight to placing, the quickest path from shop
    // to tank: the tank scrolls into view and the hint line rings once.
    const reduce = prefersReducedMotion();
    setBought(item.id);
    if (!reduce) await new Promise((resolve) => setTimeout(resolve, BOUGHT_MS));
    setBought(null);
    setBusy(false);
    toast(`${price === 0 ? "Got" : "Bought"} ${item.name}. Tap the sand to place it.`);
    setMode({ kind: "placing", id });
    setTab("items");
    tankRef.current?.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
  }

  if (!rows || economy.balance === null) {
    const error = sessionsError ?? economy.error;
    if (error) return <p role="alert" className="text-sm text-danger">Couldn&apos;t load: {error}</p>;
    return (
      <div className="flex flex-col gap-5" aria-busy="true" aria-label="Loading the shop">
        <Skeleton className="aspect-[4/3] rounded-tank" />
        <Skeleton className="h-12" />
        <Skeleton className="h-64 rounded-card" />
      </div>
    );
  }

  return (
    <div className={`flex flex-col gap-5 ${fade}`}>
      <div ref={tankRef} className="scroll-mt-4">
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
          settlingId,
          onDecorationTap: (id) =>
            setMode(mode.kind === "selected" && mode.id === id ? { kind: "idle" } : { kind: "selected", id }),
        }}
      />
      </div>

      {/* One line that always says what a tap will do. */}
      <div
        aria-live="polite"
        className={`relative flex min-h-12 items-center justify-between gap-3 rounded-control px-4 py-1 text-sm transition-colors duration-(--dur) ${
          mode.kind === "idle" ? "bg-soft" : "bg-card shadow-[inset_0_0_0_2px_var(--primary)]"
        }`}
      >
        {/* Placing something new: one ring, so your eye finds the next step. */}
        {mode.kind === "placing" && (
          <span key={mode.id} aria-hidden className="ring-once pointer-events-none absolute inset-0 rounded-control" />
        )}
        {mode.kind === "idle" && (
          <p className="text-muted">
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
            <Button variant="quiet" size="sm" onClick={() => setMode({ kind: "idle" })} className="-mr-2 shrink-0">
              Cancel
            </Button>
          </>
        )}
        {mode.kind === "selected" && active && (
          <>
            <p>
              <b>{activeName}</b>: tap the sand to move it.
            </p>
            <span className="-mr-2 flex shrink-0">
              <Button
                variant="quiet"
                size="sm"
                disabled={busy}
                onClick={async () => {
                  setMode({ kind: "idle" });
                  await run(() => removeDecoration(active.id));
                }}
              >
                Put away
              </Button>
              <Button variant="quiet" size="sm" onClick={() => setMode({ kind: "idle" })} className="text-primary">
                Done
              </Button>
            </span>
          </>
        )}
      </div>
      {message && (
        <p role="alert" className="text-sm text-danger">
          {message}
        </p>
      )}

      <Tabs<TabId>
        label="Shop sections"
        idPrefix="shop"
        value={tab}
        onChange={setTab}
        tabs={[
          { id: "shop", label: "Shop" },
          { id: "items", label: "Your items" },
          { id: "skins", label: "Skins" },
        ]}
      />

      <div key={tab} role="tabpanel" className="swap-in" id="shop-panel" aria-labelledby={`shop-tab-${tab}`}>
        {tab === "items" && (
          <Items owned={owned} activeId={activeId} onPick={(id) => setMode({ kind: "placing", id })} />
        )}
        {tab === "shop" && (
          <Shop
            owned={owned}
            balance={economy.balance}
            reached={economy.reached}
            busy={busy}
            bought={bought}
            onGet={get}
          />
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
    return owned.length > 0 ? (
      <EmptyState title="Everything is placed">All your decorations are in a tank. Tap one there to move it.</EmptyState>
    ) : (
      <EmptyState title="No items yet">Decorations you buy or unlock wait here until you place them.</EmptyState>
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
              className={`flex h-28 w-full flex-col items-center justify-end gap-1 rounded-card bg-card p-2 text-sm transition-shadow duration-(--dur) ease-snap ${
                picking ? "shadow-[inset_0_0_0_2px_var(--primary)]" : "shadow-card hover:bg-soft"
              }`}
            >
              <span className="flex flex-1 items-end">
                <DecorationSprite item={item} width={Math.min(56, (decorationById(item)?.width ?? 30) * 1.2)} />
              </span>
              <span className="max-w-full truncate">
                {decorationById(item)?.name}
                {copies.length > 1 && <span className="text-muted"> × {copies.length}</span>}
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
  bought,
  onGet,
}: {
  owned: Owned[];
  balance: number;
  reached: Set<MilestoneId>;
  busy: boolean;
  bought: string | null;
  onGet: (item: DecorationItem, price: number) => void;
}) {
  const ownedItems = owned.map((d) => d.item);
  return (
    <div className="flex flex-col gap-3">
      <p className="flex flex-wrap items-center gap-1.5 text-sm text-muted">
        You have <Coin /> <b className="text-coin tabular-nums">{balance}</b> coins. Bought items are yours forever.
      </p>
      <Card as="div" className="gap-0 py-1">
        <ul className="flex flex-col divide-y divide-line">
          {DECORATIONS.map((item) => {
            const check = canGet(item, { balance, reached, ownedItems });
            const count = ownedItems.filter((i) => i === item.id).length;
            return (
              <li key={item.id} className="flex min-h-16 items-center gap-3 py-2">
                <span className="flex h-12 w-14 shrink-0 items-end justify-center">
                  <DecorationSprite item={item.id} width={Math.min(52, item.width)} />
                </span>
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="font-semibold">
                    {item.name}
                    {count > 0 && !item.milestone && <span className="font-normal text-muted"> · you have {count}</span>}
                  </span>
                  <span className="text-sm text-muted">
                    {item.milestone ? (
                      reached.has(item.milestone) ? (
                        "Milestone reached"
                      ) : (
                        <>🔒 {MILESTONE_LABEL[item.milestone]}</>
                      )
                    ) : (
                      <span className="flex items-center gap-1 tabular-nums">
                        <Coin size={12} /> {item.price}
                      </span>
                    )}
                  </span>
                </span>
                {bought === item.id ? (
                  <span className="swap-in flex min-h-11 shrink-0 items-center gap-1 px-2 text-sm font-semibold text-success">
                    <TickMark animate className="h-4 w-4" />
                    Yours
                  </span>
                ) : check.ok ? (
                  <Button variant="secondary" size="sm" disabled={busy} onClick={() => onGet(item, check.price)}>
                    {check.price === 0 ? "Get · free" : "Buy"}
                  </Button>
                ) : (
                  <span className="shrink-0 text-right text-xs text-muted">
                    {check.reason === "Locked" ? "" : check.reason}
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      </Card>
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
    <div className="flex flex-col gap-3">
      <p className="text-sm text-muted">
        Skins unlock with total focus time (study + notes). Each tank can use its own. You&apos;re at{" "}
        <b className="text-ink">{formatHours(hours)}</b>.
      </p>
      <ul className="flex flex-col gap-2">
        {SKIN_UNLOCKS.map((s) => {
          const unlocked = skinUnlocked(s.id, hours);
          const inUse = current === s.id;
          const Scene = SKINS[s.id].Scene;
          return (
            <Card
              as="li"
              key={s.id}
              className={`flex-row items-center gap-3 p-2 ${inUse ? "shadow-[inset_0_0_0_2px_var(--primary)]" : ""}`}
            >
              <span
                className={`relative h-14 w-20 shrink-0 overflow-hidden rounded-control ${SKINS[s.id].frame} ${
                  unlocked ? "" : "opacity-40 grayscale"
                }`}
              >
                <Scene />
              </span>
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="font-semibold">{s.name}</span>
                <span className="text-sm text-muted">
                  {unlocked
                    ? inUse
                      ? `In use in Tank ${tank + 1}`
                      : "Unlocked"
                    : `Unlocks at ${s.hours}h · you're at ${formatHours(hours)}`}
                </span>
              </span>
              {unlocked && !inUse && (
                <Button variant="secondary" size="sm" disabled={busy} onClick={() => onUse(s.id)}>
                  Use here
                </Button>
              )}
              {inUse && (
                <span className="shrink-0 px-2 font-semibold text-success">
                  ✓<span className="sr-only"> in use</span>
                </span>
              )}
            </Card>
          );
        })}
      </ul>
    </div>
  );
}
