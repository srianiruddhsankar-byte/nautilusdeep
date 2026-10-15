import Link from "next/link";
import type { ReactNode } from "react";

// The app's main navigation: a bar at the bottom, where a thumb reaches.
// Each page renders it (Home leaves it out while a session is running, so the
// timer screen stays distraction-free). It also adds a spacer at the end of the
// page so the fixed bar never covers the last thing on it.

export type NavPage = "home" | "tasks" | "stats" | "help";

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
    page: "stats",
    href: "/stats",
    label: "Stats",
    icon: <path d="M5 20V12M10 20V5M15 20v-9M20 20v-5" />,
  },
  {
    page: "help",
    href: "/help",
    label: "Help",
    icon: (
      <>
        <circle cx="12" cy="12" r="8.5" />
        <path d="M9.6 9.5a2.5 2.5 0 1 1 3.4 2.3c-.6.3-1 .8-1 1.5v.4M12 17h.01" />
      </>
    ),
  },
];

export function BottomNav({ active }: { active: NavPage }) {
  return (
    <>
      <div aria-hidden className="h-[calc(4.5rem+env(safe-area-inset-bottom))] shrink-0" />
      <nav
        aria-label="Main"
        className="fixed inset-x-0 bottom-0 z-20 border-t border-zinc-200 bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur dark:border-zinc-800"
      >
        <ul className="mx-auto grid max-w-md grid-cols-4">
          {ITEMS.map((item) => {
            const current = item.page === active;
            return (
              <li key={item.page}>
                <Link
                  href={item.href}
                  aria-current={current ? "page" : undefined}
                  className={`flex h-16 flex-col items-center justify-center gap-1 text-xs font-medium ${
                    current ? "text-sky-700 dark:text-sky-400" : "text-zinc-500 hover:text-foreground"
                  }`}
                >
                  <svg
                    aria-hidden
                    viewBox="0 0 24 24"
                    className="h-6 w-6"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={1.8}
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

// The same title bar on every page except Home.
export function PageHeader({ title }: { title: string }) {
  return (
    <header className="flex h-10 items-center">
      <h1 className="text-xl font-semibold">{title}</h1>
    </header>
  );
}
