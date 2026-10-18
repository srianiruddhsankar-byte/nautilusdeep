import { Suspense } from "react";
import { redirect } from "next/navigation";
import { firstName } from "@/lib/first-name";
import { createClient } from "@/lib/supabase/server";
import { FocusScreen } from "./_focus/focus-screen";
import { Skeleton } from "./_ui/feedback";
import { TabContent } from "./_ui/page";

export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-5 px-4 pt-6 pb-8">
      {/* Reads the login cookie, so it streams in per request. */}
      <Suspense fallback={<Skeleton className="h-11 w-40" />}>
        <Greeting />
      </Suspense>
      {/* Client-only state (localStorage + clock), so it doesn't need the cookie.
          It also draws the bottom navigation, except while a session is running
          (the nav is lifted out of the tab fade by its own name, globals.css). */}
      <TabContent>
        <FocusScreen />
      </TabContent>
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

  const name = firstName(user.user_metadata);

  // Sign out lives on the Help page (Account), so Home stays about studying.
  return (
    <header className="flex min-h-11 items-center">
      <h1 className="title-page truncate">{name ? `Hi, ${name}` : "Hi there"}</h1>
    </header>
  );
}
