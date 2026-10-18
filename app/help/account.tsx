import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Button } from "../_ui/button";
import { Card } from "../_ui/card";
import { AppearanceSetting } from "./appearance";

async function signOut() {
  "use server";
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

// Who's signed in, and the way out. Reads the login cookie, so the Help page
// renders it inside <Suspense> (the rest of the page stays static). The page's
// "Account" group heading sits right above it. Appearance lives here too.
export async function Account() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // proxy.ts already guards this page; this is a second line of defense.
  if (!user) redirect("/login");

  return (
    <Card as="section" aria-label="Account" className="gap-4">
      <AppearanceSetting />
      <p className="border-t border-line pt-4 text-sm">
        <span className="text-muted">Signed in as </span>
        <span className="font-semibold break-all">{user.email}</span>
      </p>
      <form action={signOut}>
        <Button type="submit" variant="outline" className="w-full">
          Sign out
        </Button>
      </form>
    </Card>
  );
}
