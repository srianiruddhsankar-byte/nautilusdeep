import Link from "next/link";
import type { ReactNode } from "react";

// The app's main navigation (Home · Tasks · Shop · Stats · More): a bar at the bottom, where a thumb reaches.
// Each page renders it (Home leaves it out while a session is running, so the
// timer screen stays distraction-free). It also adds a spacer at the end of the
// page so the fixed bar never covers the last thing on it.
// Its links are "tab" navigations: the page content fades, the bar stays put.

export type NavPage = "home" | "tasks" | "shop" | "stats" | "more";

const ITEMS: { page: NavPage; href: string; label: string; icon: ReactNode }[] = [
  {
    page: "home",
    href: "/",
    label: "Home",
    icon: <path d="M4 11.5 12 5l8 6.5V19a1 1 0 0 1-1 1h-4.5v-5h-5v5H5a1 1 0 0 1-1-1z" />,
  },
  {
    page: "tasks",
    href: "/tasks",
    label: "Tasks",
    icon: (
      <>
        <path d="m4 7 1.5 1.5L8 6M4 13l1.5 1.5L8 12M4 19l1.5 1.5L8 18" />
        <path d="M11 7h9M11 13h9M11 19h9" />
      </>
    ),
  },
  {
    page: "shop",
    href: "/decorate",
    label: "Shop",
    icon: (
      <>
        <path d="M5 8.5h14l-1.2 11a1 1 0 0 1-1 .9H7.2a1 1 0 0 1-1-.9z" />
        <path d="M9 8.5V7a3 3 0 0 1 6 0v1.5" />
      </>
    ),
  },
  {
    page: "stats",
    href: "/stats",
    label: "Stats",
    icon: <path d="M5 20V12M10 20V5M15 20v-9M20 20v-5" />,
  },
  {
    // Settings, Account and Help (the page keeps its /help address).
    page: "more",
    href: "/help",
    label: "More",
    icon: (
      <>
        <circle cx="5.5" cy="12" r="1.4" />
        <circle cx="12" cy="12" r="1.4" />
        <circle cx="18.5" cy="12" r="1.4" />
      </>
    ),
  },
];

export function BottomNav({ active }: { active: NavPage }) {
  return (
    <>
      {/* The body already pads the home bar area (globals.css). */}
      <div aria-hidden className="h-18 shrink-0" />
      <nav
        aria-label="Main"
        className="bottom-nav fixed inset-x-0 bottom-0 z-20 border-t border-line bg-paper/95 pb-[env(safe-area-inset-bottom)] backdrop-blur"
      >
        <ul className="mx-auto grid max-w-md grid-cols-5">
          {ITEMS.map((item) => {
            const current = item.page === active;
            return (
              <li key={item.page}>
                <Link
                  href={item.href}
                  transitionTypes={["tab"]}
                  aria-current={current ? "page" : undefined}
                  className={`relative flex h-16 flex-col items-center justify-center gap-1 text-xs transition-colors duration-(--dur-fast) ${
                    current ? "font-bold text-primary" : "font-semibold text-muted hover:text-ink"
                  }`}
                >
                  {/* The current tab: colour, bold label AND a short bar, never colour alone. */}
                  <span
                    aria-hidden
                    className={`absolute top-0 h-0.5 w-8 rounded-b-full bg-primary transition-opacity duration-(--dur) ${
                      current ? "opacity-100" : "opacity-0"
                    }`}
                  />
                  <svg
                    aria-hidden
                    viewBox="0 0 24 24"
                    className="h-6 w-6"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={current ? 2.1 : 1.8}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    {item.icon}
                  </svg>
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </>
  );
}

// The same title bar on every page except Home. `back`: a page reached from
// another one (Settings and Account, from More) links back above its title.
export function PageHeader({ title, back }: { title: string; back?: { href: string; label: string } }) {
  return (
    <header className="flex flex-col">
      {back && (
        <Link
          href={back.href}
          transitionTypes={["tab"]}
          className="-ml-1 inline-flex min-h-11 items-center self-start px-1 text-sm font-semibold text-primary"
        >
          ← {back.label}
        </Link>
      )}
      <div className="flex min-h-11 items-center">
        <h1 className="title-page">{title}</h1>
      </div>
    </header>
  );
}
