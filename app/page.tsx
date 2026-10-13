import { Suspense } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

async function signOut() {
  "use server";
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 p-8">
      {/* Reads the login cookie, so it streams in per request. */}
      <Suspense fallback={<p className="text-zinc-500">Loading…</p>}>
        <Greeting />
      </Suspense>
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
    <>
      <h1 className="text-3xl font-semibold">Hi, {name}</h1>
      <form action={signOut}>
        <button
          type="submit"
          className="rounded-lg border border-zinc-300 px-5 py-3 font-medium hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-900"
        >
          Sign out
        </button>
      </form>
    </>
  );
}
