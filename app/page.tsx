import { Suspense } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { FocusScreen } from "./_focus/focus-screen";
import { RecentSessions } from "./_focus/recent-sessions";

async function signOut() {
  "use server";
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-8 p-4 pb-8">
      {/* Reads the login cookie, so it streams in per request. */}
      <Suspense fallback={<p className="h-10 text-zinc-500">Loading…</p>}>
        <Greeting />
      </Suspense>
      {/* Client-only state (localStorage + clock), so it doesn't need the cookie. */}
      <FocusScreen />
      <RecentSessions />
    </main>
  );
}

async function Greeting() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // proxy.ts already guards this page; this is a second line of defense.
  if (!user) redirect("/login");

  const name =
    user.user_metadata.full_name ?? user.user_metadata.name ?? user.email;

  return (
    <header className="flex h-10 items-center justify-between gap-4">
      <h1 className="truncate text-xl font-semibold">Hi, {name}</h1>
      <form action={signOut}>
        <button
          type="submit"
          className="rounded-lg border border-zinc-300 px-3 py-2 text-sm font-medium hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-900"
        >
          Sign out
        </button>
      </form>
    </header>
  );
}
