import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

async function signOut() {
  "use server";
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

// Who's signed in, and the way out. Reads the login cookie, so the Help page
// renders it inside <Suspense> (the rest of the page stays static).
export async function Account() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // proxy.ts already guards this page; this is a second line of defense.
  if (!user) redirect("/login");

  return (
    <section className="flex flex-col gap-3 rounded-2xl border border-zinc-200 p-4 dark:border-zinc-800">
      <h2 className="font-semibold">Account</h2>
      <p className="text-sm">
        <span className="text-zinc-500">Signed in as </span>
        <span className="font-medium break-all">{user.email}</span>
      </p>
      <form action={signOut}>
        <button
          type="submit"
          className="w-full rounded-xl border border-zinc-300 py-3 font-medium hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-900"
        >
          Sign out
        </button>
      </form>
    </section>
  );
}
